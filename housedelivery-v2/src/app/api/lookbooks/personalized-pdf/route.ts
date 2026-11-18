import { createHash } from "node:crypto";

import { LookBookValidationError } from "@/lib/lookbook/domain";
import { LookBookPdfArtifactCoordinator } from "@/lib/lookbook/pdf-artifact";
import { createLookBookPdfResponseStream } from "@/lib/lookbook/pdf-response";
import {
  personalizedLookBookDocumentHeader,
  personalizedLookBookRequestLimit,
  resolvePersonalizedLookBook,
} from "@/lib/lookbook/personalized";
import { renderLookBookPdf } from "@/lib/lookbook/render-pdf";
import { carryPreviewShareToken } from "@/lib/pdf/request-browser";

export const runtime = "nodejs";
export const maxDuration = 180;

// Reuse identical in-flight jobs without keeping completed personalized files.
const pdfJobs = new LookBookPdfArtifactCoordinator(0);
const maxPendingRequests = 3;
let pendingRequests = 0;

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  if (request.headers.get("origin") !== requestUrl.origin) {
    return errorResponse("Please use the Look Book form on this website.", 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return errorResponse("Please submit the Look Book form as JSON.", 415);
  }
  if (Number(request.headers.get("content-length")) > personalizedLookBookRequestLimit) {
    return errorResponse("The Look Book request is too large.", 413);
  }

  let book;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > personalizedLookBookRequestLimit) {
      return errorResponse("The Look Book request is too large.", 413);
    }
    book = resolvePersonalizedLookBook(JSON.parse(body));
  } catch (error) {
    return errorResponse(error instanceof LookBookValidationError ? error.message : "The Look Book request is invalid.", 400);
  }

  if (pendingRequests >= maxPendingRequests) {
    return errorResponse("The PDF service is busy. Please try again shortly.", 429);
  }
  pendingRequests += 1;
  try {
    const source = new URL("/lookbook/personalized-print", requestUrl.origin);
    carryPreviewShareToken(requestUrl, source);
    const document = JSON.stringify(book.document);
    const key = createHash("sha256").update(document).digest("hex");
    const { bytes } = await pdfJobs.getOrRender(key, () => renderLookBookPdf(request, source, {
      [personalizedLookBookDocumentHeader]: Buffer.from(document).toString("base64url"),
    }));
    return new Response(createLookBookPdfResponseStream(bytes), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="House-Delivery-${book.definition.homeId}-Look-Book.pdf"`,
        "Content-Type": "application/pdf",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (error) {
    console.error("personalized_lookbook_pdf_failed", error instanceof Error ? error.message : "unknown_error");
    return errorResponse("Your PDF couldn’t be prepared. Please try creating it again.", 503);
  } finally {
    pendingRequests -= 1;
  }
}
