import { createInternalDocumentPdf } from "@/lib/pdf/internal-document";
import { getPlannerProjectForReviewToken } from "@/lib/planner-review-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; revision: string }> },
) {
  const { token, revision: rawRevision } = await params;
  const revision = Number(rawRevision);
  if (!Number.isSafeInteger(revision) || revision < 1) {
    return new Response("Not found", { status: 404 });
  }
  const project = await getPlannerProjectForReviewToken(token);
  const draft = project?.louDrafts.find((item) => item.revision === revision);
  if (!project || !draft) return new Response("Not found", { status: 404 });

  try {
    return await createInternalDocumentPdf({
      request,
      sourcePath: `/internal/project-review/${token}/lou/${revision}`,
      selector: "[data-lou-document]",
      fileName: `House-Delivery-${project.id}-LOU-Draft-R${revision}.pdf`,
    });
  } catch (error) {
    console.error(
      "planner_lou_pdf_failed",
      error instanceof Error ? error.message : "unknown_error",
    );
    return new Response("Unable to generate LOU Draft PDF", {
      status: 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
