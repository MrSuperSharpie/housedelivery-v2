import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { getDuplexTierDefinition } from "@/data/duplex-home-pricing";
import { firstNationsPlannerCatalog } from "@/data/first-nations-planner";
import {
  getHomeConfiguratorJourneyCategories,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
  type HomeInclusionLevel,
} from "@/data/home-configurator";
import { getHomeConfiguratorDefinition } from "@/data/home-configurators";
import { applyHomeTier, getHomeTierDefinition } from "@/data/home-pricing";
import { parseCompletedLookBook } from "@/lib/lookbook/domain";
import {
  applyPlannerDesignReturn,
  buildPlannerDesignHref,
  getLegacyPlannerConfigurationKey,
  getPlannerConfigurationKey,
  getPlannerReturnHref,
  readPlannerDesignSession,
  type PlannerDesignSession,
} from "@/lib/planner-design-session";
import {
  createDefaultPlannerState,
  createPlannerDesignVariation,
  migratePlannerState,
} from "@/lib/project-planner";

const base = "https://www.housedelivery.ca";
const homePath = "/homes/solace";
const audiences = ["first-nations", "general-contractor", "developer"] as const;
const tiers = ["premium", "signature"] as const;
const solace = getHomeConfiguratorDefinition("solace")!;

function completeConfiguration(definition: HomeConfiguratorDefinition) {
  const configuration: HomeConfiguration = {
    schemaVersion: definition.configurationVersion,
    homeId: definition.homeId,
    inclusionSelections: {},
    flooringSelections: {},
    reviewStatus: "ready-for-review",
    lookBookPersonalization: null,
  };
  for (const category of getHomeConfiguratorJourneyCategories(definition)) {
    if (category.kind === "flooring") {
      for (const zone of category.zones) {
        configuration.flooringSelections[zone.id] = {
          optionId: zone.options[0].id,
          status: "confirmed",
        };
      }
    } else {
      configuration.inclusionSelections[category.id] = {
        optionId: category.options[0].id,
        status: "confirmed",
      };
    }
  }
  return configuration;
}

function fixture(audience: (typeof audiences)[number], inclusionTier?: HomeInclusionLevel) {
  const variation = createPlannerDesignVariation("line-1", 1);
  const state = {
    ...createDefaultPlannerState(audience),
    projectId: "tier-test",
    community: "Fictional project",
    portfolio: [{
      id: "line-1",
      modelId: "custom:solace",
      quantity: 1,
      phase: "phase-1" as const,
      designVariations: [variation],
    }],
  };
  const session: PlannerDesignSession = {
    audience,
    projectId: state.projectId,
    projectName: state.community,
    lineId: "line-1",
    modelId: "custom:solace",
    homeName: "Solace",
    variationId: variation.id,
    designLabel: variation.label,
    assignedQuantity: 1,
    deliveryGroup: "Active / First Build",
    returnHref: getPlannerReturnHref(audience, "planner-design-center"),
    inclusionTier,
  };
  return { state, session };
}

for (const [index, audience] of audiences.entries()) {
  test(`${audience} round-trips the Design Group tier through Studio, saved configuration and return`, () => {
    const tier = tiers[index % tiers.length];
    const { state, session } = fixture(audience, tier);
    const studioUrl = new URL(buildPlannerDesignHref(homePath, session), base);
    assert.equal(studioUrl.hash, "#home-inclusions");
    assert.equal(studioUrl.searchParams.get("inclusionTier"), tier);
    const studioSession = readPlannerDesignSession(studioUrl.search)!;
    assert.deepEqual(studioSession, session);
    assert.ok(getPlannerConfigurationKey(studioSession).endsWith(`:${tier}`));

    const definition = getHomeTierDefinition(solace, tier);
    const saved = applyPlannerDesignReturn(state, {
      ...studioSession,
      configuration: completeConfiguration(definition),
      lookBookConfigurationId: "879b7bd5-dff1-44a7-b80a-deebdd903a09",
      completedAt: "2026-11-19T21:00:00Z",
    });
    const migrated = migratePlannerState(JSON.parse(JSON.stringify(saved)))!;
    const variation = migrated.portfolio[0].designVariations[0];
    assert.equal(migrated.step, audience === "first-nations" ? 2 : 4);
    assert.equal(variation.status, "complete");
    assert.equal(variation.inclusionTier, tier);
    assert.equal(variation.configuration?.inclusionTier, tier);
    assert.equal(parseCompletedLookBook("solace", variation.configuration).configuration.inclusionTier, tier);
    assert.equal(variation.lookBookConfigurationId, "879b7bd5-dff1-44a7-b80a-deebdd903a09");
  });
}

test("a direct package choice overrides the group tier and saved viewing bypasses filtering", () => {
  const { session } = fixture("developer", "premium");
  const override = new URL(buildPlannerDesignHref(`${homePath}?plannerView=home&inclusionTier=signature`, session), base);
  assert.equal(override.searchParams.get("plannerView"), null);
  assert.equal(readPlannerDesignSession(override.search)?.inclusionTier, "signature");
  assert.notEqual(getPlannerConfigurationKey(session), getPlannerConfigurationKey({ ...session, inclusionTier: "signature" }));

  const saved = new URL(buildPlannerDesignHref(homePath, session, "look-book"), base);
  assert.equal(saved.hash, "#home-look-book");
  assert.equal(saved.searchParams.get("plannerView"), "look-book");
  assert.equal(saved.searchParams.get("inclusionTier"), null);
  const { session: legacy } = fixture("developer");
  assert.equal(getPlannerConfigurationKey(legacy), getLegacyPlannerConfigurationKey(session));
});

test("a mixed unmarked legacy Look Book stays valid and intact when starting a tiered revision", () => {
  const { state, session } = fixture("first-nations");
  const legacy = completeConfiguration(getHomeTierDefinition(solace, "premium"));
  const signature = completeConfiguration(getHomeTierDefinition(solace, "signature"));
  const signatureChapter = Object.keys(signature.inclusionSelections)[0];
  legacy.inclusionSelections[signatureChapter] = signature.inclusionSelections[signatureChapter];
  legacy.lookBookPersonalization = { reference: "LEGACY", preparedAt: "2026-11-18T12:00:00Z" };
  const prior = applyPlannerDesignReturn(state, { ...session, configuration: legacy, completedAt: "2026-11-18T12:00:00Z" });
  const variation = migratePlannerState(prior)!.portfolio[0].designVariations[0];
  assert.equal(variation.inclusionTier, undefined);
  assert.deepEqual(variation.configuration, legacy);
  const stored = parseCompletedLookBook("solace", legacy);
  assert.ok(stored.selections.some((selection) => selection.tier === "premium"));
  assert.ok(stored.selections.some((selection) => selection.tier === "signature"));
  assert.throws(() => parseCompletedLookBook("solace", { ...legacy, inclusionTier: "signature" }), /selected design option is invalid/);

  const revision = applyHomeTier(getHomeTierDefinition(solace, "signature"), legacy);
  assert.equal(revision.lookBookPersonalization, null);
  assert.equal(revision.inclusionSelections[signatureChapter]?.status, "confirmed");
  assert.equal(variation.configuration?.lookBookPersonalization?.reference, "LEGACY");
});

test("every configurable Planner model shows four options for the tier in tiered chapters", () => {
  for (const model of firstNationsPlannerCatalog.filter((item) => item.buildMyHref)) {
    const slug = model.id.replace(/^custom:/, "");
    const definition = getHomeConfiguratorDefinition(slug)!;
    assert.ok(definition, model.id);
    for (const tier of tiers) {
      const filtered = slug === "salt-spring"
        ? getDuplexTierDefinition(definition, { a: tier, b: tier }, tier)
        : getHomeTierDefinition(definition, tier);
      for (const category of getHomeConfiguratorJourneyCategories(filtered)) {
        const groups = category.kind === "flooring" ? category.zones : [category];
        for (const group of groups) {
          const sharedExterior = slug === "salt-spring" && group.id === "exterior-arrival-openings";
          assert.equal(group.options.length, sharedExterior ? 1 : 4, `${slug}: ${tier}: ${group.id}`);
          assert.ok(group.options.every((option) => option.level === tier || (sharedExterior && option.shared)));
        }
      }
      const completed = { ...completeConfiguration(filtered), inclusionTier: tier };
      assert.equal(parseCompletedLookBook(slug, completed).configuration.inclusionTier, tier);
    }
  }
});

test("tier comparisons reuse exactly four existing boards from each model's opening chapter", () => {
  for (const model of firstNationsPlannerCatalog) {
    const comparison = model.tierComparison;
    if (!model.buildMyHref) {
      assert.equal(comparison, undefined, model.id);
      continue;
    }

    assert.ok(comparison, model.id);
    const slug = model.id.replace(/^custom:/, "");
    const definition = getHomeConfiguratorDefinition(slug)!;
    for (const tier of tiers) {
      const chapter = getHomeConfiguratorJourneyCategories(getHomeTierDefinition(definition, tier))[0];
      assert.ok(chapter.kind !== "flooring");
      assert.equal(comparison.chapter, chapter.title);
      assert.deepEqual(comparison.boards[tier], chapter.options.map(({ name, image }) => ({ name, image })));
      assert.equal(comparison.boards[tier].length, 4);
      for (const { image } of comparison.boards[tier]) {
        assert.equal(image.role, "design-board");
        assert.ok(image.src.startsWith(`/images/homes/${slug}/`), image.src);
        assert.ok(existsSync(new URL(`../../public${image.src}`, import.meta.url)), image.src);
      }
    }
    assert.equal(new Set([...comparison.boards.premium, ...comparison.boards.signature].map(({ image }) => image.src)).size, 8);
  }
});
