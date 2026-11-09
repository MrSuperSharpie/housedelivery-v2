import type { GovernmentDataClient } from "@/lib/property-review/government-data-client";
import { GovernmentDataError } from "@/lib/property-review/government-data-client";
import type { JurisdictionResolution } from "@/lib/property-review/jurisdiction-router";
import type { LowerMainlandJurisdictionId } from "@/lib/property-review/provider-registry";
import type { PropertyReviewResult } from "@/lib/property-review/types";

type ZoningProviderConfig = {
  url: string;
  districtField: string;
  classificationField?: string;
  categoryField?: string;
};

const zoningProviderConfigs = {
  burnaby: {
    url: "https://gis.burnaby.ca/arcgis/rest/services/OpenData/OpenData1/MapServer/8/query",
    districtField: "ZONECODE",
    classificationField: "CD_ZONE",
  },
  delta: {
    url: "https://maps.delta.ca/arcgis/rest/services/DeltaMap/Planning/MapServer/11/query",
    districtField: "ZONING",
    classificationField: "ZONING_DESCRIPTION",
  },
  "langley-city": {
    url: "https://maps.langleycity.ca/server/rest/services/Maps/External/MapServer/90/query",
    districtField: "ZONING",
    classificationField: "CD_NMBR",
  },
  "maple-ridge": {
    url: "https://geoservices.mapleridge.ca/server/rest/services/RidgeViewData/Development/MapServer/18/query",
    districtField: "ZoningCode",
    classificationField: "ZoningDescription",
    categoryField: "Category",
  },
  "north-vancouver-city": {
    url: "https://gisext2.cnv.org/arcgis/rest/services/BaseMapServices/CityMapPro/MapServer/40/query",
    districtField: "ZONING",
  },
  "white-rock": {
    url: "https://maps.whiterockcity.ca/server/rest/services/opendata/Zoning/MapServer/0/query",
    districtField: "ZONE_CODE",
    classificationField: "ZONE_DESC",
  },
  mission: {
    url: "https://esri.mission.ca/ags/rest/services/Geocortex/Planning/MapServer/2/query",
    districtField: "Zone_Sym",
    classificationField: "Zoning",
    categoryField: "Zone_Class",
  },
} as const satisfies Partial<
  Record<LowerMainlandJurisdictionId, ZoningProviderConfig>
>;

export const machineZoningJurisdictionIds = Object.freeze(
  Object.keys(zoningProviderConfigs) as LowerMainlandJurisdictionId[],
);

export type MunicipalZoningLookupResult =
  | { status: "NOT_CONFIGURED" }
  | {
      status: "MATCHED";
      zoningDistrict: string;
      zoningClassification?: string;
      zoningCategory?: string;
    }
  | {
      status: "UNAVAILABLE";
      reason: string;
      failureCode: Extract<
        NonNullable<PropertyReviewResult["failureCode"]>,
        "MUNICIPAL_DATA_UNAVAILABLE" | "MUNICIPAL_DATA_CONFLICT"
      >;
    };

export type MunicipalZoningLookup = (
  resolution: JurisdictionResolution,
) => Promise<MunicipalZoningLookupResult>;

type ArcGisResponse = {
  features?: unknown;
  error?: unknown;
};

function readString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function responseError(value: ArcGisResponse) {
  if (!value.error || typeof value.error !== "object" || Array.isArray(value.error)) {
    return undefined;
  }
  const message = readString(
    (value.error as Record<string, unknown>).message,
  );
  return message || "The official zoning service returned an error.";
}

function readZoningMatches(
  value: ArcGisResponse,
  config: ZoningProviderConfig,
) {
  if (!Array.isArray(value.features)) return [];
  const records = value.features.flatMap((feature) => {
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
    const zoningDistrict = readString(record[config.districtField]);
    if (!zoningDistrict) return [];
    const zoningClassification = config.classificationField
      ? readString(record[config.classificationField])
      : "";
    const zoningCategory = config.categoryField
      ? readString(record[config.categoryField])
      : "";
    return [
      {
        zoningDistrict,
        ...(zoningClassification ? { zoningClassification } : {}),
        ...(zoningCategory ? { zoningCategory } : {}),
      },
    ];
  });
  return records.filter(
    (record, index) =>
      records.findIndex(
        (candidate) =>
          candidate.zoningDistrict === record.zoningDistrict &&
          candidate.zoningClassification === record.zoningClassification &&
          candidate.zoningCategory === record.zoningCategory,
      ) === index,
  );
}

export function createMunicipalZoningLookup(
  client: GovernmentDataClient,
): MunicipalZoningLookup {
  return async (resolution) => {
    const config: ZoningProviderConfig | undefined =
      zoningProviderConfigs[
        resolution.descriptor.id as keyof typeof zoningProviderConfigs
      ];
    if (!config) return { status: "NOT_CONFIGURED" };

    const url = new URL(config.url);
    url.searchParams.set("f", "json");
    url.searchParams.set("where", "1=1");
    url.searchParams.set(
      "geometry",
      `${resolution.centroid.longitude},${resolution.centroid.latitude}`,
    );
    url.searchParams.set("geometryType", "esriGeometryPoint");
    url.searchParams.set("inSR", "4326");
    url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    url.searchParams.set(
      "outFields",
      [
        config.districtField,
        config.classificationField,
        config.categoryField,
      ]
        .filter(Boolean)
        .join(","),
    );
    url.searchParams.set("returnGeometry", "false");

    let response: ArcGisResponse;
    try {
      response = await client.getJson<ArcGisResponse>(url, {
        provider: resolution.descriptor.name,
        operation: "zoning_lookup",
        cacheKey: `municipal-zoning:${resolution.descriptor.id}:${resolution.centroid.longitude.toFixed(6)}:${resolution.centroid.latitude.toFixed(6)}`,
      });
    } catch (error) {
      return {
        status: "UNAVAILABLE",
        reason:
          error instanceof GovernmentDataError
            ? error.message
            : "The official municipal zoning service was unavailable.",
        failureCode: "MUNICIPAL_DATA_UNAVAILABLE",
      };
    }

    const error = responseError(response);
    if (error) {
      return {
        status: "UNAVAILABLE",
        reason: `${resolution.descriptor.name} zoning service returned an error: ${error}`,
        failureCode: "MUNICIPAL_DATA_UNAVAILABLE",
      };
    }
    const matches = readZoningMatches(response, config);
    if (matches.length !== 1) {
      return {
        status: "UNAVAILABLE",
        reason:
          matches.length === 0
            ? `No official ${resolution.descriptor.name} zoning polygon contained the resolved address point.`
            : `Multiple conflicting ${resolution.descriptor.name} zoning polygons contained the resolved address point.`,
        failureCode: "MUNICIPAL_DATA_CONFLICT",
      };
    }
    return { status: "MATCHED", ...matches[0] };
  };
}
