import type {
  HomeConfiguratorDefinition,
  HomeInclusionLevel,
  HomeInclusionOption,
  HomeRoomLookCategory,
} from "@/data/home-configurator";
import type { LookBookOptionEditorial } from "@/data/home-look-book";
import { models } from "@/data/models";

const assetRoot = "/images/homes/saturna/configurator";

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
  technicalNote?: string;
  materialRole: string;
  options: readonly PackageSource[];
};

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
      alt: `${source.level === "premium" ? "Premium" : "Signature"} ${source.optionNumber} — ${source.name}, ${chapter.title.toLowerCase()} design board for Saturna House.`,
      fit: "contain",
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

const sharedPackageDirections = [
  {
    level: "premium",
    optionNumber: "1",
    name: "Warm Modern",
    descriptors: ["Warm", "Layered", "Architectural"],
    storyFragments: ["warm timber tones", "soft mineral surfaces"],
  },
  {
    level: "premium",
    optionNumber: "2",
    name: "Contemporary Cool",
    descriptors: ["Crisp", "Defined", "Contemporary"],
    storyFragments: ["cooler architectural contrast", "precise modern detailing"],
  },
  {
    level: "signature",
    optionNumber: "1",
    name: "Scandi Natural",
    descriptors: ["Natural", "Luminous", "Quiet"],
    storyFragments: ["a light natural palette", "restrained tactile texture"],
  },
  {
    level: "signature",
    optionNumber: "2",
    name: "Modern Earth",
    descriptors: ["Grounded", "Tactile", "Composed"],
    storyFragments: ["grounded earth tones", "rich natural texture"],
  },
] as const;

function sharedOptions(prefix: string): readonly PackageSource[] {
  return sharedPackageDirections.map((option) => ({
    ...option,
    filename: `${prefix}_${option.level === "premium" ? "Premium" : "Signature"}-${option.optionNumber}_${option.name.replaceAll(" ", "-")}.png`,
  }));
}

const kitchenOptions = [
  {
    level: "premium",
    optionNumber: "1",
    name: "Warm Modern",
    filename: "Saturna_01_Kitchen_Premium-1_Warm-Modern.png",
    descriptors: ["Warm", "Layered", "Architectural"],
    storyFragments: ["warm timber tones", "softly expressive stone"],
  },
  {
    level: "premium",
    optionNumber: "2",
    name: "Contemporary Luxe",
    filename: "Saturna_01_Kitchen_Premium-2_Contemporary-Luxe.png",
    descriptors: ["Polished", "Defined", "Contemporary"],
    storyFragments: ["precise contemporary detailing", "a refined surface palette"],
  },
  {
    level: "signature",
    optionNumber: "1",
    name: "Scandi Light",
    filename: "Saturna_01_Kitchen_Signature-1_Scandi-Light.png",
    descriptors: ["Luminous", "Natural", "Quiet"],
    storyFragments: ["a soft, light-filled palette", "restrained natural texture"],
  },
  {
    level: "signature",
    optionNumber: "2",
    name: "Modern Earth",
    filename: "Saturna_01_Kitchen_Signature-2_Modern-Earth.png",
    descriptors: ["Grounded", "Tactile", "Composed"],
    storyFragments: ["grounded earth tones", "rich tactile surfaces"],
  },
] as const satisfies readonly PackageSource[];

const ensuiteOptions = [
  {
    level: "premium",
    optionNumber: "1",
    name: "Coastal Calm",
    filename: "Saturna_02_Primary-Ensuite_Premium-1_Coastal-Calm.png",
    descriptors: ["Calm", "Luminous", "Restorative"],
    storyFragments: ["a soft coastal palette", "quietly restorative surfaces"],
  },
  {
    level: "premium",
    optionNumber: "2",
    name: "Urban Luxe",
    filename: "Saturna_02_Primary-Ensuite_Premium-2_Urban-Luxe.png",
    descriptors: ["Tailored", "Defined", "Polished"],
    storyFragments: ["tailored urban contrast", "polished architectural detail"],
  },
  {
    level: "signature",
    optionNumber: "1",
    name: "Warm Natural",
    filename: "Saturna_02_Primary-Ensuite_Signature-1_Warm-Natural.png",
    descriptors: ["Warm", "Natural", "Tactile"],
    storyFragments: ["warm natural stone", "a grounded spa atmosphere"],
  },
  {
    level: "signature",
    optionNumber: "2",
    name: "Modern Cool",
    filename: "Saturna_02_Primary-Ensuite_Signature-2_Modern-Cool.png",
    descriptors: ["Cool", "Crisp", "Contemporary"],
    storyFragments: ["cool mineral tones", "crisp modern definition"],
  },
] as const satisfies readonly PackageSource[];

const wardrobeOptions = [
  {
    ...sharedPackageDirections[0],
    filename: "Saturna_03_Primary-Wardrobe_Premium-1_Warm-Modern.png",
  },
  {
    level: "premium",
    optionNumber: "2",
    name: "Contemporary Luxe",
    filename: "Saturna_03_Primary-Wardrobe_Premium-2_Contemporary-Luxe.png",
    descriptors: ["Tailored", "Polished", "Contemporary"],
    storyFragments: ["tailored millwork", "precise contemporary detailing"],
  },
  {
    level: "signature",
    optionNumber: "1",
    name: "Scandi Light",
    filename: "Saturna_03_Primary-Wardrobe_Signature-1_Scandi-Light.png",
    descriptors: ["Light", "Natural", "Ordered"],
    storyFragments: ["light natural millwork", "quietly ordered storage"],
  },
  {
    ...sharedPackageDirections[3],
    filename: "Saturna_03_Primary-Wardrobe_Signature-2_Modern-Earth.png",
  },
] as const satisfies readonly PackageSource[];

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
    options: kitchenOptions,
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
    options: ensuiteOptions,
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
    options: wardrobeOptions,
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
    options: sharedOptions("Saturna_04_Interior-Doors-Details"),
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
    options: sharedOptions("Saturna_05_Exterior-Arrival"),
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
    options: sharedOptions("Saturna_06_Flooring-Stairs"),
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
    options: sharedOptions("Saturna_07_Window-Coverings"),
  }),
] as const;

const saturnaModel = models.find((model) => model.slug === "saturna");

if (!saturnaModel) {
  throw new Error("Saturna configurator source data is unavailable.");
}

export const saturnaHomeConfigurator: HomeConfiguratorDefinition = {
  configurationVersion: 4,
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
        kind: "arrival",
        layout: "architectural-arrival",
        id: "exterior-arrival",
        number: "06",
        title: "Exterior Arrival & Openings",
        introduction:
          "A coordinated finish expression applied to Saturna's fixed architectural form, openings and arrival sequence.",
        heroImage: "home-hero",
        items: [
          { categoryId: "exterior-arrival-openings", presentation: "detail" },
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
