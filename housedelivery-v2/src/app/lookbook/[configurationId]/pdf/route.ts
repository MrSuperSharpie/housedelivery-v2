import serverlessChromium from "@sparticuz/chromium";
import { chromium as playwrightChromium, type Browser } from "playwright-core";

import { parseConfigurationId } from "@/lib/lookbook/domain";
import { getPreviewAuthCookies } from "@/lib/lookbook/preview-auth";
import { getLookBookRepository } from "@/lib/lookbook/repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const LOCAL_CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FORWARDED_PREVIEW_HEADERS = [
  "authorization",
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
  let browser: Browser | undefined;

  try {
    browser = await launchBrowser();
    const browserContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const previewAuthCookies = getPreviewAuthCookies(
      request.headers.get("cookie"),
      requestUrl.origin,
    );
    if (previewAuthCookies.length > 0) {
      await browserContext.addCookies(previewAuthCookies);
    }
    const page = await browserContext.newPage();

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
    await page.emulateMedia({ media: "print" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const images = Array.from(
        document.querySelectorAll<HTMLImageElement>(
          "[data-look-book-print-page] img",
        ),
      );
      images.forEach((image) => {
        image.loading = "eager";
      });
      await Promise.race([
        Promise.all(images.map((image) => image.decode().catch(() => undefined))),
        new Promise((resolve) => window.setTimeout(resolve, 15_000)),
      ]);
    });

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
