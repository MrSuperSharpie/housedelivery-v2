import serverlessChromium from "@sparticuz/chromium";
import { chromium as playwrightChromium, type Browser } from "playwright-core";

import { parseConfigurationId } from "@/lib/lookbook/domain";
import { getLookBookRepository } from "@/lib/lookbook/repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const LOCAL_CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FORWARDED_PREVIEW_HEADERS = [
  "authorization",
  "cookie",
  "x-vercel-protection-bypass",
  "x-vercel-set-bypass-cookie",
] as const;

async function launchBrowser(): Promise<Browser> {
  const isVercel = process.env.VERCEL === "1";
  return playwrightChromium.launch({
    args: isVercel ? serverlessChromium.args : [],
    executablePath: isVercel
      ? await serverlessChromium.executablePath()
      : process.env.CHROME_EXECUTABLE_PATH?.trim() || LOCAL_CHROME_PATH,
    headless: true,
  });
}

function pdfFileName(homeName: string) {
  const safeHomeName = homeName
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
  return `House-Delivery-${safeHomeName}-Look-Book.pdf`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ configurationId: string }> },
) {
  const { configurationId: rawConfigurationId } = await params;
  const configurationId = parseConfigurationId(rawConfigurationId);
  if (!configurationId) return new Response("Not found", { status: 404 });

  let record;
  try {
    record = await getLookBookRepository().findById(configurationId);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!record) return new Response("Not found", { status: 404 });

  const requestUrl = new URL(request.url);
  const sourceUrl = new URL(`/lookbook/${configurationId}`, requestUrl.origin);
  const disposition =
    requestUrl.searchParams.get("disposition") === "attachment"
      ? "attachment"
      : "inline";
  const automationBypassSecret =
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  let browser: Browser | undefined;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });

    await page.route("**/*", async (route) => {
      const routeUrl = new URL(route.request().url());
      if (routeUrl.origin !== requestUrl.origin) {
        await route.continue();
        return;
      }

      const headers = { ...route.request().headers() };
      for (const headerName of FORWARDED_PREVIEW_HEADERS) {
        const value = request.headers.get(headerName);
        if (value) headers[headerName] = value;
      }
      if (automationBypassSecret) {
        headers["x-vercel-protection-bypass"] = automationBypassSecret;
        headers["x-vercel-set-bypass-cookie"] = "true";
      }
      await route.continue({ headers });
    });

    const sourceResponse = await page.goto(sourceUrl.href, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    if (!sourceResponse?.ok()) {
      throw new Error(`lookbook_source_${sourceResponse?.status() ?? "missing"}`);
    }

    const printPages = page.locator("[data-look-book-print-page]");
    await printPages.first().waitFor({ state: "attached", timeout: 20_000 });

    // The saved Look Book is a long document and most design-board images are
    // below the initial viewport. Force those images to become eager, visit
    // every print page so browser lazy-loading is triggered, and refuse to
    // generate a PDF until every image has real decoded pixels.
    await page.evaluate(async () => {
      await document.fonts.ready;

      const images = Array.from(
        document.querySelectorAll<HTMLImageElement>(
          "[data-look-book-print-page] img",
        ),
      );
      for (const image of images) {
        image.loading = "eager";
        image.decoding = "sync";
        image.fetchPriority = "high";
      }

      const pages = Array.from(
        document.querySelectorAll<HTMLElement>("[data-look-book-print-page]"),
      );
      for (const printPage of pages) {
        printPage.scrollIntoView({ block: "center" });
        await new Promise<void>((resolve) =>
          window.setTimeout(resolve, 120),
        );
      }
      window.scrollTo({ top: 0 });
    });

    await page.waitForFunction(
      () => {
        const images = Array.from(
          document.querySelectorAll<HTMLImageElement>(
            "[data-look-book-print-page] img",
          ),
        );
        return (
          images.length > 0 &&
          images.every(
            (image) =>
              image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
          )
        );
      },
      undefined,
      { timeout: 25_000 },
    );

    await page
      .waitForLoadState("networkidle", { timeout: 10_000 })
      .catch(() => undefined);

    const imageState = await page
      .locator("[data-look-book-print-page] img")
      .evaluateAll((images) =>
        images.map((node) => {
          const image = node as HTMLImageElement;
          return {
            src: image.currentSrc || image.src,
            complete: image.complete,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
          };
        }),
      );
    const failedImages = imageState.filter(
      (image) =>
        !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0,
    );
    if (failedImages.length > 0) {
      throw new Error(`lookbook_image_load_failed_${failedImages.length}`);
    }

    await page.emulateMedia({ media: "print" });

    const pageCount = await printPages.count();
    if (pageCount !== 12) {
      throw new Error(`lookbook_page_count_${pageCount}`);
    }

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    const fileName = pdfFileName(record.homeDisplayName);

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(
      "lookbook_pdf_generation_failed",
      error instanceof Error ? error.message : "unknown_error",
    );
    return new Response("Unable to generate Look Book PDF", { status: 500 });
  } finally {
    await browser?.close();
  }
}
