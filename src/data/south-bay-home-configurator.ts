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

const assetRoot = "/images/homes/south-bay/visual-guide";

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
};

const packageDirections = [
  {
    level: "premium",
    optionNumber: "1",
    name: "Shoreline Oak",
    filenameLabel: "Shoreline-Oak",
    descriptors: ["Shoreline", "Natural", "Warm"],
    storyFragments: ["shoreline oak", "a warm, naturally layered palette"],
  },
  {
    level: "premium",
    optionNumber: "2",
    name: "Mist Linen",
    filenameLabel: "Mist-Linen",
    descriptors: ["Mist", "Linen", "Soft"],
    storyFragments: ["mist-toned surfaces", "soft linen texture"],
  },
  {
    level: "signature",
    optionNumber: "1",
    name: "Basalt Frame",
    filenameLabel: "Basalt-Frame",
    descriptors: ["Basalt", "Defined", "Architectural"],
    storyFragments: ["basalt contrast", "a defined architectural frame"],
  },
  {
    level: "signature",
    optionNumber: "2",
    name: "Cove Bronze",
    filenameLabel: "Cove-Bronze",
    descriptors: ["Cove", "Bronze", "Polished"],
    storyFragments: ["quiet cove tones", "polished bronze detailing"],
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
  const levelLabel = source.level === "premium" ? "Premium" : "Signature";

  return {
    id: `${chapter.id}-${source.level}-${source.optionNumber}`,
    level: source.level,
    optionNumber: source.optionNumber,
    name: source.name,
    editorial,
    image: {
      src: `${assetRoot}/${chapter.assetPrefix}_${levelLabel}-${source.optionNumber}_${source.filenameLabel}.png`,
      alt: `${levelLabel} ${source.optionNumber} — ${source.name}, ${chapter.title.toLowerCase()} design board for South Bay House.`,
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
    assetPrefix: "South-Bay_01_Kitchen",
    description:
      "Choose one coordinated kitchen package. Its complete design board carries the finish direction into My South Bay.",
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
    assetPrefix: "South-Bay_02_Primary-Ensuite",
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
    assetPrefix: "South-Bay_03_Primary-Wardrobe",
    description:
      "Choose one coordinated wardrobe package for the South Bay primary suite.",
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
    assetPrefix: "South-Bay_04_Interior-Doors-Details",
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
    assetPrefix: "South-Bay_05_Exterior-Arrival-Openings",
    description:
      "Choose one coordinated exterior finish direction for South Bay's arrival and openings.",
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
      "This selection changes finishes and appearance only. The South Bay footprint, roof geometry, window placement and architectural massing remain unchanged.",
  }),
  createChapter({
    id: "whole-home-flooring-stairs",
    number: "06",
    title: "Whole-Home Flooring & Stairs",
    shortTitle: "Flooring & Stairs",
    assetPrefix: "South-Bay_06_Whole-Home-Flooring-Stairs",
    description:
      "Choose one coordinated flooring and stair package for South Bay's dry interior areas.",
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
    assetPrefix: "South-Bay_07_Window-Coverings",
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
      "A coordinated finish expression applied to South Bay's fixed architectural form, openings and arrival sequence.",
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

const southBayModel = models.find((model) => model.slug === "south-bay");

if (!southBayModel) {
  throw new Error("South Bay configurator source data is unavailable.");
}

export const southBayHomeConfigurator: HomeConfiguratorDefinition = {
  configurationVersion: 4,
  homeId: southBayModel.slug,
  homeName: "South Bay",
  residenceLabel: "South Bay House",
  architecturalImages: [
    {
      src: southBayModel.heroImage,
      alt: "South Bay House exterior architecture.",
    },
    {
      src: southBayModel.images[1],
      alt: "South Bay House architectural living space.",
    },
  ],
  disclaimer:
    "Representative coordinated design boards. Final products, finishes, availability, pricing and technical suitability are confirmed during project review and are subject to project-specific requirements.",
  categories: [...chapters, appliances],
  lookBook: {
    home: {
      id: southBayModel.slug,
      name: "South Bay",
      residenceLabel: "South Bay House",
      areaLabel: `${southBayModel.squareFeet.toLocaleString()} sq. ft.`,
      description: southBayModel.description,
      heroImage: {
        src: southBayModel.heroImage,
        alt: "South Bay House exterior architecture.",
      },
      introductionImage: {
        src: southBayModel.images[1],
        alt: "South Bay House architectural living space.",
      },
      metadata: [
        {
          label: "Area",
          value: `${southBayModel.squareFeet.toLocaleString()} sq. ft.`,
        },
        { label: "Storeys", value: String(southBayModel.storeys) },
        { label: "Bedrooms", value: String(southBayModel.bedrooms) },
        { label: "Bathrooms", value: String(southBayModel.bathrooms) },
      ],
    },
    sections: [
      {
        kind: "design-story",
        layout: "cinematic-hero",
        id: "design-story",
        number: "01",
        title: "The South Bay You Created",
        introduction:
          "Seven coordinated packages form one considered architectural finish story for South Bay House.",
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
          "We review the seven selected packages alongside the South Bay home and project requirements.",
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
