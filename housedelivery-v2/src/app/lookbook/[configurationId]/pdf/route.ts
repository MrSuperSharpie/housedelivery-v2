import { parseConfigurationId } from "@/lib/lookbook/domain";
import {
  getLookBookPdfArtifact,
  getLookBookPdfRevision,
} from "@/lib/lookbook/pdf-artifact";
import { getLookBookRepository } from "@/lib/lookbook/repository";
import { createLookBookPdfResponseStream } from "@/lib/lookbook/pdf-response";
import { LOOK_BOOK_PRINT_IMAGE_WIDTH, waitForPrintImages } from "@/lib/pdf/print-images";
import {
  carryPreviewShareToken,
  createRequestAuthenticatedPage,
} from "@/lib/pdf/request-browser";

export const dynamic = "force-dynamic";
export const maxDuration = 180;
export const runtime = "nodejs";

const PDF_REVISION_PARAMETER = "pdfRevision";
const PDF_CDN_MAX_AGE = 31_536_000;

function pdfFileName(homeName: string) {
  const safeHomeName = homeName
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
  return `House-Delivery-${safeHomeName}-Look-Book.pdf`;
}

function currentRevisionRedirect(requestUrl: URL, revision: string) {
  const revisionUrl = new URL(requestUrl);
  revisionUrl.searchParams.set(PDF_REVISION_PARAMETER, revision);
  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store",
      Location: revisionUrl.href,
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

function localPlannerPdfFallback(requestUrl: URL, configurationId: string) {
  const fallbackUrl = new URL(`/lookbook/${configurationId}`, requestUrl.origin);
  fallbackUrl.searchParams.set("download", "1");
  carryPreviewShareToken(requestUrl, fallbackUrl);
  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store",
      Location: fallbackUrl.href,
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

function pdfErrorResponse() {
  return new Response(
    "We couldn’t prepare this Look Book PDF right now. Please retry the download. Your saved Look Book and selections are unchanged.",
    {
      status: 503,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": "5",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}

async function renderLookBookPdf(request: Request, sourceUrl: URL) {
  let close: (() => Promise<void>) | undefined;

  try {
    // The source boards are deliberately full-resolution in the online Look
    // Book. Rendering all of them at source size exhausts Chromium's small
    // serverless shared-memory area, so the PDF browser requests bounded
    // Next.js derivatives sized above the A4 page's CSS width.
    const authenticatedPage = await createRequestAuthenticatedPage(request, {
      imageMaxWidth: LOOK_BOOK_PRINT_IMAGE_WIDTH,
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ configurationId: string }> },
) {
  const { configurationId: rawConfigurationId } = await params;
  const configurationId = parseConfigurationId(rawConfigurationId);
  if (!configurationId) return new Response("Not found", { status: 404 });

  const requestUrl = new URL(request.url);
  let record;
  try {
    record = await getLookBookRepository().findById(configurationId);
  } catch {
    return localPlannerPdfFallback(requestUrl, configurationId);
  }
  if (!record) return localPlannerPdfFallback(requestUrl, configurationId);

  const revision = getLookBookPdfRevision(record);
  if (requestUrl.searchParams.get(PDF_REVISION_PARAMETER) !== revision) {
    return currentRevisionRedirect(requestUrl, revision);
  }

  const sourceUrl = new URL(`/lookbook/${configurationId}`, requestUrl.origin);
  sourceUrl.searchParams.set("print", "1");
  carryPreviewShareToken(requestUrl, sourceUrl);
  const disposition =
    requestUrl.searchParams.get("disposition") === "attachment"
      ? "attachment"
      : "inline";

  try {
    const artifact = await getLookBookPdfArtifact(
      `${configurationId}:${revision}`,
      () => renderLookBookPdf(request, sourceUrl),
    );
    const fileName = pdfFileName(record.homeDisplayName);
    console.info(
      JSON.stringify({
        event: "lookbook_pdf_served",
        source: artifact.source,
        revision,
      }),
    );

    return new Response(createLookBookPdfResponseStream(artifact.bytes), {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Content-Type": "application/pdf",
        ETag: `"${revision}"`,
        "Vercel-CDN-Cache-Control": `public, s-maxage=${PDF_CDN_MAX_AGE}`,
        "X-Content-Type-Options": "nosniff",
        "X-Look-Book-Pdf-Revision": revision,
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (error) {
    console.error(
      "lookbook_pdf_generation_failed",
      error instanceof Error ? error.message : "unknown_error",
    );
    return pdfErrorResponse();
  }
}
