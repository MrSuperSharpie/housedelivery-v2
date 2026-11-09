import type { InclusionCategoryId } from "@/data/inclusions";

export type CoastalLightImage = {
  src: string;
  alt: string;
};

export type CoastalLightGroup = {
  id: string;
  number: string;
  name: string;
  introduction: string;
  image: CoastalLightImage;
  designIntent: readonly string[];
  categoryIds: readonly InclusionCategoryId[];
};

export const coastalLightCollection = {
  id: "coastal-light",
  homeName: "Solace",
  number: "01",
  name: "Coastal Light",
  introduction:
    "A bright, composed visual direction shaped by pale oak, warm whites, soft ivory stone and quiet West Coast character.",
  coordinationStatement:
    "Coastal Light establishes a shared material language for Solace. Cabinetry, stone, bathrooms, doors, lighting and storage are still selected category by category, allowing Premium included choices and controlled Signature upgrades to work within the same direction.",
  heroImage: {
    src: "/images/solace/design-collections/premium-coastal-light.png",
    alt: "Coastal Light kitchen and living space with pale oak cabinetry, warm white stone and coastal views",
  },
  palette: [
    "Pale oak",
    "Warm white",
    "Soft ivory stone",
    "Light greige",
    "Restrained matte black",
  ],
  groups: [
    {
      id: "kitchen-millwork",
      number: "01",
      name: "Kitchen + Millwork",
      introduction:
        "Pale-oak millwork and warm-white surfaces establish the visual centre of the home. Dark accents are used sparingly to give the composition definition without interrupting its calm.",
      image: {
        src: "/images/solace/design-collections/premium-coastal-light.png",
        alt: "Coastal Light kitchen with pale oak millwork, an ivory stone island and restrained dark fixtures",
      },
      designIntent: [
        "Pale-oak cabinetry direction",
        "Soft-vein ivory work surfaces",
        "Restrained dark fixture accents",
        "Integrated appliance planning",
      ],
      categoryIds: [
        "kitchen-cabinetry",
        "countertops",
        "kitchen-bath-fixtures",
        "appliances",
      ],
    },
    {
      id: "bathrooms",
      number: "02",
      name: "Bathrooms",
      introduction:
        "The primary bathroom carries the same pale oak and ivory stone into a quieter, spa-like setting. Fine neutral tile and clear glazing keep the room bright and architecturally simple.",
      image: {
        src: "/images/solace/coastal-light/primary-bathroom.webp",
        alt: "Illustrative Coastal Light primary bathroom with a pale oak vanity, ivory stone and a coastal outlook",
      },
      designIntent: [
        "Pale-oak vanity direction",
        "Soft ivory vanity surfaces",
        "Fine neutral wet-area tile",
        "Clear glazing and dark accents",
      ],
      categoryIds: [
        "bathroom-vanities",
        "kitchen-bath-fixtures",
        "tile-surfaces",
        "countertops",
      ],
    },
    {
      id: "floors-walls",
      number: "03",
      name: "Floors + Walls",
      introduction:
        "Pale wide-plank flooring gives the open spaces a consistent foundation. Ivory stone, light-greige wall finishes and selective oak detailing add depth without creating visual noise.",
      image: {
        src: "/images/solace/coastal-light/floors-walls.webp",
        alt: "Illustrative Coastal Light living area with pale flooring, an ivory stone fireplace and pale oak detailing",
      },
      designIntent: [
        "Pale wide-plank floor character",
        "Light-greige wall direction",
        "Ivory stone feature surfaces",
        "Selective pale-oak panel detail",
      ],
      categoryIds: ["flooring", "wall-panels", "tile-surfaces"],
    },
    {
      id: "doors-windows",
      number: "04",
      name: "Doors + Windows",
      introduction:
        "A pale-oak arrival, flush interior doors and slim dark-framed glazing extend the collection from the first impression through every transition in the home.",
      image: {
        src: "/images/solace/coastal-light/doors-windows.webp",
        alt: "Illustrative Coastal Light entry with pale oak doors, slim dark-framed glazing and a coastal view",
      },
      designIntent: [
        "Pale-oak entry expression",
        "Quiet flush interior doors",
        "Slim dark-framed glazing",
        "Coordinated exterior opening finishes",
      ],
      categoryIds: [
        "interior-doors",
        "exterior-doors",
        "windows-patio-doors",
        "garage-doors-operators",
      ],
    },
    {
      id: "storage-details",
      number: "05",
      name: "Storage + Details",
      introduction:
        "Full-height storage is treated as part of the architecture. Soft integrated light, warm-white fronts and quiet window coverings complete the home without adding unnecessary decoration.",
      image: {
        src: "/images/solace/coastal-light/storage-details.webp",
        alt: "Illustrative Coastal Light bedroom with pale oak wardrobes, integrated lighting and light-filtering shades",
      },
      designIntent: [
        "Pale-oak and warm-white storage",
        "Selective integrated lighting",
        "Soft light-filtering shades",
        "Minimal dark hardware",
      ],
      categoryIds: ["wardrobes", "lighting", "window-coverings"],
    },
  ] satisfies readonly CoastalLightGroup[],
} as const;
