import assert from "node:assert/strict";
import test from "node:test";
import { parseBuildHomeInquiry } from "@/lib/build-home-inquiry";
import { campaignPaths, createLeadRecord, parseLeadContext, sanitizeTouch } from "@/lib/campaign-lead";
import { leadAttachments } from "@/lib/campaign-lead-export";
const inquiry = parseBuildHomeInquiry({ fullName: "=Example", email: "test@example.com", municipality: "Victoria", projectType: "Custom home", ownership: "Yes, I own the property", timeline: "6–12 months", details: 'A home, with "character".\nMore detail.' });
const touch = { landingPath: campaignPaths["custom-homes"], capturedAt: "2026-10-27T12:00:00Z", utm_source: "google", utm_campaign: "custom-homes", gclid: "TEST-click_123", email: "private@example.com", arbitrary: "secret" };
test("campaign validation prevents audience mismatch and unknown source paths", () => {
  assert.throws(() => parseLeadContext({ campaign: "other" }, inquiry));
  assert.throws(() => parseLeadContext({ campaign: "laneway-carriage-homes" }, inquiry));
  assert.throws(() => parseLeadContext({ propertyAddress: "Injected\nHeader" }, inquiry));
  assert.equal(parseLeadContext({}, inquiry).sourcePath, "/build-your-home");
});
test("only accepted attribution retains allowlisted campaign fields and click identifiers", () => {
  const clean = sanitizeTouch(touch)!;
  assert.equal(clean.gclid, "TEST-click_123");
  assert.equal("email" in clean, false);
  assert.equal("arbitrary" in clean, false);
  assert.equal(sanitizeTouch({ ...touch, landingPath: "https://evil.example" }), undefined);
  assert.equal(sanitizeTouch({ ...touch, gclid: "contact@example.com", utm_source: "private@example.com" })?.gclid, undefined);
  for (const consent of ["declined", "unset", undefined]) {
    assert.equal(parseLeadContext({ attribution: { consent, firstTouch: touch } }, inquiry).attribution.firstTouch, undefined);
  }
  assert.equal(parseLeadContext({ attribution: { consent: "accepted", firstTouch: touch } }, inquiry).attribution.firstTouch?.utm_source, "google");
});
test("CRM exports preserve qualification and attribution, quote multiline fields and neutralize CSV formulas", () => {
  const context = parseLeadContext({ campaign: "custom-homes", modelInterest: "The Cedarview", attribution: { consent: "accepted", firstTouch: touch, latestTouch: { ...touch, utm_campaign: "returning" } } }, inquiry);
  const record = createLeadRecord(inquiry, "test-reference", context, new Date("2026-10-27T12:00:00Z"));
  assert.equal(record.first_utm_campaign, "custom-homes"); assert.equal(record.latest_utm_campaign, "returning");
  assert.equal(record.property_ownership, inquiry.ownership); assert.equal(record.construction_timeline, inquiry.timeline);
  const [csv, json] = leadAttachments(record);
  const csvText = Buffer.from(csv.content, "base64").toString();
  assert.ok(csvText.includes('"\'=Example"')); assert.ok(csvText.includes('"A home, with ""character"".\nMore detail."'));
  assert.deepEqual(JSON.parse(Buffer.from(json.content, "base64").toString()), record);
});
