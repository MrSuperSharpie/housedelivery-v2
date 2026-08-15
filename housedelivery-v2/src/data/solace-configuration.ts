import type { HomeDesignDirectionId } from "@/data/home-design-collections";
import type { InclusionImage, SelectionStatus } from "@/data/inclusions";

export type SolaceInclusionLevel = "premium" | "signature";

export type SolaceKitchenCabinetryId =
  | "premium-soft-ivory-classic"
  | "premium-sage-arch"
  | "signature-smoked-oak-atelier"
  | "signature-luminous-oak-gallery";

export type SolaceKitchenCabinetryOption = {
  id: SolaceKitchenCabinetryId;
  level: SolaceInclusionLevel;
  name: string;
  customerDescription: string;
  image: InclusionImage;
  sourceSku: `HD-${string}`;
  selectionStatus: SelectionStatus;
  availability: string;
};

export type SolaceInclusionSelections = {
  kitchenCabinetry: SolaceKitchenCabinetryId;
};

export type SolaceConfiguration = {
  designDirectionId: HomeDesignDirectionId;
  inclusionSelections: SolaceInclusionSelections;
};

export const defaultSolaceConfiguration: SolaceConfiguration = {
  designDirectionId: "coastal-light",
  inclusionSelections: {
    kitchenCabinetry: "premium-sage-arch",
  },
};
