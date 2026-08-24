import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import test from "node:test";

import {
  getHomeConfiguratorJourneyCategories,
  getProjectCoordinatedCategories,
  getRequiredCategories,
  type HomeInclusionCategory,
} from "@/data/home-configurator";
import { finalHomeDesignCategoryId } from "@/data/home-configurator-order";
import {
  canonicalHomeConfiguratorChapterIds,
  canonicalHomeConfiguratorStages,
  getCanonicalHomeConfiguratorIssues,
  homeConfiguratorFamilyPolicies,
} from "@/data/home-configurator-architecture";
import {
  createHomeDesignPackageLibrary,
  resolveHomeDesignPackageReference,
} from "@/data/home-design-package-library";
import {
  getHomeConfiguratorDefinition,
  getHomeConfiguratorRegistration,
  getHomeConfiguratorRegistrationsByFamily,
  homeConfiguratorRegistrations,
} from "@/data/home-configurators";
import { getLookBookSelectionSections } from "@/data/home-look-book";
import { maplewoodHomeConfigurator } from "@/data/maplewood-home-configurator";
import { models } from "@/data/models";
import { saturnaHomeConfigurator } from "@/data/saturna-home-configurator";
import { solaceHomeConfigurator } from "@/data/solace-home-configurator";
import { timberlineHomeConfigurator } from "@/data/timberline-home-configurator";

const canonicalCustomHomeIds = new Set([
  "maplewood",
  "saturna",
  "solace",
  "timberline",
]);

function getCategoryOptions(category: HomeInclusionCategory) {
  if (category.kind === "standard" || category.kind === "room-look") {
    return category.options;
  }

  if (category.kind === "flooring") {
    return category.zones.flatMap((zone) => zone.options);
  }

  return [];
}

test("only approved Custom Homes expose a shared configurator", () => {
  for (const model of models) {
    const definition = getHomeConfiguratorDefinition(model.slug);

    if (!canonicalCustomHomeIds.has(model.slug)) {
      assert.equal(definition, undefined);
      continue;
    }

    assert.ok(definition, `Missing configurator for ${model.slug}`);
    assert.equal(definition.homeId, model.slug);
    assert.equal(definition.lookBook.home.id, model.slug);
    assert.equal(
      definition.lookBook.home.areaLabel,
      `${model.squareFeet.toLocaleString()} sq. ft.`,
    );
    assert.equal(
      getRequiredCategories(definition).length,
      7,
    );

    for (const category of definition.categories) {
      const options = getCategoryOptions(category);
      if (options.length === 0) continue;

      assert.ok(
        options.some((option) => option.level === "premium"),
        `${model.slug}/${category.id} is missing its Premium baseline`,
      );
      assert.ok(
        options.some((option) => option.level === "signature"),
        `${model.slug}/${category.id} is missing Signature upgrades`,
      );
    }
  }
});

test("all residential product families are registered without premature activation", () => {
  const customHomes =
    getHomeConfiguratorRegistrationsByFamily("custom-home");
  const carriageHomes = getHomeConfiguratorRegistrationsByFamily(
    "laneway-carriage-home",
  );
  const preApprovedHomes = getHomeConfiguratorRegistrationsByFamily(
    "pre-approved-home",
  );

  assert.equal(homeConfiguratorRegistrations.length, 29);
  assert.equal(customHomes.length, 16);
  assert.equal(carriageHomes.length, 6);
  assert.equal(preApprovedHomes.length, 7);
  assert.equal(new Set(homeConfiguratorRegistrations.map(({ key }) => key)).size, 29);
  assert.equal(
    customHomes.filter(
      (registration) => registration.migrationStatus === "canonical",
    ).length,
    4,
  );
  assert.ok(
    customHomes
      .filter((registration) => registration.migrationStatus === "canonical")
      .every(
        (registration) =>
          registration.definition !== undefined &&
          registration.activeChapterIds.length === 7,
      ),
  );
  assert.ok(
    customHomes
      .filter(
        (registration) =>
          registration.migrationStatus === "awaiting-approved-content",
      )
      .every(
        (registration) =>
          registration.definition === undefined &&
          registration.activeChapterIds.length === 0,
      ),
  );
  assert.ok(
    [...carriageHomes, ...preApprovedHomes].every(
      (registration) =>
        registration.migrationStatus === "awaiting-approved-content" &&
        registration.definition === undefined &&
        registration.activeChapterIds.length === 0,
    ),
  );
  assert.equal(getHomeConfiguratorDefinition("willow-nook"), undefined);
  assert.equal(getHomeConfiguratorDefinition("the-micro"), undefined);
});

test("Mayne House uses its approved gallery and remains Lookbook coming soon", () => {
  const mayne = models.find((model) => model.slug === "mayne");
  const assetDirectory = join(
    process.cwd(),
    "public/images/homes/mayne",
  );
  const expectedAssets = [
    "mayne-bathroom.jpg",
    "mayne-bedroom.jpg",
    "mayne-exterior-02.jpg",
    "mayne-floor-plan.jpg",
    "mayne-hero.jpg",
    "mayne-kitchen.jpg",
    "mayne-living-room.jpg",
  ];

  assert.ok(mayne);
  assert.equal(mayne.name, "Mayne House");
  assert.equal(mayne.squareFeet, 3116);
  assert.equal(mayne.squareMetres, 289.45);
  assert.equal(mayne.garageSpaces, 0);
  assert.equal(mayne.heroImage, "/images/homes/mayne/mayne-hero.jpg");
  assert.equal(
    mayne.floorPlanImage,
    "/images/homes/mayne/mayne-floor-plan.jpg",
  );
  assert.deepEqual(readdirSync(assetDirectory).sort(), expectedAssets);
  assert.equal(getHomeConfiguratorDefinition("mayne"), undefined);
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "mayne")
      ?.migrationStatus,
    "awaiting-approved-content",
  );
});

test("the family policy locks finish-only personalization and optional smaller-home chapters", () => {
  assert.equal(canonicalHomeConfiguratorStages.length, 8);
  assert.equal(
    canonicalHomeConfiguratorStages[7]?.title,
    "My Home / Review / Save as PDF",
  );
  assert.deepEqual(
    homeConfiguratorFamilyPolicies["custom-home"].defaultChapterIds,
    canonicalHomeConfiguratorChapterIds,
  );
  assert.equal(
    homeConfiguratorFamilyPolicies["laneway-carriage-home"]
      .allowsDisabledChapters,
    true,
  );
  assert.equal(
    homeConfiguratorFamilyPolicies["pre-approved-home"]
      .allowsDisabledChapters,
    true,
  );

  for (const policy of Object.values(homeConfiguratorFamilyPolicies)) {
    assert.equal(policy.personalizationScope, "design-finishes-only");
    assert.equal(policy.structuralArchitectureChangesAvailable, false);
    assert.equal(
      policy.technicalInformationPlacement,
      "product-page-outside-configurator",
    );
    assert.equal(policy.supportsProjectCoordinatedItems, true);
  }
});

test("design packages can resolve shared or home-specific approved content", () => {
  const testImage = {
    src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
    alt: "Test-only design package fixture.",
    fit: "contain" as const,
  };
  const library = createHomeDesignPackageLibrary([
    {
      packageId: "test.shared.flooring.warm-modern",
      chapterId: "whole-home-flooring-stairs",
      scope: { kind: "shared" },
      compatibleProductFamilies: [
        "custom-home",
        "laneway-carriage-home",
      ],
      option: {
        id: "shared-flooring-premium-1",
        level: "premium",
        optionNumber: "1",
        name: "Warm Modern",
        image: testImage,
      },
    },
    {
      packageId: "test.saturna.exterior.warm-modern",
      chapterId: "exterior-arrival-openings",
      scope: { kind: "home-specific", homeId: "saturna" },
      option: {
        id: "saturna-exterior-premium-1",
        level: "premium",
        optionNumber: "1",
        name: "Warm Modern",
        image: testImage,
      },
    },
  ]);

  const shared = resolveHomeDesignPackageReference(
    library,
    {
      packageId: "test.shared.flooring.warm-modern",
      overrides: { name: "Warm Natural" },
    },
    {
      homeId: "willow-nook",
      productFamily: "laneway-carriage-home",
      chapterId: "whole-home-flooring-stairs",
    },
  );
  assert.equal(shared.name, "Warm Natural");
  assert.equal(shared.sourceScope.kind, "shared");

  const saturnaExterior = resolveHomeDesignPackageReference(
    library,
    { packageId: "test.saturna.exterior.warm-modern" },
    {
      homeId: "saturna",
      productFamily: "custom-home",
      chapterId: "exterior-arrival-openings",
    },
  );
  assert.equal(saturnaExterior.sourceScope.kind, "home-specific");

  assert.throws(
    () =>
      resolveHomeDesignPackageReference(
        library,
        { packageId: "test.saturna.exterior.warm-modern" },
        {
          homeId: "solace",
          productFamily: "custom-home",
          chapterId: "exterior-arrival-openings",
        },
      ),
    /restricted to saturna/,
  );
});

test("Solace uses exactly seven approved visual-guide chapters", () => {
  const definition = getHomeConfiguratorDefinition("solace");
  assert.ok(definition);
  const requiredCategories = getRequiredCategories(definition);

  assert.strictEqual(definition, solaceHomeConfigurator);
  assert.deepEqual(getCanonicalHomeConfiguratorIssues(definition), []);
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "solace")
      ?.migrationStatus,
    "canonical",
  );
  assert.deepEqual(
    requiredCategories.map((category) => category.id),
    [
      "kitchen-look-feel",
      "primary-ensuite-look-feel",
      "primary-wardrobe",
      "interior-doors-details",
      "exterior-arrival-openings",
      "whole-home-flooring-stairs",
      "window-coverings",
    ],
  );
  assert.deepEqual(
    requiredCategories.map((category) => category.title),
    [
      "Kitchen Look & Feel",
      "Primary Ensuite Look & Feel",
      "Primary Wardrobe",
      "Interior Doors & Details",
      "Exterior Arrival & Openings",
      "Whole-Home Flooring & Stairs",
      "Window Coverings",
    ],
  );

  const referencedAssets: string[] = [];
  for (const category of requiredCategories) {
    assert.equal(category.kind, "room-look");
    if (category.kind !== "room-look") continue;

    assert.equal(category.options.length, 4);
    assert.deepEqual(
      category.options.map((option) => [option.level, option.optionNumber]),
      [
        ["premium", "1"],
        ["premium", "2"],
        ["signature", "1"],
        ["signature", "2"],
      ],
    );
    assert.ok(category.options.every((option) => option.image.fit === "contain"));
    assert.ok(
      category.options.every(
        (option) =>
          option.image.role === "design-board" &&
          option.image.quality === 100,
      ),
    );
    for (const option of category.options) {
      assert.ok(
        option.image.src.startsWith(
          "/images/homes/solace/visual-guide/Solace_",
        ),
      );
      referencedAssets.push(basename(option.image.src));
    }
  }

  const assetDirectory = join(
    process.cwd(),
    "public/images/homes/solace/visual-guide",
  );
  const approvedAssets = readdirSync(assetDirectory)
    .filter((filename) => filename.endsWith(".png"))
    .sort();
  assert.equal(approvedAssets.length, 28);
  assert.deepEqual(referencedAssets.toSorted(), approvedAssets);

  const selectionSectionIds = new Set(
    definition.lookBook.sections.flatMap((section) =>
      section.items
        .map((item) => item.categoryId)
        .filter((categoryId) => categoryId !== "appliances"),
    ),
  );
  assert.equal(selectionSectionIds.size, 7);
  assert.ok(
    requiredCategories.every((category) =>
      selectionSectionIds.has(category.id),
    ),
  );
  assert.equal(
    definition.lookBook.sections[0]?.title,
    "The Solace You Created",
  );
});

test("Maplewood uses exactly seven approved visual-guide chapters", () => {
  const definition = getHomeConfiguratorDefinition("maplewood");
  assert.ok(definition);
  const requiredCategories = getRequiredCategories(definition);

  assert.strictEqual(definition, maplewoodHomeConfigurator);
  assert.deepEqual(getCanonicalHomeConfiguratorIssues(definition), []);
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "maplewood")
      ?.migrationStatus,
    "canonical",
  );
  assert.deepEqual(
    requiredCategories.map((category) => [category.id, category.title]),
    [
      ["kitchen-look-feel", "Kitchen Look & Feel"],
      ["primary-ensuite-look-feel", "Primary Ensuite Look & Feel"],
      ["primary-wardrobe", "Primary Wardrobe"],
      ["interior-doors-details", "Interior Doors & Details"],
      ["exterior-arrival-openings", "Exterior Arrival & Openings"],
      ["whole-home-flooring-stairs", "Whole-Home Flooring & Stairs"],
      ["window-coverings", "Window Coverings"],
    ],
  );

  const referencedAssets: string[] = [];
  for (const category of requiredCategories) {
    assert.equal(category.kind, "room-look");
    if (category.kind !== "room-look") continue;

    assert.equal(category.options.length, 4);
    assert.deepEqual(
      category.options.map((option) => [option.level, option.optionNumber]),
      [
        ["premium", "1"],
        ["premium", "2"],
        ["signature", "1"],
        ["signature", "2"],
      ],
    );
    assert.ok(category.options.every((option) => option.image.fit === "contain"));
    assert.ok(
      category.options.every(
        (option) =>
          option.image.role === "design-board" &&
          option.image.quality === 100,
      ),
    );
    for (const option of category.options) {
      assert.ok(
        option.image.src.startsWith(
          "/images/homes/maplewood/visual-guide/Maplewood_",
        ),
      );
      referencedAssets.push(basename(option.image.src));
    }
  }

  const ensuite = requiredCategories.find(
    (category) => category.id === "primary-ensuite-look-feel",
  );
  assert.equal(ensuite?.kind, "room-look");
  if (ensuite?.kind === "room-look") {
    assert.deepEqual(
      ensuite.options.map((option) => option.name),
      ["Natural Spa", "Warm Modern", "Timeless Elegance", "Sculpted White"],
    );
  }

  const assetDirectory = join(
    process.cwd(),
    "public/images/homes/maplewood/visual-guide",
  );
  const approvedAssets = readdirSync(assetDirectory)
    .filter((filename) => filename.endsWith(".png"))
    .sort();
  assert.equal(approvedAssets.length, 28);
  assert.deepEqual(referencedAssets.toSorted(), approvedAssets);

  const coordinated = getProjectCoordinatedCategories(definition);
  assert.deepEqual(coordinated.map((category) => category.id), ["appliances"]);
  assert.equal(coordinated[0]?.coordinatedMessage, "Project Coordinated");
  assert.match(
    coordinated[0]?.description ?? "",
    /final appliance package and model selections are confirmed during project review/i,
  );

  const selectionSectionIds = new Set(
    definition.lookBook.sections.flatMap((section) =>
      section.items
        .map((item) => item.categoryId)
        .filter((categoryId) => categoryId !== "appliances"),
    ),
  );
  assert.equal(selectionSectionIds.size, 7);
  assert.ok(
    requiredCategories.every((category) =>
      selectionSectionIds.has(category.id),
    ),
  );
  assert.equal(
    definition.lookBook.sections[0]?.title,
    "The Maplewood You Created",
  );
});

test("Timberline uses exactly seven approved visual-guide chapters", () => {
  const definition = getHomeConfiguratorDefinition("timberline");
  assert.ok(definition);
  const requiredCategories = getRequiredCategories(definition);

  assert.strictEqual(definition, timberlineHomeConfigurator);
  assert.deepEqual(getCanonicalHomeConfiguratorIssues(definition), []);
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "timberline")
      ?.migrationStatus,
    "canonical",
  );
  assert.deepEqual(
    requiredCategories.map((category) => [category.id, category.title]),
    [
      ["kitchen-look-feel", "Kitchen Look & Feel"],
      ["primary-ensuite-look-feel", "Primary Ensuite Look & Feel"],
      ["primary-wardrobe", "Primary Wardrobe"],
      ["interior-doors-details", "Interior Doors & Details"],
      ["exterior-arrival-openings", "Exterior Arrival & Openings"],
      ["whole-home-flooring-stairs", "Whole-Home Flooring & Stairs"],
      ["window-coverings", "Window Coverings"],
    ],
  );

  const expectedOptionNames = new Map([
    [
      "kitchen-look-feel",
      ["Coastal Light Oak", "Soft White", "Stone Wrapped Oak", "Sculpted White"],
    ],
    [
      "primary-ensuite-look-feel",
      ["Coastal Light Oak", "Soft White", "Stone Wrapped Oak", "Sculpted White"],
    ],
    [
      "primary-wardrobe",
      ["Warm Natural Oak", "Tailored Light", "Smoked Oak Charcoal", "Limestone Bronze"],
    ],
    [
      "interior-doors-details",
      ["Warm Natural Oak", "Tailored Light", "Smoked Oak Charcoal", "Limestone Bronze"],
    ],
    [
      "exterior-arrival-openings",
      ["Coastal Light Oak", "Soft White", "Stone Wrapped Oak", "Sculpted White"],
    ],
    [
      "whole-home-flooring-stairs",
      ["Warm Natural Oak", "Tailored Light", "Smoked Oak Charcoal", "Limestone Bronze"],
    ],
    [
      "window-coverings",
      ["Warm Natural", "Tailored Light", "Charcoal Smoked Oak", "Limestone Bronze"],
    ],
  ]);

  const referencedAssets: string[] = [];
  for (const category of requiredCategories) {
    assert.equal(category.kind, "room-look");
    if (category.kind !== "room-look") continue;

    assert.equal(category.options.length, 4);
    assert.deepEqual(
      category.options.map((option) => [option.level, option.optionNumber]),
      [
        ["premium", "1"],
        ["premium", "2"],
        ["signature", "1"],
        ["signature", "2"],
      ],
    );
    assert.deepEqual(
      category.options.map((option) => option.name),
      expectedOptionNames.get(category.id),
    );
    assert.ok(category.options.every((option) => option.image.fit === "contain"));
    assert.ok(
      category.options.every(
        (option) =>
          option.image.role === "design-board" &&
          option.image.quality === 100,
      ),
    );
    for (const option of category.options) {
      assert.ok(
        option.image.src.startsWith(
          "/images/homes/timberline/visual-guide/Timberline_",
        ),
      );
      referencedAssets.push(basename(option.image.src));
    }
  }

  const assetDirectory = join(
    process.cwd(),
    "public/images/homes/timberline/visual-guide",
  );
  const approvedAssets = readdirSync(assetDirectory)
    .filter((filename) => filename.endsWith(".png"))
    .sort();
  assert.equal(approvedAssets.length, 28);
  assert.deepEqual(referencedAssets.toSorted(), approvedAssets);

  const coordinated = getProjectCoordinatedCategories(definition);
  assert.deepEqual(coordinated.map((category) => category.id), ["appliances"]);
  assert.equal(coordinated[0]?.coordinatedMessage, "Project Coordinated");

  const selectionSectionIds = new Set(
    definition.lookBook.sections.flatMap((section) =>
      section.items
        .map((item) => item.categoryId)
        .filter((categoryId) => categoryId !== "appliances"),
    ),
  );
  assert.equal(selectionSectionIds.size, 7);
  assert.ok(
    requiredCategories.every((category) =>
      selectionSectionIds.has(category.id),
    ),
  );
  assert.equal(
    definition.lookBook.sections[0]?.title,
    "The Timberline You Created",
  );
});

test("Saturna remains on its dedicated seven-chapter Look Book", () => {
  const definition = getHomeConfiguratorDefinition("saturna");

  assert.strictEqual(definition, saturnaHomeConfigurator);
  assert.deepEqual(getCanonicalHomeConfiguratorIssues(definition), []);
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "saturna")
      ?.migrationStatus,
    "canonical",
  );
  assert.deepEqual(
    definition.categories.map((category) => category.id),
    [
      "kitchen-look-feel",
      "primary-ensuite-look-feel",
      "primary-wardrobe",
      "interior-doors-details",
      "exterior-arrival-openings",
      "whole-home-flooring-stairs",
      "window-coverings",
    ],
  );

  for (const category of definition.categories) {
    assert.equal(category.kind, "room-look");
    if (category.kind !== "room-look") continue;

    assert.equal(category.options.length, 4);
    assert.ok(category.options.every((option) => option.image.fit === "contain"));
    assert.ok(
      category.options.every((option) =>
        option.image.src.startsWith("/images/homes/saturna/configurator/Saturna_"),
      ),
    );
  }

  const selectionSectionIds = new Set(
    definition.lookBook.sections.flatMap((section) =>
      section.items.map((item) => item.categoryId),
    ),
  );
  assert.equal(selectionSectionIds.size, 7);
  assert.ok(
    definition.categories.every((category) =>
      selectionSectionIds.has(category.id),
    ),
  );

  const exteriorSection = definition.lookBook.sections.find(
    (section) => section.id === "exterior-arrival",
  );
  assert.ok(exteriorSection);
  assert.equal(exteriorSection.kind, "selection-story");
  assert.equal(exteriorSection.layout, "cinematic-hero");
  assert.equal(exteriorSection.heroImage, undefined);
  assert.deepEqual(exteriorSection.items, [
    { categoryId: "exterior-arrival-openings", presentation: "hero" },
  ]);
});

test("Project Coordinated remains non-core and does not block completion", () => {
  const coordinated = getProjectCoordinatedCategories(solaceHomeConfigurator);
  const requiredCategoryIds = new Set(
    getRequiredCategories(solaceHomeConfigurator).map((category) => category.id),
  );

  assert.ok(coordinated.length > 0);
  assert.ok(
    coordinated.every(
      (category) => category.coordinatedMessage === "Project Coordinated",
    ),
  );
  assert.ok(
    coordinated.every(
      (category) => !requiredCategoryIds.has(category.id),
    ),
  );
  assert.deepEqual(coordinated.map((category) => category.id), ["appliances"]);
  assert.match(
    coordinated[0]?.description ?? "",
    /final appliance package, manufacturers and models are confirmed during project review/i,
  );
});

test("unfinished Custom Homes cannot resolve a fallback configurator", () => {
  for (const model of models.filter(
    (candidate) => !canonicalCustomHomeIds.has(candidate.slug),
  )) {
    const definition = getHomeConfiguratorDefinition(model.slug);
    const registration = getHomeConfiguratorRegistration(
      "custom-home",
      model.slug,
    );

    assert.equal(definition, undefined);
    assert.equal(registration?.migrationStatus, "awaiting-approved-content");
    assert.deepEqual(registration?.activeChapterIds, []);
  }
});

test("approved homes use model-specific architecture and labels", () => {
  for (const model of models.filter((candidate) =>
    canonicalCustomHomeIds.has(candidate.slug),
  )) {
    const definition = getHomeConfiguratorDefinition(model.slug);

    assert.ok(definition);
    assert.equal(definition.architecturalImages[0]?.src, model.heroImage);
    assert.equal(definition.lookBook.home.heroImage.src, model.heroImage);
    assert.doesNotMatch(definition.homeName, /^The\s/);
    assert.equal(
      definition.lookBook.sections[0]?.title,
      `The ${definition.homeName} You Created`,
    );
  }
});

test("every Build My journey and Look Book ends with Exterior Arrival & Openings", () => {
  const expectedLeadingCategoryIds = canonicalHomeConfiguratorChapterIds.filter(
    (categoryId) => categoryId !== finalHomeDesignCategoryId,
  );

  for (const model of models.filter((candidate) =>
    canonicalCustomHomeIds.has(candidate.slug),
  )) {
    const definition = getHomeConfiguratorDefinition(model.slug);
    assert.ok(definition);

    const journeyCategories =
      getHomeConfiguratorJourneyCategories(definition);
    assert.deepEqual(
      journeyCategories.map((category) => category.id),
      [...expectedLeadingCategoryIds, finalHomeDesignCategoryId],
    );
    assert.deepEqual(
      journeyCategories.map((category) => category.number),
      ["01", "02", "03", "04", "05", "06", "07"],
    );

    const lookBookSections = getLookBookSelectionSections(
      definition.lookBook.sections,
    );
    assert.ok(
      lookBookSections.at(-1)?.items.some(
        (item) => item.categoryId === finalHomeDesignCategoryId,
      ),
    );
    assert.ok(
      lookBookSections.slice(0, -1).every((section) =>
        section.items.every(
          (item) => item.categoryId !== finalHomeDesignCategoryId,
        ),
      ),
    );
  }
});

test("approved Look Books use the primary exterior cover and selected Visual Guide boards only", () => {
  for (const model of models.filter((candidate) =>
    canonicalCustomHomeIds.has(candidate.slug),
  )) {
    const definition = getHomeConfiguratorDefinition(model.slug);

    assert.ok(definition);
    assert.equal(definition.lookBook.home.heroImage.src, model.heroImage);

    const sections = getLookBookSelectionSections(
      definition.lookBook.sections,
    );
    assert.equal(sections.length, 7);
    assert.deepEqual(
      sections.map((section) => section.number),
      ["01", "02", "03", "04", "05", "06", "07"],
    );

    for (const section of sections) {
      assert.equal(section.kind, "selection-story");
      for (const item of section.items) {
        const category = definition.categories.find(
          (candidate) => candidate.id === item.categoryId,
        );
        if (!category || category.kind === "coordinated") continue;

        const options = getCategoryOptions(category);
        assert.ok(options.length > 0);
        assert.ok(
          options.every(
            (option) =>
              option.image.fit === "contain" &&
              option.image.src.startsWith(
                `/images/homes/${definition.homeId}/`,
              ),
          ),
          `${definition.homeId}/${section.id} must use only its approved Visual Guide boards`,
        );
      }
    }
  }
});
