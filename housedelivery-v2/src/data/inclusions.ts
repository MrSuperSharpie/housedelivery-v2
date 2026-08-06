export type PackageTier = "essential" | "premium" | "signature";

export type SelectionStatus = "Preliminary Selection";

export type InclusionCategory = "Flooring";

export type InclusionPackage = {
  id: PackageTier;
  number: string;
  name: "Essential" | "Premium" | "Signature";
  positioning: string;
  description: string;
};

export type InclusionProduct = {
  sku: `HD-FLR-${string}`;
  name: string;
  packageTier: PackageTier;
  category: InclusionCategory;
  customerDescription: string;
  specifications: readonly string[];
  selectionStatus: SelectionStatus;
  sampleRequired: true;
  technicalReviewRequired: true;
  projectSpecificApprovalRequired: true;
  availability: string;
  image?: {
    src: string;
    alt: string;
  };
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
    name: "Light Neutral Oak SPC",
    packageTier: "essential",
    category: "Flooring",
    customerDescription:
      "A restrained light-oak floor intended to brighten compact and open-plan homes while maintaining a warm, natural appearance.",
    specifications: [
      "SPC flooring",
      "4.0 mm listed product thickness",
      "1220 × 180 mm listed plank dimensions",
    ],
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
  },
  {
    sku: "HD-FLR-003",
    name: "Long-Plank Pale Oak Engineered Wood",
    packageTier: "premium",
    category: "Flooring",
    customerDescription:
      "A long-plank engineered floor with calm grain and a pale natural character suited to contemporary West Coast interiors.",
    specifications: [
      "Engineered wood",
      "Full birch core",
      "AB-grade veneer",
      "2420 × 192 × 14 mm listed dimensions",
    ],
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
  },
  {
    sku: "HD-FLR-005",
    name: "Warm Pale Herringbone Engineered Wood",
    packageTier: "signature",
    category: "Flooring",
    customerDescription:
      "A controlled feature flooring option intended for selected entries, living areas or other spaces where added pattern and material character are appropriate.",
    specifications: [
      "Engineered wood",
      "Full birch core",
      "AB-grade veneer",
      "600 × 125 × 14 mm listed dimensions",
      "Herringbone format",
    ],
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
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
