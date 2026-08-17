import {
  carriageHomes,
  type CarriageHome,
  type CarriageHomeImage,
} from "@/data/carriage-homes";

export type LanewayEssentialImage = {
  src: string;
  alt: string;
  label: string;
};

export type LanewayEssentialLook = {
  id: string;
  name: string;
  description: string;
  character: readonly string[];
  palette: readonly string[];
  images: {
    kitchenLiving: LanewayEssentialImage;
    bedroomStorage: LanewayEssentialImage;
    bathroom: LanewayEssentialImage;
  };
};

export type LanewayEssentialDefinition = {
  homeSlug: string;
  homeName: string;
  homeStatement: string;
  residenceLabel: string;
  packageLabel: "Essential";
  areaLabel: string;
  homeDescription: string;
  exteriorImage: CarriageHomeImage;
  arrivalImage: CarriageHomeImage;
  floorPlanImage: CarriageHomeImage;
  looks: readonly LanewayEssentialLook[];
  referencePlanNotice: string;
  propertyReviewSteps: readonly {
    title: string;
    description: string;
  }[];
};

const lookDirections = [
  {
    id: "light-natural",
    name: "Light & Natural",
    description:
      "A bright, quietly tactile interior shaped by pale oak, soft mineral tones, and generous natural light.",
    character: ["Airy", "Tactile", "Quietly warm"],
    palette: ["#efe9dd", "#c9ac84", "#907356", "#f7f4ec"],
  },
  {
    id: "warm-modern",
    name: "Warm & Modern",
    description:
      "A richer, evening-ready composition with warm timber, deeper fixtures, and softly layered lighting.",
    character: ["Grounded", "Warm", "Contemporary"],
    palette: ["#d9c2a2", "#986c43", "#514135", "#171718"],
  },
  {
    id: "calm-contrast",
    name: "Calm Contrast",
    description:
      "A composed light-and-dark direction balancing pale oak with charcoal accents and muted stone.",
    character: ["Composed", "Graphic", "Calm"],
    palette: ["#e5ded0", "#af9271", "#666158", "#252524"],
  },
] as const;

const referencePlanNotice =
  "The plan shown is a reference design. Property fit, zoning, setbacks, servicing, access, structure, engineering, code compliance, permits, pricing, and final specifications require project-specific review and may change.";

const propertyReviewSteps = [
  {
    title: "Property context",
    description:
      "We begin with the municipality, approximate location, intended use, and timing for your project.",
  },
  {
    title: "Preliminary fit review",
    description:
      "House Delivery reviews the reference design against the initial property information you provide.",
  },
  {
    title: "Project pathway",
    description:
      "If the early fit is promising, we outline the next project-specific studies, decisions, and professional work required.",
  },
] as const;

function requireCarriageHome(homeSlug: string) {
  const home = carriageHomes.find((candidate) => candidate.slug === homeSlug);

  if (!home) {
    throw new Error(`The ${homeSlug} carriage-home record is required.`);
  }

  return home;
}

function requireFloorPlan(home: CarriageHome) {
  const floorPlan = home.images.find(
    (image) =>
      image.fit === "contain" &&
      image.label.toLowerCase().includes("floor plan"),
  );

  if (!floorPlan) {
    throw new Error(`The ${home.name} reference floor plan is required.`);
  }

  return floorPlan;
}

function createEssentialLooks(
  home: CarriageHome,
  imageExtension: "png" | "webp",
): readonly LanewayEssentialLook[] {
  const assetRoot = `/images/carriage-homes/${home.slug}/essential`;
  const fileStem = home.slug.replaceAll("-", "_");

  return lookDirections.map((look) => {
    const lookStem = look.id.replaceAll("-", "_");

    return {
      ...look,
      images: {
        kitchenLiving: {
          src: `${assetRoot}/${fileStem}_essential_${lookStem}_kitchen_living.${imageExtension}`,
          alt: `${home.name} ${look.name} kitchen and living interior`,
          label: "Kitchen + living",
        },
        bedroomStorage: {
          src: `${assetRoot}/${fileStem}_essential_${lookStem}_bedroom_storage.${imageExtension}`,
          alt: `${home.name} ${look.name} bedroom with integrated storage`,
          label: "Bedroom + storage",
        },
        bathroom: {
          src: `${assetRoot}/${fileStem}_essential_${lookStem}_bathroom.${imageExtension}`,
          alt: `${home.name} ${look.name} bathroom`,
          label: "Bathroom",
        },
      },
    };
  });
}

function createEssentialDefinition(
  home: CarriageHome,
  areaLabel: string,
  imageExtension: "png" | "webp" = "png",
): LanewayEssentialDefinition {
  return {
    homeSlug: home.slug,
    homeName: home.name,
    homeStatement: home.heroStatement,
    residenceLabel: "Laneway Essential residence",
    packageLabel: "Essential",
    areaLabel,
    homeDescription: home.description,
    exteriorImage: home.images[0],
    arrivalImage: home.images[1],
    floorPlanImage: requireFloorPlan(home),
    looks: createEssentialLooks(home, imageExtension),
    referencePlanNotice,
    propertyReviewSteps,
  };
}

export const willowNookEssential = createEssentialDefinition(
  requireCarriageHome("willow-nook"),
  "Approximately 40.2 m² / One bedroom",
);

export const lanternHouseEssential = createEssentialDefinition(
  requireCarriageHome("lantern-house"),
  "Reference plan / Two bedrooms / One central bathroom",
  "webp",
);

const lanewayEssentialDefinitions = new Map(
  [willowNookEssential, lanternHouseEssential].map((definition) => [
    definition.homeSlug,
    definition,
  ]),
);

export function getLanewayEssentialDefinition(homeSlug: string) {
  return lanewayEssentialDefinitions.get(homeSlug);
}
