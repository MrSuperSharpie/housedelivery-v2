import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultHomeConfiguration,
  getHomeConfiguratorJourneyCategories,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
  type HomeInclusionLevel,
} from "@/data/home-configurator";
import { getHomeConfiguratorRegistration } from "@/data/home-configurators";
import {
  canMarkDesignGroupReadyForFactory,
  canSendDesignGroupToFactory,
  createDefaultPlannerState,
  createPlannerDesignVariation,
  migratePlannerState,
  plannerLifecycleStatuses,
  type PlannerDesignVariation,
  type PlannerState,
} from "@/lib/project-planner";
import {
  createPlannerSubmissionId,
  formatPlannerHandoffEmail,
  parsePlannerProjectHandoff,
} from "@/lib/planner-handoff";

function completeConfiguration(
  definition: HomeConfiguratorDefinition,
  level: HomeInclusionLevel,
  reference: string,
  designName: string,
): HomeConfiguration {
  const configuration = createDefaultHomeConfiguration(definition);
  const inclusionSelections: HomeConfiguration["inclusionSelections"] = {};
  const flooringSelections: HomeConfiguration["flooringSelections"] = {};

  for (const category of getHomeConfiguratorJourneyCategories(definition)) {
    if (category.kind === "standard" || category.kind === "room-look") {
      const option =
        category.options.find((candidate) => candidate.level === level) ??
        category.options[0]!;
      inclusionSelections[category.id] = {
        optionId: option.id,
        status: "confirmed",
      };
    } else {
      for (const zone of category.zones) {
        const option =
          zone.options.find((candidate) => candidate.level === level) ??
          zone.options[0]!;
        flooringSelections[zone.id] = {
          optionId: option.id,
          status: "confirmed",
        };
      }
    }
  }

  return {
    ...configuration,
    inclusionSelections,
    flooringSelections,
    reviewStatus: "ready-for-review",
    lookBookPersonalization: {
      projectDesignName: designName,
      preparedAt: "2026-08-31T12:00:00.000Z",
      reference,
    },
  };
}

function completedVariation({
  lineId,
  index,
  quantity,
  definition,
  level,
  reference,
  designName,
  indigenous = false,
}: {
  lineId: string;
  index: number;
  quantity: number;
  definition: HomeConfiguratorDefinition;
  level: HomeInclusionLevel;
  reference: string;
  designName: string;
  indigenous?: boolean;
}): PlannerDesignVariation {
  return {
    ...createPlannerDesignVariation(lineId, quantity, index),
    status: "complete",
    projectDesignName: designName,
    lookBookReference: reference,
    savedAt: "2026-08-31T12:00:00.000Z",
    culturalExteriorInterest: indigenous,
    designNotes: indigenous
      ? "Carry the approved exterior inspiration into factory review."
      : "Confirm durable family-home material mapping.",
    configuration: {
      ...completeConfiguration(
        definition,
        level,
        reference,
        designName,
      ),
      culturalExteriorInterest: indigenous,
    },
  };
}

function realisticProject() {
  const langleyDefinition = getHomeConfiguratorRegistration(
    "custom-home",
    "langley",
  )!.definition!;
  const solaceDefinition = getHomeConfiguratorRegistration(
    "custom-home",
    "solace",
  )!.definition!;
  const langleyLineId = "langley-line";
  const solaceLineId = "solace-line";

  return {
    ...createDefaultPlannerState(),
    projectId: "HDP-EXAMPLE-12",
    community: "Example First Nation",
    location: "British Columbia",
    opportunityReportReference: "HD-OPP-EXAMPLE-12",
    projectNotes: "Coordinate community workforce objectives during review.",
    authorizedRepresentative: {
      name: "Alex Representative",
      title: "Housing Director",
      councilAuthorizationStatus: "to-confirm" as const,
    },
    portfolio: [
      {
        id: langleyLineId,
        modelId: "custom:langley",
        quantity: 10,
        phase: "phase-1" as const,
        designVariations: [
          completedVariation({
            lineId: langleyLineId,
            index: 0,
            quantity: 6,
            definition: langleyDefinition,
            level: "premium",
            reference: "LAN-GROUP-A",
            designName: "Langley — Design Group A",
          }),
          completedVariation({
            lineId: langleyLineId,
            index: 1,
            quantity: 4,
            definition: langleyDefinition,
            level: "signature",
            reference: "LAN-GROUP-B",
            designName: "Langley — Design Group B",
            indigenous: true,
          }),
        ],
      },
      {
        id: solaceLineId,
        modelId: "custom:solace",
        quantity: 2,
        phase: "phase-2" as const,
        designVariations: [
          completedVariation({
            lineId: solaceLineId,
            index: 0,
            quantity: 2,
            definition: solaceDefinition,
            level: "premium",
            reference: "SOL-GROUP-A",
            designName: "Solace — Design Group A",
          }),
        ],
      },
    ],
  } satisfies PlannerState;
}

test("12 homes persist as three unique factory design outputs with real Look Book packages", () => {
  const state = realisticProject();
  const handoff = parsePlannerProjectHandoff({
    plannerRecord: state,
    contact: {
      firstName: "Alex",
      email: "alex@example.test",
      phone: "604 555 0100",
    },
    origin: "https://preview.housedelivery.test",
    submittedAt: "2026-08-31T14:00:00.000Z",
  });

  assert.equal(handoff.packages.length, 3);
  assert.deepEqual(
    handoff.packages.map((item) => item.assignedQuantity),
    [6, 4, 2],
  );
  assert.equal(new Set(handoff.packages.map((item) => item.configurationId)).size, 3);
  assert.equal(handoff.packages[1]?.exteriorExpression, "Indigenous Inspiration");
  assert.ok(handoff.packages.every((item) => item.selections.length === 7));
  assert.ok(handoff.packages.every((item) => item.record.followUpRequested === false));
  assert.ok(handoff.packages.every((item) => item.record.leadState === "known_engaged"));
  assert.ok(handoff.packages.every((item) => item.lookBookUrl.includes("/lookbook/")));
  assert.ok(handoff.packages.every((item) => item.pdfUrl.endsWith("/pdf?disposition=attachment")));
  assert.equal(
    handoff.packages[0]?.record.configuration.lookBookPersonalization?.project
      ?.id,
    state.projectId,
  );
  assert.equal(
    handoff.packages[0]?.record.configuration.lookBookPersonalization?.project
      ?.assignedQuantity,
    6,
  );

  const repeated = parsePlannerProjectHandoff({
    plannerRecord: state,
    contact: { firstName: "Alex", email: "alex@example.test" },
    origin: "https://preview.housedelivery.test",
    submittedAt: "2026-08-31T15:00:00.000Z",
  });
  assert.equal(repeated.submissionId, handoff.submissionId);
  assert.deepEqual(
    repeated.packages.map((item) => item.configurationId),
    handoff.packages.map((item) => item.configurationId),
  );
  assert.equal(
    handoff.submissionId,
    createPlannerSubmissionId(
      state.projectId,
      state.opportunityReportReference,
    ),
  );
});

test("House Delivery email contains every human-readable design package and the gated commercial sequence", () => {
  const handoff = parsePlannerProjectHandoff({
    plannerRecord: realisticProject(),
    contact: { firstName: "Alex", email: "alex@example.test" },
    origin: "https://preview.housedelivery.test",
  });
  const email = formatPlannerHandoffEmail(handoff, {
    firstName: "Alex",
    lastName: "Representative",
    email: "alex@example.test",
    phone: "",
    notes: "Please review phasing.",
    timeline: "2027",
  });

  assert.match(email, /STATUS: SUBMITTED FOR HOUSE DELIVERY REVIEW/);
  assert.match(email, /Unique Design Groups: 3/);
  for (const designPackage of handoff.packages) {
    assert.ok(
      email.toLowerCase().includes(designPackage.designGroupName.toLowerCase()),
    );
    assert.ok(email.includes(designPackage.lookBookUrl));
    assert.ok(email.includes(designPackage.pdfUrl));
    for (const selection of designPackage.selections) {
      assert.ok(email.includes(selection.optionName));
    }
  }
  assert.match(email, /HOUSE DELIVERY REVIEW[\s\S]*LOU PREPARATION[\s\S]*SEPARATE DESIGN DEVELOPMENT AUTHORIZATION[\s\S]*PAYMENT CLEARANCE[\s\S]*EXPLICIT HOUSE DELIVERY FACTORY RELEASE[\s\S]*FACTORY VIRTUAL WALKTHROUGH[\s\S]*FINAL \/ REFINED PROJECT PRICING/);
  assert.match(email, /does not create an LOU, authorize or charge design-development work/);
  assert.doesNotMatch(email, /\$500/);
  assert.doesNotMatch(email, /kitchen-look-feel-premium-1/);
});

test("LOU, payment and explicit release gates remain separate and factory output returns to its Design Group", () => {
  const state = realisticProject();
  const variation = state.portfolio[0]!.designVariations[0]!;
  assert.equal(canMarkDesignGroupReadyForFactory(state, variation), false);
  assert.equal(canSendDesignGroupToFactory(variation), false);
  assert.equal(variation.designDevelopment.fee.status, "not-configured");
  assert.equal(variation.designDevelopment.fee.amountCents, undefined);

  const acceptedState: PlannerState = {
    ...state,
    lifecycleStatus: "design-development-paid",
    louStatus: "accepted",
    portfolio: state.portfolio.map((line, lineIndex) => ({
      ...line,
      designVariations: line.designVariations.map((candidate, index) =>
        lineIndex === 0 && index === 0
          ? {
              ...candidate,
              designDevelopment: {
                ...candidate.designDevelopment,
                status: "paid-cleared",
              },
            }
          : candidate,
      ),
    })),
  };
  const paid = acceptedState.portfolio[0]!.designVariations[0]!;
  assert.equal(canMarkDesignGroupReadyForFactory(acceptedState, paid), true);
  assert.equal(canSendDesignGroupToFactory(paid), false);

  const factoryComplete: PlannerState = {
    ...acceptedState,
    lifecycleStatus: "factory-design-complete",
    portfolio: acceptedState.portfolio.map((line, lineIndex) => ({
      ...line,
      designVariations: line.designVariations.map((candidate, index) =>
        lineIndex === 0 && index === 0
          ? {
              ...candidate,
              designDevelopment: {
                ...candidate.designDevelopment,
                status: "factory-development-complete",
                factoryOutput: {
                  walkthroughStatus: "complete",
                  walkthroughUrl: "https://factory.example.test/walkthrough/a",
                  reference: "FACTORY-DD-A",
                  specificationNotes: "Product mapping returned for pricing.",
                  receivedAt: "2026-10-01T12:00:00.000Z",
                  clarificationItems: ["Confirm appliance coordination"],
                },
              },
            }
          : candidate,
      ),
    })),
  };
  const restored = migratePlannerState(
    JSON.parse(JSON.stringify(factoryComplete)),
  );
  const restoredOutput =
    restored?.portfolio[0]?.designVariations[0]?.designDevelopment.factoryOutput;
  assert.equal(restoredOutput?.reference, "FACTORY-DD-A");
  assert.equal(restoredOutput?.walkthroughStatus, "complete");
  assert.deepEqual(restoredOutput?.clarificationItems, [
    "Confirm appliance coordination",
  ]);
  assert.ok(
    plannerLifecycleStatuses.indexOf("final-pricing-in-development") >
      plannerLifecycleStatuses.indexOf("factory-design-complete"),
  );
  assert.ok(
    plannerLifecycleStatuses.indexOf("final-pricing-ready") >
      plannerLifecycleStatuses.indexOf("factory-design-complete"),
  );
});
