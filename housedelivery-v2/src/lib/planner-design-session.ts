import type { HomeConfiguration } from "@/data/home-configurator";

export const PLANNER_STORAGE_KEY = "house-delivery:first-nations-planner:v1";
export const PLANNER_RETURN_KEY =
  "house-delivery:first-nations-planner:return:v1";

export type PlannerDesignSession = {
  lineId: string;
  variationId: string;
  modelId: string;
  homeName: string;
  designLabel: string;
  assignedQuantity: number;
  returnHref: string;
};

export type PlannerDesignReturn = PlannerDesignSession & {
  configuration: HomeConfiguration;
  completedAt: string;
};

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
  url.searchParams.set("plannerLine", session.lineId);
  url.searchParams.set("plannerVariation", session.variationId);
  url.searchParams.set("plannerModel", session.modelId);
  url.searchParams.set("plannerHome", session.homeName);
  url.searchParams.set("plannerDesign", session.designLabel);
  url.searchParams.set("plannerQuantity", String(session.assignedQuantity));
  url.searchParams.set("plannerReturn", session.returnHref);
  url.hash = destination === "look-book" ? "home-look-book" : "home-inclusions";
  return `${url.pathname}${url.search}${url.hash}`;
}

export function readPlannerDesignSession(
  search: string,
): PlannerDesignSession | undefined {
  const params = new URLSearchParams(search);
  if (params.get("planner") !== "first-nations") return undefined;

  const lineId = params.get("plannerLine");
  const variationId = params.get("plannerVariation");
  const modelId = params.get("plannerModel");
  const homeName = params.get("plannerHome");
  const designLabel = params.get("plannerDesign");
  const returnHref = params.get("plannerReturn");
  const assignedQuantity = Number(params.get("plannerQuantity"));

  if (
    !lineId ||
    !variationId ||
    !modelId ||
    !homeName ||
    !designLabel ||
    !returnHref ||
    !Number.isFinite(assignedQuantity) ||
    assignedQuantity < 1
  ) {
    return undefined;
  }

  return {
    lineId,
    variationId,
    modelId,
    homeName,
    designLabel,
    assignedQuantity,
    returnHref,
  };
}
