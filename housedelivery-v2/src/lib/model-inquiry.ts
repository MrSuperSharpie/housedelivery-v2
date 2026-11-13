import { readPlannerDesignSession, readPlannerHomeViewContext, readPlannerHomeViewReturnHref, type PlannerHomeViewContext } from "@/lib/planner-design-session";
import type { HomeModel } from "@/data/models";

type KnownModels = readonly Pick<HomeModel, "slug">[];

export function resolveInitialModelSlug(value: string | null | undefined, models: KnownModels) {
  return typeof value === "string" && models.some(model => model.slug === value) ? value : "";
}

export function buildModelInquiryHref(slug: string, models: KnownModels) {
  const selected = resolveInitialModelSlug(slug, models);
  return selected ? `/?model=${encodeURIComponent(selected)}#reserve` : "/#reserve";
}

/** Presentation labels differ (for example Langley / Langley House). The
 * validated planner's stable model ID identifies the current custom home. */
export function matchesModelPlannerContext(
  context: PlannerHomeViewContext | undefined,
  model: { id?: string; name?: string },
): context is PlannerHomeViewContext {
  return context !== undefined && (model.id ? context.modelId === model.id : Boolean(model.name && context.homeName === model.name));
}

/** Accept either native planner entry point, using its existing return-path
 * validation. A display name is never sufficient to attach another model. */
export function readModelProjectReturn(search: string, modelId: string) {
  const view = readPlannerHomeViewContext(search);
  if (view?.modelId === modelId) return view.returnHref;
  const design = readPlannerDesignSession(search);
  if (design?.modelId === modelId) return design.returnHref;
  // Preserve Salt Spring's existing legacy home-view return format. Do not
  // attach it when a different model is explicitly identified in the URL.
  if (modelId === "custom:salt-spring" && !new URLSearchParams(search).has("plannerModel")) return readPlannerHomeViewReturnHref(search);
  return undefined;
}
