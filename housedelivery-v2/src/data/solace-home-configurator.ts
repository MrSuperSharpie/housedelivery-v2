import type {
  HomeConfiguratorDefinition,
  HomeFlooringZone,
  HomeInclusionLevel,
  HomeInclusionOption,
  HomeRoomLookCategory,
  HomeStandardInclusionCategory,
} from "@/data/home-configurator";
import type { LookBookOptionEditorial } from "@/data/home-look-book";
import { models } from "@/data/models";

const assetRoot = "/images/homes/solace/configurator";

type FourStrings = readonly [string, string, string, string];

type OptionSource = {
  level: HomeInclusionLevel;
  optionNumber: string;
  name: string;
  filename: string;
  description?: string;
};

const optionSlots: readonly {
  level: HomeInclusionLevel;
  optionNumber: string;
}[] = [
  { level: "premium", optionNumber: "01" },
  { level: "premium", optionNumber: "02" },
  { level: "signature", optionNumber: "01" },
  { level: "signature", optionNumber: "02" },
];

function createEditorialMetadata(
  categoryId: string,
  name: string,
  level: HomeInclusionLevel,
): LookBookOptionEditorial {
  const normalizedName = name.toLowerCase();
  const descriptors: string[] = [];
  const storyFragments: string[] = [];

  if (/oak|timber|walnut|wood/.test(normalizedName)) {
    descriptors.push("Natural");
    storyFragments.push("warm timber tones");
  }
  if (/stone|porcelain|limestone|calacatta|marble/.test(normalizedName)) {
    descriptors.push("Tactile");
    storyFragments.push("quietly expressive stone");
  }
  if (/white|ivory|light|pale|linen|coastal/.test(normalizedName)) {
    descriptors.push("Luminous");
    storyFragments.push("a soft, light-filled palette");
  }
  if (/black|charcoal|graphite|smoked|dark/.test(normalizedName)) {
    descriptors.push("Defined");
    storyFragments.push("deeper architectural contrast");
  }
  if (/panoramic|full-height|sculpted|backlit|architectural/.test(normalizedName)) {
    descriptors.push("Sculptural");
    storyFragments.push("strong architectural moments");
  }

  if (descriptors.length === 0) {
    descriptors.push(level === "signature" ? "Expressive" : "Refined");
  }
  if (storyFragments.length === 0) {
    storyFragments.push(
      level === "signature"
        ? "distinctive architectural detailing"
        : "a calm, restrained material direction",
    );
  }

  const materialRoles: Record<string, string> = {
    "kitchen-look-feel": "Cabinetry + stone",
    "master-wardrobes": "Millwork",
    "master-bathroom-look-feel": "Stone + tile",
    "interior-wall-panels": "Architectural surface",
    lighting: "Ambient light",
    "window-coverings": "Textile + privacy",
    "interior-doors": "Interior architecture",
    "exterior-entry-doors": "Arrival",
    "windows-patio-doors": "Light + opening",
    "garage-door-operator": "Exterior detail",
    "flooring-main-living": "Main floor",
    "flooring-bedrooms": "Bedroom floor",
    "flooring-wet-areas": "Wet-area floor",
  };

  return {
    descriptors: Array.from(new Set(descriptors)),
    storyFragments: Array.from(new Set(storyFragments)),
    materialRole: materialRoles[categoryId],
  };
}

function createOption(
  categoryId: string,
  categoryTitle: string,
  source: OptionSource,
): HomeInclusionOption {
  return {
    id: `${categoryId}-${source.level}-${source.optionNumber}`,
    level: source.level,
    optionNumber: source.optionNumber,
    name: source.name,
    description: source.description,
    editorial: createEditorialMetadata(categoryId, source.name, source.level),
    image: {
      src: `${assetRoot}/${source.filename}`,
      alt: `${source.name}, representative ${categoryTitle.toLowerCase()} design imagery for Solace.`,
    },
  };
}

function createOptions(
  categoryId: string,
  categoryTitle: string,
  filenames: FourStrings,
  names: FourStrings,
): readonly HomeInclusionOption[] {
  return optionSlots.map((slot, index) =>
    createOption(categoryId, categoryTitle, {
      ...slot,
      name: names[index],
      filename: filenames[index],
    }),
  );
}

function roomLookCategory({
  id,
  number,
  title,
  shortTitle = title,
  description,
  represents,
  options,
  technicalNote,
}: Omit<HomeRoomLookCategory, "kind" | "shortTitle"> & {
  shortTitle?: string;
}): HomeRoomLookCategory {
  return {
    kind: "room-look",
    id,
    number,
    title,
    shortTitle,
    description,
    represents,
    options,
    technicalNote,
  };
}

function standardCategory({
  id,
  number,
  title,
  shortTitle = title,
  description,
  filenames,
  names,
  technicalNote,
}: {
  id: string;
  number: string;
  title: string;
  shortTitle?: string;
  description: string;
  filenames: FourStrings;
  names: FourStrings;
  technicalNote?: string;
}): HomeStandardInclusionCategory {
  return {
    kind: "standard",
    id,
    number,
    title,
    shortTitle,
    description,
    options: createOptions(id, title, filenames, names),
    technicalNote,
  };
}

function flooringZone({
  id,
  number,
  title,
  shortTitle,
  description,
  filenames,
  names,
}: {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  description: string;
  filenames: FourStrings;
  names: FourStrings;
}): HomeFlooringZone {
  return {
    id,
    number,
    title,
    shortTitle,
    description,
    options: createOptions(id, title, filenames, names),
  };
}

const solaceModel = models.find((model) => model.slug === "solace");

if (!solaceModel) {
  throw new Error("Solace configurator source data is unavailable.");
}

const kitchenLookTitle = "Kitchen Look & Feel";
const kitchenLookOptions = [
  createOption("kitchen-look-feel", kitchenLookTitle, {
    level: "premium",
    optionNumber: "01",
    name: "Coastal Light Oak",
    filename: "solace_kitchen_cabinetry_premium_02.png",
    description:
      "Pale oak, softened stone and restrained hardware create a bright, composed kitchen.",
  }),
  createOption("kitchen-look-feel", kitchenLookTitle, {
    level: "signature",
    optionNumber: "01",
    name: "Stone Wrapped Oak",
    filename: "solace_kitchen_cabinetry_signature_01.png",
    description:
      "Natural oak and expressive stone establish a richer architectural kitchen.",
  }),
  createOption("kitchen-look-feel", kitchenLookTitle, {
    level: "premium",
    optionNumber: "02",
    name: "Soft White",
    filename: "solace_countertops_premium_01_soft_white.png",
    description:
      "Soft white surfaces and quiet detailing create a clean, light-filled kitchen.",
  }),
  createOption("kitchen-look-feel", kitchenLookTitle, {
    level: "signature",
    optionNumber: "02",
    name: "Sculpted White",
    filename: "solace_countertops_signature_01_sculpted_white.png.png",
    description:
      "Expressive pale stone and stronger forms create a sculptural, elevated kitchen.",
  }),
] as const;

const masterBathroomTitle = "Master Bathroom Look & Feel";
const masterBathroomOptions = [
  createOption("master-bathroom-look-feel", masterBathroomTitle, {
    level: "premium",
    optionNumber: "01",
    name: "Coastal Light Spa",
    filename: "solace_bathroom_systems_premium_01.png",
    description:
      "Pale oak and soft stone establish a calm, bright primary bathroom retreat.",
  }),
  createOption("master-bathroom-look-feel", masterBathroomTitle, {
    level: "signature",
    optionNumber: "01",
    name: "Calacatta Vein",
    filename: "solace_tile_surfaces_signature_01.png",
    description:
      "Expressive veined stone creates an elevated, gallery-like bathroom character.",
  }),
  createOption("master-bathroom-look-feel", masterBathroomTitle, {
    level: "signature",
    optionNumber: "02",
    name: "Charcoal Stone",
    filename: "solace_tile_surfaces_signature_02.png",
    description:
      "Deep charcoal surfaces create a dramatic and composed spa atmosphere.",
  }),
  createOption("master-bathroom-look-feel", masterBathroomTitle, {
    level: "premium",
    optionNumber: "02",
    name: "Soft Stone",
    filename: "solace_tile_surfaces_premium_02.png",
    description:
      "Quiet neutral stone creates a warm, understated primary bathroom palette.",
  }),
] as const;

export const legacyCustomHomeConfiguratorTemplate: HomeConfiguratorDefinition = {
  configurationVersion: 3,
  homeId: "solace",
  homeName: "Solace",
  residenceLabel: "Solace House",
  architecturalImages: [
    {
      src: solaceModel.heroImage,
      alt: "Solace House exterior architecture.",
    },
    {
      src: solaceModel.images[1],
      alt: "Solace House architectural living space.",
    },
  ],
  disclaimer:
    "Representative design imagery. Final products, finishes, availability, pricing and technical suitability are confirmed during project review and are subject to project-specific requirements.",
  categories: [
    roomLookCategory({
      id: "kitchen-look-feel",
      number: "01",
      title: kitchenLookTitle,
      description:
        "Choose one coordinated kitchen direction combining cabinetry, surface, fixture and supporting-finish character.",
      represents: [
        "Cabinetry",
        "Countertops",
        "Kitchen fixtures and hardware",
        "Supporting finishes",
      ],
      options: kitchenLookOptions,
      technicalNote:
        "This selection establishes a representative visual brief rather than an exact manufactured kitchen package.",
    }),
    standardCategory({
      id: "master-wardrobes",
      number: "02",
      title: "Master Wardrobes",
      description:
        "Choose the wardrobe direction for the primary bedroom and dressing areas of Solace.",
      filenames: [
        "solace_wardrobes_premium_01.png",
        "solace_wardrobes_premium_02.png",
        "solace_wardrobes_signature_01.png",
        "solace_wardrobes_signature_02.png",
      ],
      names: [
        "Light Oak Full-Height",
        "Soft White + Oak",
        "Walnut Display Wardrobe",
        "Walnut Walk-In Gallery",
      ],
    }),
    standardCategory({
      id: "interior-doors",
      number: "03",
      title: "Interior Doors",
      description:
        "Set the interior door language that connects private rooms, circulation spaces and the wider finish palette.",
      filenames: [
        "solace_interior_doors_premium_01.png",
        "solace_interior_doors_premium_02.png",
        "solace_interior_doors_signature_01.png",
        "solace_interior_doors_signature_02.png",
      ],
      names: [
        "Light Oak Flush",
        "Soft White Flush",
        "Full-Height Walnut",
        "Smoked Timber Flush",
      ],
    }),
    standardCategory({
      id: "exterior-entry-doors",
      number: "04",
      title: "Exterior Entry Doors",
      shortTitle: "Entry Doors",
      description:
        "Choose the arrival expression that will be coordinated with the Solace architecture and site-specific entry requirements.",
      filenames: [
        "solace_exterior_entry_doors_premium_01.png",
        "solace_exterior_entry_doors_premium_02.png",
        "solace_exterior_entry_doors_signature_01.png",
        "solace_exterior_entry_doors_signature_02.png",
      ],
      names: [
        "Warm Timber Entry",
        "Natural Timber Entry",
        "Architectural Timber Pivot",
        "Sculpted Timber Entry",
      ],
    }),
    standardCategory({
      id: "windows-patio-doors",
      number: "05",
      title: "Windows & Patio Doors",
      description:
        "Select the glazing expression that shapes daylight and indoor-outdoor connection, subject to project-specific performance review.",
      filenames: [
        "solace_windows_patio_doors_premium_01.png",
        "solace_windows_patio_doors_premium_02.png",
        "solace_windows_patio_doors_signature_01.png",
        "solace_windows_patio_doors_signature_02.png",
      ],
      names: [
        "Expansive Black-Framed Glazing",
        "Black-Framed Patio Slider",
        "Panoramic Floor-to-Ceiling Glazing",
        "Full-Height Sliding Wall",
      ],
    }),
    roomLookCategory({
      id: "master-bathroom-look-feel",
      number: "06",
      title: masterBathroomTitle,
      description:
        "Choose one coordinated primary bathroom direction combining vanity, surface, tile, fixture and complementary-finish character.",
      represents: [
        "Vanity and cabinetry",
        "Surfaces and tile",
        "Bathroom fixtures",
        "Complementary finishes",
      ],
      options: masterBathroomOptions,
      technicalNote:
        "This selection establishes a representative visual brief rather than an exact final product schedule.",
    }),
    standardCategory({
      id: "interior-wall-panels",
      number: "07",
      title: "Interior Wall Panels",
      shortTitle: "Wall Panels",
      description:
        "Select a feature-wall direction that adds controlled material depth to key interior spaces.",
      filenames: [
        "solace_interior_wall_panels_premium_01.png",
        "solace_interior_wall_panels_premium_02.png",
        "solace_interior_wall_panels_signature_01.png",
        "solace_interior_wall_panels_signature_02.png",
      ],
      names: [
        "Natural Oak Slat",
        "Pale Oak Panel",
        "Backlit Stone Feature",
        "Architectural Stone Feature",
      ],
    }),
    standardCategory({
      id: "lighting",
      number: "08",
      title: "Lighting",
      description:
        "Choose the lighting atmosphere that supports everyday use and reinforces the overall home palette.",
      filenames: [
        "solace_lighting_premium_01.png",
        "solace_lighting_premium_02.png",
        "solace_lighting_signature_01.png",
        "solace_lighting_signature_02.png",
      ],
      names: [
        "Linear + Globe Kitchen",
        "Warm Dining Pendants",
        "Layered Architectural Glow",
        "Sculptural Stair Chandelier",
      ],
    }),
    standardCategory({
      id: "window-coverings",
      number: "09",
      title: "Roller Blinds / Window Coverings",
      shortTitle: "Window Coverings",
      description:
        "Select the privacy and daylight-control direction that sits quietly within the interior palette.",
      filenames: [
        "solace_window_coverings_premium_01.png",
        "solace_window_coverings_premium_02.png",
        "solace_window_coverings_signature_01.png",
        "solace_window_coverings_signature_02.png",
      ],
      names: [
        "Light-Filtering Linen Roller",
        "Textured Taupe Roller",
        "Double-Height Sheer + Roller",
        "Dark Blackout Roller",
      ],
    }),
    standardCategory({
      id: "garage-door-operator",
      number: "10",
      title: "Garage Door + Operator",
      shortTitle: "Garage Access",
      description:
        "Choose the garage-door aesthetic direction. The operator and complete access system remain project-coordinated.",
      filenames: [
        "solace_garage_door_premium_01.png",
        "solace_garage_door_premium_02.png",
        "solace_garage_door_signature_01.png",
        "solace_garage_door_signature_02.png",
      ],
      names: [
        "Light Oak Wood-Look",
        "Smooth Graphite",
        "Warm Vertical Timber-Look",
        "Smoked Horizontal Timber-Look",
      ],
      technicalNote:
        "Images represent door aesthetics only. Final operator, controls, electrical requirements, safety provisions and technical suitability are confirmed for the project.",
    }),
    {
      kind: "flooring",
      id: "flooring",
      number: "11",
      title: "Flooring",
      shortTitle: "Flooring by Zone",
      description:
        "Build the flooring direction across three controlled zones without designing every room separately.",
      technicalNote:
        "Stairs and transition areas remain coordinated to the overall project and do not require a separate customer selection.",
      zones: [
        flooringZone({
          id: "flooring-main-living",
          number: "01",
          title: "Main Living / Kitchen / Dining",
          shortTitle: "Main Living",
          description:
            "The continuous flooring direction for the principal social spaces.",
          filenames: [
            "solace_flooring_main_living_premium_01.png",
            "solace_flooring_main_living_premium_02.png",
            "solace_flooring_main_living_signature_01.png",
            "solace_flooring_main_living_signature_02.png",
          ],
          names: [
            "Coastal Light Oak",
            "Natural Oak",
            "Smoked Wide-Plank Oak",
            "Warm Limestone-Look",
          ],
        }),
        flooringZone({
          id: "flooring-bedrooms",
          number: "02",
          title: "Bedrooms",
          shortTitle: "Bedrooms",
          description: "The flooring direction for private rooms and retreats.",
          filenames: [
            "solace_flooring_bedrooms_premium_01.png",
            "solace_flooring_bedrooms_premium_02.png",
            "solace_flooring_bedrooms_signature_01.png",
            "solace_flooring_bedrooms_signature_02.png",
          ],
          names: [
            "Soft Ivory Carpet",
            "Light Engineered Oak",
            "Luxury Taupe Carpet",
            "Smoked Oak",
          ],
        }),
        flooringZone({
          id: "flooring-wet-areas",
          number: "03",
          title: "Bathrooms / Wet Areas",
          shortTitle: "Wet Areas",
          description:
            "The surface direction for bathrooms and other wet-area zones.",
          filenames: [
            "solace_flooring_wet_areas_premium_01.png",
            "solace_flooring_wet_areas_premium_02.png",
            "solace_flooring_wet_areas_signature_01.png",
            "solace_flooring_wet_areas_signature_02.png",
          ],
          names: [
            "Warm Porcelain",
            "Soft Stone Porcelain",
            "Large-Format Limestone-Look",
            "Graphite Stone-Look",
          ],
        }),
      ],
    },
    {
      kind: "coordinated",
      id: "appliances",
      number: "12",
      title: "Appliances",
      shortTitle: "Appliances",
      description:
        "Appliance package and final models will be confirmed during project review based on availability, project requirements and the selected home specification.",
      coordinatedMessage: "Project Coordinated",
    },
  ],
  lookBook: {
    home: {
      id: solaceModel.slug,
      name: solaceModel.name,
      residenceLabel: "Solace House",
      areaLabel: `${solaceModel.squareFeet.toLocaleString()} sq. ft.`,
      description: solaceModel.description,
      heroImage: {
        src: solaceModel.heroImage,
        alt: "Solace House exterior architecture.",
      },
      introductionImage: {
        src: solaceModel.images[1],
        alt: "Solace House architectural living space.",
      },
      metadata: [
        {
          label: "Area",
          value: `${solaceModel.squareFeet.toLocaleString()} sq. ft.`,
        },
        { label: "Storeys", value: String(solaceModel.storeys) },
        { label: "Bedrooms", value: String(solaceModel.bedrooms) },
        { label: "Bathrooms", value: String(solaceModel.bathrooms) },
      ],
    },
    sections: [
      {
        kind: "design-story",
        layout: "cinematic-hero",
        id: "design-story",
        number: "01",
        title: "The Solace You Created",
        introduction:
          "A personal design language assembled from the materials, light and architectural details you selected.",
        heroImage: "home-introduction",
        items: [
          { categoryId: "kitchen-look-feel" },
          { categoryId: "master-bathroom-look-feel" },
          { categoryId: "master-wardrobes" },
          { categoryId: "interior-wall-panels" },
          { categoryId: "lighting" },
          { categoryId: "window-coverings" },
          { categoryId: "interior-doors" },
          { categoryId: "windows-patio-doors" },
          { categoryId: "flooring", zoneId: "flooring-main-living" },
        ],
      },
      {
        kind: "material-story",
        layout: "material-palette",
        id: "material-dna",
        number: "02",
        title: "Material DNA",
        introduction:
          "The tones and textures that make the home read as one considered whole.",
        items: [
          { categoryId: "kitchen-look-feel", presentation: "material" },
          { categoryId: "master-bathroom-look-feel", presentation: "material" },
          { categoryId: "flooring", zoneId: "flooring-main-living", label: "Main Floor", presentation: "material" },
          { categoryId: "flooring", zoneId: "flooring-bedrooms", label: "Bedroom Floor", presentation: "material" },
          { categoryId: "flooring", zoneId: "flooring-wet-areas", label: "Wet-Area Floor", presentation: "material" },
          { categoryId: "interior-doors", presentation: "material" },
        ],
      },
      {
        kind: "selection-story",
        layout: "cinematic-hero",
        id: "kitchen",
        number: "03",
        title: "Kitchen",
        introduction:
          "The social heart of Solace, expressed through cabinetry, surface, fixture and supporting-finish character.",
        items: [
          { categoryId: "kitchen-look-feel", presentation: "hero" },
          { categoryId: "appliances", presentation: "detail" },
        ],
      },
      {
        kind: "selection-story",
        layout: "asymmetric",
        id: "primary-suite",
        number: "04",
        title: "Primary Suite",
        introduction:
          "A quiet retreat shaped by tailored millwork and the warmth underfoot.",
        items: [
          { categoryId: "master-wardrobes", presentation: "hero" },
          { categoryId: "flooring", zoneId: "flooring-bedrooms", label: "Bedroom Flooring", presentation: "detail" },
        ],
      },
      {
        kind: "selection-story",
        layout: "editorial-split",
        id: "master-bathroom",
        number: "05",
        title: "Master Bathroom",
        introduction:
          "A private, restorative room where a singular surface direction meets a grounded wet-area finish.",
        items: [
          { categoryId: "master-bathroom-look-feel", presentation: "hero" },
          { categoryId: "flooring", zoneId: "flooring-wet-areas", label: "Wet-Area Flooring", presentation: "detail" },
        ],
      },
      {
        kind: "selection-story",
        layout: "detail-story",
        id: "living-atmosphere",
        number: "06",
        title: "Living Atmosphere",
        introduction:
          "Material continuity, filtered light and a measured layer of architectural detail across the principal rooms.",
        items: [
          { categoryId: "flooring", zoneId: "flooring-main-living", label: "Main Living Flooring", presentation: "hero" },
          { categoryId: "interior-wall-panels", presentation: "detail" },
          { categoryId: "lighting", presentation: "detail" },
          { categoryId: "window-coverings", presentation: "detail" },
          { categoryId: "interior-doors", presentation: "detail" },
        ],
      },
      {
        kind: "arrival",
        layout: "architectural-arrival",
        id: "arrival",
        number: "07",
        title: "Arrival",
        introduction:
          "The first impression of Solace: a composed entry, generous openings and an exterior language held in quiet balance.",
        heroImage: "home-hero",
        includeProjectCoordination: true,
        items: [
          { categoryId: "exterior-entry-doors", presentation: "detail" },
          { categoryId: "windows-patio-doors", presentation: "detail" },
          { categoryId: "garage-door-operator", presentation: "detail" },
        ],
      },
    ],
    projectCoordinatedItems: [
      {
        id: "appliances",
        title: "Appliances",
        description:
          "Final package, models and availability are confirmed during project review.",
      },
      {
        id: "secondary-rooms",
        title: "Secondary Rooms",
        description:
          "Supporting spaces are developed from the selected whole-home palette.",
      },
      {
        id: "product-confirmation",
        title: "Product Confirmation",
        description:
          "Detailed products, hardware and availability are confirmed for the project.",
      },
      {
        id: "technical-requirements",
        title: "Project Requirements",
        description:
          "Site-specific and technical requirements are coordinated at the next stage.",
      },
    ],
    nextStageSteps: [
      {
        title: "House Delivery Review",
        description:
          "We review the selected home, inclusions and project requirements.",
      },
      {
        title: "Product + Project Confirmation",
        description:
          "Applicable products, availability, pricing and site-specific requirements are confirmed.",
      },
      {
        title: "Project-Specific Visualization",
        description:
          "The approved brief can then be developed into the detailed home visualization and virtual walkthrough stage.",
      },
    ],
    preliminaryNotice:
      "This Look Book is a preliminary visual design brief and is not a final construction specification, quotation, engineering package or permit document.",
  },
};

const visualGuideAssetRoot = "/images/homes/solace/visual-guide";

type SolaceVisualGuidePackage = {
  level: HomeInclusionLevel;
  optionNumber: string;
  name: string;
  filenameLabel: string;
  descriptors: readonly string[];
  storyFragments: readonly string[];
};

type SolaceVisualGuideChapter = {
  id: string;
  number: string;
  title: string;
  shortTitle?: string;
  assetPrefix: string;
  description: string;
  represents: readonly string[];
  materialRole: string;
  technicalNote?: string;
  optionNames?: readonly [string, string, string, string];
};

const solaceVisualGuidePackages = [
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
] as const satisfies readonly SolaceVisualGuidePackage[];

function createSolaceVisualGuideChapter(
  source: SolaceVisualGuideChapter,
): HomeRoomLookCategory {
  return {
    kind: "room-look",
    id: source.id,
    number: source.number,
    title: source.title,
    shortTitle: source.shortTitle ?? source.title,
    description: source.description,
    represents: source.represents,
    technicalNote: source.technicalNote,
    options: solaceVisualGuidePackages.map((designPackage, index) => {
      const name = source.optionNames?.[index] ?? designPackage.name;

      return {
        id: `${source.id}-${designPackage.level}-${designPackage.optionNumber}`,
        level: designPackage.level,
        optionNumber: designPackage.optionNumber,
        name,
        editorial: {
          descriptors: designPackage.descriptors,
          storyFragments: designPackage.storyFragments,
          materialRole: source.materialRole,
        },
        image: {
          src: `${visualGuideAssetRoot}/${source.assetPrefix}_${designPackage.level === "premium" ? "Premium" : "Signature"}-${designPackage.optionNumber}_${designPackage.filenameLabel}.png`,
          alt: `${designPackage.level === "premium" ? "Premium" : "Signature"} ${designPackage.optionNumber} — ${name}, ${source.title.toLowerCase()} design board for Solace House.`,
          fit: "contain" as const,
          role: "design-board" as const,
          quality: 100 as const,
        },
      };
    }),
  };
}

const solaceVisualGuideChapters = [
  createSolaceVisualGuideChapter({
    id: "kitchen-look-feel",
    number: "01",
    title: "Kitchen Look & Feel",
    shortTitle: "Kitchen",
    assetPrefix: "Solace_01_Kitchen",
    description:
      "Choose one coordinated kitchen package. Its complete design board carries the finish direction into My Solace.",
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
  createSolaceVisualGuideChapter({
    id: "primary-ensuite-look-feel",
    number: "02",
    title: "Primary Ensuite Look & Feel",
    shortTitle: "Primary Ensuite",
    assetPrefix: "Solace_02_Primary-Ensuite",
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
  createSolaceVisualGuideChapter({
    id: "primary-wardrobe",
    number: "03",
    title: "Primary Wardrobe",
    assetPrefix: "Solace_03_Primary-Wardrobe",
    description:
      "Choose the coordinated wardrobe package for the Solace primary suite.",
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
  createSolaceVisualGuideChapter({
    id: "interior-doors-details",
    number: "04",
    title: "Interior Doors & Details",
    shortTitle: "Interior Details",
    assetPrefix: "Solace_04_Interior-Doors-Details",
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
  createSolaceVisualGuideChapter({
    id: "exterior-arrival-openings",
    number: "05",
    title: "Exterior Arrival & Openings",
    shortTitle: "Exterior Arrival",
    assetPrefix: "Solace_05_Exterior-Arrival",
    description:
      "Choose a coordinated exterior finish direction for Solace's arrival and openings.",
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
      "This selection changes finishes and appearance only. The Solace footprint, roof geometry, window placement and architectural massing remain unchanged.",
    optionNames: [
      "Warm White",
      "Soft White",
      "Stone Wrapped Oak",
      "Sculpted White",
    ],
  }),
  createSolaceVisualGuideChapter({
    id: "whole-home-flooring-stairs",
    number: "06",
    title: "Whole-Home Flooring & Stairs",
    shortTitle: "Flooring & Stairs",
    assetPrefix: "Solace_06_Flooring-Stairs",
    description:
      "Choose one coordinated flooring and stair package for Solace's dry interior areas.",
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
  createSolaceVisualGuideChapter({
    id: "window-coverings",
    number: "07",
    title: "Window Coverings",
    assetPrefix: "Solace_07_Window-Coverings",
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

const solaceAppliances = {
  kind: "coordinated",
  id: "appliances",
  number: "PC",
  title: "Appliances",
  shortTitle: "Appliances",
  description:
    "The final appliance package, manufacturers and models are confirmed during project review.",
  coordinatedMessage: "Project Coordinated",
} as const;

export const solaceHomeConfigurator: HomeConfiguratorDefinition = {
  configurationVersion: 4,
  homeId: solaceModel.slug,
  homeName: "Solace",
  residenceLabel: "Solace House",
  architecturalImages: [
    {
      src: solaceModel.heroImage,
      alt: "Solace House exterior architecture.",
    },
    {
      src: solaceModel.images[1],
      alt: "Solace House architectural living space.",
    },
  ],
  disclaimer:
    "Representative coordinated design boards. Final products, finishes, availability, pricing and technical suitability are confirmed during project review and are subject to project-specific requirements.",
  categories: [...solaceVisualGuideChapters, solaceAppliances],
  lookBook: {
    home: {
      id: solaceModel.slug,
      name: "Solace",
      residenceLabel: "Solace House",
      areaLabel: `${solaceModel.squareFeet.toLocaleString()} sq. ft.`,
      description: solaceModel.description,
      heroImage: {
        src: solaceModel.heroImage,
        alt: "Solace House exterior architecture.",
      },
      introductionImage: {
        src: solaceModel.images[1],
        alt: "Solace House architectural living space.",
      },
      metadata: [
        {
          label: "Area",
          value: `${solaceModel.squareFeet.toLocaleString()} sq. ft.`,
        },
        { label: "Storeys", value: String(solaceModel.storeys) },
        { label: "Bedrooms", value: String(solaceModel.bedrooms) },
        { label: "Bathrooms", value: String(solaceModel.bathrooms) },
      ],
    },
    sections: [
      {
        kind: "design-story",
        layout: "cinematic-hero",
        id: "design-story",
        number: "01",
        title: "The Solace You Created",
        introduction:
          "Seven coordinated packages form one considered architectural finish story for Solace House.",
        heroImage: "home-introduction",
        items: solaceVisualGuideChapters.map((chapter) => ({
          categoryId: chapter.id,
        })),
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
          "A coordinated finish expression applied to Solace's fixed architectural form, openings and arrival sequence.",
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
          "The final appliance package, manufacturers and models are confirmed during project review.",
      },
    ],
    nextStageSteps: [
      {
        title: "House Delivery Review",
        description:
          "We review the seven selected packages alongside the Solace home and project requirements.",
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
