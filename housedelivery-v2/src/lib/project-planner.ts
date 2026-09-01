import type { HomeConfiguration } from "@/data/home-configurator";

export const plannerAudiences = [
  "first-nations",
  "developer",
  "general-contractor",
  "municipality-non-profit",
] as const;

export type PlannerAudience = (typeof plannerAudiences)[number];

export const plannerAudienceLabels: Record<PlannerAudience, string> = {
  "first-nations": "First Nation / Indigenous Community",
  developer: "Developer / Landowner",
  "general-contractor": "General Contractor",
  "municipality-non-profit": "Municipality / Non-Profit",
};

export function isPlannerAudience(value: unknown): value is PlannerAudience {
  return plannerAudiences.includes(value as PlannerAudience);
}

export type PlannerPhase = "phase-1" | "phase-2" | "future";

export type PlanningBasisStatus =
  | "under-review"
  | "planning-allowance"
  | "supplier-informed"
  | "commercially-controlled";

export type PlanningConfidence = "early" | "developing" | "reviewed";

export type PlanningBasis = {
  modelId: string;
  currency: "CAD";
  low: number | null;
  base: number | null;
  high: number | null;
  assumptions: readonly string[];
  exclusions: readonly string[];
  source: string;
  confidence: PlanningConfidence;
  status: PlanningBasisStatus;
};

export type PlannerDesignOption = {
  id: string;
  label: string;
  level: "premium" | "signature";
  status: "Visual Direction";
};

export type PlannerDesignChapter = {
  id: string;
  number: string;
  title: string;
  options: readonly PlannerDesignOption[];
};

export type PlannerCatalogItem = {
  id: string;
  family:
    | "custom-home"
    | "standardized-catalogue"
    | "laneway-carriage-home";
  name: string;
  code?: string;
  squareFeet: number | null;
  homesPerSelection: number;
  image: string;
  description: string;
  viewHref: string;
  walkthroughHref?: string;
  buildMyHref?: string;
  lookBookHref?: string;
  designChapters: readonly PlannerDesignChapter[];
  planningBasis: PlanningBasis;
};

export const plannerLifecycleStatuses = [
  "draft",
  "submitted-for-review",
  "house-delivery-review",
  "lou-prepared",
  "lou-sent",
  "lou-accepted",
  "design-development-authorization-required",
  "design-development-authorized",
  "payment-pending",
  "design-development-paid",
  "ready-for-factory",
  "sent-to-factory",
  "factory-design-in-progress",
  "factory-design-complete",
  "final-pricing-in-development",
  "final-pricing-ready",
] as const;

export type PlannerLifecycleStatus =
  (typeof plannerLifecycleStatuses)[number];

export type PlannerDesignDevelopmentStatus =
  | "not-authorized"
  | "authorized-payment-pending"
  | "paid-cleared"
  | "ready-for-factory-handoff"
  | "sent-to-factory"
  | "factory-development-in-progress"
  | "factory-development-complete";

export type PlannerDesignDevelopment = {
  status: PlannerDesignDevelopmentStatus;
  fee: {
    currency: "CAD";
    amountCents?: number;
    status: "not-configured" | "configured";
  };
  factoryOutput: {
    walkthroughStatus: "not-started" | "in-progress" | "complete";
    walkthroughUrl?: string;
    reference?: string;
    specificationNotes?: string;
    receivedAt?: string;
    clarificationItems: readonly string[];
  };
};

export type PlannerDesignVariation = {
  id: string;
  label: string;
  projectDesignName?: string;
  assignedQuantity: number;
  status: "draft" | "complete";
  designSelections: Readonly<Record<string, string>>;
  lookBookReference: string;
  lookBookConfigurationId?: string;
  configuration?: HomeConfiguration;
  designNotes: string;
  revision: number;
  designDevelopment: PlannerDesignDevelopment;
  savedAt?: string;
  culturalExteriorInterest?: boolean;
};

export type PlannerPortfolioLine = {
  id: string;
  modelId: string;
  quantity: number;
  phase: PlannerPhase;
  designVariations: readonly PlannerDesignVariation[];
};

export const communityWorkforceCapacityOptions = [
  {
    id: "local-assembly-participation",
    label: "Interested in local assembly participation",
  },
  {
    id: "local-workforce-identified",
    label: "Local trades / workforce already identified",
  },
  {
    id: "workforce-training-interest",
    label: "Interested in project-based assembly training",
  },
  {
    id: "house-delivery-support-required",
    label: "Need House Delivery support to coordinate local participation",
  },
  { id: "to-be-determined", label: "To be determined" },
] as const;

export type CommunityWorkforceCapacityId =
  (typeof communityWorkforceCapacityOptions)[number]["id"];

export const communityWorkforceCapacityReviewStatement =
  "Community workforce and capacity interests identified. Participation, training scope, partners, employment opportunities, costs and schedules will be confirmed during project review.";

export const firstNationsHousingUseQuestion =
  "How will these homes likely be used?";

export const firstNationsHousingUseSupportingText =
  "This helps us identify the most relevant funding and financing pathways.";

export const firstNationsHousingUseOptions = [
  ["community-rental", "Community rental"],
  ["ownership", "Homeownership"],
  ["mixed-income", "Mixed"],
  ["unknown", "Not sure yet"],
] as const;

export function getFirstNationsHousingUseLabel(value: string) {
  return (
    firstNationsHousingUseOptions.find(([optionValue]) => optionValue === value)?.[1] ??
    (value === "deeply-affordable" ? "Affordable housing" : "Not sure yet")
  );
}

export type ProjectRefinement = {
  householdPriorities: readonly string[];
  communityWorkforceCapacity: readonly CommunityWorkforceCapacityId[];
  accessibility: string;
  landStatus: string;
  servicing: string;
  affordability: string;
  culturalPriorities: string;
  energyResilience: string;
  localLabour: string;
  trainingObjectives: string;
  canadianValue: string;
  targetTiming: string;
};

export const firstNationsProjectReadinessQuestions = [
  {
    key: "landSiteControl",
    label: "Land / Site Control",
    question:
      "Has the community identified or confirmed the land/site for this housing project?",
    options: [
      ["confirmed", "Yes — site confirmed"],
      ["potential", "Partially — potential site identified"],
      ["not-yet", "Not yet"],
      ["not-sure", "Not sure"],
    ],
  },
  {
    key: "servicing",
    label: "Servicing",
    question: "What is currently known about servicing and site access?",
    options: [
      ["confirmed", "Confirmed / available"],
      ["partial", "Partially understood"],
      ["investigate", "Needs investigation"],
      ["not-sure", "Not sure"],
    ],
  },
  {
    key: "affordabilityPathway",
    label: "Affordability / Homeownership Pathway",
    question: "Has an affordability or homeownership approach been identified?",
    options: [
      ["identified", "Yes"],
      ["developing", "In development"],
      ["not-yet", "Not yet"],
      ["not-sure", "Not sure"],
    ],
  },
  {
    key: "communityWorkforce",
    label: "Community Workforce & Capacity",
    question:
      "Would the community like local members to participate in training, assembly, construction or long-term housing capacity development?",
    options: [
      ["yes", "Yes"],
      ["explore", "Possibly / would like to explore"],
      ["no", "No"],
      ["undetermined", "Not determined"],
    ],
  },
  {
    key: "communityEngagement",
    label: "Community Engagement",
    question:
      "Has the community begun engaging members about the housing need or proposed project?",
    options: [
      ["yes", "Yes"],
      ["some", "Some engagement"],
      ["not-yet", "Not yet"],
      ["undetermined", "Not determined"],
    ],
  },
  {
    key: "fundingPathway",
    label: "Funding / Financing Pathway",
    question: "Has a funding or financing pathway been identified?",
    options: [
      ["identified", "Yes"],
      ["options", "Some programs/options identified"],
      ["not-yet", "Not yet"],
      ["not-sure", "Not sure"],
    ],
  },
] as const;

export type ProjectReadinessKey =
  (typeof firstNationsProjectReadinessQuestions)[number]["key"];
export type ProjectReadinessValue =
  (typeof firstNationsProjectReadinessQuestions)[number]["options"][number][0];
export type FirstNationsProjectReadiness = Readonly<
  Record<ProjectReadinessKey, ProjectReadinessValue>
>;

export type PlannerProjectContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type PlannerAuthorizedRepresentative = {
  name: string;
  title: string;
  councilAuthorizationStatus: "required" | "not-required" | "to-confirm";
};

export type FundingCorridorDecision = "include" | "not-relevant";

export type PlannerState = {
  version: 6;
  projectId: string;
  audience: PlannerAudience;
  step: number;
  community: string;
  location: string;
  approximateHomes: string;
  sitePattern: string;
  deliveryHorizon: string;
  audienceContext: Readonly<Record<string, string>>;
  portfolio: readonly PlannerPortfolioLine[];
  refinement: ProjectRefinement;
  fundingCorridorDecisions: Readonly<
    Record<string, FundingCorridorDecision>
  >;
  readiness: FirstNationsProjectReadiness;
  contact: PlannerProjectContact;
  authorizedRepresentative: PlannerAuthorizedRepresentative;
  reviewStatus: "draft" | "submitted";
  lifecycleStatus: PlannerLifecycleStatus;
  louStatus:
    | "not-started"
    | "project-review-requested"
    | "prepared"
    | "sent"
    | "accepted";
  submissionId: string;
  submittedAt?: string;
  opportunityReportReference: string;
  projectNotes: string;
};

export type PreliminaryEstimate = {
  low: number | null;
  base: number | null;
  high: number | null;
  confidence: PlanningConfidence;
  status: "available" | "under-review";
  assumptions: readonly string[];
  exclusions: readonly string[];
  missingBasisModelIds: readonly string[];
};

export type FundingRelevance =
  | "Strong corridor to explore"
  | "Relevant corridor"
  | "Potential corridor";

export type FundingCorridor = {
  id: string;
  title: string;
  organization: string;
  supportType: string;
  officialSource: string;
  landStatus: readonly ("on-reserve" | "off-reserve" | "either")[];
  region: "canada" | "bc";
  priorities: readonly (
    | "affordability"
    | "rental"
    | "scale"
    | "modern-methods"
    | "community-housing"
  )[];
  whyItMayFit: string;
  confirmationNeeded: string;
};

export type MatchedFundingCorridor = FundingCorridor & {
  relevance: FundingRelevance;
};

export type ReportFundingCorridor = MatchedFundingCorridor & {
  decision?: FundingCorridorDecision;
};

export function createPlannerProjectId(now = Date.now()) {
  return `HDP-${now.toString(36).toUpperCase()}`;
}

export function ensurePlannerProjectId(
  state: PlannerState,
  now = Date.now(),
): PlannerState {
  return state.projectId
    ? state
    : { ...state, projectId: createPlannerProjectId(now) };
}

export function createDefaultPlannerState(
  audience: PlannerAudience = "first-nations",
): PlannerState {
  return {
    version: 6,
    projectId: "",
    audience,
    step: 0,
    community: "",
    location: "",
    approximateHomes: "",
    sitePattern: "unknown",
    deliveryHorizon: "unknown",
    audienceContext: {},
    portfolio: [],
    refinement: {
      householdPriorities: ["unknown"],
      communityWorkforceCapacity: ["to-be-determined"],
      accessibility: "unknown",
      landStatus: "unknown",
      servicing: "unknown",
      affordability: "unknown",
      culturalPriorities: "unknown",
      energyResilience: "unknown",
      localLabour: "unknown",
      trainingObjectives: "unknown",
      canadianValue: "unknown",
      targetTiming: "unknown",
    },
    fundingCorridorDecisions: {},
    readiness: {
      landSiteControl: "not-sure",
      servicing: "not-sure",
      affordabilityPathway: "not-sure",
      communityWorkforce: "undetermined",
      communityEngagement: "undetermined",
      fundingPathway: "not-sure",
    },
    contact: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
    authorizedRepresentative: {
      name: "",
      title: "",
      councilAuthorizationStatus: "to-confirm",
    },
    reviewStatus: "draft",
    lifecycleStatus: "draft",
    louStatus: "not-started",
    submissionId: "",
    opportunityReportReference: "",
    projectNotes: "",
  };
}

export const defaultPlannerState: PlannerState = createDefaultPlannerState();

type LegacyPlannerDesignVariation = PlannerDesignVariation & {
  culturalDesignDirection?: { choice?: string };
};

type LegacyPlannerPortfolioLine = Omit<PlannerPortfolioLine, "designVariations"> & {
  designSelections?: Readonly<Record<string, string>>;
  lookBookReference?: string;
  designVariations?: readonly LegacyPlannerDesignVariation[];
};

type LegacyPlannerState = Omit<
  PlannerState,
  "version" | "portfolio" | "fundingCorridorDecisions" | "audienceContext"
> & {
  version?: number;
  portfolio?: readonly LegacyPlannerPortfolioLine[];
  fundingCorridorDecisions?: unknown;
  audienceContext?: unknown;
};

function normalizeFirstNationsReadiness(
  value: unknown,
  legacyWorkforceCapacity: readonly CommunityWorkforceCapacityId[],
): FirstNationsProjectReadiness {
  const defaults = createDefaultPlannerState().readiness;
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<Record<ProjectReadinessKey, unknown>>)
      : {};
  const readChoice = <T extends ProjectReadinessValue>(
    key: ProjectReadinessKey,
    choices: readonly T[],
    fallback: T,
  ) =>
    choices.includes(candidate[key] as T)
      ? (candidate[key] as T)
      : fallback;

  return {
    landSiteControl: readChoice(
      "landSiteControl",
      ["confirmed", "potential", "not-yet", "not-sure"],
      defaults.landSiteControl,
    ),
    servicing: readChoice(
      "servicing",
      ["confirmed", "partial", "investigate", "not-sure"],
      defaults.servicing,
    ),
    affordabilityPathway: readChoice(
      "affordabilityPathway",
      ["identified", "developing", "not-yet", "not-sure"],
      defaults.affordabilityPathway,
    ),
    communityWorkforce: readChoice(
      "communityWorkforce",
      ["yes", "explore", "no", "undetermined"],
      hasCommunityWorkforceCapacityInterest(legacyWorkforceCapacity)
        ? "yes"
        : defaults.communityWorkforce,
    ),
    communityEngagement: readChoice(
      "communityEngagement",
      ["yes", "some", "not-yet", "undetermined"],
      defaults.communityEngagement,
    ),
    fundingPathway: readChoice(
      "fundingPathway",
      ["identified", "options", "not-yet", "not-sure"],
      defaults.fundingPathway,
    ),
  };
}

function normalizePlannerContact(value: unknown): PlannerProjectContact {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<Record<keyof PlannerProjectContact, unknown>>)
      : {};
  const readContactValue = (key: keyof PlannerProjectContact) =>
    typeof candidate[key] === "string" ? candidate[key] : "";

  return {
    firstName: readContactValue("firstName"),
    lastName: readContactValue("lastName"),
    email: readContactValue("email"),
    phone: readContactValue("phone"),
  };
}

function migrateFirstNationsStep(step: unknown, version: unknown) {
  const currentStep = typeof step === "number" ? step : 0;
  if (version === 5 || version === 6) {
    return Math.min(Math.max(currentStep, 0), 6);
  }

  if (currentStep <= 1) return currentStep;
  if (currentStep <= 3) return 1;
  if (currentStep === 4) return 2;
  if (currentStep <= 6) return 3;
  if (currentStep === 7) return 5;
  return 6;
}

function getDesignLetter(index: number) {
  return String.fromCharCode(65 + index);
}

function normalizeCommunityWorkforceCapacity(
  value: unknown,
): readonly CommunityWorkforceCapacityId[] {
  if (!Array.isArray(value)) return ["to-be-determined"];
  const selected = communityWorkforceCapacityOptions.flatMap((option) =>
    value.includes(option.id) ? [option.id] : [],
  );
  const specificSelections = selected.filter(
    (selection) => selection !== "to-be-determined",
  );
  return specificSelections.length > 0
    ? specificSelections
    : ["to-be-determined"];
}

export function toggleCommunityWorkforceCapacitySelection(
  current: readonly CommunityWorkforceCapacityId[],
  value: CommunityWorkforceCapacityId,
) {
  if (value === "to-be-determined") return ["to-be-determined"] as const;

  const next = current.includes(value)
    ? current.filter((selection) => selection !== value)
    : [
        ...current.filter(
          (selection) => selection !== "to-be-determined",
        ),
        value,
      ];

  return normalizeCommunityWorkforceCapacity(next);
}

export function getCommunityWorkforceCapacityLabels(
  selections: readonly CommunityWorkforceCapacityId[],
) {
  const selected = new Set(selections);
  return communityWorkforceCapacityOptions.flatMap((option) =>
    selected.has(option.id) ? [option.label] : [],
  );
}

export function hasCommunityWorkforceCapacityInterest(
  selections: readonly CommunityWorkforceCapacityId[],
) {
  return selections.some((selection) => selection !== "to-be-determined");
}

export function createPlannerDesignVariation(
  lineId: string,
  assignedQuantity: number,
  index = 0,
): PlannerDesignVariation {
  const letter = getDesignLetter(index);
  return {
    id: `${lineId}:design-${letter.toLowerCase()}`,
    label: `Design Group ${letter}`,
    assignedQuantity: Math.max(1, assignedQuantity),
    status: "draft",
    designSelections: {},
    lookBookReference: "",
    designNotes: "",
    revision: 1,
    designDevelopment: {
      status: "not-authorized",
      fee: { currency: "CAD", status: "not-configured" },
      factoryOutput: {
        walkthroughStatus: "not-started",
        clarificationItems: [],
      },
    },
  };
}

export function migratePlannerState(value: unknown): PlannerState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<LegacyPlannerState>;
  if (!isPlannerAudience(candidate.audience)) return undefined;
  const defaults = createDefaultPlannerState(candidate.audience);

  const portfolio = Array.isArray(candidate.portfolio)
    ? candidate.portfolio.flatMap((line) => {
        if (
          !line ||
          typeof line.id !== "string" ||
          typeof line.modelId !== "string" ||
          typeof line.quantity !== "number" ||
          !["phase-1", "phase-2", "future"].includes(line.phase)
        ) {
          return [];
        }

        const legacyDesignVariations =
          Array.isArray(line.designVariations) && line.designVariations.length > 0
            ? line.designVariations
            : [
                {
                  ...createPlannerDesignVariation(line.id, line.quantity),
                  designSelections: line.designSelections ?? {},
                  lookBookReference: line.lookBookReference ?? "",
                },
              ];
        const designVariations = legacyDesignVariations.map(
          (variation: LegacyPlannerDesignVariation) => {
          const { culturalDesignDirection, ...currentVariation } = variation;
          const variationDefaults = createPlannerDesignVariation(
            line.id,
            Math.max(1, variation.assignedQuantity || 1),
          );
          const culturalExteriorInterest =
            typeof variation.culturalExteriorInterest === "boolean"
              ? variation.culturalExteriorInterest
              : culturalDesignDirection?.choice === "explore"
                ? true
                : undefined;

          return {
            ...variationDefaults,
            ...currentVariation,
            designNotes:
              typeof variation.designNotes === "string"
                ? variation.designNotes
                : "",
            revision:
              typeof variation.revision === "number" && variation.revision >= 1
                ? Math.floor(variation.revision)
                : 1,
            designDevelopment: {
              ...variationDefaults.designDevelopment,
              ...(variation.designDevelopment ?? {}),
              fee: {
                ...variationDefaults.designDevelopment.fee,
                ...(variation.designDevelopment?.fee ?? {}),
              },
              factoryOutput: {
                ...variationDefaults.designDevelopment.factoryOutput,
                ...(variation.designDevelopment?.factoryOutput ?? {}),
                clarificationItems: Array.isArray(
                  variation.designDevelopment?.factoryOutput
                    ?.clarificationItems,
                )
                  ? variation.designDevelopment.factoryOutput
                      .clarificationItems
                  : [],
              },
            },
            ...(culturalExteriorInterest !== undefined
              ? { culturalExteriorInterest }
              : {}),
          };
          },
        );

        return [
          {
            id: line.id,
            modelId: line.modelId,
            quantity: Math.max(1, line.quantity),
            phase: line.phase,
            designVariations,
          },
        ];
      })
    : [];
  const fundingCorridorDecisions: Record<string, FundingCorridorDecision> =
    candidate.fundingCorridorDecisions &&
    typeof candidate.fundingCorridorDecisions === "object"
      ? Object.fromEntries(
          Object.entries(candidate.fundingCorridorDecisions).flatMap(
            ([corridorId, decision]) => {
              if (decision === "include" || decision === "not-relevant") {
                return [[corridorId, decision] as const];
              }
              if (decision === "explore" || decision === "discuss") {
                return [[corridorId, "include"] as const];
              }
              return [];
            },
          ),
        )
      : {};
  const communityWorkforceCapacity = normalizeCommunityWorkforceCapacity(
    candidate.refinement?.communityWorkforceCapacity,
  );

  return {
    ...defaults,
    ...candidate,
    version: 6,
    projectId:
      typeof candidate.projectId === "string" ? candidate.projectId : "",
    audience: candidate.audience,
    step:
      candidate.audience === "first-nations"
        ? migrateFirstNationsStep(candidate.step, candidate.version)
        : typeof candidate.step === "number"
          ? candidate.step
          : 0,
    audienceContext:
      candidate.audienceContext && typeof candidate.audienceContext === "object"
        ? Object.fromEntries(
            Object.entries(candidate.audienceContext).flatMap(([key, value]) =>
              typeof value === "string" ? [[key, value]] : [],
            ),
          )
        : {},
    portfolio,
    refinement: {
      ...defaults.refinement,
      ...(candidate.refinement ?? {}),
      communityWorkforceCapacity,
    },
    fundingCorridorDecisions,
    readiness: normalizeFirstNationsReadiness(
      candidate.readiness,
      communityWorkforceCapacity,
    ),
    contact: normalizePlannerContact(candidate.contact),
    authorizedRepresentative: {
      name:
        typeof candidate.authorizedRepresentative?.name === "string"
          ? candidate.authorizedRepresentative.name
          : "",
      title:
        typeof candidate.authorizedRepresentative?.title === "string"
          ? candidate.authorizedRepresentative.title
          : "",
      councilAuthorizationStatus: [
        "required",
        "not-required",
        "to-confirm",
      ].includes(
        candidate.authorizedRepresentative?.councilAuthorizationStatus ?? "",
      )
        ? candidate.authorizedRepresentative!.councilAuthorizationStatus
        : "to-confirm",
    },
    reviewStatus:
      candidate.reviewStatus === "submitted" ? "submitted" : "draft",
    lifecycleStatus: plannerLifecycleStatuses.includes(
      candidate.lifecycleStatus as PlannerLifecycleStatus,
    )
      ? (candidate.lifecycleStatus as PlannerLifecycleStatus)
      : candidate.reviewStatus === "submitted"
        ? "submitted-for-review"
        : "draft",
    louStatus:
      ["project-review-requested", "prepared", "sent", "accepted"].includes(
        candidate.louStatus ?? "",
      )
        ? (candidate.louStatus as PlannerState["louStatus"])
        : "not-started",
    submissionId:
      typeof candidate.submissionId === "string"
        ? candidate.submissionId
        : "",
    ...(typeof candidate.submittedAt === "string"
      ? { submittedAt: candidate.submittedAt }
      : {}),
  };
}

export function getDesignDevelopmentPackages(state: PlannerState) {
  return state.portfolio.flatMap((line) =>
    line.designVariations.map((variation) => ({
      lineId: line.id,
      modelId: line.modelId,
      phase: line.phase,
      variation,
    })),
  );
}

export function canMarkDesignGroupReadyForFactory(
  state: PlannerState,
  variation: PlannerDesignVariation,
) {
  return (
    state.louStatus === "accepted" &&
    variation.designDevelopment.status === "paid-cleared"
  );
}

export function canSendDesignGroupToFactory(
  variation: PlannerDesignVariation,
) {
  return variation.designDevelopment.status === "ready-for-factory-handoff";
}

export function resizePlannerDesignVariations(
  line: PlannerPortfolioLine,
  requestedQuantity: number,
): PlannerPortfolioLine {
  const quantity = Math.max(line.designVariations.length || 1, requestedQuantity);
  if (line.designVariations.length === 0) {
    return {
      ...line,
      quantity,
      designVariations: [createPlannerDesignVariation(line.id, quantity)],
    };
  }

  const variations = line.designVariations.map((variation) => ({
    ...variation,
    assignedQuantity: Math.max(1, variation.assignedQuantity),
  }));
  const assignedTotal = variations.reduce(
    (total, variation) => total + variation.assignedQuantity,
    0,
  );
  let delta = quantity - assignedTotal;
  if (delta > 0) {
    variations[0].assignedQuantity += delta;
  } else {
    for (let index = 0; index < variations.length && delta < 0; index += 1) {
      const removable = variations[index].assignedQuantity - 1;
      const reduction = Math.min(removable, Math.abs(delta));
      variations[index].assignedQuantity -= reduction;
      delta += reduction;
    }
  }

  return {
    ...line,
    quantity,
    designVariations: variations,
  };
}

export function setPlannerCulturalExteriorInterest(
  line: PlannerPortfolioLine,
  culturalExteriorInterest: boolean,
): PlannerPortfolioLine {
  return {
    ...line,
    designVariations: line.designVariations.map((variation, index) =>
      index === 0 ? { ...variation, culturalExteriorInterest } : variation,
    ),
  };
}

export function addPlannerDesignVariation(
  line: PlannerPortfolioLine,
): PlannerPortfolioLine {
  if (line.quantity <= line.designVariations.length) return line;
  const donorIndex = line.designVariations.findIndex(
    (variation) => variation.assignedQuantity > 1,
  );
  if (donorIndex < 0) return line;

  return {
    ...line,
    designVariations: [
      ...line.designVariations.map((variation, index) =>
        index === donorIndex
          ? { ...variation, assignedQuantity: variation.assignedQuantity - 1 }
          : variation,
      ),
      createPlannerDesignVariation(line.id, 1, line.designVariations.length),
    ],
  };
}

export function reassignPlannerDesignQuantity(
  line: PlannerPortfolioLine,
  variationId: string,
  requestedQuantity: number,
): PlannerPortfolioLine {
  const targetIndex = line.designVariations.findIndex(
    (variation) => variation.id === variationId,
  );
  if (targetIndex < 0 || line.designVariations.length < 2) return line;

  const maximum = line.quantity - (line.designVariations.length - 1);
  const targetQuantity = Math.min(maximum, Math.max(1, requestedQuantity));
  const currentQuantity = line.designVariations[targetIndex].assignedQuantity;
  let remainingDelta = targetQuantity - currentQuantity;
  const variations = line.designVariations.map((variation) => ({ ...variation }));

  if (remainingDelta > 0) {
    for (let index = 0; index < variations.length && remainingDelta > 0; index += 1) {
      if (index === targetIndex) continue;
      const available = variations[index].assignedQuantity - 1;
      const transfer = Math.min(available, remainingDelta);
      variations[index].assignedQuantity -= transfer;
      remainingDelta -= transfer;
    }
  } else if (remainingDelta < 0) {
    const recipientIndex = targetIndex === 0 ? 1 : 0;
    variations[recipientIndex].assignedQuantity += Math.abs(remainingDelta);
    remainingDelta = 0;
  }

  variations[targetIndex].assignedQuantity = targetQuantity - remainingDelta;
  return { ...line, designVariations: variations };
}

export function getPlannerDesignProgress(
  portfolio: readonly PlannerPortfolioLine[],
  catalog: readonly PlannerCatalogItem[],
) {
  const configurableModelIds = new Set(
    catalog
      .filter((model) => model.designChapters.length > 0)
      .map((model) => model.id),
  );
  const groups = portfolio.flatMap((line) =>
    configurableModelIds.has(line.modelId) ? line.designVariations : [],
  );
  const completedDesigns = groups.filter(
    (variation) => variation.status === "complete",
  ).length;

  return {
    completedDesigns,
    remainingDesignGroups: groups.length - completedDesigns,
    totalDesignGroups: groups.length,
  };
}

export function getPortfolioSummary(
  portfolio: readonly PlannerPortfolioLine[],
  catalog: readonly PlannerCatalogItem[],
) {
  const catalogById = new Map(catalog.map((item) => [item.id, item]));
  const lines = portfolio.flatMap((line) => {
    const model = catalogById.get(line.modelId);
    return model ? [{ line, model }] : [];
  });

  return {
    totalHomes: lines.reduce(
      (total, { line, model }) =>
        total + line.quantity * model.homesPerSelection,
      0,
    ),
    totalSelections: lines.reduce((total, { line }) => total + line.quantity, 0),
    modelCount: new Set(lines.map(({ model }) => model.id)).size,
    phaseCount: new Set(lines.map(({ line }) => line.phase)).size,
    lines,
  };
}

export function calculatePreliminaryEstimate(
  portfolio: readonly PlannerPortfolioLine[],
  catalog: readonly PlannerCatalogItem[],
): PreliminaryEstimate {
  const summary = getPortfolioSummary(portfolio, catalog);
  const missingBasisModelIds = summary.lines
    .filter(
      ({ model }) =>
        model.planningBasis.status === "under-review" ||
        model.planningBasis.low === null ||
        model.planningBasis.base === null ||
        model.planningBasis.high === null,
    )
    .map(({ model }) => model.id);

  const assumptions = Array.from(
    new Set(summary.lines.flatMap(({ model }) => model.planningBasis.assumptions)),
  );
  const exclusions = Array.from(
    new Set(summary.lines.flatMap(({ model }) => model.planningBasis.exclusions)),
  );

  if (summary.lines.length === 0 || missingBasisModelIds.length > 0) {
    return {
      low: null,
      base: null,
      high: null,
      confidence: "early",
      status: "under-review",
      assumptions,
      exclusions,
      missingBasisModelIds: Array.from(new Set(missingBasisModelIds)),
    };
  }

  return {
    low: summary.lines.reduce(
      (total, { line, model }) => total + model.planningBasis.low! * line.quantity,
      0,
    ),
    base: summary.lines.reduce(
      (total, { line, model }) => total + model.planningBasis.base! * line.quantity,
      0,
    ),
    high: summary.lines.reduce(
      (total, { line, model }) => total + model.planningBasis.high! * line.quantity,
      0,
    ),
    confidence: "early",
    status: "available",
    assumptions,
    exclusions,
    missingBasisModelIds: [],
  };
}

function isBritishColumbiaLocation(location: string) {
  const normalized = location.toLowerCase();
  return (
    normalized.includes("british columbia") ||
    /(^|[ ,])b\.?c\.?(?:[ ,]|$)/i.test(location)
  );
}

export function matchFundingCorridors(
  state: PlannerState,
  corridors: readonly FundingCorridor[],
  catalog: readonly PlannerCatalogItem[],
): readonly MatchedFundingCorridor[] {
  const { totalHomes } = getPortfolioSummary(state.portfolio, catalog);
  const landStatus = state.refinement.landStatus;
  const affordabilityKnown = state.refinement.affordability !== "unknown";
  const affordabilityRelevant =
    state.refinement.affordability === "deeply-affordable" ||
    state.refinement.affordability === "mixed-income" ||
    state.refinement.affordability === "community-rental";
  const isBc = isBritishColumbiaLocation(state.location);

  return corridors.map((corridor) => {
    const landKnown = landStatus !== "unknown";
    const landMatch =
      corridor.landStatus.includes("either") ||
      corridor.landStatus.includes(landStatus as "on-reserve" | "off-reserve");
    const regionKnown = state.location.trim().length > 0;
    const regionMatch = corridor.region === "canada" || isBc;
    const needsAffordability = corridor.priorities.includes("affordability");
    const needsRental = corridor.priorities.includes("rental");
    const hasScale = totalHomes >= 5;
    const needsScale = corridor.priorities.includes("scale");
    const rentalRelevant =
      state.refinement.affordability === "community-rental";

    let relevance: FundingRelevance;
    if ((landKnown && !landMatch) || (regionKnown && !regionMatch)) {
      relevance = "Potential corridor";
    } else if (
      (!landKnown && !corridor.landStatus.includes("either")) ||
      (!regionKnown && corridor.region === "bc") ||
      (needsAffordability &&
        (!affordabilityKnown || !affordabilityRelevant)) ||
      (needsRental && affordabilityKnown && !rentalRelevant) ||
      (needsScale && totalHomes === 0)
    ) {
      relevance = "Potential corridor";
    } else {
      const strengthSignals = [
        landKnown &&
          landMatch &&
          !corridor.landStatus.includes("either"),
        corridor.region === "bc" && isBc,
        needsAffordability && affordabilityRelevant,
        needsRental && rentalRelevant,
        needsScale && hasScale,
      ].filter(Boolean).length;

      relevance =
        strengthSignals >= 4
          ? "Strong corridor to explore"
          : "Relevant corridor";
    }

    return { ...corridor, relevance };
  });
}

export function getAudienceFundingCorridors(
  audience: PlannerAudience,
  corridors: readonly FundingCorridor[],
) {
  if (audience === "first-nations") return corridors;

  const generalProjectCorridorIds = new Set([
    "build-canada-homes",
    "cmhc-aclp",
    "bc-builds",
  ]);
  return corridors.filter((corridor) =>
    generalProjectCorridorIds.has(corridor.id),
  );
}

const fundingRelevanceRank: Record<FundingRelevance, number> = {
  "Strong corridor to explore": 0,
  "Relevant corridor": 1,
  "Potential corridor": 2,
};

const fundingDecisionRank: Record<FundingCorridorDecision, number> = {
  include: 0,
  "not-relevant": 1,
};

export function getOpportunityReportFundingCorridors(
  state: PlannerState,
  corridors: readonly FundingCorridor[],
  catalog: readonly PlannerCatalogItem[],
): readonly ReportFundingCorridor[] {
  const ranked = matchFundingCorridors(state, corridors, catalog)
    .map((corridor) => ({
      ...corridor,
      decision: state.fundingCorridorDecisions[corridor.id],
    }))
    .filter((corridor) => corridor.decision !== "not-relevant")
    .sort((a, b) => {
      const aDecision = a.decision
        ? fundingDecisionRank[a.decision]
        : Number.POSITIVE_INFINITY;
      const bDecision = b.decision
        ? fundingDecisionRank[b.decision]
        : Number.POSITIVE_INFINITY;

      return (
        aDecision - bDecision ||
        fundingRelevanceRank[a.relevance] -
        fundingRelevanceRank[b.relevance]
      );
    });
  const included = ranked.filter((corridor) => corridor.decision === "include");
  const contextual = ranked.filter((corridor) => !corridor.decision);

  return [
    ...included,
    ...contextual.slice(0, Math.max(0, 5 - included.length)),
  ];
}

export type ReadinessInformationStatus =
  | "Identified"
  | "Partially Known"
  | "To Confirm"
  | "Not Yet Determined";

export type PlannerReadinessItem = {
  id: string;
  label: string;
  detail: string;
  status: ReadinessInformationStatus;
  ready: boolean;
};

function informationStatus(
  status: ReadinessInformationStatus,
): Pick<PlannerReadinessItem, "status" | "ready"> {
  return {
    status,
    ready: status === "Identified" || status === "Partially Known",
  };
}

function formatProjectCount(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getFirstNationsReadinessProfile(
  state: PlannerState,
  catalog: readonly PlannerCatalogItem[],
): readonly PlannerReadinessItem[] {
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const unitMix = summary.lines
    .map(({ line, model }) => {
      const homes = line.quantity * model.homesPerSelection;
      return `${homes} ${model.name.replace(/^The\s+/i, "")} ${
        homes === 1 ? "home" : "homes"
      }`;
    })
    .join("; ");
  const readinessDetails: Record<
    ProjectReadinessKey,
    Record<string, { detail: string; status: ReadinessInformationStatus }>
  > = {
    landSiteControl: {
      confirmed: { detail: "Site confirmed", status: "Identified" },
      potential: {
        detail: "Potential site identified",
        status: "Partially Known",
      },
      "not-yet": { detail: "Site not yet identified", status: "To Confirm" },
      "not-sure": {
        detail: "Site status not yet determined",
        status: "Not Yet Determined",
      },
    },
    servicing: {
      confirmed: {
        detail: "Servicing and site access confirmed / available",
        status: "Identified",
      },
      partial: {
        detail: "Servicing and site access partially understood",
        status: "Partially Known",
      },
      investigate: {
        detail: "Servicing and site access require investigation",
        status: "To Confirm",
      },
      "not-sure": {
        detail: "Servicing and site access not yet determined",
        status: "Not Yet Determined",
      },
    },
    affordabilityPathway: {
      identified: {
        detail: "Affordability / homeownership approach identified",
        status: "Identified",
      },
      developing: {
        detail: "Affordability / homeownership approach in development",
        status: "Partially Known",
      },
      "not-yet": {
        detail: "Affordability / homeownership approach not yet identified",
        status: "To Confirm",
      },
      "not-sure": {
        detail: "Affordability / homeownership approach not yet determined",
        status: "Not Yet Determined",
      },
    },
    communityWorkforce: {
      yes: {
        detail: "Community interest in local training and participation identified",
        status: "Identified",
      },
      explore: {
        detail: "Community would like to explore local training and participation",
        status: "Partially Known",
      },
      no: {
        detail: "Local training and participation are not requested at this stage",
        status: "Identified",
      },
      undetermined: {
        detail: "Community workforce and capacity interest not yet determined",
        status: "Not Yet Determined",
      },
    },
    communityEngagement: {
      yes: {
        detail: "Community engagement has begun",
        status: "Identified",
      },
      some: {
        detail: "Some community engagement has begun",
        status: "Partially Known",
      },
      "not-yet": {
        detail: "Community engagement has not yet begun",
        status: "To Confirm",
      },
      undetermined: {
        detail: "Community engagement status not yet determined",
        status: "Not Yet Determined",
      },
    },
    fundingPathway: {
      identified: {
        detail: "Funding / financing pathway identified",
        status: "Identified",
      },
      options: {
        detail: "Some funding / financing programs or options identified",
        status: "Partially Known",
      },
      "not-yet": {
        detail: "Funding / financing pathway not yet identified",
        status: "To Confirm",
      },
      "not-sure": {
        detail: "Funding / financing pathway not yet determined",
        status: "Not Yet Determined",
      },
    },
  };
  const readinessItems = firstNationsProjectReadinessQuestions.map(
    ({ key, label }) => {
      const value = state.readiness[key];
      const detail = readinessDetails[key][value];
      return {
        id: key,
        label,
        detail: detail.detail,
        ...informationStatus(detail.status),
      };
    },
  );

  return [
    {
      id: "housingRequirement",
      label: "Housing Requirement",
      detail: summary.totalHomes
        ? `${formatProjectCount(summary.totalHomes, "home")} selected for this project`
        : "No homes selected yet",
      ...informationStatus(summary.totalHomes ? "Identified" : "To Confirm"),
    },
    {
      id: "unitMix",
      label: "Unit Mix",
      detail: summary.modelCount
        ? `${formatProjectCount(summary.modelCount, "model type")} · ${unitMix}`
        : "Model mix to develop",
      ...informationStatus(summary.modelCount ? "Identified" : "To Confirm"),
    },
    ...readinessItems,
  ];
}

export function getReadinessProfile(
  state: PlannerState,
  catalog: readonly PlannerCatalogItem[],
): readonly PlannerReadinessItem[] {
  if (state.audience === "first-nations") {
    return getFirstNationsReadinessProfile(state, catalog);
  }

  const summary = getPortfolioSummary(state.portfolio, catalog);
  const known = (value: string) => value !== "unknown" && value.trim() !== "";
  const audienceReadiness =
    state.audience === "developer"
      ? {
          id: "developmentReadiness",
          label: "Development readiness",
          detail: known(state.audienceContext.developmentReadiness ?? "")
            ? state.audienceContext.developmentReadiness.replaceAll("-", " ")
            : "Development readiness to confirm",
          ...informationStatus(
            known(state.audienceContext.developmentReadiness ?? "")
              ? "Identified"
              : "To Confirm",
          ),
        }
      : state.audience === "general-contractor"
        ? {
            id: "procurementRole",
            label: "Procurement role",
            detail: known(state.audienceContext.procurementRole ?? "")
              ? state.audienceContext.procurementRole.replaceAll("-", " ")
              : "Procurement role to confirm",
            ...informationStatus(
              known(state.audienceContext.procurementRole ?? "")
                ? "Identified"
                : "To Confirm",
            ),
          }
        : {
            id: "housingNeed",
            label: "Housing need",
            detail: known(state.audienceContext.housingNeed ?? "")
              ? state.audienceContext.housingNeed.replaceAll("-", " ")
              : "Housing need to confirm",
            ...informationStatus(
              known(state.audienceContext.housingNeed ?? "")
                ? "Identified"
                : "To Confirm",
            ),
          };

  return [
    {
      id: "housingRequirement",
      label: "Housing requirement",
      detail: summary.totalHomes
        ? `${formatProjectCount(summary.totalHomes, "home")} selected for this project`
        : "Housing requirement to confirm",
      ...informationStatus(summary.totalHomes ? "Identified" : "To Confirm"),
    },
    {
      id: "unitMix",
      label: "Unit mix",
      detail: summary.modelCount
        ? `${summary.modelCount} model ${summary.modelCount === 1 ? "type" : "types"} in the working portfolio`
        : "Model mix to develop",
      ...informationStatus(summary.modelCount ? "Identified" : "To Confirm"),
    },
    {
      id: "landSiteControl",
      label: "Land / site control",
      detail: known(state.refinement.landStatus)
        ? state.refinement.landStatus.replaceAll("-", " ")
        : "Land status to confirm",
      ...informationStatus(
        known(state.refinement.landStatus) ? "Identified" : "To Confirm",
      ),
    },
    {
      id: "servicing",
      label: "Servicing",
      detail: known(state.refinement.servicing)
        ? state.refinement.servicing.replaceAll("-", " ")
        : "Servicing and access to confirm",
      ...informationStatus(
        known(state.refinement.servicing) ? "Identified" : "To Confirm",
      ),
    },
    {
      id: "affordabilityPathway",
      label: "Affordability pathway",
      detail: known(state.refinement.affordability)
        ? state.refinement.affordability.replaceAll("-", " ")
        : "Affordability approach to confirm",
      ...informationStatus(
        known(state.refinement.affordability) ? "Identified" : "To Confirm",
      ),
    },
    {
      id: "deliveryCapacity",
      label: "Delivery capacity",
      detail: known(state.refinement.localLabour)
        ? state.refinement.localLabour.replaceAll("-", " ")
        : "Local delivery capacity to confirm",
      ...informationStatus(
        known(state.refinement.localLabour) ? "Identified" : "To Confirm",
      ),
    },
    audienceReadiness,
    {
      id: "fundingPathway",
      label: "Funding pathway",
      detail: known(state.refinement.affordability)
        ? "Contextual corridors identified for discussion"
        : "More information required before corridor review",
      ...informationStatus(
        known(state.refinement.affordability) ? "Identified" : "To Confirm",
      ),
    },
  ];
}

export function createOpportunityReportReference(now = Date.now()) {
  const date = new Date(now).toISOString().slice(0, 10).replaceAll("-", "");
  const sequence = Math.abs(now).toString(36).slice(-6).toUpperCase();
  return `HD-OPP-${date}-${sequence}`;
}

const projectReviewPhaseLabels: Record<PlannerPhase, string> = {
  "phase-1": "Active / First Build",
  "phase-2": "Near-Term / Next Build",
  future: "Future Pipeline",
};

function formatProjectReviewValue(value: string) {
  return value === "unknown" || !value.trim()
    ? "Unknown / to confirm"
    : value.replaceAll("-", " ");
}

export type CulturalDesignReportRecord = {
  id: string;
  designName: string;
};

export function getFirstNationsCulturalDesignDirectionLabel(
  state: PlannerState,
) {
  const coastalSelected =
    state.audience === "first-nations" &&
    state.portfolio.some((line) =>
      line.designVariations.some(
        (variation) => variation.culturalExteriorInterest === true,
      ),
    );

  return coastalSelected
    ? "Indigenous Inspiration selected"
    : "Contemporary / To be determined";
}

export function getCulturalDesignReportRecords(
  state: PlannerState,
  catalog: readonly PlannerCatalogItem[],
): readonly CulturalDesignReportRecord[] {
  if (state.audience !== "first-nations") return [];
  const summary = getPortfolioSummary(state.portfolio, catalog);

  return summary.lines.flatMap(({ line, model }) =>
    line.designVariations.flatMap((variation) => {
      if (!variation.culturalExteriorInterest) return [];
      return [
        {
          id: variation.id,
          designName:
            variation.projectDesignName ??
            `${model.name.replace(/^The\s+/i, "")} — ${variation.label}`,
        },
      ];
    }),
  );
}

export function formatProjectReviewContext(
  state: PlannerState,
  catalog: readonly PlannerCatalogItem[],
  corridors: readonly FundingCorridor[],
) {
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const readiness = getReadinessProfile(state, catalog);
  const matchedCorridors = matchFundingCorridors(
    state,
    getAudienceFundingCorridors(state.audience, corridors),
    catalog,
  );
  const selectedFunding = matchedCorridors.filter(
    (corridor) => state.fundingCorridorDecisions[corridor.id] === "include",
  );
  const excludedFunding = matchedCorridors.filter(
    (corridor) =>
      state.fundingCorridorDecisions[corridor.id] === "not-relevant",
  );
  const refinement =
    state.audience === "first-nations"
      ? ([
          [
            "Household priorities",
            state.refinement.householdPriorities.join(", "),
          ],
          ["Accessibility", state.refinement.accessibility],
          ["Land status", state.refinement.landStatus],
          ["Servicing", state.refinement.servicing],
          [
            "Likely housing use",
            getFirstNationsHousingUseLabel(state.refinement.affordability),
          ],
          [
            "Cultural design direction",
            getFirstNationsCulturalDesignDirectionLabel(state),
          ],
          ["Energy / resilience", state.refinement.energyResilience],
          ["Canadian value", state.refinement.canadianValue],
          ["Target timing", state.refinement.targetTiming],
        ] as const)
      : ([
          ["Land / site control", state.refinement.landStatus],
          ["Servicing", state.refinement.servicing],
          ["Housing / tenure approach", state.refinement.affordability],
          ["Accessibility", state.refinement.accessibility],
          ["Energy / resilience", state.refinement.energyResilience],
          ["Delivery capacity", state.refinement.localLabour],
          ["Target timing", state.refinement.targetTiming],
          ...Object.entries(state.audienceContext).map(
            ([key, value]) =>
              [
                key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (letter) => letter.toUpperCase()),
                value,
              ] as const,
          ),
        ] as const);
  const portfolioLines = summary.lines.flatMap(({ line, model }) => [
    `${model.name}: ${line.quantity} selection${line.quantity === 1 ? "" : "s"} / ${line.quantity * model.homesPerSelection} home${line.quantity * model.homesPerSelection === 1 ? "" : "s"} / ${projectReviewPhaseLabels[line.phase]}`,
    ...line.designVariations.map((variation) => {
      const selections = Object.entries(variation.designSelections)
        .map(([chapter, option]) => `${chapter}: ${option}`)
        .join(", ");
      return `  ${variation.projectDesignName ?? `${model.name.replace(/^The\s+/i, "")} — ${variation.label}`} / Assigned to ${variation.assignedQuantity} home${variation.assignedQuantity === 1 ? "" : "s"} / ${variation.status}${variation.lookBookReference ? ` / Look Book ${variation.lookBookReference}` : ""}${selections ? ` / Selections: ${selections}` : ""}`;
    }),
  ]);
  const culturalDesignLines = getCulturalDesignReportRecords(state, catalog).map(
    (record) =>
      `${record.designName}: Indigenous Inspiration selected. Exterior cultural expression to be developed with the Nation during project review.`,
  );
  const knownReadiness = readiness.filter((item) => item.ready);
  const unresolvedReadiness = readiness.filter((item) => !item.ready);
  const designGroupCount = state.portfolio.reduce(
    (total, line) => total + line.designVariations.length,
    0,
  );
  const fundingReadiness = readiness.find(
    (item) => item.id === "fundingPathway",
  );

  return [
    "HOUSE DELIVERY PLANNER PROJECT REVIEW",
    `Project ID: ${state.projectId || "Pending"}`,
    `Opportunity Report: ${state.opportunityReportReference || "Reference pending"}`,
    ...(state.audience === "first-nations"
      ? []
      : [`Audience: ${plannerAudienceLabels[state.audience]}`]),
    `Community / project: ${state.community || "To confirm"}`,
    `Location: ${state.location || "To confirm"}`,
    `Housing requirement: ${formatProjectCount(summary.totalHomes, "home")}`,
    `Working portfolio: ${formatProjectCount(summary.totalHomes, "home")} / ${formatProjectCount(summary.modelCount, "model type")} / ${formatProjectCount(summary.phaseCount, "delivery group")}`,
    `Design groups: ${formatProjectCount(designGroupCount, "design group")}`,
    `Site pattern: ${formatProjectReviewValue(state.sitePattern)}`,
    `Delivery horizon: ${formatProjectReviewValue(state.deliveryHorizon)}`,
    "",
    "PORTFOLIO, DELIVERY GROUPS & DESIGN RECORDS",
    ...(portfolioLines.length ? portfolioLines : ["No homes selected"]),
    ...(culturalDesignLines.length
      ? ["", "CULTURAL DESIGN DIRECTION", ...culturalDesignLines]
      : []),
    "",
    ...(state.audience === "first-nations"
      ? [
          "PROJECT READINESS",
          "KNOWN TODAY",
          ...(knownReadiness.length
            ? knownReadiness.map(
                (item) => `${item.label}: ${item.detail} [${item.status}]`,
              )
            : ["No readiness information identified yet"]),
          "ITEMS TO CONFIRM",
          ...(unresolvedReadiness.length
            ? unresolvedReadiness.map(
                (item) => `${item.label}: ${item.detail} [${item.status}]`,
              )
            : ["No primary readiness items remain unresolved"]),
        ]
      : [
          "REFINE YOUR PROJECT",
          ...refinement.map(
            ([label, value]) =>
              `${label}: ${formatProjectReviewValue(value)}`,
          ),
        ]),
    `Project notes: ${state.projectNotes || "None provided"}`,
    ...(state.audience === "first-nations" && fundingReadiness
      ? [
          "",
          "FUNDING / FINANCING PATHWAY",
          `${fundingReadiness.detail} [${fundingReadiness.status}]`,
        ]
      : []),
    "",
    "FUNDING REVIEW (NON-BINDING)",
    ...(selectedFunding.length
      ? selectedFunding.map(
          (corridor) =>
            `Include: ${corridor.title} / ${corridor.relevance} / ${corridor.organization}`,
        )
      : ["No corridors included in the funding review"]),
    ...(excludedFunding.length
      ? excludedFunding.map((corridor) => `Not relevant: ${corridor.title}`)
      : []),
    "",
    ...(state.audience === "first-nations"
      ? []
      : [
          "SCALE & READINESS",
          ...readiness.map(
            (item) => `${item.status}: ${item.label} — ${item.detail}`,
          ),
        ]),
  ].join("\n");
}

export function formatPlanningValue(value: number | null) {
  if (value === null) return "Planning Basis Under Review";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}
