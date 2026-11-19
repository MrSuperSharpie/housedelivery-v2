import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { parseConfigurationId } from "@/lib/lookbook/configuration-id";
import { parseProjectLookBookAccess } from "@/lib/lookbook/paths";
import type { StoredLookBook } from "@/lib/lookbook/types";

export class PlannerReviewAccessConfigurationError extends Error {}

export function getPlannerReviewSecret() {
  return (process.env.VERCEL_ENV === "preview"
    ? process.env.PLANNER_PREVIEW_REVIEW_TOKEN_SECRET
    : process.env.PLANNER_REVIEW_TOKEN_SECRET)?.trim() ?? "";
}

function derivePlannerAccessToken(purpose: string, id: string, secret: string) {
  if (secret.length < 32) {
    throw new PlannerReviewAccessConfigurationError(
      "Planner review access is not configured.",
    );
  }

  return createHmac("sha256", secret)
    .update(`house-delivery:${purpose}:${id}`)
    .digest("base64url");
}

export function derivePlannerReviewToken(
  submissionId: string,
  secret: string,
) {
  return derivePlannerAccessToken("planner-review", submissionId, secret);
}

export function hashPlannerReviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isPlannerReviewToken(value: string) {
  return Boolean(parseProjectLookBookAccess(value));
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

export function isPrivatePlannerSubmissionId(id: string) {
  const suffix = id.slice("planner-".length);
  return id.startsWith("planner-") && parseConfigurationId(suffix) === suffix;
}

export function derivePlannerLookBookAccess(
  configurationId: string,
  secret = getPlannerReviewSecret(),
) {
  return derivePlannerAccessToken("planner-lookbook", configurationId, secret);
}

export function canReadSavedLookBook(
  record: StoredLookBook,
  access: unknown,
  secret = getPlannerReviewSecret(),
) {
  // Earlier saved links use their existing opaque ID. New submitted copies
  // have their own read-only capability, separate from staff project review.
  if (record.configuration.lookBookPersonalization?.project?.documentAccess !== "signed-v1") {
    return true;
  }
  const token = parseProjectLookBookAccess(access);
  if (!token) return false;

  return timingSafeEqual(
    Buffer.from(token),
    Buffer.from(derivePlannerLookBookAccess(record.id, secret)),
  );
}

export function getPlannerDocumentOrigin(
  request: Request,
  {
    hosted = process.env.VERCEL === "1",
    deploymentHost = process.env.VERCEL_URL,
    branchHost = process.env.VERCEL_BRANCH_URL,
  } = {},
) {
  const url = new URL(request.url);
  if (!hosted) return url.origin;

  const canonical = "https://www.housedelivery.ca";
  const live = new Set([canonical, "https://housedelivery.ca"]);
  const trusted = new Set([...live, url.origin]);
  if (deploymentHost) trusted.add(`https://${deploymentHost}`);
  if (branchHost) trusted.add(`https://${branchHost}`);
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const origin = [
    request.headers.get("origin") ?? "",
    forwarded ? `https://${forwarded}` : "",
  ].find((candidate) => trusted.has(candidate)) ?? url.origin;

  return live.has(origin) ? canonical : origin;
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
