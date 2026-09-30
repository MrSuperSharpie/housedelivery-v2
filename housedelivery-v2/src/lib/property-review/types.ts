export const propertyScreenings = [
  "LIKELY CANDIDATE",
  "NEEDS REVIEW",
  "UNLIKELY CONVENTIONAL CANDIDATE",
] as const;

export type PropertyScreening = (typeof propertyScreenings)[number];

export type GeoJsonGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: unknown;
};

export type PropertyReviewResult = {
  submittedAddress: string;
  normalizedAddress: string;
  municipality: string;
  zoningDistrict?: string;
  zoningClassification?: string;
  zoningCategory?: string;
  cd1Designation?: string;
  siteId?: string;
  taxCoordinate?: string;
  parcelCentroid?: {
    latitude: number;
    longitude: number;
  };
  parcelGeometry?: GeoJsonGeometry;
  approximateParcelAreaSquareMetres?: number;
  legalType?: string;
  appearsUnusuallyComplex: boolean;
  complexityReasons: string[];
  screening: PropertyScreening;
  reason: string;
  dataSources: string[];
  failureCode?:
    | "ADDRESS_INVALID"
    | "ADDRESS_NOT_FOUND"
    | "AMBIGUOUS_PARCEL"
    | "MUNICIPALITY_NOT_SUPPORTED"
    | "MUNICIPAL_DATA_UNAVAILABLE"
    | "MUNICIPAL_DATA_CONFLICT"
    | "UNEXPECTED_ERROR";
};

export type PropertyReviewProvider = {
  municipality: string;
  supports(address: string): boolean;
  review(address: string): Promise<PropertyReviewResult>;
};
