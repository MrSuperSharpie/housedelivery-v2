import assert from "node:assert/strict";
import test from "node:test";

import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

// Next.js resolves this marker during bundling. Use its empty server module
// in the standalone QA runner; production code keeps the server-only guard.
const require = createRequire(import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: pathToFileURL(require.resolve("next/dist/compiled/server-only/empty.js")).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { POST } = await import("../src/app/api/inquiries/route.ts");
const { inquiryModels } = await import("../src/data/inquiry-models.ts");

test("structured planner handoff validates all homes and confirms provider acceptance", async (context) => {
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "pricing-test-only";
  const deliveries = [];
  let providerResult = { id: "planner-test-message" };
  let providerStatus = 200;
  context.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://api.resend.com/emails");
    deliveries.push({ message: JSON.parse(init.body), key: init.headers["Idempotency-Key"] });
    return Response.json(providerResult, { status: providerStatus });
  });
  const budgetProject = {
    version: 1,
    homes: [
      { id: "a", modelId: "solace", quantity: 2, finish: "signature", selections: "Kitchen: Premium; bathroom: Signature" },
      { id: "b", modelId: "carriage:willow-nook", quantity: 1, finish: "undecided", selections: "" },
      { id: "c", modelId: "catalog:the-micro", quantity: 1, finish: "essential", selections: "" },
    ], location: "QA site, BC", requests: ["accessibility", "offGrid"], details: "Review step-free access",
  };
  const body = { firstName: "Planner", lastName: "QA", email: "qa@example.com", model: "solace", location: budgetProject.location, budgetProject };
  const send = (payload) => POST(new Request("http://localhost/api/inquiries", { method: "POST", body: JSON.stringify(payload) }));
  try {
    const accepted = await send(body);
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), { accepted: true });
    assert.match(deliveries[0].message.text, /Solace × 2/);
    assert.match(deliveries[0].message.text, /The Willow Nook × 1/);
    assert.match(deliveries[0].message.text, /The Micro × 1/);
    assert.match(deliveries[0].message.text, /Kitchen: Premium; bathroom: Signature/);
    assert.match(deliveries[0].message.text, /Review step-free access/);
    assert.match(deliveries[0].message.text, /Off-grid needs/);
    assert.match(deliveries[0].message.text, /Request package pricing/);
    assert.doesNotMatch(deliveries[0].message.text, /\$/);
    const changed = { ...body, budgetProject: { ...budgetProject, homes: budgetProject.homes.map((line, index) => index ? line : { ...line, finish: "premium" }) } };
    assert.equal((await send(changed)).status, 200);
    assert.notEqual(deliveries[0].key, deliveries[1].key);
    for (const update of [
      { homes: [{ ...budgetProject.homes[0], modelId: "unknown" }] },
      { homes: [{ ...budgetProject.homes[0], quantity: 0 }] },
      { homes: [{ ...budgetProject.homes[0], finish: ["premium", "signature"] }] },
      { location: "Conflicting site" },
    ]) assert.equal((await send({ ...body, budgetProject: { ...budgetProject, ...update } })).status, 400);
    assert.equal((await send({ ...body, plannerContext: "Conflicting planner" })).status, 400);
    assert.equal(deliveries.length, 2);
    providerResult = {};
    assert.equal((await send(body)).status, 502, "provider ID is required for success");
    providerStatus = 500;
    assert.equal((await send(body)).status, 502, "provider failure is not accepted");
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test("budget enquiries accept each home family and retain finish details in the handoff", async (context) => {
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "pricing-test-only";
  const messages = [];
  context.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://api.resend.com/emails");
    messages.push(JSON.parse(String(init.body)));
    return Response.json({ id: "pricing-test-message" });
  });

  try {
    for (const model of [
      inquiryModels.find((item) => item.slug === "saturna"),
      inquiryModels.find((item) => item.slug.startsWith("catalog:")),
      inquiryModels.find((item) => item.slug.startsWith("carriage:")),
    ]) {
      const response = await POST(new Request("http://localhost/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Pricing",
          lastName: "QA",
          email: "pricing-qa@example.com",
          model: model.slug,
          notes: "Budget enquiry. Kitchen: Signature; bathroom: Premium.",
        }),
      }));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { accepted: true });
      assert.ok(messages.at(-1).text.includes(model.name));
      assert.match(messages.at(-1).text, /Kitchen: Signature; bathroom: Premium/);
    }
    const invalid = await POST(new Request("http://localhost/api/inquiries", {
      method: "POST",
      body: JSON.stringify({ firstName: "Pricing", lastName: "QA", email: "pricing-qa@example.com", model: "unverified-supplier-model" }),
    }));
    assert.equal(invalid.status, 400);
    assert.equal(messages.length, 3);
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});
