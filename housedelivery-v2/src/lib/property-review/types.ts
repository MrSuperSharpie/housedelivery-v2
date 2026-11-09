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
  municipality?: string;
  source: string;
  sourceAuthority?: string;
  sourceDocument?: string;
  sourceSection?: string;
  effectiveDate?: string;
  lastChecked?: string;
  machineCondition?: string;
  explanation: string;
  result: PropertyLeadState;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

export const propertyProviderStatuses = [
  "FULL",
  "PARTIAL",
  "LOOKUP_ONLY",
  "SPECIAL_JURISDICTION",
] as const;

export type PropertyProviderStatus =
  (typeof propertyProviderStatuses)[number];

export type PropertyDataSourceEvidence = {
  name: string;
  url: string;
  kind: "ADDRESS" | "BOUNDARY" | "PROPERTY" | "ZONING" | "RULE";
  usage?: "QUERIED" | "REFERENCE";
  checkedAt: string;
  datasetUpdatedAt?: string;
  bylawVersion?: string;
  effectiveDate?: string;
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
  jurisdiction?: string;
  identifiedAuthority?: string;
  regionalArea?: string;
  providerStatus?: PropertyProviderStatus;
  addressSiteId?: string;
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
  approximateFrontageMetres?: number;
  approximateDepthMetres?: number;
  legalType?: string;
  legalParcel?: string;
  propertyType: string;
  existingHousingType?: string;
  rearAccessIndicator?: "YES" | "NO" | "NOT DETERMINED";
  alrIndicator?: "YES" | "NO" | "NOT DETERMINED";
  floodplainIndicator?: "YES" | "NO" | "NOT DETERMINED";
  environmentalConstraintIndicator?: "YES" | "NO" | "NOT DETERMINED";
  developmentPermitAreaIndicator?: "YES" | "NO" | "NOT DETERMINED";
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
  sourceEvidence?: PropertyDataSourceEvidence[];
  failureCode?:
    | "ADDRESS_INVALID"
    | "ADDRESS_NOT_FOUND"
    | "AMBIGUOUS_PARCEL"
    | "MUNICIPALITY_NOT_SUPPORTED"
    | "JURISDICTION_NOT_FOUND"
    | "JURISDICTION_AMBIGUOUS"
    | "OUTSIDE_REGIONAL_SCOPE"
    | "SPECIAL_JURISDICTION_REVIEW"
    | "MUNICIPAL_RULE_REVIEW_REQUIRED"
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
  jurisdiction?: string;
  sourceAttribution?: string;
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
    (candidate.jurisdiction === undefined ||
      typeof candidate.jurisdiction === "string") &&
    (candidate.sourceAttribution === undefined ||
      typeof candidate.sourceAttribution === "string") &&
    typeof candidate.propertyType === "string" &&
    typeof candidate.opportunity === "string" &&
    typeof candidate.message === "string" &&
    candidate.modelMatchStatus === "REVIEW_PENDING"
  );
}
