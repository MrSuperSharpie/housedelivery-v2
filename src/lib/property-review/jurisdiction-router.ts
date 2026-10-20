import {
  getFraserJurisdictionByLocality,
  getJurisdictionByBoundaryName,
  getJurisdictionDescriptor,
  type JurisdictionDescriptor,
} from "@/lib/property-review/provider-registry";
import {
  createGovernmentDataClient,
  GovernmentDataError,
  type GovernmentDataClient,
} from "@/lib/property-review/government-data-client";
import type {
  PropertyDataSourceEvidence,
  PropertyReviewResult,
} from "@/lib/property-review/types";

const geocoderUrl = "https://geocoder.api.gov.bc.ca/addresses.json";
const metroBoundaryUrl =
  "https://services1.arcgis.com/xeMpV7tU1t4KD3Ei/arcgis/rest/services/Administrative_Boundaries/FeatureServer/33/query";
const reserveBoundaryUrl =
  "https://services6.arcgis.com/yQl4SOjuM0Xu5UJ9/arcgis/rest/services/BC_Indigenous_Reserves/FeatureServer/2/query";
const treatyBoundaryUrl =
  "https://services6.arcgis.com/yQl4SOjuM0Xu5UJ9/arcgis/rest/services/BC_FN_Treaty_Lands/FeatureServer/2/query";

type AddressFeature = {
  type?: unknown;
  geometry?: {
    type?: unknown;
    coordinates?: unknown;
  };
  properties?: Record<string, unknown>;
};

type AddressResponse = {
  features?: unknown;
  version?: unknown;
  baseDataDate?: unknown;
  error?: unknown;
};

type BoundaryResponse = {
  features?: unknown;
  error?: unknown;
};

export type JurisdictionResolution = {
  descriptor: JurisdictionDescriptor;
  country: "Canada";
  province: "British Columbia";
  regionalArea: string;
  identifiedAuthority?: string;
  normalizedAddress: string;
  primaryCivicAddress: string;
  submittedUnit?: string;
  addressSiteId?: string;
  localityName: string;
  localityType: string;
  electoralArea?: string;
  score: number;
  matchPrecision: string;
  centroid: {
    latitude: number;
    longitude: number;
  };
  confidence: "HIGH" | "MEDIUM";
  sourceEvidence: PropertyDataSourceEvidence[];
};

export type JurisdictionRoutingResult =
  | { ok: true; resolution: JurisdictionResolution }
  | {
      ok: false;
      normalizedAddress: string;
      municipality: string;
      reason: string;
      failureCode: NonNullable<PropertyReviewResult["failureCode"]>;
      sourceEvidence: PropertyDataSourceEvidence[];
    };

export type JurisdictionRouter = {
  route(address: string): Promise<JurisdictionRoutingResult>;
};

type JurisdictionRouterOptions = {
  dataClient?: GovernmentDataClient;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retryCount?: number;
  now?: () => Date;
};

function text(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function serviceError(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const error = record.error;
  if (!error || typeof error !== "object" || Array.isArray(error)) {
    return undefined;
  }
  const errorRecord = error as Record<string, unknown>;
  return text(errorRecord.message) || "The official service returned an error.";
}

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeAddress(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function addressEvidence(
  checkedAt: string,
  response?: AddressResponse,
): PropertyDataSourceEvidence {
  return {
    name: "Province of British Columbia Address Geocoder",
    url: "https://digital.gov.bc.ca/bcgov-common-components/bc-address-geocoder/",
    kind: "ADDRESS",
    usage: "QUERIED",
    checkedAt,
    ...(text(response?.baseDataDate)
      ? { datasetUpdatedAt: text(response?.baseDataDate) }
      : {}),
    ...(text(response?.version)
      ? { bylawVersion: `API ${text(response?.version)}` }
      : {}),
    confidence: "HIGH",
  };
}

function boundaryEvidence(checkedAt: string): PropertyDataSourceEvidence {
  return {
    name: "Metro Vancouver Administrative Boundaries",
    url: "https://services1.arcgis.com/xeMpV7tU1t4KD3Ei/arcgis/rest/services/Administrative_Boundaries/FeatureServer/33",
    kind: "BOUNDARY",
    usage: "QUERIED",
    checkedAt,
    confidence: "HIGH",
  };
}

function readAddressFeatures(response: AddressResponse) {
  if (!Array.isArray(response.features)) return [];
  return response.features.filter(
    (feature): feature is AddressFeature =>
      Boolean(feature) && typeof feature === "object" && !Array.isArray(feature),
  );
}

function readAddressFeature(feature: AddressFeature) {
  const properties = feature.properties;
  const coordinates = feature.geometry?.coordinates;
  if (
    !properties ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2
  ) {
    return undefined;
  }
  const longitude = number(coordinates[0]);
  const latitude = number(coordinates[1]);
  const score = number(properties.score);
  if (
    longitude === undefined ||
    latitude === undefined ||
    score === undefined
  ) {
    return undefined;
  }
  return {
    properties,
    longitude,
    latitude,
    score,
    fullAddress: text(properties.fullAddress),
    matchPrecision: text(properties.matchPrecision).toUpperCase(),
    localityName: text(properties.localityName),
    localityType: text(properties.localityType),
    electoralArea: text(properties.electoralArea),
    siteId: text(properties.siteID),
    unitNumber: text(properties.unitNumber),
    official:
      properties.official === true ||
      text(properties.official).toUpperCase() === "TRUE",
  };
}

const acceptableAddressPrecisions = new Set([
  "CIVIC_NUMBER",
  "UNIT",
  "SITE",
  "BLOCK",
]);

const addressPrecisionRank: Record<string, number> = {
  UNIT: 4,
  CIVIC_NUMBER: 3,
  SITE: 2,
  BLOCK: 1,
};

function isAmbiguousAddress(
  first: ReturnType<typeof readAddressFeature>,
  second: ReturnType<typeof readAddressFeature>,
) {
  if (!first || !second) return false;
  return (
    first.fullAddress.toUpperCase() !== second.fullAddress.toUpperCase() &&
    first.score - second.score <= 2 &&
    (addressPrecisionRank[second.matchPrecision] ?? 0) >=
      (addressPrecisionRank[first.matchPrecision] ?? 0)
  );
}

function isFirstNationLocality(localityName: string, localityType: string) {
  return /\b(?:FIRST NATION|INDIAN RESERVATION|INDIAN RESERVE|RESERVE LAND|TREATY LAND|ABORIGINAL LAND)\b/i.test(
    `${localityName} ${localityType}`,
  );
}

function isTsawwassenFirstNation(localityName: string) {
  return /TSAWWASSEN\s+FIRST\s+NATION/i.test(localityName);
}

function isFvrdElectoralArea(electoralArea: string) {
  return /(?:FRASER\s+VALLEY|\bFVRD\b)/i.test(electoralArea);
}

function isMetroElectoralArea(electoralArea: string) {
  return /(?:METRO\s+VANCOUVER|GREATER\s+VANCOUVER)/i.test(electoralArea);
}

function readBoundaryName(value: BoundaryResponse) {
  if (!Array.isArray(value.features)) return undefined;
  const names = value.features.flatMap((feature) => {
    if (!feature || typeof feature !== "object" || Array.isArray(feature)) {
      return [];
    }
    const attributes = (feature as { attributes?: unknown }).attributes;
    if (
      !attributes ||
      typeof attributes !== "object" ||
      Array.isArray(attributes)
    ) {
      return [];
    }
    const record = attributes as Record<string, unknown>;
    return [text(record.FullName), text(record.ShortName)].filter(Boolean);
  });
  for (const name of names) {
    if (getJurisdictionByBoundaryName(name)) return name;
  }
  return undefined;
}

function readFirstAttribute(
  value: BoundaryResponse,
  fieldNames: string[],
) {
  if (!Array.isArray(value.features)) return undefined;
  for (const feature of value.features) {
    if (!feature || typeof feature !== "object" || Array.isArray(feature)) {
      continue;
    }
    const attributes = (feature as { attributes?: unknown }).attributes;
    if (
      !attributes ||
      typeof attributes !== "object" ||
      Array.isArray(attributes)
    ) {
      continue;
    }
    const record = attributes as Record<string, unknown>;
    for (const fieldName of fieldNames) {
      const candidate = text(record[fieldName]);
      if (candidate) return candidate;
    }
  }
  return undefined;
}

function specialBoundaryEvidence(
  checkedAt: string,
): PropertyDataSourceEvidence[] {
  return [
    {
      name: "Province of British Columbia Indigenous Reserve Boundaries",
      url: "https://services6.arcgis.com/yQl4SOjuM0Xu5UJ9/arcgis/rest/services/BC_Indigenous_Reserves/FeatureServer/2",
      kind: "BOUNDARY",
      usage: "QUERIED",
      checkedAt,
      confidence: "HIGH",
    },
    {
      name: "Province of British Columbia First Nation Treaty Lands",
      url: "https://services6.arcgis.com/yQl4SOjuM0Xu5UJ9/arcgis/rest/services/BC_FN_Treaty_Lands/FeatureServer/2",
      kind: "BOUNDARY",
      usage: "QUERIED",
      checkedAt,
      confidence: "HIGH",
    },
  ];
}

function pointQueryUrl(baseUrl: string, longitude: number, latitude: number) {
  const url = new URL(baseUrl);
  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set("geometry", `${longitude},${latitude}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("returnGeometry", "false");
  return url;
}

function resolutionFor(
  descriptor: JurisdictionDescriptor,
  address: NonNullable<ReturnType<typeof readAddressFeature>>,
  sources: PropertyDataSourceEvidence[],
  identifiedAuthority?: string,
): JurisdictionResolution {
  return {
    descriptor,
    country: "Canada",
    province: "British Columbia",
    regionalArea: descriptor.regionalArea,
    ...(identifiedAuthority ? { identifiedAuthority } : {}),
    normalizedAddress: address.fullAddress,
    primaryCivicAddress: address.fullAddress,
    ...(address.unitNumber ? { submittedUnit: address.unitNumber } : {}),
    ...(address.siteId ? { addressSiteId: address.siteId } : {}),
    localityName: address.localityName,
    localityType: address.localityType,
    ...(address.electoralArea ? { electoralArea: address.electoralArea } : {}),
    score: address.score,
    matchPrecision: address.matchPrecision,
    centroid: {
      latitude: address.latitude,
      longitude: address.longitude,
    },
    confidence: address.score >= 95 ? "HIGH" : "MEDIUM",
    sourceEvidence: sources,
  };
}

export function createJurisdictionRouter(
  options: JurisdictionRouterOptions = {},
): JurisdictionRouter {
  const now = options.now ?? (() => new Date());
  const client =
    options.dataClient ??
    createGovernmentDataClient({
      fetchImpl: options.fetchImpl,
      timeoutMs: options.timeoutMs,
      retryCount: options.retryCount,
    });

  return {
    async route(address) {
      const submittedAddress = normalizeAddress(address);
      const checkedAt = now().toISOString();
      if (!submittedAddress) {
        return {
          ok: false,
          normalizedAddress: "",
          municipality: "Not confidently determined",
          reason: "No property address was supplied for jurisdiction review.",
          failureCode: "ADDRESS_INVALID",
          sourceEvidence: [],
        };
      }

      const requestUrl = new URL(geocoderUrl);
      requestUrl.searchParams.set("addressString", submittedAddress);
      requestUrl.searchParams.set("maxResults", "2");
      requestUrl.searchParams.set("locationDescriptor", "parcelPoint");
      requestUrl.searchParams.set("echo", "true");
      requestUrl.searchParams.set("brief", "false");

      let response: AddressResponse;
      try {
        response = await client.getJson<AddressResponse>(requestUrl, {
          provider: "BC Address Geocoder",
          operation: "address_lookup",
          cacheKey: `bc-address:${submittedAddress.toUpperCase()}`,
        });
      } catch (error) {
        return {
          ok: false,
          normalizedAddress: submittedAddress,
          municipality: "Lower Mainland jurisdiction requires review",
          reason:
            error instanceof GovernmentDataError
              ? error.message
              : "The official provincial address service was unavailable.",
          failureCode: "MUNICIPAL_DATA_UNAVAILABLE",
          sourceEvidence: [addressEvidence(checkedAt)],
        };
      }

      const sources = [addressEvidence(checkedAt, response)];
      if (serviceError(response)) {
        return {
          ok: false,
          normalizedAddress: submittedAddress,
          municipality: "Lower Mainland jurisdiction requires review",
          reason: `The official provincial address service returned an error: ${serviceError(response)}`,
          failureCode: "MUNICIPAL_DATA_UNAVAILABLE",
          sourceEvidence: sources,
        };
      }
      const matches = readAddressFeatures(response).map(readAddressFeature);
      const best = matches[0];
      if (
        !best ||
        best.score < 90 ||
        !acceptableAddressPrecisions.has(best.matchPrecision) ||
        !best.fullAddress
      ) {
        return {
          ok: false,
          normalizedAddress: best?.fullAddress || submittedAddress,
          municipality: "Lower Mainland jurisdiction requires review",
          reason:
            "The official provincial address service did not return an exact civic address with sufficient confidence.",
          failureCode: "ADDRESS_NOT_FOUND",
          sourceEvidence: sources,
        };
      }
      if (isAmbiguousAddress(best, matches[1])) {
        return {
          ok: false,
          normalizedAddress: best.fullAddress,
          municipality: "Lower Mainland jurisdiction requires review",
          reason:
            "The official provincial address service returned multiple similarly scored civic addresses.",
          failureCode: "JURISDICTION_AMBIGUOUS",
          sourceEvidence: sources,
        };
      }

      if (isTsawwassenFirstNation(best.localityName)) {
        return {
          ok: true,
          resolution: resolutionFor(
            getJurisdictionDescriptor("tsawwassen-first-nation"),
            best,
            sources,
          ),
        };
      }
      if (isFirstNationLocality(best.localityName, best.localityType)) {
        return {
          ok: true,
          resolution: resolutionFor(
            getJurisdictionDescriptor("first-nation-reserve"),
            best,
            sources,
          ),
        };
      }
      const specialSources = specialBoundaryEvidence(checkedAt);
      let reserveResponse: BoundaryResponse;
      let treatyResponse: BoundaryResponse;
      try {
        [reserveResponse, treatyResponse] = await Promise.all([
          client.getJson<BoundaryResponse>(
            pointQueryUrl(
              reserveBoundaryUrl,
              best.longitude,
              best.latitude,
            ),
            {
              provider: "BC Indigenous Reserve Boundaries",
              operation: "reserve_boundary_lookup",
              cacheKey: `bc-reserve:${best.longitude.toFixed(6)}:${best.latitude.toFixed(6)}`,
              cacheTtlMs: 24 * 60 * 60 * 1_000,
            },
          ),
          client.getJson<BoundaryResponse>(
            pointQueryUrl(
              treatyBoundaryUrl,
              best.longitude,
              best.latitude,
            ),
            {
              provider: "BC First Nation Treaty Lands",
              operation: "treaty_boundary_lookup",
              cacheKey: `bc-treaty:${best.longitude.toFixed(6)}:${best.latitude.toFixed(6)}`,
              cacheTtlMs: 24 * 60 * 60 * 1_000,
            },
          ),
        ]);
      } catch (error) {
        return {
          ok: false,
          normalizedAddress: best.fullAddress,
          municipality: "Lower Mainland jurisdiction requires review",
          reason:
            error instanceof GovernmentDataError
              ? error.message
              : "An official special-jurisdiction boundary service was unavailable.",
          failureCode: "MUNICIPAL_DATA_UNAVAILABLE",
          sourceEvidence: [...sources, ...specialSources],
        };
      }

      const specialServiceError =
        serviceError(reserveResponse) || serviceError(treatyResponse);
      if (specialServiceError) {
        return {
          ok: false,
          normalizedAddress: best.fullAddress,
          municipality: "Lower Mainland jurisdiction requires review",
          reason: `An official special-jurisdiction boundary service returned an error: ${specialServiceError}`,
          failureCode: "MUNICIPAL_DATA_UNAVAILABLE",
          sourceEvidence: [...sources, ...specialSources],
        };
      }

      const reserveName = readFirstAttribute(reserveResponse, [
        "NGLSHNM",
        "ENGLISH_NAME",
        "NAME",
      ]);
      const treatyName = readFirstAttribute(treatyResponse, [
        "FN_NAME",
        "TREATY",
        "LAND_TYPE",
      ]);
      if (reserveName || treatyName) {
        const authority = reserveName || treatyName;
        const descriptor = /TSAWWASSEN/i.test(authority ?? "")
          ? getJurisdictionDescriptor("tsawwassen-first-nation")
          : getJurisdictionDescriptor("first-nation-reserve");
        return {
          ok: true,
          resolution: resolutionFor(
            descriptor,
            best,
            [...sources, ...specialSources],
            authority,
          ),
        };
      }

      if (isFvrdElectoralArea(best.electoralArea)) {
        return {
          ok: true,
          resolution: resolutionFor(
            getJurisdictionDescriptor("fvrd-electoral-area"),
            best,
            [...sources, ...specialSources],
          ),
        };
      }

      const fraserMunicipality = getFraserJurisdictionByLocality(
        best.localityName,
      );
      if (fraserMunicipality) {
        return {
          ok: true,
          resolution: resolutionFor(fraserMunicipality, best, [
            ...sources,
            ...specialSources,
          ]),
        };
      }

      const boundaryRequestUrl = new URL(metroBoundaryUrl);
      boundaryRequestUrl.searchParams.set("f", "json");
      boundaryRequestUrl.searchParams.set("where", "1=1");
      boundaryRequestUrl.searchParams.set(
        "geometry",
        `${best.longitude},${best.latitude}`,
      );
      boundaryRequestUrl.searchParams.set("geometryType", "esriGeometryPoint");
      boundaryRequestUrl.searchParams.set("inSR", "4326");
      boundaryRequestUrl.searchParams.set(
        "spatialRel",
        "esriSpatialRelIntersects",
      );
      boundaryRequestUrl.searchParams.set("outFields", "FullName,ShortName");
      boundaryRequestUrl.searchParams.set("returnGeometry", "false");

      let boundaryResponse: BoundaryResponse;
      try {
        boundaryResponse = await client.getJson<BoundaryResponse>(
          boundaryRequestUrl,
          {
            provider: "Metro Vancouver Administrative Boundaries",
            operation: "jurisdiction_boundary_lookup",
            cacheKey: `metro-boundary:${best.longitude.toFixed(6)}:${best.latitude.toFixed(6)}`,
          },
        );
      } catch (error) {
        return {
          ok: false,
          normalizedAddress: best.fullAddress,
          municipality: "Lower Mainland jurisdiction requires review",
          reason:
            error instanceof GovernmentDataError
              ? error.message
              : "The official regional boundary service was unavailable.",
          failureCode: "MUNICIPAL_DATA_UNAVAILABLE",
          sourceEvidence: [
            ...sources,
            ...specialSources,
            boundaryEvidence(checkedAt),
          ],
        };
      }

      if (serviceError(boundaryResponse)) {
        return {
          ok: false,
          normalizedAddress: best.fullAddress,
          municipality: "Lower Mainland jurisdiction requires review",
          reason: `The official regional boundary service returned an error: ${serviceError(boundaryResponse)}`,
          failureCode: "MUNICIPAL_DATA_UNAVAILABLE",
          sourceEvidence: [
            ...sources,
            ...specialSources,
            boundaryEvidence(checkedAt),
          ],
        };
      }

      const boundarySources = [
        ...sources,
        ...specialSources,
        boundaryEvidence(checkedAt),
      ];
      const boundaryName = readBoundaryName(boundaryResponse);
      const municipality = boundaryName
        ? getJurisdictionByBoundaryName(boundaryName)
        : undefined;
      if (municipality) {
        return {
          ok: true,
          resolution: resolutionFor(municipality, best, boundarySources),
        };
      }

      if (
        isMetroElectoralArea(best.electoralArea) ||
        best.localityName.toUpperCase() === "VANCOUVER"
      ) {
        return {
          ok: true,
          resolution: resolutionFor(
            getJurisdictionDescriptor("metro-electoral-area-a"),
            best,
            boundarySources,
          ),
        };
      }

      return {
        ok: false,
        normalizedAddress: best.fullAddress,
        municipality: "Outside the Lower Mainland Phase 3 service area",
        reason:
          "The official address and boundary services resolved this property outside the supported Metro Vancouver and Fraser Valley jurisdictions.",
        failureCode: "OUTSIDE_REGIONAL_SCOPE",
        sourceEvidence: boundarySources,
      };
    },
  };
}
