import type {
  HomeConfiguratorDefinition,
  HomeInclusionLevel,
  HomeInclusionOption,
  HomeRoomLookCategory,
} from "@/data/home-configurator";
import type { LookBookOptionEditorial } from "@/data/home-look-book";
import { models } from "@/data/models";

const assetRoot = "/images/homes/maplewood/visual-guide";

type PackageSource = {
  level: HomeInclusionLevel;
  optionNumber: string;
  name: string;
  filenameLabel: string;
  descriptors: readonly string[];
  storyFragments: readonly string[];
};

type ChapterSource = {
  id: string;
  number: string;
  title: string;
  shortTitle?: string;
  assetPrefix: string;
  description: string;
  represents: readonly string[];
  materialRole: string;
  technicalNote?: string;
  options: readonly PackageSource[];
};

const sharedPackageDirections = [
  {
    level: "premium",
    optionNumber: "1",
    name: "Coastal Light Oak",
    filenameLabel: "Coastal-Light-Oak",
    descriptors: ["Coastal", "Luminous", "Natural"],
    storyFragments: ["pale natural oak", "a light, quietly layered palette"],
  },
  {
    level: "premium",
    optionNumber: "2",
    name: "Soft White",
    filenameLabel: "Soft-White",
    descriptors: ["Soft", "Calm", "Refined"],
    storyFragments: ["soft white surfaces", "restrained architectural detail"],
  },
  {
    level: "signature",
    optionNumber: "1",
    name: "Stone Wrapped Oak",
    filenameLabel: "Stone-Wrapped-Oak",
    descriptors: ["Layered", "Grounded", "Architectural"],
    storyFragments: ["expressive stone", "warm, enveloping oak"],
  },
  {
    level: "signature",
    optionNumber: "2",
    name: "Sculpted White",
    filenameLabel: "Sculpted-White",
    descriptors: ["Sculptural", "Luminous", "Polished"],
    storyFragments: ["sculpted pale surfaces", "precise tonal detailing"],
  },
] as const satisfies readonly PackageSource[];

const ensuitePackageDirections = [
  {
    level: "premium",
    optionNumber: "1",
    name: "Natural Spa",
    filenameLabel: "Natural-Spa",
    descriptors: ["Natural", "Restorative", "Tactile"],
    storyFragments: ["quiet natural stone", "a restorative spa atmosphere"],
  },
  {
    level: "premium",
    optionNumber: "2",
    name: "Warm Modern",
    filenameLabel: "Warm-Modern",
    descriptors: ["Warm", "Modern", "Layered"],
    storyFragments: ["warm modern surfaces", "layered architectural detail"],
  },
  {
    level: "signature",
    optionNumber: "1",
    name: "Timeless Elegance",
    filenameLabel: "Timeless-Elegance",
    descriptors: ["Timeless", "Elegant", "Composed"],
    storyFragments: ["timeless tonal contrast", "quietly elegant detailing"],
  },
  {
    level: "signature",
    optionNumber: "2",
    name: "Sculpted White",
    filenameLabel: "Sculpted-White",
    descriptors: ["Sculptural", "Luminous", "Polished"],
    storyFragments: ["sculpted pale surfaces", "precise tonal detailing"],
  },
] as const satisfies readonly PackageSource[];

function createOption(
  chapter: Pick<ChapterSource, "id" | "title" | "assetPrefix" | "materialRole">,
  source: PackageSource,
): HomeInclusionOption {
  const editorial: LookBookOptionEditorial = {
    descriptors: source.descriptors,
    storyFragments: source.storyFragments,
    materialRole: chapter.materialRole,
  };

  return {
    id: `${chapter.id}-${source.level}-${source.optionNumber}`,
    level: source.level,
    optionNumber: source.optionNumber,
    name: source.name,
    editorial,
    image: {
      src: `${assetRoot}/${chapter.assetPrefix}_${source.level === "premium" ? "Premium" : "Signature"}-${source.optionNumber}_${source.filenameLabel}.png`,
      alt: `${source.level === "premium" ? "Premium" : "Signature"} ${source.optionNumber} — ${source.name}, ${chapter.title.toLowerCase()} design board for Maplewood House.`,
      fit: "contain",
      role: "design-board",
      quality: 100,
    },
  };
}

function createChapter(source: ChapterSource): HomeRoomLookCategory {
  return {
    kind: "room-look",
    id: source.id,
    number: source.number,
    title: source.title,
    shortTitle: source.shortTitle ?? source.title,
    description: source.description,
    represents: source.represents,
    technicalNote: source.technicalNote,
    options: source.options.map((option) => createOption(source, option)),
  };
}

const chapters = [
  createChapter({
    id: "kitchen-look-feel",
    number: "01",
    title: "Kitchen Look & Feel",
    shortTitle: "Kitchen",
    assetPrefix: "Maplewood_01_Kitchen",
    description:
      "Choose one coordinated kitchen package. Its complete design board carries the finish direction into My Maplewood.",
    represents: [
      "Cabinetry",
      "Countertop and backsplash",
      "Flooring",
      "Hardware",
      "Plumbing finish",
      "Decorative lighting",
    ],
    materialRole: "Kitchen palette",
    options: sharedPackageDirections,
  }),
  createChapter({
    id: "primary-ensuite-look-feel",
    number: "02",
    title: "Primary Ensuite Look & Feel",
    shortTitle: "Primary Ensuite",
    assetPrefix: "Maplewood_02_Primary-Ensuite",
    description:
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
    options: ensuitePackageDirections,
  }),
  createChapter({
    id: "primary-wardrobe",
    number: "03",
    title: "Primary Wardrobe",
    assetPrefix: "Maplewood_03_Primary-Wardrobe",
    description:
      "Choose the coordinated wardrobe package for the Maplewood primary suite.",
    represents: [
      "Cabinet finish",
      "Door treatment",
      "Interior finish",
      "Hardware",
      "Storage configuration",
      "Lighting",
    ],
    materialRole: "Wardrobe millwork",
    options: sharedPackageDirections,
  }),
  createChapter({
    id: "interior-doors-details",
    number: "04",
    title: "Interior Doors & Details",
    shortTitle: "Interior Details",
    assetPrefix: "Maplewood_04_Interior-Doors-Details",
    description:
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
    options: sharedPackageDirections,
  }),
  createChapter({
    id: "exterior-arrival-openings",
    number: "05",
    title: "Exterior Arrival & Openings",
    shortTitle: "Exterior Arrival",
    assetPrefix: "Maplewood_05_Exterior-Arrival-Openings",
    description:
      "Choose a coordinated exterior finish direction for Maplewood's arrival and openings.",
    represents: [
      "Entry door",
      "Window and patio-door frames",
      "Garage-door appearance",
      "Cladding accent",
      "Exterior hardware",
      "Exterior lighting",
    ],
    materialRole: "Exterior expression",
    technicalNote:
      "This selection changes finishes and appearance only. The Maplewood footprint, roof geometry, window placement and architectural massing remain unchanged.",
    options: sharedPackageDirections,
  }),
  createChapter({
    id: "whole-home-flooring-stairs",
    number: "06",
    title: "Whole-Home Flooring & Stairs",
    shortTitle: "Flooring & Stairs",
    assetPrefix: "Maplewood_06_Whole-Home-Flooring-Stairs",
    description:
      "Choose one coordinated flooring and stair package for Maplewood's dry interior areas.",
    represents: [
      "Main living areas",
      "Bedrooms",
      "Stair treads",
      "Risers and trim",
      "Transitions",
      "Runner or accent texture",
    ],
    materialRole: "Whole-home flooring",
    technicalNote:
      "Wet-area flooring is included in the Primary Ensuite package and is not selected again here.",
    options: sharedPackageDirections,
  }),
  createChapter({
    id: "window-coverings",
    number: "07",
    title: "Window Coverings",
    assetPrefix: "Maplewood_07_Window-Coverings",
    description:
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
    options: sharedPackageDirections,
  }),
] as const;

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

const maplewoodModel = models.find((model) => model.slug === "maplewood");

if (!maplewoodModel) {
  throw new Error("Maplewood configurator source data is unavailable.");
}

export const maplewoodHomeConfigurator: HomeConfiguratorDefinition = {
  configurationVersion: 4,
  homeId: maplewoodModel.slug,
  homeName: "Maplewood",
  residenceLabel: "Maplewood House",
  architecturalImages: [
    {
      src: maplewoodModel.heroImage,
      alt: "Maplewood House exterior architecture.",
    },
    {
      src: maplewoodModel.images[1],
      alt: "Maplewood House architectural living space.",
    },
  ],
  disclaimer:
    "Representative coordinated design boards. Final products, finishes, availability, pricing and technical suitability are confirmed during project review and are subject to project-specific requirements.",
  categories: [...chapters, appliances],
  lookBook: {
    home: {
      id: maplewoodModel.slug,
      name: "Maplewood",
      residenceLabel: "Maplewood House",
      areaLabel: `${maplewoodModel.squareFeet.toLocaleString()} sq. ft.`,
      description: maplewoodModel.description,
      heroImage: {
        src: maplewoodModel.heroImage,
        alt: "Maplewood House exterior architecture.",
      },
      introductionImage: {
        src: maplewoodModel.images[1],
        alt: "Maplewood House architectural living space.",
      },
      metadata: [
        {
          label: "Area",
          value: `${maplewoodModel.squareFeet.toLocaleString()} sq. ft.`,
        },
        { label: "Storeys", value: String(maplewoodModel.storeys) },
        { label: "Bedrooms", value: String(maplewoodModel.bedrooms) },
        { label: "Bathrooms", value: String(maplewoodModel.bathrooms) },
      ],
    },
    sections: [
      {
        kind: "design-story",
        layout: "cinematic-hero",
        id: "design-story",
        number: "01",
        title: "The Maplewood You Created",
        introduction:
          "Seven coordinated packages form one considered architectural finish story for Maplewood House.",
        heroImage: "home-introduction",
        items: chapters.map((chapter) => ({ categoryId: chapter.id })),
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "kitchen",
        number: "02",
        title: "Kitchen Look & Feel",
        introduction:
          "Cabinetry, surfaces, hardware, flooring and decorative lighting resolved as one kitchen composition.",
        items: [
          { categoryId: "kitchen-look-feel", presentation: "hero" },
          { categoryId: "appliances", presentation: "detail" },
        ],
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "primary-ensuite",
        number: "03",
        title: "Primary Ensuite Look & Feel",
        introduction:
          "A complete ensuite atmosphere carried through tile, vanity, plumbing finish, accent material and light.",
        items: [
          { categoryId: "primary-ensuite-look-feel", presentation: "hero" },
        ],
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "primary-wardrobe",
        number: "04",
        title: "Primary Wardrobe",
        introduction:
          "Millwork, storage, hardware and integrated light composed for the primary suite.",
        items: [{ categoryId: "primary-wardrobe", presentation: "hero" }],
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "interior-details",
        number: "05",
        title: "Interior Doors & Details",
        introduction:
          "Door, trim, hardware and architectural accents establish a consistent interior language.",
        items: [
          { categoryId: "interior-doors-details", presentation: "hero" },
        ],
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "exterior-arrival",
        number: "06",
        title: "Exterior Arrival & Openings",
        introduction:
          "A coordinated finish expression applied to Maplewood's fixed architectural form, openings and arrival sequence.",
        items: [
          { categoryId: "exterior-arrival-openings", presentation: "hero" },
        ],
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "flooring-stairs",
        number: "07",
        title: "Whole-Home Flooring & Stairs",
        introduction:
          "One continuous dry-area flooring and stair direction, with wet-area finishes held within the ensuite package.",
        items: [
          { categoryId: "whole-home-flooring-stairs", presentation: "hero" },
        ],
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "window-coverings",
        number: "08",
        title: "Window Coverings",
        introduction:
          "Privacy, filtered daylight, blackout performance and textile character resolved as one package.",
        items: [{ categoryId: "window-coverings", presentation: "hero" }],
      },
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
        description:
          "We review the seven selected packages alongside the Maplewood home and project requirements.",
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
