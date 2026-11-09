import assert from "node:assert/strict";
import test from "node:test";

import { formatBuildHomeInquiry, InquiryValidationError, parseBuildHomeInquiry } from "@/lib/build-home-inquiry";
import { createFormToken, createInquiryRateLimit, verifyFormToken } from "@/lib/build-home-form-security";
import { sealCampaignReview } from "@/lib/property-review/campaign-token";
import type { PropertyReviewResult } from "@/lib/property-review/types";
import { GET, POST } from "@/app/api/build-your-home-inquiries/route";

const example = {
  fullName: "Avery Example",
  email: "avery@example.com",
  phone: "",
  municipality: "Victoria",
  projectType: "Custom home",
  ownership: "Yes, I own the property",
  timeline: "6–12 months",
  details: "A family home on our existing lot.",
};
const secret = "local-test-secret-not-a-credential";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://preview.example/api/build-your-home-inquiries", {
    method: "POST",
    headers: { origin: "https://preview.example", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("inquiries accept full names without imposing a Western two-name format", () => {
  assert.equal(parseBuildHomeInquiry({ ...example, fullName: "  Avery  ", email: "AVERY@EXAMPLE.COM" }).fullName, "Avery");
  assert.equal(parseBuildHomeInquiry({ ...example, email: "AVERY@EXAMPLE.COM" }).email, "avery@example.com");
});

test("required qualification fields, enumerated values and length limits are enforced", () => {
  for (const key of ["fullName", "email", "municipality", "projectType", "ownership", "timeline"]) {
    assert.throws(() => parseBuildHomeInquiry({ ...example, [key]: "" }), InquiryValidationError);
  }
  for (const change of [{ projectType: "Unsupported" }, { ownership: "maybe" }, { timeline: "yesterday" }, { email: "invalid" }, { fullName: "Injected\r\nSubject: spam" }, { details: "x".repeat(2501) }, { phone: {} }]) {
    assert.throws(() => parseBuildHomeInquiry({ ...example, ...change }), InquiryValidationError);
  }
  assert.equal(parseBuildHomeInquiry({ ...example, phone: undefined, details: undefined }).details, "");
});

test("lead notification contains all qualification fields and starts unqualified", () => {
  const message = formatBuildHomeInquiry(parseBuildHomeInquiry(example), "reference");
  for (const value of Object.values(example).filter(Boolean)) assert.ok(message.includes(value));
  assert.match(message, /qualification and personal follow-up needed/);
  assert.match(message, /not a marketing subscription/);
  assert.doesNotMatch(message, /showcase|demonstration|supplier|Qualified Inquiry/);
});

test("signed form tokens reject tampering, early use, expiry and future timestamps", () => {
  const now = 1_800_000_000_000;
  const token = createFormToken(secret, now);
  assert.ok(verifyFormToken(token, secret, now + 2000));
  assert.equal(verifyFormToken(token, secret, now + 1999), undefined);
  assert.equal(verifyFormToken(token, secret, now + 2 * 60 * 60 * 1000 + 1), undefined);
  assert.equal(verifyFormToken(token, "different-secret", now + 3000), undefined);
  assert.equal(verifyFormToken(`${token}extra`, secret, now + 3000), undefined);
  assert.equal(verifyFormToken(token, secret, now - 1000), undefined);
  assert.equal(verifyFormToken({}, secret, now + 3000), undefined);
});

test("bounded per-instance rate limit allows five attempts and recovers after the window", () => {
  const allow = createInquiryRateLimit();
  for (let i = 0; i < 5; i++) assert.equal(allow("client-a", 0), true);
  assert.equal(allow("client-a", 1), false);
  assert.equal(allow("client-b", 1), true);
  assert.equal(allow("client-a", 15 * 60 * 1000), true);
});

test("API verifies delivery, privacy, spam controls and provider failures", async (t) => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousSecret = process.env.BUILD_HOME_FORM_SECRET;
  const previousCc = process.env.BUILD_HOME_NOTIFICATION_CC;
  process.env.RESEND_API_KEY = "local-test-provider-key";
  process.env.BUILD_HOME_FORM_SECRET = secret;
  delete process.env.BUILD_HOME_NOTIFICATION_CC;
  t.after(() => {
    for (const [key, value] of Object.entries({ RESEND_API_KEY: previousKey, BUILD_HOME_FORM_SECRET: previousSecret, BUILD_HOME_NOTIFICATION_CC: previousCc })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const delivered: { body: Record<string, unknown>; key: string }[] = [];
  let providerStatus = 200;
  let providerBody: object = { id: "test-provider-message" };
  const fetchMock = t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(url, "https://api.resend.com/emails");
    delivered.push({ body: JSON.parse(String(init?.body)), key: new Headers(init?.headers).get("idempotency-key")! });
    return Response.json(providerBody, { status: providerStatus });
  });
  const token = createFormToken(secret, Date.now() - 3000);
  const payload = { ...example, token, campaign: "custom-homes", attribution: { consent: "accepted", firstTouch: { landingPath: "/build-your-home/custom-homes", capturedAt: "2026-10-27T12:00:00Z", utm_source: "preview-qa", gclid: "TEST_ONLY_click" } } };

  const challenge = await GET();
  assert.equal(challenge.status, 200);
  assert.equal(challenge.headers.get("cache-control"), "no-store");
  assert.equal(typeof (await challenge.json()).token, "string");

  assert.equal((await POST(request(payload, { origin: "https://attacker.example" }))).status, 403);
  assert.equal((await POST(request(payload, { "content-type": "text/plain" }))).status, 415);
  assert.equal((await POST(request(payload, { "content-length": "17000" }))).status, 413);
  assert.equal((await POST(request({ ...payload, details: "x".repeat(17000) }))).status, 400);
  assert.equal((await POST(request({ ...payload, company: "bot" }))).status, 400);
  assert.equal((await POST(request({ ...payload, token: "tampered" }))).status, 400);
  assert.equal((await POST(request({ ...payload, ownership: "" }))).status, 400);
  assert.equal(fetchMock.mock.callCount(), 0, "invalid submissions must never reach the email provider");

  const response = await POST(request(payload));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.accepted, true);
  assert.equal(typeof result.inquiryId, "string");
  assert.deepEqual(delivered[0].body.to, ["sales@housedelivery.ca"]);
  assert.equal(delivered[0].body.reply_to, example.email);
  assert.match(String(delivered[0].body.text), /Source: \/build-your-home\/custom-homes/);
  const attachments = delivered[0].body.attachments as { filename: string; content: string }[];
  assert.equal(attachments.length, 2);
  const crm = JSON.parse(Buffer.from(attachments[1].content, "base64").toString());
  assert.equal(crm.first_gclid, "TEST_ONLY_click");
  assert.equal(crm.email, example.email);
  assert.equal(delivered[0].body.cc, undefined, "distribution address owns notification routing");
  assert.equal(delivered[0].key, `build-home-${result.inquiryId}`);
  assert.equal(JSON.stringify(result).includes(example.email), false);

  await POST(request(payload));
  assert.equal(delivered[1].key, delivered[0].key, "retry uses the same provider idempotency key");
  assert.deepEqual(delivered[1].body, delivered[0].body, "retry body remains stable for provider idempotency");
  providerStatus = 429;
  providerBody = { message: "provider failed" };
  const rejected = await POST(request(payload));
  assert.equal(rejected.status, 502);
  assert.equal((await rejected.json()).accepted, undefined);
  providerStatus = 200;
  providerBody = {};
  assert.equal((await POST(request(payload))).status, 502, "HTTP 200 without a provider message ID is not success");

  providerBody = { id: "test-provider-message" };
  process.env.BUILD_HOME_NOTIFICATION_CC = "invalid-address";
  assert.equal((await POST(request(payload, { "x-vercel-forwarded-for": "192.0.2.99" }))).status, 200);
  process.env.BUILD_HOME_NOTIFICATION_CC = "confirmed-colleague@example.com";
  assert.equal((await POST(request(payload, { "x-vercel-forwarded-for": "192.0.2.99" }))).status, 200);
  assert.equal(delivered.at(-1)?.body.cc, undefined, "legacy CC settings cannot duplicate distribution notifications");
  delete process.env.RESEND_API_KEY;
  assert.equal((await POST(request(payload))).status, 503);
});

test("property review lead retains the verified assessment in one sales notification and CRM export", async (t) => {
  const oldKey = process.env.RESEND_API_KEY; const oldSecret = process.env.BUILD_HOME_FORM_SECRET;
  process.env.RESEND_API_KEY = "local-test-provider-key"; process.env.BUILD_HOME_FORM_SECRET = secret;
  t.after(() => { if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey; if (oldSecret === undefined) delete process.env.BUILD_HOME_FORM_SECRET; else process.env.BUILD_HOME_FORM_SECRET = oldSecret; });
  const delivered: Record<string, unknown>[] = [];
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => { delivered.push(JSON.parse(String(init?.body))); return Response.json({ id: "email-id" }); });
  const token = createFormToken(secret, Date.now() - 3000); const nonce = verifyFormToken(token, secret)!;
  const review: PropertyReviewResult = { submittedAddress:"123 Test Street, Vancouver, BC", normalizedAddress:"123 Test Street, Vancouver, BC", municipality:"Vancouver", propertyType:"Detached house", strataIndicator:"NO", multifamilyIndicator:false, commercialIndicator:false, industrialIndicator:false, appearsUnusuallyComplex:false, complexityReasons:[], leadState:"GREEN", leadStateLabel:"PROMISING", recommendedNextAction:"FOLLOW UP", matchedRules:[], screening:"LIKELY CANDIDATE", reason:"Example result", dataSources:[], zoningDistrict:"R1-1" };
  const reviewToken=sealCampaignReview(review,"123 Test Street","Vancouver",nonce,secret);
  const payload={...example, municipality:"Vancouver", projectType:"Laneway home", campaign:"laneway-carriage-homes", propertyAddress:"123 Test Street", token, reviewToken};
  assert.equal((await POST(request({...payload,propertyAddress:"Different Street"},{"x-vercel-forwarded-for":"198.51.100.91"}))).status,400);
  assert.equal(delivered.length,0,"a review cannot be reused for a different property");
  const response=await POST(request(payload,{"x-vercel-forwarded-for":"198.51.100.91"}));
  assert.equal(response.status,200); assert.equal(delivered.length,1); assert.deepEqual(delivered[0].to,["sales@housedelivery.ca"]); assert.equal(delivered[0].cc,undefined);
  assert.match(String(delivered[0].text),/PROPERTY INTELLIGENCE/); assert.match(String(delivered[0].text),/R1-1/);
  const attachments=delivered[0].attachments as {content:string}[];
  const record=JSON.parse(Buffer.from(attachments[1].content,"base64").toString());
  assert.equal(record.property_review_status,"GREEN"); assert.equal(record.property_review_zoning,"R1-1");
});
