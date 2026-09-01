import { parseConfigurationId } from "@/lib/lookbook/domain";
import { getLookBookRepository } from "@/lib/lookbook/repository";
import {
  carryPreviewShareToken,
  createRequestAuthenticatedPage,
} from "@/lib/pdf/request-browser";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

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
  carryPreviewShareToken(requestUrl, sourceUrl);
  const disposition =
    requestUrl.searchParams.get("disposition") === "attachment"
      ? "attachment"
      : "inline";
  let browser;

  try {
    // The source boards are deliberately full-resolution in the online Look
    // Book. Rendering all of them at source size exhausts Chromium's small
    // serverless shared-memory area, so the PDF browser requests bounded
    // Next.js derivatives sized above the A4 page's CSS width.
    const authenticatedPage = await createRequestAuthenticatedPage(request, {
      imageMaxWidth: 1080,
    });
    browser = authenticatedPage.browser;
    const { page } = authenticatedPage;

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
