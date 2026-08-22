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
  assignedQuantity: number;
  status: "draft" | "complete";
  designSelections: Readonly<Record<string, string>>;
  lookBookReference: string;
  savedAt?: string;
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

export type PlannerState = {
  version: 2;
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
  version: 2,
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

type LegacyPlannerPortfolioLine = Omit<PlannerPortfolioLine, "designVariations"> & {
  designSelections?: Readonly<Record<string, string>>;
  lookBookReference?: string;
  designVariations?: readonly PlannerDesignVariation[];
};

type LegacyPlannerState = Omit<PlannerState, "version" | "portfolio"> & {
  version?: number;
  portfolio?: readonly LegacyPlannerPortfolioLine[];
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
  if (candidate.audience !== "first-nations") return undefined;

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

  return {
    ...defaultPlannerState,
    ...candidate,
    version: 2,
    portfolio,
    refinement: {
      ...defaultPlannerState.refinement,
      ...(candidate.refinement ?? {}),
    },
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
