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
  communityWorkforceCapacityOptions,
  createDefaultPlannerState,
  createPlannerDesignVariation,
  createPlannerProjectId,
  createOpportunityReportReference,
  defaultPlannerState,
  formatProjectReviewContext,
  firstNationsHousingUseOptions,
  firstNationsHousingUseQuestion,
  firstNationsHousingUseSupportingText,
  firstNationsProjectReadinessQuestions,
  getAudienceFundingCorridors,
  getCommunityWorkforceCapacityLabels,
  getCulturalDesignReportRecords,
  getFirstNationsCulturalDesignDirectionLabel,
  getPlannerDesignProgress,
  getOpportunityReportFundingCorridors,
  getPortfolioSummary,
  getReadinessProfile,
  ensurePlannerProjectId,
  matchFundingCorridors,
  migratePlannerState,
  reassignPlannerDesignQuantity,
  setPlannerCulturalExteriorInterest,
  toggleCommunityWorkforceCapacitySelection,
  type PlannerPortfolioLine,
  type PlannerState,
} from "./project-planner";
import {
  applyPlannerDesignReturn,
  buildPlannerDesignHref,
  buildPlannerHomeViewHref,
  getPlannerReturnHref,
  getPlannerReturnKey,
  getPlannerStorageKey,
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
    approximateHomes: "24",
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
    readiness.find((item) => item.label === "Land / Site Control")?.ready,
    false,
  );
  assert.equal(
    readiness.find((item) => item.label === "Housing Requirement")?.ready,
    true,
  );
  assert.equal(
    readiness.find((item) => item.label === "Housing Requirement")?.detail,
    "22 homes selected for this project",
  );
  assert.equal(
    readiness.some((item) => item.detail.includes("24")),
    false,
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

test("Project Readiness exposes all six customer-sourced questions", () => {
  assert.deepEqual(
    firstNationsProjectReadinessQuestions.map((question) => question.label),
    [
      "Land / Site Control",
      "Servicing",
      "Affordability / Homeownership Pathway",
      "Community Workforce & Capacity",
      "Community Engagement",
      "Funding / Financing Pathway",
    ],
  );
  assert.equal(
    firstNationsProjectReadinessQuestions.every(
      (question) => question.options.length === 4,
    ),
    true,
  );
});

test("the realistic 12-home project keeps portfolio, design groups, Look Books and readiness on one record", () => {
  const langleyLineId = "langley-12-home-line";
  const solaceLineId = "solace-12-home-line";
  const splitLangley = reassignPlannerDesignQuantity(
    addPlannerDesignVariation({
      id: langleyLineId,
      modelId: "custom:langley",
      quantity: 10,
      phase: "phase-1",
      designVariations: [createPlannerDesignVariation(langleyLineId, 10)],
    }),
    `${langleyLineId}:design-a`,
    6,
  );
  const langley = {
    ...splitLangley,
    designVariations: splitLangley.designVariations.map((variation, index) => ({
      ...variation,
      status: "complete" as const,
      culturalExteriorInterest: index === 1,
      designSelections: {
        kitchen: index === 0 ? "premium-1" : "signature-2",
      },
      lookBookReference: `LANGLEY-GROUP-${index === 0 ? "A" : "B"}`,
      projectDesignName: `Langley — Design Group ${index === 0 ? "A" : "B"}`,
    })),
  };
  const solace = {
    id: solaceLineId,
    modelId: "custom:solace",
    quantity: 2,
    phase: "phase-2" as const,
    designVariations: [
      {
        ...createPlannerDesignVariation(solaceLineId, 2),
        status: "complete" as const,
        designSelections: { kitchen: "premium-2" },
        lookBookReference: "SOLACE-GROUP-A",
        projectDesignName: "Solace — Design Group A",
      },
    ],
  };
  const state: PlannerState = {
    ...defaultPlannerState,
    projectId: "HDP-12-HOME-TEST",
    community: "Example Nation",
    location: "British Columbia",
    approximateHomes: "24",
    portfolio: [langley, solace],
    readiness: {
      landSiteControl: "potential",
      servicing: "investigate",
      affordabilityPathway: "developing",
      communityWorkforce: "yes",
      communityEngagement: "some",
      fundingPathway: "options",
    },
  };
  const restored = migratePlannerState(JSON.parse(JSON.stringify(state)));
  assert.ok(restored);
  const summary = getPortfolioSummary(
    restored.portfolio,
    firstNationsPlannerCatalog,
  );
  const progress = getPlannerDesignProgress(
    restored.portfolio,
    firstNationsPlannerCatalog,
  );
  const readiness = getReadinessProfile(
    restored,
    firstNationsPlannerCatalog,
  );
  const context = formatProjectReviewContext(
    restored,
    firstNationsPlannerCatalog,
    firstNationsFundingCorridors,
  );

  assert.equal(summary.totalHomes, 12);
  assert.equal(summary.modelCount, 2);
  assert.equal(summary.phaseCount, 2);
  assert.deepEqual(
    restored.portfolio[0].designVariations.map(
      (variation) => variation.assignedQuantity,
    ),
    [6, 4],
  );
  assert.equal(
    restored.portfolio[0].designVariations.reduce(
      (total, variation) => total + variation.assignedQuantity,
      0,
    ),
    10,
  );
  assert.deepEqual(progress, {
    completedDesigns: 3,
    remainingDesignGroups: 0,
    totalDesignGroups: 3,
  });
  assert.equal(
    readiness.find((item) => item.id === "housingRequirement")?.detail,
    "12 homes selected for this project",
  );
  assert.equal(readiness.some((item) => item.detail.includes("24")), false);
  assert.match(context, /Housing requirement: 12 homes/);
  assert.match(context, /Working portfolio: 12 homes \/ 2 model types \/ 2 delivery groups/);
  assert.match(context, /Design groups: 3 design groups/);
  assert.match(context, /Langley — Design Group A \/ Assigned to 6 homes \/ complete \/ Look Book LANGLEY-GROUP-A/);
  assert.match(context, /Langley — Design Group B \/ Assigned to 4 homes \/ complete \/ Look Book LANGLEY-GROUP-B/);
  assert.match(context, /Solace — Design Group A \/ Assigned to 2 homes \/ complete \/ Look Book SOLACE-GROUP-A/);
  assert.match(context, /kitchen: premium-1/);
  assert.match(context, /kitchen: signature-2/);
  assert.match(context, /Indigenous Inspiration selected/);
});

test("readiness treats known, unknown, mixed servicing and workforce answers as information rather than pass/fail", () => {
  const lineId = "readiness-solace";
  const portfolioLine: PlannerPortfolioLine = {
    id: lineId,
    modelId: "custom:solace",
    quantity: 1,
    phase: "phase-1",
    designVariations: [createPlannerDesignVariation(lineId, 1)],
  };
  const allKnown: PlannerState = {
    ...defaultPlannerState,
    portfolio: [portfolioLine],
    readiness: {
      landSiteControl: "confirmed",
      servicing: "confirmed",
      affordabilityPathway: "identified",
      communityWorkforce: "no",
      communityEngagement: "yes",
      fundingPathway: "identified",
    },
  };
  const mostlyUnknown: PlannerState = {
    ...defaultPlannerState,
    portfolio: [portfolioLine],
  };
  const mixed: PlannerState = {
    ...mostlyUnknown,
    readiness: {
      ...mostlyUnknown.readiness,
      landSiteControl: "potential",
      servicing: "not-sure",
      communityWorkforce: "yes",
    },
  };
  const knownProfile = getReadinessProfile(
    allKnown,
    firstNationsPlannerCatalog,
  );
  const unknownProfile = getReadinessProfile(
    mostlyUnknown,
    firstNationsPlannerCatalog,
  );
  const mixedProfile = getReadinessProfile(
    mixed,
    firstNationsPlannerCatalog,
  );

  assert.equal(knownProfile.every((item) => item.ready), true);
  assert.equal(
    knownProfile.find((item) => item.id === "communityWorkforce")?.status,
    "Identified",
  );
  assert.equal(unknownProfile.filter((item) => !item.ready).length, 6);
  assert.deepEqual(
    mixedProfile.find((item) => item.id === "landSiteControl"),
    {
      id: "landSiteControl",
      label: "Land / Site Control",
      detail: "Potential site identified",
      status: "Partially Known",
      ready: true,
    },
  );
  assert.equal(
    mixedProfile.find((item) => item.id === "servicing")?.status,
    "Not Yet Determined",
  );
  assert.equal(
    mixedProfile.find((item) => item.id === "communityWorkforce")?.status,
    "Identified",
  );
  const context = formatProjectReviewContext(
    mixed,
    firstNationsPlannerCatalog,
    firstNationsFundingCorridors,
  );
  assert.match(context, /KNOWN TODAY[\s\S]*Potential site identified/);
  assert.match(context, /ITEMS TO CONFIRM[\s\S]*Servicing and site access not yet determined/);
});

test("project IDs and singular project-review language remain stable", () => {
  const projectId = createPlannerProjectId(1234567890);
  const identified = ensurePlannerProjectId(
    createDefaultPlannerState("first-nations"),
    1234567890,
  );
  const lineId = "single-home-line";
  const state: PlannerState = {
    ...identified,
    portfolio: [
      {
        id: lineId,
        modelId: "custom:solace",
        quantity: 1,
        phase: "phase-1",
        designVariations: [createPlannerDesignVariation(lineId, 1)],
      },
    ],
  };
  const context = formatProjectReviewContext(
    state,
    firstNationsPlannerCatalog,
    firstNationsFundingCorridors,
  );

  assert.equal(identified.projectId, projectId);
  assert.match(context, /Housing requirement: 1 home/);
  assert.match(context, /Working portfolio: 1 home \/ 1 model type \/ 1 delivery group/);
  assert.match(context, /Design groups: 1 design group/);
  assert.doesNotMatch(context, /1 homes|1 model types|1 delivery groups|1 design groups/);
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

  assert.equal(migrated?.version, 6);
  assert.deepEqual(migrated?.fundingCorridorDecisions, {});
  assert.deepEqual(migrated?.refinement.communityWorkforceCapacity, [
    "to-be-determined",
  ]);
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

test("existing First Nations drafts migrate into the matching consolidated stage", () => {
  const expectedSteps = new Map([
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 2],
    [5, 3],
    [6, 3],
    [7, 5],
    [8, 6],
  ]);

  for (const [legacyStep, consolidatedStep] of expectedSteps) {
    const restored = migratePlannerState({
      ...defaultPlannerState,
      version: 4,
      step: legacyStep,
    });

    assert.equal(restored?.step, consolidatedStep);
    assert.equal(restored?.version, 6);
  }
});

test("First Nations workforce and capacity choices persist without changing pricing", () => {
  assert.deepEqual(
    communityWorkforceCapacityOptions.map((option) => option.label),
    [
      "Interested in local assembly participation",
      "Local trades / workforce already identified",
      "Interested in project-based assembly training",
      "Need House Delivery support to coordinate local participation",
      "To be determined",
    ],
  );
  const selections = [
    "local-assembly-participation",
    "local-workforce-identified",
    "workforce-training-interest",
  ] as const;
  const state: PlannerState = {
    ...defaultPlannerState,
    community: "Example Nation",
    portfolio,
    refinement: {
      ...defaultPlannerState.refinement,
      communityWorkforceCapacity: selections,
    },
    readiness: {
      ...defaultPlannerState.readiness,
      communityWorkforce: "yes",
    },
  };
  const estimateBefore = calculatePreliminaryEstimate(
    state.portfolio,
    firstNationsPlannerCatalog,
  );
  const migrated = migratePlannerState(JSON.parse(JSON.stringify(state)));
  const estimateAfter = calculatePreliminaryEstimate(
    migrated?.portfolio ?? [],
    firstNationsPlannerCatalog,
  );
  const readiness = getReadinessProfile(
    migrated ?? state,
    firstNationsPlannerCatalog,
  );

  assert.deepEqual(
    migrated?.refinement.communityWorkforceCapacity,
    selections,
  );
  assert.deepEqual(estimateAfter, estimateBefore);
  assert.deepEqual(getCommunityWorkforceCapacityLabels(selections), [
    "Interested in local assembly participation",
    "Local trades / workforce already identified",
    "Interested in project-based assembly training",
  ]);
  assert.deepEqual(
    readiness.find(
      (item) => item.label === "Community Workforce & Capacity",
    ),
    {
      id: "communityWorkforce",
      label: "Community Workforce & Capacity",
      detail: "Community interest in local training and participation identified",
      status: "Identified",
      ready: true,
    },
  );
  assert.equal(
    readiness.some((item) => item.label === "Delivery capacity"),
    false,
  );
});

test("To be determined stays mutually exclusive in workforce selections", () => {
  assert.deepEqual(
    toggleCommunityWorkforceCapacitySelection(
      ["to-be-determined"],
      "local-assembly-participation",
    ),
    ["local-assembly-participation"],
  );
  assert.deepEqual(
    toggleCommunityWorkforceCapacitySelection(
      ["local-assembly-participation", "workforce-training-interest"],
      "to-be-determined",
    ),
    ["to-be-determined"],
  );
  assert.deepEqual(
    toggleCommunityWorkforceCapacitySelection(
      ["local-assembly-participation"],
      "local-assembly-participation",
    ),
    ["to-be-determined"],
  );
});

test("First Nations housing use keeps the new customer wording and funding values", () => {
  assert.equal(
    firstNationsHousingUseQuestion,
    "How will these homes likely be used?",
  );
  assert.equal(
    firstNationsHousingUseSupportingText,
    "This helps us identify the most relevant funding and financing pathways.",
  );
  assert.deepEqual(firstNationsHousingUseOptions, [
    ["community-rental", "Community rental"],
    ["ownership", "Homeownership"],
    ["mixed-income", "Mixed"],
    ["unknown", "Not sure yet"],
  ]);
});

test("First Nations cultural direction is read from the earlier project-home choice", () => {
  const lineId = "solace-cultural-direction";
  const contemporaryState: PlannerState = {
    ...defaultPlannerState,
    portfolio: [
      {
        id: lineId,
        modelId: "custom:solace",
        quantity: 2,
        phase: "phase-1",
        designVariations: [createPlannerDesignVariation(lineId, 2)],
      },
    ],
  };
  const coastalState: PlannerState = {
    ...contemporaryState,
    portfolio: contemporaryState.portfolio.map((line) => ({
      ...line,
      designVariations: line.designVariations.map((variation) => ({
        ...variation,
        culturalExteriorInterest: true,
      })),
    })),
  };

  assert.equal(
    getFirstNationsCulturalDesignDirectionLabel(contemporaryState),
    "Contemporary / To be determined",
  );
  assert.equal(
    getFirstNationsCulturalDesignDirectionLabel(coastalState),
    "Indigenous Inspiration selected",
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

test("the former cultural exploration choice migrates to the exterior-only flag", () => {
  const lineId = "legacy-cultural-solace";
  const migrated = migratePlannerState({
    ...defaultPlannerState,
    portfolio: [
      {
        id: lineId,
        modelId: "custom:solace",
        quantity: 2,
        phase: "phase-1",
        designVariations: [
          {
            ...createPlannerDesignVariation(lineId, 2),
            culturalDesignDirection: {
              choice: "explore",
              areas: ["entry-arrival", "interior-feature-elements"],
            },
          },
        ],
      },
    ],
  });

  const variation = migrated?.portfolio[0]?.designVariations[0];
  assert.equal(variation?.culturalExteriorInterest, true);
  assert.equal("culturalDesignDirection" in (variation ?? {}), false);
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
              culturalExteriorInterest: true,
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
      communityWorkforceCapacity: [
        "local-assembly-participation",
        "workforce-training-interest",
        "house-delivery-support-required",
      ],
    },
    fundingCorridorDecisions: {
      "cmhc-section-95": "include",
      "bc-builds": "not-relevant",
    },
    opportunityReportReference: reference,
    projectNotes: "Coordinate local assembly training.",
    projectId: "HDP-TEST-001",
    readiness: {
      landSiteControl: "potential",
      servicing: "investigate",
      affordabilityPathway: "developing",
      communityWorkforce: "yes",
      communityEngagement: "some",
      fundingPathway: "options",
    },
  };

  const context = formatProjectReviewContext(
    state,
    firstNationsPlannerCatalog,
    firstNationsFundingCorridors,
  );

  assert.match(context, new RegExp(reference));
  assert.match(context, /Community \/ project: WestBank/);
  assert.match(context, /Project ID: HDP-TEST-001/);
  assert.match(context, /Working portfolio: 6 homes \/ 3 model types \/ 3 delivery groups/);
  assert.match(context, /Solace — Design A \/ Assigned to 2 homes \/ complete \/ Look Book SOLACE-LOOK-001/);
  assert.match(context, /Include:.*CMHC|Include:.*On-Reserve/i);
  assert.match(context, /Not relevant: BC Builds/);
  assert.match(context, /PROJECT READINESS/);
  assert.match(context, /KNOWN TODAY/);
  assert.match(context, /ITEMS TO CONFIRM/);
  assert.match(context, /Land \/ Site Control: Potential site identified \[Partially Known\]/);
  assert.match(context, /Servicing: Servicing and site access require investigation \[To Confirm\]/);
  assert.match(context, /Coordinate local assembly training/);
  assert.match(context, /CULTURAL DESIGN DIRECTION/);
  assert.match(context, /Indigenous Inspiration selected/);
  assert.match(
    context,
    /Exterior cultural expression to be developed with the Nation during project review/,
  );
  assert.match(context, /Community Workforce & Capacity: Community interest in local training and participation identified \[Identified\]/);
  assert.doesNotMatch(context, /Cultural priorities:/);
  assert.doesNotMatch(context, /Local labour:/);
  assert.doesNotMatch(context, /Training objectives:/);
  assert.deepEqual(getCulturalDesignReportRecords(state, firstNationsPlannerCatalog), [
    {
      id: "solace-line:design-a",
      designName: "Solace — Design A",
    },
  ]);
});

test("Contemporary and non-First Nations project modes omit the cultural exterior report note", () => {
  const firstNationsState: PlannerState = {
    ...defaultPlannerState,
    portfolio: [
      {
        id: "solace-line",
        modelId: "custom:solace",
        quantity: 2,
        phase: "phase-1",
        designVariations: [
          {
            ...createPlannerDesignVariation("solace-line", 2),
            status: "complete",
            culturalExteriorInterest: false,
          },
        ],
      },
    ],
  };
  const contemporary = getCulturalDesignReportRecords(
    firstNationsState,
    firstNationsPlannerCatalog,
  );
  const developer = getCulturalDesignReportRecords(
    {
      ...firstNationsState,
      audience: "developer",
      portfolio: firstNationsState.portfolio.map((line) =>
        setPlannerCulturalExteriorInterest(line, true),
      ),
    },
    firstNationsPlannerCatalog,
  );

  assert.deepEqual(contemporary, []);
  assert.deepEqual(developer, []);
});

test("Save Look Book return completes the design group and carries Coastal exterior interest into the report", () => {
  const lineId = "solace-cultural-line";
  const variation = {
    ...createPlannerDesignVariation(lineId, 2),
    culturalExteriorInterest: true,
  };
  const state: PlannerState = {
    ...defaultPlannerState,
    community: "WestBank",
    portfolio: [
      {
        id: lineId,
        modelId: "custom:solace",
        quantity: 2,
        phase: "phase-1",
        designVariations: [variation],
      },
    ],
  };
  const completed = applyPlannerDesignReturn(state, {
    audience: "first-nations",
    projectName: "WestBank",
    lineId,
    variationId: variation.id,
    modelId: "custom:solace",
    homeName: "Solace",
    designLabel: "Design A",
    assignedQuantity: 2,
    deliveryGroup: "Active / First Build",
    returnHref: "/first-nations-project-planner#planner-design-center",
    culturalExteriorInterest: true,
    completedAt: "2026-08-23T12:00:00.000Z",
    configuration: {
      schemaVersion: 1,
      homeId: "solace",
      inclusionSelections: {
        kitchen: { optionId: "premium-1", status: "confirmed" },
      },
      flooringSelections: {},
      reviewStatus: "ready-for-review",
      lookBookPersonalization: {
        projectDesignName: "Solace — Design A",
        preparedAt: "2026-08-23T12:00:00.000Z",
        reference: "SOLACE-CULTURAL-001",
      },
      culturalExteriorInterest: true,
    },
  });
  const completedVariation = completed.portfolio[0]?.designVariations[0];
  const records = getCulturalDesignReportRecords(
    completed,
    firstNationsPlannerCatalog,
  );

  assert.equal(completed.step, 2);
  assert.equal(completedVariation?.status, "complete");
  assert.equal(completedVariation?.assignedQuantity, 2);
  assert.equal(completedVariation?.lookBookReference, "SOLACE-CULTURAL-001");
  assert.equal(completedVariation?.culturalExteriorInterest, true);
  assert.deepEqual(records, [
    {
      id: "solace-cultural-line:design-a",
      designName: "Solace — Design A",
    },
  ]);
});

test("Planner Design My Home links preserve the design-group return context and exterior flag", () => {
  const session = {
    audience: "first-nations" as const,
    projectId: "HDP-SESSION-001",
    projectName: "WestBank",
    lineId: "solace-line",
    variationId: "solace-line:design-a",
    modelId: "custom:solace",
    homeName: "Solace",
    designLabel: "Design A",
    assignedQuantity: 2,
    deliveryGroup: "Active / First Build",
    returnHref: "/first-nations-project-planner#planner-design-center",
    culturalExteriorInterest: true,
  };
  const href = buildPlannerDesignHref(
    "/homes/solace#home-inclusions",
    session,
  );
  const parsed = new URL(href, "https://www.housedelivery.ca");

  assert.equal(parsed.pathname, "/homes/solace");
  assert.equal(parsed.hash, "#home-inclusions");
  assert.equal(parsed.searchParams.get("plannerProject"), "WestBank");
  assert.equal(parsed.searchParams.get("plannerProjectId"), "HDP-SESSION-001");
  assert.equal(
    parsed.searchParams.get("plannerDeliveryGroup"),
    "Active / First Build",
  );
  assert.equal(parsed.searchParams.get("plannerCulturalExterior"), "1");
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
    audience: "first-nations" as const,
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
    audience: "first-nations" as const,
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
    audience: "first-nations" as const,
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

test("shared Planner audiences use isolated drafts while preserving the First Nations keys", () => {
  assert.equal(
    getPlannerStorageKey("first-nations"),
    "house-delivery:first-nations-planner:v1",
  );
  assert.equal(
    getPlannerReturnKey("first-nations"),
    "house-delivery:first-nations-planner:return:v1",
  );

  for (const audience of [
    "developer",
    "general-contractor",
    "municipality-non-profit",
  ] as const) {
    const state = createDefaultPlannerState(audience);
    assert.equal(state.audience, audience);
    assert.deepEqual(state.audienceContext, {});
    assert.match(getPlannerStorageKey(audience), new RegExp(audience));
    assert.match(getPlannerReturnKey(audience), new RegExp(audience));
    assert.equal(
      getPlannerReturnHref(audience, "planner-design-center"),
      `/project-portfolio-planner?audience=${audience}#planner-design-center`,
    );
    assert.equal(migratePlannerState(state)?.audience, audience);
  }
});

test("every shared audience round-trips through project-aware Design Center mode", () => {
  for (const audience of [
    "developer",
    "general-contractor",
    "municipality-non-profit",
  ] as const) {
    const session = {
      audience,
      projectName: "Harbour Lands",
      lineId: "solace-line",
      variationId: "solace-line:design-a",
      modelId: "custom:solace",
      homeName: "Solace",
      designLabel: "Design A",
      assignedQuantity: 12,
      deliveryGroup: "Active / First Build",
      returnHref: `/project-portfolio-planner?audience=${audience}#planner-design-center`,
    };
    const href = buildPlannerDesignHref("/homes/solace", session);
    const parsed = new URL(href, "https://www.housedelivery.ca");

    assert.equal(parsed.searchParams.get("planner"), audience);
    assert.equal(parsed.searchParams.get("plannerQuantity"), "12");
    assert.deepEqual(readPlannerDesignSession(parsed.search), session);
  }
});

test("non-First Nations modes exclude on-reserve-only funding corridors", () => {
  const genericCorridors = getAudienceFundingCorridors(
    "municipality-non-profit",
    firstNationsFundingCorridors,
  );

  assert.ok(genericCorridors.length > 0);
  assert.ok(genericCorridors.length < firstNationsFundingCorridors.length);
  assert.equal(
    genericCorridors.some(
      (corridor) =>
        corridor.landStatus.length === 1 &&
        corridor.landStatus[0] === "on-reserve",
    ),
    false,
  );
  assert.deepEqual(
    genericCorridors.map((corridor) => corridor.id).sort(),
    ["bc-builds", "build-canada-homes", "cmhc-aclp"],
  );
});
