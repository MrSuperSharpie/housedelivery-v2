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
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { CulturalDesignReport } from "@/components/cultural-design-report";
import { FirstNationsExteriorDirectionCard } from "@/components/first-nations-exterior-direction-card";
import { getCulturalDesignImage } from "@/data/first-nations-cultural-design";
import { cn } from "@/lib/cn";
import {
  addPlannerDesignVariation,
  calculatePreliminaryEstimate,
  communityWorkforceCapacityOptions,
  createDefaultPlannerState,
  createOpportunityReportReference,
  createPlannerDesignVariation,
  ensurePlannerProjectId,
  firstNationsProjectReadinessQuestions,
  formatPlanningValue,
  formatProjectReviewContext,
  firstNationsHousingUseOptions,
  firstNationsHousingUseQuestion,
  firstNationsHousingUseSupportingText,
  getAudienceFundingCorridors,
  getCulturalDesignReportRecords,
  getFirstNationsCulturalDesignDirectionLabel,
  getPlannerDesignProgress,
  getOpportunityReportFundingCorridors,
  getPortfolioSummary,
  getReadinessProfile,
  matchFundingCorridors,
  migratePlannerState,
  plannerAudienceLabels,
  reassignPlannerDesignQuantity,
  resizePlannerDesignVariations,
  setPlannerCulturalExteriorInterest,
  toggleCommunityWorkforceCapacitySelection,
  type FundingCorridor,
  type FundingCorridorDecision,
  type CommunityWorkforceCapacityId,
  type PlannerCatalogItem,
  type PlannerAudience,
  type PlannerDesignVariation,
  type PlannerPhase,
  type PlannerPortfolioLine,
  type PlannerState,
  type ProjectReadinessKey,
  type ProjectReadinessValue,
} from "@/lib/project-planner";
import {
  applyPlannerDesignReturn,
  buildPlannerDesignHref,
  buildPlannerHomeViewHref,
  getPlannerReturnHref,
  getPlannerConfigurationKey,
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

const firstNationsSteps = [
  { label: "Define Housing Need", eyebrow: "Start" },
  { label: "Select Homes", eyebrow: "Build" },
  { label: "Design Project Homes", eyebrow: "Design" },
  { label: "Project Readiness", eyebrow: "Prepare" },
  { label: "Funding & Grant Corridors", eyebrow: "Explore" },
  { label: "Review Project", eyebrow: "Review" },
  { label: "Opportunity Report", eyebrow: "Report" },
  { label: "Project Review / LOU", eyebrow: "Advance" },
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
  "min-h-12 w-full cursor-pointer border border-black/30 bg-white/35 px-4 text-sm text-black outline-none transition-colors hover:border-black/60 hover:bg-white/70 focus:border-black focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

const inputControlClassName =
  "min-h-12 w-full border border-black/30 bg-white/35 px-4 text-sm text-black outline-none transition-colors hover:border-black/60 hover:bg-white/70 focus:border-black focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

const textInputClassName =
  "w-full border-b border-black/30 bg-white/20 px-2 py-3 text-xl tracking-[-0.025em] text-black outline-none transition-colors placeholder:text-black/30 hover:border-black/60 hover:bg-white/55 focus:border-black focus:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

const unselectedControlClassName =
  "border-black/30 bg-white/35 text-black/68 hover:border-black hover:bg-white/80 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

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

function preparePlannerStateForStep(state: PlannerState) {
  const withProjectId = state.step > 0 ? ensurePlannerProjectId(state) : state;
  const opportunityReportStep = state.audience === "first-nations" ? 6 : 7;
  return withProjectId.step >= opportunityReportStep
    ? ensureOpportunityReportReference(withProjectId)
    : withProjectId;
}

function getPlannerHomeName(name: string) {
  return name.replace(/^The\s+/i, "");
}

function getPlannerDesignSession(
  audience: PlannerAudience,
  projectId: string,
  projectName: string,
  line: PlannerPortfolioLine,
  model: PlannerCatalogItem,
  variation: PlannerDesignVariation,
): PlannerDesignSession {
  return {
    audience,
    ...(projectId ? { projectId } : {}),
    projectName,
    lineId: line.id,
    variationId: variation.id,
    modelId: model.id,
    homeName: getPlannerHomeName(model.name),
    designLabel: variation.label,
    assignedQuantity: variation.assignedQuantity,
    deliveryGroup: plannerPhaseLabels[line.phase],
    returnHref: getPlannerReturnHref(audience, "planner-design-center"),
    ...(variation.lookBookConfigurationId
      ? { lookBookConfigurationId: variation.lookBookConfigurationId }
      : {}),
    ...(audience === "first-nations"
      ? { culturalExteriorInterest: variation.culturalExteriorInterest ?? false }
      : {}),
  };
}

function restoreSavedDesignConfigurations(
  state: PlannerState,
  catalog: readonly PlannerCatalogItem[],
) {
  return {
    ...state,
    portfolio: state.portfolio.map((line) => {
      const model = catalog.find((candidate) => candidate.id === line.modelId);
      if (!model) return line;
      return {
        ...line,
        designVariations: line.designVariations.map((variation) => {
          if (variation.configuration || variation.status !== "complete") {
            return variation;
          }
          try {
            const saved = window.localStorage.getItem(
              getPlannerConfigurationKey(
                getPlannerDesignSession(
                  state.audience,
                  state.projectId,
                  state.community,
                  line,
                  model,
                  variation,
                ),
              ),
            );
            if (!saved) return variation;
            const configuration = JSON.parse(saved) as NonNullable<
              PlannerDesignVariation["configuration"]
            >;
            return configuration.homeId === line.modelId.replace(/^custom:/, "")
              ? { ...variation, configuration }
              : variation;
          } catch {
            return variation;
          }
        }),
      };
    }),
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

function getLouStatusLabel(state: PlannerState) {
  const labels: Record<PlannerState["louStatus"], string> = {
    "not-started": "Not started",
    "project-review-requested": "House Delivery review requested",
    prepared: "LOU prepared",
    sent: "LOU sent for review",
    accepted: "LOU accepted",
  };
  return labels[state.louStatus];
}

function getDesignSelectionLevelLabels(variation: PlannerDesignVariation) {
  return Array.from(
    new Set(
      Object.values(variation.designSelections).flatMap((optionId) => {
        const normalized = optionId.toLowerCase();
        if (normalized.includes("premium")) return ["Premium"];
        if (normalized.includes("signature")) return ["Signature"];
        return [];
      }),
    ),
  );
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
      className="inline-flex min-h-10 items-center gap-2 border border-black/30 bg-white/35 px-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/68 transition-colors hover:border-black hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="size-3.5" />
    </Link>
  );
}

function PlannerHomeDetails({
  item,
  onClose,
}: {
  item: PlannerCatalogItem;
  onClose: () => void;
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 grid place-items-center bg-black/72 p-4 sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-home-details-title"
        className="max-h-[92svh] w-full max-w-5xl overflow-y-auto bg-[#edeae2] p-5 text-black shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-6 border-b border-black/16 pb-5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">
              Project Home Details
            </p>
            <h3
              id="planner-home-details-title"
              className="mt-3 text-3xl font-medium tracking-[-0.05em] sm:text-5xl"
            >
              {item.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close home details"
            className="grid size-11 shrink-0 place-items-center border border-black/24 transition-colors hover:border-black hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="mt-6 grid gap-7 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
            <Image
              src={item.image}
              alt={`${item.name} exterior`}
              fill
              unoptimized
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-base leading-7 text-black/60">{item.description}</p>
            <dl className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <div className="border-t border-black/16 pt-4">
                <dt className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">
                  Home family
                </dt>
                <dd className="mt-2 text-sm">
                  {item.family === "custom-home"
                    ? "Custom Home"
                    : item.family === "standardized-catalogue"
                      ? "CMHC Housing Design Catalogue"
                      : "Laneway & Carriage Home"}
                </dd>
              </div>
              <div className="border-t border-black/16 pt-4">
                <dt className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">
                  Size
                </dt>
                <dd className="mt-2 text-sm">
                  {item.squareFeet
                    ? `${item.squareFeet.toLocaleString()} sq. ft.`
                    : "Project review required"}
                </dd>
              </div>
            </dl>
            <p className="mt-8 border-t border-black/16 pt-5 text-xs leading-5 text-black/48">
              You remain inside the active project. Close this view to select a
              quantity, delivery group and exterior direction.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SharedPlannerHomeActions({
  item,
  line,
  projectId,
  projectName,
  totalHomes,
  requestedQuantity,
  requestedPhase,
  audience,
}: {
  item: PlannerCatalogItem;
  line?: PlannerPortfolioLine;
  projectId: string;
  projectName: string;
  totalHomes: number;
  requestedQuantity: number;
  requestedPhase: PlannerPhase;
  audience: PlannerAudience;
}) {
  const variation = line?.designVariations[0];
  const session = line && variation
    ? getPlannerDesignSession(
        audience,
        projectId,
        projectName,
        line,
        item,
        variation,
      )
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
            ...(projectId ? { projectId } : {}),
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
        <p className="mt-1 text-[10px] leading-4 text-black/42">
          Architecture, plans and walkthrough
        </p>
      </div>
      <div>
        {!item.buildMyHref ? (
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/38">
            Design My Home — Coming Soon
          </span>
        ) : buildHref ? (
          <PlannerLink href={buildHref} newTab={false}>
            Design My Home
          </PlannerLink>
        ) : (
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/38">
            Design My Home — Add to Project First
          </span>
        )}
        <p className="mt-1 text-[10px] leading-4 text-black/42">
          Choose the design direction
        </p>
      </div>
      <div>
        {!item.lookBookHref ? (
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/38">
            My Look Book — Coming Soon
          </span>
        ) : lookBookHref && variation?.status === "complete" ? (
          <PlannerLink href={lookBookHref} newTab={false}>
            My Look Book
          </PlannerLink>
        ) : (
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/38">
            My Look Book — Save a Design First
          </span>
        )}
        <p className="mt-1 text-[10px] leading-4 text-black/42">
          Reopen saved design selections
        </p>
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
        eyebrow="01 / Define housing need"
        title="Begin with the community need."
        intro="Set an initial planning target for the community. The selected project portfolio becomes the source of truth for downstream home totals, design groups, readiness and reports."
      />
      <div className="mt-16 grid border-l border-t border-black/16 sm:grid-cols-2">
        <label className="border-b border-r border-black/16 p-5 sm:p-7">
          <FieldLabel>Community / Nation</FieldLabel>
          <input
            value={state.community}
            onChange={(event) => update({ community: event.target.value })}
            placeholder="Community or Nation name"
            className={textInputClassName}
          />
        </label>
        <label className="border-b border-r border-black/16 p-5 sm:p-7">
          <FieldLabel>Project location</FieldLabel>
          <input
            value={state.location}
            onChange={(event) => update({ location: event.target.value })}
            placeholder="Community, region, province"
            className={textInputClassName}
          />
        </label>
        <label className="border-b border-r border-black/16 p-5 sm:p-7">
          <FieldLabel>Initial homes needed / planning target</FieldLabel>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={state.approximateHomes}
            onChange={(event) => update({ approximateHomes: event.target.value })}
            placeholder="e.g. 12"
            className={textInputClassName}
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
            className={textInputClassName}
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
            className={textInputClassName}
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
            placeholder="e.g. 12"
            className={textInputClassName}
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
  onContinueToDesign,
}: {
  state: PlannerState;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
  catalog: readonly PlannerCatalogItem[];
  onContinueToDesign: () => void;
}) {
  const [family, setFamily] = useState<PlannerCatalogItem["family"]>(
    "custom-home",
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [phases, setPhases] = useState<Record<string, PlannerPhase>>({});
  const [detailsItem, setDetailsItem] = useState<PlannerCatalogItem>();
  const [culturalExteriorInterests, setCulturalExteriorInterests] = useState<
    Record<string, boolean>
  >({});
  const catalog = plannerCatalog.filter((item) => item.family === family);
  const summary = getPortfolioSummary(state.portfolio, plannerCatalog);

  function addItem(item: PlannerCatalogItem) {
    const quantity = Math.max(1, quantities[item.id] ?? 1);
    const phase = phases[item.id] ?? "phase-1";
    const existing = state.portfolio.find(
      (line) => line.modelId === item.id && line.phase === phase,
    );
    const lineId = existing?.id ?? createLineId();
    const culturalExteriorInterest =
      state.audience === "first-nations" &&
      getCulturalDesignImage(item.id.replace(/^custom:/, ""))
        ? culturalExteriorInterests[item.id] ??
          existing?.designVariations[0]?.culturalExteriorInterest ??
          false
        : undefined;
    const portfolio = existing
      ? state.portfolio.map((line) =>
          line.id === existing.id
            ? culturalExteriorInterest !== undefined
              ? setPlannerCulturalExteriorInterest(
                  resizePlannerDesignVariations(
                    line,
                    line.quantity + quantity,
                  ),
                  culturalExteriorInterest,
                )
              : resizePlannerDesignVariations(line, line.quantity + quantity)
            : line,
        )
      : [
          ...state.portfolio,
          {
            id: lineId,
            modelId: item.id,
            quantity,
            phase,
            designVariations: [
              {
                ...createPlannerDesignVariation(lineId, quantity),
                ...(culturalExteriorInterest !== undefined
                  ? { culturalExteriorInterest }
                  : {}),
              },
            ],
          },
        ];
    setState((current) => ({ ...current, portfolio }));
  }

  function chooseCulturalExteriorDirection(
    item: PlannerCatalogItem,
    culturalExteriorInterest: boolean,
  ) {
    setCulturalExteriorInterests((current) => ({
      ...current,
      [item.id]: culturalExteriorInterest,
    }));
    setState((current) => ({
      ...current,
      portfolio: current.portfolio.map((line) =>
        line.modelId === item.id
          ? setPlannerCulturalExteriorInterest(
              line,
              culturalExteriorInterest,
            )
          : line,
      ),
    }));
  }

  function getCulturalExteriorInterest(item: PlannerCatalogItem) {
    return (
      culturalExteriorInterests[item.id] ??
      state.portfolio.find((line) => line.modelId === item.id)
        ?.designVariations[0]?.culturalExteriorInterest ??
      false
    );
  }

  function getSelectedHomeCount(item: PlannerCatalogItem) {
    return state.portfolio
      .filter((line) => line.modelId === item.id)
      .reduce(
        (total, line) => total + line.quantity * item.homesPerSelection,
        0,
      );
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
        eyebrow="02 / Select homes"
        title="Build the housing mix."
        intro="Select the home models, quantities and delivery groups for this project. Architecture details stay in context; design configuration happens in the next dedicated project stage."
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
            Project Overview / Homes &amp; Quantities
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
                    className={inputControlClassName}
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
                  className="inline-flex min-h-11 items-center justify-center gap-2 border border-black/30 bg-white/35 px-4 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/62 transition-colors hover:border-black hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
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
          onClick={() => setFamily("custom-home")}
          className={cn(
            "min-h-11 border px-5 text-[9px] font-semibold uppercase tracking-[0.17em]",
            family === "custom-home"
              ? "border-black bg-black text-white"
              : unselectedControlClassName,
          )}
        >
          Custom Homes
        </button>
        <button
          type="button"
          onClick={() => setFamily("standardized-catalogue")}
          className={cn(
            "min-h-11 border px-5 text-[9px] font-semibold uppercase tracking-[0.17em]",
            family === "standardized-catalogue"
              ? "border-black bg-black text-white"
              : unselectedControlClassName,
          )}
        >
          CMHC Housing Design Catalogue
        </button>
        <button
          type="button"
          onClick={() => setFamily("laneway-carriage-home")}
          className={cn(
            "min-h-11 border px-5 text-[9px] font-semibold uppercase tracking-[0.17em]",
            family === "laneway-carriage-home"
              ? "border-black bg-black text-white"
              : unselectedControlClassName,
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
            {state.audience === "first-nations" &&
            item.family === "custom-home" ? (
              <FirstNationsExteriorDirectionCard
                homeName={getPlannerHomeName(item.name)}
                standardImage={item.image}
                coastalImage={getCulturalDesignImage(
                  item.id.replace(/^custom:/, ""),
                )}
                culturalExteriorInterest={getCulturalExteriorInterest(item)}
                onChange={(interest) =>
                  chooseCulturalExteriorDirection(item, interest)
                }
              />
            ) : (
              <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
                <Image
                  src={item.image}
                  alt={`${item.name} exterior`}
                  fill
                  unoptimized
                  sizes="(min-width: 1280px) 31vw, (min-width: 768px) 48vw, 100vw"
                  className="object-cover"
                />
              </div>
            )}
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
            {state.audience === "first-nations" ? (
              <>
                <button
                  type="button"
                  onClick={() => setDetailsItem(item)}
                  className="mt-5 inline-flex min-h-10 items-center border-b border-black/26 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/58 transition-colors hover:border-black hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                  View Details
                </button>
                {getSelectedHomeCount(item) > 0 ? (
                  <div
                    role="status"
                    data-added-to-project
                    className="mt-5 bg-black p-5 text-white"
                  >
                    <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/62">
                      <Check aria-hidden="true" className="size-3.5" /> Added to Project
                    </p>
                    <p className="mt-3 text-xl font-medium uppercase tracking-[-0.03em]">
                      {getSelectedHomeCount(item)} {getPlannerHomeName(item.name)}{" "}
                      {getSelectedHomeCount(item) === 1 ? "Home" : "Homes"}
                    </p>
                    {item.buildMyHref ? (
                      <button
                        type="button"
                        onClick={onContinueToDesign}
                        className="mt-5 inline-flex min-h-11 w-full items-center justify-between border border-white/28 px-4 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        Configure These Homes <ArrowRight aria-hidden="true" className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <SharedPlannerHomeActions
                item={item}
                line={state.portfolio.find((line) => line.modelId === item.id)}
                audience={state.audience}
                projectId={state.projectId}
                projectName={state.community}
                totalHomes={summary.totalHomes}
                requestedQuantity={quantities[item.id] ?? 1}
                requestedPhase={phases[item.id] ?? "phase-1"}
              />
            )}
            <div className="mt-6 grid grid-cols-[5.5rem_1fr] gap-3">
              <label>
                <span className="sr-only">Quantity of {item.name}</span>
                <input
                  type="number"
                  min="1"
                  value={quantities[item.id] ?? 1}
                  onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Math.max(1, Number(event.target.value) || 1) }))}
                  className={inputControlClassName}
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
              className="mt-3 inline-flex min-h-12 w-full items-center justify-between bg-black px-5 text-[9px] font-semibold uppercase tracking-[0.17em] text-white transition-colors hover:bg-black/78 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {state.audience === "first-nations" && getSelectedHomeCount(item) > 0
                ? "Add More to Project"
                : "Add to Project"}{" "}
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </article>
        ))}
      </div>
      {detailsItem ? (
        <PlannerHomeDetails
          item={detailsItem}
          onClose={() => setDetailsItem(undefined)}
        />
      ) : null}
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

  function toggleWorkforceCapacity(value: CommunityWorkforceCapacityId) {
    update(
      "communityWorkforceCapacity",
      toggleCommunityWorkforceCapacitySelection(
        state.refinement.communityWorkforceCapacity,
        value,
      ),
    );
  }

  const fields = [
    ["accessibility", "Accessibility / adaptability", [["unknown", "Unknown / to confirm"], ["standard", "Standard planning"], ["adaptable", "Adaptable homes required"], ["accessible", "Accessible homes required"], ["mixed", "Mixed accessibility portfolio"]]],
    ["landStatus", "Land / site status", [["unknown", "Unknown / to confirm"], ["on-reserve", "On-reserve"], ["off-reserve", "Off-reserve"], ["mixed", "Mixed land status"]]],
    ["servicing", "Servicing / access / remoteness", [["unknown", "Unknown / to confirm"], ["serviced-road-access", "Serviced with road access"], ["partial-servicing", "Partial servicing"], ["remote-road-access", "Remote with road access"], ["limited-access", "Limited or seasonal access"]]],
    ["affordability", isFirstNations ? firstNationsHousingUseQuestion : "Housing / tenure approach", isFirstNations ? firstNationsHousingUseOptions : [["unknown", "To be determined"], ["community-rental", "Community rental"], ["deeply-affordable", "Affordable housing"], ["mixed-income", "Mixed-income"], ["ownership", "Ownership pathway"]]],
    ["energyResilience", "Energy & resilience", [["unknown", "To be determined"], ["code-baseline", "Standard requirements / to be confirmed"], ["enhanced-performance", "Higher energy performance"], ["resilience-priority", "Resilience priority"], ["off-grid-review", "Remote / off-grid conditions"]]],
    ["localLabour", "Delivery / trade capacity", [["unknown", "To be determined"], ["explore", "Local trade participation to explore"], ["available", "Local crew or trades identified"], ["training-interest", "Interested in training"], ["partner-required", "Need assembly / delivery support"]]],
    ["trainingObjectives", "Assembly / maintenance responsibilities", [["unknown", "To be determined"], ["assembly", "Local assembly participation"], ["training", "Training interest"], ["maintenance", "Long-term maintenance capability"], ["support-required", "House Delivery / project delivery support required"]]],
    ["targetTiming", "Target timing", [["unknown", "Unknown / to confirm"], ["within-12-months", "Within 12 months"], ["12-24-months", "12–24 months"], ["24-plus-months", "24+ months"], ["phased", "Phased pipeline"]]],
  ] as const;
  const visibleFields = fields.filter(([key]) =>
    isFirstNations
      ? key !== "localLabour" && key !== "trainingObjectives"
      : true,
  );
  const culturalDesignDirection =
    getFirstNationsCulturalDesignDirectionLabel(state);

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
        <legend className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/46">Who should the housing serve?</legend>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {householdOptions.map(([value, label]) => {
            const checked = state.refinement.householdPriorities.includes(value);
            return (
              <label key={value} className={cn("flex min-h-14 cursor-pointer items-center gap-3 border px-4 text-sm transition-colors", checked ? "border-black bg-black text-white" : unselectedControlClassName)}>
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
      {isFirstNations ? (
        <fieldset
          data-community-workforce-capacity
          className="mt-10 border-t border-black/16 pt-6"
        >
          <legend className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/46">
            Community Workforce &amp; Capacity
          </legend>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-black/62">
            Keep more project value in the community. Create opportunities to
            train and employ local members in the assembly of your homes, while
            building skills and capacity that can support future housing
            projects.
          </p>
          <p className="mt-3 max-w-4xl text-xs leading-5 text-black/46">
            Participation, training scope, partners, employment opportunities,
            costs and schedules are confirmed during project review.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {communityWorkforceCapacityOptions.map(({ id, label }) => {
              const checked =
                state.refinement.communityWorkforceCapacity.includes(id);
              return (
                <label
                  key={id}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 border px-4 text-sm",
                    checked
                      ? "border-black bg-black text-white"
                      : unselectedControlClassName,
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleWorkforceCapacity(id)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center border",
                      checked ? "border-white" : "border-black/25",
                    )}
                  >
                    {checked ? (
                      <Check aria-hidden="true" className="size-3" />
                    ) : null}
                  </span>
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      <div className={cn("grid border-l border-t border-black/16 md:grid-cols-2", isFirstNations ? "mt-10" : "mt-16")}>
        {visibleFields.flatMap(([key, label, options]) => {
          const field = (
            <label key={key} className="border-b border-r border-black/16 p-5 sm:p-7">
              <FieldLabel>{label}</FieldLabel>
              {isFirstNations && key === "affordability" ? (
                <p className="-mt-1 mb-4 text-xs leading-5 text-black/46">
                  {firstNationsHousingUseSupportingText}
                </p>
              ) : null}
              <select value={state.refinement[key] as string} onChange={(event) => update(key, event.target.value)} className={selectClassName}>
                {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
              </select>
            </label>
          );

          return isFirstNations && key === "energyResilience"
            ? [
                <div
                  key="cultural-design-direction"
                  data-refine-cultural-design-direction
                  className="border-b border-r border-black/16 p-5 sm:p-7"
                >
                  <FieldLabel>Cultural Design Direction</FieldLabel>
                  <p className="min-h-12 border border-black/14 bg-black/[0.025] px-4 py-3 text-sm font-medium leading-6 text-black/68">
                    {culturalDesignDirection}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-black/42">
                    This reflects the earlier project-home direction and is not
                    another design selection.
                  </p>
                </div>,
                field,
              ]
            : [field];
        })}
      </div>
      <label className="mt-8 block border-t border-black/16 pt-6">
        <FieldLabel>Project Notes</FieldLabel>
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
        eyebrow={state.audience === "first-nations" ? "03 / Design project homes" : "05 / House Delivery design direction"}
        title={state.audience === "first-nations" ? "Configure the homes in this project." : "Make the direction visible."}
        intro={state.audience === "first-nations" ? "Apply one design to every matching home by default. Create another design group only when part of that model quantity needs a different exterior expression or package direction." : "Create one design per home type and assign it to every matching home by default. Add a design group only when part of that quantity needs a different direction."}
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
                    state.projectId,
                    state.community,
                    nextDesign.line,
                    nextDesign.model,
                    nextDesign.variation,
                  ),
                )}
                newTab={false}
              >
                Configure Next Design Group
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
              {state.audience === "first-nations" ? "Continue to Project Readiness" : "Continue to Funding Pathways"} <ArrowRight aria-hidden="true" className="size-3.5" />
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
                        : `${line.designVariations.length} design groups are assigned across ${line.quantity} ${line.quantity === 1 ? "home" : "homes"}.`}
                    </p>
                  </div>
                  <p className="text-right text-xs leading-5 text-black/45">Delivery sequence<br />{plannerPhaseLabels[line.phase]}</p>
                </div>
                <div className="mt-7 grid gap-4 lg:grid-cols-2">
                  {line.designVariations.map((variation) => {
                    const session = getPlannerDesignSession(
                      state.audience,
                      state.projectId,
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
                              className={inputControlClassName}
                            />
                          </label>
                        ) : (
                          <p className="mt-6 text-sm text-black/56">Assigned to {variation.assignedQuantity} {variation.assignedQuantity === 1 ? "home" : "homes"}</p>
                        )}
                        {variation.lookBookReference ? (
                          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.13em] text-black/42">My Look Book / {variation.lookBookReference}</p>
                        ) : null}
                        {variation.culturalExteriorInterest ? (
                          <p className="mt-3 text-xs leading-5 text-black/48">
                            Cultural design direction / Indigenous Inspiration
                          </p>
                        ) : null}
                        <label className="mt-5 block">
                          <FieldLabel>Design Group notes</FieldLabel>
                          <textarea
                            rows={2}
                            value={variation.designNotes}
                            onChange={(event) =>
                              updateLine(line.id, (current) => ({
                                ...current,
                                designVariations: current.designVariations.map(
                                  (candidate) =>
                                    candidate.id === variation.id
                                      ? { ...candidate, designNotes: event.target.value }
                                      : candidate,
                                ),
                              }))
                            }
                            placeholder="Optional notes that should travel with this design package"
                            className="w-full border border-black/18 bg-transparent p-3 text-xs leading-5 text-black outline-none focus:border-black"
                          />
                        </label>
                        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 border-t border-black/12 pt-4">
                          {variation.status === "complete" ? (
                            <>
                              <PlannerLink href={variation.lookBookConfigurationId ? `/lookbook/${variation.lookBookConfigurationId}` : lookBookHref} newTab={Boolean(variation.lookBookConfigurationId)}>View Look Book</PlannerLink>
                              {variation.lookBookConfigurationId ? <PlannerLink href={`/lookbook/${variation.lookBookConfigurationId}/pdf?disposition=attachment`} newTab>Download PDF</PlannerLink> : null}
                              <PlannerLink href={buildHref} newTab={false}>Edit Design</PlannerLink>
                            </>
                          ) : (
                            <>
                              <PlannerLink href={buildHref} newTab={false}>Configure Design</PlannerLink>
                              <span className="self-center text-[9px] font-semibold uppercase tracking-[0.15em] text-black/32">Look Book — Save this design first</span>
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
                  className="mt-5 inline-flex min-h-11 items-center gap-3 border border-black/30 bg-white/35 px-5 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/68 transition-colors hover:border-black hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Plus aria-hidden="true" className="size-3.5" /> Create Another Design Group
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
        eyebrow={state.audience === "first-nations" ? "05 / Funding & grant corridors" : "06 / Funding and financing context"}
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
                          : unselectedControlClassName,
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

function FirstNationsProjectReadinessStep({
  state,
  setState,
  catalog,
}: {
  state: PlannerState;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
  catalog: readonly PlannerCatalogItem[];
}) {
  const summary = getPortfolioSummary(state.portfolio, catalog);

  function updateReadiness(
    key: ProjectReadinessKey,
    value: ProjectReadinessValue,
  ) {
    setState((current) => ({
      ...current,
      readiness: { ...current.readiness, [key]: value },
    }));
  }

  return (
    <div data-project-readiness-input>
      <StepHeader
        eyebrow="04 / Project readiness"
        title="Record what is known today."
        intro="Projects do not need to have every answer today. Record what is currently known so House Delivery can understand where the project stands and what may need to be explored next."
      />

      <section className="mt-14 border-y border-black/16 py-7">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">
          Derived from this project
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <dl>
            <dt className="text-[8px] uppercase tracking-[0.16em] text-black/42">
              Housing requirement
            </dt>
            <dd className="mt-2 text-2xl font-medium tracking-[-0.04em]">
              {summary.totalHomes} {summary.totalHomes === 1 ? "home" : "homes"}
            </dd>
          </dl>
          <dl>
            <dt className="text-[8px] uppercase tracking-[0.16em] text-black/42">
              Model mix
            </dt>
            <dd className="mt-2 text-2xl font-medium tracking-[-0.04em]">
              {summary.modelCount} {summary.modelCount === 1 ? "model type" : "model types"}
            </dd>
          </dl>
          <div className="text-sm leading-6 text-black/54 sm:col-span-2 lg:col-span-1">
            {summary.lines.map(({ line, model }) => {
              const homes = line.quantity * model.homesPerSelection;
              return (
                <p key={line.id}>
                  {homes} {getPlannerHomeName(model.name)} {homes === 1 ? "home" : "homes"}
                </p>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {firstNationsProjectReadinessQuestions.map((question) => (
          <fieldset
            key={question.key}
            className="border border-black/16 p-5 sm:p-6"
          >
            <legend className="px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/48">
              {question.label}
            </legend>
            <p className="mt-2 text-base font-medium leading-7 tracking-[-0.02em]">
              {question.question}
            </p>
            {"helper" in question ? (
              <p className="mt-3 text-xs leading-5 text-black/48">
                {question.helper}
              </p>
            ) : null}
            <div className="mt-5 grid gap-2">
              {question.options.map(([value, label]) => (
                <label
                  key={value}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 border px-4 text-sm transition-colors",
                    state.readiness[question.key] === value
                      ? "border-black bg-black text-white"
                      : "border-black/20 bg-white/30 text-black/62 hover:border-black/50 hover:bg-white/65",
                  )}
                >
                  <input
                    type="radio"
                    name={`readiness-${question.key}`}
                    value={value}
                    checked={state.readiness[question.key] === value}
                    onChange={() =>
                      updateReadiness(question.key, value)
                    }
                    className="size-4 accent-black"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <p className="mt-10 border-y border-black/16 py-6 text-sm leading-6 text-black/55">
        Scale describes the opportunity. Readiness describes what is known
        today. Neither is a government, lender or funding-program score.
      </p>
    </div>
  );
}

function FirstNationsProjectReviewSummary({
  state,
  catalog,
  onEditHomes,
  onEditDesigns,
  onEditReadiness,
}: {
  state: PlannerState;
  catalog: readonly PlannerCatalogItem[];
  onEditHomes: () => void;
  onEditDesigns: () => void;
  onEditReadiness: () => void;
}) {
  const summary = getPortfolioSummary(state.portfolio, catalog);
  const readiness = getReadinessProfile(state, catalog);
  const progress = getPlannerDesignProgress(state.portfolio, catalog);
  const designGroupCount = state.portfolio.reduce(
    (total, line) => total + line.designVariations.length,
    0,
  );
  const knownToday = readiness.filter((item) => item.ready);
  const itemsToConfirm = readiness.filter((item) => !item.ready);

  return (
    <div data-project-review-summary>
      <StepHeader
        eyebrow="06 / Review project"
        title="Review one project record."
        intro="Homes, quantities, delivery groups, design groups, Look Books and readiness answers below all come from the same saved project state. Edit any section before creating the Opportunity Report."
      />

      <div className="mt-14 grid gap-5 border-y border-black/16 py-7 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Project ID", state.projectId || "Pending"],
          ["Homes", String(summary.totalHomes)],
          ["Models", String(summary.modelCount)],
          ["Design groups", `${progress.completedDesigns} of ${designGroupCount} complete`],
          ["LOU", getLouStatusLabel(state)],
        ].map(([label, value]) => (
          <dl key={label}>
            <dt className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">
              {label}
            </dt>
            <dd className="mt-2 text-lg font-medium tracking-[-0.03em]">{value}</dd>
          </dl>
        ))}
      </div>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-5 border-b border-black/16 pb-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">
              Homes &amp; Quantities
            </p>
            <h3 className="mt-2 text-3xl font-medium tracking-[-0.045em]">
              {summary.totalHomes} {summary.totalHomes === 1 ? "home" : "homes"} · {summary.modelCount} {summary.modelCount === 1 ? "model" : "models"}
            </h3>
          </div>
          <button type="button" onClick={onEditHomes} className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/52 hover:text-black">Edit</button>
        </div>
        {summary.lines.map(({ line, model }) => {
          const homes = line.quantity * model.homesPerSelection;
          return (
            <div key={line.id} className="grid gap-3 border-b border-black/14 py-4 sm:grid-cols-[1fr_auto]">
              <p className="font-medium">{model.name}</p>
              <p className="text-sm text-black/55">
                {homes} {homes === 1 ? "home" : "homes"} · {plannerPhaseLabels[line.phase]}
              </p>
            </div>
          );
        })}
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-5 border-b border-black/16 pb-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">
              Design Configurations &amp; Look Books
            </p>
            <h3 className="mt-2 text-3xl font-medium tracking-[-0.045em]">
              {progress.completedDesigns} of {designGroupCount} {designGroupCount === 1 ? "design group" : "design groups"} complete
            </h3>
          </div>
          <button type="button" onClick={onEditDesigns} className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/52 hover:text-black">Edit</button>
        </div>
        {summary.lines.flatMap(({ line, model }) =>
          line.designVariations.map((variation) => (
            <div key={variation.id} className="grid gap-2 border-b border-black/14 py-4 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="font-medium">
                  {variation.projectDesignName ?? `${getPlannerHomeName(model.name)} — ${variation.label}`}
                </p>
                <p className="mt-1 text-xs text-black/46">
                  {variation.culturalExteriorInterest ? "Indigenous Inspiration" : "Contemporary"}
                  {variation.lookBookReference ? ` · Look Book ${variation.lookBookReference}` : " · Look Book not yet saved"}
                </p>
              </div>
              <p className="text-sm text-black/55">
                {variation.assignedQuantity} {variation.assignedQuantity === 1 ? "home" : "homes"} · {variation.status === "complete" ? "Complete" : "To configure"}
              </p>
            </div>
          )),
        )}
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-5 border-b border-black/16 pb-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">
              Project Readiness
            </p>
            <h3 className="mt-2 text-3xl font-medium tracking-[-0.045em]">
              Known today / Items to confirm
            </h3>
          </div>
          <button type="button" onClick={onEditReadiness} className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/52 hover:text-black">Edit</button>
        </div>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {[
            ["Known Today", knownToday],
            ["Items to Confirm", itemsToConfirm],
          ].map(([heading, items]) => (
            <div key={heading as string}>
              <h4 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/48">{heading as string}</h4>
              <div className="mt-4">
                {(items as typeof readiness).length ? (items as typeof readiness).map((item) => (
                  <div key={item.id} className="border-t border-black/14 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-medium">{item.label}</p>
                      <span className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.14em] text-black/42">{item.status}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-black/48">{item.detail}</p>
                  </div>
                )) : <p className="text-sm text-black/48">No items in this section.</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
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
              ["Working housing requirement", `${summary.totalHomes} ${summary.totalHomes === 1 ? "home" : "homes"}`],
              ["Model mix", `${summary.modelCount} ${summary.modelCount === 1 ? "model type" : "model types"}`],
              ["Repeatable models", `${repeatedModels} repeated portfolio ${repeatedModels === 1 ? "line" : "lines"}`],
              ["Phasing", `${summary.phaseCount} ${summary.phaseCount === 1 ? "phase" : "phases"} represented`],
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
  const culturalDesigns = getCulturalDesignReportRecords(state, catalog);
  const servicingReadiness = readiness.find((item) => item.id === "servicing");
  const workforceReadiness = readiness.find(
    (item) => item.id === "communityWorkforce",
  );
  const knownReadiness = readiness.filter((item) => item.ready);
  const unresolvedReadiness = readiness.filter((item) => !item.ready);
  const majorRangeDrivers = state.audience === "first-nations"
    ? [
        ["Site and servicing", servicingReadiness?.detail ?? "To confirm"],
        ["Access and logistics", state.location || "Unknown / to confirm"],
        ["Timing and phasing", labelValue(state.deliveryHorizon)],
      ]
    : [
        ["Site and servicing", labelValue(state.refinement.servicing)],
        ["Access and logistics", state.location || "Unknown / to confirm"],
        ["Accessibility", labelValue(state.refinement.accessibility)],
        ["Energy and resilience", labelValue(state.refinement.energyResilience)],
        ["Local delivery capacity", labelValue(state.refinement.localLabour)],
        ["Timing and phasing", labelValue(state.refinement.targetTiming)],
      ];
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
        <StepHeader eyebrow={state.audience === "first-nations" ? "07 / Opportunity report" : "08 / Preliminary opportunity report"} title="A clearer next conversation." intro="This report carries the opportunity, portfolio, project design groups, readiness information and items to confirm into a structured House Delivery review." />
        <div data-planner-report-controls="top" className="mt-10 grid gap-3 lg:grid-cols-3">
          <button type="button" onClick={viewReport} className="inline-flex min-h-14 items-center justify-between gap-8 border border-black/28 px-5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-black/68 transition-colors hover:border-black hover:text-black">View Opportunity Report <ArrowRight aria-hidden="true" className="size-4" /></button>
          <button type="button" onClick={printReport} data-planner-report-download="top" className="inline-flex min-h-14 items-center justify-between gap-8 border border-black px-5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-black transition-colors hover:bg-black hover:text-white">Download Opportunity Report <FileDown aria-hidden="true" className="size-4" /></button>
          <button type="button" onClick={onBeginReview} className="inline-flex min-h-14 items-center justify-between gap-8 bg-black px-5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-black/78">{state.audience === "first-nations" ? "Continue to House Delivery Review" : "Begin Project Review"} <ArrowRight aria-hidden="true" className="size-4" /></button>
        </div>
      </div>

      <article id="planner-opportunity-report" tabIndex={-1} data-planner-report className="mt-16 scroll-mt-28 bg-white px-6 text-black outline-none sm:px-10 lg:px-16 xl:px-20 print:mt-0">
        <header className="border-y border-black/18 py-9">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/45">House Delivery / Preliminary Opportunity Report</p>
          {state.audience !== "first-nations" ? <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">{plannerAudienceLabels[state.audience]}</p> : null}
          <h2 className="mt-6 max-w-5xl text-[clamp(3.4rem,7vw,7.5rem)] font-medium leading-[0.82] tracking-[-0.075em]">{state.community || (state.audience === "first-nations" ? "Community housing opportunity" : "Housing project opportunity")}</h2>
          <div className="mt-8 grid gap-3 text-xs uppercase tracking-[0.13em] text-black/48 sm:grid-cols-4"><p>{state.location || "Location to confirm"}</p><p>{summary.totalHomes} working {summary.totalHomes === 1 ? "home" : "homes"}</p><p>Project / {state.projectId || "Pending"}</p><p>{state.opportunityReportReference || "Reference pending"}</p></div>
        </header>

        <ReportSection number="01" title="Opportunity">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[["Housing requirement", `${summary.totalHomes} ${summary.totalHomes === 1 ? "home" : "homes"}`], ["Model mix", `${summary.modelCount} ${summary.modelCount === 1 ? "model type" : "model types"}`], ["Sites", labelValue(state.sitePattern)], ["Horizon", labelValue(state.deliveryHorizon)]].map(([label, value]) => <dl key={label} className="border-t border-black/16 pt-4"><dt className="text-[8px] uppercase tracking-[0.16em] text-black/42">{label}</dt><dd className="mt-3 text-xl font-medium tracking-[-0.03em]">{value}</dd></dl>)}
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
          <p className="mb-6 max-w-4xl text-sm leading-6 text-black/58">
            {savedDesigns.length} completed {savedDesigns.length === 1 ? "Design Group" : "Design Groups"}. The completed Look Book establishes the preliminary design direction for each Design Group. Following House Delivery review and the appropriate project authorization, these selections can be used for factory design development, virtual walkthrough preparation and project-specific specification review.
          </p>
          {savedDesigns.length ? <div className="grid gap-3 sm:grid-cols-2">{savedDesigns.map(({ model, variation }) => { const selectionLevels = getDesignSelectionLevelLabels(variation); return <p key={variation.id} className="border-t border-black/16 pt-3 text-sm"><span className="text-black/42">{variation.projectDesignName ?? `${getPlannerHomeName(model)} — ${variation.label}`}</span><br />Assigned to {variation.assignedQuantity} {variation.assignedQuantity === 1 ? "home" : "homes"} · {variation.culturalExteriorInterest ? "Indigenous Inspiration" : "Contemporary"}{selectionLevels.length ? ` · ${selectionLevels.join(" / ")} selections` : ""}{variation.lookBookReference ? ` · Look Book ${variation.lookBookReference}` : ""}</p>; })}</div> : <p className="text-sm text-black/52">Design direction has not yet been recorded. Technical and project-specific approvals remain separate.</p>}
          <CulturalDesignReport records={culturalDesigns} />
          <p className="mt-7 max-w-4xl border-t border-black/16 pt-5 text-xs leading-5 text-black/52">
            Factory design-development and virtual walkthrough services are a separate paid next-stage service and are not included simply by completing this Opportunity Report. No fee is due unless it is separately disclosed and authorized.
          </p>
        </ReportSection>

        <ReportSection number="05" title="Major range drivers">
          <div className="grid gap-3 sm:grid-cols-2">{majorRangeDrivers.map(([label, value]) => <p key={label} className="border-t border-black/16 pt-3 text-sm"><span className="text-black/42">{label}</span><br />{value}</p>)}</div>
        </ReportSection>

        <ReportSection number="06" title="Project readiness">
          <div className="grid gap-10 lg:grid-cols-2">
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/44">Known Today</p><div className="mt-4">{knownReadiness.length ? knownReadiness.map((item) => <div key={item.id} className="border-t border-black/16 py-3"><div className="flex items-start justify-between gap-4"><p className="text-sm font-medium">{item.label}</p><span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-black/42">{item.status}</span></div><p className="mt-2 text-xs text-black/48">{item.detail}</p></div>) : <p className="text-sm text-black/48">No readiness items identified yet.</p>}</div></div>
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/44">Items to Confirm</p><div className="mt-4">{unresolvedReadiness.length ? unresolvedReadiness.map((item) => <div key={item.id} className="border-t border-black/16 py-3"><div className="flex items-start justify-between gap-4"><p className="text-sm font-medium">{item.label}</p><span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-black/42">{item.status}</span></div><p className="mt-2 text-xs text-black/48">{item.detail}</p></div>) : <p className="text-sm text-black/48">No primary readiness items remain unresolved.</p>}</div></div>
          </div>
        </ReportSection>

        <ReportSection number="07" title={state.audience === "first-nations" ? "Community workforce & capacity" : state.audience === "developer" ? "Development and delivery capability" : state.audience === "general-contractor" ? "Procurement, logistics and delivery capability" : "Community delivery and operating capability"}>
          {state.audience === "first-nations" ? (
            <div
              data-report-community-workforce-capacity
            >
              <p className="max-w-4xl text-sm leading-6 text-black/60">
                {workforceReadiness?.detail ?? "Community workforce and capacity interest not yet determined."}
              </p>
              <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/42">{workforceReadiness?.status ?? "Not Yet Determined"}</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                ["Delivery / trade capacity", labelValue(state.refinement.localLabour)],
                ["Assembly / maintenance responsibilities", labelValue(state.refinement.trainingObjectives)],
              ].map(([label, value]) => (
                <p key={label} className="border-t border-black/16 pt-3 text-sm">
                  <span className="text-black/42">{label}</span><br />{value}
                </p>
              ))}
            </div>
          )}
        </ReportSection>

        <ReportSection number="08" title={state.audience === "first-nations" ? "Funding & grant corridors" : "Funding and financing context"}>
          <div className="space-y-4">{funding.map((item) => <div key={item.id} className="border-t border-black/16 pt-3"><p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-black/42">{item.relevance}{item.decision ? ` / ${fundingDecisionLabels[item.decision]}` : ""}</p><p className="mt-2 text-sm font-medium">{item.title}</p><p className="mt-1 text-xs leading-5 text-black/50">{item.confirmationNeeded}</p><p className="mt-1 break-all text-[9px] text-black/38">{item.officialSource}</p></div>)}</div>
        </ReportSection>

        <ReportSection number="09" title="Assumptions, exclusions and missing information">
          <div className="grid gap-8 lg:grid-cols-3"><div><p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">Assumptions</p><ul className="mt-4 space-y-2 text-xs leading-5 text-black/55">{estimate.assumptions.map((item) => <li key={item}>— {item}</li>)}</ul></div><div><p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">Exclusions</p><ul className="mt-4 space-y-2 text-xs leading-5 text-black/55">{estimate.exclusions.map((item) => <li key={item}>— {item}</li>)}</ul></div><div><p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">Missing information</p><ul className="mt-4 space-y-2 text-xs leading-5 text-black/55">{missingInformation.length ? missingInformation.map((item) => <li key={item}>— {item}</li>) : <li>— No primary information gaps flagged at this stage.</li>}</ul></div></div>
        </ReportSection>

        <footer className="mt-14 bg-[#0b0c10] p-6 text-white sm:p-9">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">Next pathway</p>
          <p className="mt-5 text-xl font-medium leading-8 tracking-[-0.025em]">House Delivery Review → LOU → Separate Design Development Authorization → Factory Virtual Walkthrough &amp; Specification Development → Final / Refined Project Pricing → Definitive Agreement</p>
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
            {state.audience === "first-nations" ? "Continue to House Delivery Review" : "Begin Project Review"} <ArrowRight aria-hidden="true" className="size-4" />
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
): value is {
  accepted: true;
  projectStatus?: string;
  submissionId?: string;
  designGroups?: readonly {
    variationId: string;
    configurationId: string;
    lookBookUrl: string;
    pdfUrl: string;
  }[];
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "accepted" in value &&
    value.accepted === true
  );
}

function SubmittedProjectJourney({
  state,
  completedDesigns,
}: {
  state: PlannerState;
  completedDesigns: readonly {
    model: PlannerCatalogItem;
    variation: PlannerDesignVariation;
  }[];
}) {
  const milestones = [
    ["House Delivery Review", "Current", "House Delivery checks the submitted project, readiness information and completed design packages."],
    ["Letter of Understanding", "Next", "An authorized Nation representative reviews the preliminary project basis. This is separate from paid design work and is not a purchase agreement."],
    ["Design Development", "Separate authorization", "Each unique Design Group is one potential factory design-development output. Any fee remains to be configured, disclosed and separately authorized."],
    ["Virtual Walkthrough", "After payment + release", "Only after the LOU, separate authorization, payment clearance and explicit House Delivery release can a design package move to factory development."],
    ["Final Pricing", "After factory development", "House Delivery refines project pricing after sufficient project-specific walkthrough and specification development."],
  ] as const;

  return (
    <div data-post-submission-project-status className="mt-10">
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/45">
        Project status / Submitted for House Delivery Review
      </p>
      <div className="mt-6 grid border-l border-t border-black/16 sm:grid-cols-2 lg:grid-cols-5">
        {milestones.map(([title, status, description], index) => (
          <article key={title} className="border-b border-r border-black/16 p-5">
            <p className="font-mono text-[8px] tracking-[0.16em] text-black/36">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h4 className="mt-5 text-base font-medium uppercase tracking-[-0.025em]">{title}</h4>
            <p className="mt-3 text-[8px] font-semibold uppercase tracking-[0.15em] text-black/42">{status}</p>
            <p className="mt-4 text-xs leading-5 text-black/52">{description}</p>
          </article>
        ))}
      </div>

      <section className="mt-9 border-y border-black/18 py-7">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/44">Your design moves with the project</p>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-black/58">
          Your completed Look Book establishes the design direction for each project home group. Following House Delivery&apos;s project review and an agreed Letter of Understanding, the selected materials, finishes and design direction can move into factory design development.
        </p>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-black/58">
          The factory then uses the approved design brief to prepare the project-specific virtual walkthrough and refine specifications required for final pricing. Factory design-development and virtual walkthrough services are a separate paid next-stage service. Any fee will be disclosed and authorized before that work begins.
        </p>
      </section>

      <section className="mt-9">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/44">Design Development Authorization / Not authorized</p>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-black/50">
          One requirement is shown per unique Design Group—not per physical home. This is a future separate authorization, not part of the LOU or this submission.
        </p>
        <div className="mt-5 border-t border-black/16">
          {completedDesigns.map(({ model, variation }) => (
            <div key={variation.id} className="grid gap-2 border-b border-black/16 py-4 text-sm sm:grid-cols-[1fr_auto]">
              <p>{variation.projectDesignName ?? `${getPlannerHomeName(model.name)} — ${variation.label}`}<br /><span className="text-xs text-black/44">{variation.assignedQuantity} {variation.assignedQuantity === 1 ? "home" : "homes"} / One design-development package</span></p>
              <p className="text-black/52">Fee: To be configured<br /><span className="text-xs">Status: Not authorized</span>{variation.lookBookConfigurationId ? <><br /><Link href={`/lookbook/${variation.lookBookConfigurationId}`} target="_blank" rel="noreferrer" className="text-[9px] font-semibold uppercase tracking-[0.14em] underline underline-offset-4">View Look Book</Link>{" / "}<Link href={`/lookbook/${variation.lookBookConfigurationId}/pdf?disposition=attachment`} target="_blank" rel="noreferrer" className="text-[9px] font-semibold uppercase tracking-[0.14em] underline underline-offset-4">PDF</Link></> : null}</p>
            </div>
          ))}
        </div>
      </section>
      <span className="sr-only">Project {state.projectId} remains saved on this device with {completedDesigns.length} attached design packages.</span>
    </div>
  );
}

function ProjectReviewStep({
  state,
  setState,
  catalog,
  corridors,
  onViewReport,
  onEditProject,
  onEditReadiness,
}: {
  state: PlannerState;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
  catalog: readonly PlannerCatalogItem[];
  corridors: readonly FundingCorridor[];
  onViewReport: () => void;
  onEditProject: () => void;
  onEditReadiness: () => void;
}) {
  const [submitted, setSubmitted] = useState(
    state.reviewStatus === "submitted",
  );
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
  const workforceReadiness = readiness.find(
    (item) => item.id === "communityWorkforce",
  );
  const reviewContext = formatProjectReviewContext(state, catalog, corridors);

  function updateContact(
    key: keyof PlannerState["contact"],
    value: string,
  ) {
    setState((current) => ({
      ...current,
      contact: { ...current.contact, [key]: value },
    }));
  }

  function updateAuthorizedRepresentative(
    key: keyof PlannerState["authorizedRepresentative"],
    value: string,
  ) {
    setState((current) => ({
      ...current,
      authorizedRepresentative: {
        ...current.authorizedRepresentative,
        [key]: value,
      } as PlannerState["authorizedRepresentative"],
    }));
  }

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
    const submittedAt = new Date().toISOString();
    const submissionState: PlannerState = {
      ...state,
      contact: {
        firstName: readValue("firstName"),
        lastName: readValue("lastName"),
        email: readValue("email"),
        phone: readValue("phone"),
      },
      authorizedRepresentative: {
        name: readValue("authorizedRepresentativeName"),
        title: readValue("authorizedRepresentativeTitle"),
        councilAuthorizationStatus: (readValue("councilAuthorizationStatus") || "to-confirm") as PlannerState["authorizedRepresentative"]["councilAuthorizationStatus"],
      },
      submittedAt,
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
          ...(state.audience === "first-nations"
            ? { plannerRecord: submissionState }
            : {}),
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isAcceptedProjectReviewResponse(result) ||
        (state.audience === "first-nations" &&
          result.designGroups?.length !== completedDesigns.length)
      ) {
        throw new Error("Project review delivery failed.");
      }
      const savedDesignGroups = new Map(
        result.designGroups?.map((designGroup) => [
          designGroup.variationId,
          designGroup,
        ]),
      );
      setState((current) => ({
        ...current,
        contact: submissionState.contact,
        authorizedRepresentative: submissionState.authorizedRepresentative,
        portfolio: current.portfolio.map((line) => ({
          ...line,
          designVariations: line.designVariations.map((variation) => ({
            ...variation,
            lookBookConfigurationId:
              savedDesignGroups.get(variation.id)?.configurationId ??
              variation.lookBookConfigurationId,
          })),
        })),
        reviewStatus: "submitted",
        lifecycleStatus: "submitted-for-review",
        louStatus: "project-review-requested",
        submissionId: result.submissionId ?? current.submissionId,
        submittedAt,
      }));
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
        eyebrow={state.audience === "first-nations" ? "08 / Project review / LOU" : "09 / Project review"}
        title="Carry the full project forward."
        intro={state.audience === "first-nations" ? "Submit the organized project record for House Delivery review. This opens the pathway toward an LOU; it does not itself create a legally binding agreement." : "Your opportunity, portfolio, delivery groups, design records, refinement answers, funding-review choices and readiness profile are attached to this project-aware request."}
      />

      <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Project ID", state.projectId],
          [state.audience === "first-nations" ? "Community / project" : "Project / organization", state.community],
          ["Working portfolio", `${summary.totalHomes} ${summary.totalHomes === 1 ? "home" : "homes"} / ${summary.modelCount} ${summary.modelCount === 1 ? "model type" : "model types"}`],
          [state.audience === "first-nations" ? "LOU status" : "Funding / financing review", state.audience === "first-nations" ? getLouStatusLabel(state) : `${includedFunding.length} selected ${includedFunding.length === 1 ? "corridor" : "corridors"}`],
        ].map(([label, value]) => (
          <dl key={label} className="border-t border-black/18 pt-4">
            <dt className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">{label}</dt>
            <dd className="mt-3 text-sm font-medium leading-6">{value || "To confirm"}</dd>
          </dl>
        ))}
      </div>

      {state.audience === "first-nations" ? (
        <section
          data-project-review-community-workforce-capacity
          className="mt-10 border-y border-black/16 py-6"
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">
            Community Workforce &amp; Capacity
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-black/55">
            {workforceReadiness?.detail ??
              "Community workforce and capacity interest not yet determined."}
          </p>
          <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/42">
            {workforceReadiness?.status ?? "Not Yet Determined"}
          </p>
        </section>
      ) : null}

      <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <section>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">Portfolio, delivery groups & Look Books</p>
          <div className="mt-5 border-t border-black/16">
            {summary.lines.map(({ line, model }) => (
              <div key={line.id} className="border-b border-black/16 py-5">
                <div className="flex items-start justify-between gap-5 text-sm">
                  <p className="font-medium">{model.name}</p>
                  <p className="text-right">{line.quantity * model.homesPerSelection} {line.quantity * model.homesPerSelection === 1 ? "home" : "homes"}<br /><span className="text-xs text-black/45">{plannerPhaseLabels[line.phase]}</span></p>
                </div>
                {line.designVariations.map((variation) => (
                  <div key={variation.id} className="mt-3 text-xs leading-5 text-black/52">
                    <p>{variation.projectDesignName ?? `${getPlannerHomeName(model.name)} — ${variation.label}`} · Assigned to {variation.assignedQuantity} {variation.assignedQuantity === 1 ? "home" : "homes"} · {variation.status === "complete" ? `Complete${variation.lookBookReference ? ` / ${variation.lookBookReference}` : ""}` : "Design outstanding"}</p>
                    {variation.culturalExteriorInterest ? <p className="mt-1 text-black/42">Cultural design direction: Indigenous Inspiration</p> : null}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">{state.audience === "first-nations" ? "Project readiness" : "Funding / financing context & readiness"}</p>
            {state.audience === "first-nations" ? <button type="button" onClick={onEditReadiness} className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/48 hover:text-black">Edit</button> : null}
          </div>
          {state.audience !== "first-nations" ? <div className="mt-5 border-t border-black/16">
            {includedFunding.length ? includedFunding.map((corridor) => (
              <p key={corridor.id} className="border-b border-black/16 py-4 text-sm">
                {corridor.title}<br /><span className="text-xs leading-5 text-black/45">Included for non-binding review · {corridor.relevance}</span>
              </p>
            )) : <p className="border-b border-black/16 py-4 text-sm text-black/48">No funding corridors selected for review.</p>}
          </div> : null}
          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            {readiness.map((item) => (
              <p key={item.label} className="border-t border-black/14 pt-3 text-xs leading-5">
                <span className="font-medium">{item.label}</span><br /><span className="text-black/45">{item.detail}</span><br /><span className="mt-1 inline-block text-[8px] font-semibold uppercase tracking-[0.14em] text-black/38">{item.status}</span>
              </p>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-14 border-y border-black/18 py-9 sm:py-12">
        {submitted ? (
          <div role="status">
            <div className="max-w-3xl">
            <p className="inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/48"><Check aria-hidden="true" className="size-4" /> Project review received</p>
            <h3 className="mt-5 text-3xl font-medium tracking-[-0.045em] sm:text-5xl">The project record has moved forward intact.</h3>
            <p className="mt-5 text-sm leading-6 text-black/55">House Delivery received project {state.projectId} with Opportunity Report {state.opportunityReportReference} and {completedDesigns.length} completed {completedDesigns.length === 1 ? "design package" : "design packages"}. The next step is House Delivery review before an LOU is prepared. Submission is not an LOU, a paid-design authorization, a factory release or final pricing.</p>
            </div>
            <SubmittedProjectJourney state={state} completedDesigns={completedDesigns} />
          </div>
        ) : (
          <form onSubmit={submitProjectReview} className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">Project review contact</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-black/52">Add the contact for this review. The project record above—not a blank generic inquiry—will be sent with the request.</p>
            </div>
            <label className="form-field"><span>First name</span><input name="firstName" autoComplete="given-name" required value={state.contact.firstName} onChange={(event) => updateContact("firstName", event.target.value)} /></label>
            <label className="form-field"><span>Last name</span><input name="lastName" autoComplete="family-name" required value={state.contact.lastName} onChange={(event) => updateContact("lastName", event.target.value)} /></label>
            <label className="form-field"><span>Email address</span><input type="email" name="email" autoComplete="email" required value={state.contact.email} onChange={(event) => updateContact("email", event.target.value)} /></label>
            <label className="form-field"><span>Phone</span><input type="tel" name="phone" autoComplete="tel" value={state.contact.phone} onChange={(event) => updateContact("phone", event.target.value)} /></label>
            {state.audience === "first-nations" ? (
              <>
                <div className="sm:col-span-2 border-t border-black/16 pt-7">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">Authorized project representative</p>
                  <p className="mt-3 max-w-2xl text-xs leading-5 text-black/50">Record the Nation&apos;s appropriate project representative. This does not assume that only a Chief may review or accept a future LOU.</p>
                </div>
                <label className="form-field"><span>Representative name</span><input name="authorizedRepresentativeName" required value={state.authorizedRepresentative.name} onChange={(event) => updateAuthorizedRepresentative("name", event.target.value)} /></label>
                <label className="form-field"><span>Representative title / role</span><input name="authorizedRepresentativeTitle" required value={state.authorizedRepresentative.title} onChange={(event) => updateAuthorizedRepresentative("title", event.target.value)} /></label>
                <label className="form-field sm:col-span-2"><span>Council / BCR authorization</span><select name="councilAuthorizationStatus" value={state.authorizedRepresentative.councilAuthorizationStatus} onChange={(event) => updateAuthorizedRepresentative("councilAuthorizationStatus", event.target.value)} className={selectClassName}><option value="to-confirm">To confirm</option><option value="required">Required</option><option value="not-required">Not required</option></select></label>
              </>
            ) : null}
            <label className="form-field sm:col-span-2"><span>Anything else for this review?</span><textarea name="reviewNotes" rows={3} placeholder="Optional final context for the House Delivery team" /></label>
            <label className="hidden" aria-hidden="true"><span>Company</span><input name="company" tabIndex={-1} autoComplete="off" /></label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={submitting} aria-busy={submitting} className="inline-flex min-h-16 w-full items-center justify-between gap-8 bg-black px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white transition-colors hover:bg-black/78 disabled:cursor-wait disabled:opacity-60">
                {submitting ? "Sending Project Review…" : "Submit Project Review"}<ArrowRight aria-hidden="true" className="size-4" />
              </button>
              {submissionError ? <p role="alert" className="mt-4 text-xs leading-5 text-black/60">{submissionError}</p> : null}
              <p className="mt-4 text-[10px] leading-4 text-black/40">This request begins a non-binding project review toward the appropriate LOU / commitment pathway. It is not itself an LOU, quotation, funding decision, approval or commitment to deliver.</p>
            </div>
          </form>
        )}
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={onViewReport} className="inline-flex min-h-12 items-center justify-between gap-7 border border-black/24 px-5 text-left text-[9px] font-semibold uppercase tracking-[0.16em]">View Opportunity Report <ArrowLeft aria-hidden="true" className="size-4" /></button>
        <button type="button" onClick={onEditProject} className="inline-flex min-h-12 items-center justify-between gap-7 px-5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-black/48 hover:text-black">View / Edit My Project <ArrowRight aria-hidden="true" className="size-4" /></button>
      </div>
      <span className="sr-only">{completedDesigns.length} completed {completedDesigns.length === 1 ? "design group" : "design groups"} carried into project review.</span>
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
        const restoredDraft =
          migrated?.audience === initialAudience
            ? migrated
            : createDefaultPlannerState(initialAudience);
        const restored = restoreSavedDesignConfigurations(
          restoredDraft,
          catalog,
        );
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
          const returnedState = preparePlannerStateForStep(
            applyPlannerDesignReturn(restored, returned),
          );
          const portfolio = returnedState.portfolio;
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
          setState(preparePlannerStateForStep(restored));
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
      return preparePlannerStateForStep(nextState);
    });
    window.requestAnimationFrame(() => {
      const target = document.getElementById(
        focusTargetId ?? "planner-workspace",
      );
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (focusTargetId) target?.focus({ preventScroll: true });
    });
  }

  const isFirstNationsProject = state.audience === "first-nations";
  const stickyNextStep = state.step < steps.length - 1 ? state.step + 1 : 1;
  const stickyActionLabel = isFirstNationsProject
    ? [
        "Continue to Select Homes",
        "Continue to Design Project Homes",
        "Continue to Project Readiness",
        "Continue to Funding & Grant Corridors",
        "Continue to Review Project",
        "Create Opportunity Report",
        "Continue to Project Review / LOU",
        "View / Edit Project Homes",
      ][state.step]
    : "View / Edit My Project";
  const bottomActionLabel = isFirstNationsProject
    ? [
        "Continue to Select Homes",
        "Continue to Design Project Homes",
        "Continue to Project Readiness",
        "Continue to Funding & Grant Corridors",
        "Continue to Review Project",
        "Create Opportunity Report",
      ][state.step]
    : state.step === 2
      ? "Refine My Project"
      : state.step === 6
        ? "Create Opportunity Report"
        : "Continue";

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
            <button key={step.label} type="button" onClick={() => index <= state.step ? goToStep(index) : undefined} disabled={index > state.step} aria-current={index === state.step ? "step" : undefined} className={cn("flex min-w-max items-center gap-3 border px-4 py-3 text-left transition-colors", index === state.step ? "border-black bg-black text-white" : index < state.step ? unselectedControlClassName : "cursor-not-allowed border-black/10 text-black/25")}>
              <span className="font-mono text-[8px]">{String(index + 1).padStart(2, "0")}</span><span className="text-[9px] font-semibold uppercase tracking-[0.14em]">{step.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="planner-screen-only sticky top-[4.5rem] z-30 border-b border-black/14 bg-[#edeae2]/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1504px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-black/42">
              Your Project{state.projectId ? ` / ${state.projectId}` : ""}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/72">
              {projectSummary.totalHomes} {projectSummary.totalHomes === 1 ? "home" : "homes"} · {projectSummary.modelCount} {projectSummary.modelCount === 1 ? "model" : "models"} · {projectSummary.phaseCount} delivery {projectSummary.phaseCount === 1 ? "group" : "groups"} · {designProgress.completedDesigns} of {designProgress.totalDesignGroups} {designProgress.totalDesignGroups === 1 ? "design group" : "design groups"} complete
            </p>
            <p className="mt-2 text-[10px] leading-4 text-black/46">
              {includedHomeTypes.length ? `Included: ${includedHomeTypes.join(", ")}.` : "No homes added yet."}
              {completedHomeTypes.length ? ` Configured: ${completedHomeTypes.join(", ")}.` : ""}
              {remainingHomeTypes.length ? ` Next: ${remainingHomeTypes.join(", ")}.` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => goToStep(isFirstNationsProject ? stickyNextStep : 1)}
            disabled={isFirstNationsProject && !canContinue}
            data-continue-project
            className="inline-flex min-h-12 shrink-0 items-center justify-between gap-5 bg-black px-5 text-left text-[9px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-black/78 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:bg-black/25"
          >
            {stickyActionLabel} <ArrowRight aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1504px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28">
        {state.step === 0 && state.audience === "first-nations" ? <StartStep state={state} update={(patch) => setState((current) => ({ ...current, ...patch }))} /> : null}
        {state.step === 0 && state.audience !== "first-nations" ? <AudienceStartStep state={state} setState={setState} /> : null}
        {state.step === 1 ? <PortfolioStep state={state} setState={setState} catalog={catalog} onContinueToDesign={() => goToStep(isFirstNationsProject ? 2 : 4)} /> : null}
        {isFirstNationsProject && state.step === 2 ? <DesignStep state={state} setState={setState} catalog={catalog} returnNotice={returnNotice} onContinue={() => goToStep(3)} /> : null}
        {isFirstNationsProject && state.step === 3 ? <FirstNationsProjectReadinessStep state={state} setState={setState} catalog={catalog} /> : null}
        {isFirstNationsProject && state.step === 4 ? <FundingStep state={state} setState={setState} catalog={catalog} corridors={fundingCorridors} /> : null}
        {isFirstNationsProject && state.step === 5 ? <FirstNationsProjectReviewSummary state={state} catalog={catalog} onEditHomes={() => goToStep(1)} onEditDesigns={() => goToStep(2)} onEditReadiness={() => goToStep(3)} /> : null}
        {isFirstNationsProject && state.step === 6 ? <OpportunityReport state={state} onBeginReview={() => goToStep(7)} onEditProject={() => goToStep(1)} onPrevious={() => goToStep(5)} onReset={resetPlanner} catalog={catalog} corridors={fundingCorridors} /> : null}
        {isFirstNationsProject && state.step === 7 ? <ProjectReviewStep state={state} setState={setState} catalog={catalog} corridors={fundingCorridors} onViewReport={() => goToStep(6, "planner-opportunity-report")} onEditProject={() => goToStep(1)} onEditReadiness={() => goToStep(3)} /> : null}
        {!isFirstNationsProject && state.step === 2 ? <EstimatePanel state={state} catalog={catalog} /> : null}
        {!isFirstNationsProject && state.step === 3 ? <RefineStep state={state} setState={setState} /> : null}
        {!isFirstNationsProject && state.step === 4 ? <DesignStep state={state} setState={setState} catalog={catalog} returnNotice={returnNotice} onContinue={() => goToStep(5)} /> : null}
        {!isFirstNationsProject && state.step === 5 ? <FundingStep state={state} setState={setState} catalog={catalog} corridors={fundingCorridors} /> : null}
        {!isFirstNationsProject && state.step === 6 ? <ScaleReadinessStep state={state} catalog={catalog} /> : null}
        {!isFirstNationsProject && state.step === 7 ? <OpportunityReport state={state} onBeginReview={() => goToStep(8)} onEditProject={() => goToStep(1)} onPrevious={() => goToStep(6)} onReset={resetPlanner} catalog={catalog} corridors={fundingCorridors} /> : null}
        {!isFirstNationsProject && state.step === 8 ? <ProjectReviewStep state={state} setState={setState} catalog={catalog} corridors={fundingCorridors} onViewReport={() => goToStep(7, "planner-opportunity-report")} onEditProject={() => goToStep(1)} onEditReadiness={() => goToStep(3)} /> : null}

        {state.step < (isFirstNationsProject ? 6 : 7) ? <div className="planner-screen-only mt-20 flex flex-col-reverse gap-4 border-t border-black/16 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => goToStep(state.step - 1)} disabled={state.step === 0} className="inline-flex min-h-12 items-center gap-3 border border-black/30 bg-white/35 px-5 text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors hover:border-black hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"><ArrowLeft aria-hidden="true" className="size-4" /> Previous</button>
            <button type="button" onClick={resetPlanner} className="inline-flex min-h-12 items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/42 hover:text-black"><RotateCcw aria-hidden="true" className="size-3.5" /> Start again</button>
          </div>
          <div><button type="button" onClick={() => goToStep(state.step + 1)} disabled={!canContinue} className="inline-flex min-h-12 min-w-60 items-center justify-between gap-8 bg-black px-5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-black/78 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:bg-black/25">{bottomActionLabel}<ArrowRight aria-hidden="true" className="size-4" /></button>{!canContinue ? <p className="mt-3 max-w-xs text-xs leading-5 text-black/45">{state.step === 0 ? (state.audience === "first-nations" ? "Add the community, location and approximate housing requirement to continue." : "Add the project name, location and approximate number of homes to continue.") : "Add at least one home model to continue."}</p> : null}</div>
        </div> : null}
      </div>
    </section>
  );
}

export const ProjectPortfolioPlanner = FirstNationsProjectPlanner;
