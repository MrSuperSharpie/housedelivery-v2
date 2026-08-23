import type { HomeConfiguration } from "@/data/home-configurator";
import {
  createPlannerDesignVariation,
  migratePlannerState,
  type PlannerPhase,
  type PlannerState,
} from "@/lib/project-planner";

export const PLANNER_STORAGE_KEY = "house-delivery:first-nations-planner:v1";
export const PLANNER_RETURN_KEY =
  "house-delivery:first-nations-planner:return:v1";

export type PlannerDesignSession = {
  projectName: string;
  lineId: string;
  variationId: string;
  modelId: string;
  homeName: string;
  designLabel: string;
  assignedQuantity: number;
  deliveryGroup: string;
  returnHref: string;
};

export type PlannerDesignReturn = PlannerDesignSession & {
  configuration: HomeConfiguration;
  completedAt: string;
};

export type PlannerHomeViewContext = {
  projectName: string;
  totalHomes: number;
  modelId: string;
  homeName: string;
  homeQuantity: number;
  requestedQuantity: number;
  phase: PlannerPhase;
  returnHref: string;
  designSession?: PlannerDesignSession;
};

const plannerPhaseLabels: Record<PlannerPhase, string> = {
  "phase-1": "Active / First Build",
  "phase-2": "Near-Term / Next Build",
  future: "Future Pipeline",
};

function isPlannerReturnHref(value: string) {
  return value.startsWith("/first-nations-project-planner");
}

function setPlannerDesignSessionParams(
  url: URL,
  session: PlannerDesignSession,
) {
  url.searchParams.set("plannerProject", session.projectName);
  url.searchParams.set("plannerLine", session.lineId);
  url.searchParams.set("plannerVariation", session.variationId);
  url.searchParams.set("plannerModel", session.modelId);
  url.searchParams.set("plannerHome", session.homeName);
  url.searchParams.set("plannerDesign", session.designLabel);
  url.searchParams.set("plannerQuantity", String(session.assignedQuantity));
  url.searchParams.set("plannerDeliveryGroup", session.deliveryGroup);
  url.searchParams.set("plannerReturn", session.returnHref);
}

export function getPlannerConfigurationKey(session: PlannerDesignSession) {
  return `house-delivery:planner-design:v1:${session.modelId}:${session.variationId}`;
}

export function buildPlannerDesignHref(
  baseHref: string,
  session: PlannerDesignSession,
  destination: "configure" | "look-book" = "configure",
) {
  const url = new URL(baseHref, "https://www.housedelivery.ca");
  url.searchParams.set("planner", "first-nations");
  setPlannerDesignSessionParams(url, session);
  url.hash = destination === "look-book" ? "home-look-book" : "home-inclusions";
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildPlannerHomeViewHref(
  baseHref: string,
  context: PlannerHomeViewContext,
) {
  const url = new URL(baseHref, "https://www.housedelivery.ca");
  url.searchParams.set("planner", "first-nations");
  url.searchParams.set("plannerView", "home");
  url.searchParams.set("plannerProject", context.projectName);
  url.searchParams.set("plannerTotalHomes", String(context.totalHomes));
  url.searchParams.set("plannerModel", context.modelId);
  url.searchParams.set("plannerHome", context.homeName);
  url.searchParams.set("plannerHomeQuantity", String(context.homeQuantity));
  url.searchParams.set(
    "plannerRequestedQuantity",
    String(context.requestedQuantity),
  );
  url.searchParams.set("plannerPhase", context.phase);
  url.searchParams.set("plannerReturn", context.returnHref);
  if (context.designSession) {
    setPlannerDesignSessionParams(url, context.designSession);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function readPlannerHomeViewContext(
  search: string,
): PlannerHomeViewContext | undefined {
  const params = new URLSearchParams(search);
  const projectName = params.get("plannerProject");
  const modelId = params.get("plannerModel");
  const homeName = params.get("plannerHome");
  const returnHref = params.get("plannerReturn");
  const totalHomes = Number(params.get("plannerTotalHomes"));
  const homeQuantity = Number(params.get("plannerHomeQuantity"));
  const requestedQuantity = Number(params.get("plannerRequestedQuantity"));
  const phase = params.get("plannerPhase");

  if (
    params.get("planner") !== "first-nations" ||
    params.get("plannerView") !== "home" ||
    !projectName ||
    !modelId ||
    !homeName ||
    !returnHref ||
    !isPlannerReturnHref(returnHref) ||
    !Number.isFinite(totalHomes) ||
    totalHomes < 0 ||
    !Number.isFinite(homeQuantity) ||
    homeQuantity < 1 ||
    !Number.isFinite(requestedQuantity) ||
    requestedQuantity < 1 ||
    !phase ||
    !["phase-1", "phase-2", "future"].includes(phase)
  ) {
    return undefined;
  }

  const designSession = readPlannerDesignSession(search);
  if (
    designSession &&
    (designSession.projectName !== projectName ||
      designSession.modelId !== modelId ||
      designSession.homeName !== homeName ||
      designSession.returnHref !== returnHref)
  ) {
    return undefined;
  }

  return {
    projectName,
    totalHomes,
    modelId,
    homeName,
    homeQuantity,
    requestedQuantity,
    phase: phase as PlannerPhase,
    returnHref,
    ...(designSession ? { designSession } : {}),
  };
}

export function readPlannerHomeViewReturnHref(search: string) {
  const context = readPlannerHomeViewContext(search);
  if (context) return context.returnHref;

  const params = new URLSearchParams(search);
  const returnHref = params.get("plannerReturn");

  if (
    params.get("planner") !== "first-nations" ||
    params.get("plannerView") !== "home" ||
    !returnHref ||
    !isPlannerReturnHref(returnHref)
  ) {
    return undefined;
  }

  return returnHref;
}

export function readPlannerDesignSession(
  search: string,
): PlannerDesignSession | undefined {
  const params = new URLSearchParams(search);
  if (params.get("planner") !== "first-nations") return undefined;

  const projectName = params.get("plannerProject");
  const lineId = params.get("plannerLine");
  const variationId = params.get("plannerVariation");
  const modelId = params.get("plannerModel");
  const homeName = params.get("plannerHome");
  const designLabel = params.get("plannerDesign");
  const returnHref = params.get("plannerReturn");
  const deliveryGroup = params.get("plannerDeliveryGroup");
  const assignedQuantity = Number(params.get("plannerQuantity"));

  if (
    !projectName ||
    !lineId ||
    !variationId ||
    !modelId ||
    !homeName ||
    !designLabel ||
    !deliveryGroup ||
    !returnHref ||
    !isPlannerReturnHref(returnHref) ||
    !Number.isFinite(assignedQuantity) ||
    assignedQuantity < 1
  ) {
    return undefined;
  }

  return {
    projectName,
    lineId,
    variationId,
    modelId,
    homeName,
    designLabel,
    assignedQuantity,
    deliveryGroup,
    returnHref,
  };
}

export function addPlannerHomeViewContextToProject(
  context: PlannerHomeViewContext,
): PlannerDesignSession | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const saved = window.localStorage.getItem(PLANNER_STORAGE_KEY);
    const state = saved ? migratePlannerState(JSON.parse(saved)) : undefined;
    if (!state || state.community !== context.projectName) return undefined;

    const existing = state.portfolio.find(
      (line) => line.modelId === context.modelId,
    );
    const lineId =
      existing?.id ??
      (window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `line-${Date.now()}`);
    const line =
      existing ??
      {
        id: lineId,
        modelId: context.modelId,
        quantity: context.requestedQuantity,
        phase: context.phase,
        designVariations: [
          createPlannerDesignVariation(lineId, context.requestedQuantity),
        ],
      };
    const variation = line.designVariations[0];
    if (!variation) return undefined;

    const nextState: PlannerState = existing
      ? state
      : {
          ...state,
          step: 1,
          portfolio: [...state.portfolio, line],
        };
    window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(nextState));

    return {
      projectName: state.community,
      lineId: line.id,
      variationId: variation.id,
      modelId: context.modelId,
      homeName: context.homeName,
      designLabel: variation.label,
      assignedQuantity: variation.assignedQuantity,
      deliveryGroup: plannerPhaseLabels[line.phase],
      returnHref: context.returnHref,
    };
  } catch {
    return undefined;
  }
}
