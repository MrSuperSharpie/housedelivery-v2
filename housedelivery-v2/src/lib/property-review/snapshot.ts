import { getPropertyModelMatch } from "@/lib/property-review/model-matching";
import type {
  PropertyReviewResult,
  PublicPropertySnapshot,
} from "@/lib/property-review/types";

export function formatPropertyArea(squareMetres?: number) {
  if (!squareMetres || !Number.isFinite(squareMetres)) return undefined;
  const squareFeet = squareMetres * 10.7639;
  return `${Math.round(squareFeet).toLocaleString("en-CA")} sq. ft. (${Math.round(squareMetres).toLocaleString("en-CA")} m²)`;
}

export function buildPublicPropertySnapshot(
  review: PropertyReviewResult,
): PublicPropertySnapshot {
  const modelMatch = getPropertyModelMatch(review);
  const shared = {
    address: review.normalizedAddress || review.submittedAddress,
    municipality: review.municipality,
    ...(review.jurisdiction ? { jurisdiction: review.jurisdiction } : {}),
    ...(review.jurisdiction && review.sourceEvidence?.length
      ? {
          sourceAttribution: "Jurisdiction resolved from official government data",
        }
      : {}),
    ...(review.zoningDistrict ? { zoning: review.zoningDistrict } : {}),
    propertyType: review.propertyType,
    ...(formatPropertyArea(review.approximateParcelAreaSquareMetres)
      ? {
          approximateLotSize: formatPropertyArea(
            review.approximateParcelAreaSquareMetres,
          ),
        }
      : {}),
    modelMatchStatus: modelMatch.status,
  } as const;

  if (review.leadState === "GREEN") {
    return {
      ...shared,
      status: "green",
      statusLabel: "PROMISING PROPERTY",
      headline: "Your property looks promising.",
      opportunity: "Laneway / backyard home worth exploring",
      message:
        "Based on the property and municipal information currently available, this property appears worth progressing to the next stage of House Delivery review.",
    };
  }
  if (review.leadState === "RED") {
    return {
      ...shared,
      status: "red",
      statusLabel: "NOT A CONVENTIONAL FIT",
      headline: "We’ve reviewed your property.",
      opportunity: "Another property may be a better fit",
      message:
        "Based on the property information available, this does not appear to be a conventional detached residential property suited to the House Delivery laneway or carriage-home process.",
    };
  }
  return {
    ...shared,
    status: "yellow",
    statusLabel: "REVIEW IN PROGRESS",
    headline: "We’re taking a closer look.",
    opportunity: "Human review required before a recommendation",
    message:
      "We found your property, but there are details that need to be reviewed before we make a recommendation. Nothing is required from you right now. Our team will review the property and determine the next step.",
  };
}
