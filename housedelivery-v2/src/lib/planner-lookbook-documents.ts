import { isHomeInclusionLevel } from "@/data/home-configurator";
import { parseConfigurationId } from "@/lib/lookbook/configuration-id";
import { buildPlannerDesignHref, type PlannerDesignSession } from "@/lib/planner-design-session";
import type { PlannerCatalogItem, PlannerDesignVariation, PlannerState } from "@/lib/project-planner";

export function getPlannerLookBookDocument(
  state: Pick<PlannerState, "audience" | "reviewStatus" | "submissionId" | "submittedAt">,
  model: PlannerCatalogItem,
  variation: PlannerDesignVariation,
  session: PlannerDesignSession,
) {
  if (variation.status !== "complete" || !model.buildMyHref) return undefined;

  const id = parseConfigurationId(variation.lookBookConfigurationId);
  const configuration = variation.configuration;
  const savedTier = configuration?.inclusionTier;
  const tier = isHomeInclusionLevel(savedTier)
    ? savedTier === "premium" ? "Premium" : "Signature"
    : "Tier not recorded";

  // The same ID can exist in a local revision and on the previously submitted
  // server copy. Only use the server copy if it represents the saved revision.
  const submittedAt = Date.parse(state.submittedAt ?? "");
  const isSubmittedCopy =
    state.audience === "first-nations" &&
    state.reviewStatus === "submitted" &&
    Boolean(state.submissionId) &&
    Number.isFinite(submittedAt) &&
    (!variation.savedAt || Date.parse(variation.savedAt) <= submittedAt);
  if (id && isSubmittedCopy) {
    return {
      tier,
      browserLocal: false,
      viewHref: `/lookbook/${id}`,
      pdfHref: `/lookbook/${id}/pdf?disposition=attachment`,
    };
  }

  if (
    !configuration?.lookBookPersonalization ||
    configuration.homeId !== model.id.replace(/^custom:/, "") ||
    configuration.schemaVersion !== model.configurationVersion
  ) {
    return undefined;
  }

  return {
    tier,
    browserLocal: true,
    viewHref: id
      ? `/lookbook/${id}?local=1`
      : buildPlannerDesignHref(model.lookBookHref ?? model.buildMyHref, session, "look-book"),
    pdfHref: id
      ? `/lookbook/${id}?local=1&download=1`
      : buildPlannerDesignHref(model.lookBookHref ?? model.buildMyHref, session, "look-book-pdf"),
  };
}
