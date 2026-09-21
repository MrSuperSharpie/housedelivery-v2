import { getCompletedLookBookOptions } from "@/data/completed-look-book-assets";
import type {
  HomeConfiguratorDefinition,
  HomeRoomLookCategory,
} from "@/data/home-configurator";
import { models } from "@/data/models";

type ChapterSource = {
  id: string;
  number: string;
  title: string;
  shortTitle?: string;
  description: string;
  represents: readonly string[];
  technicalNote?: string;
  materialRole: string;
};

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
    options: getCompletedLookBookOptions(
      "saturna",
      source.id,
      source.title,
      source.materialRole,
    ),
  };
}

const chapters = [
  createChapter({
    id: "kitchen-look-feel",
    number: "01",
    title: "Kitchen Look & Feel",
    shortTitle: "Kitchen",
    description:
      "Choose one coordinated kitchen package. The design board carries the complete finish direction into My Saturna.",
    represents: [
      "Cabinetry",
      "Countertop",
      "Backsplash",
      "Flooring",
      "Hardware",
      "Decorative lighting / pendants",
    ],
    materialRole: "Kitchen palette",
  }),
  createChapter({
    id: "primary-ensuite-look-feel",
    number: "02",
    title: "Primary Ensuite Look & Feel",
    shortTitle: "Primary Ensuite",
    description:
      "Choose one coordinated primary ensuite package, including its surfaces, millwork, fixtures and lighting.",
    represents: [
      "Floor and wall tile",
      "Shower floor",
      "Vanity",
      "Countertop",
      "Accent wall",
      "Plumbing finish",
      "Lighting",
    ],
    materialRole: "Ensuite palette",
  }),
  createChapter({
    id: "primary-wardrobe",
    number: "03",
    title: "Primary Wardrobe",
    description:
      "Choose the coordinated wardrobe package for the Saturna primary suite.",
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
    description:
      "Choose one coordinated package for interior doors, trim and architectural detail.",
    represents: [
      "Interior door style",
      "Finish",
      "Hardware",
      "Architectural wall detail",
      "Trim / casing",
      "Accent material",
    ],
    materialRole: "Interior architecture",
  }),
  createChapter({
    id: "exterior-arrival-openings",
    number: "05",
    title: "Exterior Arrival & Openings",
    shortTitle: "Exterior Arrival",
    description:
      "Choose a coordinated exterior finish direction for Saturna's arrival and openings.",
    represents: [
      "Entry door",
      "Entry-door finish",
      "Window / patio-door frames",
      "Garage-door appearance",
      "Exterior material / detail",
      "Coordinated accents",
    ],
    technicalNote:
      "This selection changes finishes and appearance only. The Saturna footprint, roof geometry, balconies, window placement and architectural massing remain unchanged.",
    materialRole: "Exterior expression",
  }),
  createChapter({
    id: "whole-home-flooring-stairs",
    number: "06",
    title: "Whole-Home Flooring & Stairs",
    shortTitle: "Flooring & Stairs",
    description:
      "Choose one coordinated flooring and stair package for Saturna's dry interior areas.",
    represents: [
      "Main living areas",
      "Bedrooms",
      "Stair treads",
      "Risers / trim",
      "Transitions",
      "Runner / accent texture",
    ],
    technicalNote:
      "Wet-area flooring is included in the Primary Ensuite package and is not selected again here.",
    materialRole: "Whole-home flooring",
  }),
  createChapter({
    id: "window-coverings",
    number: "07",
    title: "Window Coverings",
    description:
      "Choose one coordinated window-covering package for privacy, light control and textile character.",
    represents: [
      "Main-living roller treatment",
      "Bedroom privacy / blackout",
      "Privacy / light-filter level",
      "Fabric / texture",
      "Control / cassette style",
      "Accent / trim",
    ],
    materialRole: "Textile + privacy",
  }),
] as const;

const saturnaModel = models.find((model) => model.slug === "saturna");

if (!saturnaModel) {
  throw new Error("Saturna configurator source data is unavailable.");
}

export const saturnaHomeConfigurator: HomeConfiguratorDefinition = {
  configurationVersion: 5,
  homeId: saturnaModel.slug,
  homeName: "Saturna",
  residenceLabel: "Saturna House",
  architecturalImages: [
    {
      src: saturnaModel.heroImage,
      alt: "Saturna House exterior architecture.",
    },
    {
      src: saturnaModel.images[1],
      alt: "Saturna House architectural living space.",
    },
  ],
  disclaimer:
    "Representative coordinated design boards. Final products, finishes, availability, pricing and technical suitability are confirmed during project review and are subject to project-specific requirements.",
  categories: chapters,
  lookBook: {
    home: {
      id: saturnaModel.slug,
      name: "Saturna",
      residenceLabel: "Saturna House",
      areaLabel: `${saturnaModel.squareFeet.toLocaleString()} sq. ft.`,
      description: saturnaModel.description,
      heroImage: {
        src: saturnaModel.heroImage,
        alt: "Saturna House exterior architecture.",
      },
      introductionImage: {
        src: saturnaModel.images[1],
        alt: "Saturna House architectural living space.",
      },
      metadata: [
        {
          label: "Area",
          value: `${saturnaModel.squareFeet.toLocaleString()} sq. ft.`,
        },
        { label: "Storeys", value: String(saturnaModel.storeys) },
        { label: "Bedrooms", value: String(saturnaModel.bedrooms) },
        { label: "Bathrooms", value: String(saturnaModel.bathrooms) },
      ],
    },
    sections: [
      {
        kind: "design-story",
        layout: "cinematic-hero",
        id: "design-story",
        number: "01",
        title: "The Saturna You Created",
        introduction:
          "Seven coordinated packages form one considered architectural finish story for Saturna House.",
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
        items: [{ categoryId: "kitchen-look-feel", presentation: "hero" }],
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "primary-ensuite",
        number: "03",
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
          "A coordinated finish expression applied to Saturna's fixed architectural form, openings and arrival sequence.",
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
    nextStageSteps: [
      {
        title: "House Delivery Review",
        description:
          "We review the seven selected packages alongside the Saturna home and project requirements.",
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
