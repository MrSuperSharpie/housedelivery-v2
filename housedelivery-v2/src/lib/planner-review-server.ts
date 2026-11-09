import "server-only";

import {
  findPlannerProjectByReviewTokenHash,
} from "@/lib/planner-project-repository";
import {
  hashPlannerReviewToken,
  isPlannerReviewToken,
  plannerReviewTokenMatches,
} from "@/lib/planner-review-access";

export async function getPlannerProjectForReviewToken(token: string) {
  if (!isPlannerReviewToken(token)) return null;
  const tokenHash = hashPlannerReviewToken(token);
  const project = await findPlannerProjectByReviewTokenHash(tokenHash);
  if (!project || !plannerReviewTokenMatches(token, project.reviewTokenHash)) {
    return null;
  }
  return project;
}
