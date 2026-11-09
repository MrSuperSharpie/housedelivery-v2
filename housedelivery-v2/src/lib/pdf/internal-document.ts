import "server-only";

import type { Browser } from "playwright-core";

import {
  carryPreviewShareToken,
  createRequestAuthenticatedPage,
} from "@/lib/pdf/request-browser";

export async function createInternalDocumentPdf({
  request,
  sourcePath,
  selector,
  fileName,
}: {
  request: Request;
  sourcePath: string;
  selector: string;
  fileName: string;
}) {
  const requestUrl = new URL(request.url);
  const sourceUrl = new URL(sourcePath, requestUrl.origin);
  carryPreviewShareToken(requestUrl, sourceUrl);
  const disposition =
    requestUrl.searchParams.get("disposition") === "attachment"
      ? "attachment"
      : "inline";
  let browser: Browser | undefined;

  try {
    const authenticatedPage = await createRequestAuthenticatedPage(request);
    browser = authenticatedPage.browser;
    const { page } = authenticatedPage;
    const sourceResponse = await page.goto(sourceUrl.href, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    if (!sourceResponse?.ok()) {
      throw new Error(
        `internal_document_source_${sourceResponse?.status() ?? "missing"}`,
      );
    }

    await page.locator(selector).waitFor({ state: "attached", timeout: 20_000 });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Content-Type": "application/pdf",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } finally {
    await browser?.close();
  }
}
