import assert from "node:assert/strict";
import test from "node:test";

import {
  firstNationsFundingCorridors,
  firstNationsPlannerCatalog,
} from "../data/first-nations-planner";
import {
  calculatePreliminaryEstimate,
  defaultPlannerState,
  getPortfolioSummary,
  getReadinessProfile,
  matchFundingCorridors,
  type PlannerState,
} from "./project-planner";

const portfolio = [
  {
    id: "duplex-line",
    modelId: "catalogue:bc-duplex",
    quantity: 8,
    phase: "phase-1" as const,
    designSelections: {},
    lookBookReference: "",
  },
  {
    id: "adu-line",
    modelId: "catalogue:the-micro",
    quantity: 6,
    phase: "phase-2" as const,
    designSelections: {},
    lookBookReference: "",
  },
];

test("portfolio summary keeps building quantity separate from housing yield", () => {
  const summary = getPortfolioSummary(portfolio, firstNationsPlannerCatalog);

  assert.equal(summary.totalSelections, 14);
  assert.equal(summary.totalHomes, 22);
  assert.equal(summary.modelCount, 2);
  assert.equal(summary.phaseCount, 2);
});

test("commercial estimate refuses to fabricate values for under-review bases", () => {
  const estimate = calculatePreliminaryEstimate(
    portfolio,
    firstNationsPlannerCatalog,
  );

  assert.equal(estimate.status, "under-review");
  assert.equal(estimate.low, null);
  assert.equal(estimate.base, null);
  assert.equal(estimate.high, null);
  assert.deepEqual([...estimate.missingBasisModelIds].sort(), [
    "catalogue:bc-duplex",
    "catalogue:the-micro",
  ]);
});

test("funding corridors remain contextual and are never deducted from feasibility", () => {
  const state: PlannerState = {
    ...defaultPlannerState,
    community: "Example Nation",
    location: "British Columbia",
    approximateHomes: "22",
    portfolio,
    refinement: {
      ...defaultPlannerState.refinement,
      landStatus: "on-reserve",
      affordability: "community-rental",
    },
  };
  const estimateBefore = calculatePreliminaryEstimate(
    state.portfolio,
    firstNationsPlannerCatalog,
  );
  const corridors = matchFundingCorridors(
    state,
    firstNationsFundingCorridors,
    firstNationsPlannerCatalog,
  );
  const estimateAfter = calculatePreliminaryEstimate(
    state.portfolio,
    firstNationsPlannerCatalog,
  );

  assert.ok(
    corridors.some(
      (corridor) => corridor.relevance === "Strong corridor to explore",
    ),
  );
  assert.deepEqual(estimateAfter, estimateBefore);
});

test("scale facts and readiness information remain separate", () => {
  const state: PlannerState = {
    ...defaultPlannerState,
    approximateHomes: "22",
    portfolio,
  };
  const summary = getPortfolioSummary(
    state.portfolio,
    firstNationsPlannerCatalog,
  );
  const readiness = getReadinessProfile(
    state,
    firstNationsPlannerCatalog,
  );

  assert.equal(summary.totalHomes, 22);
  assert.equal(
    readiness.find((item) => item.label === "Land / site control")?.ready,
    false,
  );
  assert.equal(
    readiness.find((item) => item.label === "Housing requirement")?.ready,
    true,
  );
});

test("all current planner catalogue models have explicit planning-basis records", () => {
  assert.ok(firstNationsPlannerCatalog.length > 0);
  for (const model of firstNationsPlannerCatalog) {
    assert.equal(model.planningBasis.modelId, model.id);
    assert.ok(model.planningBasis.assumptions.length > 0);
    assert.ok(model.planningBasis.exclusions.length > 0);
    assert.ok(model.planningBasis.source.length > 0);
  }
});
