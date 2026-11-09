import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyAnalyticsClick,
  getSafeAnalyticsPath,
  isProductionAnalyticsHost,
  sanitizeAnalyticsProperties,
} from "@/lib/analytics";
import { readUtmTouch } from "@/lib/lookbook/attribution";

test("safe analytics paths retain only supported campaign parameters", () => {
  const searchParams = new URLSearchParams(
    "utm_source=linkedin&utm_id=fall-1&email=person%40example.com&project=secret",
  );
  assert.equal(
    getSafeAnalyticsPath("/homes/canmore", searchParams),
    "/homes/canmore?utm_source=linkedin&utm_id=fall-1",
  );
});

test("analytics providers are restricted to public production hostnames", () => {
  assert.equal(isProductionAnalyticsHost("housedelivery.ca"), true);
  assert.equal(isProductionAnalyticsHost("www.housedelivery.ca"), true);
  assert.equal(isProductionAnalyticsHost("localhost"), false);
  assert.equal(
    isProductionAnalyticsHost("housedelivery-v2-git-feature.vercel.app"),
    false,
  );
});

test("analytics properties remove contact and project-detail fields", () => {
  assert.deepEqual(
    sanitizeAnalyticsProperties({
      email: "person@example.com",
      phone: "555-555-5555",
      location: "Private address",
      notes: "Private notes",
      event_category: "lookbook",
      home_slug: "solace",
    }),
    { event_category: "lookbook", home_slug: "solace" },
  );
});

test("delegated action tracking classifies key public actions", () => {
  assert.equal(
    classifyAnalyticsClick({ href: "mailto:hello@housedelivery.ca", text: "Email" }),
    "email_click",
  );
  assert.equal(
    classifyAnalyticsClick({ href: "/lookbook/id/pdf?disposition=attachment", text: "PDF" }),
    "lookbook_pdf_download",
  );
  assert.equal(
    classifyAnalyticsClick({ href: "/plan-a-housing-project", text: "Plan a housing project" }),
    "quote_cta_click",
  );
  assert.equal(
    classifyAnalyticsClick({ text: "Design My Solace — Premium" }),
    "configurator_cta_click",
  );
});

test("campaign attribution accepts all supported UTM fields without contact data", () => {
  assert.deepEqual(
    readUtmTouch(
      new URLSearchParams(
        "utm_source=linkedin&utm_medium=paid-social&utm_campaign=developers&utm_content=video-a&utm_term=modular-home&utm_id=li-42&email=ignored%40example.com",
      ),
    ),
    {
      utmSource: "linkedin",
      utmMedium: "paid-social",
      utmCampaign: "developers",
      utmContent: "video-a",
      utmTerm: "modular-home",
      utmId: "li-42",
    },
  );
});
