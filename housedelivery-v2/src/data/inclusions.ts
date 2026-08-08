export type PackageTier = "essential" | "premium" | "signature";

export type SelectionStatus = "Preliminary Selection" | "Technical Review";

export type InclusionCategoryId =
  | "flooring"
  | "kitchen-cabinetry"
  | "wardrobes"
  | "interior-doors"
  | "exterior-doors"
  | "windows-patio-doors"
  | "bathroom-systems"
  | "bathroom-vanities"
  | "plumbing-fixtures"
  | "tile-surfaces"
  | "countertops"
  | "wall-panels"
  | "lighting"
  | "appliances"
  | "window-coverings";

export type InclusionCategoryName =
  | "Flooring"
  | "Kitchen Cabinetry"
  | "Wardrobes"
  | "Interior Doors"
  | "Exterior Entry Doors"
  | "Windows & Patio Doors"
  | "Bathroom Systems"
  | "Bathroom Vanities"
  | "Plumbing Fixtures"
  | "Tile & Surfaces"
  | "Countertops"
  | "Interior Wall Panels"
  | "Lighting"
  | "Appliances"
  | "Roller Blinds / Window Coverings";

export type InclusionImage = {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
};

export type InclusionPackage = {
  id: PackageTier;
  number: string;
  name: "Essential" | "Premium" | "Signature";
  positioning: string;
  description: string;
};

export type InclusionProduct = {
  sku: `HD-${string}`;
  name: string;
  packageTier: PackageTier;
  category: InclusionCategoryName;
  customerDescription: string;
  specifications: readonly string[];
  selectionStatus: SelectionStatus;
  sampleRequired: boolean;
  technicalReviewRequired: boolean;
  projectSpecificApprovalRequired: boolean;
  availability: string;
  image?: InclusionImage;
  gallery?: readonly InclusionImage[];
};

export type InclusionCategory = {
  id: InclusionCategoryId;
  number: string;
  name: InclusionCategoryName;
  shortName: string;
  eyebrow: string;
  description: string;
  packageContext?: string;
  heroImage?: InclusionImage;
  products: readonly InclusionProduct[];
};

export const inclusionPackages: readonly InclusionPackage[] = [
  {
    id: "essential",
    number: "01",
    name: "Essential",
    positioning: "Coordinated baseline",
    description:
      "A durable, coordinated baseline designed for repeatability, responsible purchasing and straightforward project delivery.",
  },
  {
    id: "premium",
    number: "02",
    name: "Premium",
    positioning: "Controlled refinement",
    description:
      "Controlled upgrades in material, finish and detailing for projects seeking greater design refinement.",
  },
  {
    id: "signature",
    number: "03",
    name: "Signature",
    positioning: "Selective distinction",
    description:
      "Selective higher-touch materials and feature finishes for projects where distinction is an intentional priority.",
  },
];

const preliminarySelection: SelectionStatus = "Preliminary Selection";
const projectAvailability =
  "Final availability is subject to project confirmation.";

export const inclusionProducts: readonly InclusionProduct[] = [
  {
    sku: "HD-FLR-001",
    name: "High-Density Laminate Flooring",
    packageTier: "essential",
    category: "Flooring",
    customerDescription:
      "A durable, versatile flooring option built around a 12 mm composite core and printed decorative surface. Offered in strip and parquet formats, it provides a clean, repeatable finish suited to everyday interior applications.",
    specifications: [
      "Laminate flooring",
      "12 mm listed thickness",
      "Medium- or high-density fibreboard composite core",
      "Strip and parquet formats",
      "Printed decorative surface",
    ],
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
    gallery: [
      {
        src: "/images/inclusions/flooring/products/hd-flr-001-01.webp",
        alt: "Warm wood-look plank flooring in an open-plan living room and kitchen.",
      },
      {
        src: "/images/inclusions/flooring/products/hd-flr-001-02.webp",
        alt: "Pale wood-look plank flooring in a bright living room with a home workspace.",
      },
      {
        src: "/images/inclusions/flooring/products/hd-flr-001-03.webp",
        alt: "Natural wood-look plank flooring across a bedroom and adjoining sitting area.",
      },
    ],
  },
  {
    sku: "HD-FLR-003",
    name: "Comfort-Focused WPC Flooring",
    packageTier: "premium",
    category: "Flooring",
    customerDescription:
      "A softer-feel WPC flooring option combining a wood-plastic composite construction with a printed decorative surface. Strip and herringbone formats provide greater design flexibility while maintaining a warm, residential character.",
    specifications: [
      "Wood-plastic composite flooring",
      "10 / 12 mm listed thickness options",
      "Strip and herringbone formats",
      "Printed decorative surface",
      "Intended for interior residential applications",
    ],
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
    gallery: [
      {
        src: "/images/inclusions/flooring/products/hd-flr-003-01.webp",
        alt: "Warm wood-look plank flooring in a light living room with leather armchairs.",
      },
      {
        src: "/images/inclusions/flooring/products/hd-flr-003-02.webp",
        alt: "Medium-tone wood-look plank flooring in a dark-walled living and dining room.",
      },
    ],
  },
  {
    sku: "HD-FLR-005",
    name: "Solid Wood Flooring",
    packageTier: "signature",
    category: "Flooring",
    customerDescription:
      "A natural solid-wood flooring option with an 18 mm listed thickness and a finish intended to emphasize the character of the material. Strip, herringbone and chevron formats allow the flooring to become a more deliberate architectural feature.",
    specifications: [
      "Solid wood flooring",
      "18 mm listed thickness",
      "Strip, herringbone and chevron formats",
      "Painted finish",
      "Supplier-listed underfloor-heating compatibility; technical review required",
    ],
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
    gallery: [
      {
        src: "/images/inclusions/flooring/products/hd-flr-005-01.webp",
        alt: "Natural wood flooring beside a stone fireplace and wood coffee table.",
      },
      {
        src: "/images/inclusions/flooring/products/hd-flr-005-02.webp",
        alt: "Wide natural wood planks in a bright open kitchen and stair hall.",
      },
      {
        src: "/images/inclusions/flooring/products/hd-flr-005-03.webp",
        alt: "Rich wood plank flooring in a large white kitchen with a central island.",
      },
    ],
  },
];

const selectionsPending =
  "Controlled product selections will be introduced as category information is approved.";

export const inclusionCategories: readonly InclusionCategory[] = [
  {
    id: "flooring",
    number: "01",
    name: "Flooring",
    shortName: "Flooring",
    eyebrow: "Surface systems",
    description:
      "Three coordinated preliminary selections demonstrate how the package structure will work as the wider inclusions library is developed.",
    packageContext:
      "Essential, Premium and Signature selections are represented in this category.",
    heroImage: {
      src: "/images/inclusions/flooring/hero.webp",
      alt: "Light wide-plank wood flooring in a bright contemporary interior with an open-riser staircase.",
    },
    products: inclusionProducts,
  },
  {
    id: "kitchen-cabinetry",
    number: "02",
    name: "Kitchen Cabinetry",
    shortName: "Kitchen Cabinetry",
    eyebrow: "Kitchen systems",
    description:
      "Coordinated cabinetry systems designed to support repeatable layouts, durable finishes and controlled upgrade pathways across House Delivery projects.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/kitchen-cabinetry/hero.webp",
      alt: "Wood cabinetry in a bright kitchen with a central island.",
    },
    products: [],
  },
  {
    id: "wardrobes",
    number: "03",
    name: "Wardrobes",
    shortName: "Wardrobes",
    eyebrow: "Interior storage",
    description:
      "Wardrobe systems organized to support practical storage planning and a consistent interior finish language across House Delivery homes.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/wardrobes/hero.webp",
      alt: "Open fitted wardrobe with shelves, drawers and hanging rails.",
    },
    products: [],
  },
  {
    id: "interior-doors",
    number: "04",
    name: "Interior Doors",
    shortName: "Interior Doors",
    eyebrow: "Interior openings",
    description:
      "A coordinated range of interior door styles intended to align with flooring, cabinetry and the overall House Delivery finish language.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/interior-doors/hero.webp",
      alt: "Contemporary interior with black-framed glazed doors, clerestory windows and an open-riser staircase.",
    },
    products: [],
  },
  {
    id: "exterior-doors",
    number: "05",
    name: "Exterior Entry Doors",
    shortName: "Exterior Doors",
    eyebrow: "Arrival and entry",
    description:
      "Exterior entry door pathways organized around architectural coordination, project character and project-specific technical confirmation.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/exterior-doors/hero.webp",
      alt: "Open contemporary pivot entry door framed by glazing and light brickwork.",
    },
    products: [],
  },
  {
    id: "windows-patio-doors",
    number: "06",
    name: "Windows & Patio Doors",
    shortName: "Windows & Patio Doors",
    eyebrow: "Exterior openings",
    description:
      "Window and exterior opening systems selected for design coordination, daylight, performance review and project-specific technical confirmation.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/windows-patio-doors/hero.webp",
      alt: "Open glazed patio doors connecting a home to a timber deck.",
    },
    products: [],
  },
  {
    id: "bathroom-systems",
    number: "07",
    name: "Bathroom Systems",
    shortName: "Bathroom Systems",
    eyebrow: "Coordinated wet areas",
    description:
      "Coordinated bathroom components and finish packages designed to simplify product selection and project procurement.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/bathroom-systems/hero.webp",
      alt: "Bright bathroom with a glass shower, tub and double vanity.",
    },
    products: [],
  },
  {
    id: "bathroom-vanities",
    number: "08",
    name: "Bathroom Vanities",
    shortName: "Bathroom Vanities",
    eyebrow: "Vanity systems",
    description:
      "Vanity selections coordinated with bathroom layouts, storage priorities and the wider House Delivery finish language.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/bathroom-vanities/hero.webp",
      alt: "Wood bathroom vanity with a stone vessel sink, mirrored cabinet and dark wall-mounted faucet.",
    },
    products: [],
  },
  {
    id: "plumbing-fixtures",
    number: "09",
    name: "Plumbing Fixtures",
    shortName: "Plumbing Fixtures",
    eyebrow: "Fixture selections",
    description:
      "A controlled fixture selection pathway intended to coordinate bathrooms, kitchens and project-specific technical review.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/plumbing-fixtures/hero.webp",
      alt: "Close view of a sculptural dark faucet and basin.",
    },
    products: [],
  },
  {
    id: "tile-surfaces",
    number: "10",
    name: "Tile & Surfaces",
    shortName: "Tile & Surfaces",
    eyebrow: "Applied finishes",
    description:
      "Curated surface directions intended to coordinate wet areas, feature zones and durable finish transitions throughout the home.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/tile-surfaces/hero.webp",
      alt: "Stone-look wall surfaces surrounding a dark shower system.",
    },
    products: [],
  },
  {
    id: "countertops",
    number: "11",
    name: "Countertops",
    shortName: "Countertops",
    eyebrow: "Work surfaces",
    description:
      "Countertop selections organized to coordinate kitchen and vanity applications through a controlled finish pathway.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/countertops/hero.webp",
      alt: "Light stone kitchen countertops with a matching full-height backsplash.",
    },
    products: [],
  },
  {
    id: "wall-panels",
    number: "12",
    name: "Interior Wall Panels",
    shortName: "Wall Panels",
    eyebrow: "Interior surfaces",
    description:
      "Interior wall-panel directions developed for selected feature areas and coordinated with the broader material palette.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/wall-panels/hero.webp",
      alt: "Dark geometric wood wall panels behind a light sofa and built-in shelving.",
    },
    products: [],
  },
  {
    id: "lighting",
    number: "13",
    name: "Lighting",
    shortName: "Lighting",
    eyebrow: "Lighting systems",
    description:
      "Coordinated lighting pathways intended to support everyday use, architectural emphasis and a consistent interior atmosphere.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/lighting/hero.webp",
      alt: "Woven pendant lights in a bright contemporary living room.",
    },
    products: [],
  },
  {
    id: "appliances",
    number: "14",
    name: "Appliances",
    shortName: "Appliances",
    eyebrow: "Appliance packages",
    description:
      "Appliance packages organized for coordinated kitchen planning, project review and a clear selection process.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/appliances/hero.webp",
      alt: "Built-in stainless steel cooking appliances within wood cabinetry.",
    },
    products: [],
  },
  {
    id: "window-coverings",
    number: "15",
    name: "Roller Blinds / Window Coverings",
    shortName: "Window Coverings",
    eyebrow: "Interior shading",
    description:
      "Window-covering pathways intended to coordinate privacy, daylight control and the interior finish direction of each project.",
    packageContext: selectionsPending,
    heroImage: {
      src: "/images/inclusions/window-coverings/hero.webp",
      alt: "Light roller blind partially lowered over a dark-framed window.",
    },
    products: [],
  },
];

export function getInclusionPackage(tier: PackageTier): InclusionPackage {
  const inclusionPackage = inclusionPackages.find(
    (candidate) => candidate.id === tier,
  );

  if (!inclusionPackage) {
    throw new Error(`Unknown inclusion package: ${tier}`);
  }

  return inclusionPackage;
}
