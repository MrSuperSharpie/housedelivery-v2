import type {
  HomeConfiguratorDefinition,
  HomeInclusionOption,
  HomeRoomLookCategory,
} from "@/data/home-configurator";
import type { LookBookSection } from "@/data/home-look-book";

const chapterId = "windows-patio-doors";
const imageRoot = "/images/lookbook/windows-patio-doors/boards";

// Supplier models and photos below are taken from catalogs supplied by House
// Delivery. Glazing values are catalog configurations, not blanket promises
// of Canadian certification for every size or installation.
export const windowsPatioDoorDirections = [
  { level: "premium", number: "1", name: "Coastal Casement + Classic Slider", window: "DERCHI WY-100 casement window", door: "DERCHI WT-135D two- or three-track sliding door", mood: "a quiet, familiar opening rhythm", windowModel: "DERCHI WY-100", doorModel: "DERCHI WT-135D", glazing: "Window: 5+27A+5; door: 5+20A+5", hardware: "WEHAG window handle; HOPPE door hook lock", source: "DERCHI pp. 019–020, 037–038", heroAsset: "derchi-wt135d-hero", windowAsset: "derchi-wy100-section", doorAsset: "derchi-wt135d-section", operationAsset: "derchi-wt135d-opening", hardwareAsset: "derchi-wt135d-section" },
  { level: "premium", number: "2", name: "Tilt-Turn + View Slider", window: "AMJ 88T tilt-and-turn window", door: "AMJ 155T sliding door", mood: "clean sightlines and flexible ventilation", windowModel: "AMJ 88T", doorModel: "AMJ 155T", glazing: "155T door: 5 Low-E+15 argon+5", hardware: "G-U standard door hardware; AMJ 3-point lock", source: "AMJ PDF pp. 8, 20", heroAsset: "amj-155t-hero", windowAsset: "amj-88t-section", doorAsset: "amj-155t-section", operationAsset: "amj-155t-operation", hardwareAsset: "amj-155t-lock" },
  { level: "premium", number: "3", name: "Casement + Folding Patio", window: "DERCHI WY-104 casement window", door: "DERCHI WZ-80 folding door", mood: "a generous opening to the terrace", windowModel: "DERCHI WY-104", doorModel: "DERCHI WZ-80", glazing: "Window: 5+27A+5; door: 5+20A+5", hardware: "WEHAG window; CMECH folding-door handle and hinge", source: "DERCHI pp. 019–020, 047–048", heroAsset: "derchi-wz80-hero", windowAsset: "derchi-wy104-section", doorAsset: "derchi-wz80-section", operationAsset: "derchi-wz80-opening", hardwareAsset: "derchi-wz80-section" },
  { level: "premium", number: "4", name: "Tilt-Turn + Lift-and-Slide", window: "LEDOW C75 tilt-and-turn window", door: "LEDOW G152 lift-and-slide door", mood: "a calm, wide indoor–outdoor connection", windowModel: "LEDOW C75", doorModel: "LEDOW G152", glazing: "Glazing build-up: confirm selected configuration", hardware: "G152 catalog: Siegenia hardware", source: "LEDOW pp. 14, 21–22", heroAsset: "ledow-g152-hero", windowAsset: "ledow-c75-section", doorAsset: "ledow-g152-section", operationAsset: "ledow-g152-section", hardwareAsset: "ledow-g152-section" },
  { level: "signature", number: "1", name: "Architectural Glass + Slimline Slider", window: "AMJ 88T tilt-and-turn window", door: "AMJ 154T ultra-narrow sliding door", mood: "an uninterrupted panoramic outlook", windowModel: "AMJ 88T", doorModel: "AMJ 154T", glazing: "154T optional triple: 6+12 argon+6+12 argon+6", hardware: "154T: BOGO standard; MOORE optional", source: "AMJ PDF pp. 8, 19", heroAsset: "amj-154t-hero", windowAsset: "amj-88t-section", doorAsset: "amj-154t-section", operationAsset: "amj-154t-operation", hardwareAsset: "amj-154t-section" },
  { level: "signature", number: "2", name: "Passive Window + Grand Lift-and-Slide", window: "LEDOW G91 passive-house window", door: "LEDOW G185 three-track lift-and-slide door", mood: "an expansive opening with refined operation", windowModel: "LEDOW G91", doorModel: "LEDOW G185", glazing: "G91 shown with three glass panes", hardware: "G91: Siegenia; G185: Siegenia / Sobinco", source: "LEDOW pp. 23–24, 33", heroAsset: "ledow-g185-hero", windowAsset: "ledow-g91-section", doorAsset: "ledow-g185-section", operationAsset: "ledow-g185-section", hardwareAsset: "ledow-g185-section" },
  { level: "signature", number: "3", name: "Tilt-Turn + Folding Glass Wall", window: "AMJ 88T tilt-and-turn window", door: "AMJ 80T bi-fold door", mood: "a nearly full-width connection to outdoor living", windowModel: "AMJ 88T", doorModel: "AMJ 80T", glazing: "80T door: 5 Low-E+15 argon+5", hardware: "80T: Kerssenberg standard fold hardware", source: "AMJ PDF pp. 8, 22", heroAsset: "amj-80t-hero", windowAsset: "amj-88t-section", doorAsset: "amj-80t-section", operationAsset: "amj-80t-operation", hardwareAsset: "amj-80t-fold-control" },
  { level: "signature", number: "4", name: "Passive Window + Narrow-Stile Lift-and-Slide", window: "LEDOW G91 passive-house window", door: "LEDOW G120 narrow-stile lift-and-slide door", mood: "a broad view with a narrow frame profile", windowModel: "LEDOW G91", doorModel: "LEDOW G120", glazing: "G91 shown with three glass panes", hardware: "G91: Siegenia; G120: Siegenia / Sobinco", source: "LEDOW pp. 27–28, 33", heroAsset: "ledow-g120-hero", windowAsset: "ledow-g91-section", doorAsset: "ledow-g120-section", operationAsset: "ledow-g120-section", hardwareAsset: "ledow-g120-section" },
] as const;

function makeOption(
  definition: HomeConfiguratorDefinition,
  direction: (typeof windowsPatioDoorDirections)[number],
): HomeInclusionOption {
  const shared = definition.homeId === "salt-spring";
  return {
    id: `${chapterId}-${direction.level}-${direction.number}`,
    level: direction.level,
    optionNumber: direction.number,
    name: direction.name,
    ...(shared ? { shared: true } : {}),
    description: `A coordinated ${definition.residenceLabel} direction referencing the ${direction.window} and ${direction.door}, creating ${direction.mood}. Supplier model imagery and catalog configurations are shown; final glazing, frame colour, dimensions and performance are confirmed for the project.`,
    editorial: {
      descriptors: ["West Coast", "Daylight", direction.level === "signature" ? "Expansive" : "Refined"],
      storyFragments: [direction.window, direction.door, direction.mood],
      materialRole: "Windows and indoor–outdoor glazing",
    },
    image: {
      src: `${imageRoot}/${definition.homeId}-${direction.level}-${direction.number}.webp`,
      alt: `${definition.residenceLabel}: ${direction.level} ${direction.number} ${direction.name.toLowerCase()} windows and patio doors design board.`,
      fit: "contain",
      role: "design-board",
      quality: 100,
    },
  };
}

function makeCategory(definition: HomeConfiguratorDefinition): HomeRoomLookCategory {
  const shared = definition.homeId === "salt-spring";
  return {
    kind: "room-look",
    id: chapterId,
    number: "08",
    ...(shared ? { residence: "shared" as const } : {}),
    title: "Windows & Patio Doors",
    shortTitle: "Windows & Patio Doors",
    description: shared
      ? "Choose one coordinated window and glass-patio-door direction for the entire duplex. Residence A and Residence B may select their interior finishes independently; this building-envelope selection applies to both."
      : `Choose the window and glass-patio-door direction for ${definition.residenceLabel}, using named supplier systems for sliding, folding and lift-and-slide openings.`,
    represents: [
      "Window style and operability",
      "Glazing configuration by named model",
      "Patio-door operating system",
      "Frame profile and exterior colour coordination",
      "Glass, hardware and threshold direction",
    ],
    technicalNote: "These boards reproduce imagery and example glazing from named supplier catalog models. Catalog data is not a guarantee of Canadian compliance for every size or configuration. The final project schedule verifies applicable NAFS/CSA A440S1 classification and whole-unit thermal data, local wind and rain exposure, safety glazing, egress, accessibility, condensation, flashing, drainage and installation. Exterior pocketing is omitted until a documented weather-rated supplier system is selected.",
    options: windowsPatioDoorDirections.map((direction) => makeOption(definition, direction)),
  };
}

function makeSection(definition: HomeConfiguratorDefinition): LookBookSection {
  return {
    id: chapterId,
    number: "08",
    title: "Windows & Patio Doors",
    introduction: definition.homeId === "salt-spring"
      ? "A single coordinated glazing and patio-door expression for Residence A and B, with interior tiers selected independently."
      : `A West Coast window and indoor–outdoor living direction selected for ${definition.residenceLabel}, with frame colour coordinated to its exterior design.`,
    kind: "selection-story",
    layout: "cinematic-hero",
    items: [{ categoryId: chapterId, presentation: "hero" }],
  };
}

export function addWindowsAndPatioDoorsLookBook(definition: HomeConfiguratorDefinition) {
  if (definition.categories.some((category) => category.id === chapterId)) return definition;
  // Keep the exported home definition identity stable: other modules and
  // previously saved configuration references use these same objects.
  const mutable = definition as {
    categories: HomeConfiguratorDefinition["categories"];
    lookBook: HomeConfiguratorDefinition["lookBook"];
  };
  mutable.categories = [...definition.categories, makeCategory(definition)];
  mutable.lookBook = {
    ...definition.lookBook,
    sections: [...definition.lookBook.sections, makeSection(definition)],
    nextStageSteps: definition.lookBook.nextStageSteps.map((step) => ({
      ...step,
      description: step.description
        .replace("the seven selected packages", "the eight selected packages")
        .replace("one shared exterior", "one shared exterior and glazing selection"),
    })),
  };
  return definition;
}
