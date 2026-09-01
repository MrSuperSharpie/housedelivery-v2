import { createInternalDocumentPdf } from "@/lib/pdf/internal-document";
import { getPlannerProjectForReviewToken } from "@/lib/planner-review-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const project = await getPlannerProjectForReviewToken(token);
  if (!project) return new Response("Not found", { status: 404 });

  try {
    return await createInternalDocumentPdf({
      request,
      sourcePath: `/internal/project-review/${token}/opportunity-report`,
      selector: "[data-opportunity-report-document]",
      fileName: `House-Delivery-${project.opportunityReportReference}.pdf`,
    });
  } catch (error) {
    console.error(
      "planner_opportunity_report_pdf_failed",
      error instanceof Error ? error.message : "unknown_error",
    );
    return new Response("Unable to generate Opportunity Report PDF", {
      status: 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
