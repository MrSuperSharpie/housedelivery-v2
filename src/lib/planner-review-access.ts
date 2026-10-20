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

export function isTrustedPlannerReviewMutationRequest(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  // Fetch Metadata is set by the browser and cannot be overridden by a
  // cross-site form. Prefer it to host equality because Vercel can present an
  // immutable deployment host to the function while the browser uses the
  // branch alias.
  if (fetchSite === "same-origin") return true;
  if (fetchSite === "cross-site") return false;

  if (!origin) {
    return !fetchSite || fetchSite === "none";
  }

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = request.headers.get("host")?.trim();
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const expectedProtocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);
  const expectedHosts = new Set(
    [
      requestUrl.host,
      forwardedHost,
      host,
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_URL,
    ].filter(
      (candidate): candidate is string => Boolean(candidate),
    ),
  );

  return originUrl.protocol === `${expectedProtocol}:` &&
    expectedHosts.has(originUrl.host);
}
