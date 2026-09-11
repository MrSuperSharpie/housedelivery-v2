import { carriageHomes } from "@/data/carriage-homes";
import { catalogModels } from "@/data/catalog";
import { models } from "@/data/models";

export type BudgetPlannerHome = {
  id: string;
  name: string;
  family: string;
  area?: string;
  href: string;
  images: readonly { src: string; alt: string; fit?: "cover" | "contain" }[];
};

// The current public catalogue supplies model data and image paths. Quantity
// means copies of the selected design (a multiplex is a whole building).
export const budgetPlannerCatalog: readonly BudgetPlannerHome[] = [
  ...models.map((home) => ({
    id: home.slug, name: home.name, family: "Custom homes",
    area: `${home.squareFeet.toLocaleString("en-CA")} sq. ft.`,
    href: `/homes/${home.slug}`,
    images: [...new Set([home.heroImage, ...home.images, home.floorPlanImage])].map((src, index) => ({ src, alt: src === home.floorPlanImage ? `${home.name} floor plan` : `${home.name} architectural view ${index + 1}`, fit: src === home.floorPlanImage ? "contain" as const : "cover" as const })),
  })),
  ...carriageHomes.map((home) => ({
    id: `carriage:${home.slug}`, name: home.name, family: "Carriage homes",
    href: `/homes/laneway-carriage/${home.slug}`, images: home.images,
  })),
  ...catalogModels.map((home) => ({
    id: `catalog:${home.slug}`, name: home.name, family: "Standardized catalogue",
    area: `${home.squareFootage} sq. ft.`, href: `/catalog/${home.slug}`,
    images: [{ src: home.image, alt: home.imageAlt }],
  })),
];
