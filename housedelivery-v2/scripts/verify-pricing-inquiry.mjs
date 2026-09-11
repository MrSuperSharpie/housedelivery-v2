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
