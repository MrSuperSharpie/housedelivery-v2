import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import type { PropertyReviewResult } from "@/lib/property-review/types";

const expiryMs = 2 * 60 * 60 * 1000;
const maxTokenLength = 10_000;
const context = "house-delivery:campaign-property-review:v1";
const normalize = (value: string) => value.trim().replace(/\s+/g, " ");
function key(secret: string) { return createHash("sha256").update(context).update("\0").update(secret).digest(); }

// The encrypted receipt preserves the exact review for the sales email without
// exposing internal rule details or relying on a shared serverless instance.
export function sealCampaignReview(review: PropertyReviewResult, address: string, municipality: string, nonce: string, secret: string, now = Date.now()) {
  const safeReview = { ...review };
  delete safeReview.parcelGeometry;
  const compressed = deflateRawSync(Buffer.from(JSON.stringify({ review: safeReview, address: normalize(address), municipality: normalize(municipality), nonce, createdAt: now })));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
  if (token.length > maxTokenLength) throw new Error("Property review receipt exceeds size limit");
  return token;
}

export function openCampaignReview(token: unknown, address: string, municipality: string, nonce: string, secret: string, now = Date.now()): PropertyReviewResult | undefined {
  if (typeof token !== "string" || token.length > maxTokenLength || !/^[A-Za-z0-9_-]+$/.test(token)) return;
  try {
    const bytes = Buffer.from(token, "base64url");
    if (bytes.length < 29) return;
    const decipher = createDecipheriv("aes-256-gcm", key(secret), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const compressed = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
    const payload = JSON.parse(inflateRawSync(compressed, { maxOutputLength: 200_000 }).toString()) as { review: PropertyReviewResult; address: string; municipality: string; nonce: string; createdAt: number };
    if (payload.nonce !== nonce || payload.address !== normalize(address) || payload.municipality !== normalize(municipality) || !Number.isFinite(payload.createdAt) || now - payload.createdAt < 0 || now - payload.createdAt > expiryMs) return;
    if (!["GREEN", "YELLOW", "RED"].includes(payload.review?.leadState)) return;
    return payload.review;
  } catch { return; }
}
