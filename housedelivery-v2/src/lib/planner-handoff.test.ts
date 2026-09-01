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
import { createPlannerLouDraft } from "@/lib/planner-documents";
import type { StoredPlannerProject } from "@/lib/planner-project-record";
import {
  derivePlannerReviewToken,
  hashPlannerReviewToken,
  isTrustedPlannerReviewMutationRequest,
  plannerReviewTokenMatches,
  PlannerReviewAccessConfigurationError,
} from "@/lib/planner-review-access";

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
  designNotes,
}: {
  lineId: string;
  index: number;
  quantity: number;
  definition: HomeConfiguratorDefinition;
  level: HomeInclusionLevel;
  reference: string;
  designName: string;
  indigenous?: boolean;
  designNotes?: string;
}): PlannerDesignVariation {
  return {
    ...createPlannerDesignVariation(lineId, quantity, index),
    status: "complete",
    projectDesignName: designName,
    lookBookReference: reference,
    savedAt: "2026-08-31T12:00:00.000Z",
    culturalExteriorInterest: indigenous,
    designNotes: designNotes ?? (indigenous
      ? "Carry the approved exterior inspiration into factory review."
      : "Confirm durable family-home material mapping."),
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

function testNationThreeProject() {
  const homes = [
    ["langley", "Langley", "LOT B-09", "TEST3-LAN"],
    ["solace", "Solace", "LOT B-22", "TEST3-SOL"],
    ["timberline", "Timberline", "LOT B-17", "TEST3-TIM"],
  ] as const;

  const base = createDefaultPlannerState();
  return {
    ...base,
    projectId: "HDP-TEST-NATION-3",
    community: "Test Nation 3",
    location: "British Columbia",
    opportunityReportReference: "HD-OPP-TEST-NATION-3",
    contact: {
      firstName: "Tanya",
      lastName: "Tester",
      email: "tanya@example.test",
      phone: "604 555 0103",
    },
    authorizedRepresentative: {
      name: "Tanya Tester",
      title: "Housing Manager",
      councilAuthorizationStatus: "to-confirm" as const,
    },
    readiness: {
      landSiteControl: "confirmed" as const,
      servicing: "confirmed" as const,
      affordabilityPathway: "not-yet" as const,
      communityWorkforce: "explore" as const,
      communityEngagement: "not-yet" as const,
      fundingPathway: "identified" as const,
    },
    refinement: {
      ...base.refinement,
      communityWorkforceCapacity: ["to-be-determined"] as const,
    },
    fundingCorridorDecisions: {},
    portfolio: homes.map(([slug, name, designNotes, reference], index) => {
      const lineId = `${slug}-test-3-line`;
      return {
        id: lineId,
        modelId: `custom:${slug}`,
        quantity: 1,
        phase: "phase-1" as const,
        designVariations: [
          completedVariation({
            lineId,
            index,
            quantity: 1,
            definition: getHomeConfiguratorRegistration("custom-home", slug)!
              .definition!,
            level: index === 1 ? "signature" : "premium",
            reference,
            designName: `${name} — Design Group A`,
            designNotes,
          }),
        ],
      };
    }),
  } satisfies PlannerState;
}

function storedProjectFromHandoff(
  handoff: ReturnType<typeof parsePlannerProjectHandoff>,
): StoredPlannerProject {
  return {
    id: handoff.state.projectId,
    submissionId: handoff.submissionId,
    opportunityReportReference: handoff.state.opportunityReportReference,
    community: handoff.state.community,
    lifecycleStatus: "submitted-for-review",
    projectState: {
      ...handoff.state,
      reviewStatus: "submitted",
      lifecycleStatus: "submitted-for-review",
      louStatus: "project-review-requested",
      submissionId: handoff.submissionId,
      submittedAt: "2026-09-01T19:00:00.000Z",
    },
    designPackages: handoff.packages.map(({ record, ...designPackage }) => {
      void record;
      return designPackage;
    }),
    reviewTokenHash: "a".repeat(64),
    internalReviewStatus: "pending",
    reviewNotes: [],
    louDrafts: [],
    handoffEmailVersion: 0,
    createdAt: "2026-09-01T19:00:00.000Z",
    updatedAt: "2026-09-01T19:00:00.000Z",
    submittedAt: "2026-09-01T19:00:00.000Z",
  };
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
  }, {
    projectReviewUrl: "https://preview.housedelivery.test/internal/project-review/secure-token",
    opportunityReportUrl: "https://preview.housedelivery.test/internal/project-review/secure-token/opportunity-report",
    opportunityReportPdfUrl: "https://preview.housedelivery.test/internal/project-review/secure-token/opportunity-report/pdf?disposition=attachment",
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

test("Test Nation 3 email keeps workforce and funding sources coherent and includes durable review links", () => {
  const handoff = parsePlannerProjectHandoff({
    plannerRecord: testNationThreeProject(),
    contact: {
      firstName: "Tanya",
      email: "tanya@example.test",
      phone: "604 555 0103",
    },
    origin: "https://preview.housedelivery.test",
    submittedAt: "2026-09-01T19:00:00.000Z",
  });
  const links = {
    projectReviewUrl: "https://preview.housedelivery.test/internal/project-review/project-capability",
    opportunityReportUrl: "https://preview.housedelivery.test/internal/project-review/project-capability/opportunity-report",
    opportunityReportPdfUrl: "https://preview.housedelivery.test/internal/project-review/project-capability/opportunity-report/pdf?disposition=attachment",
  };
  const email = formatPlannerHandoffEmail(handoff, {
    firstName: "Tanya",
    lastName: "Tester",
    email: "tanya@example.test",
    phone: "604 555 0103",
    notes: "",
    timeline: "",
  }, links);

  assert.equal(handoff.packages.length, 3);
  assert.match(email, /Community interest in local training and participation has been identified/);
  assert.match(email, /Specific participation, training scope, workforce availability, partners, costs and scheduling remain to be confirmed/);
  assert.doesNotMatch(email, /COMMUNITY WORKFORCE \/ TRAINING\nTo be determined/);
  assert.match(email, /Project-reported status:\nFunding \/ financing pathway identified\./);
  assert.match(email, /No specific House Delivery funding corridor has been selected for review\./);
  assert.doesNotMatch(email, /pathway remains to confirm/i);
  assert.ok(email.includes(links.projectReviewUrl));
  assert.ok(email.includes(links.opportunityReportUrl));
  assert.ok(email.includes(links.opportunityReportPdfUrl));
  for (const note of ["LOT B-09", "LOT B-22", "LOT B-17"]) {
    assert.ok(email.includes(note));
  }
});

test("Project review capability is stable, project-scoped, hashed at rest and rejects weak configuration", () => {
  const secret = "planner-review-secret-with-at-least-32-characters";
  const token = derivePlannerReviewToken("planner-submission-a", secret);
  const repeated = derivePlannerReviewToken("planner-submission-a", secret);
  const other = derivePlannerReviewToken("planner-submission-b", secret);

  assert.equal(token.length, 43);
  assert.equal(token, repeated);
  assert.notEqual(token, other);
  assert.equal(plannerReviewTokenMatches(token, hashPlannerReviewToken(token)), true);
  assert.equal(plannerReviewTokenMatches(other, hashPlannerReviewToken(token)), false);
  assert.throws(
    () => derivePlannerReviewToken("planner-submission-a", "too-short"),
    PlannerReviewAccessConfigurationError,
  );
});

test("Project review mutations accept the trusted Preview alias and reject foreign origins", () => {
  const trustedAliasRequest = new Request(
    "https://immutable-preview.vercel.app/api/internal/project-review/token",
    {
      method: "POST",
      headers: {
        host: "immutable-preview.vercel.app",
        origin: "https://branch-preview.vercel.app",
        "sec-fetch-site": "same-origin",
        "x-forwarded-host": "branch-preview.vercel.app",
        "x-forwarded-proto": "https",
      },
    },
  );
  const foreignOriginRequest = new Request(
    "https://immutable-preview.vercel.app/api/internal/project-review/token",
    {
      method: "POST",
      headers: {
        host: "immutable-preview.vercel.app",
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
        "x-forwarded-host": "branch-preview.vercel.app",
        "x-forwarded-proto": "https",
      },
    },
  );

  const canonicalizedPreviewRequest = new Request(
    "https://immutable-preview.vercel.app/api/internal/project-review/token",
    {
      method: "POST",
      headers: {
        host: "immutable-preview.vercel.app",
        origin: "https://branch-preview.vercel.app",
        "sec-fetch-site": "same-origin",
        "x-forwarded-host": "immutable-preview.vercel.app",
        "x-forwarded-proto": "https",
      },
    },
  );

  assert.equal(
    isTrustedPlannerReviewMutationRequest(trustedAliasRequest),
    true,
  );
  assert.equal(
    isTrustedPlannerReviewMutationRequest(canonicalizedPreviewRequest),
    true,
  );
  assert.equal(
    isTrustedPlannerReviewMutationRequest(foreignOriginRequest),
    false,
  );
});

test("Test Nation 3 LOU is a versioned prepared draft with all schedules and no commercial authorization", () => {
  const handoff = parsePlannerProjectHandoff({
    plannerRecord: testNationThreeProject(),
    contact: { firstName: "Tanya", email: "tanya@example.test" },
    origin: "https://preview.housedelivery.test",
    submittedAt: "2026-09-01T19:00:00.000Z",
  });
  const project = storedProjectFromHandoff(handoff);
  const revisionOne = createPlannerLouDraft(
    project,
    1,
    "2026-09-01T20:00:00.000Z",
  );
  const revisionTwo = createPlannerLouDraft(
    { ...project, louDrafts: [revisionOne] },
    2,
    "2026-09-01T21:00:00.000Z",
  );

  assert.equal(revisionOne.status, "prepared");
  assert.equal(revisionOne.revision, 1);
  assert.equal(revisionTwo.revision, 2);
  assert.equal(revisionOne.document.designDirections.length, 3);
  for (const value of [
    "HDP-TEST-NATION-3",
    "HD-OPP-TEST-NATION-3",
    "Langley",
    "Solace",
    "Timberline",
    "LOT B-09",
    "LOT B-22",
    "LOT B-17",
    "SCHEDULE A",
    "SCHEDULE B",
    "DRAFT — HOUSE DELIVERY REVIEW REQUIRED",
    "NOT YET SENT TO NATION",
  ]) {
    assert.ok(revisionOne.text.includes(value));
  }
  assert.doesNotMatch(revisionOne.text, /\$500|invoice|payment due/i);
  assert.match(revisionOne.text, /No chargeable Design Development work will commence without separate written authorization/);
  assert.match(revisionOne.text, /does not establish final project pricing/);
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
