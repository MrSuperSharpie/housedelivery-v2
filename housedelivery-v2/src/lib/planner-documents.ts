import {
  firstNationsFundingCorridors,
  firstNationsPlannerCatalog,
} from "@/data/first-nations-planner";
import type {
  PlannerLouDocument,
  PlannerLouDraft,
  StoredPlannerProject,
} from "@/lib/planner-project-record";
import {
  getCommunityWorkforceCapacityLabels,
  getPortfolioSummary,
  getReadinessProfile,
  type FundingCorridor,
  type PlannerState,
} from "@/lib/project-planner";

function withPeriod(value: string) {
  const trimmed = value.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export type PlannerWorkforceSummary = {
  lines: readonly string[];
  detailedSelections: readonly string[];
};

export function getPlannerWorkforceSummary(
  state: PlannerState,
): PlannerWorkforceSummary {
  const detailedSelections = getCommunityWorkforceCapacityLabels(
    state.refinement.communityWorkforceCapacity,
  ).filter((label) => label !== "To be determined");
  const readiness = state.readiness.communityWorkforce;

  if (
    readiness === "yes" ||
    readiness === "explore" ||
    detailedSelections.length > 0
  ) {
    return {
      lines: [
        "Community interest in local training and participation has been identified.",
        ...(detailedSelections.length
          ? [`Planner selections: ${detailedSelections.join("; ")}.`]
          : []),
        "Specific participation, training scope, workforce availability, partners, costs and scheduling remain to be confirmed during project review.",
      ],
      detailedSelections,
    };
  }

  if (readiness === "no") {
    return {
      lines: [
        "Local training and participation were not requested at this stage.",
      ],
      detailedSelections: [],
    };
  }

  return {
    lines: ["To be determined."],
    detailedSelections: [],
  };
}

export type PlannerFundingSummary = {
  projectStatus: string;
  selectedCorridors: readonly string[];
  corridorReviewLines: readonly string[];
};

export function getPlannerFundingSummary(
  state: PlannerState,
  corridors: readonly FundingCorridor[],
): PlannerFundingSummary {
  const readiness = getReadinessProfile(
    state,
    firstNationsPlannerCatalog,
  ).find((item) => item.id === "fundingPathway");
  const selectedCorridors = corridors.flatMap((corridor) =>
    state.fundingCorridorDecisions[corridor.id] === "include"
      ? [`${corridor.title} — ${corridor.organization}`]
      : [],
  );

  return {
    projectStatus: withPeriod(
      readiness?.detail ??
        "Funding / financing pathway not yet determined",
    ),
    selectedCorridors,
    corridorReviewLines: selectedCorridors.length
      ? selectedCorridors
      : [
          "No specific House Delivery funding corridor has been selected for review.",
        ],
  };
}

function councilStatusLabel(
  value: PlannerState["authorizedRepresentative"]["councilAuthorizationStatus"],
) {
  const labels = {
    required: "Required",
    "not-required": "Not required",
    "to-confirm": "To confirm",
  } as const;
  return labels[value];
}

export function createPlannerLouDraft(
  project: StoredPlannerProject,
  revision: number,
  now = new Date().toISOString(),
): PlannerLouDraft {
  const state = project.projectState;
  const summary = getPortfolioSummary(
    state.portfolio,
    firstNationsPlannerCatalog,
  );
  const readiness = getReadinessProfile(
    state,
    firstNationsPlannerCatalog,
  );
  const workforce = getPlannerWorkforceSummary(state);
  const funding = getPlannerFundingSummary(
    state,
    firstNationsFundingCorridors,
  );
  const knownToday = readiness
    .filter((item) => item.ready)
    .map((item) => `${item.label}: ${item.detail} [${item.status}]`);
  const itemsToConfirm = readiness
    .filter((item) => !item.ready)
    .map((item) => `${item.label}: ${item.detail} [${item.status}]`);

  const document: PlannerLouDocument = {
    project: {
      id: project.id,
      opportunityReportReference: project.opportunityReportReference,
      community: project.community,
      location: state.location || "To confirm",
    },
    parties: ["House Delivery Inc.", project.community],
    authorizedRepresentative: {
      name: state.authorizedRepresentative.name || "To confirm",
      title: state.authorizedRepresentative.title || "To confirm",
      councilAuthorizationStatus: councilStatusLabel(
        state.authorizedRepresentative.councilAuthorizationStatus,
      ),
    },
    purpose:
      "The purpose of this Letter of Understanding is to record the parties’ intention to work together to further evaluate and develop the housing opportunity described in the submitted Preliminary Opportunity Report.",
    preliminaryProjectBasis: [
      `${summary.totalHomes} preliminary ${summary.totalHomes === 1 ? "home" : "homes"}.`,
      ...summary.lines.map(
        ({ line, model }) =>
          `${line.quantity * model.homesPerSelection} ${model.name.replace(/^The\s+/i, "")} ${line.quantity * model.homesPerSelection === 1 ? "home" : "homes"} — ${line.phase.replace("phase-1", "Active / First Build").replace("phase-2", "Near-Term / Next Build").replace("future", "Future Pipeline")}.`,
      ),
    ],
    designDirections: project.designPackages.map((designPackage) => ({
      name: designPackage.designGroupName,
      home: designPackage.homeName,
      quantity: designPackage.assignedQuantity,
      deliveryGroup: designPackage.deliveryGroup,
      exteriorExpression: designPackage.exteriorExpression,
      lookBookReference: designPackage.lookBookReference,
      designNotes: designPackage.designNotes || "None provided",
      lookBookUrl: designPackage.lookBookUrl,
      pdfUrl: designPackage.pdfUrl,
    })),
    knownToday,
    itemsToConfirm,
    workforce: workforce.lines,
    funding: {
      projectStatus: funding.projectStatus,
      corridorReview: funding.corridorReviewLines,
    },
    houseDeliveryNextSteps: [
      "Review the submitted project information and attached project records.",
      "Coordinate further technical and project development.",
      "Clarify site, servicing and access information where required.",
      "Advance appropriate funding or financing discussions where applicable.",
      "Coordinate next-stage design development only where separately authorized.",
      "Develop refined or final project pricing once sufficient project-specific information is available.",
    ],
    communityNextSteps: [
      "Confirm authorized project contacts and required Nation or Council approvals.",
      "Provide or confirm relevant site and servicing information as it becomes available.",
      "Support community and project information required to advance the opportunity.",
      "Review subsequent project-development information with House Delivery.",
    ],
    paidDesignDevelopmentClause:
      "Project-specific visualization, virtual walkthrough, drafting, engineering or factory design-development services may involve additional fees. Any such fee will be disclosed separately. No chargeable Design Development work will commence without separate written authorization.",
    finalPricingClause:
      "Planner information is preliminary and completed Look Books establish design direction only. Factory design and specification development may be required before House Delivery can develop refined or final project pricing. This Letter of Understanding does not establish final project pricing, a final quotation, a purchase agreement, a construction contract, financing approval, permit approval or factory production authorization.",
  };

  return {
    revision,
    status: "prepared",
    createdAt: now,
    updatedAt: now,
    projectId: project.id,
    opportunityReportReference: project.opportunityReportReference,
    document,
    text: formatPlannerLouDraftText(document, revision, now),
  };
}

function textList(items: readonly string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function formatPlannerLouDraftText(
  document: PlannerLouDocument,
  revision: number,
  createdAt: string,
) {
  const designs = document.designDirections.flatMap((design) => [
    design.name.toUpperCase(),
    `Home model: ${design.home}`,
    `Assigned quantity: ${design.quantity}`,
    `Delivery group: ${design.deliveryGroup}`,
    `Exterior expression: ${design.exteriorExpression}`,
    `Look Book: ${design.lookBookReference}`,
    `Design note: ${design.designNotes}`,
    "",
  ]);

  return [
    "HOUSE DELIVERY INC.",
    "PROJECT DEVELOPMENT",
    "LETTER OF UNDERSTANDING",
    "",
    "DRAFT — HOUSE DELIVERY REVIEW REQUIRED",
    "NOT YET SENT TO NATION",
    `LOU Draft Revision ${revision}`,
    `Created: ${createdAt}`,
    "",
    "PROJECT",
    `Project ID: ${document.project.id}`,
    `Opportunity Report ID: ${document.project.opportunityReportReference}`,
    `Nation / Community: ${document.project.community}`,
    `Project Location: ${document.project.location}`,
    "",
    "PARTIES",
    ...document.parties,
    "",
    "AUTHORIZED REPRESENTATIVE",
    `Name: ${document.authorizedRepresentative.name}`,
    `Title: ${document.authorizedRepresentative.title}`,
    `Council / BCR status: ${document.authorizedRepresentative.councilAuthorizationStatus}`,
    "",
    "PURPOSE",
    document.purpose,
    "",
    "PRELIMINARY PROJECT BASIS",
    textList(document.preliminaryProjectBasis),
    "",
    "DESIGN DIRECTION",
    "The completed Look Books are the detailed preliminary design records for the following Design Groups:",
    "",
    ...designs,
    "PROJECT READINESS — KNOWN TODAY",
    textList(document.knownToday),
    "",
    "PROJECT READINESS — ITEMS TO CONFIRM",
    textList(document.itemsToConfirm),
    "",
    "COMMUNITY WORKFORCE & CAPACITY",
    ...document.workforce,
    "",
    "FUNDING / FINANCING",
    `Project-reported status: ${document.funding.projectStatus}`,
    "House Delivery funding-corridor review:",
    textList(document.funding.corridorReview),
    "No funding, financing, program eligibility or lender approval is represented by this draft.",
    "",
    "HOUSE DELIVERY NEXT STEPS",
    textList(document.houseDeliveryNextSteps),
    "",
    "NATION / COMMUNITY NEXT STEPS",
    textList(document.communityNextSteps),
    "",
    "SEPARATE PAID DESIGN DEVELOPMENT",
    document.paidDesignDevelopmentClause,
    "",
    "FINAL / REFINED PROJECT PRICING",
    document.finalPricingClause,
    "",
    "SCHEDULE A — PRELIMINARY OPPORTUNITY REPORT",
    `Submitted Opportunity Report ${document.project.opportunityReportReference} is incorporated by reference as a preliminary project record.`,
    "",
    "SCHEDULE B — PRELIMINARY DESIGN DIRECTIONS",
    "The Design Groups and completed Look Books listed above form Schedule B. The Look Books remain the detailed design records.",
  ].join("\n");
}
