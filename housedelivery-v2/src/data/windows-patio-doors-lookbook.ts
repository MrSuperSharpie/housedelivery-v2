import type {
  HomeConfiguratorDefinition,
  HomeInclusionOption,
  HomeRoomLookCategory,
} from "@/data/home-configurator";
import type { LookBookSection } from "@/data/home-look-book";

const chapterId = "windows-patio-doors";
const imageRoot = "/images/lookbook/windows-patio-doors/boards";

// These are architectural directions, not claims that every illustrated
// assembly has identical test results. The project schedule names the final
// product, glazing and site-specific performance after technical review.
export const windowsPatioDoorDirections = [
  { level: "premium", number: "1", name: "Coastal Casement + Classic Slider", image: "premium-classic-slider.webp", window: "double-glazed casement and fixed-view windows", windowLabel: "Casement + Fixed", door: "a thermally broken two-panel sliding patio door", doorLabel: "Two-Panel Slider", operationLabel: "Sliding", mood: "a quiet, familiar opening rhythm" },
  { level: "premium", number: "2", name: "Tilt-Turn + View Slider", image: "premium-view-slider.webp", window: "double-glazed tilt-turn and fixed-view windows", windowLabel: "Tilt-Turn + Fixed", door: "a thermally broken wide-view sliding patio door", doorLabel: "Wide View Slider", operationLabel: "Sliding", mood: "clean sightlines and flexible ventilation" },
  { level: "premium", number: "3", name: "Picture Window + Folding Patio", image: "premium-folding.webp", window: "double-glazed picture windows with coordinated operable vents", windowLabel: "Picture + Operable", door: "a thermally broken folding glass patio wall", doorLabel: "Folding Patio Wall", operationLabel: "Folding", mood: "a generous opening to the terrace" },
  { level: "premium", number: "4", name: "Awning + Lift-and-Slide", image: "premium-lift-slide.webp", window: "double-glazed awning and fixed-view windows", windowLabel: "Awning + Fixed", door: "a thermally broken lift-and-slide patio door", doorLabel: "Lift-and-Slide", operationLabel: "Lift + Slide", mood: "a calm, wide indoor–outdoor connection" },
  { level: "signature", number: "1", name: "Panoramic Glass + Lift-Slide", image: "signature-panoramic.webp", window: "large triple-glazed picture windows with discreet operable units", windowLabel: "Panoramic + Operable", door: "a thermally broken large-format lift-and-slide patio wall", doorLabel: "Large Lift-Slide", operationLabel: "Lift + Slide", mood: "an uninterrupted panoramic outlook" },
  { level: "signature", number: "2", name: "Architectural Glass + Grand Lift-and-Slide", image: "signature-grand-slider.webp", window: "triple-glazed architectural window groupings", windowLabel: "Architectural Grouping", door: "a multi-panel grand lift-and-slide patio wall", doorLabel: "Grand Lift-and-Slide", operationLabel: "Multi-Panel Slide", mood: "an expansive opening with refined operation" },
  { level: "signature", number: "3", name: "Gallery Glazing + Folding Glass Wall", image: "signature-folding.webp", window: "triple-glazed picture and tilt-turn windows", windowLabel: "Picture + Tilt-Turn", door: "a thermally broken folding glass wall", doorLabel: "Folding Glass Wall", operationLabel: "Multi-Panel Folding", mood: "a nearly full-width connection to outdoor living" },
  { level: "signature", number: "4", name: "Framed Views + Pocketing Glass Wall", image: "signature-pocketing-concept.webp", window: "triple-glazed fixed and operable windows", windowLabel: "Fixed + Operable", door: "an exterior-rated pocketing glass wall designed into the building envelope", doorLabel: "Pocketing Glass Wall", operationLabel: "Concealed Pocket", mood: "an open-air room with the glazing concealed when open" },
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
    description: `A coordinated ${definition.residenceLabel} direction with ${direction.window} and ${direction.door}, creating ${direction.mood}. Frame colour is coordinated with the selected exterior finish. Representative visualization; final system, glazing and dimensions are confirmed for the project.`,
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
      : `Choose the window and glass-patio-door direction for ${definition.residenceLabel}, from high-performance operable windows to sliding, folding and pocketing indoor–outdoor openings.`,
    represents: [
      "Window style and operability",
      "Double-glazed Premium or triple-glazed Signature window direction",
      "Patio-door operating system",
      "Frame profile and exterior colour coordination",
      "Glass, hardware and threshold direction",
    ],
    technicalNote: "The final Canadian assembly is specified for its site: applicable NAFS/CSA A440S1 classification and whole-unit thermal data, local wind and driving-rain exposure, safety glazing, egress and fall protection, accessibility, condensation control, flashing, drainage and installation. Product dimensions, configurations and a weather-rated pocketing system require project-specific coordination. Images illustrate design intent; supplier test reports apply only to the models and sizes they identify.",
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
