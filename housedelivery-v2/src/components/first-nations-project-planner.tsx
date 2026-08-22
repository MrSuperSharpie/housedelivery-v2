"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileDown,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import {
  addPlannerDesignVariation,
  calculatePreliminaryEstimate,
  createPlannerDesignVariation,
  defaultPlannerState,
  formatPlanningValue,
  getPlannerDesignProgress,
  getPortfolioSummary,
  getReadinessProfile,
  matchFundingCorridors,
  migratePlannerState,
  reassignPlannerDesignQuantity,
  resizePlannerDesignVariations,
  type FundingCorridor,
  type PlannerCatalogItem,
  type PlannerDesignVariation,
  type PlannerPhase,
  type PlannerPortfolioLine,
  type PlannerState,
} from "@/lib/project-planner";
import {
  buildPlannerDesignHref,
  PLANNER_RETURN_KEY,
  PLANNER_STORAGE_KEY,
  type PlannerDesignReturn,
  type PlannerDesignSession,
} from "@/lib/planner-design-session";

const plannerPhaseLabels = {
  "phase-1": "Active / First Build",
  "phase-2": "Near-Term / Next Build",
  future: "Future Pipeline",
} as const;

const steps = [
  { label: "Community Need", eyebrow: "Start" },
  { label: "My Project", eyebrow: "Build" },
  { label: "Quick Estimate", eyebrow: "Understand" },
  { label: "Refine Project", eyebrow: "Refine" },
  { label: "Design Direction", eyebrow: "Shape" },
  { label: "Funding Pathways", eyebrow: "Explore" },
  { label: "Scale & Readiness", eyebrow: "Prepare" },
  { label: "Opportunity Report", eyebrow: "Review" },
] as const;

const householdOptions = [
  ["families", "Families"],
  ["elders", "Elders"],
  ["youth", "Youth"],
  ["staff", "Staff"],
  ["intergenerational", "Intergenerational households"],
  ["unknown", "Unknown / to confirm"],
] as const;

const selectClassName =
  "min-h-12 w-full border border-black/18 bg-transparent px-4 text-sm text-black outline-none transition-colors focus:border-black";

function createLineId() {
  return typeof window !== "undefined" && window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `line-${Date.now()}`;
}

function getPlannerHomeName(name: string) {
  return name.replace(/^The\s+/i, "");
}

function getPlannerDesignSession(
  line: PlannerPortfolioLine,
  model: PlannerCatalogItem,
  variation: PlannerDesignVariation,
): PlannerDesignSession {
  return {
    lineId: line.id,
    variationId: variation.id,
    modelId: model.id,
    homeName: getPlannerHomeName(model.name),
    designLabel: variation.label,
    assignedQuantity: variation.assignedQuantity,
    returnHref: "/first-nations-project-planner#planner-design-workspace",
  };
}

function labelValue(value: string) {
  return value === "unknown"
    ? "Unknown / to confirm"
    : value
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-3 block text-[9px] font-semibold uppercase tracking-[0.18em] text-black/48">
      {children}
    </span>
  );
}

function PlannerLink({
  href,
  children,
  newTab = true,
}: {
  href: string;
  children: React.ReactNode;
  newTab?: boolean;
}) {
  return (
    <Link
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer" : undefined}
      className="inline-flex min-h-9 items-center gap-2 border-b border-black/28 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/58 transition-colors hover:border-black hover:text-black"
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="size-3.5" />
    </Link>
  );
}

function PlannerHomeActions({
  item,
  line,
}: {
  item: PlannerCatalogItem;
  line?: PlannerPortfolioLine;
}) {
  const variation = line?.designVariations[0];
  const session = line && variation
    ? getPlannerDesignSession(line, item, variation)
    : undefined;
  const buildHref = item.buildMyHref && session
    ? buildPlannerDesignHref(item.buildMyHref, session)
    : undefined;
  const lookBookHref = item.lookBookHref && session
    ? buildPlannerDesignHref(item.lookBookHref, session, "look-book")
    : undefined;

  return (
    <div className="mt-5 grid gap-3 border-t border-black/12 pt-4">
      <div>
        <PlannerLink href={item.viewHref}>View Home</PlannerLink>
        <p className="mt-1 text-[10px] leading-4 text-black/42">Architecture, plans and walkthrough</p>
      </div>
      <div>
        {!item.buildMyHref ? (
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/38">Design My Home — Coming Soon</span>
        ) : buildHref ? (
          <PlannerLink href={buildHref} newTab={false}>Design My Home</PlannerLink>
        ) : (
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/38">Design My Home — Add to Project First</span>
        )}
        <p className="mt-1 text-[10px] leading-4 text-black/42">Choose the design direction</p>
      </div>
      <div>
        {!item.lookBookHref ? (
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/38">My Look Book — Coming Soon</span>
        ) : lookBookHref && variation?.status === "complete" ? (
          <PlannerLink href={lookBookHref} newTab={false}>My Look Book</PlannerLink>
        ) : (
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/38">My Look Book — Save a Design First</span>
        )}
        <p className="mt-1 text-[10px] leading-4 text-black/42">Reopen saved design selections</p>
      </div>
    </div>
  );
}

function StepHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: string;
}) {
  return (
    <header className="grid gap-8 border-t border-black/16 pt-6 lg:grid-cols-[0.34fr_1fr] lg:gap-16">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/42">
        {eyebrow}
      </p>
      <div>
        <h2 className="max-w-5xl text-[clamp(2.8rem,6vw,6.4rem)] font-medium leading-[0.86] tracking-[-0.07em] text-black/90">
          {title}
        </h2>
        <p className="mt-7 max-w-2xl text-base leading-7 text-black/58 sm:text-lg sm:leading-8">
          {intro}
        </p>
      </div>
    </header>
  );
}

function StartStep({
  state,
  update,
}: {
  state: PlannerState;
  update: (patch: Partial<PlannerState>) => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="01 / Community need"
        title="Begin with the need."
        intro="Create a first working picture of the community, the housing requirement and the delivery horizon. This can be refined as more information becomes available."
      />
      <div className="mt-16 grid border-l border-t border-black/16 sm:grid-cols-2">
        <label className="border-b border-r border-black/16 p-5 sm:p-7">
          <FieldLabel>Community / Nation</FieldLabel>
          <input
            value={state.community}
            onChange={(event) => update({ community: event.target.value })}
            placeholder="Community or Nation name"
            className="w-full bg-transparent text-xl tracking-[-0.025em] text-black outline-none placeholder:text-black/25"
          />
        </label>
        <label className="border-b border-r border-black/16 p-5 sm:p-7">
          <FieldLabel>Project location</FieldLabel>
          <input
            value={state.location}
            onChange={(event) => update({ location: event.target.value })}
            placeholder="Community, region, province"
            className="w-full bg-transparent text-xl tracking-[-0.025em] text-black outline-none placeholder:text-black/25"
          />
        </label>
        <label className="border-b border-r border-black/16 p-5 sm:p-7">
          <FieldLabel>Approximate homes required</FieldLabel>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={state.approximateHomes}
            onChange={(event) => update({ approximateHomes: event.target.value })}
            placeholder="e.g. 24"
            className="w-full bg-transparent text-xl tracking-[-0.025em] text-black outline-none placeholder:text-black/25"
          />
        </label>
        <label className="border-b border-r border-black/16 p-5 sm:p-7">
          <FieldLabel>Site pattern</FieldLabel>
          <select
            value={state.sitePattern}
            onChange={(event) => update({ sitePattern: event.target.value })}
            className={selectClassName}
          >
            <option value="unknown">Unknown / to confirm</option>
            <option value="single-site">Single site</option>
            <option value="multiple-sites">Multiple sites</option>
          </select>
        </label>
        <label className="border-b border-r border-black/16 p-5 sm:col-span-2 sm:p-7">
          <FieldLabel>Delivery horizon</FieldLabel>
          <select
            value={state.deliveryHorizon}
            onChange={(event) => update({ deliveryHorizon: event.target.value })}
            className={selectClassName}
          >
            <option value="unknown">Unknown / to confirm</option>
            <option value="immediate">Immediate project</option>
            <option value="phased">Phased delivery</option>
            <option value="future-pipeline">Future pipeline</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function PortfolioStep({
  state,
  setState,
  catalog: plannerCatalog,
}: {
  state: PlannerState;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
  catalog: readonly PlannerCatalogItem[];
}) {
  const [family, setFamily] = useState<PlannerCatalogItem["family"]>(
    "standardized-catalogue",
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [phases, setPhases] = useState<Record<string, PlannerPhase>>({});
  const [addFeedback, setAddFeedback] = useState<Record<string, string>>({});
  const catalog = plannerCatalog.filter((item) => item.family === family);
  const summary = getPortfolioSummary(state.portfolio, plannerCatalog);

  function addItem(item: PlannerCatalogItem) {
    const quantity = Math.max(1, quantities[item.id] ?? 1);
    const phase = phases[item.id] ?? "phase-1";
    const existing = state.portfolio.find(
      (line) => line.modelId === item.id && line.phase === phase,
    );
    const lineId = existing?.id ?? createLineId();
    const portfolio = existing
      ? state.portfolio.map((line) =>
          line.id === existing.id
            ? resizePlannerDesignVariations(line, line.quantity + quantity)
            : line,
        )
      : [
          ...state.portfolio,
          {
            id: lineId,
            modelId: item.id,
            quantity,
            phase,
            designVariations: [createPlannerDesignVariation(lineId, quantity)],
          },
        ];
    const nextSummary = getPortfolioSummary(portfolio, plannerCatalog);

    setState((current) => ({ ...current, portfolio }));
    setAddFeedback((current) => ({
      ...current,
      [item.id]: `${quantity} ${getPlannerHomeName(item.name)} added to your project · ${nextSummary.totalHomes} homes total`,
    }));
  }

  function updateLine(id: string, patch: Partial<PlannerPortfolioLine>) {
    setState((current) => ({
      ...current,
      portfolio: current.portfolio.map((line) =>
        line.id === id ? { ...line, ...patch } : line,
      ),
    }));
  }

  function removeLine(id: string) {
    setState((current) => ({
      ...current,
      portfolio: current.portfolio.filter((line) => line.id !== id),
    }));
  }

  return (
    <div>
      <StepHeader
        eyebrow="02 / My Project"
        title="Build the project."
        intro="Combine repeatable home models across an Active / First Build, a Near-Term / Next Build and the Future Pipeline. These phases describe planned delivery sequence—not rigid construction dates."
      />

      <div className="mt-14 grid gap-5 border-y border-black/16 py-7 sm:grid-cols-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-black/42">Working homes</p>
          <p className="mt-2 text-3xl font-medium tracking-[-0.05em]">{summary.totalHomes}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-black/42">Model mix</p>
          <p className="mt-2 text-3xl font-medium tracking-[-0.05em]">{summary.modelCount}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-black/42">Delivery groups</p>
          <p className="mt-2 text-3xl font-medium tracking-[-0.05em]">{summary.phaseCount}</p>
        </div>
      </div>

      {summary.lines.length ? (
        <div className="mt-12">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
            View / Edit My Project
          </h3>
          <div className="mt-5 border-t border-black/16">
            {summary.lines.map(({ line, model }) => (
              <article
                key={line.id}
                className="grid gap-5 border-b border-black/16 py-5 md:grid-cols-[1fr_9rem_11rem_auto] md:items-center"
              >
                <div>
                  <p className="text-lg font-medium tracking-[-0.03em]">{model.name}</p>
                  <p className="mt-1 text-xs text-black/45">
                    {model.homesPerSelection} {model.homesPerSelection === 1 ? "home" : "homes"} per selection
                  </p>
                </div>
                <label>
                  <span className="sr-only">Quantity for {model.name}</span>
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(line.id, {
                        ...resizePlannerDesignVariations(
                          line,
                          Math.max(1, Number(event.target.value) || 1),
                        ),
                      })
                    }
                    className={selectClassName}
                  />
                </label>
                <label>
                  <span className="sr-only">Phase for {model.name}</span>
                  <select
                    value={line.phase}
                    onChange={(event) =>
                      updateLine(line.id, { phase: event.target.value as PlannerPhase })
                    }
                    className={selectClassName}
                  >
                    {Object.entries(plannerPhaseLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border border-black/18 px-4 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/52 hover:border-black hover:text-black"
                >
                  <Minus aria-hidden="true" className="size-3.5" /> Remove
                </button>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-16 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setFamily("standardized-catalogue")}
          className={cn(
            "min-h-11 border px-5 text-[9px] font-semibold uppercase tracking-[0.17em]",
            family === "standardized-catalogue"
              ? "border-black bg-black text-white"
              : "border-black/20 text-black/55",
          )}
        >
          CMHC Housing Design Catalogue
        </button>
        <button
          type="button"
          onClick={() => setFamily("custom-home")}
          className={cn(
            "min-h-11 border px-5 text-[9px] font-semibold uppercase tracking-[0.17em]",
            family === "custom-home"
              ? "border-black bg-black text-white"
              : "border-black/20 text-black/55",
          )}
        >
          Custom Homes
        </button>
        <button
          type="button"
          onClick={() => setFamily("laneway-carriage-home")}
          className={cn(
            "min-h-11 border px-5 text-[9px] font-semibold uppercase tracking-[0.17em]",
            family === "laneway-carriage-home"
              ? "border-black bg-black text-white"
              : "border-black/20 text-black/55",
          )}
        >
          Laneway &amp; Carriage Homes
        </button>
      </div>

      {family === "standardized-catalogue" ? (
        <p className="mt-5 max-w-3xl text-xs leading-6 text-black/48">
          Standardized Catalogue Designs require project-specific professional review,
          adaptation and jurisdictional approval before construction.
        </p>
      ) : null}

      <div className="mt-8 grid gap-x-5 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
        {catalog.map((item) => (
          <article key={item.id} className="border-t border-black/16 pt-4">
            <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
              <Image
                src={item.image}
                alt={`${item.name} exterior`}
                fill
                quality={95}
                sizes="(min-width: 1280px) 31vw, (min-width: 768px) 48vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.17em] text-black/42">
                  {item.code ?? (item.squareFeet
                    ? `${item.squareFeet.toLocaleString()} sq. ft.`
                    : "Laneway / Carriage Home")}
                </p>
                <h3 className="mt-2 text-2xl font-medium tracking-[-0.045em]">{item.name}</h3>
              </div>
              <span className="text-xs text-black/45">
                {item.homesPerSelection} {item.homesPerSelection === 1 ? "home" : "homes"}
              </span>
            </div>
            <p className="mt-4 min-h-20 text-sm leading-6 text-black/52">{item.description}</p>
            <PlannerHomeActions
              item={item}
              line={state.portfolio.find((line) => line.modelId === item.id)}
            />
            <div className="mt-6 grid grid-cols-[5.5rem_1fr] gap-3">
              <label>
                <span className="sr-only">Quantity of {item.name}</span>
                <input
                  type="number"
                  min="1"
                  value={quantities[item.id] ?? 1}
                  onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Math.max(1, Number(event.target.value) || 1) }))}
                  className={selectClassName}
                />
              </label>
              <label>
                <span className="sr-only">Phase for {item.name}</span>
                <select
                  value={phases[item.id] ?? "phase-1"}
                  onChange={(event) => setPhases((current) => ({ ...current, [item.id]: event.target.value as PlannerPhase }))}
                  className={selectClassName}
                >
                  {Object.entries(plannerPhaseLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => addItem(item)}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-between bg-black px-5 text-[9px] font-semibold uppercase tracking-[0.17em] text-white"
            >
              Add to Project <Plus aria-hidden="true" className="size-4" />
            </button>
            {addFeedback[item.id] ? (
              <p role="status" aria-live="polite" className="mt-3 flex items-start gap-2 text-xs leading-5 text-black/62">
                <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                {addFeedback[item.id]}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function EstimatePanel({ state, catalog }: { state: PlannerState; catalog: readonly PlannerCatalogItem[] }) {
  const estimate = calculatePreliminaryEstimate(state.portfolio, catalog);
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const values = [
    ["Low", estimate.low],
    ["Base planning case", estimate.base],
    ["High", estimate.high],
  ] as const;

  return (
    <div>
      <StepHeader
        eyebrow="03 / Preliminary feasibility"
        title="A range, not a quotation."
        intro="The estimate architecture separates Low, Base and High planning cases. No automatic finish uplift, volume discount, climate percentage, off-grid amount, appliance package, accessibility percentage or training formula is applied."
      />
      <div className="mt-16 grid border-l border-t border-black/16 lg:grid-cols-3">
        {values.map(([label, value]) => (
          <div key={label} className="flex min-h-60 flex-col justify-between border-b border-r border-black/16 p-6 sm:p-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-black/42">{label}</p>
            <p className={cn("mt-12 font-medium tracking-[-0.05em]", value === null ? "max-w-xs text-2xl leading-tight" : "text-4xl")}>
              {formatPlanningValue(value)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-5 border-t border-black/16 pt-6">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">Confidence</p>
          <p className="mt-2 text-xl font-medium">Early</p>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-black/52">
          {estimate.status === "under-review"
            ? `${estimate.missingBasisModelIds.length || summary.modelCount} selected model basis ${estimate.missingBasisModelIds.length === 1 ? "is" : "records are"} under commercial review. House Delivery will establish an indicative range after scope and basis confirmation.`
            : "All selected models have controlled planning-basis records. The range still requires project-specific review."}
        </p>
      </div>
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <div className="border-t border-black/16 pt-5">
          <h3 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">Assumptions</h3>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-black/58">
            {(estimate.assumptions.length ? estimate.assumptions : ["Planning assumptions will be established during review."]).map((item) => <li key={item}>— {item}</li>)}
          </ul>
        </div>
        <div className="border-t border-black/16 pt-5">
          <h3 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">Exclusions</h3>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-black/58">
            {(estimate.exclusions.length ? estimate.exclusions : ["Exclusions will be established during review."]).map((item) => <li key={item}>— {item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

type RefinementKey = keyof PlannerState["refinement"];

function RefineStep({
  state,
  setState,
}: {
  state: PlannerState;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
}) {
  function update(key: RefinementKey, value: string | readonly string[]) {
    setState((current) => ({
      ...current,
      refinement: { ...current.refinement, [key]: value },
    }));
  }

  function toggleHousehold(value: string) {
    const current = state.refinement.householdPriorities;
    const next = value === "unknown"
      ? ["unknown"]
      : current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current.filter((item) => item !== "unknown"), value];
    update("householdPriorities", next.length ? next : ["unknown"]);
  }

  const fields = [
    ["accessibility", "Accessibility / adaptability", [["unknown", "Unknown / to confirm"], ["standard", "Standard planning"], ["adaptable", "Adaptable homes required"], ["accessible", "Accessible homes required"], ["mixed", "Mixed accessibility portfolio"]]],
    ["landStatus", "Land / site status", [["unknown", "Unknown / to confirm"], ["on-reserve", "On-reserve"], ["off-reserve", "Off-reserve"], ["mixed", "Mixed land status"]]],
    ["servicing", "Servicing / access / remoteness", [["unknown", "Unknown / to confirm"], ["serviced-road-access", "Serviced with road access"], ["partial-servicing", "Partial servicing"], ["remote-road-access", "Remote with road access"], ["limited-access", "Limited or seasonal access"]]],
    ["affordability", "Housing / tenure approach", [["unknown", "To be determined"], ["community-rental", "Community rental"], ["deeply-affordable", "Affordable housing"], ["mixed-income", "Mixed-income"], ["ownership", "Ownership pathway"]]],
    ["culturalPriorities", "Cultural / design priorities", [["unknown", "Unknown / to confirm"], ["engagement-required", "Community engagement required"], ["defined-priorities", "Priorities identified"], ["artist-collaboration", "Local artist / artisan collaboration"]]],
    ["energyResilience", "Energy & resilience", [["unknown", "To be determined"], ["code-baseline", "Standard requirements / to be confirmed"], ["enhanced-performance", "Higher energy performance"], ["resilience-priority", "Resilience priority"], ["off-grid-review", "Remote / off-grid conditions"]]],
    ["localLabour", "Local & Indigenous participation", [["unknown", "To be determined"], ["explore", "Interested in local / Indigenous labour"], ["available", "Local crew or trades identified"], ["training-interest", "Interested in training"], ["partner-required", "Need assembly / delivery support"]]],
    ["trainingObjectives", "Assembly / training / maintenance", [["unknown", "To be determined"], ["assembly", "Local assembly participation"], ["training", "Training interest"], ["maintenance", "Long-term maintenance capability"], ["support-required", "House Delivery / project delivery support required"]]],
    ["targetTiming", "Target timing", [["unknown", "Unknown / to confirm"], ["within-12-months", "Within 12 months"], ["12-24-months", "12–24 months"], ["24-plus-months", "24+ months"], ["phased", "Phased pipeline"]]],
  ] as const;

  return (
    <div>
      <StepHeader
        eyebrow="04 / Refine project"
        title="Refine Your Project"
        intro="These answers help House Delivery better understand the community, site, delivery needs and funding context. Every answer can remain unknown while the project is still taking shape."
      />
      <fieldset className="mt-16 border-t border-black/16 pt-6">
        <legend className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/46">Who should the portfolio serve?</legend>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {householdOptions.map(([value, label]) => {
            const checked = state.refinement.householdPriorities.includes(value);
            return (
              <label key={value} className={cn("flex min-h-14 cursor-pointer items-center gap-3 border px-4 text-sm", checked ? "border-black bg-black text-white" : "border-black/16 text-black/62")}>
                <input type="checkbox" checked={checked} onChange={() => toggleHousehold(value)} className="sr-only" />
                <span className={cn("grid size-5 place-items-center border", checked ? "border-white" : "border-black/25")}>
                  {checked ? <Check aria-hidden="true" className="size-3" /> : null}
                </span>
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-10 grid border-l border-t border-black/16 md:grid-cols-2">
        {fields.map(([key, label, options]) => (
          <label key={key} className="border-b border-r border-black/16 p-5 sm:p-7">
            <FieldLabel>{label}</FieldLabel>
            <select value={state.refinement[key] as string} onChange={(event) => update(key, event.target.value)} className={selectClassName}>
              {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
            </select>
          </label>
        ))}
      </div>
      <label className="mt-8 block border-t border-black/16 pt-6">
        <FieldLabel>Project notes / information to carry forward</FieldLabel>
        <textarea
          value={state.projectNotes}
          onChange={(event) => setState((current) => ({ ...current, projectNotes: event.target.value }))}
          rows={5}
          placeholder="Add community priorities, known constraints, partners, reference material or questions for review."
          className="w-full border border-black/18 bg-transparent p-4 text-sm leading-6 text-black outline-none focus:border-black"
        />
      </label>
    </div>
  );
}

function DesignStep({
  state,
  setState,
  catalog,
  returnNotice,
  onContinue,
}: {
  state: PlannerState;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
  catalog: readonly PlannerCatalogItem[];
  returnNotice?: string;
  onContinue: () => void;
}) {
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const designLines = summary.lines.filter(({ model }) => model.designChapters.length > 0);
  const progress = getPlannerDesignProgress(state.portfolio, catalog);
  const nextDesign = designLines
    .flatMap(({ line, model }) =>
      line.designVariations.map((variation) => ({ line, model, variation })),
    )
    .find(({ variation }) => variation.status !== "complete");

  function updateLine(lineId: string, updater: (line: PlannerPortfolioLine) => PlannerPortfolioLine) {
    setState((current) => ({
      ...current,
      portfolio: current.portfolio.map((line) => line.id === lineId ? updater(line) : line),
    }));
  }

  return (
    <div>
      <StepHeader
        eyebrow="05 / House Delivery design direction"
        title="Make the direction visible."
        intro="Create one design per home type and assign it to every matching home by default. Add a design variation only when part of that quantity needs a different direction."
      />
      {returnNotice ? (
        <div role="status" className="mt-10 border border-black bg-black p-5 text-white sm:p-6">
          <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em]"><Check aria-hidden="true" className="size-4" />{returnNotice}</p>
          <p className="mt-3 text-sm leading-6 text-white/58">Your project totals and saved design assignments remain intact.</p>
        </div>
      ) : null}
      {designLines.length ? (
        <div className="mt-8 flex flex-col gap-5 border-y border-black/16 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-black/58">
            {progress.completedDesigns} design {progress.completedDesigns === 1 ? "group" : "groups"} completed · {progress.remainingDesignGroups} remaining
          </p>
          {nextDesign ? (
            <PlannerLink
              href={buildPlannerDesignHref(
                nextDesign.model.buildMyHref!,
                getPlannerDesignSession(nextDesign.line, nextDesign.model, nextDesign.variation),
              )}
              newTab={false}
            >
              Continue to Next Home Design
            </PlannerLink>
          ) : (
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex min-h-11 items-center gap-3 border-b border-black/28 text-[9px] font-semibold uppercase tracking-[0.15em]"
            >
              Continue to Funding Pathways <ArrowRight aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>
      ) : null}
      {designLines.length ? (
        <div className="mt-16 space-y-14">
          {designLines.map(({ line, model }) => {
            return (
              <article key={line.id} id={`planner-design-line-${line.id}`} className="scroll-mt-28 border-t border-black/16 pt-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.18em] text-black/42">{plannerPhaseLabels[line.phase]} / Visual Direction</p>
                    <h3 className="mt-3 text-4xl font-medium tracking-[-0.055em]">{model.name}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-black/48">
                      {line.designVariations.length === 1
                        ? `Create one ${getPlannerHomeName(model.name)} design and assign it to all ${line.quantity} ${line.quantity === 1 ? "home" : "homes"}.`
                        : `${line.designVariations.length} design variations are assigned across ${line.quantity} homes.`}
                    </p>
                  </div>
                  <p className="text-right text-xs leading-5 text-black/45">Delivery sequence<br />{plannerPhaseLabels[line.phase]}</p>
                </div>
                <div className="mt-7 grid gap-4 lg:grid-cols-2">
                  {line.designVariations.map((variation) => {
                    const session = getPlannerDesignSession(line, model, variation);
                    const buildHref = buildPlannerDesignHref(model.buildMyHref!, session);
                    const lookBookHref = buildPlannerDesignHref(
                      model.lookBookHref ?? model.buildMyHref!,
                      session,
                      "look-book",
                    );
                    return (
                      <section
                        key={variation.id}
                        id={`planner-design-${variation.id}`}
                        className="scroll-mt-28 border border-black/16 p-5 sm:p-6"
                      >
                        <div className="flex items-start justify-between gap-5">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-black/42">Saved design group</p>
                            <h4 className="mt-2 text-2xl font-medium tracking-[-0.04em]">{getPlannerHomeName(model.name)} — {variation.label}</h4>
                          </div>
                          <span className={cn("px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.14em]", variation.status === "complete" ? "bg-black text-white" : "border border-black/18 text-black/46")}>
                            {variation.status === "complete" ? "Design completed" : "Design remaining"}
                          </span>
                        </div>
                        {line.designVariations.length > 1 ? (
                          <label className="mt-6 block max-w-52">
                            <FieldLabel>Assigned quantity</FieldLabel>
                            <input
                              type="number"
                              min="1"
                              max={line.quantity - (line.designVariations.length - 1)}
                              value={variation.assignedQuantity}
                              onChange={(event) =>
                                updateLine(line.id, (current) =>
                                  reassignPlannerDesignQuantity(
                                    current,
                                    variation.id,
                                    Number(event.target.value) || 1,
                                  ),
                                )
                              }
                              className={selectClassName}
                            />
                          </label>
                        ) : (
                          <p className="mt-6 text-sm text-black/56">Assigned to {variation.assignedQuantity} {variation.assignedQuantity === 1 ? "home" : "homes"}</p>
                        )}
                        {variation.lookBookReference ? (
                          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.13em] text-black/42">My Look Book / {variation.lookBookReference}</p>
                        ) : null}
                        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 border-t border-black/12 pt-4">
                          {variation.status === "complete" ? (
                            <>
                              <PlannerLink href={lookBookHref} newTab={false}>My Look Book</PlannerLink>
                              <PlannerLink href={buildHref} newTab={false}>Edit Design</PlannerLink>
                            </>
                          ) : (
                            <>
                              <PlannerLink href={buildHref} newTab={false}>Design My Home</PlannerLink>
                              <span className="self-center text-[9px] font-semibold uppercase tracking-[0.15em] text-black/32">My Look Book — Save a design first</span>
                            </>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={line.designVariations.length >= line.quantity}
                  onClick={() => updateLine(line.id, addPlannerDesignVariation)}
                  className="mt-5 inline-flex min-h-11 items-center gap-3 border border-black/22 px-5 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/62 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Plus aria-hidden="true" className="size-3.5" /> Create Another Design Variation
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-16 border-y border-black/16 py-12">
          <h3 className="text-2xl font-medium tracking-[-0.04em]">Design direction follows project review.</h3>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-black/52">The current portfolio does not include a home with an approved Visual Guide. Design requirements can still be carried in the project notes without borrowing another home’s boards.</p>
        </div>
      )}
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {["Visual Direction", "Planning Allowance", "Supplier-Informed", "Technical Review Required", "Project-Specific Approval Required"].map((status) => (
          <div key={status} className="border-t border-black/16 pt-4 text-[9px] font-semibold uppercase leading-5 tracking-[0.14em] text-black/46">{status}</div>
        ))}
      </div>
    </div>
  );
}

function FundingStep({ state, catalog, corridors }: { state: PlannerState; catalog: readonly PlannerCatalogItem[]; corridors: readonly FundingCorridor[] }) {
  const matches = matchFundingCorridors(state, corridors, catalog);
  const ordered = [...matches].sort((a, b) => {
    const rank = { "Strong corridor to explore": 0, "Relevant corridor": 1, "Potential corridor — more information required": 2, Monitor: 3 } as const;
    return rank[a.relevance] - rank[b.relevance];
  });

  return (
    <div>
      <StepHeader
        eyebrow="06 / Funding pathways"
        title="Corridors to explore."
        intro="These contextual matches support an early funding conversation. They are not eligibility findings, approvals or guarantees, and no potential funding is deducted from project feasibility."
      />
      <div className="mt-16 border-t border-black/16">
        {ordered.map((corridor) => (
          <article key={corridor.id} className="grid gap-7 border-b border-black/16 py-8 lg:grid-cols-[0.35fr_1fr] lg:gap-14">
            <div>
              <p className={cn("inline-flex px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.14em]", corridor.relevance === "Strong corridor to explore" ? "bg-black text-white" : "border border-black/18 text-black/55")}>{corridor.relevance}</p>
              <p className="mt-4 text-xs leading-5 text-black/42">{corridor.organization}<br />{corridor.supportType}</p>
            </div>
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h3 className="max-w-2xl text-2xl font-medium tracking-[-0.04em]">{corridor.title}</h3>
                <PlannerLink href={corridor.officialSource}>Official source</PlannerLink>
              </div>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/42">Why it may fit</p>
                  <p className="mt-3 text-sm leading-6 text-black/58">{corridor.whyItMayFit}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/42">Still to confirm</p>
                  <p className="mt-3 text-sm leading-6 text-black/58">{corridor.confirmationNeeded}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ScaleReadinessStep({ state, catalog }: { state: PlannerState; catalog: readonly PlannerCatalogItem[] }) {
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const readiness = getReadinessProfile(state, catalog);
  const repeatedModels = summary.lines.filter(({ line }) => line.quantity > 1).length;

  return (
    <div>
      <StepHeader
        eyebrow="07 / Scale and readiness"
        title="Two different questions."
        intro="Scale describes the opportunity. Readiness describes what is known today. Neither is a government, lender or funding-program score."
      />
      <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-20">
        <section>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">Scale / Factual profile</p>
          <div className="mt-5 border-t border-black/16">
            {[
              ["Working housing requirement", `${summary.totalHomes} homes`],
              ["Model mix", `${summary.modelCount} model types`],
              ["Repeatable models", `${repeatedModels} repeated portfolio lines`],
              ["Phasing", `${summary.phaseCount} phases represented`],
              ["Site pattern", labelValue(state.sitePattern)],
              ["Delivery horizon", labelValue(state.deliveryHorizon)],
            ].map(([label, value]) => (
              <dl key={label} className="flex items-center justify-between gap-5 border-b border-black/16 py-5">
                <dt className="text-sm text-black/50">{label}</dt><dd className="text-right text-sm font-medium">{value}</dd>
              </dl>
            ))}
          </div>
        </section>
        <section>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">Readiness / Information profile</p>
          <div className="mt-5 border-t border-black/16">
            {readiness.map((item) => (
              <div key={item.label} className="grid grid-cols-[auto_1fr] gap-4 border-b border-black/16 py-5">
                <span className={cn("mt-0.5 grid size-5 place-items-center border", item.ready ? "border-black bg-black text-white" : "border-black/20 text-black/25")}>{item.ready ? <Check aria-hidden="true" className="size-3" /> : null}</span>
                <div><p className="text-sm font-medium">{item.label}</p><p className="mt-1 text-xs leading-5 text-black/46">{item.detail}</p></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function OpportunityReport({
  state,
  onEditProject,
  onPrevious,
  onReset,
  catalog,
  corridors,
}: {
  state: PlannerState;
  onEditProject: () => void;
  onPrevious: () => void;
  onReset: () => void;
  catalog: readonly PlannerCatalogItem[];
  corridors: readonly FundingCorridor[];
}) {
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const estimate = calculatePreliminaryEstimate(state.portfolio, catalog);
  const funding = matchFundingCorridors(state, corridors, catalog).filter((item) => item.relevance !== "Monitor");
  const readiness = getReadinessProfile(state, catalog);
  const savedDesigns = summary.lines.flatMap(({ line, model }) =>
    line.designVariations.flatMap((variation) =>
      variation.status === "complete"
        ? [{ model: model.name, variation }]
        : [],
    ),
  );
  const missingInformation = readiness.filter((item) => !item.ready).map((item) => item.label);
  const reviewBody = encodeURIComponent([
    `Community / Nation: ${state.community}`,
    `Location: ${state.location}`,
    `Working portfolio: ${summary.totalHomes} homes across ${summary.modelCount} model types`,
    `Planning confidence: Early`,
    `Commercial basis: ${estimate.status === "under-review" ? "Under review" : "Preliminary range available"}`,
    "",
    "Please contact us to arrange a House Delivery project review.",
  ].join("\n"));
  const reviewHref = `mailto:hello@housedelivery.ca?subject=${encodeURIComponent(`House Delivery Review — ${state.community || "First Nations project"}`)}&body=${reviewBody}`;

  function printReport() {
    const previousTitle = document.title;
    document.title = `${state.community || "Community"} — Preliminary Opportunity Report`;
    window.print();
    document.title = previousTitle;
  }

  return (
    <div>
      <div className="planner-screen-only">
        <StepHeader eyebrow="08 / Preliminary opportunity report" title="A clearer next conversation." intro="This report carries the opportunity, portfolio, planning basis, contextual funding corridors and missing information into a structured House Delivery review." />
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={printReport} className="inline-flex min-h-12 items-center justify-between gap-8 bg-black px-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white">Download Preliminary Opportunity Report <FileDown aria-hidden="true" className="size-4" /></button>
        </div>
      </div>

      <article data-planner-report className="mt-16 bg-white px-6 text-black sm:px-10 lg:px-16 xl:px-20 print:mt-0">
        <header className="border-y border-black/18 py-9">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/45">House Delivery / Preliminary Opportunity Report</p>
          <h2 className="mt-6 max-w-5xl text-[clamp(3.4rem,7vw,7.5rem)] font-medium leading-[0.82] tracking-[-0.075em]">{state.community || "Community housing opportunity"}</h2>
          <div className="mt-8 grid gap-3 text-xs uppercase tracking-[0.13em] text-black/48 sm:grid-cols-3"><p>{state.location || "Location to confirm"}</p><p>{summary.totalHomes} working homes</p><p>Confidence / Early</p></div>
        </header>

        <ReportSection number="01" title="Opportunity">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[["Housing requirement", state.approximateHomes ? `Approximately ${state.approximateHomes}` : "To confirm"], ["Working portfolio", `${summary.totalHomes} homes`], ["Sites", labelValue(state.sitePattern)], ["Horizon", labelValue(state.deliveryHorizon)]].map(([label, value]) => <dl key={label} className="border-t border-black/16 pt-4"><dt className="text-[8px] uppercase tracking-[0.16em] text-black/42">{label}</dt><dd className="mt-3 text-xl font-medium tracking-[-0.03em]">{value}</dd></dl>)}
          </div>
        </ReportSection>

        <ReportSection number="02" title="Portfolio and phases">
          <div className="border-t border-black/16">
            {summary.lines.map(({ line, model }) => <div key={line.id} className="grid grid-cols-[1fr_auto] gap-5 border-b border-black/16 py-4 text-sm"><div><p className="font-medium">{model.name}</p><p className="mt-1 text-xs text-black/45">{model.family === "standardized-catalogue" ? "Standardized Catalogue Design" : model.family === "laneway-carriage-home" ? "Laneway / Carriage Home" : "Custom Home"}{model.squareFeet ? ` / ${model.squareFeet.toLocaleString()} sq. ft.` : ""}</p></div><p className="text-right">{line.quantity} × {model.homesPerSelection} {model.homesPerSelection === 1 ? "home" : "homes"}<br /><span className="text-xs text-black/45">{plannerPhaseLabels[line.phase]}</span></p></div>)}
          </div>
        </ReportSection>

        <ReportSection number="03" title="Preliminary feasibility">
          <div className="grid border-l border-t border-black/16 sm:grid-cols-3">{[["Low", estimate.low], ["Base planning case", estimate.base], ["High", estimate.high]].map(([label, value]) => <dl key={label as string} className="border-b border-r border-black/16 p-5"><dt className="text-[8px] uppercase tracking-[0.16em] text-black/42">{label}</dt><dd className="mt-8 text-xl font-medium leading-tight">{formatPlanningValue(value as number | null)}</dd></dl>)}</div>
          <p className="mt-5 text-xs leading-5 text-black/52">Preliminary feasibility only—not a quotation. Potential funding has not been deducted. Design direction does not change pricing without a controlled commercial delta.</p>
        </ReportSection>

        <ReportSection number="04" title="Design direction">
          {savedDesigns.length ? <div className="grid gap-3 sm:grid-cols-2">{savedDesigns.map(({ model, variation }) => <p key={variation.id} className="border-t border-black/16 pt-3 text-sm"><span className="text-black/42">{getPlannerHomeName(model)} — {variation.label}</span><br />Assigned to {variation.assignedQuantity} {variation.assignedQuantity === 1 ? "home" : "homes"}{variation.lookBookReference ? ` · ${variation.lookBookReference}` : ""}</p>)}</div> : <p className="text-sm text-black/52">Design direction has not yet been recorded. Technical and project-specific approvals remain separate.</p>}
        </ReportSection>

        <ReportSection number="05" title="Major range drivers">
          <div className="grid gap-3 sm:grid-cols-2">{[["Site and servicing", labelValue(state.refinement.servicing)], ["Access and logistics", state.location || "Unknown / to confirm"], ["Accessibility", labelValue(state.refinement.accessibility)], ["Energy and resilience", labelValue(state.refinement.energyResilience)], ["Local delivery capacity", labelValue(state.refinement.localLabour)], ["Timing and phasing", labelValue(state.refinement.targetTiming)]].map(([label, value]) => <p key={label} className="border-t border-black/16 pt-3 text-sm"><span className="text-black/42">{label}</span><br />{value}</p>)}</div>
        </ReportSection>

        <ReportSection number="06" title="Scale and readiness">
          <div className="grid gap-x-8 sm:grid-cols-2">{readiness.map((item) => <div key={item.label} className="grid grid-cols-[auto_1fr] gap-3 border-t border-black/16 py-3"><span>{item.ready ? "●" : "○"}</span><p className="text-sm"><span className="font-medium">{item.label}</span><br /><span className="text-xs text-black/48">{item.detail}</span></p></div>)}</div>
        </ReportSection>

        <ReportSection number="07" title="Community participation and capability">
          <div className="grid gap-5 sm:grid-cols-2">{[["Local & Indigenous participation", labelValue(state.refinement.localLabour)], ["Assembly / training / maintenance", labelValue(state.refinement.trainingObjectives)]].map(([label, value]) => <p key={label} className="border-t border-black/16 pt-3 text-sm"><span className="text-black/42">{label}</span><br />{value}</p>)}</div>
        </ReportSection>

        <ReportSection number="08" title="Funding corridors">
          <div className="space-y-4">{funding.map((item) => <div key={item.id} className="border-t border-black/16 pt-3"><p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-black/42">{item.relevance}</p><p className="mt-2 text-sm font-medium">{item.title}</p><p className="mt-1 text-xs leading-5 text-black/50">{item.confirmationNeeded}</p><p className="mt-1 break-all text-[9px] text-black/38">{item.officialSource}</p></div>)}</div>
        </ReportSection>

        <ReportSection number="09" title="Assumptions, exclusions and missing information">
          <div className="grid gap-8 lg:grid-cols-3"><div><p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">Assumptions</p><ul className="mt-4 space-y-2 text-xs leading-5 text-black/55">{estimate.assumptions.map((item) => <li key={item}>— {item}</li>)}</ul></div><div><p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">Exclusions</p><ul className="mt-4 space-y-2 text-xs leading-5 text-black/55">{estimate.exclusions.map((item) => <li key={item}>— {item}</li>)}</ul></div><div><p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">Missing information</p><ul className="mt-4 space-y-2 text-xs leading-5 text-black/55">{missingInformation.length ? missingInformation.map((item) => <li key={item}>— {item}</li>) : <li>— No primary information gaps flagged at this stage.</li>}</ul></div></div>
        </ReportSection>

        <footer className="mt-14 bg-[#0b0c10] p-6 text-white sm:p-9">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">Next pathway</p>
          <p className="mt-5 text-xl font-medium leading-8 tracking-[-0.025em]">Discovery → LOU / Commitment → Funding, Financing or Deposit → Project-Specific Technical Review → Final Quotation → Procurement & Delivery</p>
          <p className="mt-7 max-w-4xl text-xs leading-5 text-white/48">This preliminary report is for early opportunity planning only. It is not a quotation, funding decision, technical approval, permit opinion or commitment to deliver. Project-specific professional review, adaptation and jurisdictional approval are required.</p>
        </footer>
      </article>

      <div data-planner-completion-actions className="planner-screen-only mt-10 border-y border-black/18 py-8 sm:py-10">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/44">
          Review complete / Next step
        </p>
        <div className="mt-6 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <a
            href={reviewHref}
            className="inline-flex min-h-16 items-center justify-between gap-8 bg-black px-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-white transition-colors hover:bg-black/78"
          >
            Begin Project Review <ArrowRight aria-hidden="true" className="size-4" />
          </a>
          <button
            type="button"
            onClick={onEditProject}
            className="inline-flex min-h-16 items-center justify-between gap-8 border border-black/28 px-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-black/68 transition-colors hover:border-black hover:text-black"
          >
            View / Edit My Project <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-black/14 pt-5">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex min-h-11 items-center gap-3 border border-black/22 px-5 text-[9px] font-semibold uppercase tracking-[0.16em]"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Previous
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-11 items-center gap-2 px-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/34 transition-colors hover:text-black/60"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" /> Start Again
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="border-b border-black/16 py-10 print:break-inside-avoid"><div className="mb-7 grid gap-3 sm:grid-cols-[4rem_1fr]"><p className="font-mono text-[9px] text-black/35">{number}</p><h3 className="text-2xl font-medium tracking-[-0.04em]">{title}</h3></div>{children}</section>;
}

export function FirstNationsProjectPlanner({ catalog, fundingCorridors }: { catalog: readonly PlannerCatalogItem[]; fundingCorridors: readonly FundingCorridor[] }) {
  const [state, setState] = useState<PlannerState>(defaultPlannerState);
  const [hydrated, setHydrated] = useState(false);
  const [returnNotice, setReturnNotice] = useState<string>();

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = window.localStorage.getItem(PLANNER_STORAGE_KEY);
        const restored = saved
          ? migratePlannerState(JSON.parse(saved))
          : defaultPlannerState;
        const returnedValue = window.localStorage.getItem(PLANNER_RETURN_KEY);
        const returned = returnedValue
          ? (JSON.parse(returnedValue) as PlannerDesignReturn)
          : undefined;

        if (restored && returned?.lineId && returned.variationId) {
          const designSelections = Object.fromEntries(
            [
              ...Object.entries(returned.configuration.inclusionSelections),
              ...Object.entries(returned.configuration.flooringSelections),
            ].flatMap(([categoryId, selection]) =>
              selection?.status === "confirmed"
                ? [[categoryId, selection.optionId] as const]
                : [],
            ),
          );
          const portfolio = restored.portfolio.map((line) =>
            line.id === returned.lineId
              ? {
                  ...line,
                  designVariations: line.designVariations.map((variation) =>
                    variation.id === returned.variationId
                      ? {
                          ...variation,
                          status: "complete" as const,
                          designSelections,
                          lookBookReference:
                            returned.configuration.lookBookPersonalization
                              ?.reference ?? variation.lookBookReference,
                          savedAt: returned.completedAt,
                        }
                      : variation,
                  ),
                }
              : line,
          );
          const returnedState: PlannerState = {
            ...restored,
            portfolio,
            step: 4,
          };
          window.localStorage.setItem(
            PLANNER_STORAGE_KEY,
            JSON.stringify(returnedState),
          );
          setState(returnedState);
          setReturnNotice(
            `${returned.homeName} — ${returned.designLabel} is saved and assigned to ${returned.assignedQuantity} ${returned.assignedQuantity === 1 ? "home" : "homes"}.`,
          );
          window.localStorage.removeItem(PLANNER_RETURN_KEY);
          window.requestAnimationFrame(() => {
            document
              .getElementById(`planner-design-${returned.variationId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        } else if (restored) {
          setState(restored);
        }
      } catch {
        // A malformed local draft should never block a new planning session.
      } finally {
        setHydrated(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private browsing or a full storage quota should not block the planner.
    }
  }, [hydrated, state]);

  const projectSummary = getPortfolioSummary(state.portfolio, catalog);
  const designProgress = getPlannerDesignProgress(state.portfolio, catalog);
  const includedHomeTypes = projectSummary.lines.map(({ model }) =>
    getPlannerHomeName(model.name),
  );
  const completedHomeTypes = projectSummary.lines.flatMap(({ line, model }) =>
    line.designVariations.some((variation) => variation.status === "complete")
      ? [getPlannerHomeName(model.name)]
      : [],
  );
  const remainingHomeTypes = projectSummary.lines.flatMap(({ line, model }) =>
    model.designChapters.length > 0 &&
    line.designVariations.some((variation) => variation.status !== "complete")
      ? [getPlannerHomeName(model.name)]
      : [],
  );

  const canContinue = useMemo(() => {
    if (state.step === 0) return Boolean(state.community.trim() && state.location.trim() && Number(state.approximateHomes) > 0);
    if (state.step === 1) return state.portfolio.length > 0;
    return true;
  }, [state]);

  function goToStep(step: number) {
    setState((current) => ({ ...current, step: Math.min(Math.max(step, 0), steps.length - 1) }));
    window.requestAnimationFrame(() => document.getElementById("planner-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function resetPlanner() {
    if (!window.confirm("Clear this local planner draft and start again?")) return;
    setState(defaultPlannerState);
    setReturnNotice(undefined);
    window.localStorage.removeItem(PLANNER_STORAGE_KEY);
  }

  return (
    <section id="planner-workspace" className="planner-shell scroll-mt-24 bg-[#edeae2] text-black">
      <div className="planner-screen-only border-y border-black/14 bg-[#e5e1d7] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1504px] items-center gap-2 overflow-x-auto py-4" aria-label="Planner progress">
          {steps.map((step, index) => (
            <button key={step.label} type="button" onClick={() => index <= state.step ? goToStep(index) : undefined} disabled={index > state.step} aria-current={index === state.step ? "step" : undefined} className={cn("flex min-w-max items-center gap-3 border px-4 py-3 text-left transition-colors", index === state.step ? "border-black bg-black text-white" : index < state.step ? "border-black/24 text-black/65 hover:border-black" : "cursor-not-allowed border-black/10 text-black/25")}>
              <span className="font-mono text-[8px]">{String(index + 1).padStart(2, "0")}</span><span className="text-[9px] font-semibold uppercase tracking-[0.14em]">{step.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="planner-screen-only sticky top-[4.5rem] z-30 border-b border-black/14 bg-[#edeae2]/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1504px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/72">
              {projectSummary.totalHomes} homes · {projectSummary.modelCount} home {projectSummary.modelCount === 1 ? "type" : "types"} · {projectSummary.phaseCount} delivery {projectSummary.phaseCount === 1 ? "group" : "groups"} · {designProgress.completedDesigns} {designProgress.completedDesigns === 1 ? "design" : "designs"} completed · {designProgress.remainingDesignGroups} design {designProgress.remainingDesignGroups === 1 ? "group" : "groups"} remaining
            </p>
            <p className="mt-2 text-[10px] leading-4 text-black/46">
              {includedHomeTypes.length ? `Included: ${includedHomeTypes.join(", ")}.` : "No homes added yet."}
              {completedHomeTypes.length ? ` Configured: ${completedHomeTypes.join(", ")}.` : ""}
              {remainingHomeTypes.length ? ` Next: ${remainingHomeTypes.join(", ")}.` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => goToStep(1)}
            className="inline-flex min-h-10 shrink-0 items-center justify-between gap-5 border border-black/22 px-4 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/64 transition-colors hover:border-black hover:text-black"
          >
            View / Edit My Project <ArrowRight aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1504px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28">
        {state.step === 0 ? <StartStep state={state} update={(patch) => setState((current) => ({ ...current, ...patch }))} /> : null}
        {state.step === 1 ? <PortfolioStep state={state} setState={setState} catalog={catalog} /> : null}
        {state.step === 2 ? <EstimatePanel state={state} catalog={catalog} /> : null}
        {state.step === 3 ? <RefineStep state={state} setState={setState} /> : null}
        {state.step === 4 ? <DesignStep state={state} setState={setState} catalog={catalog} returnNotice={returnNotice} onContinue={() => goToStep(5)} /> : null}
        {state.step === 5 ? <FundingStep state={state} catalog={catalog} corridors={fundingCorridors} /> : null}
        {state.step === 6 ? <ScaleReadinessStep state={state} catalog={catalog} /> : null}
        {state.step === 7 ? <OpportunityReport state={state} onEditProject={() => goToStep(1)} onPrevious={() => goToStep(6)} onReset={resetPlanner} catalog={catalog} corridors={fundingCorridors} /> : null}

        {state.step < steps.length - 1 ? <div className="planner-screen-only mt-20 flex flex-col-reverse gap-4 border-t border-black/16 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => goToStep(state.step - 1)} disabled={state.step === 0} className="inline-flex min-h-12 items-center gap-3 border border-black/22 px-5 text-[9px] font-semibold uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-30"><ArrowLeft aria-hidden="true" className="size-4" /> Previous</button>
            <button type="button" onClick={resetPlanner} className="inline-flex min-h-12 items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/42 hover:text-black"><RotateCcw aria-hidden="true" className="size-3.5" /> Start again</button>
          </div>
          <div><button type="button" onClick={() => goToStep(state.step + 1)} disabled={!canContinue} className="inline-flex min-h-12 min-w-60 items-center justify-between gap-8 bg-black px-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:bg-black/25">{state.step === 2 ? "Refine My Project" : state.step === 6 ? "Create Opportunity Report" : "Continue"}<ArrowRight aria-hidden="true" className="size-4" /></button>{!canContinue ? <p className="mt-3 max-w-xs text-xs leading-5 text-black/45">{state.step === 0 ? "Add the community, location and approximate housing requirement to continue." : "Add at least one home model to continue."}</p> : null}</div>
        </div> : null}
      </div>
    </section>
  );
}
