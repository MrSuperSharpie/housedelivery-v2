export const cmhcCatalogueTermsHref = "/cmhc-catalogue-terms";

export const cmhcOfficialTermsPdfHref =
  "https://assets.cmhc-schl.gc.ca/sites/housing%20catalog/resources/housing-design-catalogue-user-terms-and-conditions.pdf?rev=8aa4ec1f-26db-4c8f-b542-fc502732904d";

// Verified on A001 (PDF page 2) in all seven original drawing packages.
export const cmhcCatalogueReferenceDate = "February 14, 2025";

export const cmhcCatalogueDesignNames: Readonly<Record<string, string>> = {
  "the-micro": "Accessory Dwelling Unit 01",
  "the-mini": "Accessory Dwelling Unit 02",
  "bc-duplex": "Duplex",
  "bc-fourplex-1": "Fourplex 01",
  "bc-fourplex-2": "Fourplex 02",
  "bc-rowhouse": "Rowhouse",
  "sixplex-courtyard": "Sixplex Courtyard",
};

export function cmhcCatalogueSourceNotice(
  designNames = Object.values(cmhcCatalogueDesignNames),
) {
  return `Source: Canada Mortgage and Housing Corporation (CMHC), Housing Design Catalogue — ${designNames.join("; ")}, British Columbia, ${cmhcCatalogueReferenceDate}. This information is reproduced and distributed on an “as is” basis with the permission of CMHC.`;
}
