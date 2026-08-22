import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import {
  firstNationsFundingCorridors,
  firstNationsPlannerCatalog,
} from "../data/first-nations-planner";
import {
  addPlannerDesignVariation,
  calculatePreliminaryEstimate,
  createPlannerDesignVariation,
  defaultPlannerState,
  getPlannerDesignProgress,
  getOpportunityReportFundingCorridors,
  getPortfolioSummary,
  getReadinessProfile,
  matchFundingCorridors,
  migratePlannerState,
  reassignPlannerDesignQuantity,
  type PlannerPortfolioLine,
  type PlannerState,
} from "./project-planner";
import {
  buildPlannerDesignHref,
  buildPlannerHomeViewHref,
  readPlannerHomeViewReturnHref,
  readPlannerDesignSession,
} from "./planner-design-session";

const portfolio = [
  {
    id: "duplex-line",
    modelId: "catalogue:bc-duplex",
    quantity: 8,
    phase: "phase-1" as const,
    designVariations: [createPlannerDesignVariation("duplex-line", 8)],
  },
  {
    id: "adu-line",
    modelId: "catalogue:the-micro",
    quantity: 6,
    phase: "phase-2" as const,
    designVariations: [createPlannerDesignVariation("adu-line", 6)],
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
  assert.ok(
    corridors.some(
      (corridor) => corridor.relevance === "Relevant corridor",
    ),
  );
  assert.deepEqual(estimateAfter, estimateBefore);
});

test("Opportunity Report prioritizes follow-up choices and excludes corridors marked not relevant", () => {
  const state: PlannerState = {
    ...defaultPlannerState,
    location: "British Columbia",
    portfolio,
    refinement: {
      ...defaultPlannerState.refinement,
      landStatus: "on-reserve",
      affordability: "community-rental",
    },
    fundingCorridorDecisions: {
      "cmhc-section-95": "explore",
      "isc-on-reserve-housing": "discuss",
      "bc-builds": "not-relevant",
    },
  };

  const reportCorridors = getOpportunityReportFundingCorridors(
    state,
    firstNationsFundingCorridors,
    firstNationsPlannerCatalog,
  );

  assert.equal(reportCorridors.length, 5);
  assert.equal(reportCorridors[0].id, "cmhc-section-95");
  assert.equal(reportCorridors[0].decision, "explore");
  assert.equal(reportCorridors[1].id, "isc-on-reserve-housing");
  assert.equal(reportCorridors[1].decision, "discuss");
  assert.equal(
    reportCorridors.some((corridor) => corridor.id === "bc-builds"),
    false,
  );
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

test("Planner includes the existing Laneway and Carriage Home collection", () => {
  const carriageHomes = firstNationsPlannerCatalog.filter(
    (model) => model.family === "laneway-carriage-home",
  );

  assert.equal(carriageHomes.length, 6);
  for (const model of carriageHomes) {
    assert.match(model.id, /^carriage:/);
    assert.match(model.viewHref, /^\/homes\/laneway-carriage\//);
    assert.equal(model.squareFeet, null);
    assert.equal(existsSync(`public${model.image}`), true, model.image);
  }
});

test("one design group represents all identical homes until a variation is requested", () => {
  const original: PlannerPortfolioLine = {
    id: "maplewood-line",
    modelId: "custom:maplewood",
    quantity: 4,
    phase: "phase-1",
    designVariations: [createPlannerDesignVariation("maplewood-line", 4)],
  };

  const split = addPlannerDesignVariation(original);
  assert.deepEqual(
    split.designVariations.map((variation) => variation.assignedQuantity),
    [3, 1],
  );

  const balanced = reassignPlannerDesignQuantity(
    split,
    split.designVariations[0].id,
    2,
  );
  assert.deepEqual(
    balanced.designVariations.map((variation) => variation.assignedQuantity),
    [2, 2],
  );
});

test("review scenario preserves five homes and advances design progress by group", () => {
  const scenario: readonly PlannerPortfolioLine[] = [
    ["saturna", 2],
    ["solace", 2],
    ["timberline", 1],
  ].map(([slug, quantity]) => {
    const lineId = `${slug}-line`;
    return {
      id: lineId,
      modelId: `custom:${slug}`,
      quantity: Number(quantity),
      phase: "phase-1" as const,
      designVariations: [
        createPlannerDesignVariation(lineId, Number(quantity)),
      ],
    };
  });
  const completed = scenario.map((line) =>
    line.modelId === "custom:solace"
      ? {
          ...line,
          designVariations: line.designVariations.map((variation) => ({
            ...variation,
            status: "complete" as const,
            lookBookReference: "SOLACE-TEST",
          })),
        }
      : line,
  );

  const summary = getPortfolioSummary(completed, firstNationsPlannerCatalog);
  const progress = getPlannerDesignProgress(
    completed,
    firstNationsPlannerCatalog,
  );

  assert.equal(summary.totalHomes, 5);
  assert.equal(summary.modelCount, 3);
  assert.equal(progress.completedDesigns, 1);
  assert.equal(progress.remainingDesignGroups, 2);
  assert.equal(completed[0].designVariations[0].assignedQuantity, 2);
});

test("version one planner drafts migrate into one quantity-based design group", () => {
  const migrated = migratePlannerState({
    ...defaultPlannerState,
    version: 1,
    portfolio: [
      {
        id: "legacy-saturna",
        modelId: "custom:saturna",
        quantity: 2,
        phase: "phase-1",
        designSelections: { kitchen: "premium-1" },
        lookBookReference: "LEGACY-1",
      },
    ],
  });

  assert.equal(migrated?.version, 3);
  assert.deepEqual(migrated?.fundingCorridorDecisions, {});
  assert.equal(migrated?.portfolio[0].designVariations.length, 1);
  assert.equal(
    migrated?.portfolio[0].designVariations[0].assignedQuantity,
    2,
  );
  assert.equal(
    migrated?.portfolio[0].designVariations[0].lookBookReference,
    "LEGACY-1",
  );
});

test("current Planner drafts restore funding choices and the five-home workflow", () => {
  const lines: readonly PlannerPortfolioLine[] = [
    ["solace", 2],
    ["saturna", 2],
    ["timberline", 1],
  ].map(([slug, quantity]) => ({
    id: `${slug}-line`,
    modelId: `custom:${slug}`,
    quantity: Number(quantity),
    phase: "phase-1" as const,
    designVariations: [
      createPlannerDesignVariation(`${slug}-line`, Number(quantity)),
    ],
  }));
  const migrated = migratePlannerState({
    ...defaultPlannerState,
    step: 5,
    portfolio: lines,
    fundingCorridorDecisions: {
      "cmhc-section-95": "explore",
      "bc-builds": "not-relevant",
    },
  });

  assert.equal(migrated?.step, 5);
  assert.equal(
    getPortfolioSummary(migrated?.portfolio ?? [], firstNationsPlannerCatalog)
      .totalHomes,
    5,
  );
  assert.deepEqual(migrated?.fundingCorridorDecisions, {
    "cmhc-section-95": "explore",
    "bc-builds": "not-relevant",
  });
});

test("Planner Build My links preserve the design-group return context", () => {
  const session = {
    lineId: "saturna-line",
    variationId: "saturna-line:design-a",
    modelId: "custom:saturna",
    homeName: "Saturna",
    designLabel: "Design A",
    assignedQuantity: 2,
    returnHref: "/first-nations-project-planner#planner-workspace",
  };
  const href = buildPlannerDesignHref(
    "/homes/saturna#home-inclusions",
    session,
  );
  const parsed = new URL(href, "https://www.housedelivery.ca");

  assert.equal(parsed.pathname, "/homes/saturna");
  assert.equal(parsed.hash, "#home-inclusions");
  assert.deepEqual(readPlannerDesignSession(parsed.search), session);
});

test("Planner View Home links preserve a safe return to the project", () => {
  const href = buildPlannerHomeViewHref("/homes/solace#floor-plans");
  const parsed = new URL(href, "https://www.housedelivery.ca");

  assert.equal(parsed.pathname, "/homes/solace");
  assert.equal(parsed.hash, "#floor-plans");
  assert.equal(parsed.searchParams.get("plannerView"), "home");
  assert.equal(
    readPlannerHomeViewReturnHref(parsed.search),
    "/first-nations-project-planner#planner-workspace",
  );
  assert.equal(
    readPlannerHomeViewReturnHref(
      "?planner=first-nations&plannerView=home&plannerReturn=https://example.com",
    ),
    undefined,
  );
});
