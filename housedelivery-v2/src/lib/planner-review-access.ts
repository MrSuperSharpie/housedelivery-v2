import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export class PlannerReviewAccessConfigurationError extends Error {}

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function derivePlannerReviewToken(
  submissionId: string,
  secret: string,
) {
  if (secret.length < 32) {
    throw new PlannerReviewAccessConfigurationError(
      "Planner review access is not configured.",
    );
  }

  return createHmac("sha256", secret)
    .update(`house-delivery:planner-review:${submissionId}`)
    .digest("base64url");
}

export function hashPlannerReviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isPlannerReviewToken(value: string) {
  return tokenPattern.test(value);
}

export function plannerReviewTokenMatches(token: string, expectedHash: string) {
  if (!isPlannerReviewToken(token) || !/^[a-f0-9]{64}$/.test(expectedHash)) {
    return false;
  }
  return timingSafeEqual(
    Buffer.from(hashPlannerReviewToken(token), "hex"),
    Buffer.from(expectedHash, "hex"),
  );
}
