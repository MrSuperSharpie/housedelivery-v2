import { catalogModels } from "@/data/catalog";
import { carriageHomes } from "@/data/carriage-homes";
import { models } from "@/data/models";

export type InquiryModel = { slug: string; name: string; squareFeet?: number };

// Retain existing custom-home IDs; namespace the other catalogue families.
export const inquiryModels: readonly InquiryModel[] = [
  ...models.map(({ slug, name, squareFeet }) => ({ slug, name, squareFeet })),
  ...carriageHomes.map(({ slug, name }) => ({ slug: `carriage:${slug}`, name })),
  ...catalogModels.map(({ slug, name }) => ({ slug: `catalog:${slug}`, name })),
];
