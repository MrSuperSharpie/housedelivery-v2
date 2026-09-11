import assert from "node:assert/strict";
import test from "node:test";
import { budgetPlannerCatalog } from "@/data/budget-planner-catalog";
import { inquiryModels } from "@/data/inquiry-models";
import { approvedPackagePrices, type ApprovedPackagePrice } from "@/data/package-pricing";
import { getDeliveredLinePrice, getDeliveredProjectPrice, parseHomeBudgetProject, formatHomeBudgetProject, type HomeBudgetProject } from "@/lib/home-budget-planner";

// Arithmetic fixtures only, never public selling prices.
const fixture: ApprovedPackagePrice = {
  modelId: "solace", sourceReference: "test fixture only", approvedOn: "2026-09-01", validUntil: "2026-09-30",
  specification: "Test Essential specification", currency: "CAD", essentialBase: 100000,
  premiumUpgrade: 10000, signatureUpgrade: 30000,
  delivery: { destination: "Test site", accessAssumptions: "Test access", amountPerPackage: 20000 },
};
const project: HomeBudgetProject = {
  version: 1, homes: [{ id: "one", modelId: "solace", quantity: 1, finish: "essential", selections: "" }],
  location: "Test site", requests: [], details: "",
};
const date = "2026-09-11";

test("entire public catalogue is selectable with canonical images and unknown prices", () => {
  assert.deepEqual(budgetPlannerCatalog.map((home) => home.id).sort(), inquiryModels.map((home) => home.slug).sort());
  assert.equal(approvedPackagePrices.length, 0);
  for (const home of budgetPlannerCatalog) {
    assert.ok(home.images.length && home.images.every((image) => image.src && image.alt));
    const selected = { ...project, homes: [{ ...project.homes[0], modelId: home.id }] };
    assert.equal(getDeliveredProjectPrice(selected).amount, null);
    assert.doesNotThrow(() => parseHomeBudgetProject(selected));
  }
});

test("Essential is included; Premium and Signature are exclusive increments, multiplied once", () => {
  assert.equal(getDeliveredProjectPrice(project, [fixture], date).amount, 120000);
  const premium = { ...project.homes[0], finish: "premium" as const, quantity: 2 };
  const signature = { ...project.homes[0], id: "two", finish: "signature" as const };
  assert.equal(getDeliveredLinePrice(premium, project.location, [fixture], date).amount, 260000);
  assert.equal(getDeliveredLinePrice(signature, project.location, [fixture], date).amount, 150000);
  assert.equal(getDeliveredProjectPrice({ ...project, homes: [premium, signature] }, [fixture], date).amount, 410000);
  assert.equal(project.homes[0].finish, "essential");
});

test("missing, mismatched, expired or custom scope never yields a partial project total", () => {
  for (const price of [
    { ...fixture, premiumUpgrade: null }, { ...fixture, delivery: null },
    { ...fixture, validUntil: "2026-09-10" }, { ...fixture, approvedOn: "2026-09-12" },
    { ...fixture, sourceReference: "" }, { ...fixture, specification: "" },
    { ...fixture, essentialBase: NaN }, { ...fixture, essentialBase: -1 },
  ]) {
    assert.equal(getDeliveredLinePrice({ ...project.homes[0], finish: "premium" }, project.location, [price], date).amount, null);
  }
  for (const location of ["", "Another site"]) assert.equal(getDeliveredLinePrice(project.homes[0], location, [fixture], date).amount, null);
  for (const quantity of [0, -1, 1.5, 101]) assert.equal(getDeliveredLinePrice({ ...project.homes[0], quantity }, project.location, [fixture], date).amount, null);
  assert.equal(getDeliveredLinePrice({ ...project.homes[0], finish: "undecided" }, project.location, [fixture], date).amount, null);
  assert.equal(getDeliveredLinePrice({ ...project.homes[0], selections: "Different kitchen" }, project.location, [fixture], date).amount, null);
  assert.equal(getDeliveredProjectPrice({ ...project, homes: [...project.homes, { ...project.homes[0], id: "unknown", modelId: "saturna" }] }, [fixture], date).amount, null);
  assert.equal(getDeliveredProjectPrice({ ...project, homes: [] }, [fixture], date).amount, null);
  assert.equal(getDeliveredProjectPrice({ ...project, requests: ["offGrid"] }, [fixture], date).amount, null);
  assert.equal(getDeliveredProjectPrice({ ...project, details: "Custom scope" }, [fixture], date).amount, null);
});

test("handoff rejects invalid or stacked selections, quantities and models; ignores client prices", () => {
  for (const update of [{ modelId: "unknown" }, { quantity: 0 }, { quantity: 1.5 }, { quantity: 101 }, { finish: ["premium", "signature"] }, { finish: "toString" }, { selections: "x".repeat(4001) }]) {
    assert.throws(() => parseHomeBudgetProject({ ...project, homes: [{ ...project.homes[0], ...update }] }));
  }
  assert.throws(() => parseHomeBudgetProject({ ...project, homes: [...project.homes, ...project.homes] }));
  assert.throws(() => parseHomeBudgetProject({ ...project, requests: ["funding"] }));
  const parsed = parseHomeBudgetProject({ ...project, total: 1, homes: [{ ...project.homes[0], deliveredPrice: 1 }] });
  assert.deepEqual(parsed, project);
  const message = formatHomeBudgetProject({ ...project, homes: [{ ...project.homes[0], quantity: 2, finish: "signature", selections: "Kitchen: Premium; bathroom: Signature" }], requests: ["accessibility"], details: "Step-free entry request" });
  assert.match(message, /Solace × 2/);
  assert.match(message, /Kitchen: Premium; bathroom: Signature/);
  assert.match(message, /Upgrade quote required/);
  assert.match(message, /Accessibility needs/);
  assert.match(message, /Step-free entry request/);
  assert.doesNotMatch(message, /\$/);
});
