import { parseConfigurationId } from "@/lib/lookbook/domain";
import {
  getLookBookPdfArtifact,
  getLookBookPdfRevision,
} from "@/lib/lookbook/pdf-artifact";
import { getLookBookRepository } from "@/lib/lookbook/repository";
import { createLookBookPdfResponseStream } from "@/lib/lookbook/pdf-response";
import { renderLookBookPdf } from "@/lib/lookbook/render-pdf";
import { carryPreviewShareToken } from "@/lib/pdf/request-browser";
import { canReadSavedLookBook } from "@/lib/planner-review-access";

export const dynamic = "force-dynamic";
export const maxDuration = 180;
export const runtime = "nodejs";

const PDF_REVISION_PARAMETER = "pdfRevision";

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
      Location: revisionUrl.pathname + revisionUrl.search,
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ configurationId: string }> },
) {
  const { configurationId: rawConfigurationId } = await params;
  const configurationId = parseConfigurationId(rawConfigurationId);
  if (!configurationId) return new Response("Not found", { status: 404 });

  const requestUrl = new URL(request.url);
  const projectAccess = requestUrl.searchParams.get("projectAccess");
  let record;
  try {
    record = await getLookBookRepository().findById(configurationId);
    if (!record || !canReadSavedLookBook(record, projectAccess)) {
      return new Response("Saved Look Book not found.", {
        status: 404,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      });
    }
  } catch {
    return pdfErrorResponse();
  }

  const revision = getLookBookPdfRevision(record);
  if (requestUrl.searchParams.get(PDF_REVISION_PARAMETER) !== revision) {
    return currentRevisionRedirect(requestUrl, revision);
  }

  const sourceUrl = new URL(`/lookbook/${configurationId}`, requestUrl.origin);
  sourceUrl.searchParams.set("print", "1");
  if (projectAccess) sourceUrl.searchParams.set("projectAccess", projectAccess);
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
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Content-Type": "application/pdf",
        ETag: `"${revision}"`,
        "Vercel-CDN-Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Look-Book-Pdf-Revision": revision,
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error(
      "lookbook_pdf_generation_failed",
      projectAccess ? message.replaceAll(projectAccess, "[redacted]") : message,
    );
    return pdfErrorResponse();
  }
}
