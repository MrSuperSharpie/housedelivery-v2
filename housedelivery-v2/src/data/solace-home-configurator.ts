import type {
  HomeConfiguratorDefinition,
  HomeFlooringZone,
  HomeInclusionLevel,
  HomeInclusionOption,
  HomeOptionDirectionRecommendation,
  HomeStandardInclusionCategory,
} from "@/data/home-configurator";
import { getHomeDesignDirections } from "@/data/home-design-collections";
import { models } from "@/data/models";

const assetRoot = "/images/homes/solace/configurator";

type FourStrings = readonly [string, string, string, string];
type FourRecommendationSets = readonly [
  readonly HomeOptionDirectionRecommendation[] | undefined,
  readonly HomeOptionDirectionRecommendation[] | undefined,
  readonly HomeOptionDirectionRecommendation[] | undefined,
  readonly HomeOptionDirectionRecommendation[] | undefined,
];

const optionSlots: readonly {
  level: HomeInclusionLevel;
  optionNumber: string;
  suffix: string;
}[] = [
  { level: "premium", optionNumber: "01", suffix: "premium-01" },
  { level: "premium", optionNumber: "02", suffix: "premium-02" },
  { level: "signature", optionNumber: "01", suffix: "signature-01" },
  { level: "signature", optionNumber: "02", suffix: "signature-02" },
];

function createOptions(
  categoryId: string,
  categoryTitle: string,
  filenames: FourStrings,
  names: FourStrings,
  recommendations?: FourRecommendationSets,
): readonly HomeInclusionOption[] {
  return optionSlots.map((slot, index) => ({
    id: `${categoryId}-${slot.suffix}`,
    level: slot.level,
    optionNumber: slot.optionNumber,
    name: names[index],
    directionRecommendations: recommendations?.[index],
    image: {
      src: `${assetRoot}/${filenames[index]}`,
      alt: `${names[index]}, representative ${categoryTitle.toLowerCase()} design imagery for Solace.`,
    },
  }));
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
  recommendations,
}: {
  id: string;
  number: string;
  title: string;
  shortTitle?: string;
  description: string;
  filenames: FourStrings;
  names: FourStrings;
  technicalNote?: string;
  recommendations?: FourRecommendationSets;
}): HomeStandardInclusionCategory {
  return {
    kind: "standard",
    id,
    number,
    title,
    shortTitle,
    description,
    options: createOptions(id, title, filenames, names, recommendations),
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
  recommendations,
}: {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  description: string;
  filenames: FourStrings;
  names: FourStrings;
  recommendations?: FourRecommendationSets;
}): HomeFlooringZone {
  return {
    id,
    number,
    title,
    shortTitle,
    description,
    options: createOptions(id, title, filenames, names, recommendations),
  };
}

function complements(
  directionId: string,
  guidance?: string,
): HomeOptionDirectionRecommendation {
  return { directionId, label: "Complements", guidance };
}

function recommendedFor(
  directionId: string,
  guidance?: string,
): HomeOptionDirectionRecommendation {
  return { directionId, label: "Recommended for", guidance };
}

const designDirections = getHomeDesignDirections("solace");
const solaceModel = models.find((model) => model.slug === "solace");

if (!designDirections || !solaceModel) {
  throw new Error("Solace configurator source data is unavailable.");
}

export const solaceHomeConfigurator: HomeConfiguratorDefinition = {
  homeId: "solace",
  homeName: "Solace",
  residenceLabel: "Solace House",
  designDirections,
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
    standardCategory({
      id: "kitchen-cabinetry",
      number: "01",
      title: "Kitchen Cabinetry",
      description:
        "Choose the cabinetry character that establishes the kitchen's material foundation while keeping every other inclusion category independent.",
      filenames: [
        "solace_kitchen_cabinetry_premium_01.png",
        "solace_kitchen_cabinetry_premium_02.png",
        "solace_kitchen_cabinetry_signature_01.png",
        "solace_kitchen_cabinetry_signature_02.png",
      ],
      names: [
        "Warm Natural Oak",
        "Coastal Light Oak",
        "Stone-Wrapped Oak",
        "Refined Pale Oak",
      ],
      recommendations: [
        [
          complements(
            "warm-natural",
            "Natural oak reinforces the warmer, grounded material language of this direction.",
          ),
        ],
        [
          complements(
            "coastal-light",
            "Pale oak keeps the kitchen bright and quietly connected to the coastal palette.",
          ),
        ],
        [
          recommendedFor(
            "sculpted-natural-luxury",
            "The stronger stone expression adds the sculptural weight characteristic of this direction.",
          ),
          complements("pacific-contrast"),
        ],
        [
          complements("refined-west-coast"),
          complements("architectural-calm"),
        ],
      ],
    }),
    standardCategory({
      id: "countertops",
      number: "02",
      title: "Countertops",
      description:
        "Select a surface direction for the kitchen and associated work surfaces, coordinated with the cabinetry and visual direction.",
      filenames: [
        "solace_countertops_premium_01_soft_white.png",
        "solace_countertops_premium_02_warm_stone.png.png",
        "solace_countertops_signature_01_sculpted_white.png.png",
        "solace_countertops_signature_02_midnight_stone.png",
      ],
      names: ["Soft White", "Warm Stone", "Sculpted White", "Midnight Stone"],
      recommendations: [
        [complements("coastal-light"), complements("architectural-calm")],
        [complements("warm-natural")],
        [
          recommendedFor(
            "sculpted-natural-luxury",
            "Expressive pale stone brings a more sculptural focal point without overwhelming the room.",
          ),
          complements("refined-west-coast"),
        ],
        [
          complements(
            "pacific-contrast",
            "The deeper surface tone creates the controlled contrast central to this direction.",
          ),
        ],
      ],
    }),
    standardCategory({
      id: "wardrobes",
      number: "03",
      title: "Wardrobes",
      description:
        "Choose a coordinated wardrobe direction for the private rooms and dressing areas of Solace.",
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
      number: "04",
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
      number: "05",
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
      number: "06",
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
    standardCategory({
      id: "kitchen-bath-fixtures",
      number: "07",
      title: "Kitchen & Bath Fixtures",
      shortTitle: "Fixtures",
      description:
        "Choose a coordinated fixture direction spanning the kitchen and bathrooms without implying a final manufacturer or product specification.",
      filenames: [
        "solace_kitchen_bath_fixtures_premium_01.png",
        "solace_kitchen_bath_fixtures_premium_02.png",
        "solace_kitchen_bath_fixtures_signature_01.png",
        "solace_kitchen_bath_fixtures_signature_02.png",
      ],
      names: [
        "Dark Architectural Kitchen Direction",
        "Refined Minimal Kitchen Direction",
        "Architectural Kitchen Fixture Direction",
        "Dark Spa Bath Fixture Direction",
      ],
    }),
    standardCategory({
      id: "bathroom-systems",
      number: "08",
      title: "Bathroom Systems",
      description:
        "Select the bathroom atmosphere that coordinates vanity, surface and spatial character while fixtures remain independently controlled.",
      filenames: [
        "solace_bathroom_systems_premium_01.png",
        "solace_bathroom_systems_premium_02.png",
        "solace_bathroom_systems_signature_01.png",
        "solace_bathroom_systems_signature_02.png",
      ],
      names: [
        "Coastal Light Spa",
        "Warm Oak Spa",
        "Sculpted Stone Retreat",
        "Walnut + Stone Retreat",
      ],
      recommendations: [
        [complements("coastal-light"), complements("architectural-calm")],
        [complements("warm-natural"), complements("refined-west-coast")],
        [
          recommendedFor(
            "sculpted-natural-luxury",
            "Layered stone gives the bathroom the calm, tactile presence of a private retreat.",
          ),
        ],
        [complements("pacific-contrast")],
      ],
    }),
    standardCategory({
      id: "tile-surfaces",
      number: "09",
      title: "Tile & Surfaces",
      description:
        "Choose the applied surface direction for wet areas and selected feature zones throughout Solace.",
      filenames: [
        "solace_tile_surfaces_premium_01.png",
        "solace_tile_surfaces_premium_02.png",
        "solace_tile_surfaces_signature_01.png",
        "solace_tile_surfaces_signature_02.png",
      ],
      names: ["Warm Limestone", "Soft Stone", "Calacatta Vein", "Charcoal Stone"],
    }),
    standardCategory({
      id: "interior-wall-panels",
      number: "10",
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
      recommendations: [
        [complements("coastal-light"), complements("warm-natural")],
        [complements("architectural-calm"), complements("refined-west-coast")],
        [recommendedFor("sculpted-natural-luxury")],
        [complements("pacific-contrast")],
      ],
    }),
    standardCategory({
      id: "lighting",
      number: "11",
      title: "Lighting",
      description:
        "Choose the lighting atmosphere that supports everyday use and reinforces the selected visual direction.",
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
      recommendations: [
        [complements("coastal-light"), complements("architectural-calm")],
        [complements("warm-natural")],
        [complements("refined-west-coast")],
        [
          recommendedFor(
            "sculpted-natural-luxury",
            "A stronger lighting gesture adds drama while retaining a disciplined architectural rhythm.",
          ),
          complements("pacific-contrast"),
        ],
      ],
    }),
    standardCategory({
      id: "window-coverings",
      number: "12",
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
      number: "13",
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
      number: "14",
      title: "Flooring",
      shortTitle: "Flooring by Zone",
      description:
        "Build the flooring specification across three controlled zones so each part of Solace can respond to its use and interior character.",
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
          recommendations: [
            [complements("coastal-light"), complements("architectural-calm")],
            [complements("warm-natural"), complements("refined-west-coast")],
            [complements("pacific-contrast")],
            [
              recommendedFor(
                "sculpted-natural-luxury",
                "The stone-led floor adds a calmer monolithic base for sculptural interiors.",
              ),
            ],
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
          recommendations: [
            [complements("coastal-light"), complements("architectural-calm")],
            [complements("warm-natural"), complements("refined-west-coast")],
            [complements("sculpted-natural-luxury")],
            [complements("pacific-contrast")],
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
          recommendations: [
            [complements("coastal-light"), complements("warm-natural")],
            [complements("architectural-calm"), complements("refined-west-coast")],
            [recommendedFor("sculpted-natural-luxury")],
            [complements("pacific-contrast")],
          ],
        }),
      ],
    },
    {
      kind: "coordinated",
      id: "appliances",
      number: "15",
      title: "Appliances",
      shortTitle: "Appliances",
      description:
        "Appliance selection will be coordinated with the final kitchen plan, cabinetry and project requirements.",
      coordinatedMessage:
        "Supplier selection in progress / coordinated with project",
    },
  ],
  lookBookChapters: [
    {
      id: "kitchen",
      number: "01",
      title: "Kitchen",
      introduction:
        "The material and fixture decisions shaping the social heart of Solace.",
      items: [
        { categoryId: "kitchen-cabinetry" },
        { categoryId: "countertops" },
        { categoryId: "kitchen-bath-fixtures" },
        { categoryId: "appliances" },
      ],
    },
    {
      id: "living",
      number: "02",
      title: "Living Spaces",
      introduction:
        "The surfaces, light and privacy layers connecting the main living spaces.",
      items: [
        { categoryId: "flooring", zoneId: "flooring-main-living", label: "Main Living Flooring" },
        { categoryId: "interior-wall-panels" },
        { categoryId: "lighting" },
        { categoryId: "window-coverings" },
      ],
    },
    {
      id: "bedrooms",
      number: "03",
      title: "Bedrooms",
      introduction:
        "Private-room choices composed around calm, storage and tactile comfort.",
      items: [
        { categoryId: "wardrobes" },
        { categoryId: "flooring", zoneId: "flooring-bedrooms", label: "Bedroom Flooring" },
        { categoryId: "interior-doors" },
      ],
    },
    {
      id: "bathrooms",
      number: "04",
      title: "Bathrooms",
      introduction:
        "A coordinated bathroom language spanning atmosphere, fixtures and surfaces.",
      items: [
        { categoryId: "bathroom-systems" },
        { categoryId: "kitchen-bath-fixtures" },
        { categoryId: "tile-surfaces" },
        { categoryId: "flooring", zoneId: "flooring-wet-areas", label: "Wet-Area Flooring" },
      ],
    },
    {
      id: "exterior-envelope",
      number: "05",
      title: "Exterior / Envelope",
      introduction:
        "The controlled arrival and opening directions completing the architectural envelope.",
      items: [
        { categoryId: "exterior-entry-doors" },
        { categoryId: "windows-patio-doors" },
        { categoryId: "garage-door-operator" },
      ],
    },
  ],
};
