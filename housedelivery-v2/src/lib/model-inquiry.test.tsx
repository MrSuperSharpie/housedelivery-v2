import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReservationForm } from "@/components/reservation-form";
import { models } from "@/data/models";
import { buildModelInquiryHref, matchesModelPlannerContext, readModelProjectReturn, resolveInitialModelSlug } from "@/lib/model-inquiry";

test("model inquiry destinations allow only existing custom-home slugs", () => {
  for (const model of models) {
    assert.equal(resolveInitialModelSlug(model.slug, models), model.slug);
    assert.equal(buildModelInquiryHref(model.slug, models), `/?model=${model.slug}#reserve`);
  }
  for (const value of [undefined, null, "", "unknown", "__proto__", "../mayne", "willow-nook", "<script>"]) assert.equal(resolveInitialModelSlug(value, models), "");
  assert.equal(buildModelInquiryHref("unknown", models), "/#reserve");
});

test("the existing inquiry form renders a valid initial model and retains every editable option", () => {
  const html = renderToStaticMarkup(<ReservationForm models={models} initialModel="mayne" />);
  assert.match(html, /<option value="mayne" selected=""/);
  for (const model of models) assert.ok(html.includes(`value="${model.slug}"`));
  assert.match(renderToStaticMarkup(<ReservationForm models={models} initialModel="invalid" />), /<option value="" selected=""/);
  assert.match(renderToStaticMarkup(<ReservationForm models={models} />), /<option value="" selected=""/);
});

test("validated planner IDs retain context across display-label variations", () => {
  const context = { audience: "developer" as const, projectName: "QA programme", totalHomes: 12, modelId: "custom:langley", homeName: "Langley", homeQuantity: 2, requestedQuantity: 2, phase: "phase-1" as const, returnHref: "/project-portfolio-planner?audience=developer#planner" };
  assert.equal(matchesModelPlannerContext(context, { id: "custom:langley", name: "Langley House" }), true);
  assert.equal(matchesModelPlannerContext(context, { id: "custom:solace", name: "Langley" }), false);
  assert.equal(matchesModelPlannerContext(undefined, { id: "custom:langley" }), false);
  assert.equal(matchesModelPlannerContext(context, { name: "Langley" }), true);
});


test("project returns accept both native entry formats and reject another model or external destination", async () => {
  const { buildPlannerDesignHref, buildPlannerHomeViewHref, getPlannerReturnHref } = await import("@/lib/planner-design-session");
  for (const audience of ["first-nations", "developer"] as const) {
    const returnHref = getPlannerReturnHref(audience, "planner-design-center");
    const design = { audience, projectName: "QA programme", lineId: "qa-line", variationId: "qa-line:design-a", modelId: "custom:profile", homeName: "Profile", designLabel: "Design Group A", assignedQuantity: 2, deliveryGroup: "Active / First Build", returnHref };
    const view = { audience, projectName: "QA programme", totalHomes: 12, modelId: design.modelId, homeName: design.homeName, homeQuantity: 2, requestedQuantity: 2, phase: "phase-1" as const, returnHref, designSession: design };
    for (const href of [buildPlannerDesignHref("/homes/profile", design), buildPlannerHomeViewHref("/homes/profile", view)]) {
      const url = new URL(href, "https://www.housedelivery.ca");
      assert.equal(readModelProjectReturn(url.search, "custom:profile"), returnHref);
      assert.equal(readModelProjectReturn(url.search, "custom:langley"), undefined);
      url.searchParams.set("plannerReturn", "https://example.com");
      assert.equal(readModelProjectReturn(url.search, "custom:profile"), undefined);
    }
  }
  assert.equal(readModelProjectReturn("?planner=developer&plannerReturn=/project-portfolio-planner", "custom:langley"), undefined);
  const legacy = "?planner=first-nations&plannerView=home&plannerReturn=%2Ffirst-nations-project-planner%23planner";
  assert.equal(readModelProjectReturn(legacy, "custom:salt-spring"), "/first-nations-project-planner#planner");
  assert.equal(readModelProjectReturn(`${legacy}&plannerModel=custom:langley`, "custom:salt-spring"), undefined);
});
