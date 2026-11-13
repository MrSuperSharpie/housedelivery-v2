import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeArchitecturalSpecifications } from "@/components/home-architectural-specifications";
import { customHomePresentations, type CustomHomePresentation } from "@/data/custom-home-presentation";
import { getHomeConfiguratorRegistration } from "@/data/home-configurators";
import { models, type HomeModel } from "@/data/models";
import { homeImageId, resolveCustomHomePresentation } from "@/lib/custom-home-presentation";

test("the presentation collection covers all current canonical custom homes", () => {
  assert.deepEqual(Object.keys(customHomePresentations).sort(), models.map(model => model.slug).sort());
  for (const model of models) {
    const registration = getHomeConfiguratorRegistration("custom-home", model.slug);
    assert.equal(registration?.migrationStatus, "canonical");
    assert.equal(registration.activeChapterIds.length, model.slug === "salt-spring" ? 14 : 8);
    assert.ok(!("projectSelectionStatus" in model && model.projectSelectionStatus));
  }
});

test("model actions point to available sections and optional links match rendered media", () => {
  for (const model of models) {
    const result = resolveCustomHomePresentation(model)!;
    const ids = result.sections.map(section => section.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.some(id => id === result.hero.primaryAction.href.slice(1)));
    assert.equal(ids.includes("film"), Boolean("video" in model && model.video));
    assert.ok(ids.includes("home-inclusions"));
    const unavailable = resolveCustomHomePresentation(model, { hasDesignTool: false })!;
    assert.equal(unavailable.hero.primaryAction.href, "#plans");
    assert.ok(!unavailable.sections.some(section => section.id === "home-inclusions"));
  }
});

test("source media, source identity and full-gallery scene references are preserved", () => {
  for (const model of models) {
    const result = resolveCustomHomePresentation(model)!;
    assert.deepEqual(result.gallery.map(image => image.src), model.images.filter(src => src !== model.floorPlanImage));
    assert.equal(result.reviewNotes.length, 0);
    for (const image of result.gallery) assert.ok(Object.hasOwn(customHomePresentations[model.slug].gallery, image.id));
    for (const scene of result.story.scenes) assert.equal(result.gallery[scene.galleryIndex].src, scene.src);
    assert.equal(new Set(result.story.scenes.map(scene => scene.src)).size, result.story.scenes.length);
  }
  const southBay = models.find(model => model.slug === "south-bay")!;
  assert.equal(resolveCustomHomePresentation(southBay)!.gallery.length, 7);
  assert.equal(resolveCustomHomePresentation(models[0])!.fullGalleryId, "langley-full-gallery");
});

test("missing scenes downgrade pinning without losing architectural media or source paragraphs", () => {
  const model = models.find(model => model.slug === "saturna")!;
  const original = resolveCustomHomePresentation(model)!;
  const reduced = { ...model, images: model.images.filter(src => src !== original.story.scenes[0].src) };
  const result = resolveCustomHomePresentation(reduced)!;
  assert.equal(result.story.mode, "editorial");
  assert.equal(result.story.scenes.length, 2);
  assert.deepEqual(result.gallery.map(image => image.src), reduced.images.filter(src => src !== reduced.floorPlanImage));
  assert.deepEqual(reduced.narrative, model.narrative);
  const future = { ...model, slug: "future-home", images: ["/open-plan-living.jpg"] };
  assert.equal(resolveCustomHomePresentation(future), undefined);
  const namedPlan = resolveCustomHomePresentation({ ...model, images: [...model.images, "/open-plan-living.jpg"] })!;
  assert.ok(namedPlan.gallery.some(image => image.src === "/open-plan-living.jpg"));
});

test("invalid approved excerpts and invalid timing use normal-flow fallbacks", () => {
  const model = models[0];
  const baseline = customHomePresentations.langley;
  const definition: CustomHomePresentation = { ...baseline, story: { ...baseline.story, transitions: [{ from: 0.4, to: 0.2 }, { from: 0.6, to: 0.7 }] } };
  assert.equal(resolveCustomHomePresentation(model, { definition })!.story.mode, "editorial");
  const badCopy: CustomHomePresentation = { ...baseline, story: { ...baseline.story, scenes: [{ ...baseline.story.scenes[0], copy: { kind: "approved-excerpt", narrativeTitle: model.narrative[0].title, text: "Unverified replacement" } }, baseline.story.scenes[1], baseline.story.scenes[2]] } };
  const result = resolveCustomHomePresentation(model, { definition: badCopy })!;
  assert.equal(result.story.mode, "editorial");
  assert.equal(result.gallery.length, 7);
});

function specifications(model: HomeModel) {
  return renderToStaticMarkup(<HomeArchitecturalSpecifications model={model} specifications={[
    { label: "Structure", value: model.structure },
    { label: "Accommodation", value: `${model.bedrooms} bed · ${model.bathrooms ?? "Plan"} bath` },
    { label: "Main level", value: model.levels.main === null ? "Plan-specific" : model.levels.main.toLocaleString("en-CA") },
    { label: "Upper level", value: model.levels.upper === null ? "Plan-specific" : model.levels.upper.toLocaleString("en-CA") },
  ]} />);
}

test("the editorial specifications preserve metric totals, unknown values and zero garage", () => {
  for (const slug of ["salt-spring", "keats", "mayne"]) {
    const model: HomeModel = models.find(model => model.slug === slug)!;
    const html = specifications(model);
    assert.match(html, new RegExp(model.squareMetres!.toLocaleString("en-CA").replace(".", "\\.") + " m² total area"));
    assert.match(html, /Project-specific/);
  }
  assert.match(specifications(models.find(model => model.slug === "mayne")!), /No garage/);
  const langley = specifications(models[0]);
  assert.match(langley, /Garage configuration varies/);
  assert.match(langley, /Baths on request/);
  assert.match(langley, /Plan-specific/);
  for (const [slug, total] of [["maplewood", "3,422"], ["cedarview", "3,337"]]) assert.ok(specifications(models.find(model => model.slug === slug)!).includes(total));
});

test("resolving all presentations leaves approved source facts and paragraphs unchanged", () => {
  const before = JSON.stringify(models);
  for (const model of models) resolveCustomHomePresentation(model);
  assert.equal(JSON.stringify(models), before);
  assert.equal(homeImageId("/Belgium%20Living%20Room.jpg"), "Belgium Living Room.jpg");
});
