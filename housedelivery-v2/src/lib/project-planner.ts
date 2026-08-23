import {
  getCulturalDesignAreaLabel,
  type CulturalDesignDirection,
} from "@/data/first-nations-cultural-design";

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

export type PlannerDesignVariation = {
  id: string;
  label: string;
  projectDesignName?: string;
  assignedQuantity: number;
  status: "draft" | "complete";
  designSelections: Readonly<Record<string, string>>;
  lookBookReference: string;
  savedAt?: string;
  culturalDesignDirection?: CulturalDesignDirection;
};

export type PlannerPortfolioLine = {
  id: string;
  modelId: string;
  quantity: number;
  phase: PlannerPhase;
  designVariations: readonly PlannerDesignVariation[];
};

export type ProjectRefinement = {
  householdPriorities: readonly string[];
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

export type FundingCorridorDecision = "include" | "not-relevant";

export type PlannerState = {
  version: 4;
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

export function createDefaultPlannerState(
  audience: PlannerAudience = "first-nations",
): PlannerState {
  return {
    version: 4,
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
    opportunityReportReference: "",
    projectNotes: "",
  };
}

export const defaultPlannerState: PlannerState = createDefaultPlannerState();

type LegacyPlannerPortfolioLine = Omit<PlannerPortfolioLine, "designVariations"> & {
  designSelections?: Readonly<Record<string, string>>;
  lookBookReference?: string;
  designVariations?: readonly PlannerDesignVariation[];
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

function getDesignLetter(index: number) {
  return String.fromCharCode(65 + index);
}

export function createPlannerDesignVariation(
  lineId: string,
  assignedQuantity: number,
  index = 0,
): PlannerDesignVariation {
  const letter = getDesignLetter(index);
  return {
    id: `${lineId}:design-${letter.toLowerCase()}`,
    label: `Design ${letter}`,
    assignedQuantity: Math.max(1, assignedQuantity),
    status: "draft",
    designSelections: {},
    lookBookReference: "",
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

        const designVariations =
          Array.isArray(line.designVariations) && line.designVariations.length > 0
            ? line.designVariations
            : [
                {
                  ...createPlannerDesignVariation(line.id, line.quantity),
                  designSelections: line.designSelections ?? {},
                  lookBookReference: line.lookBookReference ?? "",
                },
              ];

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

  return {
    ...defaults,
    ...candidate,
    version: 4,
    audience: candidate.audience,
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
    },
    fundingCorridorDecisions,
  };
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

export function getReadinessProfile(
  state: PlannerState,
  catalog: readonly PlannerCatalogItem[],
) {
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const known = (value: string) => value !== "unknown" && value.trim() !== "";

  const audienceReadiness =
    state.audience === "first-nations"
      ? {
          label: "Community engagement",
          detail:
            state.refinement.householdPriorities.length > 0 &&
            !state.refinement.householdPriorities.includes("unknown")
              ? "Priority households identified"
              : "Community priorities to confirm",
          ready:
            state.refinement.householdPriorities.length > 0 &&
            !state.refinement.householdPriorities.includes("unknown"),
        }
      : state.audience === "developer"
        ? {
            label: "Development readiness",
            detail: known(state.audienceContext.developmentReadiness ?? "")
              ? state.audienceContext.developmentReadiness.replaceAll("-", " ")
              : "Development readiness to confirm",
            ready: known(state.audienceContext.developmentReadiness ?? ""),
          }
        : state.audience === "general-contractor"
          ? {
              label: "Procurement role",
              detail: known(state.audienceContext.procurementRole ?? "")
                ? state.audienceContext.procurementRole.replaceAll("-", " ")
                : "Procurement role to confirm",
              ready: known(state.audienceContext.procurementRole ?? ""),
            }
          : {
              label: "Housing need",
              detail: known(state.audienceContext.housingNeed ?? "")
                ? state.audienceContext.housingNeed.replaceAll("-", " ")
                : "Housing need to confirm",
              ready: known(state.audienceContext.housingNeed ?? ""),
            };

  return [
    {
      label: "Housing requirement",
      detail: state.approximateHomes
        ? `Approximately ${state.approximateHomes} homes identified`
        : "Housing requirement to confirm",
      ready: Boolean(state.approximateHomes),
    },
    {
      label: "Unit mix",
      detail: summary.modelCount
        ? `${summary.modelCount} model ${summary.modelCount === 1 ? "type" : "types"} in the working portfolio`
        : "Model mix to develop",
      ready: summary.modelCount > 0,
    },
    {
      label: "Land / site control",
      detail: known(state.refinement.landStatus)
        ? state.refinement.landStatus.replaceAll("-", " ")
        : "Land status to confirm",
      ready: known(state.refinement.landStatus),
    },
    {
      label: "Servicing",
      detail: known(state.refinement.servicing)
        ? state.refinement.servicing.replaceAll("-", " ")
        : "Servicing and access to confirm",
      ready: known(state.refinement.servicing),
    },
    {
      label: "Affordability pathway",
      detail: known(state.refinement.affordability)
        ? state.refinement.affordability.replaceAll("-", " ")
        : "Affordability approach to confirm",
      ready: known(state.refinement.affordability),
    },
    {
      label: "Delivery capacity",
      detail: known(state.refinement.localLabour)
        ? state.refinement.localLabour.replaceAll("-", " ")
        : "Local delivery capacity to confirm",
      ready: known(state.refinement.localLabour),
    },
    audienceReadiness,
    {
      label: "Funding pathway",
      detail: known(state.refinement.affordability)
        ? "Contextual corridors identified for discussion"
        : "More information required before corridor review",
      ready: known(state.refinement.affordability),
    },
  ] as const;
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
  choice: CulturalDesignDirection["choice"];
  areas: readonly string[];
  artistCollaborationRequested: boolean;
};

export function getCulturalDesignReportRecords(
  state: PlannerState,
  catalog: readonly PlannerCatalogItem[],
): readonly CulturalDesignReportRecord[] {
  if (state.audience !== "first-nations") return [];
  const summary = getPortfolioSummary(state.portfolio, catalog);

  return summary.lines.flatMap(({ line, model }) =>
    line.designVariations.flatMap((variation) => {
      const direction = variation.culturalDesignDirection;
      if (!direction) return [];
      return [
        {
          id: variation.id,
          designName:
            variation.projectDesignName ??
            `${model.name.replace(/^The\s+/i, "")} — ${variation.label}`,
          choice: direction.choice,
          areas: direction.areas
            .map(getCulturalDesignAreaLabel)
            .filter((label) => label !== undefined),
          artistCollaborationRequested: direction.areas.includes(
            "local-artist-artisan-collaboration",
          ),
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
          ["Affordability", state.refinement.affordability],
          ["Cultural priorities", state.refinement.culturalPriorities],
          ["Energy / resilience", state.refinement.energyResilience],
          ["Local labour", state.refinement.localLabour],
          ["Training objectives", state.refinement.trainingObjectives],
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
      record.choice === "contemporary"
        ? `${record.designName}: Contemporary design direction selected; no additional cultural design exploration requested at this stage.`
        : `${record.designName}: Nation-led cultural design exploration requested.${record.areas.length ? ` Areas to explore: ${record.areas.join(", ")}.` : " Areas to be developed during project review."}${record.artistCollaborationRequested ? " Local artist / community collaboration to be developed during project review." : ""}`,
  );

  return [
    "HOUSE DELIVERY PLANNER PROJECT REVIEW",
    `Opportunity Report: ${state.opportunityReportReference || "Reference pending"}`,
    ...(state.audience === "first-nations"
      ? []
      : [`Audience: ${plannerAudienceLabels[state.audience]}`]),
    `Community / project: ${state.community || "To confirm"}`,
    `Location: ${state.location || "To confirm"}`,
    `Housing requirement: ${state.approximateHomes || "To confirm"}`,
    `Working portfolio: ${summary.totalHomes} homes / ${summary.modelCount} home types / ${summary.phaseCount} delivery groups`,
    `Site pattern: ${formatProjectReviewValue(state.sitePattern)}`,
    `Delivery horizon: ${formatProjectReviewValue(state.deliveryHorizon)}`,
    "",
    "PORTFOLIO, DELIVERY GROUPS & DESIGN RECORDS",
    ...(portfolioLines.length ? portfolioLines : ["No homes selected"]),
    ...(culturalDesignLines.length
      ? ["", "CULTURAL DESIGN DIRECTION", ...culturalDesignLines]
      : []),
    "",
    "REFINE YOUR PROJECT",
    ...refinement.map(
      ([label, value]) => `${label}: ${formatProjectReviewValue(value)}`,
    ),
    `Project notes: ${state.projectNotes || "None provided"}`,
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
    "SCALE & READINESS",
    ...readiness.map(
      (item) => `${item.ready ? "Ready" : "To confirm"}: ${item.label} — ${item.detail}`,
    ),
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
