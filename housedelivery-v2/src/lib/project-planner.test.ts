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
  createOpportunityReportReference,
  defaultPlannerState,
  formatProjectReviewContext,
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
  readPlannerHomeViewContext,
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

test("Opportunity Report prioritizes funding-review selections and excludes corridors marked not relevant", () => {
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
      "cmhc-section-95": "include",
      "isc-on-reserve-housing": "include",
      "bc-builds": "not-relevant",
    },
  };

  const reportCorridors = getOpportunityReportFundingCorridors(
    state,
    firstNationsFundingCorridors,
    firstNationsPlannerCatalog,
  );

  assert.equal(reportCorridors.length, 5);
  assert.deepEqual(
    new Set(reportCorridors.slice(0, 2).map((corridor) => corridor.id)),
    new Set(["cmhc-section-95", "isc-on-reserve-housing"]),
  );
  assert.equal(
    reportCorridors.slice(0, 2).every((corridor) => corridor.decision === "include"),
    true,
  );
  assert.equal(
    reportCorridors.some((corridor) => corridor.id === "bc-builds"),
    false,
  );
});

test("Opportunity Report carries every explicitly included funding corridor", () => {
  const fundingCorridorDecisions = Object.fromEntries(
    firstNationsFundingCorridors.map((corridor) => [corridor.id, "include"]),
  ) as PlannerState["fundingCorridorDecisions"];
  const reportCorridors = getOpportunityReportFundingCorridors(
    {
      ...defaultPlannerState,
      portfolio,
      fundingCorridorDecisions,
    },
    firstNationsFundingCorridors,
    firstNationsPlannerCatalog,
  );

  assert.equal(reportCorridors.length, firstNationsFundingCorridors.length);
  assert.equal(
    reportCorridors.every((corridor) => corridor.decision === "include"),
    true,
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

test("six-home project keeps one two-home design group per model", () => {
  const scenario: readonly PlannerPortfolioLine[] = [
    "solace",
    "saturna",
    "timberline",
  ].map((slug) => ({
    id: `${slug}-line`,
    modelId: `custom:${slug}`,
    quantity: 2,
    phase: "phase-1" as const,
    designVariations: [createPlannerDesignVariation(`${slug}-line`, 2)],
  }));
  const completed = scenario.map((line) =>
    line.modelId === "custom:solace"
      ? {
          ...line,
          designVariations: line.designVariations.map((variation) => ({
            ...variation,
            status: "complete" as const,
          })),
        }
      : line,
  );
  const summary = getPortfolioSummary(completed, firstNationsPlannerCatalog);
  const progress = getPlannerDesignProgress(
    completed,
    firstNationsPlannerCatalog,
  );

  assert.equal(summary.totalHomes, 6);
  assert.equal(progress.completedDesigns, 1);
  assert.equal(progress.remainingDesignGroups, 2);
  assert.deepEqual(
    completed.map((line) => line.designVariations.length),
    [1, 1, 1],
  );
  assert.deepEqual(
    completed.map((line) => line.designVariations[0].assignedQuantity),
    [2, 2, 2],
  );
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

  assert.equal(migrated?.version, 4);
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
      "cmhc-section-95": "include",
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
    "cmhc-section-95": "include",
    "bc-builds": "not-relevant",
  });
});

test("legacy funding follow-up choices migrate into the simplified funding review", () => {
  const migrated = migratePlannerState({
    ...defaultPlannerState,
    version: 3,
    fundingCorridorDecisions: {
      "cmhc-section-95": "explore",
      "isc-on-reserve-housing": "discuss",
      "bc-builds": "not-relevant",
    },
  });

  assert.deepEqual(migrated?.fundingCorridorDecisions, {
    "cmhc-section-95": "include",
    "isc-on-reserve-housing": "include",
    "bc-builds": "not-relevant",
  });
});

test("project review context carries the complete multi-home Planner record", () => {
  const reference = createOpportunityReportReference(
    Date.parse("2026-08-22T12:00:00.000Z"),
  );
  const lines: readonly PlannerPortfolioLine[] = [
    ["solace", 2],
    ["saturna", 2],
    ["timberline", 2],
  ].map(([slug, quantity], index) => {
    const lineId = `${slug}-line`;
    const variation = createPlannerDesignVariation(lineId, Number(quantity));
    return {
      id: lineId,
      modelId: `custom:${slug}`,
      quantity: Number(quantity),
      phase: index === 0 ? "phase-1" as const : index === 1 ? "phase-2" as const : "future" as const,
      designVariations: [
        slug === "solace"
          ? {
              ...variation,
              status: "complete" as const,
              projectDesignName: "Solace — Design A",
              lookBookReference: "SOLACE-LOOK-001",
              designSelections: { kitchen: "premium-1" },
            }
          : variation,
      ],
    };
  });
  const state: PlannerState = {
    ...defaultPlannerState,
    community: "WestBank",
    location: "West Kelowna, BC",
    approximateHomes: "6",
    sitePattern: "multiple-sites",
    deliveryHorizon: "two-to-five-years",
    portfolio: lines,
    refinement: {
      ...defaultPlannerState.refinement,
      landStatus: "on-reserve",
      servicing: "partially-serviced",
      affordability: "community-rental",
      localLabour: "local-labour-priority",
    },
    fundingCorridorDecisions: {
      "cmhc-section-95": "include",
      "bc-builds": "not-relevant",
    },
    opportunityReportReference: reference,
    projectNotes: "Coordinate local assembly training.",
  };

  const context = formatProjectReviewContext(
    state,
    firstNationsPlannerCatalog,
    firstNationsFundingCorridors,
  );

  assert.match(context, new RegExp(reference));
  assert.match(context, /Community \/ project: WestBank/);
  assert.match(context, /Working portfolio: 6 homes \/ 3 home types \/ 3 delivery groups/);
  assert.match(context, /Solace — Design A \/ Assigned to 2 homes \/ complete \/ Look Book SOLACE-LOOK-001/);
  assert.match(context, /Include:.*CMHC|Include:.*On-Reserve/i);
  assert.match(context, /Not relevant: BC Builds/);
  assert.match(context, /Land status: on reserve/);
  assert.match(context, /SCALE & READINESS/);
  assert.match(context, /Coordinate local assembly training/);
});

test("Planner Design My Home links preserve the design-group return context", () => {
  const session = {
    projectName: "WestBank",
    lineId: "saturna-line",
    variationId: "saturna-line:design-a",
    modelId: "custom:saturna",
    homeName: "Saturna",
    designLabel: "Design A",
    assignedQuantity: 2,
    deliveryGroup: "Active / First Build",
    returnHref: "/first-nations-project-planner#planner-design-center",
  };
  const href = buildPlannerDesignHref(
    "/homes/saturna#home-inclusions",
    session,
  );
  const parsed = new URL(href, "https://www.housedelivery.ca");

  assert.equal(parsed.pathname, "/homes/saturna");
  assert.equal(parsed.hash, "#home-inclusions");
  assert.equal(parsed.searchParams.get("plannerProject"), "WestBank");
  assert.equal(
    parsed.searchParams.get("plannerDeliveryGroup"),
    "Active / First Build",
  );
  assert.deepEqual(readPlannerDesignSession(parsed.search), session);
});

test("standalone Design My Home URLs do not enter Planner project mode", () => {
  assert.equal(readPlannerDesignSession(""), undefined);
  assert.equal(
    readPlannerDesignSession("?planner=first-nations&plannerHome=Solace"),
    undefined,
  );
});

test("Planner View Home links carry project, quantity and design-group context", () => {
  const designSession = {
    projectName: "WestBank Housing Project",
    lineId: "solace-line",
    variationId: "solace-line:design-a",
    modelId: "custom:solace",
    homeName: "Solace",
    designLabel: "Design A",
    assignedQuantity: 2,
    deliveryGroup: "Active / First Build",
    returnHref: "/first-nations-project-planner#planner-workspace",
  };
  const context = {
    projectName: "WestBank Housing Project",
    totalHomes: 6,
    modelId: "custom:solace",
    homeName: "Solace",
    homeQuantity: 2,
    requestedQuantity: 2,
    phase: "phase-1" as const,
    returnHref: "/first-nations-project-planner#planner-workspace",
    designSession,
  };
  const href = buildPlannerHomeViewHref(
    "/homes/solace#floor-plans",
    context,
  );
  const parsed = new URL(href, "https://www.housedelivery.ca");

  assert.equal(parsed.pathname, "/homes/solace");
  assert.equal(parsed.hash, "#floor-plans");
  assert.equal(parsed.searchParams.get("plannerView"), "home");
  assert.equal(parsed.searchParams.get("plannerTotalHomes"), "6");
  assert.equal(parsed.searchParams.get("plannerHomeQuantity"), "2");
  assert.deepEqual(readPlannerHomeViewContext(parsed.search), context);
  assert.deepEqual(readPlannerDesignSession(parsed.search), designSession);
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

test("Planner View Home supports an add-to-project context without creating a design session", () => {
  const context = {
    projectName: "WestBank Housing Project",
    totalHomes: 4,
    modelId: "custom:solace",
    homeName: "Solace",
    homeQuantity: 2,
    requestedQuantity: 2,
    phase: "phase-2" as const,
    returnHref: "/first-nations-project-planner#planner-workspace",
  };
  const href = buildPlannerHomeViewHref("/homes/solace", context);
  const parsed = new URL(href, "https://www.housedelivery.ca");

  assert.deepEqual(readPlannerHomeViewContext(parsed.search), context);
  assert.equal(readPlannerDesignSession(parsed.search), undefined);
});
