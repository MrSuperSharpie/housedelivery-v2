import assert from "node:assert/strict";
import test from "node:test";

import { firstNationsPlannerCatalog } from "@/data/first-nations-planner";
import { createDefaultHomeConfiguration } from "@/data/home-configurator";
import { getHomeConfiguratorDefinition } from "@/data/home-configurators";
import { getPlannerReturnHref, type PlannerDesignSession } from "@/lib/planner-design-session";
import { getPlannerLookBookDocument } from "@/lib/planner-lookbook-documents";
import { createDefaultPlannerState, createPlannerDesignVariation, type PlannerAudience, type PlannerDesignVariation } from "@/lib/project-planner";

const model = firstNationsPlannerCatalog.find(({ id }) => id === "custom:solace")!;
const definition = getHomeConfiguratorDefinition("solace")!;
const id = "ae977fc4-8056-48a1-918d-93508e86df68";
const savedAt = "2026-11-19T18:00:00.000Z";

function fixture(audience: PlannerAudience) {
  const state = {
    ...createDefaultPlannerState(audience),
    community: "Fictional community",
    projectId: "DOCUMENTS-QA",
  };
  const variation: PlannerDesignVariation = {
    ...createPlannerDesignVariation("test-line", 1),
    status: "complete",
    inclusionTier: "signature",
    configuration: {
      ...createDefaultHomeConfiguration(definition),
      inclusionTier: "premium",
      lookBookPersonalization: { preparedAt: savedAt, reference: "SOL-DOCUMENTS-QA" },
    },
    lookBookConfigurationId: id,
    savedAt,
  };
  const session: PlannerDesignSession = {
    audience,
    projectName: state.community,
    projectId: state.projectId,
    lineId: "test-line",
    variationId: variation.id,
    modelId: model.id,
    homeName: model.name,
    designLabel: variation.label,
    assignedQuantity: 1,
    deliveryGroup: "Active / First Build",
    returnHref: getPlannerReturnHref(audience, "planner-design-center"),
  };

  return { state, variation, session };
}

test("draft and commercial documents open the saved local copy and retain its actual tier", () => {
  for (const audience of ["first-nations", "general-contractor", "developer"] as const) {
    const { state, variation, session } = fixture(audience);
    const current = audience === "first-nations" ? state : {
      ...state,
      reviewStatus: "submitted" as const,
      submissionId: "qa-submission",
      submittedAt: "2026-11-19T19:00:00.000Z",
    };
    assert.deepEqual(getPlannerLookBookDocument(current, model, variation, session), {
      tier: "Premium",
      browserLocal: true,
      viewHref: `/lookbook/${id}?local=1`,
      pdfHref: `/lookbook/${id}?local=1&download=1`,
    });
  }
});

test("submitted First Nations copies use the existing record, while revisions stay local", () => {
  const { state, variation, session } = fixture("first-nations");
  const submitted = { ...state, reviewStatus: "submitted" as const, submissionId: "qa-submission", submittedAt: "2026-11-19T19:00:00.000Z" };
  assert.deepEqual(getPlannerLookBookDocument(submitted, model, variation, session), {
    tier: "Premium",
    browserLocal: false,
    viewHref: `/lookbook/${id}`,
    pdfHref: `/lookbook/${id}/pdf?disposition=attachment`,
  });
  const revised = { ...variation, savedAt: "2026-11-19T20:00:00.000Z" };
  assert.equal(getPlannerLookBookDocument(submitted, model, revised, session)?.browserLocal, true);
  assert.equal(getPlannerLookBookDocument({ ...submitted, submissionId: "" }, model, variation, session)?.browserLocal, true);
});

test("legacy saved copies can use their model page and pending or unusable copies have no links", () => {
  const { state, variation, session } = fixture("first-nations");
  const legacy = {
    ...variation,
    lookBookConfigurationId: undefined,
    configuration: { ...variation.configuration!, inclusionTier: undefined },
  };
  const document = getPlannerLookBookDocument(state, model, legacy, session)!;
  assert.equal(document.tier, "Tier not recorded");
  const view = new URL(document.viewHref, "https://www.housedelivery.ca");
  const pdf = new URL(document.pdfHref, view.origin);
  assert.equal(view.pathname, "/homes/solace");
  assert.equal(view.searchParams.get("plannerView"), "look-book");
  assert.equal(view.searchParams.get("download"), null);
  assert.equal(pdf.searchParams.get("download"), "1");
  assert.equal(pdf.hash, "#home-look-book");
  assert.equal(getPlannerLookBookDocument(state, model, { ...variation, status: "draft" }, session), undefined);
  assert.equal(getPlannerLookBookDocument(state, model, { ...variation, configuration: undefined }, session), undefined);
  assert.equal(getPlannerLookBookDocument(state, { ...model, configurationVersion: 0 }, variation, session), undefined);
});


test("submitted links keep the saved access capability and a newer revision stays browser-local", () => {
  const { state, variation, session } = fixture("first-nations");
  const submitted = { ...state, reviewStatus: "submitted" as const, submissionId: "qa-private-submission", submittedAt: "2026-11-19T19:00:00.000Z" };
  const access = "test-access-token-for-saved-look-book".padEnd(43, "0");
  const signed = { ...variation, lookBookAccessToken: access };
  const book = getPlannerLookBookDocument(submitted, model, signed, session);
  assert.equal(book?.viewHref, `/lookbook/${id}?projectAccess=${access}`);
  assert.equal(book?.pdfHref, `/lookbook/${id}/pdf?disposition=attachment&projectAccess=${access}`);
  const revised = { ...signed, savedAt: "2026-11-19T20:00:00.000Z" };
  assert.equal(getPlannerLookBookDocument(submitted, model, revised, session)?.viewHref, `/lookbook/${id}?local=1`);
});
