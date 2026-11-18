import assert from "node:assert/strict";
import { test } from "node:test";

import { createDefaultHomeConfiguration, getHomeConfiguratorJourneyCategories } from "@/data/home-configurator";
import { getHomeConfiguratorDefinition } from "@/data/home-configurators";
import { getHomeTierDefinition } from "@/data/home-pricing";
import { applyInteriorCollection, getPersonalizedLookBookOffer } from "@/data/personalized-lookbook";
import { resolvePersonalizedLookBook } from "@/lib/lookbook/personalized";

const homeKey = "custom-home:solace";
const offer = getPersonalizedLookBookOffer(homeKey)!;
const definition = getHomeTierDefinition(getHomeConfiguratorDefinition("solace")!, "premium");
const coastal = offer.presets[0];

function createRequest() {
  const configuration = applyInteriorCollection(definition, createDefaultHomeConfiguration(definition), offer, coastal);
  for (const category of getHomeConfiguratorJourneyCategories(definition)) {
    assert.ok(category.kind === "room-look");
    const presetOption = configuration.inclusionSelections[category.id]?.optionId;
    const optionId = category.id === "kitchen-look-feel"
      ? "kitchen-look-feel-premium-2"
      : presetOption ?? category.options[0].id;
    configuration.inclusionSelections[category.id] = { optionId, status: "confirmed" };
  }
  return { homeKey, tier: "premium", collectionId: coastal.id, configuration, notes: "  Explore   brushed brass. " };
}

test("the interior preset preselects approved finishes without choosing architecture", () => {
  const configuration = applyInteriorCollection(definition, createDefaultHomeConfiguration(definition), offer, coastal);
  assert.deepEqual(configuration.inclusionSelections["kitchen-look-feel"], {
    optionId: "kitchen-look-feel-premium-1", status: "draft",
  });
  assert.equal(configuration.inclusionSelections["exterior-arrival-openings"], undefined);
  assert.equal(configuration.inclusionSelections["windows-patio-doors"], undefined);
});

test("the personalized brief keeps actual confirmed finishes, model assets and request notes", () => {
  const book = resolvePersonalizedLookBook(createRequest());
  assert.equal(book.brief.collectionName, "Coastal Light Oak");
  assert.equal(book.brief.tier, "premium");
  assert.equal(book.brief.notes, "Explore brushed brass.");
  assert.equal(book.brief.floorPlan?.src, "/solace-floorplan.jpg");
  assert.equal(book.definition.lookBook.home.heroImage.src, "/solace-1a.png");
  assert.equal(book.printConfiguration.inclusionSelections["kitchen-look-feel"]?.optionId, "kitchen-look-feel-premium-2");
  assert.deepEqual(resolvePersonalizedLookBook(book.document).brief, book.brief);
});

test("unsupported homes, package mismatches and unconfirmed or incompatible finishes are rejected", () => {
  const request = createRequest();
  assert.throws(() => resolvePersonalizedLookBook({ ...request, homeKey: "custom-home:langley" }), /unavailable/);
  assert.throws(() => resolvePersonalizedLookBook({ ...request, tier: "essential" }), /unavailable/);
  assert.throws(() => resolvePersonalizedLookBook({ ...request, tier: "signature" }), /unavailable/);
  assert.throws(() => resolvePersonalizedLookBook({ ...request, configuration: { ...request.configuration, homeId: "saturna" } }), /not valid/);
  request.configuration.inclusionSelections["kitchen-look-feel"] = { optionId: "kitchen-look-feel-signature-1", status: "confirmed" };
  assert.throws(() => resolvePersonalizedLookBook(request), /invalid/);
  request.configuration.inclusionSelections["kitchen-look-feel"] = { optionId: "kitchen-look-feel-premium-1", status: "draft" };
  assert.throws(() => resolvePersonalizedLookBook(request), /complete/);
});
