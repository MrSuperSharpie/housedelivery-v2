import type { HomeDesignDirectionId } from "@/data/home-design-collections";
import type { InclusionImage, SelectionStatus } from "@/data/inclusions";

export type SolaceInclusionLevel = "premium" | "signature";

export const solaceInclusionCategoryIds = [
  "kitchen-cabinetry",
  "countertops",
  "wardrobes",
  "interior-doors",
  "exterior-entry-doors",
  "windows-patio-doors",
  "kitchen-bath-fixtures",
  "bathroom-systems",
  "tile-surfaces",
  "interior-wall-panels",
  "lighting",
  "appliances",
  "window-coverings",
  "garage-door-operator",
] as const;

export type SolaceInclusionCategoryId =
  (typeof solaceInclusionCategoryIds)[number];

export type SolaceKitchenCabinetryId =
  | "premium-soft-ivory-classic"
  | "premium-sage-arch"
  | "signature-smoked-oak-atelier"
  | "signature-luminous-oak-gallery";

type SolaceNonKitchenCategoryId = Exclude<
  SolaceInclusionCategoryId,
  "kitchen-cabinetry"
>;

export type SolaceInclusionOptionId =
  | SolaceKitchenCabinetryId
  | `${SolaceNonKitchenCategoryId}-${SolaceInclusionLevel}`;

export type SolaceInclusionOption = {
  id: SolaceInclusionOptionId;
  level: SolaceInclusionLevel;
  name: string;
  customerDescription: string;
  primaryImage: InclusionImage;
  galleryImages?: readonly InclusionImage[];
  sourceSku: `HD-${string}`;
  selectionStatus: SelectionStatus;
  availability: string;
};

export type SolaceKitchenCabinetryOption = Omit<
  SolaceInclusionOption,
  "id"
> & {
  id: SolaceKitchenCabinetryId;
};

export type SolaceInclusionCategory = {
  id: SolaceInclusionCategoryId;
  number: string;
  title: string;
  shortTitle: string;
  description: string;
  status: "selectable" | "coordinated-later";
  options: readonly SolaceInclusionOption[];
  coordinatedLaterMessage?: string;
};

export type SolaceInclusionSelection = {
  optionId: SolaceInclusionOptionId;
  status: "draft" | "confirmed";
};

export type SolaceInclusionSelections = Partial<
  Record<SolaceInclusionCategoryId, SolaceInclusionSelection>
>;

export type SolaceConfiguration = {
  designDirectionId: HomeDesignDirectionId;
  inclusionSelections: SolaceInclusionSelections;
};

export const defaultSolaceConfiguration: SolaceConfiguration = {
  designDirectionId: "coastal-light",
  inclusionSelections: {
    "kitchen-cabinetry": {
      optionId: "premium-sage-arch",
      status: "draft",
    },
  },
};
