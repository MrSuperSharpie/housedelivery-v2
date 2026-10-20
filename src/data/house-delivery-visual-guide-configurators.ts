import type {
  HomeConfiguratorDefinition,
  HomeInclusionLevel,
  HomeInclusionOption,
  HomeRoomLookCategory,
} from "@/data/home-configurator";
import type {
  LookBookOptionEditorial,
  LookBookSection,
} from "@/data/home-look-book";
import { models } from "@/data/models";

type PackageSource = {
  level: HomeInclusionLevel;
  optionNumber: "1" | "2";
  name: string;
  filenameLabel: string;
};

type HomeSource = {
  modelSlug: string;
  homeName: string;
  residenceLabel: string;
  assetHomeName: string;
  assetRoot: string;
  packages: readonly PackageSource[];
};

type ChapterSource = {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  filenameLabel: string;
  description: (homeName: string) => string;
  represents: readonly string[];
  materialRole: string;
  technicalNote?: (homeName: string) => string;
};

const chapters = [
  {
    id: "kitchen-look-feel",
    number: "01",
    title: "Kitchen Look & Feel",
    shortTitle: "Kitchen",
    filenameLabel: "Kitchen",
    description: (homeName: string) =>
      `Choose one coordinated kitchen package. Its complete design board carries the finish direction into My ${homeName}.`,
    represents: [
      "Cabinetry",
      "Countertop and backsplash",
      "Flooring",
      "Hardware",
      "Plumbing finish",
      "Decorative lighting",
    ],
    materialRole: "Kitchen palette",
  },
  {
    id: "primary-ensuite-look-feel",
    number: "02",
    title: "Primary Ensuite Look & Feel",
    shortTitle: "Primary Ensuite",
    filenameLabel: "Primary-Ensuite",
    description: () =>
      "Choose one coordinated primary ensuite package, including surfaces, vanity, fixtures and lighting.",
    represents: [
      "Floor and wall tile",
      "Shower floor",
      "Vanity",
      "Countertop",
      "Plumbing finish",
      "Lighting",
    ],
    materialRole: "Ensuite palette",
  },
  {
    id: "primary-wardrobe",
    number: "03",
    title: "Primary Wardrobe",
    shortTitle: "Primary Wardrobe",
    filenameLabel: "Primary-Wardrobe",
    description: (homeName: string) =>
      `Choose one coordinated wardrobe package for the ${homeName} primary suite.`,
    represents: [
      "Cabinet finish",
      "Door treatment",
      "Interior finish",
      "Hardware",
      "Storage configuration",
      "Lighting",
    ],
    materialRole: "Wardrobe millwork",
  },
  {
    id: "interior-doors-details",
    number: "04",
    title: "Interior Doors & Details",
    shortTitle: "Interior Details",
    filenameLabel: "Interior-Doors-Details",
    description: () =>
      "Choose one coordinated package for interior doors, trim and architectural detail.",
    represents: [
      "Interior door style",
      "Door finish",
      "Hardware",
      "Architectural wall detail",
      "Trim and casing",
      "Accent material",
    ],
    materialRole: "Interior architecture",
  },
  {
    id: "exterior-arrival-openings",
    number: "05",
    title: "Exterior Arrival & Openings",
    shortTitle: "Exterior Arrival",
    filenameLabel: "Exterior-Arrival-Openings",
    description: (homeName: string) =>
      `Choose one coordinated exterior finish direction for ${homeName}’s arrival and openings.`,
    represents: [
      "Entry door",
      "Window and patio-door frames",
      "Garage-door appearance",
      "Cladding accent",
      "Exterior hardware",
      "Exterior lighting",
    ],
    materialRole: "Exterior expression",
    technicalNote: (homeName: string) =>
      `This selection changes finishes and appearance only. The ${homeName} footprint, roof geometry, window placement and architectural massing remain unchanged.`,
  },
  {
    id: "whole-home-flooring-stairs",
    number: "06",
    title: "Whole-Home Flooring & Stairs",
    shortTitle: "Flooring & Stairs",
    filenameLabel: "Whole-Home-Flooring-Stairs",
    description: (homeName: string) =>
      `Choose one coordinated flooring and stair package for ${homeName}’s dry interior areas.`,
    represents: [
      "Main living areas",
      "Bedrooms",
      "Stair treads",
      "Risers and trim",
      "Transitions",
      "Runner or accent texture",
    ],
    materialRole: "Whole-home flooring",
    technicalNote: () =>
      "Wet-area flooring is included in the Primary Ensuite package and is not selected again here.",
  },
  {
    id: "window-coverings",
    number: "07",
    title: "Window Coverings",
    shortTitle: "Window Coverings",
    filenameLabel: "Window-Coverings",
    description: () =>
      "Choose one coordinated window-covering package for privacy, light control and textile character.",
    represents: [
      "Main-living roller treatment",
      "Bedroom privacy and blackout",
      "Privacy and light-filter level",
      "Fabric and texture",
      "Control and cassette style",
      "Accent and trim",
    ],
    materialRole: "Textile + privacy",
  },
] as const satisfies readonly ChapterSource[];

function createOption(
  source: HomeSource,
  chapter: ChapterSource,
  designPackage: PackageSource,
): HomeInclusionOption {
  const levelLabel =
    designPackage.level === "premium" ? "Premium" : "Signature";
  const editorial: LookBookOptionEditorial = {
    descriptors: [designPackage.name, levelLabel, "Composed"],
    storyFragments: [
      designPackage.name.toLowerCase(),
      `${levelLabel.toLowerCase()} finish detailing`,
    ],
    materialRole: chapter.materialRole,
  };
  const filename = [
    `${source.assetHomeName}_${chapter.number}_${chapter.filenameLabel}`,
    `${levelLabel}-${designPackage.optionNumber}`,
    `${designPackage.filenameLabel}.png`,
  ].join("_");

  return {
    id: `${chapter.id}-${designPackage.level}-${designPackage.optionNumber}`,
    level: designPackage.level,
    optionNumber: designPackage.optionNumber,
    name: designPackage.name,
    editorial,
    image: {
      src: `${source.assetRoot}/${filename}`,
      alt: `${levelLabel} ${designPackage.optionNumber} — ${designPackage.name}, ${chapter.title.toLowerCase()} design board for ${source.residenceLabel}.`,
      fit: "contain",
      role: "design-board",
      quality: 100,
    },
  };
}

function createChapter(
  source: HomeSource,
  chapter: ChapterSource,
): HomeRoomLookCategory {
  return {
    kind: "room-look",
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
    shortTitle: chapter.shortTitle,
    description: chapter.description(source.homeName),
    represents: chapter.represents,
    technicalNote: chapter.technicalNote?.(source.homeName),
    options: source.packages.map((designPackage) =>
      createOption(source, chapter, designPackage),
    ),
  };
}

function createSelectionSections(homeName: string): readonly LookBookSection[] {
  const sectionSources = [
    {
      id: "kitchen",
      title: "Kitchen Look & Feel",
      introduction:
        "Cabinetry, surfaces, hardware, flooring and decorative lighting resolved as one kitchen composition.",
      items: [
        { categoryId: "kitchen-look-feel", presentation: "hero" as const },
        { categoryId: "appliances", presentation: "detail" as const },
      ],
    },
    {
      id: "primary-ensuite",
      title: "Primary Ensuite Look & Feel",
      introduction:
        "A complete ensuite atmosphere carried through tile, vanity, plumbing finish, accent material and light.",
      items: [
        {
          categoryId: "primary-ensuite-look-feel",
          presentation: "hero" as const,
        },
      ],
    },
    {
      id: "primary-wardrobe",
      title: "Primary Wardrobe",
      introduction:
        "Millwork, storage, hardware and integrated light composed for the primary suite.",
      items: [
        { categoryId: "primary-wardrobe", presentation: "hero" as const },
      ],
    },
    {
      id: "interior-details",
      title: "Interior Doors & Details",
      introduction:
        "Door, trim, hardware and architectural accents establish a consistent interior language.",
      items: [
        {
          categoryId: "interior-doors-details",
          presentation: "hero" as const,
        },
      ],
    },
    {
      id: "exterior-arrival",
      title: "Exterior Arrival & Openings",
      introduction: `A coordinated finish expression applied to ${homeName}’s fixed architectural form, openings and arrival sequence.`,
      items: [
        {
          categoryId: "exterior-arrival-openings",
          presentation: "hero" as const,
        },
      ],
    },
    {
      id: "flooring-stairs",
      title: "Whole-Home Flooring & Stairs",
      introduction:
        "One continuous dry-area flooring and stair direction, with wet-area finishes held within the ensuite package.",
      items: [
        {
          categoryId: "whole-home-flooring-stairs",
          presentation: "hero" as const,
        },
      ],
    },
    {
      id: "window-coverings",
      title: "Window Coverings",
      introduction:
        "Privacy, filtered daylight, blackout performance and textile character resolved as one package.",
      items: [
        { categoryId: "window-coverings", presentation: "hero" as const },
      ],
    },
  ] as const;

  return sectionSources.map((section, index) => ({
    kind: "selection-story",
    layout: "cinematic-hero",
    ...section,
    number: String(index + 2).padStart(2, "0"),
  }));
}

function createHomeConfigurator(source: HomeSource): HomeConfiguratorDefinition {
  const model = models.find((candidate) => candidate.slug === source.modelSlug);

  if (!model) {
    throw new Error(
      `Visual Guide configurator source data is unavailable: ${source.modelSlug}`,
    );
  }

  const homeChapters = chapters.map((chapter) =>
    createChapter(source, chapter),
  );
  const introductionImage =
    model.images.find(
      (image) => image !== model.heroImage && image !== model.floorPlanImage,
    ) ?? model.heroImage;
  const appliances = {
    kind: "coordinated",
    id: "appliances",
    number: "PC",
    title: "Appliances",
    shortTitle: "Appliances",
    description:
      "The final appliance package and model selections are confirmed during project review.",
    coordinatedMessage: "Project Coordinated",
  } as const;

  return {
    configurationVersion: 4,
    homeId: model.slug,
    homeName: source.homeName,
    residenceLabel: source.residenceLabel,
    architecturalImages: [
      {
        src: model.heroImage,
        alt: `${source.residenceLabel} exterior architecture.`,
      },
      {
        src: introductionImage,
        alt: `${source.residenceLabel} architectural living space.`,
      },
    ],
    disclaimer:
      "Representative coordinated design boards. Final products, finishes, availability, pricing and technical suitability are confirmed during project review and are subject to project-specific requirements.",
    categories: [...homeChapters, appliances],
    lookBook: {
      home: {
        id: model.slug,
        name: source.homeName,
        residenceLabel: source.residenceLabel,
        areaLabel: `${model.squareFeet.toLocaleString()} sq. ft.`,
        description: model.description,
        heroImage: {
          src: model.heroImage,
          alt: `${source.residenceLabel} exterior architecture.`,
        },
        introductionImage: {
          src: introductionImage,
          alt: `${source.residenceLabel} architectural living space.`,
        },
        metadata: [
          {
            label: "Area",
            value: `${model.squareFeet.toLocaleString()} sq. ft.`,
          },
          { label: "Storeys", value: String(model.storeys) },
          { label: "Bedrooms", value: String(model.bedrooms) },
          {
            label: "Bathrooms",
            value:
              model.bathrooms === null
                ? "Plan-specific"
                : String(model.bathrooms),
          },
        ],
      },
      sections: [
        {
          kind: "design-story",
          layout: "cinematic-hero",
          id: "design-story",
          number: "01",
          title: `The ${source.homeName} You Created`,
          introduction: `Seven coordinated packages form one considered architectural finish story for ${source.residenceLabel}.`,
          heroImage: "home-introduction",
          items: homeChapters.map((chapter) => ({
            categoryId: chapter.id,
          })),
        },
        ...createSelectionSections(source.homeName),
      ],
      projectCoordinatedItems: [
        {
          id: "appliances",
          title: "Appliances",
          description:
            "The final appliance package and model selections are confirmed during project review.",
        },
      ],
      nextStageSteps: [
        {
          title: "House Delivery Review",
          description: `We review the seven selected packages alongside ${source.residenceLabel} and the project requirements.`,
        },
        {
          title: "Product + Project Confirmation",
          description:
            "Applicable products, availability, pricing and site-specific requirements are confirmed.",
        },
        {
          title: "Project-Specific Visualization",
          description:
            "The approved package brief can be developed into detailed home visualization and virtual walkthrough work.",
        },
      ],
      preliminaryNotice:
        "This Look Book is a preliminary architectural finish brief and is not a final construction specification, quotation, engineering package or permit document.",
    },
  };
}

const packages = (
  premium1: readonly [name: string, filenameLabel: string],
  premium2: readonly [name: string, filenameLabel: string],
  signature1: readonly [name: string, filenameLabel: string],
  signature2: readonly [name: string, filenameLabel: string],
) =>
  [
    {
      level: "premium",
      optionNumber: "1",
      name: premium1[0],
      filenameLabel: premium1[1],
    },
    {
      level: "premium",
      optionNumber: "2",
      name: premium2[0],
      filenameLabel: premium2[1],
    },
    {
      level: "signature",
      optionNumber: "1",
      name: signature1[0],
      filenameLabel: signature1[1],
    },
    {
      level: "signature",
      optionNumber: "2",
      name: signature2[0],
      filenameLabel: signature2[1],
    },
  ] as const satisfies readonly PackageSource[];

export const keatsHomeConfigurator = createHomeConfigurator({
  modelSlug: "keats",
  homeName: "Keats",
  residenceLabel: "Keats House",
  assetHomeName: "Keats",
  assetRoot: "/images/homes/keats/visual-guide",
  packages: packages(
    ["Harbour Oak Sandstone", "Harbour-Oak-Sandstone"],
    ["Gallery Ash Pearlstone", "Gallery-Ash-Pearlstone"],
    ["Night Fir Basalt", "Night-Fir-Basalt"],
    ["Walnut Bronze Veined Limestone", "Walnut-Bronze-Veined-Limestone"],
  ),
});

export const borealHomeConfigurator = createHomeConfigurator({
  modelSlug: "boreal",
  homeName: "Boreal",
  residenceLabel: "Boreal House",
  assetHomeName: "Boreal",
  assetRoot: "/images/homes/boreal/visual-guide",
  packages: packages(
    ["Hearthstone Oak", "Hearthstone-Oak"],
    ["Silver Birch", "Silver-Birch"],
    ["Midnight Schist", "Midnight-Schist"],
    ["Bronze Ember", "Bronze-Ember"],
  ),
});

export const canmoreHomeConfigurator = createHomeConfigurator({
  modelSlug: "canmore",
  homeName: "Canmore",
  residenceLabel: "Canmore House",
  assetHomeName: "Canmore",
  assetRoot: "/images/homes/canmore/visual-guide",
  packages: packages(
    ["Hearth Oak", "Hearth-Oak"],
    ["Mineral Linen", "Mineral-Linen"],
    ["Carbon Ridge", "Carbon-Ridge"],
    ["Bronze Walnut", "Bronze-Walnut"],
  ),
});

export const cascadeHomeConfigurator = createHomeConfigurator({
  modelSlug: "cascade",
  homeName: "Cascade",
  residenceLabel: "Cascade House",
  assetHomeName: "Cascade",
  assetRoot: "/images/homes/cascade/visual-guide",
  packages: packages(
    ["Meadow Oak", "Meadow-Oak"],
    ["Gallery Ash", "Gallery-Ash"],
    ["Carbon Elm", "Carbon-Elm"],
    ["Bronze Strata", "Bronze-Strata"],
  ),
});

export const cedarviewHomeConfigurator = createHomeConfigurator({
  modelSlug: "cedarview",
  homeName: "Cedarview",
  residenceLabel: "Cedarview House",
  assetHomeName: "Cedarview",
  assetRoot: "/images/homes/cedarview/visual-guide",
  packages: packages(
    ["Arbutus Stone", "Arbutus-Stone"],
    ["Cloudline Ash", "Cloudline-Ash"],
    ["Raven Basalt", "Raven-Basalt"],
    ["Bronze Umber", "Bronze-Umber"],
  ),
});

export const mayneHomeConfigurator = createHomeConfigurator({
  modelSlug: "mayne",
  homeName: "Mayne",
  residenceLabel: "Mayne House",
  assetHomeName: "Mayne",
  // Mayne's boards intentionally remain beside its existing gallery assets.
  assetRoot: "/images/homes/mayne",
  packages: packages(
    ["Orchard Oak", "Orchard-Oak"],
    ["Pearl Pumice", "Pearl-Pumice"],
    ["Onyx Grid", "Onyx-Grid"],
    ["Sienna Walnut", "Sienna-Walnut"],
  ),
});

export const summitHomeConfigurator = createHomeConfigurator({
  modelSlug: "summit",
  homeName: "Summit",
  residenceLabel: "Summit House",
  assetHomeName: "Summit",
  assetRoot: "/images/homes/summit/visual-guide",
  packages: packages(
    ["Terrace Elm", "Terrace-Elm"],
    ["Silver Quartz", "Silver-Quartz"],
    ["Nightfall Charcoal", "Nightfall-Charcoal"],
    ["Cognac Bronze", "Cognac-Bronze"],
  ),
});

export const auroraHomeConfigurator = createHomeConfigurator({
  modelSlug: "aurora",
  homeName: "Aurora",
  residenceLabel: "Aurora House",
  assetHomeName: "Aurora",
  assetRoot: "/images/homes/aurora/visual-guide",
  packages: packages(
    ["Sunward Oak", "Sunward-Oak"],
    ["Lumen Elm", "Lumen-Elm"],
    ["Eclipse Slate", "Eclipse-Slate"],
    ["Ember Bronze", "Ember-Bronze"],
  ),
});
