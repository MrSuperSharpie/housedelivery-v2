import { inclusionCategories } from "@/data/inclusions";
import type {
  SolaceInclusionLevel,
  SolaceKitchenCabinetryId,
  SolaceKitchenCabinetryOption,
} from "@/data/solace-configuration";

type CabinetryOptionDefinition = {
  id: SolaceKitchenCabinetryId;
  level: SolaceInclusionLevel;
  sourceSku: `HD-${string}`;
  choiceName: string;
};

const curatedCabinetryDefinitions: readonly CabinetryOptionDefinition[] = [
  {
    id: "premium-sage-arch",
    level: "premium",
    sourceSku: "HD-KIT-003",
    choiceName: "Sage Arch",
  },
  {
    id: "premium-soft-ivory-classic",
    level: "premium",
    sourceSku: "HD-KIT-003",
    choiceName: "Soft Ivory Classic",
  },
  {
    id: "signature-luminous-oak-gallery",
    level: "signature",
    sourceSku: "HD-KIT-005",
    choiceName: "Luminous Oak Gallery",
  },
  {
    id: "signature-smoked-oak-atelier",
    level: "signature",
    sourceSku: "HD-KIT-005",
    choiceName: "Smoked Oak Atelier",
  },
];

export function getSolaceKitchenCabinetryOptions(): readonly SolaceKitchenCabinetryOption[] {
  const kitchenCategory = inclusionCategories.find(
    (category) => category.id === "kitchen-cabinetry",
  );

  if (!kitchenCategory) {
    throw new Error("Kitchen cabinetry inclusion data is unavailable.");
  }

  return curatedCabinetryDefinitions.map((definition) => {
    const product = kitchenCategory.products.find(
      (candidate) => candidate.sku === definition.sourceSku,
    );
    const choice = product?.choices?.find(
      (candidate) => candidate.name === definition.choiceName,
    );

    if (!product || !choice || product.packageTier !== definition.level) {
      throw new Error(
        `Invalid Solace cabinetry option mapping: ${definition.id}`,
      );
    }

    return {
      id: definition.id,
      level: definition.level,
      name: choice.name,
      customerDescription: choice.customerDescription,
      primaryImage: choice.image,
      sourceSku: product.sku,
      selectionStatus: product.selectionStatus,
      availability: product.availability,
    };
  });
}
