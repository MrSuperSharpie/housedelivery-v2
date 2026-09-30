export const propertyScreenings = [
  "LIKELY CANDIDATE",
  "NEEDS REVIEW",
  "UNLIKELY CONVENTIONAL CANDIDATE",
] as const;

export type PropertyScreening = (typeof propertyScreenings)[number];

export const propertyLeadStates = ["GREEN", "YELLOW", "RED"] as const;

export type PropertyLeadState = (typeof propertyLeadStates)[number];

export type PropertyRuleResult = {
  ruleId: string;
  source: string;
  explanation: string;
  result: PropertyLeadState;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

export type GeoJsonGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: unknown;
};

export type PropertyReviewResult = {
  submittedAddress: string;
  normalizedAddress: string;
  primaryCivicAddress?: string;
  submittedUnit?: string;
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
  propertyType: string;
  strataIndicator: "YES" | "NO" | "NOT CONFIDENTLY DETERMINED";
  multifamilyIndicator: boolean;
  commercialIndicator: boolean;
  industrialIndicator: boolean;
  appearsUnusuallyComplex: boolean;
  complexityReasons: string[];
  leadState: PropertyLeadState;
  leadStateLabel: string;
  recommendedNextAction: string;
  matchedRules: PropertyRuleResult[];
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

export type PublicPropertySnapshot = {
  status: "green" | "yellow" | "red";
  statusLabel: string;
  headline: string;
  address: string;
  municipality: string;
  zoning?: string;
  propertyType: string;
  approximateLotSize?: string;
  opportunity: string;
  message: string;
  modelMatchStatus: "REVIEW_PENDING";
};

export function isPublicPropertySnapshot(
  value: unknown,
): value is PublicPropertySnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<PublicPropertySnapshot>;
  return (
    (candidate.status === "green" ||
      candidate.status === "yellow" ||
      candidate.status === "red") &&
    typeof candidate.statusLabel === "string" &&
    typeof candidate.headline === "string" &&
    typeof candidate.address === "string" &&
    typeof candidate.municipality === "string" &&
    typeof candidate.propertyType === "string" &&
    typeof candidate.opportunity === "string" &&
    typeof candidate.message === "string" &&
    candidate.modelMatchStatus === "REVIEW_PENDING"
  );
}
