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
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import {
  addPlannerDesignVariation,
  calculatePreliminaryEstimate,
  createDefaultPlannerState,
  createOpportunityReportReference,
  createPlannerDesignVariation,
  formatPlanningValue,
  formatProjectReviewContext,
  getAudienceFundingCorridors,
  getPlannerDesignProgress,
  getOpportunityReportFundingCorridors,
  getPortfolioSummary,
  getReadinessProfile,
  matchFundingCorridors,
  migratePlannerState,
  plannerAudienceLabels,
  reassignPlannerDesignQuantity,
  resizePlannerDesignVariations,
  type FundingCorridor,
  type FundingCorridorDecision,
  type PlannerCatalogItem,
  type PlannerAudience,
  type PlannerDesignVariation,
  type PlannerPhase,
  type PlannerPortfolioLine,
  type PlannerState,
} from "@/lib/project-planner";
import {
  buildPlannerDesignHref,
  buildPlannerHomeViewHref,
  getPlannerReturnHref,
  getPlannerReturnKey,
  getPlannerStorageKey,
  type PlannerDesignReturn,
  type PlannerDesignSession,
} from "@/lib/planner-design-session";

const plannerPhaseLabels = {
  "phase-1": "Active / First Build",
  "phase-2": "Near-Term / Next Build",
  future: "Future Pipeline",
} as const;

const fundingDecisionLabels: Record<FundingCorridorDecision, string> = {
  include: "Include in My Funding Review",
  "not-relevant": "Not Relevant",
};

const sharedSteps = [
  { label: "Project Intake", eyebrow: "Start" },
  { label: "My Project", eyebrow: "Build" },
  { label: "Quick Estimate", eyebrow: "Understand" },
  { label: "Refine Project", eyebrow: "Refine" },
  { label: "Design Direction", eyebrow: "Shape" },
  { label: "Funding Pathways", eyebrow: "Explore" },
  { label: "Scale & Readiness", eyebrow: "Prepare" },
  { label: "Opportunity Report", eyebrow: "Review" },
  { label: "Project Review", eyebrow: "Submit" },
] as const;

const firstNationsSteps = sharedSteps.map((step, index) =>
  index === 0 ? { ...step, label: "Community Need" } : step,
);

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

function ensureOpportunityReportReference(state: PlannerState) {
  return state.opportunityReportReference
    ? state
    : {
        ...state,
        opportunityReportReference: createOpportunityReportReference(),
      };
}

function getPlannerHomeName(name: string) {
  return name.replace(/^The\s+/i, "");
}

function getPlannerDesignSession(
  audience: PlannerAudience,
  projectName: string,
  line: PlannerPortfolioLine,
  model: PlannerCatalogItem,
  variation: PlannerDesignVariation,
): PlannerDesignSession {
  return {
    audience,
    projectName,
    lineId: line.id,
    variationId: variation.id,
    modelId: model.id,
    homeName: getPlannerHomeName(model.name),
    designLabel: variation.label,
    assignedQuantity: variation.assignedQuantity,
    deliveryGroup: plannerPhaseLabels[line.phase],
    returnHref: getPlannerReturnHref(audience, "planner-design-center"),
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

function audienceContextLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
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
  projectName,
  totalHomes,
  requestedQuantity,
  requestedPhase,
  audience,
}: {
  item: PlannerCatalogItem;
  line?: PlannerPortfolioLine;
  projectName: string;
  totalHomes: number;
  requestedQuantity: number;
  requestedPhase: PlannerPhase;
  audience: PlannerAudience;
}) {
  const variation = line?.designVariations[0];
  const session = line && variation
    ? getPlannerDesignSession(audience, projectName, line, item, variation)
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
        <PlannerLink
          href={buildPlannerHomeViewHref(item.viewHref, {
            audience,
            projectName,
            totalHomes,
            modelId: item.id,
            homeName: getPlannerHomeName(item.name),
            homeQuantity:
              (line?.quantity ?? requestedQuantity) * item.homesPerSelection,
            requestedQuantity: line?.quantity ?? requestedQuantity,
            phase: line?.phase ?? requestedPhase,
            returnHref:
              session?.returnHref ??
              getPlannerReturnHref(audience, "planner-workspace"),
            designSession: session,
          })}
          newTab={false}
        >
          View Home
        </PlannerLink>
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

type AudienceIntakeField = {
  key: string;
  label: string;
  target: "context" | "refinement" | "state";
  options: readonly (readonly [string, string])[];
};

const audienceIntakeFields: Record<
  Exclude<PlannerAudience, "first-nations">,
  readonly AudienceIntakeField[]
> = {
  developer: [
    { key: "landStatus", label: "Land / site control", target: "refinement", options: [["unknown", "Unknown / to confirm"], ["controlled", "Site controlled"], ["under-contract", "Under contract"], ["exploring", "Exploring sites"]] },
    { key: "affordability", label: "Housing / tenure approach", target: "refinement", options: [["unknown", "To be determined"], ["market-rental", "Market rental"], ["ownership", "For-sale / ownership"], ["mixed-income", "Mixed tenure"], ["community-rental", "Affordable / community rental"]] },
    { key: "servicing", label: "Servicing status", target: "refinement", options: [["unknown", "Unknown / to confirm"], ["serviced-road-access", "Serviced"], ["partial-servicing", "Partially serviced"], ["unserviced", "Unserviced"]] },
    { key: "deliveryHorizon", label: "Timing / phasing", target: "state", options: [["unknown", "Unknown / to confirm"], ["immediate", "First build ready to advance"], ["phased", "Phased delivery"], ["future-pipeline", "Future pipeline"]] },
    { key: "developmentReadiness", label: "Development readiness", target: "context", options: [["unknown", "Early exploration"], ["concept", "Concept / due diligence"], ["approvals", "Approvals work underway"], ["procurement", "Preparing for procurement"]] },
  ],
  "general-contractor": [
    { key: "clientProjectType", label: "Client / project type", target: "context", options: [["unknown", "To be confirmed"], ["private", "Private developer / landowner"], ["indigenous", "First Nation / Indigenous community"], ["public", "Municipality / public agency"], ["non-profit", "Non-profit / community housing"]] },
    { key: "procurementRole", label: "Procurement role", target: "context", options: [["unknown", "To be confirmed"], ["prime-contractor", "Prime / general contractor"], ["construction-manager", "Construction manager"], ["design-build", "Design-build team"], ["early-partner", "Early delivery partner"]] },
    { key: "siteReadiness", label: "Site readiness", target: "context", options: [["unknown", "Unknown / to confirm"], ["early", "Early site review"], ["preparation", "Site preparation planning"], ["ready", "Site ready / near ready"]] },
    { key: "logisticsRequirements", label: "Logistics / delivery requirements", target: "context", options: [["unknown", "To be confirmed"], ["standard", "Standard road access"], ["constrained", "Constrained access"], ["remote", "Remote / special logistics"]] },
    { key: "assemblyResponsibilities", label: "Assembly / local trade responsibilities", target: "context", options: [["unknown", "To be confirmed"], ["gc-led", "GC-led assembly and trades"], ["shared", "Shared delivery responsibilities"], ["support-required", "House Delivery support required"]] },
    { key: "deliveryHorizon", label: "Timing / phasing", target: "state", options: [["unknown", "Unknown / to confirm"], ["immediate", "Immediate project"], ["phased", "Phased delivery"], ["future-pipeline", "Future pipeline"]] },
  ],
  "municipality-non-profit": [
    { key: "housingNeed", label: "Housing need", target: "context", options: [["unknown", "To be confirmed"], ["affordable-rental", "Affordable rental"], ["supportive", "Supportive / specialized housing"], ["workforce", "Workforce housing"], ["mixed", "Mixed housing need"]] },
    { key: "landStatus", label: "Land / site control", target: "refinement", options: [["unknown", "Unknown / to confirm"], ["controlled", "Site controlled"], ["partnership", "Partner-controlled site"], ["exploring", "Exploring sites"]] },
    { key: "affordability", label: "Housing / affordability approach", target: "refinement", options: [["unknown", "To be determined"], ["community-rental", "Community / non-market rental"], ["deeply-affordable", "Deep affordability"], ["mixed-income", "Mixed-income"], ["ownership", "Ownership pathway"]] },
    { key: "fundingStatus", label: "Funding status", target: "context", options: [["unknown", "To be confirmed"], ["exploring", "Funding options being explored"], ["applications", "Applications planned / underway"], ["committed", "Some funding committed"]] },
    { key: "servicing", label: "Servicing", target: "refinement", options: [["unknown", "Unknown / to confirm"], ["serviced-road-access", "Serviced"], ["partial-servicing", "Partially serviced"], ["unserviced", "Unserviced"]] },
    { key: "deliveryHorizon", label: "Timing / delivery readiness", target: "state", options: [["unknown", "Unknown / to confirm"], ["immediate", "Ready to advance"], ["phased", "Phased delivery"], ["future-pipeline", "Future pipeline"]] },
  ],
};

function AudienceStartStep({
  state,
  setState,
}: {
  state: PlannerState;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
}) {
  if (state.audience === "first-nations") return null;
  const fields = audienceIntakeFields[state.audience];

  function updateField(field: AudienceIntakeField, value: string) {
    setState((current) => {
      if (field.target === "context") {
        return {
          ...current,
          audienceContext: { ...current.audienceContext, [field.key]: value },
        };
      }
      if (field.target === "refinement") {
        return {
          ...current,
          refinement: { ...current.refinement, [field.key]: value },
        };
      }
      return {
        ...current,
        deliveryHorizon: value,
        refinement: { ...current.refinement, targetTiming: value },
      };
    });
  }

  return (
    <div>
      <StepHeader
        eyebrow={`01 / ${plannerAudienceLabels[state.audience]}`}
        title="Begin with the project."
        intro="Create a short working picture of the site, housing programme and delivery readiness. Every answer can be refined as the project develops."
      />
      <div className="mt-16 grid border-l border-t border-black/16 sm:grid-cols-2">
        <label className="border-b border-r border-black/16 p-5 sm:p-7">
          <FieldLabel>Project / organization name</FieldLabel>
          <input
            value={state.community}
            onChange={(event) =>
              setState((current) => ({ ...current, community: event.target.value }))
            }
            placeholder="Working project name"
            className="w-full bg-transparent text-xl tracking-[-0.025em] text-black outline-none placeholder:text-black/25"
          />
        </label>
        <label className="border-b border-r border-black/16 p-5 sm:p-7">
          <FieldLabel>Project location</FieldLabel>
          <input
            value={state.location}
            onChange={(event) =>
              setState((current) => ({ ...current, location: event.target.value }))
            }
            placeholder="Community, region, province"
            className="w-full bg-transparent text-xl tracking-[-0.025em] text-black outline-none placeholder:text-black/25"
          />
        </label>
        <label className="border-b border-r border-black/16 p-5 sm:p-7">
          <FieldLabel>Approximate number of homes</FieldLabel>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={state.approximateHomes}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                approximateHomes: event.target.value,
              }))
            }
            placeholder="e.g. 24"
            className="w-full bg-transparent text-xl tracking-[-0.025em] text-black outline-none placeholder:text-black/25"
          />
        </label>
        {fields.map((field) => {
          const value =
            field.target === "context"
              ? state.audienceContext[field.key] ?? "unknown"
              : field.target === "refinement"
                ? String(state.refinement[field.key as RefinementKey])
                : state.deliveryHorizon;
          return (
            <label key={field.key} className="border-b border-r border-black/16 p-5 sm:p-7">
              <FieldLabel>{field.label}</FieldLabel>
              <select
                value={value}
                onChange={(event) => updateField(field, event.target.value)}
                className={selectClassName}
              >
                {field.options.map(([optionValue, label]) => (
                  <option key={optionValue} value={optionValue}>{label}</option>
                ))}
              </select>
            </label>
          );
        })}
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
              audience={state.audience}
              projectName={state.community}
              totalHomes={summary.totalHomes}
              requestedQuantity={quantities[item.id] ?? 1}
              requestedPhase={phases[item.id] ?? "phase-1"}
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
  const isFirstNations = state.audience === "first-nations";
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
    ["localLabour", isFirstNations ? "Local & Indigenous participation" : "Delivery / trade capacity", [["unknown", "To be determined"], ["explore", isFirstNations ? "Interested in local / Indigenous labour" : "Local trade participation to explore"], ["available", "Local crew or trades identified"], ["training-interest", "Interested in training"], ["partner-required", "Need assembly / delivery support"]]],
    ["trainingObjectives", isFirstNations ? "Assembly / training / maintenance" : "Assembly / maintenance responsibilities", [["unknown", "To be determined"], ["assembly", "Local assembly participation"], ["training", "Training interest"], ["maintenance", "Long-term maintenance capability"], ["support-required", "House Delivery / project delivery support required"]]],
    ["targetTiming", "Target timing", [["unknown", "Unknown / to confirm"], ["within-12-months", "Within 12 months"], ["12-24-months", "12–24 months"], ["24-plus-months", "24+ months"], ["phased", "Phased pipeline"]]],
  ] as const;

  return (
    <div>
      <StepHeader
        eyebrow="04 / Refine project"
        title="Refine Your Project"
        intro={isFirstNations
          ? "These answers help House Delivery better understand the community, site, delivery needs and funding context. Every answer can remain unknown while the project is still taking shape."
          : "These answers help House Delivery better understand the site, housing approach, delivery responsibilities and commercial context. Every answer can remain unknown while the project is still taking shape."}
      />
      {isFirstNations ? <fieldset className="mt-16 border-t border-black/16 pt-6">
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
      </fieldset> : null}
      <div className={cn("grid border-l border-t border-black/16 md:grid-cols-2", isFirstNations ? "mt-10" : "mt-16")}>
        {fields.filter(([key]) => isFirstNations || key !== "culturalPriorities").map(([key, label, options]) => (
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
          placeholder={isFirstNations
            ? "Add community priorities, known constraints, partners, reference material or questions for review."
            : "Add known constraints, delivery responsibilities, partners, reference material or questions for review."}
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
    <div id="planner-design-center" className="scroll-mt-28">
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
            <div className="sm:text-right">
              <PlannerLink
                href={buildPlannerDesignHref(
                  nextDesign.model.buildMyHref!,
                  getPlannerDesignSession(
                    state.audience,
                    state.community,
                    nextDesign.line,
                    nextDesign.model,
                    nextDesign.variation,
                  ),
                )}
                newTab={false}
              >
                Continue to Next Home Design
              </PlannerLink>
              <p className="mt-2 text-[10px] text-black/44">
                Next: {getPlannerHomeName(nextDesign.model.name)} — {nextDesign.variation.label}
              </p>
            </div>
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
                    const session = getPlannerDesignSession(
                      state.audience,
                      state.community,
                      line,
                      model,
                      variation,
                    );
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
                            <h4 className="mt-2 text-2xl font-medium tracking-[-0.04em]">{variation.projectDesignName ?? `${getPlannerHomeName(model.name)} — ${variation.label}`}</h4>
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

function FundingStep({
  state,
  setState,
  catalog,
  corridors,
}: {
  state: PlannerState;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
  catalog: readonly PlannerCatalogItem[];
  corridors: readonly FundingCorridor[];
}) {
  const audienceCorridors = getAudienceFundingCorridors(
    state.audience,
    corridors,
  );
  const matches = matchFundingCorridors(state, audienceCorridors, catalog);
  const ordered = [...matches].sort((a, b) => {
    const rank = {
      "Strong corridor to explore": 0,
      "Relevant corridor": 1,
      "Potential corridor": 2,
    } as const;
    return rank[a.relevance] - rank[b.relevance];
  });

  function selectCorridor(
    corridorId: string,
    decision: FundingCorridorDecision,
  ) {
    setState((current) => ({
      ...current,
      fundingCorridorDecisions: {
        ...current.fundingCorridorDecisions,
        [corridorId]: decision,
      },
    }));
  }

  return (
    <div>
      <StepHeader
        eyebrow={state.audience === "first-nations" ? "06 / Funding pathways" : "06 / Funding and financing context"}
        title={state.audience === "first-nations" ? "Corridors to explore." : "Potential pathways to review."}
        intro={state.audience === "first-nations"
          ? "These contextual matches support an early funding conversation. They are not eligibility findings, approvals or guarantees, and no potential funding is deducted from project feasibility."
          : "These contextual pathways support an early owner, proponent and financing conversation. They are not eligibility findings, approvals or guarantees, and no potential funding is deducted from project feasibility."}
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
              <div
                className="mt-7 flex flex-col gap-2 border-t border-black/12 pt-5 sm:flex-row sm:flex-wrap"
                role="group"
                aria-label={`Follow-up choice for ${corridor.title}`}
              >
                {(Object.entries(fundingDecisionLabels) as readonly [
                  FundingCorridorDecision,
                  string,
                ][]).map(([decision, label]) => {
                  const isSelected =
                    state.fundingCorridorDecisions[corridor.id] === decision;
                  return (
                    <button
                      key={decision}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => selectCorridor(corridor.id, decision)}
                      className={cn(
                        "min-h-11 border px-4 text-left text-[9px] font-semibold uppercase tracking-[0.14em] transition-colors",
                        isSelected
                          ? "border-black bg-black text-white"
                          : "border-black/18 text-black/52 hover:border-black hover:text-black",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
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
  onBeginReview,
  onEditProject,
  onPrevious,
  onReset,
  catalog,
  corridors,
}: {
  state: PlannerState;
  onBeginReview: () => void;
  onEditProject: () => void;
  onPrevious: () => void;
  onReset: () => void;
  catalog: readonly PlannerCatalogItem[];
  corridors: readonly FundingCorridor[];
}) {
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const estimate = calculatePreliminaryEstimate(state.portfolio, catalog);
  const funding = getOpportunityReportFundingCorridors(
    state,
    getAudienceFundingCorridors(state.audience, corridors),
    catalog,
  );
  const readiness = getReadinessProfile(state, catalog);
  const savedDesigns = summary.lines.flatMap(({ line, model }) =>
    line.designVariations.flatMap((variation) =>
      variation.status === "complete"
        ? [{ model: model.name, variation }]
        : [],
    ),
  );
  const missingInformation = readiness.filter((item) => !item.ready).map((item) => item.label);

  function printReport() {
    const previousTitle = document.title;
    document.title = `${state.community || "Housing Project"} — Preliminary Opportunity Report`;
    window.print();
    document.title = previousTitle;
  }

  function viewReport() {
    const report = document.getElementById("planner-opportunity-report");
    report?.scrollIntoView({ behavior: "smooth", block: "start" });
    report?.focus({ preventScroll: true });
  }

  return (
    <div>
      <div className="planner-screen-only">
        <StepHeader eyebrow="08 / Preliminary opportunity report" title="A clearer next conversation." intro="This report carries the opportunity, portfolio, planning basis, contextual funding corridors and missing information into a structured House Delivery review." />
        <div data-planner-report-controls="top" className="mt-10 grid gap-3 lg:grid-cols-3">
          <button type="button" onClick={viewReport} className="inline-flex min-h-14 items-center justify-between gap-8 border border-black/28 px-5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-black/68 transition-colors hover:border-black hover:text-black">View Opportunity Report <ArrowRight aria-hidden="true" className="size-4" /></button>
          <button type="button" onClick={printReport} data-planner-report-download="top" className="inline-flex min-h-14 items-center justify-between gap-8 border border-black px-5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-black transition-colors hover:bg-black hover:text-white">Download Opportunity Report <FileDown aria-hidden="true" className="size-4" /></button>
          <button type="button" onClick={onBeginReview} className="inline-flex min-h-14 items-center justify-between gap-8 bg-black px-5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-black/78">Begin Project Review <ArrowRight aria-hidden="true" className="size-4" /></button>
        </div>
      </div>

      <article id="planner-opportunity-report" tabIndex={-1} data-planner-report className="mt-16 scroll-mt-28 bg-white px-6 text-black outline-none sm:px-10 lg:px-16 xl:px-20 print:mt-0">
        <header className="border-y border-black/18 py-9">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/45">House Delivery / Preliminary Opportunity Report</p>
          {state.audience !== "first-nations" ? <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">{plannerAudienceLabels[state.audience]}</p> : null}
          <h2 className="mt-6 max-w-5xl text-[clamp(3.4rem,7vw,7.5rem)] font-medium leading-[0.82] tracking-[-0.075em]">{state.community || (state.audience === "first-nations" ? "Community housing opportunity" : "Housing project opportunity")}</h2>
          <div className="mt-8 grid gap-3 text-xs uppercase tracking-[0.13em] text-black/48 sm:grid-cols-4"><p>{state.location || "Location to confirm"}</p><p>{summary.totalHomes} working homes</p><p>Confidence / Early</p><p>{state.opportunityReportReference || "Reference pending"}</p></div>
        </header>

        <ReportSection number="01" title="Opportunity">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[["Housing requirement", state.approximateHomes ? `Approximately ${state.approximateHomes}` : "To confirm"], ["Working portfolio", `${summary.totalHomes} homes`], ["Sites", labelValue(state.sitePattern)], ["Horizon", labelValue(state.deliveryHorizon)]].map(([label, value]) => <dl key={label} className="border-t border-black/16 pt-4"><dt className="text-[8px] uppercase tracking-[0.16em] text-black/42">{label}</dt><dd className="mt-3 text-xl font-medium tracking-[-0.03em]">{value}</dd></dl>)}
          </div>
          {state.audience !== "first-nations" && Object.keys(state.audienceContext).length ? (
            <div className="mt-8 grid gap-5 border-t border-black/16 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(state.audienceContext).map(([key, value]) => (
                <p key={key} className="text-sm">
                  <span className="text-black/42">{audienceContextLabel(key)}</span>
                  <br />
                  {labelValue(value)}
                </p>
              ))}
            </div>
          ) : null}
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
          {savedDesigns.length ? <div className="grid gap-3 sm:grid-cols-2">{savedDesigns.map(({ model, variation }) => <p key={variation.id} className="border-t border-black/16 pt-3 text-sm"><span className="text-black/42">{variation.projectDesignName ?? `${getPlannerHomeName(model)} — ${variation.label}`}</span><br />Assigned to {variation.assignedQuantity} {variation.assignedQuantity === 1 ? "home" : "homes"}{variation.lookBookReference ? ` · ${variation.lookBookReference}` : ""}</p>)}</div> : <p className="text-sm text-black/52">Design direction has not yet been recorded. Technical and project-specific approvals remain separate.</p>}
        </ReportSection>

        <ReportSection number="05" title="Major range drivers">
          <div className="grid gap-3 sm:grid-cols-2">{[["Site and servicing", labelValue(state.refinement.servicing)], ["Access and logistics", state.location || "Unknown / to confirm"], ["Accessibility", labelValue(state.refinement.accessibility)], ["Energy and resilience", labelValue(state.refinement.energyResilience)], ["Local delivery capacity", labelValue(state.refinement.localLabour)], ["Timing and phasing", labelValue(state.refinement.targetTiming)]].map(([label, value]) => <p key={label} className="border-t border-black/16 pt-3 text-sm"><span className="text-black/42">{label}</span><br />{value}</p>)}</div>
        </ReportSection>

        <ReportSection number="06" title="Scale and readiness">
          <div className="grid gap-x-8 sm:grid-cols-2">{readiness.map((item) => <div key={item.label} className="grid grid-cols-[auto_1fr] gap-3 border-t border-black/16 py-3"><span>{item.ready ? "●" : "○"}</span><p className="text-sm"><span className="font-medium">{item.label}</span><br /><span className="text-xs text-black/48">{item.detail}</span></p></div>)}</div>
        </ReportSection>

        <ReportSection number="07" title={state.audience === "first-nations" ? "Community participation and capability" : state.audience === "developer" ? "Development and delivery capability" : state.audience === "general-contractor" ? "Procurement, logistics and delivery capability" : "Community delivery and operating capability"}>
          <div className="grid gap-5 sm:grid-cols-2">{[[state.audience === "first-nations" ? "Local & Indigenous participation" : "Delivery / trade capacity", labelValue(state.refinement.localLabour)], [state.audience === "first-nations" ? "Assembly / training / maintenance" : "Assembly / maintenance responsibilities", labelValue(state.refinement.trainingObjectives)]].map(([label, value]) => <p key={label} className="border-t border-black/16 pt-3 text-sm"><span className="text-black/42">{label}</span><br />{value}</p>)}</div>
        </ReportSection>

        <ReportSection number="08" title={state.audience === "first-nations" ? "Funding corridors" : "Funding and financing context"}>
          <div className="space-y-4">{funding.map((item) => <div key={item.id} className="border-t border-black/16 pt-3"><p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-black/42">{item.relevance}{item.decision ? ` / ${fundingDecisionLabels[item.decision]}` : ""}</p><p className="mt-2 text-sm font-medium">{item.title}</p><p className="mt-1 text-xs leading-5 text-black/50">{item.confirmationNeeded}</p><p className="mt-1 break-all text-[9px] text-black/38">{item.officialSource}</p></div>)}</div>
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
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <button
            type="button"
            onClick={onBeginReview}
            className="inline-flex min-h-16 items-center justify-between gap-8 bg-black px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white transition-colors hover:bg-black/78 lg:col-span-2"
          >
            Begin Project Review <ArrowRight aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            onClick={printReport}
            data-planner-report-download="bottom"
            className="inline-flex min-h-14 items-center justify-between gap-8 border border-black px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-black transition-colors hover:bg-black hover:text-white"
          >
            Download Opportunity Report <FileDown aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            onClick={onEditProject}
            className="inline-flex min-h-14 items-center justify-between gap-8 border border-black/18 px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-black/58 transition-colors hover:border-black hover:text-black"
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

      <button
        type="button"
        onClick={printReport}
        data-planner-report-download="persistent"
        className="planner-screen-only fixed bottom-3 right-3 z-40 inline-flex min-h-11 max-w-[calc(100vw-1.5rem)] items-center gap-3 border border-black/18 bg-white px-4 text-[9px] font-semibold uppercase tracking-[0.15em] text-black shadow-[0_12px_36px_rgba(0,0,0,0.16)] transition-colors hover:border-black sm:bottom-6 sm:right-6"
      >
        <FileDown aria-hidden="true" className="size-3.5" /> Download Report
      </button>
    </div>
  );
}

function isAcceptedProjectReviewResponse(
  value: unknown,
): value is { accepted: true } {
  return (
    typeof value === "object" &&
    value !== null &&
    "accepted" in value &&
    value.accepted === true
  );
}

function ProjectReviewStep({
  state,
  catalog,
  corridors,
  onViewReport,
  onEditProject,
}: {
  state: PlannerState;
  catalog: readonly PlannerCatalogItem[];
  corridors: readonly FundingCorridor[];
  onViewReport: () => void;
  onEditProject: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const submissionInFlight = useRef(false);
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const readiness = getReadinessProfile(state, catalog);
  const includedFunding = matchFundingCorridors(
    state,
    getAudienceFundingCorridors(state.audience, corridors),
    catalog,
  ).filter(
    (corridor) => state.fundingCorridorDecisions[corridor.id] === "include",
  );
  const completedDesigns = summary.lines.flatMap(({ line, model }) =>
    line.designVariations.flatMap((variation) =>
      variation.status === "complete" ? [{ model, variation }] : [],
    ),
  );
  const reviewContext = formatProjectReviewContext(state, catalog, corridors);

  async function submitProjectReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current) return;

    submissionInFlight.current = true;
    setSubmitting(true);
    setSubmissionError("");
    const formData = new FormData(event.currentTarget);
    const readValue = (name: string) => {
      const value = formData.get(name);
      return typeof value === "string" ? value.trim() : "";
    };

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: readValue("firstName"),
          lastName: readValue("lastName"),
          email: readValue("email"),
          phone: readValue("phone"),
          model: "",
          location: state.location,
          timeline:
            state.refinement.targetTiming === "unknown"
              ? ""
              : labelValue(state.refinement.targetTiming),
          notes: readValue("reviewNotes"),
          company: readValue("company"),
          plannerProject: state.community,
          plannerReference: state.opportunityReportReference,
          plannerContext: reviewContext,
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok || !isAcceptedProjectReviewResponse(result)) {
        throw new Error("Project review delivery failed.");
      }
      setSubmitted(true);
    } catch {
      setSubmissionError(
        "We couldn’t send this project review right now. Your Planner remains saved on this device; please try again shortly.",
      );
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div data-planner-project-review>
      <StepHeader
        eyebrow="09 / Project review"
        title="Carry the full project forward."
        intro="This is the project-aware review step. Your opportunity, portfolio, delivery groups, design records, refinement answers, funding-review choices and readiness profile are attached to the request below."
      />

      <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Opportunity Report", state.opportunityReportReference],
          [state.audience === "first-nations" ? "Community / project" : "Project / organization", state.community],
          ["Working portfolio", `${summary.totalHomes} homes / ${summary.modelCount} home types`],
          [state.audience === "first-nations" ? "Funding review" : "Funding / financing review", `${includedFunding.length} selected corridors`],
        ].map(([label, value]) => (
          <dl key={label} className="border-t border-black/18 pt-4">
            <dt className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">{label}</dt>
            <dd className="mt-3 text-sm font-medium leading-6">{value || "To confirm"}</dd>
          </dl>
        ))}
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <section>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">Portfolio, delivery groups & Look Books</p>
          <div className="mt-5 border-t border-black/16">
            {summary.lines.map(({ line, model }) => (
              <div key={line.id} className="border-b border-black/16 py-5">
                <div className="flex items-start justify-between gap-5 text-sm">
                  <p className="font-medium">{model.name}</p>
                  <p className="text-right">{line.quantity * model.homesPerSelection} homes<br /><span className="text-xs text-black/45">{plannerPhaseLabels[line.phase]}</span></p>
                </div>
                {line.designVariations.map((variation) => (
                  <p key={variation.id} className="mt-3 text-xs leading-5 text-black/52">
                    {variation.projectDesignName ?? `${getPlannerHomeName(model.name)} — ${variation.label}`} · Assigned to {variation.assignedQuantity} {variation.assignedQuantity === 1 ? "home" : "homes"} · {variation.status === "complete" ? `Complete${variation.lookBookReference ? ` / ${variation.lookBookReference}` : ""}` : "Design outstanding"}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">{state.audience === "first-nations" ? "Funding review & readiness" : "Funding / financing context & readiness"}</p>
          <div className="mt-5 border-t border-black/16">
            {includedFunding.length ? includedFunding.map((corridor) => (
              <p key={corridor.id} className="border-b border-black/16 py-4 text-sm">
                {corridor.title}<br /><span className="text-xs leading-5 text-black/45">Included for non-binding review · {corridor.relevance}</span>
              </p>
            )) : <p className="border-b border-black/16 py-4 text-sm text-black/48">No funding corridors selected for review.</p>}
          </div>
          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            {readiness.map((item) => (
              <p key={item.label} className="border-t border-black/14 pt-3 text-xs leading-5">
                <span className="font-medium">{item.ready ? "●" : "○"} {item.label}</span><br /><span className="text-black/45">{item.detail}</span>
              </p>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-14 border-y border-black/18 py-9 sm:py-12">
        {submitted ? (
          <div role="status" className="max-w-3xl">
            <p className="inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/48"><Check aria-hidden="true" className="size-4" /> Project review received</p>
            <h3 className="mt-5 text-3xl font-medium tracking-[-0.045em] sm:text-5xl">Your Planner record has moved forward intact.</h3>
            <p className="mt-5 text-sm leading-6 text-black/55">House Delivery received the project record associated with {state.opportunityReportReference}. Your local Planner draft remains available for reference or editing.</p>
          </div>
        ) : (
          <form onSubmit={submitProjectReview} className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">Project review contact</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-black/52">Add the contact for this review. The project record above—not a blank generic inquiry—will be sent with the request.</p>
            </div>
            <label className="form-field"><span>First name</span><input name="firstName" autoComplete="given-name" required /></label>
            <label className="form-field"><span>Last name</span><input name="lastName" autoComplete="family-name" required /></label>
            <label className="form-field"><span>Email address</span><input type="email" name="email" autoComplete="email" required /></label>
            <label className="form-field"><span>Phone</span><input type="tel" name="phone" autoComplete="tel" /></label>
            <label className="form-field sm:col-span-2"><span>Anything else for this review?</span><textarea name="reviewNotes" rows={3} placeholder="Optional final context for the House Delivery team" /></label>
            <label className="hidden" aria-hidden="true"><span>Company</span><input name="company" tabIndex={-1} autoComplete="off" /></label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={submitting} aria-busy={submitting} className="inline-flex min-h-16 w-full items-center justify-between gap-8 bg-black px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white transition-colors hover:bg-black/78 disabled:cursor-wait disabled:opacity-60">
                {submitting ? "Sending Project Review…" : "Submit Project Review"}<ArrowRight aria-hidden="true" className="size-4" />
              </button>
              {submissionError ? <p role="alert" className="mt-4 text-xs leading-5 text-black/60">{submissionError}</p> : null}
              <p className="mt-4 text-[10px] leading-4 text-black/40">This request begins a non-binding project review. It is not a quotation, funding decision, approval or commitment to deliver.</p>
            </div>
          </form>
        )}
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={onViewReport} className="inline-flex min-h-12 items-center justify-between gap-7 border border-black/24 px-5 text-left text-[9px] font-semibold uppercase tracking-[0.16em]">View Opportunity Report <ArrowLeft aria-hidden="true" className="size-4" /></button>
        <button type="button" onClick={onEditProject} className="inline-flex min-h-12 items-center justify-between gap-7 px-5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-black/48 hover:text-black">View / Edit My Project <ArrowRight aria-hidden="true" className="size-4" /></button>
      </div>
      <span className="sr-only">{completedDesigns.length} completed design groups carried into project review.</span>
    </div>
  );
}

function ReportSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="border-b border-black/16 py-10 print:break-inside-avoid"><div className="mb-7 grid gap-3 sm:grid-cols-[4rem_1fr]"><p className="font-mono text-[9px] text-black/35">{number}</p><h3 className="text-2xl font-medium tracking-[-0.04em]">{title}</h3></div>{children}</section>;
}

export function FirstNationsProjectPlanner({
  catalog,
  fundingCorridors,
  initialAudience = "first-nations",
}: {
  catalog: readonly PlannerCatalogItem[];
  fundingCorridors: readonly FundingCorridor[];
  initialAudience?: PlannerAudience;
}) {
  const storageKey = getPlannerStorageKey(initialAudience);
  const returnKey = getPlannerReturnKey(initialAudience);
  const steps = initialAudience === "first-nations" ? firstNationsSteps : sharedSteps;
  const [state, setState] = useState<PlannerState>(() =>
    createDefaultPlannerState(initialAudience),
  );
  const [hydrated, setHydrated] = useState(false);
  const [returnNotice, setReturnNotice] = useState<string>();

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = window.localStorage.getItem(storageKey);
        const migrated = saved ? migratePlannerState(JSON.parse(saved)) : undefined;
        const restored =
          migrated?.audience === initialAudience
            ? migrated
            : createDefaultPlannerState(initialAudience);
        const returnedValue = window.localStorage.getItem(returnKey);
        const returned = returnedValue
          ? (JSON.parse(returnedValue) as PlannerDesignReturn)
          : undefined;
        const returnedAudience = returned?.audience ?? "first-nations";

        if (
          restored &&
          returnedAudience === initialAudience &&
          returned?.lineId &&
          returned.variationId
        ) {
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
                          projectDesignName:
                            returned.configuration.lookBookPersonalization
                              ?.projectDesignName ??
                            variation.projectDesignName ??
                            `${returned.homeName} — ${returned.designLabel}`,
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
            storageKey,
            JSON.stringify(returnedState),
          );
          setState(returnedState);
          const configurableModelIds = new Set(
            catalog
              .filter((model) => model.designChapters.length > 0)
              .map((model) => model.id),
          );
          const nextDesign = portfolio
            .filter((line) => configurableModelIds.has(line.modelId))
            .flatMap((line) =>
              line.designVariations.map((variation) => ({ line, variation })),
            )
            .find(({ variation }) => variation.status !== "complete");
          const nextHome = nextDesign
            ? catalog.find((model) => model.id === nextDesign.line.modelId)
            : undefined;
          setReturnNotice(
            `${returned.homeName} — ${returned.designLabel} is saved and assigned to ${returned.assignedQuantity} ${returned.assignedQuantity === 1 ? "home" : "homes"}.${nextHome ? ` Next: ${getPlannerHomeName(nextHome.name)} — ${nextDesign?.variation.label}.` : " All project design groups are complete."}`,
          );
          window.localStorage.removeItem(returnKey);
          window.requestAnimationFrame(() => {
            document
              .getElementById(
                `planner-design-${nextDesign?.variation.id ?? returned.variationId}`,
              )
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        } else if (restored) {
          setState(
            restored.step >= 7
              ? ensureOpportunityReportReference(restored)
              : restored,
          );
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
  }, [catalog, initialAudience, returnKey, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Private browsing or a full storage quota should not block the planner.
    }
  }, [hydrated, state, storageKey]);

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

  function goToStep(step: number, focusTargetId?: string) {
    setState((current) => {
      const nextState = {
        ...current,
        step: Math.min(Math.max(step, 0), steps.length - 1),
      };
      return nextState.step >= 7
        ? ensureOpportunityReportReference(nextState)
        : nextState;
    });
    window.requestAnimationFrame(() => {
      const target = document.getElementById(
        focusTargetId ?? "planner-workspace",
      );
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (focusTargetId) target?.focus({ preventScroll: true });
    });
  }

  function resetPlanner() {
    if (!window.confirm("Clear this local planner draft and start again?")) return;
    setState(createDefaultPlannerState(initialAudience));
    setReturnNotice(undefined);
    window.localStorage.removeItem(storageKey);
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
        {state.step === 0 && state.audience === "first-nations" ? <StartStep state={state} update={(patch) => setState((current) => ({ ...current, ...patch }))} /> : null}
        {state.step === 0 && state.audience !== "first-nations" ? <AudienceStartStep state={state} setState={setState} /> : null}
        {state.step === 1 ? <PortfolioStep state={state} setState={setState} catalog={catalog} /> : null}
        {state.step === 2 ? <EstimatePanel state={state} catalog={catalog} /> : null}
        {state.step === 3 ? <RefineStep state={state} setState={setState} /> : null}
        {state.step === 4 ? <DesignStep state={state} setState={setState} catalog={catalog} returnNotice={returnNotice} onContinue={() => goToStep(5)} /> : null}
        {state.step === 5 ? <FundingStep state={state} setState={setState} catalog={catalog} corridors={fundingCorridors} /> : null}
        {state.step === 6 ? <ScaleReadinessStep state={state} catalog={catalog} /> : null}
        {state.step === 7 ? <OpportunityReport state={state} onBeginReview={() => goToStep(8)} onEditProject={() => goToStep(1)} onPrevious={() => goToStep(6)} onReset={resetPlanner} catalog={catalog} corridors={fundingCorridors} /> : null}
        {state.step === 8 ? <ProjectReviewStep state={state} catalog={catalog} corridors={fundingCorridors} onViewReport={() => goToStep(7, "planner-opportunity-report")} onEditProject={() => goToStep(1)} /> : null}

        {state.step < 7 ? <div className="planner-screen-only mt-20 flex flex-col-reverse gap-4 border-t border-black/16 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => goToStep(state.step - 1)} disabled={state.step === 0} className="inline-flex min-h-12 items-center gap-3 border border-black/22 px-5 text-[9px] font-semibold uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-30"><ArrowLeft aria-hidden="true" className="size-4" /> Previous</button>
            <button type="button" onClick={resetPlanner} className="inline-flex min-h-12 items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/42 hover:text-black"><RotateCcw aria-hidden="true" className="size-3.5" /> Start again</button>
          </div>
          <div><button type="button" onClick={() => goToStep(state.step + 1)} disabled={!canContinue} className="inline-flex min-h-12 min-w-60 items-center justify-between gap-8 bg-black px-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:bg-black/25">{state.step === 2 ? "Refine My Project" : state.step === 6 ? "Create Opportunity Report" : "Continue"}<ArrowRight aria-hidden="true" className="size-4" /></button>{!canContinue ? <p className="mt-3 max-w-xs text-xs leading-5 text-black/45">{state.step === 0 ? (state.audience === "first-nations" ? "Add the community, location and approximate housing requirement to continue." : "Add the project name, location and approximate number of homes to continue.") : "Add at least one home model to continue."}</p> : null}</div>
        </div> : null}
      </div>
    </section>
  );
}

export const ProjectPortfolioPlanner = FirstNationsProjectPlanner;
