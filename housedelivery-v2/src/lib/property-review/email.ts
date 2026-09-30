import type { PropertyReviewResult } from "@/lib/property-review/types";

const divider = "----------------------------------";

function valueOrUnknown(value?: string) {
  return value || "Not confidently determined";
}

function formatParcelArea(squareMetres?: number) {
  if (!squareMetres) return "Not confidently determined";
  const squareFeet = squareMetres * 10.7639;
  return `${Math.round(squareMetres).toLocaleString("en-CA")} m² (${Math.round(squareFeet).toLocaleString("en-CA")} sq. ft.)`;
}

function formatCentroid(result: PropertyReviewResult) {
  if (!result.parcelCentroid) return "Not confidently determined";
  return `${result.parcelCentroid.latitude.toFixed(6)}, ${result.parcelCentroid.longitude.toFixed(6)}`;
}

export function formatPropertyReviewEmailSection(
  result: PropertyReviewResult,
) {
  const lines = [
    divider,
    "",
    "HOUSE DELIVERY",
    "PRELIMINARY PROPERTY REVIEW",
    "",
    "Property:",
    result.normalizedAddress || result.submittedAddress || "Not supplied",
    "",
    "Municipality:",
    result.municipality,
    "",
    "Zoning District:",
    valueOrUnknown(result.zoningDistrict),
    "",
    "Zoning Classification:",
    valueOrUnknown(result.zoningClassification),
  ];

  if (result.cd1Designation) {
    lines.push("", "CD-1:", result.cd1Designation);
  }

  lines.push(
    "",
    "Site ID:",
    valueOrUnknown(result.siteId),
    "",
    "Tax Coordinate:",
    valueOrUnknown(result.taxCoordinate),
    "",
    "Parcel Centroid:",
    formatCentroid(result),
    "",
    "Approximate Parcel Area:",
    formatParcelArea(result.approximateParcelAreaSquareMetres),
    "",
    "Property Complexity:",
    result.appearsUnusuallyComplex
      ? `Appears unusually complex — ${result.complexityReasons.join("; ")}`
      : "No unusual complexity identified from the available municipal records.",
    "",
    "PRELIMINARY HOUSE DELIVERY SCREENING:",
    "",
    result.screening,
    "",
    "REASON:",
    "",
    result.reason,
    "",
    "DATA SOURCE:",
    "",
    result.dataSources.length
      ? result.dataSources.join("; ")
      : "City of Vancouver Open Data",
    "",
    "DISCLAIMER:",
    "",
    "This is an automated preliminary screening only. Zoning, development potential, site conditions and permitting requirements must be independently verified before any representation is made to the property owner.",
    "",
    divider,
  );

  return lines.join("\n");
}

export function appendPropertyReviewToLeadEmail(
  existingLeadEmail: string,
  result: PropertyReviewResult,
) {
  return `${existingLeadEmail}\n\n${formatPropertyReviewEmailSection(result)}`;
}
