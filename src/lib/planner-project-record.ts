import type { PlannerHandoffPackage } from "@/lib/planner-handoff";
import type { PlannerState } from "@/lib/project-planner";

export type PlannerProjectDesignPackage = Omit<
  PlannerHandoffPackage,
  "record"
>;

export type PlannerInternalReviewStatus =
  | "pending"
  | "clarification-required"
  | "lou-draft-prepared";

export type PlannerReviewNote = {
  id: string;
  kind: "clarification" | "lou-preparation";
  note: string;
  createdAt: string;
};

export type PlannerLouDocument = {
  project: {
    id: string;
    opportunityReportReference: string;
    community: string;
    location: string;
  };
  parties: readonly string[];
  authorizedRepresentative: {
    name: string;
    title: string;
    councilAuthorizationStatus: string;
  };
  purpose: string;
  preliminaryProjectBasis: readonly string[];
  designDirections: readonly {
    name: string;
    home: string;
    quantity: number;
    deliveryGroup: string;
    exteriorExpression: string;
    lookBookReference: string;
    designNotes: string;
    lookBookUrl: string;
    pdfUrl: string;
  }[];
  knownToday: readonly string[];
  itemsToConfirm: readonly string[];
  workforce: readonly string[];
  funding: {
    projectStatus: string;
    corridorReview: readonly string[];
  };
  houseDeliveryNextSteps: readonly string[];
  communityNextSteps: readonly string[];
  paidDesignDevelopmentClause: string;
  finalPricingClause: string;
};

export type PlannerLouDraft = {
  revision: number;
  status: "prepared";
  createdAt: string;
  updatedAt: string;
  projectId: string;
  opportunityReportReference: string;
  document: PlannerLouDocument;
  text: string;
};

export type StoredPlannerProject = {
  id: string;
  submissionId: string;
  opportunityReportReference: string;
  community: string;
  lifecycleStatus: PlannerState["lifecycleStatus"];
  projectState: PlannerState;
  designPackages: readonly PlannerProjectDesignPackage[];
  reviewTokenHash: string;
  internalReviewStatus: PlannerInternalReviewStatus;
  reviewNotes: readonly PlannerReviewNote[];
  louDrafts: readonly PlannerLouDraft[];
  internalReviewUpdatedAt?: string;
  handoffEmailVersion: number;
  handoffEmailSentAt?: string;
  handoffEmailProviderId?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
};
