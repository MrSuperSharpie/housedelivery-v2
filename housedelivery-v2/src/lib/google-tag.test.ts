import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { googleAdsConversion, googleAdsId, googleAnalyticsId, googleTagInitialization } from "./google-tag";

const reference = "a96dc47f-8e49-4d08-880a-497b1cb84dc2";
// Deliberately synthetic, unit-test-only strings; never deployment settings.
const destinations = {
  "custom-homes": `${googleAdsId}/UNIT_TEST_CUSTOM_ONLY`,
  "laneway-carriage-homes": `${googleAdsId}/UNIT_TEST_LANEWAY_ONLY`,
};

test("the shared bootstrap configures GA4 and the supplied Ads ID exactly once", () => {
  const window: { dataLayer?: unknown[] } = {};
  runInNewContext(googleTagInitialization, { window });
  const commands = Array.from(window.dataLayer!, command => Array.from(command as ArrayLike<unknown>));
  assert.deepEqual(commands.map(command => command.slice(0, 2)), [["js", commands[0][1]], ["config", googleAnalyticsId], ["config", googleAdsId]]);
  assert.equal((commands[1][2] as Record<string, unknown>).send_page_view, false);
  assert.equal((commands[1][2] as Record<string, unknown>).allow_google_signals, false);
  for (const command of commands.slice(1)) assert.equal((command[2] as Record<string, unknown>).allow_ad_personalization_signals, false);
  assert.ok(!commands.some(command => command[0] === "event"), "initializing tags never declares a lead conversion");
  assert.doesNotMatch(googleTagInitialization, /createElement|gtm\.js|user_data/);
});

test("verified campaign destinations are separate and carry only an anonymous transaction ID", () => {
  assert.deepEqual(googleAdsConversion(reference, "custom-homes", destinations), { send_to: destinations["custom-homes"], transaction_id: reference });
  assert.deepEqual(googleAdsConversion(reference, "laneway-carriage-homes", destinations), { send_to: destinations["laneway-carriage-homes"], transaction_id: reference });
  assert.notEqual(googleAdsConversion(reference, "custom-homes", destinations)!.send_to, googleAdsConversion(reference, "laneway-carriage-homes", destinations)!.send_to);
});

test("default destinations match the two actual conversion snippets supplied by Edgar", () => {
  assert.deepEqual(googleAdsConversion(reference, "custom-homes"), { send_to: "AW-18548497593/iH1vCKiUlLkdELm5zoxF", transaction_id: reference });
  assert.deepEqual(googleAdsConversion(reference, "laneway-carriage-homes"), { send_to: "AW-18548497593/zTrzCKuUlLkdELm5zoxF", transaction_id: reference });
});

test("missing, malformed or other-account snippets never fabricate Ads conversions", () => {
  for (const value of [undefined, "", "AW-18548497593", "AW-123/OTHER_ACCOUNT", "https://example.test/label", "AW-18548497593/<script>"]) {
    assert.equal(googleAdsConversion(reference, "custom-homes", { "custom-homes": value }), null);
  }
  assert.equal(googleAdsConversion(reference, "custom-homes", {}), null);
  assert.equal(googleAdsConversion("private@example.test", "custom-homes", destinations), null);
  assert.equal(googleAdsConversion(reference, "custom-homes", { "laneway-carriage-homes": destinations["laneway-carriage-homes"] }), null);
});
