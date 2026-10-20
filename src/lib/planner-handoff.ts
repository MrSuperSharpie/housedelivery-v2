import { createHash } from "node:crypto";

import {
  firstNationsFundingCorridors,
  firstNationsPlannerCatalog,
} from "@/data/first-nations-planner";
import { models } from "@/data/models";
import {
  LookBookValidationError,
  parseCompletedLookBook,
  parseConfigurationId,
  singleLine,
} from "@/lib/lookbook/domain";
import type {
  LookBookContact,
  StoredLookBook,
  StoredLookBookSelection,
} from "@/lib/lookbook/types";
import {
  getPortfolioSummary,
  getReadinessProfile,
  migratePlannerState,
  type PlannerPhase,
  type PlannerState,
} from "@/lib/project-planner";
import {
  getPlannerFundingSummary,
  getPlannerWorkforceSummary,
} from "@/lib/planner-documents";

const phaseLabels: Record<PlannerPhase, string> = {
  "phase-1": "Active / First Build",
  "phase-2": "Near-Term / Next Build",
  future: "Future Pipeline",
};

export class PlannerHandoffValidationError extends Error {}

export type PlannerHandoffPackage = {
  variationId: string;
  lineId: string;
  configurationId: string;
  homeSlug: string;
  homeName: string;
  designGroupName: string;
  assignedQuantity: number;
  deliveryGroup: string;
  exteriorExpression: "Contemporary" | "Indigenous Inspiration";
  lookBookReference: string;
  revision: number;
  designNotes: string;
  selections: readonly StoredLookBookSelection[];
  lookBookUrl: string;
  pdfUrl: string;
  floorPlanUrl: string;
  record: StoredLookBook;
};

export type PlannerProjectHandoff = {
  state: PlannerState;
  submissionId: string;
  packages: readonly PlannerHandoffPackage[];
};

export type PlannerHandoffEmailInput = {
  state: PlannerState;
  submissionId: string;
  packages: readonly Omit<PlannerHandoffPackage, "record">[];
};

export type PlannerHandoffLinks = {
  projectReviewUrl: string;
  opportunityReportUrl: string;
  opportunityReportPdfUrl: string;
};

function deterministicConfigurationId(projectId: string, variationId: string) {
  const hex = createHash("sha256")
    .update(`${projectId}:${variationId}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16]!, 16) % 4]!;
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function createPlannerSubmissionId(
  projectId: string,
  opportunityReportReference: string,
) {
  return `planner-${createHash("sha256")
    .update(`${projectId}:${opportunityReportReference}`)
    .digest("hex")}`;
}

function homeSlugForModel(modelId: string) {
  return modelId.startsWith("custom:") ? modelId.slice("custom:".length) : "";
}

function tierLabel(tier: StoredLookBookSelection["tier"]) {
  return tier === "premium" ? "Premium" : "Signature";
}

export function selectionDisplayLine(selection: StoredLookBookSelection) {
  return `${selection.zoneTitle ?? selection.categoryTitle}: ${tierLabel(selection.tier)}${selection.optionNumber ? ` ${selection.optionNumber}` : ""} — ${selection.optionName}`;
}

export function parsePlannerProjectHandoff({
  plannerRecord,
  contact,
  origin,
  submittedAt = new Date().toISOString(),
}: {
  plannerRecord: unknown;
  contact: LookBookContact;
  origin: string;
  submittedAt?: string;
}): PlannerProjectHandoff {
  const state = migratePlannerState(plannerRecord);
  if (
    !state ||
    state.audience !== "first-nations" ||
    !singleLine(state.projectId, 100) ||
    !singleLine(state.community, 160) ||
    !singleLine(state.opportunityReportReference, 100)
  ) {
    throw new PlannerHandoffValidationError(
      "A valid First Nations Planner project record is required.",
    );
  }

  const seenVariationIds = new Set<string>();
  const packages = state.portfolio.flatMap((line) => {
    const homeSlug = homeSlugForModel(line.modelId);
    const model = models.find((candidate) => candidate.slug === homeSlug);
    if (!homeSlug || !model) {
      throw new PlannerHandoffValidationError(
        "Every submitted design group must use an active Custom Home.",
      );
    }

    const assignedTotal = line.designVariations.reduce(
      (total, variation) => total + variation.assignedQuantity,
      0,
    );
    if (assignedTotal !== line.quantity) {
      throw new PlannerHandoffValidationError(
        `Assigned quantities do not match the ${model.name} project quantity.`,
      );
    }

    return line.designVariations.map((variation) => {
      if (
        seenVariationIds.has(variation.id) ||
        variation.status !== "complete" ||
        !variation.configuration ||
        !variation.lookBookReference
      ) {
        throw new PlannerHandoffValidationError(
          "Every unique Design Group must have one completed Look Book before submission.",
        );
      }
      seenVariationIds.add(variation.id);

      let resolved;
      try {
        resolved = parseCompletedLookBook(homeSlug, variation.configuration);
      } catch (error) {
        if (error instanceof LookBookValidationError) {
          throw new PlannerHandoffValidationError(error.message);
        }
        throw error;
      }

      const configurationId =
        parseConfigurationId(variation.lookBookConfigurationId) ??
        deterministicConfigurationId(state.projectId, variation.id);
      const completedAt = variation.savedAt ?? submittedAt;
      const designGroupName =
        variation.projectDesignName ??
        `${model.name.replace(/^The\s+/i, "")} — ${variation.label}`;
      const exteriorExpression = variation.culturalExteriorInterest
        ? "Indigenous Inspiration" as const
        : "Contemporary" as const;
      const configuration = {
        ...resolved.configuration,
        lookBookPersonalization: {
          customer: { firstName: contact.firstName },
          projectDesignName: designGroupName,
          project: {
            id: state.projectId,
            name: state.community,
            ...(state.location ? { location: state.location } : {}),
            designGroupId: variation.id,
            designGroupName,
            assignedQuantity: variation.assignedQuantity,
            deliveryGroup: phaseLabels[line.phase],
            exteriorExpression,
            ...(variation.designNotes
              ? { designNotes: variation.designNotes }
              : {}),
            revision: variation.revision,
          },
          preparedAt:
            variation.configuration.lookBookPersonalization?.preparedAt ??
            completedAt,
          reference: variation.lookBookReference,
        },
      };
      const lookBookUrl = `${origin}/lookbook/${configurationId}`;
      const record: StoredLookBook = {
        id: configurationId,
        homeSlug,
        homeDisplayName: resolved.definition.homeName,
        homeFamily: resolved.registration.productFamily,
        configuratorVersion: resolved.definition.configurationVersion,
        configuration,
        selections: resolved.selections,
        contact,
        leadState: "known_engaged",
        followUpRequested: false,
        attribution: { anonymousSessionId: configurationId },
        createdAt: completedAt,
        updatedAt: submittedAt,
        completedAt,
      };

      return {
        variationId: variation.id,
        lineId: line.id,
        configurationId,
        homeSlug,
        homeName: resolved.definition.homeName,
        designGroupName,
        assignedQuantity: variation.assignedQuantity,
        deliveryGroup: phaseLabels[line.phase],
        exteriorExpression,
        lookBookReference: variation.lookBookReference,
        revision: variation.revision,
        designNotes: variation.designNotes,
        selections: resolved.selections,
        lookBookUrl,
        pdfUrl: `${lookBookUrl}/pdf?disposition=attachment`,
        floorPlanUrl: `${origin}/homes/${homeSlug}#plans`,
        record,
      } satisfies PlannerHandoffPackage;
    });
  });

  if (packages.length === 0) {
    throw new PlannerHandoffValidationError(
      "At least one completed Design Group is required.",
    );
  }

  return {
    state,
    submissionId:
      state.submissionId ||
      createPlannerSubmissionId(
        state.projectId,
        state.opportunityReportReference,
      ),
    packages,
  };
}

export function formatPlannerHandoffEmail(
  handoff: PlannerHandoffEmailInput,
  review: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    notes: string;
    timeline: string;
  },
  links: PlannerHandoffLinks,
) {
  const { state, packages } = handoff;
  const summary = getPortfolioSummary(state.portfolio, firstNationsPlannerCatalog);
  const readiness = getReadinessProfile(state, firstNationsPlannerCatalog);
  const known = readiness.filter((item) => item.ready);
  const toConfirm = readiness.filter((item) => !item.ready);
  const workforce = getPlannerWorkforceSummary(state);
  const funding = getPlannerFundingSummary(
    state,
    firstNationsFundingCorridors,
  );
  const portfolio = summary.lines.map(
    ({ line, model }) =>
      `${model.name}: ${line.quantity * model.homesPerSelection} home${line.quantity * model.homesPerSelection === 1 ? "" : "s"} / ${phaseLabels[line.phase]} / ${line.designVariations.length} Design Group${line.designVariations.length === 1 ? "" : "s"}`,
  );
  const designGroups = packages.flatMap((item) => [
    "",
    item.designGroupName.toUpperCase(),
    `Design Group ID: ${item.variationId}`,
    `Assigned quantity: ${item.assignedQuantity} home${item.assignedQuantity === 1 ? "" : "s"}`,
    `Delivery group: ${item.deliveryGroup}`,
    `Exterior direction: ${item.exteriorExpression}`,
    `Look Book: ${item.lookBookReference}`,
    `Design status: Complete / Revision ${item.revision}`,
    `Design notes: ${item.designNotes || "None provided"}`,
    "",
    "SELECTED DESIGN DIRECTION",
    ...item.selections.map(selectionDisplayLine),
    "",
    `View complete Look Book: ${item.lookBookUrl}`,
    `Download Look Book PDF: ${item.pdfUrl}`,
    `Home plan reference: ${item.floorPlanUrl}`,
  ]);

  return [
    "NEW HOUSE DELIVERY PLANNER PROJECT REVIEW",
    "",
    "STATUS: SUBMITTED FOR HOUSE DELIVERY REVIEW",
    "",
    "PROJECT",
    `Project ID: ${state.projectId}`,
    `Opportunity Report ID: ${state.opportunityReportReference}`,
    `Open Project Review: ${links.projectReviewUrl}`,
    `View Opportunity Report: ${links.opportunityReportUrl}`,
    `Download Opportunity Report PDF: ${links.opportunityReportPdfUrl}`,
    `Nation / community: ${state.community}`,
    `Authorized project representative: ${state.authorizedRepresentative.name || "To confirm"}`,
    `Representative title: ${state.authorizedRepresentative.title || "To confirm"}`,
    `Council / BCR authorization: ${state.authorizedRepresentative.councilAuthorizationStatus.replaceAll("-", " ")}`,
    `Review contact: ${review.firstName} ${review.lastName}`,
    `Email: ${review.email}`,
    `Phone: ${review.phone || "Not provided"}`,
    `Location: ${state.location || "To confirm"}`,
    `Desired start: ${review.timeline || "To confirm"}`,
    `Project notes: ${state.projectNotes || "None provided"}`,
    `Additional review notes: ${review.notes || "None provided"}`,
    "",
    "WORKING PORTFOLIO",
    `Total homes: ${summary.totalHomes}`,
    `Models: ${summary.modelCount}`,
    `Delivery groups: ${summary.phaseCount}`,
    `Unique Design Groups: ${packages.length}`,
    ...portfolio,
    "",
    "DESIGN GROUPS / DESIGN HANDOFF",
    ...designGroups,
    "",
    "PROJECT READINESS — KNOWN TODAY",
    ...known.map((item) => `${item.label}: ${item.detail} [${item.status}]`),
    "",
    "PROJECT READINESS — ITEMS TO CONFIRM",
    ...toConfirm.map((item) => `${item.label}: ${item.detail} [${item.status}]`),
    "",
    "COMMUNITY WORKFORCE / TRAINING",
    ...workforce.lines,
    "",
    "FUNDING / FINANCING",
    "Project-reported status:",
    funding.projectStatus,
    "House Delivery funding-corridor review:",
    ...funding.corridorReviewLines,
    "",
    "NEXT COMMERCIAL STEP",
    "HOUSE DELIVERY REVIEW",
    "→ LOU PREPARATION / REVIEW / ACCEPTANCE",
    "→ SEPARATE DESIGN DEVELOPMENT AUTHORIZATION",
    "→ FEE APPROVAL + PAYMENT CLEARANCE",
    "→ EXPLICIT HOUSE DELIVERY FACTORY RELEASE",
    "→ FACTORY VIRTUAL WALKTHROUGH + SPECIFICATION DEVELOPMENT",
    "→ HOUSE DELIVERY FINAL / REFINED PROJECT PRICING",
    "→ FINAL PROJECT / PURCHASE AGREEMENT",
    "",
    "This submission does not create an LOU, authorize or charge design-development work, release work to the factory, or establish final pricing.",
  ].join("\n");
}
