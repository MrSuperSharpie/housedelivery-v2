import type {
  GeoJsonGeometry,
  PropertyReviewProvider,
  PropertyReviewResult,
  PropertyScreening,
} from "@/lib/property-review/types";

const defaultApiBaseUrl =
  "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets";
const municipality = "City of Vancouver";
const parcelSource =
  "City of Vancouver Open Data — Property parcel polygons";
const zoningSource =
  "City of Vancouver Open Data — Zoning districts and labels";
const taxSource = "City of Vancouver Open Data — Property tax report";

const unsupportedMunicipalityMarkers = [
  "WEST VANCOUVER",
  "NORTH VANCOUVER",
  "BURNABY",
  "SURREY",
  "RICHMOND",
  "COQUITLAM",
  "PORT COQUITLAM",
  "PORT MOODY",
  "NEW WESTMINSTER",
  "DELTA",
  "LANGLEY",
  "WHITE ROCK",
  "MAPLE RIDGE",
  "PITT MEADOWS",
] as const;

type VancouverProviderOptions = {
  fetchImpl?: typeof fetch;
  apiBaseUrl?: string;
  timeoutMs?: number;
};

type DatasetResponse = {
  totalCount: number;
  results: unknown[];
};

type ParsedAddress = {
  civicNumber: string;
  streetName: string;
  normalizedAddress: string;
};

type ParcelRecord = {
  civicNumber: string;
  streetName: string;
  taxCoordinate: string;
  siteId: string;
  geometry: GeoJsonGeometry;
  centroid: {
    latitude: number;
    longitude: number;
  };
};

type ZoningRecord = {
  district: string;
  classification: string;
  category: string;
  cd1Designation?: string;
};

type TaxSummary = {
  legalType: string;
  zoningDistrict?: string;
  zoningClassification?: string;
  latestReportYear: string;
};

class VancouverDataError extends Error {
  constructor(
    message: string,
    readonly failureCode:
      | "MUNICIPAL_DATA_UNAVAILABLE"
      | "MUNICIPAL_DATA_CONFLICT",
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function normalizeSubmittedAddress(address: string) {
  return address.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function removeAddressContext(address: string) {
  return address
    .toUpperCase()
    .replace(/[.,]/g, " ")
    .replace(
      /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVWXYZ][ -]?\d[ABCEGHJ-NPRSTVWXYZ]\d\b/g,
      " ",
    )
    .replace(/\b(?:CANADA|BRITISH COLUMBIA|BC|VANCOUVER)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStreetName(street: string) {
  const directionAliases: Record<string, string> = {
    EAST: "E",
    NORTH: "N",
    SOUTH: "S",
    WEST: "W",
  };
  const suffixAliases: Record<string, string> = {
    AVENUE: "AV",
    BOULEVARD: "BLVD",
    CIRCLE: "CIR",
    COURT: "CT",
    CRESCENT: "CRES",
    DRIVE: "DR",
    HIGHWAY: "HWY",
    LANE: "LN",
    PLACE: "PL",
    ROAD: "RD",
    STREET: "ST",
    TERRACE: "TERR",
  };
  const tokens = street
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (!tokens.length) return "";
  tokens[0] = directionAliases[tokens[0]] ?? tokens[0];
  const lastIndex = tokens.length - 1;
  tokens[lastIndex] =
    suffixAliases[tokens[lastIndex]] ??
    directionAliases[tokens[lastIndex]] ??
    tokens[lastIndex];
  return tokens.join(" ");
}

export function parseVancouverAddress(address: string): ParsedAddress | null {
  const submitted = normalizeSubmittedAddress(address);
  if (!submitted) return null;
  let localAddress = removeAddressContext(submitted);
  localAddress = localAddress
    .replace(/^(?:UNIT|SUITE)\s+[A-Z0-9-]+\s+/i, "")
    .replace(/^#?[A-Z0-9]+\s*-\s*(?=\d)/i, "");
  const match = localAddress.match(/^(\d+[A-Z]?)\s+(.+)$/);
  if (!match) return null;
  const civicNumber = match[1];
  const streetName = normalizeStreetName(match[2]);
  if (!/^\d+[A-Z]?$/.test(civicNumber) || !streetName) return null;
  return {
    civicNumber,
    streetName,
    normalizedAddress: `${civicNumber} ${streetName}, Vancouver, BC`,
  };
}

export function isPotentialVancouverAddress(address: string) {
  const normalized = normalizeSubmittedAddress(address).toUpperCase();
  if (
    unsupportedMunicipalityMarkers.some((marker) =>
      normalized.includes(marker),
    )
  ) {
    return false;
  }
  return true;
}

function parseDatasetResponse(value: unknown): DatasetResponse {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new VancouverDataError(
      "The City dataset returned an unexpected response.",
      "MUNICIPAL_DATA_UNAVAILABLE",
    );
  }
  const totalCount =
    typeof value.total_count === "number"
      ? value.total_count
      : value.results.length;
  return { totalCount, results: value.results };
}

function parseGeometry(value: unknown): GeoJsonGeometry | undefined {
  if (!isRecord(value)) return undefined;
  const candidate =
    value.type === "Feature" && isRecord(value.geometry)
      ? value.geometry
      : value;
  if (
    (candidate.type !== "Polygon" && candidate.type !== "MultiPolygon") ||
    !Array.isArray(candidate.coordinates)
  ) {
    return undefined;
  }
  return {
    type: candidate.type,
    coordinates: candidate.coordinates,
  };
}

function parseCentroid(value: unknown) {
  if (!isRecord(value)) return undefined;
  const latitude = Number(value.lat);
  const longitude = Number(value.lon);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < 49.1 ||
    latitude > 49.4 ||
    longitude < -123.4 ||
    longitude > -122.9
  ) {
    return undefined;
  }
  return { latitude, longitude };
}

function parseParcel(value: unknown): ParcelRecord {
  if (!isRecord(value)) {
    throw new VancouverDataError(
      "The matched parcel record could not be read.",
      "MUNICIPAL_DATA_CONFLICT",
    );
  }
  const civicNumber = readString(value.civic_number);
  const streetName = readString(value.streetname);
  const taxCoordinate = readString(value.tax_coord);
  const siteId = readString(value.site_id);
  const geometry = parseGeometry(value.geom);
  const centroid = parseCentroid(value.geo_point_2d);
  if (
    !civicNumber ||
    !streetName ||
    !taxCoordinate ||
    !siteId ||
    !geometry ||
    !centroid
  ) {
    throw new VancouverDataError(
      "The matched parcel is missing required municipal identifiers or geometry.",
      "MUNICIPAL_DATA_CONFLICT",
    );
  }
  return {
    civicNumber,
    streetName,
    taxCoordinate,
    siteId,
    geometry,
    centroid,
  };
}

function parseZoning(value: unknown): ZoningRecord {
  if (!isRecord(value)) {
    throw new VancouverDataError(
      "The zoning record could not be read.",
      "MUNICIPAL_DATA_CONFLICT",
    );
  }
  const district = readString(value.zoning_district);
  const classification = readString(value.zoning_classification);
  const category = readString(value.zoning_category);
  const cd1Designation = readString(value.cd_1_number) || undefined;
  if (!district || !classification || !category) {
    throw new VancouverDataError(
      "The zoning record is missing its district or classification.",
      "MUNICIPAL_DATA_CONFLICT",
    );
  }
  return { district, classification, category, cd1Designation };
}

function parseTaxSummary(response: DatasetResponse): TaxSummary {
  const records = response.results.filter(isRecord);
  const reportYears = records
    .map((record) => readString(record.report_year))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
  const latestReportYear = reportYears[0];
  if (!latestReportYear) {
    throw new VancouverDataError(
      "No current property ownership record was available.",
      "MUNICIPAL_DATA_CONFLICT",
    );
  }
  const latest = records.filter(
    (record) => readString(record.report_year) === latestReportYear,
  );
  const legalTypes = new Set(
    latest.map((record) => readString(record.legal_type)).filter(Boolean),
  );
  const zoningDistricts = new Set(
    latest.map((record) => readString(record.zoning_district)).filter(Boolean),
  );
  const zoningClassifications = new Set(
    latest
      .map((record) => readString(record.zoning_classification))
      .filter(Boolean),
  );
  if (
    legalTypes.size !== 1 ||
    zoningDistricts.size > 1 ||
    zoningClassifications.size > 1
  ) {
    throw new VancouverDataError(
      "Current City property records contain conflicting ownership or zoning values.",
      "MUNICIPAL_DATA_CONFLICT",
    );
  }
  const legalType = [...legalTypes][0];
  if (!legalType) {
    throw new VancouverDataError(
      "The current City property record does not identify its legal type.",
      "MUNICIPAL_DATA_CONFLICT",
    );
  }
  return {
    legalType,
    zoningDistrict: [...zoningDistricts][0],
    zoningClassification: [...zoningClassifications][0],
    latestReportYear,
  };
}

function point(value: unknown): [number, number] | undefined {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    !Number.isFinite(Number(value[0])) ||
    !Number.isFinite(Number(value[1]))
  ) {
    return undefined;
  }
  return [Number(value[0]), Number(value[1])];
}

function ringAreaSquareMetres(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const points = value.map(point);
  if (points.some((candidate) => !candidate) || points.length < 4) {
    return undefined;
  }
  const coordinates = points as [number, number][];
  const averageLatitude =
    coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) /
    coordinates.length;
  const radius = 6_378_137;
  const latitudeScale = Math.PI / 180;
  const longitudeScale =
    latitudeScale * Math.cos(averageLatitude * latitudeScale);
  let area = 0;
  for (let index = 0; index < coordinates.length; index += 1) {
    const current = coordinates[index];
    const next = coordinates[(index + 1) % coordinates.length];
    const currentX = current[0] * longitudeScale * radius;
    const currentY = current[1] * latitudeScale * radius;
    const nextX = next[0] * longitudeScale * radius;
    const nextY = next[1] * latitudeScale * radius;
    area += currentX * nextY - nextX * currentY;
  }
  return Math.abs(area) / 2;
}

function polygonAreaSquareMetres(value: unknown) {
  if (!Array.isArray(value) || !value.length) return undefined;
  const outerArea = ringAreaSquareMetres(value[0]);
  if (outerArea === undefined) return undefined;
  const holes = value.slice(1).reduce((sum, ring) => {
    const area = ringAreaSquareMetres(ring);
    return area === undefined ? sum : sum + area;
  }, 0);
  return Math.max(0, outerArea - holes);
}

export function approximateGeometryAreaSquareMetres(
  geometry: GeoJsonGeometry,
) {
  if (geometry.type === "Polygon") {
    return polygonAreaSquareMetres(geometry.coordinates);
  }
  if (!Array.isArray(geometry.coordinates)) return undefined;
  const areas = geometry.coordinates.map(polygonAreaSquareMetres);
  if (areas.some((area) => area === undefined)) return undefined;
  return (areas as number[]).reduce((sum, area) => sum + area, 0);
}

function geometryComplexityReasons(
  geometry: GeoJsonGeometry,
  area?: number,
) {
  const reasons: string[] = [];
  const polygons =
    geometry.type === "MultiPolygon"
      ? Array.isArray(geometry.coordinates)
        ? geometry.coordinates
        : []
      : [geometry.coordinates];
  const rings = polygons.flatMap((polygon) =>
    Array.isArray(polygon) ? polygon : [],
  );
  const vertexCount = rings.reduce(
    (total, ring) => total + (Array.isArray(ring) ? ring.length : 0),
    0,
  );
  if (geometry.type === "MultiPolygon" || polygons.length > 1) {
    reasons.push("parcel geometry has multiple polygons");
  }
  if (rings.length > polygons.length) {
    reasons.push("parcel geometry contains interior rings");
  }
  if (vertexCount > 30) {
    reasons.push("parcel boundary is unusually detailed");
  }
  if (area === undefined) {
    reasons.push("parcel area could not be calculated reliably");
  } else if (area < 100 || area > 4_000) {
    reasons.push("parcel area is outside the conventional screening range");
  }
  return reasons;
}

function determineScreening({
  zoning,
  tax,
  complexityReasons,
}: {
  zoning: ZoningRecord;
  tax: TaxSummary;
  complexityReasons: string[];
}): { screening: PropertyScreening; reason: string } {
  const classification = zoning.classification.toUpperCase();
  const category = zoning.category.toUpperCase();
  const legalType = tax.legalType.toUpperCase();

  if (zoning.cd1Designation || category === "CD") {
    return {
      screening: "NEEDS REVIEW",
      reason: `The parcel is in ${zoning.district} ${zoning.classification} zoning. Site-specific CD-1 controls require manual review before any conventional laneway or carriage-home assessment.`,
    };
  }
  if (legalType === "STRATA" || legalType === "OTHER") {
    return {
      screening: "NEEDS REVIEW",
      reason: `The current City property record identifies the legal type as ${tax.legalType}. Ownership and parcel context require manual review.`,
    };
  }
  if (complexityReasons.length) {
    return {
      screening: "NEEDS REVIEW",
      reason: `The official parcel was found, but ${complexityReasons.join("; ")}. The site requires manual review.`,
    };
  }
  if (
    classification.includes("COMMERCIAL") ||
    classification.includes("INDUSTRIAL") ||
    ["C", "I", "IC", "MC"].includes(category)
  ) {
    return {
      screening: "UNLIKELY CONVENTIONAL CANDIDATE",
      reason: `The official zoning is ${zoning.district} (${zoning.classification}), which is clearly inconsistent with a conventional detached-property laneway or carriage-home lead.`,
    };
  }
  if (
    legalType === "LAND" &&
    (category === "R1" ||
      category === "RS" ||
      zoning.district.toUpperCase().startsWith("R1-") ||
      zoning.district.toUpperCase().startsWith("RS-"))
  ) {
    return {
      screening: "LIKELY CANDIDATE",
      reason: `One parcel matched City records. Its ${zoning.district} ${zoning.classification} zoning and LAND legal type make it appropriate for further House Delivery review. This is not a determination of development permission.`,
    };
  }
  return {
    screening: "NEEDS REVIEW",
    reason: `The official parcel and ${zoning.district} zoning were identified, but the available data is not specific enough for a conservative conventional-property classification.`,
  };
}

function failureResult({
  submittedAddress,
  normalizedAddress,
  reason,
  failureCode,
  dataSources = [parcelSource],
}: {
  submittedAddress: string;
  normalizedAddress?: string;
  reason: string;
  failureCode: PropertyReviewResult["failureCode"];
  dataSources?: string[];
}): PropertyReviewResult {
  return {
    submittedAddress,
    normalizedAddress: normalizedAddress || submittedAddress,
    municipality,
    appearsUnusuallyComplex: true,
    complexityReasons: [reason],
    screening: "NEEDS REVIEW",
    reason,
    dataSources,
    failureCode,
  };
}

export function createVancouverPropertyReviewProvider(
  options: VancouverProviderOptions = {},
): PropertyReviewProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiBaseUrl = (
    options.apiBaseUrl ??
    process.env.VANCOUVER_OPEN_DATA_API_URL ??
    defaultApiBaseUrl
  ).replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? 3_000;

  async function queryDataset(
    dataset: string,
    parameters: Record<string, string>,
  ) {
    const url = new URL(`${apiBaseUrl}/${dataset}/records`);
    for (const [name, value] of Object.entries(parameters)) {
      url.searchParams.set(name, value);
    }
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new VancouverDataError(
        `City of Vancouver Open Data request failed (${error instanceof Error ? error.name : "unknown error"}).`,
        "MUNICIPAL_DATA_UNAVAILABLE",
      );
    }
    if (!response.ok) {
      throw new VancouverDataError(
        `City of Vancouver Open Data returned HTTP ${response.status}.`,
        "MUNICIPAL_DATA_UNAVAILABLE",
      );
    }
    try {
      return parseDatasetResponse(await response.json());
    } catch (error) {
      if (error instanceof VancouverDataError) throw error;
      throw new VancouverDataError(
        "City of Vancouver Open Data returned unreadable data.",
        "MUNICIPAL_DATA_UNAVAILABLE",
      );
    }
  }

  return {
    municipality,
    supports: isPotentialVancouverAddress,
    async review(address) {
      const submittedAddress = normalizeSubmittedAddress(address);
      const parsedAddress = parseVancouverAddress(submittedAddress);
      if (!parsedAddress) {
        return failureResult({
          submittedAddress,
          reason:
            "The submitted address could not be normalized to a Vancouver civic number and street.",
          failureCode: "ADDRESS_INVALID",
        });
      }

      try {
        const parcelResponse = await queryDataset(
          "property-parcel-polygons",
          {
            where: `civic_number="${parsedAddress.civicNumber}" AND streetname="${parsedAddress.streetName}"`,
            limit: "10",
            select:
              "civic_number,streetname,tax_coord,site_id,geom,geo_point_2d",
          },
        );
        if (parcelResponse.totalCount === 0) {
          return failureResult({
            submittedAddress,
            normalizedAddress: parsedAddress.normalizedAddress,
            reason:
              "No exact parcel match was found in the City of Vancouver property parcel dataset.",
            failureCode: "ADDRESS_NOT_FOUND",
          });
        }
        if (
          parcelResponse.totalCount !== 1 ||
          parcelResponse.results.length !== 1
        ) {
          return failureResult({
            submittedAddress,
            normalizedAddress: parsedAddress.normalizedAddress,
            reason: `${parcelResponse.totalCount} parcel records matched the submitted address, so the correct parcel cannot be selected automatically.`,
            failureCode: "AMBIGUOUS_PARCEL",
          });
        }

        const parcel = parseParcel(parcelResponse.results[0]);
        const pointExpression = `geom'POINT(${parcel.centroid.longitude} ${parcel.centroid.latitude})'`;
        const [zoningResponse, taxResponse] = await Promise.all([
          queryDataset("zoning-districts-and-labels", {
            where: `intersects(geom, ${pointExpression})`,
            limit: "10",
            select:
              "object_id,zoning_classification,zoning_category,zoning_district,cd_1_number",
          }),
          queryDataset("property-tax-report", {
            where: `land_coordinate="${parcel.taxCoordinate}"`,
            order_by: "report_year DESC",
            limit: "100",
            select:
              "legal_type,land_coordinate,zoning_district,zoning_classification,report_year",
          }),
        ]);
        if (
          zoningResponse.totalCount !== 1 ||
          zoningResponse.results.length !== 1
        ) {
          throw new VancouverDataError(
            zoningResponse.totalCount === 0
              ? "No zoning polygon contains the parcel centroid."
              : "Multiple zoning polygons contain the parcel centroid.",
            "MUNICIPAL_DATA_CONFLICT",
          );
        }

        const zoning = parseZoning(zoningResponse.results[0]);
        const tax = parseTaxSummary(taxResponse);
        if (
          (tax.zoningDistrict &&
            tax.zoningDistrict.toUpperCase() !==
              zoning.district.toUpperCase()) ||
          (tax.zoningClassification &&
            tax.zoningClassification.toUpperCase() !==
              zoning.classification.toUpperCase())
        ) {
          throw new VancouverDataError(
            "The current property-tax record and zoning polygon contain conflicting zoning values.",
            "MUNICIPAL_DATA_CONFLICT",
          );
        }

        const approximateParcelAreaSquareMetres =
          approximateGeometryAreaSquareMetres(parcel.geometry);
        const complexityReasons = geometryComplexityReasons(
          parcel.geometry,
          approximateParcelAreaSquareMetres,
        );
        if (zoning.cd1Designation) {
          complexityReasons.push(
            `site-specific CD-1 designation ${zoning.cd1Designation}`,
          );
        }
        if (tax.legalType.toUpperCase() !== "LAND") {
          complexityReasons.push(
            `current City legal type is ${tax.legalType}`,
          );
        }
        const uniqueComplexityReasons = [...new Set(complexityReasons)];
        const screening = determineScreening({
          zoning,
          tax,
          complexityReasons: uniqueComplexityReasons,
        });

        return {
          submittedAddress,
          normalizedAddress: `${parcel.civicNumber} ${parcel.streetName}, Vancouver, BC`,
          municipality,
          zoningDistrict: zoning.district,
          zoningClassification: zoning.classification,
          zoningCategory: zoning.category,
          ...(zoning.cd1Designation
            ? { cd1Designation: zoning.cd1Designation }
            : {}),
          siteId: parcel.siteId,
          taxCoordinate: parcel.taxCoordinate,
          parcelCentroid: parcel.centroid,
          parcelGeometry: parcel.geometry,
          ...(approximateParcelAreaSquareMetres
            ? { approximateParcelAreaSquareMetres }
            : {}),
          legalType: tax.legalType,
          appearsUnusuallyComplex: uniqueComplexityReasons.length > 0,
          complexityReasons: uniqueComplexityReasons,
          screening: screening.screening,
          reason: screening.reason,
          dataSources: [parcelSource, zoningSource, taxSource],
        };
      } catch (error) {
        if (error instanceof VancouverDataError) {
          return failureResult({
            submittedAddress,
            normalizedAddress: parsedAddress.normalizedAddress,
            reason: error.message,
            failureCode: error.failureCode,
            dataSources: [parcelSource, zoningSource, taxSource],
          });
        }
        return failureResult({
          submittedAddress,
          normalizedAddress: parsedAddress.normalizedAddress,
          reason:
            "An unexpected error prevented the municipal property review from completing.",
          failureCode: "UNEXPECTED_ERROR",
          dataSources: [parcelSource, zoningSource, taxSource],
        });
      }
    },
  };
}
