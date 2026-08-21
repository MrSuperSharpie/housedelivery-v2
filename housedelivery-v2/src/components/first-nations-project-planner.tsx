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
  calculatePreliminaryEstimate,
  defaultPlannerState,
  formatPlanningValue,
  getPortfolioSummary,
  getReadinessProfile,
  matchFundingCorridors,
  type FundingCorridor,
  type PlannerCatalogItem,
  type PlannerPhase,
  type PlannerPortfolioLine,
  type PlannerState,
} from "@/lib/project-planner";

const STORAGE_KEY = "house-delivery:first-nations-planner:v1";

const plannerPhaseLabels = {
  "phase-1": "Phase 1",
  "phase-2": "Phase 2",
  future: "Future Pipeline",
} as const;

const steps = [
  { label: "Community Need", eyebrow: "Start" },
  { label: "Housing Portfolio", eyebrow: "Build" },
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

function PlannerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-9 items-center gap-2 border-b border-black/28 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/58 transition-colors hover:border-black hover:text-black"
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="size-3.5" />
    </Link>
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
  const [family, setFamily] = useState<"standardized-catalogue" | "custom-home">(
    "standardized-catalogue",
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [phases, setPhases] = useState<Record<string, PlannerPhase>>({});
  const catalog = plannerCatalog.filter((item) => item.family === family);
  const summary = getPortfolioSummary(state.portfolio, plannerCatalog);

  function addItem(item: PlannerCatalogItem) {
    const quantity = Math.max(1, quantities[item.id] ?? 1);
    const phase = phases[item.id] ?? "phase-1";
    setState((current) => {
      const existing = current.portfolio.find(
        (line) => line.modelId === item.id && line.phase === phase,
      );
      const portfolio = existing
        ? current.portfolio.map((line) =>
            line.id === existing.id
              ? { ...line, quantity: line.quantity + quantity }
              : line,
          )
        : [
            ...current.portfolio,
            {
              id: createLineId(),
              modelId: item.id,
              quantity,
              phase,
              designSelections: {},
              lookBookReference: "",
            },
          ];
      return { ...current, portfolio };
    });
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
        eyebrow="02 / Housing portfolio"
        title="Build the portfolio."
        intro="Combine repeatable home models across Phase 1, Phase 2 and the future pipeline. Model pages open separately so this planning work stays saved."
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
          <p className="text-[9px] uppercase tracking-[0.18em] text-black/42">Phases represented</p>
          <p className="mt-2 text-3xl font-medium tracking-[-0.05em]">{summary.phaseCount}</p>
        </div>
      </div>

      {summary.lines.length ? (
        <div className="mt-12">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
            Working portfolio
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
                        quantity: Math.max(1, Number(event.target.value) || 1),
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
                  {item.code ?? `${item.squareFeet.toLocaleString()} sq. ft.`}
                </p>
                <h3 className="mt-2 text-2xl font-medium tracking-[-0.045em]">{item.name}</h3>
              </div>
              <span className="text-xs text-black/45">
                {item.homesPerSelection} {item.homesPerSelection === 1 ? "home" : "homes"}
              </span>
            </div>
            <p className="mt-4 min-h-20 text-sm leading-6 text-black/52">{item.description}</p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1">
              <PlannerLink href={item.viewHref}>View Home</PlannerLink>
              {item.walkthroughHref ? <PlannerLink href={item.walkthroughHref}>Walkthrough</PlannerLink> : null}
              {item.buildMyHref ? <PlannerLink href={item.buildMyHref}>Build My</PlannerLink> : null}
              {item.lookBookHref ? <PlannerLink href={item.lookBookHref}>Look Book</PlannerLink> : null}
            </div>
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
              Add to portfolio <Plus aria-hidden="true" className="size-4" />
            </button>
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
    ["affordability", "Affordability approach", [["unknown", "Unknown / to confirm"], ["deeply-affordable", "Deeply affordable"], ["community-rental", "Community rental"], ["mixed-income", "Mixed-income"], ["ownership", "Ownership pathway"]]],
    ["culturalPriorities", "Cultural / design priorities", [["unknown", "Unknown / to confirm"], ["engagement-required", "Community engagement required"], ["defined-priorities", "Priorities identified"], ["artist-collaboration", "Local artist / artisan collaboration"]]],
    ["energyResilience", "Energy / resilience priorities", [["unknown", "Unknown / to confirm"], ["code-baseline", "Baseline to be established"], ["enhanced-performance", "Enhanced performance"], ["resilience-priority", "Resilience is a priority"], ["off-grid-review", "Off-grid review required"]]],
    ["localLabour", "Local and Indigenous labour", [["unknown", "Unknown / to confirm"], ["explore", "Explore local participation"], ["available", "Local capacity identified"], ["partner-required", "Delivery partner required"]]],
    ["trainingObjectives", "Assembly / training / maintenance", [["unknown", "Unknown / to confirm"], ["not-current-priority", "Not a current priority"], ["assembly", "Assembly participation"], ["training", "Training objective"], ["maintenance", "Long-term maintenance capacity"]]],
    ["canadianValue", "Canadian / local value", [["unknown", "Unknown / to confirm"], ["important", "Important consideration"], ["procurement-priority", "Procurement priority"], ["community-benefit", "Community-benefit objective"]]],
    ["targetTiming", "Target timing", [["unknown", "Unknown / to confirm"], ["within-12-months", "Within 12 months"], ["12-24-months", "12–24 months"], ["24-plus-months", "24+ months"], ["phased", "Phased pipeline"]]],
  ] as const;

  return (
    <div>
      <StepHeader
        eyebrow="04 / Refine project"
        title="Replace assumptions with context."
        intro="Every answer can remain unknown. The objective is to identify what is understood, what requires engagement and what must be reviewed before a commercial or technical commitment."
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
}: {
  state: PlannerState;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
  catalog: readonly PlannerCatalogItem[];
}) {
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const designLines = summary.lines.filter(({ model }) => model.designChapters.length > 0);

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
        intro="Premium and Signature selections are visual direction—not exact supplier products or a fully costed bill of materials. They do not change this planning case unless a controlled commercial delta is established later."
      />
      {designLines.length ? (
        <div className="mt-16 space-y-14">
          {designLines.map(({ line, model }) => {
            const selectedCount = model.designChapters.filter((chapter) => line.designSelections[chapter.id]).length;
            return (
              <article key={line.id} className="border-t border-black/16 pt-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.18em] text-black/42">{plannerPhaseLabels[line.phase]} / Visual Direction</p>
                    <h3 className="mt-3 text-4xl font-medium tracking-[-0.055em]">{model.name}</h3>
                    <p className="mt-3 text-sm text-black/48">{selectedCount} of {model.designChapters.length} design chapters recorded</p>
                  </div>
                  <div className="flex flex-wrap gap-5">
                    {model.buildMyHref ? <PlannerLink href={model.buildMyHref}>Open full Build My</PlannerLink> : null}
                    {model.lookBookHref ? <PlannerLink href={model.lookBookHref}>Open Look Book</PlannerLink> : null}
                  </div>
                </div>
                <div className="mt-7 grid border-l border-t border-black/16 lg:grid-cols-2">
                  {model.designChapters.map((chapter) => (
                    <label key={chapter.id} className="border-b border-r border-black/16 p-5">
                      <FieldLabel>{chapter.number} / {chapter.title}</FieldLabel>
                      <select
                        value={line.designSelections[chapter.id] ?? ""}
                        onChange={(event) => updateLine(line.id, (current) => ({ ...current, designSelections: { ...current.designSelections, [chapter.id]: event.target.value } }))}
                        className={selectClassName}
                      >
                        <option value="">Not selected</option>
                        {chapter.options.map((option) => <option key={option.id} value={option.id}>{option.label} · {option.status}</option>)}
                      </select>
                    </label>
                  ))}
                  <label className="border-b border-r border-black/16 p-5 lg:col-span-2">
                    <FieldLabel>Existing Look Book reference / customer note</FieldLabel>
                    <input
                      value={line.lookBookReference}
                      onChange={(event) => updateLine(line.id, (current) => ({ ...current, lookBookReference: event.target.value }))}
                      placeholder="Optional reference or note"
                      className="w-full bg-transparent text-base text-black outline-none placeholder:text-black/25"
                    />
                  </label>
                </div>
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

function OpportunityReport({ state, onRefine, catalog, corridors }: { state: PlannerState; onRefine: () => void; catalog: readonly PlannerCatalogItem[]; corridors: readonly FundingCorridor[] }) {
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const estimate = calculatePreliminaryEstimate(state.portfolio, catalog);
  const funding = matchFundingCorridors(state, corridors, catalog).filter((item) => item.relevance !== "Monitor");
  const readiness = getReadinessProfile(state, catalog);
  const designSelections = summary.lines.flatMap(({ line, model }) => model.designChapters.flatMap((chapter) => {
    const optionId = line.designSelections[chapter.id];
    const option = chapter.options.find((candidate) => candidate.id === optionId);
    return option ? [{ model: model.name, chapter: chapter.title, option: option.label }] : [];
  }));
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
          <button type="button" onClick={onRefine} className="inline-flex min-h-12 items-center justify-between gap-8 border border-black/24 px-5 text-[9px] font-semibold uppercase tracking-[0.16em]">Refine My Project <ArrowLeft aria-hidden="true" className="size-4" /></button>
          <button type="button" onClick={printReport} className="inline-flex min-h-12 items-center justify-between gap-8 bg-black px-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white">Download Preliminary Opportunity Report <FileDown aria-hidden="true" className="size-4" /></button>
          <a href={`mailto:hello@housedelivery.ca?subject=${encodeURIComponent(`House Delivery Review — ${state.community || "First Nations project"}`)}&body=${reviewBody}`} className="inline-flex min-h-12 items-center justify-between gap-8 border border-black px-5 text-[9px] font-semibold uppercase tracking-[0.16em]">Request House Delivery Review <ArrowRight aria-hidden="true" className="size-4" /></a>
        </div>
      </div>

      <article data-planner-report className="mt-16 bg-white text-black print:mt-0">
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
            {summary.lines.map(({ line, model }) => <div key={line.id} className="grid grid-cols-[1fr_auto] gap-5 border-b border-black/16 py-4 text-sm"><div><p className="font-medium">{model.name}</p><p className="mt-1 text-xs text-black/45">{model.family === "standardized-catalogue" ? "Standardized Catalogue Design" : "Custom Home"} / {model.squareFeet.toLocaleString()} sq. ft.</p></div><p className="text-right">{line.quantity} × {model.homesPerSelection} {model.homesPerSelection === 1 ? "home" : "homes"}<br /><span className="text-xs text-black/45">{plannerPhaseLabels[line.phase]}</span></p></div>)}
          </div>
        </ReportSection>

        <ReportSection number="03" title="Preliminary feasibility">
          <div className="grid border-l border-t border-black/16 sm:grid-cols-3">{[["Low", estimate.low], ["Base planning case", estimate.base], ["High", estimate.high]].map(([label, value]) => <dl key={label as string} className="border-b border-r border-black/16 p-5"><dt className="text-[8px] uppercase tracking-[0.16em] text-black/42">{label}</dt><dd className="mt-8 text-xl font-medium leading-tight">{formatPlanningValue(value as number | null)}</dd></dl>)}</div>
          <p className="mt-5 text-xs leading-5 text-black/52">Preliminary feasibility only—not a quotation. Potential funding has not been deducted. Design direction does not change pricing without a controlled commercial delta.</p>
        </ReportSection>

        <ReportSection number="04" title="Design direction">
          {designSelections.length ? <div className="grid gap-3 sm:grid-cols-2">{designSelections.map((selection) => <p key={`${selection.model}-${selection.chapter}`} className="border-t border-black/16 pt-3 text-sm"><span className="text-black/42">{selection.model} / {selection.chapter}</span><br />{selection.option} · Visual Direction</p>)}</div> : <p className="text-sm text-black/52">Design direction has not yet been recorded. Technical and project-specific approvals remain separate.</p>}
        </ReportSection>

        <ReportSection number="05" title="Major range drivers">
          <div className="grid gap-3 sm:grid-cols-2">{[["Site and servicing", labelValue(state.refinement.servicing)], ["Access and logistics", state.location || "Unknown / to confirm"], ["Accessibility", labelValue(state.refinement.accessibility)], ["Energy and resilience", labelValue(state.refinement.energyResilience)], ["Local delivery capacity", labelValue(state.refinement.localLabour)], ["Timing and phasing", labelValue(state.refinement.targetTiming)]].map(([label, value]) => <p key={label} className="border-t border-black/16 pt-3 text-sm"><span className="text-black/42">{label}</span><br />{value}</p>)}</div>
        </ReportSection>

        <ReportSection number="06" title="Scale and readiness">
          <div className="grid gap-x-8 sm:grid-cols-2">{readiness.map((item) => <div key={item.label} className="grid grid-cols-[auto_1fr] gap-3 border-t border-black/16 py-3"><span>{item.ready ? "●" : "○"}</span><p className="text-sm"><span className="font-medium">{item.label}</span><br /><span className="text-xs text-black/48">{item.detail}</span></p></div>)}</div>
        </ReportSection>

        <ReportSection number="07" title="Community, local and Canadian value">
          <div className="grid gap-5 sm:grid-cols-3">{[["Local labour", labelValue(state.refinement.localLabour)], ["Training / maintenance", labelValue(state.refinement.trainingObjectives)], ["Canadian / local value", labelValue(state.refinement.canadianValue)]].map(([label, value]) => <p key={label} className="border-t border-black/16 pt-3 text-sm"><span className="text-black/42">{label}</span><br />{value}</p>)}</div>
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
    </div>
  );
}

function ReportSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="border-b border-black/16 py-10 print:break-inside-avoid"><div className="mb-7 grid gap-3 sm:grid-cols-[4rem_1fr]"><p className="font-mono text-[9px] text-black/35">{number}</p><h3 className="text-2xl font-medium tracking-[-0.04em]">{title}</h3></div>{children}</section>;
}

export function FirstNationsProjectPlanner({ catalog, fundingCorridors }: { catalog: readonly PlannerCatalogItem[]; fundingCorridors: readonly FundingCorridor[] }) {
  const [state, setState] = useState<PlannerState>(defaultPlannerState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as PlannerState;
          if (parsed.version === 1 && parsed.audience === "first-nations") {
            setState(parsed);
          }
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

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
    window.localStorage.removeItem(STORAGE_KEY);
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

      <div className="mx-auto max-w-[1504px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28">
        {state.step === 0 ? <StartStep state={state} update={(patch) => setState((current) => ({ ...current, ...patch }))} /> : null}
        {state.step === 1 ? <PortfolioStep state={state} setState={setState} catalog={catalog} /> : null}
        {state.step === 2 ? <EstimatePanel state={state} catalog={catalog} /> : null}
        {state.step === 3 ? <RefineStep state={state} setState={setState} /> : null}
        {state.step === 4 ? <DesignStep state={state} setState={setState} catalog={catalog} /> : null}
        {state.step === 5 ? <FundingStep state={state} catalog={catalog} corridors={fundingCorridors} /> : null}
        {state.step === 6 ? <ScaleReadinessStep state={state} catalog={catalog} /> : null}
        {state.step === 7 ? <OpportunityReport state={state} onRefine={() => goToStep(3)} catalog={catalog} corridors={fundingCorridors} /> : null}

        <div className="planner-screen-only mt-20 flex flex-col-reverse gap-4 border-t border-black/16 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => goToStep(state.step - 1)} disabled={state.step === 0} className="inline-flex min-h-12 items-center gap-3 border border-black/22 px-5 text-[9px] font-semibold uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-30"><ArrowLeft aria-hidden="true" className="size-4" /> Previous</button>
            <button type="button" onClick={resetPlanner} className="inline-flex min-h-12 items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/42 hover:text-black"><RotateCcw aria-hidden="true" className="size-3.5" /> Start again</button>
          </div>
          {state.step < steps.length - 1 ? <div><button type="button" onClick={() => goToStep(state.step + 1)} disabled={!canContinue} className="inline-flex min-h-12 min-w-60 items-center justify-between gap-8 bg-black px-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:bg-black/25">{state.step === 2 ? "Refine My Project" : state.step === 6 ? "Create Opportunity Report" : "Continue"}<ArrowRight aria-hidden="true" className="size-4" /></button>{!canContinue ? <p className="mt-3 max-w-xs text-xs leading-5 text-black/45">{state.step === 0 ? "Add the community, location and approximate housing requirement to continue." : "Add at least one home model to continue."}</p> : null}</div> : null}
        </div>
      </div>
    </section>
  );
}
