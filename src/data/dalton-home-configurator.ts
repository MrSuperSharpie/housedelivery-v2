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

const assetRoot = "/images/homes/dalton/visual-guide";

type PackageSource = {
  level: HomeInclusionLevel;
  optionNumber: string;
  name: string;
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
};

const packageDirections = [
  {
    level: "premium",
    optionNumber: "1",
    name: "Premium 1",
    descriptors: ["Natural", "Warm", "Composed"],
    storyFragments: ["a warm natural foundation", "composed material detail"],
  },
  {
    level: "premium",
    optionNumber: "2",
    name: "Premium 2",
    descriptors: ["Light", "Soft", "Refined"],
    storyFragments: ["soft light finishes", "quietly refined detailing"],
  },
  {
    level: "signature",
    optionNumber: "1",
    name: "Signature 1",
    descriptors: ["Layered", "Tailored", "Architectural"],
    storyFragments: ["layered architectural contrast", "tailored material depth"],
  },
  {
    level: "signature",
    optionNumber: "2",
    name: "Signature 2",
    descriptors: ["Sculptural", "Warm", "Polished"],
    storyFragments: ["sculptural finish detail", "a warm polished palette"],
  },
] as const satisfies readonly PackageSource[];

const exactFilenameOverrides: Readonly<Record<string, string>> = {
  "kitchen-look-feel:signature:1": " Dalton_01_Kitchen_Signature-1.png",
};

function createOption(
  chapter: Pick<ChapterSource, "id" | "title" | "assetPrefix" | "materialRole">,
  source: PackageSource,
): HomeInclusionOption {
  const editorial: LookBookOptionEditorial = {
    descriptors: source.descriptors,
    storyFragments: source.storyFragments,
    materialRole: chapter.materialRole,
  };
  const levelLabel = source.level === "premium" ? "Premium" : "Signature";
  const filenameKey = `${chapter.id}:${source.level}:${source.optionNumber}`;
  const filename =
    exactFilenameOverrides[filenameKey] ??
    `${chapter.assetPrefix}_${levelLabel}-${source.optionNumber}.png`;

  return {
    id: `${chapter.id}-${source.level}-${source.optionNumber}`,
    level: source.level,
    optionNumber: source.optionNumber,
    name: source.name,
    editorial,
    image: {
      src: `${assetRoot}/${filename}`,
      alt: `${levelLabel} ${source.optionNumber}, ${chapter.title.toLowerCase()} design board for Dalton House.`,
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
    options: packageDirections.map((option) => createOption(source, option)),
  };
}

const chapters = [
  createChapter({
    id: "kitchen-look-feel",
    number: "01",
    title: "Kitchen Look & Feel",
    shortTitle: "Kitchen",
    assetPrefix: "Dalton_01_Kitchen",
    description:
      "Choose one coordinated kitchen package. Its complete design board carries the finish direction into My Dalton.",
    represents: [
      "Cabinetry",
      "Countertop and backsplash",
      "Flooring",
      "Hardware",
      "Plumbing finish",
      "Decorative lighting",
    ],
    materialRole: "Kitchen palette",
  }),
  createChapter({
    id: "primary-ensuite-look-feel",
    number: "02",
    title: "Primary Ensuite Look & Feel",
    shortTitle: "Primary Ensuite",
    assetPrefix: "Dalton_02_Primary-Ensuite",
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
  }),
  createChapter({
    id: "primary-wardrobe",
    number: "03",
    title: "Primary Wardrobe",
    assetPrefix: "Dalton_03_Primary-Wardrobe",
    description:
      "Choose one coordinated wardrobe package for the Dalton primary suite.",
    represents: [
      "Cabinet finish",
      "Door treatment",
      "Interior finish",
      "Hardware",
      "Storage configuration",
      "Lighting",
    ],
    materialRole: "Wardrobe millwork",
  }),
  createChapter({
    id: "interior-doors-details",
    number: "04",
    title: "Interior Doors & Details",
    shortTitle: "Interior Details",
    assetPrefix: "Dalton_04_Interior-Doors-Details",
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
  }),
  createChapter({
    id: "exterior-arrival-openings",
    number: "05",
    title: "Exterior Arrival & Openings",
    shortTitle: "Exterior Arrival",
    assetPrefix: "Dalton_05_Exterior-Arrival-Openings",
    description:
      "Choose one coordinated exterior finish direction for Dalton's arrival and openings.",
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
      "This selection changes finishes and appearance only. The Dalton footprint, roof geometry, window placement and architectural massing remain unchanged.",
  }),
  createChapter({
    id: "whole-home-flooring-stairs",
    number: "06",
    title: "Whole-Home Flooring & Stairs",
    shortTitle: "Flooring & Stairs",
    assetPrefix: "Dalton_06_Whole-Home-Flooring-Stairs",
    description:
      "Choose one coordinated flooring and stair package for Dalton's dry interior areas.",
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
  }),
  createChapter({
    id: "window-coverings",
    number: "07",
    title: "Window Coverings",
    assetPrefix: "Dalton_07_Window-Coverings",
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

const selectionSections = [
  {
    id: "kitchen",
    title: "Kitchen Look & Feel",
    introduction:
      "Cabinetry, surfaces, hardware, flooring and decorative lighting resolved as one kitchen composition.",
    items: [
      { categoryId: "kitchen-look-feel", presentation: "hero" },
      { categoryId: "appliances", presentation: "detail" },
    ],
  },
  {
    id: "primary-ensuite",
    title: "Primary Ensuite Look & Feel",
    introduction:
      "A complete ensuite atmosphere carried through tile, vanity, plumbing finish, accent material and light.",
    items: [
      { categoryId: "primary-ensuite-look-feel", presentation: "hero" },
    ],
  },
  {
    id: "primary-wardrobe",
    title: "Primary Wardrobe",
    introduction:
      "Millwork, storage, hardware and integrated light composed for the primary suite.",
    items: [{ categoryId: "primary-wardrobe", presentation: "hero" }],
  },
  {
    id: "interior-details",
    title: "Interior Doors & Details",
    introduction:
      "Door, trim, hardware and architectural accents establish a consistent interior language.",
    items: [
      { categoryId: "interior-doors-details", presentation: "hero" },
    ],
  },
  {
    id: "exterior-arrival",
    title: "Exterior Arrival & Openings",
    introduction:
      "A coordinated finish expression applied to Dalton's fixed architectural form, openings and arrival sequence.",
    items: [
      { categoryId: "exterior-arrival-openings", presentation: "hero" },
    ],
  },
  {
    id: "flooring-stairs",
    title: "Whole-Home Flooring & Stairs",
    introduction:
      "One continuous dry-area flooring and stair direction, with wet-area finishes held within the ensuite package.",
    items: [
      { categoryId: "whole-home-flooring-stairs", presentation: "hero" },
    ],
  },
  {
    id: "window-coverings",
    title: "Window Coverings",
    introduction:
      "Privacy, filtered daylight, blackout performance and textile character resolved as one package.",
    items: [{ categoryId: "window-coverings", presentation: "hero" }],
  },
] as const;

const lookBookSelectionSections: readonly LookBookSection[] =
  selectionSections.map((section, index) => ({
    kind: "selection-story",
    layout: "cinematic-hero",
    ...section,
    number: String(index + 2).padStart(2, "0"),
  }));

const daltonModel = models.find((model) => model.slug === "dalton");

if (!daltonModel) {
  throw new Error("Dalton configurator source data is unavailable.");
}

export const daltonHomeConfigurator: HomeConfiguratorDefinition = {
  configurationVersion: 4,
  homeId: daltonModel.slug,
  homeName: "Dalton",
  residenceLabel: "Dalton House",
  architecturalImages: [
    {
      src: daltonModel.heroImage,
      alt: "Dalton House exterior architecture.",
    },
    {
      src: daltonModel.images[1],
      alt: "Dalton House architectural living space.",
    },
  ],
  disclaimer:
    "Representative coordinated design boards. Final products, finishes, availability, pricing and technical suitability are confirmed during project review and are subject to project-specific requirements.",
  categories: [...chapters, appliances],
  lookBook: {
    home: {
      id: daltonModel.slug,
      name: "Dalton",
      residenceLabel: "Dalton House",
      areaLabel: `${daltonModel.squareFeet.toLocaleString()} sq. ft.`,
      description: daltonModel.description,
      heroImage: {
        src: daltonModel.heroImage,
        alt: "Dalton House exterior architecture.",
      },
      introductionImage: {
        src: daltonModel.images[1],
        alt: "Dalton House architectural living space.",
      },
      metadata: [
        {
          label: "Area",
          value: `${daltonModel.squareFeet.toLocaleString()} sq. ft.`,
        },
        { label: "Storeys", value: String(daltonModel.storeys) },
        { label: "Bedrooms", value: String(daltonModel.bedrooms) },
        { label: "Bathrooms", value: String(daltonModel.bathrooms) },
      ],
    },
    sections: [
      {
        kind: "design-story",
        layout: "cinematic-hero",
        id: "design-story",
        number: "01",
        title: "The Dalton You Created",
        introduction:
          "Seven coordinated packages form one considered architectural finish story for Dalton House.",
        heroImage: "home-introduction",
        items: chapters.map((chapter) => ({ categoryId: chapter.id })),
      },
      ...lookBookSelectionSections,
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
          "We review the seven selected packages alongside the Dalton home and project requirements.",
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
