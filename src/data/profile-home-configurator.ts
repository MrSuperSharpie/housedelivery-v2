import type {
  HomeConfiguratorDefinition,
  HomeInclusionLevel,
  HomeInclusionOption,
  HomeRoomLookCategory,
} from "@/data/home-configurator";
import type { LookBookOptionEditorial } from "@/data/home-look-book";
import { models } from "@/data/models";

const assetRoot = "/images/homes/profile/visual-guide";

type PackageSource = {
  level: HomeInclusionLevel;
  optionNumber: string;
  name: string;
  filename: string;
  descriptors: readonly string[];
  storyFragments: readonly string[];
};

type ChapterSource = {
  id: string;
  number: string;
  title: string;
  shortTitle?: string;
  description: string;
  represents: readonly string[];
  materialRole: string;
  technicalNote?: string;
  options: readonly PackageSource[];
};

const fourOptionDirections = [
  {
    level: "premium",
    optionNumber: "1",
    name: "Warm Oak & Travertine",
    descriptors: ["Warm", "Natural", "Layered"],
    storyFragments: ["warm oak", "quietly layered travertine tones"],
  },
  {
    level: "premium",
    optionNumber: "2",
    name: "Tailored Greige",
    descriptors: ["Tailored", "Calm", "Refined"],
    storyFragments: ["tailored greige surfaces", "restrained tonal detail"],
  },
  {
    level: "signature",
    optionNumber: "1",
    name: "Smoked Walnut & Graphite",
    descriptors: ["Defined", "Dramatic", "Architectural"],
    storyFragments: ["smoked walnut", "deep graphite contrast"],
  },
  {
    level: "signature",
    optionNumber: "2",
    name: "Limestone, Bronze & Charcoal",
    descriptors: ["Sculptural", "Mineral", "Polished"],
    storyFragments: ["luminous limestone", "bronze and charcoal accents"],
  },
] as const;

function createFourOptions(prefix: string): readonly PackageSource[] {
  return fourOptionDirections.map((direction, index) => ({
    ...direction,
    filename: `${prefix}-${String(index + 1).padStart(2, "0")}.png`,
  }));
}

const wardrobeOptions = [
  {
    ...fourOptionDirections[0],
    filename: "profile-primary-wardrobe-01.png",
  },
  {
    ...fourOptionDirections[1],
    filename: "profile-primary-wardrobe-02.png",
  },
  {
    level: "premium",
    optionNumber: "3",
    name: "Warm Oak & Travertine",
    filename: "profile-primary-wardrobe-03.png",
    descriptors: ["Warm", "Natural", "Composed"],
    storyFragments: ["warm oak millwork", "travertine accents"],
  },
  {
    level: "signature",
    optionNumber: "1",
    name: "Tailored Greige",
    filename: "profile-primary-wardrobe-04.png",
    descriptors: ["Tailored", "Luminous", "Integrated"],
    storyFragments: ["tailored greige millwork", "integrated architectural light"],
  },
  {
    level: "signature",
    optionNumber: "2",
    name: "Smoked Walnut & Graphite",
    filename: "profile-primary-wardrobe-05.png",
    descriptors: ["Defined", "Dramatic", "Tailored"],
    storyFragments: ["smoked walnut millwork", "graphite stone contrast"],
  },
  {
    level: "signature",
    optionNumber: "3",
    name: "Limestone, Bronze & Charcoal",
    filename: "profile-primary-wardrobe-06.png",
    descriptors: ["Sculptural", "Polished", "Layered"],
    storyFragments: ["limestone surfaces", "bronze and charcoal detailing"],
  },
] as const satisfies readonly PackageSource[];

function createOption(
  chapter: Pick<ChapterSource, "id" | "title" | "materialRole">,
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
      src: `${assetRoot}/${source.filename}`,
      alt: `${source.level === "premium" ? "Premium" : "Signature"} ${source.optionNumber} — ${source.name}, ${chapter.title.toLowerCase()} design board for Profile House.`,
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
    description:
      "Choose one coordinated kitchen package. Its complete design board carries the finish direction into Your Profile House.",
    represents: [
      "Cabinetry",
      "Countertop and backsplash",
      "Flooring",
      "Hardware",
      "Lighting",
      "Accent finish",
    ],
    materialRole: "Kitchen palette",
    options: createFourOptions("profile-kitchen"),
  }),
  createChapter({
    id: "primary-ensuite-look-feel",
    number: "02",
    title: "Primary Ensuite Look & Feel",
    shortTitle: "Primary Ensuite",
    description:
      "Choose one coordinated primary ensuite package, including surfaces, vanity, fixtures and lighting.",
    represents: [
      "Vanity finish",
      "Countertop",
      "Wall and floor tile",
      "Plumbing finish",
      "Lighting",
      "Accent finish",
    ],
    materialRole: "Ensuite palette",
    options: createFourOptions("profile-primary-ensuite"),
  }),
  createChapter({
    id: "primary-wardrobe",
    number: "03",
    title: "Primary Wardrobe",
    description:
      "Choose one coordinated wardrobe package for the Profile primary suite.",
    represents: [
      "Cabinetry",
      "Shelving and island finish",
      "Flooring",
      "Hardware",
      "Lighting",
      "Mirror and trim",
    ],
    materialRole: "Wardrobe millwork",
    options: wardrobeOptions,
  }),
  createChapter({
    id: "interior-doors-details",
    number: "04",
    title: "Interior Doors & Details",
    shortTitle: "Interior Details",
    description:
      "Choose one coordinated package for interior doors, wall treatments, hardware and architectural detail.",
    represents: [
      "Interior door finish",
      "Wall finish",
      "Wall detail",
      "Flooring",
      "Hardware",
      "Lighting",
      "Accent finish",
    ],
    materialRole: "Interior architecture",
    options: createFourOptions("profile-interior-doors-details"),
  }),
  createChapter({
    id: "exterior-arrival-openings",
    number: "05",
    title: "Exterior Arrival & Openings",
    shortTitle: "Exterior Arrival",
    description:
      "Choose one coordinated exterior finish direction for Profile House's arrival and openings.",
    represents: [
      "Main render and cladding",
      "Accent cladding",
      "Window frames",
      "Entry door",
      "Garage door",
      "Exterior lighting",
      "Metal accents",
    ],
    materialRole: "Exterior expression",
    technicalNote:
      "This selection changes finishes and appearance only. The Profile House footprint, roof geometry, window placement and architectural massing remain unchanged.",
    options: createFourOptions("profile-exterior-arrival-openings"),
  }),
  createChapter({
    id: "whole-home-flooring-stairs",
    number: "06",
    title: "Whole-Home Flooring & Stairs",
    shortTitle: "Flooring & Stairs",
    description:
      "Choose one coordinated flooring and stair package for Profile House's dry interior areas.",
    represents: [
      "Main flooring",
      "Stair tread",
      "Stair and railing detail",
      "Wall detail",
      "Hardware and lighting",
      "Accent finish",
    ],
    materialRole: "Whole-home flooring",
    technicalNote:
      "Wet-area flooring is included in the Primary Ensuite package and is not selected again here.",
    options: createFourOptions("profile-flooring-stairs"),
  }),
  createChapter({
    id: "window-coverings",
    number: "07",
    title: "Window Coverings",
    description:
      "Choose one coordinated window-covering package for privacy, light control and textile character.",
    represents: [
      "Window treatment",
      "Secondary shade",
      "Fabric",
      "Hardware",
      "Accent finish",
      "Trim",
    ],
    materialRole: "Textile + privacy",
    options: createFourOptions("profile-window-coverings"),
  }),
] as const;

const profileModel = models.find((model) => model.slug === "profile");

if (!profileModel) {
  throw new Error("Profile House configurator source data is unavailable.");
}

export const profileHomeConfigurator: HomeConfiguratorDefinition = {
  configurationVersion: 4,
  homeId: profileModel.slug,
  homeName: "Profile House",
  residenceLabel: "Profile House",
  architecturalImages: [
    {
      src: profileModel.heroImage,
      alt: "Profile House exterior architecture.",
    },
    {
      src: profileModel.images[1],
      alt: "Profile House architectural living space.",
    },
  ],
  disclaimer:
    "Representative coordinated design boards. Final products, finishes, availability, pricing and technical suitability are confirmed during project review and are subject to project-specific requirements.",
  categories: chapters,
  lookBook: {
    home: {
      id: profileModel.slug,
      name: "Profile House",
      residenceLabel: "Profile House",
      areaLabel: `${profileModel.squareFeet.toLocaleString()} sq. ft.`,
      description: profileModel.description,
      heroImage: {
        src: profileModel.heroImage,
        alt: "Profile House exterior architecture.",
      },
      introductionImage: {
        src: profileModel.images[1],
        alt: "Profile House architectural living space.",
      },
      metadata: [
        {
          label: "Area",
          value: `${profileModel.squareFeet.toLocaleString()} sq. ft.`,
        },
        { label: "Storeys", value: String(profileModel.storeys) },
        { label: "Bedrooms", value: String(profileModel.bedrooms) },
        { label: "Bathrooms", value: String(profileModel.bathrooms) },
      ],
    },
    sections: [
      {
        kind: "design-story",
        layout: "cinematic-hero",
        id: "design-story",
        number: "01",
        title: "The Profile House You Created",
        introduction:
          "Seven coordinated packages form one considered architectural finish story for Profile House.",
        heroImage: "home-introduction",
        items: chapters.map((chapter) => ({ categoryId: chapter.id })),
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "kitchen",
        number: "01",
        title: "Kitchen",
        introduction:
          "Cabinetry, surfaces, hardware, flooring and lighting resolved as one kitchen composition.",
        items: [{ categoryId: "kitchen-look-feel", presentation: "hero" }],
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "primary-ensuite",
        number: "02",
        title: "Primary Ensuite",
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
        number: "03",
        title: "Primary Wardrobe",
        introduction:
          "Millwork, storage, hardware and integrated light composed for the primary suite.",
        items: [{ categoryId: "primary-wardrobe", presentation: "hero" }],
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "interior-details",
        number: "04",
        title: "Interior Doors & Details",
        introduction:
          "Doors, wall treatments, hardware and architectural accents establish a consistent interior language.",
        items: [
          { categoryId: "interior-doors-details", presentation: "hero" },
        ],
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "flooring-stairs",
        number: "05",
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
        number: "06",
        title: "Window Coverings",
        introduction:
          "Privacy, filtered daylight, blackout performance and textile character resolved as one package.",
        items: [{ categoryId: "window-coverings", presentation: "hero" }],
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "exterior-arrival",
        number: "07",
        title: "Exterior Arrival & Openings",
        introduction:
          "A coordinated finish expression applied to Profile House's fixed architectural form, openings and arrival sequence.",
        items: [
          { categoryId: "exterior-arrival-openings", presentation: "hero" },
        ],
      },
    ],
    nextStageSteps: [
      {
        title: "House Delivery Review",
        description:
          "We review the seven selected packages alongside Profile House and the project requirements.",
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
