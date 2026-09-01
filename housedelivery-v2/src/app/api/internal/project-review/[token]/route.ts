import { randomUUID } from "node:crypto";

import { createPlannerLouDraft } from "@/lib/planner-documents";
import { updatePlannerProject } from "@/lib/planner-project-repository";
import { isTrustedPlannerReviewMutationRequest } from "@/lib/planner-review-access";
import { getPlannerProjectForReviewToken } from "@/lib/planner-review-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStoreResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!isTrustedPlannerReviewMutationRequest(request)) {
    return noStoreResponse("Forbidden", 403);
  }

  const { token } = await params;
  const project = await getPlannerProjectForReviewToken(token);
  if (!project) return noStoreResponse("Not found", 404);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return noStoreResponse("Invalid request", 400);
  }

  const action = String(formData.get("action") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "")
    .trim()
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, 3_000);
  const now = new Date().toISOString();
  const redirectUrl = new URL(`/internal/project-review/${token}`, request.url);

  if (action === "clarification") {
    if (!reviewNote) {
      return noStoreResponse("A clarification note is required.", 400);
    }
    await updatePlannerProject({
      ...project,
      lifecycleStatus: "house-delivery-review",
      projectState: {
        ...project.projectState,
        lifecycleStatus: "house-delivery-review",
      },
      internalReviewStatus: "clarification-required",
      reviewNotes: [
        ...project.reviewNotes,
        {
          id: randomUUID(),
          kind: "clarification",
          note: reviewNote,
          createdAt: now,
        },
      ],
      internalReviewUpdatedAt: now,
      updatedAt: now,
    });
    redirectUrl.searchParams.set("result", "clarification-recorded");
    return Response.redirect(redirectUrl, 303);
  }

  if (action === "prepare-lou") {
    const nextRevision =
      Math.max(0, ...project.louDrafts.map((draft) => draft.revision)) + 1;
    const draft = createPlannerLouDraft(project, nextRevision, now);
    await updatePlannerProject({
      ...project,
      lifecycleStatus: "lou-prepared",
      projectState: {
        ...project.projectState,
        lifecycleStatus: "lou-prepared",
        louStatus: "prepared",
      },
      internalReviewStatus: "lou-draft-prepared",
      louDrafts: [...project.louDrafts, draft],
      reviewNotes: reviewNote
        ? [
            ...project.reviewNotes,
            {
              id: randomUUID(),
              kind: "lou-preparation",
              note: reviewNote,
              createdAt: now,
            },
          ]
        : project.reviewNotes,
      internalReviewUpdatedAt: now,
      updatedAt: now,
    });
    redirectUrl.searchParams.set("result", "lou-prepared");
    return Response.redirect(redirectUrl, 303);
  }

  return noStoreResponse("Unknown review action", 400);
}
