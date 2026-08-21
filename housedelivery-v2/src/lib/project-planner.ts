export type PlannerAudience = "first-nations" | "developer";

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
  family: "custom-home" | "standardized-catalogue";
  name: string;
  code?: string;
  squareFeet: number;
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

export type PlannerPortfolioLine = {
  id: string;
  modelId: string;
  quantity: number;
  phase: PlannerPhase;
  designSelections: Readonly<Record<string, string>>;
  lookBookReference: string;
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

export type PlannerState = {
  version: 1;
  audience: PlannerAudience;
  step: number;
  community: string;
  location: string;
  approximateHomes: string;
  sitePattern: string;
  deliveryHorizon: string;
  portfolio: readonly PlannerPortfolioLine[];
  refinement: ProjectRefinement;
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
  | "Potential corridor — more information required"
  | "Monitor";

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

export const defaultPlannerState: PlannerState = {
  version: 1,
  audience: "first-nations",
  step: 0,
  community: "",
  location: "",
  approximateHomes: "",
  sitePattern: "unknown",
  deliveryHorizon: "unknown",
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
  projectNotes: "",
};

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
    const hasScale = totalHomes >= 5;
    const needsScale = corridor.priorities.includes("scale");

    let relevance: FundingRelevance;
    if ((landKnown && !landMatch) || (regionKnown && !regionMatch)) {
      relevance = "Monitor";
    } else if (
      (!landKnown && !corridor.landStatus.includes("either")) ||
      (!regionKnown && corridor.region === "bc") ||
      (needsAffordability && !affordabilityKnown) ||
      (needsScale && totalHomes === 0)
    ) {
      relevance = "Potential corridor — more information required";
    } else if (
      landMatch &&
      regionMatch &&
      (!needsAffordability || affordabilityRelevant) &&
      (!needsScale || hasScale)
    ) {
      relevance = "Strong corridor to explore";
    } else {
      relevance = "Relevant corridor";
    }

    return { ...corridor, relevance };
  });
}

export function getReadinessProfile(
  state: PlannerState,
  catalog: readonly PlannerCatalogItem[],
) {
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const known = (value: string) => value !== "unknown" && value.trim() !== "";

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
    {
      label: "Community engagement",
      detail:
        state.refinement.householdPriorities.length > 0 &&
        !state.refinement.householdPriorities.includes("unknown")
          ? "Priority households identified"
          : "Community priorities to confirm",
      ready:
        state.refinement.householdPriorities.length > 0 &&
        !state.refinement.householdPriorities.includes("unknown"),
    },
    {
      label: "Funding pathway",
      detail: known(state.refinement.affordability)
        ? "Contextual corridors identified for discussion"
        : "More information required before corridor review",
      ready: known(state.refinement.affordability),
    },
  ] as const;
}

export function formatPlanningValue(value: number | null) {
  if (value === null) return "Planning Basis Under Review";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}
