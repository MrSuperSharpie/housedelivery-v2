import { carriageHomes } from "@/data/carriage-homes";
import type { PropertyReviewResult } from "@/lib/property-review/types";

export type PropertyModelCandidate = {
  slug: string;
  name: string;
  href: string;
  image: {
    src: string;
    alt: string;
  };
};

export type PropertyModelMatch = {
  status: "REVIEW_PENDING";
  candidates: readonly PropertyModelCandidate[];
  explanation: string;
};

const realLanewayCarriageCatalogue: readonly PropertyModelCandidate[] =
  carriageHomes.map((home) => ({
    slug: home.slug,
    name: home.name,
    href: `/homes/laneway-carriage/${home.slug}`,
    image: {
      src: home.images[0].src,
      alt: home.images[0].alt,
    },
  }));

export function getPropertyModelMatch(
  review: PropertyReviewResult,
): PropertyModelMatch {
  return {
    status: "REVIEW_PENDING",
    candidates: review.leadState === "GREEN" ? realLanewayCarriageCatalogue : [],
    explanation:
      "House Delivery has not yet calculated a reliable buildable envelope for this property. Model suitability requires site-specific review.",
  };
}
