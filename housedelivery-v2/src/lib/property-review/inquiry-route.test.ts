import assert from "node:assert/strict";
import Module from "node:module";
import test from "node:test";

test("restored property enquiries return a snapshot and retain internal/customer delivery without sending email", async (t) => {
  // Next.js supplies this marker through its compiler aliases. The standalone
  // Node test still runs server code; it only needs the marker to be inert.
  const loader = Module as unknown as { _load: (id: string, ...args: unknown[]) => unknown };
  const originalLoad = loader._load;
  t.mock.method(loader, "_load", function (this: unknown, id: string, ...args: unknown[]) {
    return id === "server-only" ? {} : Reflect.apply(originalLoad, this, [id, ...args]);
  });
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "qa-inert-key";
  t.after(() => {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  });
  const delivered: { message: Record<string, unknown>; key: string }[] = [];
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === "https://api.resend.com/emails") {
      delivered.push({
        message: JSON.parse(String(init?.body)),
        key: new Headers(init?.headers).get("Idempotency-Key") ?? "",
      });
      return Response.json({ id: `qa-${delivered.length}` });
    }
    // No real government requests: an unavailable match must produce the
    // production manual-review result rather than an invented qualification.
    return Response.json({ candidates: [], features: [] });
  });
  const { POST } = await import("@/app/api/inquiries/route");
  const response = await POST(new Request("https://preview.example/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Property", lastName: "QA", email: "qa@example.com",
      phone: "6045550100", location: "123 QA Street, Vancouver, BC",
      source: "laneway_carriage_property_review",
      considering: "Carriage home", ownership: "Yes — I own it",
      notes: "QA property review", company: "",
    }),
  }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.accepted, true);
  assert.equal(result.propertySnapshot.status, "yellow");
  assert.equal(result.propertySnapshot.modelMatchStatus, "REVIEW_PENDING");
  assert.equal(delivered.length, 2);
  assert.deepEqual(delivered[0].message.to, ["hello@housedelivery.ca"]);
  assert.deepEqual(delivered[0].message.cc, ["bfong@housedelivery.ca"]);
  assert.deepEqual(delivered[1].message.to, ["qa@example.com"]);
  assert.equal(delivered[1].key, `${delivered[0].key}-customer`);
  assert.match(delivered[0].key, /^property-review-v2-/);
  assert.match(String(delivered[0].message.text), /Carriage home|QA property review/);

  const budgetResponse = await POST(new Request("https://preview.example/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Budget", lastName: "QA", email: "qa@example.com",
      model: "catalog:the-micro", location: "QA site, BC",
      budgetProject: {
        version: 1, location: "QA site, BC", requests: [], details: "",
        homes: [{ id: "one", modelId: "catalog:the-micro", quantity: 1, finish: "premium", selections: "" }],
      },
    }),
  }));
  assert.equal(budgetResponse.status, 200);
  assert.deepEqual(await budgetResponse.json(), { accepted: true });
  assert.equal(delivered.length, 3, "ordinary budget inquiries retain one email and no property snapshot");
  assert.equal(delivered[2].message.cc, undefined);
  assert.match(delivered[2].key, /^project-inquiry-/);
  assert.match(String(delivered[2].message.text), /Premium \$250\/sq\. ft\.; Signature \$300\/sq\. ft\./);
});
