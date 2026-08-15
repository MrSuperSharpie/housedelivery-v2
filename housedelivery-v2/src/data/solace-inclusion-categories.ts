import {
  inclusionCategories,
  type InclusionCategoryId,
  type InclusionImage,
  type InclusionProduct,
} from "@/data/inclusions";
import type {
  SolaceInclusionCategory,
  SolaceInclusionCategoryId,
  SolaceInclusionLevel,
  SolaceInclusionOption,
} from "@/data/solace-configuration";
import { getSolaceKitchenCabinetryOptions } from "@/data/solace-kitchen-cabinetry";

type SelectableCategoryDefinition = {
  id: SolaceInclusionCategoryId;
  sourceCategoryId: InclusionCategoryId;
  title?: string;
  shortTitle?: string;
  description?: string;
  premiumSku: `HD-${string}`;
  signatureSku: `HD-${string}`;
};

const selectableCategoryDefinitions: readonly SelectableCategoryDefinition[] = [
  {
    id: "countertops",
    sourceCategoryId: "countertops",
    premiumSku: "HD-CTR-003",
    signatureSku: "HD-CTR-005",
  },
  {
    id: "wardrobes",
    sourceCategoryId: "wardrobes",
    premiumSku: "HD-WRD-003",
    signatureSku: "HD-WRD-005",
  },
  {
    id: "interior-doors",
    sourceCategoryId: "interior-doors",
    premiumSku: "HD-IDR-003",
    signatureSku: "HD-IDR-005",
  },
  {
    id: "windows-patio-doors",
    sourceCategoryId: "windows-patio-doors",
    premiumSku: "HD-WIN-003",
    signatureSku: "HD-WIN-005",
  },
  {
    id: "kitchen-bath-fixtures",
    sourceCategoryId: "kitchen-bath-fixtures",
    premiumSku: "HD-PLM-003",
    signatureSku: "HD-PLM-005",
  },
  {
    id: "bathroom-systems",
    sourceCategoryId: "bathroom-vanities",
    title: "Bathroom Systems",
    shortTitle: "Bathroom Systems",
    description:
      "Choose the vanity-led bathroom system direction. Kitchen and bath fixtures remain a separate, independently controlled category.",
    premiumSku: "HD-VAN-003",
    signatureSku: "HD-VAN-005",
  },
  {
    id: "tile-surfaces",
    sourceCategoryId: "tile-surfaces",
    premiumSku: "HD-TIL-003",
    signatureSku: "HD-TIL-005",
  },
  {
    id: "interior-wall-panels",
    sourceCategoryId: "wall-panels",
    premiumSku: "HD-WAL-003",
    signatureSku: "HD-WAL-005",
  },
  {
    id: "lighting",
    sourceCategoryId: "lighting",
    premiumSku: "HD-LGT-003",
    signatureSku: "HD-LGT-005",
  },
  {
    id: "appliances",
    sourceCategoryId: "appliances",
    premiumSku: "HD-APP-003",
    signatureSku: "HD-APP-005",
  },
  {
    id: "window-coverings",
    sourceCategoryId: "window-coverings",
    premiumSku: "HD-WCV-003",
    signatureSku: "HD-WCV-005",
  },
];

function getProductImage(product: InclusionProduct): InclusionImage | undefined {
  return product.choices?.[0]?.image ?? product.image ?? product.gallery?.[0];
}

function getProductGallery(product: InclusionProduct) {
  if (!product.gallery || product.gallery.length < 2) return undefined;
  return product.gallery.slice(1);
}

function createOption(
  categoryId: SolaceInclusionCategoryId,
  level: SolaceInclusionLevel,
  product: InclusionProduct,
): SolaceInclusionOption {
  const firstChoice = product.choices?.[0];
  const primaryImage = getProductImage(product);

  if (!primaryImage || product.packageTier !== level) {
    throw new Error(
      `Invalid Solace ${level} option mapping for ${categoryId}: ${product.sku}`,
    );
  }

  return {
    id: `${categoryId}-${level}` as SolaceInclusionOption["id"],
    level,
    name: firstChoice?.name ?? product.name,
    customerDescription:
      firstChoice?.customerDescription ?? product.customerDescription,
    primaryImage,
    galleryImages: getProductGallery(product),
    sourceSku: product.sku,
    selectionStatus: product.selectionStatus,
    availability: product.availability,
  };
}

function buildSelectableCategory(
  definition: SelectableCategoryDefinition,
  number: number,
): SolaceInclusionCategory {
  const sourceCategory = inclusionCategories.find(
    (category) => category.id === definition.sourceCategoryId,
  );

  if (!sourceCategory) {
    throw new Error(
      `Missing inclusion source category: ${definition.sourceCategoryId}`,
    );
  }

  const premiumProduct = sourceCategory.products.find(
    (product) => product.sku === definition.premiumSku,
  );
  const signatureProduct = sourceCategory.products.find(
    (product) => product.sku === definition.signatureSku,
  );

  if (!premiumProduct || !signatureProduct) {
    throw new Error(`Missing Solace options for ${definition.id}`);
  }

  return {
    id: definition.id,
    number: String(number).padStart(2, "0"),
    title: definition.title ?? sourceCategory.name,
    shortTitle: definition.shortTitle ?? sourceCategory.shortName,
    description: definition.description ?? sourceCategory.description,
    status: "selectable",
    options: [
      createOption(definition.id, "premium", premiumProduct),
      createOption(definition.id, "signature", signatureProduct),
    ],
  };
}

export function getSolaceInclusionCategories(): readonly SolaceInclusionCategory[] {
  const kitchenOptions = getSolaceKitchenCabinetryOptions();
  const selectableCategories = new Map(
    selectableCategoryDefinitions.map((definition, index) => {
      const sequenceNumber = index < 3 ? index + 2 : index + 3;
      return [
        definition.id,
        buildSelectableCategory(definition, sequenceNumber),
      ];
    }),
  );

  const orderedCategories: readonly (SolaceInclusionCategory | undefined)[] = [
    {
      id: "kitchen-cabinetry",
      number: "01",
      title: "Kitchen Cabinetry",
      shortTitle: "Kitchen Cabinetry",
      description:
        "Choose a controlled cabinetry expression for Solace. Premium is included; Signature remains an independent upgrade for this category only.",
      status: "selectable",
      options: kitchenOptions,
    },
    selectableCategories.get("countertops"),
    selectableCategories.get("wardrobes"),
    selectableCategories.get("interior-doors"),
    {
      id: "exterior-entry-doors",
      number: "05",
      title: "Exterior Entry Doors",
      shortTitle: "Entry Doors",
      description:
        "The entry direction will be coordinated with the Solace architecture and selected Design Direction.",
      status: "coordinated-later",
      options: [],
      coordinatedLaterMessage:
        "House Delivery will introduce the paired Premium and Signature entry directions once both can be reviewed together.",
    },
    selectableCategories.get("windows-patio-doors"),
    selectableCategories.get("kitchen-bath-fixtures"),
    selectableCategories.get("bathroom-systems"),
    selectableCategories.get("tile-surfaces"),
    selectableCategories.get("interior-wall-panels"),
    selectableCategories.get("lighting"),
    selectableCategories.get("appliances"),
    selectableCategories.get("window-coverings"),
    {
      id: "garage-door-operator",
      number: "14",
      title: "Garage Door + Operator",
      shortTitle: "Garage Access",
      description:
        "Garage access is coordinated only when the selected Solace site plan includes a garage.",
      status: "coordinated-later",
      options: [],
      coordinatedLaterMessage:
        "This chapter will be confirmed against the final site-adapted Solace plan.",
    },
  ];

  return orderedCategories.map((category, index) => {
    if (!category) {
      throw new Error(`Missing Solace inclusion category at position ${index + 1}`);
    }
    return category;
  });
}
