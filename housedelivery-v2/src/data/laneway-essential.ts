import { carriageHomes, type CarriageHomeImage } from "@/data/carriage-homes";

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

const assetRoot = "/images/carriage-homes/willow-nook/essential";
const willowNook = carriageHomes.find((home) => home.slug === "willow-nook");

if (!willowNook) {
  throw new Error("The Willow Nook carriage-home record is required.");
}

const floorPlanImage = willowNook.images.find(
  (image) => image.fit === "contain" && image.label.toLowerCase().includes("floor plan"),
);

if (!floorPlanImage) {
  throw new Error("The Willow Nook reference floor plan is required.");
}

export const willowNookEssential: LanewayEssentialDefinition = {
  homeSlug: willowNook.slug,
  homeName: willowNook.name,
  residenceLabel: "Laneway Essential residence",
  packageLabel: "Essential",
  areaLabel: "Approximately 40.2 m² / One bedroom",
  homeDescription: willowNook.description,
  exteriorImage: willowNook.images[0],
  arrivalImage: willowNook.images[1],
  floorPlanImage,
  referencePlanNotice:
    "The plan shown is a reference design. Property fit, zoning, setbacks, servicing, access, structure, engineering, code compliance, permits, pricing, and final specifications require project-specific review and may change.",
  propertyReviewSteps: [
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
  ],
  looks: [
    {
      id: "light-natural",
      name: "Light & Natural",
      description:
        "A bright, quietly tactile interior shaped by pale oak, soft mineral tones, and generous natural light.",
      character: ["Airy", "Tactile", "Quietly warm"],
      palette: ["#efe9dd", "#c9ac84", "#907356", "#f7f4ec"],
      images: {
        kitchenLiving: {
          src: `${assetRoot}/willow_nook_essential_light_natural_kitchen_living.png`,
          alt: "Willow Nook Light and Natural kitchen and living interior",
          label: "Kitchen + living",
        },
        bedroomStorage: {
          src: `${assetRoot}/willow_nook_essential_light_natural_bedroom_storage.png`,
          alt: "Willow Nook Light and Natural bedroom with integrated storage",
          label: "Bedroom + storage",
        },
        bathroom: {
          src: `${assetRoot}/willow_nook_essential_light_natural_bathroom.png`,
          alt: "Willow Nook Light and Natural bathroom",
          label: "Bathroom",
        },
      },
    },
    {
      id: "warm-modern",
      name: "Warm & Modern",
      description:
        "A richer, evening-ready composition with warm timber, deeper fixtures, and softly layered lighting.",
      character: ["Grounded", "Warm", "Contemporary"],
      palette: ["#d9c2a2", "#986c43", "#514135", "#171718"],
      images: {
        kitchenLiving: {
          src: `${assetRoot}/willow_nook_essential_warm_modern_kitchen_living.png`,
          alt: "Willow Nook Warm and Modern kitchen and living interior",
          label: "Kitchen + living",
        },
        bedroomStorage: {
          src: `${assetRoot}/willow_nook_essential_warm_modern_bedroom_storage.png`,
          alt: "Willow Nook Warm and Modern bedroom with integrated storage",
          label: "Bedroom + storage",
        },
        bathroom: {
          src: `${assetRoot}/willow_nook_essential_warm_modern_bathroom.png`,
          alt: "Willow Nook Warm and Modern bathroom",
          label: "Bathroom",
        },
      },
    },
    {
      id: "calm-contrast",
      name: "Calm Contrast",
      description:
        "A composed light-and-dark direction balancing pale oak with charcoal accents and muted stone.",
      character: ["Composed", "Graphic", "Calm"],
      palette: ["#e5ded0", "#af9271", "#666158", "#252524"],
      images: {
        kitchenLiving: {
          src: `${assetRoot}/willow_nook_essential_calm_contrast_kitchen_living.png`,
          alt: "Willow Nook Calm Contrast kitchen and living interior",
          label: "Kitchen + living",
        },
        bedroomStorage: {
          src: `${assetRoot}/willow_nook_essential_calm_contrast_bedroom_storage.png`,
          alt: "Willow Nook Calm Contrast bedroom with integrated storage",
          label: "Bedroom + storage",
        },
        bathroom: {
          src: `${assetRoot}/willow_nook_essential_calm_contrast_bathroom.png`,
          alt: "Willow Nook Calm Contrast bathroom",
          label: "Bathroom",
        },
      },
    },
  ],
};

export function getLanewayEssentialDefinition(homeSlug: string) {
  return homeSlug === willowNookEssential.homeSlug
    ? willowNookEssential
    : undefined;
}
