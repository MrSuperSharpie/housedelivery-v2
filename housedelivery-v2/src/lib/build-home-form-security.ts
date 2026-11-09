import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const tokenLifetimeMs = 2 * 60 * 60 * 1000;
const minimumFormTimeMs = 2_000;

function signature(value: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`house-delivery:build-home-form:v1:${value}`)
    .digest("hex");
}

export function createFormToken(secret: string, now = Date.now()) {
  const value = `${now}.${randomUUID()}`;
  return `${value}.${signature(value, secret)}`;
}

export function verifyFormToken(token: unknown, secret: string, now = Date.now()) {
  if (typeof token !== "string" || token.length > 180) return undefined;
  const [timestamp, nonce, supplied, extra] = token.split(".");
  if (extra || !/^\d{13}$/.test(timestamp ?? "") || !/^[a-f0-9-]{36}$/.test(nonce ?? "") || !/^[a-f0-9]{64}$/.test(supplied ?? "")) return undefined;
  const age = now - Number(timestamp);
  if (age < minimumFormTimeMs || age > tokenLifetimeMs) return undefined;
  const expected = signature(`${timestamp}.${nonce}`, secret);
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)) ? nonce : undefined;
}

// Best-effort, bounded protection per warm function instance. The signed token,
// honeypot and provider idempotency apply independently. Use Vercel WAF for a
// distributed rate limit if campaign abuse warrants it; no paid service added.
export function createInquiryRateLimit() {
  const attempts = new Map<string, { count: number; expires: number }>();
  return (key: string, now = Date.now()) => {
    for (const [entry, value] of attempts) {
      if (value.expires <= now) attempts.delete(entry);
    }
    const value = attempts.get(key);
    if (value && value.count >= 5) return false;
    if (value) value.count += 1;
    else {
      if (attempts.size >= 2_000) return false;
      attempts.set(key, { count: 1, expires: now + 15 * 60 * 1000 });
    }
    return true;
  };
}
