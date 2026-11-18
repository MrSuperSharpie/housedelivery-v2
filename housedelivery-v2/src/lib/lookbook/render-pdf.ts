import "server-only";

import { LOOK_BOOK_PRINT_IMAGE_WIDTH, waitForPrintImages } from "@/lib/pdf/print-images";
import { createRequestAuthenticatedPage } from "@/lib/pdf/request-browser";

export async function renderLookBookPdf(
  request: Request,
  sourceUrl: URL,
  sourceHeaders?: Record<string, string>,
) {
  let close: (() => Promise<void>) | undefined;

  try {
    // The source boards are deliberately full-resolution in the online Look
    // Book. Rendering all of them at source size exhausts Chromium's small
    // serverless shared-memory area, so the PDF browser requests bounded
    // Next.js derivatives sized above the A4 page's CSS width.
    const authenticatedPage = await createRequestAuthenticatedPage(request, {
      imageMaxWidth: LOOK_BOOK_PRINT_IMAGE_WIDTH,
      document: sourceHeaders ? { url: sourceUrl.href, headers: sourceHeaders } : undefined,
    });
    close = authenticatedPage.close;
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
    await page.evaluate(waitForPrintImages);

    const pageCount = await printPages.count();
    const expectedPageCount = Number(await page.locator("#home-look-book").getAttribute("data-look-book-expected-pages"));
    if (!Number.isInteger(expectedPageCount) || expectedPageCount < 6 || pageCount !== expectedPageCount) {
      throw new Error(`lookbook_page_count_${pageCount}`);
    }

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return new Uint8Array(pdf);
  } finally {
    await close?.();
  }
}
