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
import { daltonHomeConfigurator } from "@/data/dalton-home-configurator";
import {
  getHomeConfiguratorDefinition,
  getHomeConfiguratorRegistration,
  getHomeConfiguratorRegistrationsByFamily,
  homeConfiguratorRegistrations,
} from "@/data/home-configurators";
import { getLookBookSelectionSections } from "@/data/home-look-book";
import { langleyHomeConfigurator } from "@/data/langley-home-configurator";
import { laurentianHomeConfigurator } from "@/data/laurentian-home-configurator";
import { maplewoodHomeConfigurator } from "@/data/maplewood-home-configurator";
import { models } from "@/data/models";
import { profileHomeConfigurator } from "@/data/profile-home-configurator";
import { saturnaHomeConfigurator } from "@/data/saturna-home-configurator";
import { solaceHomeConfigurator } from "@/data/solace-home-configurator";
import { southBayHomeConfigurator } from "@/data/south-bay-home-configurator";
import { timberlineHomeConfigurator } from "@/data/timberline-home-configurator";

const canonicalCustomHomeIds = new Set([
  "dalton",
  "langley",
  "laurentian",
  "maplewood",
  "profile",
  "saturna",
  "solace",
  "south-bay",
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

  assert.equal(homeConfiguratorRegistrations.length, 31);
  assert.equal(customHomes.length, 18);
  assert.equal(carriageHomes.length, 6);
  assert.equal(preApprovedHomes.length, 7);
  assert.equal(new Set(homeConfiguratorRegistrations.map(({ key }) => key)).size, 31);
  assert.equal(
    customHomes.filter(
      (registration) => registration.migrationStatus === "canonical",
    ).length,
    9,
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

test("The Salt Spring Duplex uses its approved gallery and remains Lookbook coming soon", () => {
  const saltSpring = models.find((model) => model.slug === "salt-spring");
  const assetDirectory = join(
    process.cwd(),
    "public/images/homes/salt-spring",
  );
  const expectedAssets = [
    "salt-spring-bathroom.jpg",
    "salt-spring-bedroom.jpg",
    "salt-spring-floor-plan.jpg",
    "salt-spring-hero.jpg",
    "salt-spring-kitchen.jpg",
    "salt-spring-living-room.jpg",
    "salt-spring-outdoor-living.jpg",
  ];

  assert.ok(saltSpring);
  assert.equal(saltSpring.name, "The Salt Spring Duplex");
  assert.equal(saltSpring.squareFeet, 6073);
  assert.equal(saltSpring.squareMetres, 564.27);
  assert.equal(saltSpring.garageLabel, "2 garages");
  assert.equal(
    saltSpring.heroImage,
    "/images/homes/salt-spring/salt-spring-hero.jpg",
  );
  assert.equal(
    saltSpring.floorPlanImage,
    "/images/homes/salt-spring/salt-spring-floor-plan.jpg",
  );
  assert.deepEqual(readdirSync(assetDirectory).sort(), expectedAssets);
  assert.equal(getHomeConfiguratorDefinition("salt-spring"), undefined);
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "salt-spring")
      ?.migrationStatus,
    "awaiting-approved-content",
  );
});

test("Keats House uses its approved gallery and remains Lookbook coming soon", () => {
  const keats = models.find((model) => model.slug === "keats");
  const assetDirectory = join(
    process.cwd(),
    "public/images/homes/keats",
  );
  const expectedAssets = [
    "keats-bathroom-02.jpeg",
    "keats-exterior-02.jpeg",
    "keats-floor-plan.jpeg",
    "keats-hero.jpeg",
    "keats-kitchen-dining.jpeg",
    "keats-living-room.jpeg",
    "keats-outdoor-living.jpeg",
    "keats-primary-bathroom.jpeg",
  ];

  assert.ok(keats);
  assert.equal(keats.name, "Keats House");
  assert.equal(keats.squareFeet, 3713);
  assert.equal(keats.squareMetres, 344.92);
  assert.deepEqual(keats.levels, { main: 2302, upper: 1411 });
  assert.deepEqual(keats.levelSquareMetres, {
    main: 213.83,
    upper: 131.09,
  });
  assert.equal(keats.heroImage, "/images/homes/keats/keats-hero.jpeg");
  assert.equal(
    keats.floorPlanImage,
    "/images/homes/keats/keats-floor-plan.jpeg",
  );
  assert.deepEqual(readdirSync(assetDirectory).sort(), expectedAssets);
  assert.equal(getHomeConfiguratorDefinition("keats"), undefined);
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "keats")
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

test("Langley uses all 28 approved Visual Guide boards in seven chapters", () => {
  const definition = getHomeConfiguratorDefinition("langley");
  assert.ok(definition);
  const requiredCategories = getRequiredCategories(definition);
  const journeyCategories = getHomeConfiguratorJourneyCategories(definition);

  assert.strictEqual(definition, langleyHomeConfigurator);
  assert.deepEqual(getCanonicalHomeConfiguratorIssues(definition), []);
  assert.equal(definition.homeName, "Langley");
  assert.equal(definition.residenceLabel, "Langley House");
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "langley")?.route,
    "/homes/langley",
  );
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "langley")
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
  assert.equal(journeyCategories.length, 7);

  const expectedOptionNames = [
    "Hearthstone Oak",
    "Gable Linen",
    "Manor Graphite",
    "Estate Bronze",
  ];
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
      expectedOptionNames,
    );
    assert.ok(
      category.options.every(
        (option) =>
          option.image.fit === "contain" &&
          option.image.role === "design-board" &&
          option.image.quality === 100 &&
          option.image.src.startsWith(
            "/images/homes/langley/visual-guide/Langley_",
          ),
      ),
    );
    referencedAssets.push(
      ...category.options.map((option) => basename(option.image.src)),
    );
  }

  const assetDirectory = join(
    process.cwd(),
    "public/images/homes/langley/visual-guide",
  );
  const approvedAssets = readdirSync(assetDirectory)
    .filter((filename) => filename.endsWith(".png"))
    .sort();
  assert.equal(approvedAssets.length, 28);
  assert.equal(referencedAssets.length, 28);
  assert.deepEqual(referencedAssets.toSorted(), approvedAssets);

  const coordinated = getProjectCoordinatedCategories(definition);
  assert.deepEqual(coordinated.map((category) => category.id), ["appliances"]);
  assert.equal(coordinated[0]?.coordinatedMessage, "Project Coordinated");
  assert.ok(
    !requiredCategories.some((category) => category.id === "appliances"),
  );

  const selectionSections = getLookBookSelectionSections(
    definition.lookBook.sections,
  );
  assert.deepEqual(
    selectionSections.map((section) =>
      section.items.find((item) => item.categoryId !== "appliances")
        ?.categoryId,
    ),
    journeyCategories.map((category) => category.id),
  );
  assert.equal(
    definition.lookBook.sections[0]?.title,
    "The Langley You Created",
  );
});

test("South Bay uses all 28 approved Visual Guide boards in seven chapters", () => {
  const definition = getHomeConfiguratorDefinition("south-bay");
  assert.ok(definition);
  const requiredCategories = getRequiredCategories(definition);
  const journeyCategories = getHomeConfiguratorJourneyCategories(definition);

  assert.strictEqual(definition, southBayHomeConfigurator);
  assert.deepEqual(getCanonicalHomeConfiguratorIssues(definition), []);
  assert.equal(definition.homeName, "South Bay");
  assert.equal(definition.residenceLabel, "South Bay House");
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "south-bay")?.route,
    "/homes/south-bay",
  );
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "south-bay")
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
  assert.equal(journeyCategories.length, 7);

  const expectedOptionNames = [
    "Shoreline Oak",
    "Mist Linen",
    "Basalt Frame",
    "Cove Bronze",
  ];
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
      expectedOptionNames,
    );
    assert.ok(
      category.options.every(
        (option) =>
          option.image.fit === "contain" &&
          option.image.role === "design-board" &&
          option.image.quality === 100 &&
          option.image.src.startsWith(
            "/images/homes/south-bay/visual-guide/South-Bay_",
          ),
      ),
    );
    referencedAssets.push(
      ...category.options.map((option) => basename(option.image.src)),
    );
  }

  const assetDirectory = join(
    process.cwd(),
    "public/images/homes/south-bay/visual-guide",
  );
  const approvedAssets = readdirSync(assetDirectory)
    .filter((filename) => filename.endsWith(".png"))
    .sort();
  assert.equal(approvedAssets.length, 28);
  assert.equal(referencedAssets.length, 28);
  assert.deepEqual(referencedAssets.toSorted(), approvedAssets);

  const coordinated = getProjectCoordinatedCategories(definition);
  assert.deepEqual(coordinated.map((category) => category.id), ["appliances"]);
  assert.equal(coordinated[0]?.coordinatedMessage, "Project Coordinated");
  assert.ok(
    !requiredCategories.some((category) => category.id === "appliances"),
  );

  const selectionSections = getLookBookSelectionSections(
    definition.lookBook.sections,
  );
  assert.deepEqual(
    selectionSections.map((section) =>
      section.items.find((item) => item.categoryId !== "appliances")
        ?.categoryId,
    ),
    journeyCategories.map((category) => category.id),
  );
  assert.equal(
    definition.lookBook.sections[0]?.title,
    "The South Bay You Created",
  );
});

test("Dalton uses all 28 approved Visual Guide boards in seven chapters", () => {
  const definition = getHomeConfiguratorDefinition("dalton");
  assert.ok(definition);
  const requiredCategories = getRequiredCategories(definition);
  const journeyCategories = getHomeConfiguratorJourneyCategories(definition);

  assert.strictEqual(definition, daltonHomeConfigurator);
  assert.deepEqual(getCanonicalHomeConfiguratorIssues(definition), []);
  assert.equal(definition.homeName, "Dalton");
  assert.equal(definition.residenceLabel, "Dalton House");
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "dalton")?.route,
    "/homes/dalton",
  );
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "dalton")
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
  assert.equal(journeyCategories.length, 7);

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
      ["Premium 1", "Premium 2", "Signature 1", "Signature 2"],
    );
    assert.ok(
      category.options.every(
        (option) =>
          option.image.fit === "contain" &&
          option.image.role === "design-board" &&
          option.image.quality === 100 &&
          option.image.src.startsWith(
            "/images/homes/dalton/visual-guide/",
          ),
      ),
    );
    referencedAssets.push(
      ...category.options.map((option) => basename(option.image.src)),
    );
  }

  const assetDirectory = join(
    process.cwd(),
    "public/images/homes/dalton/visual-guide",
  );
  const approvedAssets = readdirSync(assetDirectory)
    .filter((filename) => filename.endsWith(".png"))
    .sort();
  assert.equal(approvedAssets.length, 28);
  assert.equal(referencedAssets.length, 28);
  assert.deepEqual(referencedAssets.toSorted(), approvedAssets);

  const coordinated = getProjectCoordinatedCategories(definition);
  assert.deepEqual(coordinated.map((category) => category.id), ["appliances"]);
  assert.equal(coordinated[0]?.coordinatedMessage, "Project Coordinated");
  assert.ok(
    !requiredCategories.some((category) => category.id === "appliances"),
  );

  const selectionSections = getLookBookSelectionSections(
    definition.lookBook.sections,
  );
  assert.deepEqual(
    selectionSections.map((section) =>
      section.items.find((item) => item.categoryId !== "appliances")
        ?.categoryId,
    ),
    journeyCategories.map((category) => category.id),
  );
  assert.equal(definition.lookBook.sections[0]?.title, "The Dalton You Created");
});

test("Laurentian uses all 28 approved Visual Guide boards in seven chapters", () => {
  const definition = getHomeConfiguratorDefinition("laurentian");
  assert.ok(definition);
  const requiredCategories = getRequiredCategories(definition);
  const journeyCategories = getHomeConfiguratorJourneyCategories(definition);

  assert.strictEqual(definition, laurentianHomeConfigurator);
  assert.deepEqual(getCanonicalHomeConfiguratorIssues(definition), []);
  assert.equal(definition.homeName, "Laurentian");
  assert.equal(definition.residenceLabel, "Laurentian House");
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "laurentian")?.route,
    "/homes/laurentian",
  );
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "laurentian")
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
  assert.equal(journeyCategories.length, 7);

  const expectedOptionNames = [
    "Natural Light Oak",
    "Soft Ivory Travertine",
    "Smoked Walnut Graphite",
    "Sandstone Bronze Linen",
  ];
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
      expectedOptionNames,
    );
    assert.ok(
      category.options.every(
        (option) =>
          option.image.fit === "contain" &&
          option.image.role === "design-board" &&
          option.image.quality === 100 &&
          option.image.src.startsWith(
            "/images/homes/laurentian/visual-guide/Laurentian_",
          ),
      ),
    );
    referencedAssets.push(
      ...category.options.map((option) => basename(option.image.src)),
    );
  }

  const assetDirectory = join(
    process.cwd(),
    "public/images/homes/laurentian/visual-guide",
  );
  const approvedAssets = readdirSync(assetDirectory)
    .filter((filename) => filename.endsWith(".png"))
    .sort();
  assert.equal(approvedAssets.length, 28);
  assert.equal(referencedAssets.length, 28);
  assert.deepEqual(referencedAssets.toSorted(), approvedAssets);

  const coordinated = getProjectCoordinatedCategories(definition);
  assert.deepEqual(coordinated.map((category) => category.id), ["appliances"]);
  assert.equal(coordinated[0]?.coordinatedMessage, "Project Coordinated");
  assert.ok(
    !requiredCategories.some((category) => category.id === "appliances"),
  );

  const selectionSections = getLookBookSelectionSections(
    definition.lookBook.sections,
  );
  assert.deepEqual(
    selectionSections.map((section) =>
      section.items.find((item) => item.categoryId !== "appliances")
        ?.categoryId,
    ),
    journeyCategories.map((category) => category.id),
  );
  assert.equal(
    definition.lookBook.sections[0]?.title,
    "The Laurentian You Created",
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

test("Profile House uses all 30 approved Visual Guide assets and its requested journey", () => {
  const definition = getHomeConfiguratorDefinition("profile");
  assert.ok(definition);
  const requiredCategories = getRequiredCategories(definition);
  const journeyCategories = getHomeConfiguratorJourneyCategories(definition);

  assert.strictEqual(definition, profileHomeConfigurator);
  assert.deepEqual(getCanonicalHomeConfiguratorIssues(definition), []);
  assert.equal(definition.homeName, "Profile House");
  assert.equal(definition.residenceLabel, "Profile House");
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "profile")?.route,
    "/homes/profile",
  );
  assert.equal(
    getHomeConfiguratorRegistration("custom-home", "profile")
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
  assert.deepEqual(
    journeyCategories.map((category) => category.id),
    [
      "kitchen-look-feel",
      "primary-ensuite-look-feel",
      "primary-wardrobe",
      "interior-doors-details",
      "whole-home-flooring-stairs",
      "window-coverings",
      "exterior-arrival-openings",
    ],
  );
  assert.deepEqual(
    journeyCategories.map((category) => category.number),
    ["01", "02", "03", "04", "05", "06", "07"],
  );

  const referencedAssets: string[] = [];
  for (const category of requiredCategories) {
    assert.equal(category.kind, "room-look");
    if (category.kind !== "room-look") continue;

    const expectedClassifications =
      category.id === "primary-wardrobe"
        ? [
            ["premium", "1"],
            ["premium", "2"],
            ["premium", "3"],
            ["signature", "1"],
            ["signature", "2"],
            ["signature", "3"],
          ]
        : [
            ["premium", "1"],
            ["premium", "2"],
            ["signature", "1"],
            ["signature", "2"],
          ];

    assert.deepEqual(
      category.options.map((option) => [option.level, option.optionNumber]),
      expectedClassifications,
    );
    assert.ok(
      category.options.every(
        (option) =>
          option.level !== ("essential" as string) &&
          option.image.fit === "contain" &&
          option.image.role === "design-board" &&
          option.image.quality === 100 &&
          option.image.src.startsWith(
            "/images/homes/profile/visual-guide/profile-",
          ),
      ),
    );
    referencedAssets.push(
      ...category.options.map((option) => basename(option.image.src)),
    );
  }

  const assetDirectory = join(
    process.cwd(),
    "public/images/homes/profile/visual-guide",
  );
  const approvedAssets = readdirSync(assetDirectory)
    .filter((filename) => filename.endsWith(".png"))
    .sort();
  assert.equal(approvedAssets.length, 30);
  assert.equal(referencedAssets.length, 30);
  assert.deepEqual(referencedAssets.toSorted(), approvedAssets);

  const selectionSections = getLookBookSelectionSections(
    definition.lookBook.sections,
  );
  assert.deepEqual(
    selectionSections.map((section) =>
      section.items.map((item) => item.categoryId),
    ),
    journeyCategories.map((category) => [category.id]),
  );
  assert.equal(
    selectionSections.at(-1)?.title,
    "Exterior Arrival & Openings",
  );
  assert.equal(
    definition.lookBook.sections[0]?.title,
    "The Profile House You Created",
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
