import assert from "node:assert/strict";
import test from "node:test";

import { createGovernmentDataClient } from "@/lib/property-review/government-data-client";
import {
  createJurisdictionRouter,
  type JurisdictionResolution,
  type JurisdictionRouter,
} from "@/lib/property-review/jurisdiction-router";
import {
  getJurisdictionDescriptor,
  lowerMainlandJurisdictions,
  type LowerMainlandJurisdictionId,
} from "@/lib/property-review/provider-registry";
import { createLowerMainlandPropertyReviewProvider } from "@/lib/property-review/providers/lower-mainland";
import {
  createMunicipalZoningLookup,
  machineZoningJurisdictionIds,
  type MunicipalZoningLookup,
} from "@/lib/property-review/providers/municipal-zoning";
import {
  appendPropertyReviewToLeadEmail,
  buildPropertyCustomerEmail,
} from "@/lib/property-review/email";
import type {
  PropertyReviewProvider,
  PropertyReviewResult,
} from "@/lib/property-review/types";

const checkedAt = "2026-09-29T19:00:00.000Z";
const silentLogger = { info() {}, error() {} };
const noZoningLookup: MunicipalZoningLookup = async () => ({
  status: "NOT_CONFIGURED",
});

const auditAddresses: Record<LowerMainlandJurisdictionId, string> = {
  anmore: "2697 Sunnyside Road, Anmore, BC",
  belcarra: "4084 Bedwell Bay Road, Belcarra, BC",
  "bowen-island": "981 Artisan Lane, Bowen Island, BC",
  burnaby: "4949 Canada Way, Burnaby, BC",
  coquitlam: "3000 Guildford Way, Coquitlam, BC",
  delta: "4500 Clarence Taylor Crescent, Delta, BC",
  "langley-city": "20399 Douglas Crescent, Langley, BC",
  "langley-township": "20338 65 Avenue, Langley, BC",
  "lions-bay": "400 Centre Road, Lions Bay, BC",
  "maple-ridge": "11995 Haney Place, Maple Ridge, BC",
  "new-westminster": "511 Royal Avenue, New Westminster, BC",
  "north-vancouver-city": "141 West 14th Street, North Vancouver, BC",
  "north-vancouver-district": "355 West Queens Road, North Vancouver, BC",
  "pitt-meadows": "12007 Harris Road, Pitt Meadows, BC",
  "port-coquitlam": "2580 Shaughnessy Street, Port Coquitlam, BC",
  "port-moody": "100 Newport Drive, Port Moody, BC",
  richmond: "6911 No. 3 Road, Richmond, BC",
  surrey: "13450 104 Avenue, Surrey, BC",
  vancouver: "3193 Kitchener Street, Vancouver, BC",
  "west-vancouver": "750 17th Street, West Vancouver, BC",
  "white-rock": "15322 Buena Vista Avenue, White Rock, BC",
  "metro-electoral-area-a": "2329 West Mall, Vancouver, BC",
  "tsawwassen-first-nation": "1926 Tsawwassen Drive, Delta, BC",
  abbotsford: "32315 South Fraser Way, Abbotsford, BC",
  chilliwack: "8550 Young Road, Chilliwack, BC",
  "harrison-hot-springs": "495 Hot Springs Road, Harrison Hot Springs, BC",
  hope: "325 Wallace Street, Hope, BC",
  kent: "7170 Cheam Avenue, Agassiz, BC",
  mission: "8645 Stave Lake Street, Mission, BC",
  "fvrd-electoral-area": "47585 Trans Canada Highway, Boston Bar, BC",
  "first-nation-reserve": "6735 Salish Drive, Vancouver, BC",
};

function resolutionFor(
  id: LowerMainlandJurisdictionId,
  address = auditAddresses[id],
): JurisdictionResolution {
  const descriptor = getJurisdictionDescriptor(id);
  return {
    descriptor,
    country: "Canada",
    province: "British Columbia",
    regionalArea: descriptor.regionalArea,
    normalizedAddress: address,
    primaryCivicAddress: address,
    localityName: descriptor.name,
    localityType:
      descriptor.kind === "FIRST_NATION" ? "Indian Reserve" : "City",
    score: 100,
    matchPrecision: "CIVIC_NUMBER",
    centroid: { latitude: 49.25, longitude: -122.9 },
    confidence: "HIGH",
    sourceEvidence: [
      {
        name: "Province of British Columbia Address Geocoder",
        url: "https://digital.gov.bc.ca/bcgov-common-components/bc-address-geocoder/",
        kind: "ADDRESS",
        checkedAt,
        confidence: "HIGH",
      },
    ],
  };
}

function routerFor(id: LowerMainlandJurisdictionId): JurisdictionRouter {
  return {
    route: async () => ({ ok: true, resolution: resolutionFor(id) }),
  };
}

function vancouverFixtureProvider(): PropertyReviewProvider {
  return {
    municipality: "City of Vancouver",
    supports: () => true,
    review: async (address) => {
      const strata = /(?:#|UNIT\s*)106/i.test(address);
      return {
        submittedAddress: address,
        normalizedAddress: strata
          ? "1288 MARINASIDE CRESCENT, Vancouver, BC"
          : "3193 KITCHENER ST, Vancouver, BC",
        municipality: "City of Vancouver",
        zoningDistrict: strata ? "CD-1 (297)" : "R1-1",
        propertyType: strata
          ? "Strata unit / multifamily property"
          : "Non-strata residential parcel",
        strataIndicator: strata ? "YES" : "NO",
        multifamilyIndicator: strata,
        commercialIndicator: false,
        industrialIndicator: false,
        appearsUnusuallyComplex: false,
        complexityReasons: [],
        leadState: strata ? "RED" : "GREEN",
        leadStateLabel: strata
          ? "NOT A CONVENTIONAL FIT"
          : "PROMISING PROPERTY",
        recommendedNextAction: strata
          ? "NO IMMEDIATE ACTION REQUIRED"
          : "CONTACT / AUTOMATED NURTURE ACTIVE",
        matchedRules: [
          {
            ruleId: strata ? "VAN-RED-STRATA-001" : "VAN-GREEN-R1-001",
            source: "City of Vancouver official fixtures",
            explanation: strata
              ? "Official City records identify a strata property."
              : "Official City records identify a non-strata R1-1 parcel.",
            result: strata ? "RED" : "GREEN",
            confidence: "HIGH",
          },
        ],
        screening: strata
          ? "UNLIKELY CONVENTIONAL CANDIDATE"
          : "LIKELY CANDIDATE",
        reason: strata
          ? "Official City records identify a strata property."
          : "Official City records identify a non-strata R1-1 parcel.",
        dataSources: ["City of Vancouver official fixtures"],
      } satisfies PropertyReviewResult;
    },
  };
}

for (const jurisdiction of lowerMainlandJurisdictions) {
  test(`${jurisdiction.name}: exact civic address resolves conservatively`, async () => {
    const provider = createLowerMainlandPropertyReviewProvider({
      router: routerFor(jurisdiction.id),
      zoningLookup: noZoningLookup,
      vancouverProvider: vancouverFixtureProvider(),
      now: () => new Date(checkedAt),
      logger: silentLogger,
    });
    const result = await provider.review(auditAddresses[jurisdiction.id]);

    assert.equal(result.municipality, jurisdiction.name);
    assert.equal(result.jurisdiction, jurisdiction.name);
    assert.equal(result.providerStatus, jurisdiction.status);
    assert.ok(result.sourceEvidence?.length);
    if (jurisdiction.id === "vancouver") {
      assert.equal(result.leadState, "GREEN");
      assert.equal(result.matchedRules[0].ruleId, "VAN-GREEN-R1-001");
    } else {
      assert.equal(result.leadState, "YELLOW");
      assert.equal(
        result.failureCode,
        jurisdiction.status === "SPECIAL_JURISDICTION"
          ? "SPECIAL_JURISDICTION_REVIEW"
          : "MUNICIPAL_RULE_REVIEW_REQUIRED",
      );
    }
  });

  test(`${jurisdiction.name}: unit or unsuitable-looking input is never guessed from text`, async () => {
    const provider = createLowerMainlandPropertyReviewProvider({
      router: routerFor(jurisdiction.id),
      zoningLookup: noZoningLookup,
      vancouverProvider: vancouverFixtureProvider(),
      logger: silentLogger,
    });
    const address =
      jurisdiction.id === "vancouver"
        ? "1288 Marinaside Crescent #106, Vancouver, BC"
        : `Unit 106, ${auditAddresses[jurisdiction.id]}`;
    const result = await provider.review(address);

    if (jurisdiction.id === "vancouver") {
      assert.equal(result.leadState, "RED");
      assert.equal(result.matchedRules[0].ruleId, "VAN-RED-STRATA-001");
    } else {
      assert.equal(result.leadState, "YELLOW");
      assert.notEqual(result.leadState, "RED");
    }
  });

  test(`${jurisdiction.name}: invalid address remains a retained Yellow lead`, async () => {
    const router: JurisdictionRouter = {
      route: async () => ({
        ok: false,
        normalizedAddress: "not a civic address",
        municipality: "Lower Mainland jurisdiction requires review",
        reason: "No exact official civic address was found.",
        failureCode: "ADDRESS_NOT_FOUND",
        sourceEvidence: [],
      }),
    };
    const provider = createLowerMainlandPropertyReviewProvider({
      router,
      logger: silentLogger,
    });
    const result = await provider.review("not a civic address");

    assert.equal(result.leadState, "YELLOW");
    assert.equal(result.failureCode, "ADDRESS_NOT_FOUND");
  });

  test(`${jurisdiction.name}: provider failure remains a retained Yellow lead`, async () => {
    const provider = createLowerMainlandPropertyReviewProvider({
      router: {
        route: async () => {
          throw new Error(`simulated ${jurisdiction.id} provider failure`);
        },
      },
      logger: silentLogger,
    });
    const result = await provider.review(auditAddresses[jurisdiction.id]);

    assert.equal(result.leadState, "YELLOW");
    assert.equal(result.failureCode, "UNEXPECTED_ERROR");
    assert.match(result.reason, /lead was retained/i);
  });
}

function geocoderResponse(input: {
  fullAddress?: string;
  localityName: string;
  localityType?: string;
  electoralArea?: string;
  score?: number;
  matchPrecision?: string;
}) {
  return {
    version: "4.5.4",
    baseDataDate: "2026-07-07",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-123.1, 49.25] },
        properties: {
          fullAddress:
            input.fullAddress ?? `100 Civic Road, ${input.localityName}, BC`,
          localityName: input.localityName,
          localityType: input.localityType ?? "City",
          electoralArea: input.electoralArea ?? "",
          score: input.score ?? 100,
          matchPrecision: input.matchPrecision ?? "CIVIC_NUMBER",
          siteID: "official-address-site",
          official: true,
        },
      },
    ],
  };
}

test("router distinguishes every Metro municipality using the official boundary result", async () => {
  const metroJurisdictions = lowerMainlandJurisdictions.filter(
    (jurisdiction) => jurisdiction.boundaryName,
  );
  for (const jurisdiction of metroJurisdictions) {
    const dataClient = {
      getJson: async <T,>(
        _url: URL,
        options: { operation: string },
      ): Promise<T> =>
        (options.operation === "address_lookup"
          ? geocoderResponse({ localityName: "Metro Vancouver" })
          : {
              features: [
                { attributes: { FullName: jurisdiction.boundaryName } },
              ],
            }) as T,
    };
    const result = await createJurisdictionRouter({
      dataClient,
      now: () => new Date(checkedAt),
    }).route(auditAddresses[jurisdiction.id]);

    assert.equal(result.ok, true, jurisdiction.name);
    if (result.ok) assert.equal(result.resolution.descriptor.id, jurisdiction.id);
  }
});

test("router distinguishes every Fraser Valley municipality from authoritative geocoder locality", async () => {
  const fraserMunicipalities = lowerMainlandJurisdictions.filter(
    (jurisdiction) => jurisdiction.localityNames?.length,
  );
  for (const jurisdiction of fraserMunicipalities) {
    let calls = 0;
    const dataClient = {
      getJson: async <T,>(): Promise<T> => {
        calls += 1;
        return geocoderResponse({
          localityName: jurisdiction.localityNames![0],
        }) as T;
      },
    };
    const result = await createJurisdictionRouter({ dataClient }).route(
      auditAddresses[jurisdiction.id],
    );

    assert.equal(result.ok, true, jurisdiction.name);
    if (result.ok) assert.equal(result.resolution.descriptor.id, jurisdiction.id);
    assert.equal(
      calls,
      3,
      "Only address and the two special-jurisdiction boundaries should be queried",
    );
  }
});

test("router keeps UBC/UEL in Electoral Area A when no municipal polygon matches", async () => {
  const dataClient = {
    getJson: async <T,>(
      _url: URL,
      options: { operation: string },
    ): Promise<T> =>
      (options.operation === "address_lookup"
        ? geocoderResponse({ localityName: "Vancouver" })
        : { features: [] }) as T,
  };
  const result = await createJurisdictionRouter({ dataClient }).route(
    auditAddresses["metro-electoral-area-a"],
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.resolution.descriptor.id, "metro-electoral-area-a");
    assert.equal(result.resolution.descriptor.status, "SPECIAL_JURISDICTION");
  }
});

test("router isolates FVRD electoral areas before applying any municipality", async () => {
  const result = await createJurisdictionRouter({
    dataClient: {
      getJson: async <T,>(): Promise<T> =>
        geocoderResponse({
          localityName: "Deroche",
          electoralArea: "Fraser Valley Regional District Electoral Area G",
        }) as T,
    },
  }).route(auditAddresses["fvrd-electoral-area"]);

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.resolution.descriptor.id, "fvrd-electoral-area");
});

test("router isolates identifiable reserve lands before municipal boundaries", async () => {
  let calls = 0;
  const result = await createJurisdictionRouter({
    dataClient: {
      getJson: async <T,>(): Promise<T> => {
        calls += 1;
        return geocoderResponse({
          localityName: "Musqueam 2",
          localityType: "Indian Reserve",
        }) as T;
      },
    },
  }).route(auditAddresses["first-nation-reserve"]);

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.resolution.descriptor.id, "first-nation-reserve");
  assert.equal(calls, 1);
});

test("router lets the provincial reserve boundary override a municipal postal locality", async () => {
  const result = await createJurisdictionRouter({
    dataClient: {
      getJson: async <T,>(
        _url: URL,
        options: { operation: string },
      ): Promise<T> => {
        if (options.operation === "address_lookup") {
          return geocoderResponse({ localityName: "Vancouver" }) as T;
        }
        if (options.operation === "reserve_boundary_lookup") {
          return {
            features: [{ attributes: { NGLSHNM: "MUSQUEAM 2" } }],
          } as T;
        }
        return { features: [] } as T;
      },
    },
  }).route(auditAddresses["first-nation-reserve"]);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.resolution.descriptor.id, "first-nation-reserve");
    assert.equal(result.resolution.identifiedAuthority, "MUSQUEAM 2");
  }
});

test("router rejects low-precision and ambiguous address matches", async () => {
  const lowPrecision = await createJurisdictionRouter({
    dataClient: {
      getJson: async <T,>(): Promise<T> =>
        geocoderResponse({
          localityName: "Burnaby",
          matchPrecision: "STREET",
        }) as T,
    },
  }).route("Canada Way, Burnaby, BC");
  assert.equal(lowPrecision.ok, false);
  if (!lowPrecision.ok) assert.equal(lowPrecision.failureCode, "ADDRESS_NOT_FOUND");

  const response = geocoderResponse({ localityName: "Burnaby" });
  response.features.push({
    ...response.features[0],
    properties: {
      ...response.features[0].properties,
      fullAddress: "102 Civic Road, Burnaby, BC",
      score: 99,
    },
  });
  const ambiguous = await createJurisdictionRouter({
    dataClient: { getJson: async <T,>(): Promise<T> => response as T },
  }).route("100 Civic Road, Burnaby, BC");
  assert.equal(ambiguous.ok, false);
  if (!ambiguous.ok) {
    assert.equal(ambiguous.failureCode, "JURISDICTION_AMBIGUOUS");
  }
});

test("government data client retries retryable failures, caches success, and deduplicates calls", async () => {
  let calls = 0;
  const client = createGovernmentDataClient({
    fetchImpl: async () => {
      calls += 1;
      return calls === 1
        ? new Response(null, { status: 503 })
        : Response.json({ ok: true });
    },
    retryCount: 1,
    retryDelayMs: 0,
    sleep: async () => {},
    logger: silentLogger,
  });
  const url = new URL("https://government.example.test/data");
  const options = {
    provider: "Official test provider",
    operation: "property_lookup",
    cacheKey: "official:test",
  };

  const first = await client.getJson<{ ok: boolean }>(url, options);
  const second = await client.getJson<{ ok: boolean }>(url, options);

  assert.deepEqual(first, { ok: true });
  assert.deepEqual(second, { ok: true });
  assert.equal(calls, 2);
});

test("regional result cache avoids duplicate municipal work", async () => {
  let calls = 0;
  const provider = createLowerMainlandPropertyReviewProvider({
    router: {
      route: async () => {
        calls += 1;
        return { ok: true, resolution: resolutionFor("burnaby") };
      },
    },
    zoningLookup: noZoningLookup,
    logger: silentLogger,
  });

  await provider.review(auditAddresses.burnaby);
  await provider.review(auditAddresses.burnaby);
  assert.equal(calls, 1);
});

test("regional Yellow customer and internal emails keep technical detail separated", async () => {
  const review = await createLowerMainlandPropertyReviewProvider({
    router: routerFor("burnaby"),
    zoningLookup: async () => ({
      status: "MATCHED",
      zoningDistrict: "R1",
      zoningClassification: "Residential District",
    }),
    now: () => new Date(checkedAt),
    logger: silentLogger,
  }).review(auditAddresses.burnaby);
  const customer = buildPropertyCustomerEmail({
    firstName: "Preview",
    review,
    origin: "https://preview.example.test",
  });
  const internal = appendPropertyReviewToLeadEmail("Original lead", review);

  assert.equal(customer.snapshot.headline, "We’re taking a closer look.");
  assert.equal(customer.snapshot.municipality, "City of Burnaby");
  assert.equal(customer.snapshot.jurisdiction, "City of Burnaby");
  assert.equal(
    customer.snapshot.sourceAttribution,
    "Jurisdiction resolved from official government data",
  );
  assert.doesNotMatch(customer.text, /MUNICIPAL_RULE_REVIEW_REQUIRED|ArcGIS/);
  assert.match(internal, /Municipality: City of Burnaby/);
  assert.match(internal, /Provider status: PARTIAL/);
  assert.match(internal, /Zoning: R1/);
  assert.match(internal, /Use: QUERIED/);
  assert.match(internal, /MUNICIPAL_RULE_REVIEW_REQUIRED/);
});

test("machine zoning providers exactly match the PARTIAL registry", () => {
  const partialIds = lowerMainlandJurisdictions
    .filter((jurisdiction) => jurisdiction.status === "PARTIAL")
    .map((jurisdiction) => jurisdiction.id)
    .sort();

  assert.deepEqual([...machineZoningJurisdictionIds].sort(), partialIds);
});

test("municipal zoning lookup queries the resolved point and returns one official match", async () => {
  let requestedUrl: URL | undefined;
  const lookup = createMunicipalZoningLookup({
    getJson: async <T,>(url: URL): Promise<T> => {
      requestedUrl = url;
      return {
        features: [
          {
            attributes: {
              ZONECODE: "R1",
              CD_ZONE: "Residential District",
            },
          },
        ],
      } as T;
    },
  });

  const result = await lookup(resolutionFor("burnaby"));

  assert.deepEqual(result, {
    status: "MATCHED",
    zoningDistrict: "R1",
    zoningClassification: "Residential District",
  });
  assert.equal(requestedUrl?.searchParams.get("geometry"), "-122.9,49.25");
  assert.equal(requestedUrl?.searchParams.get("inSR"), "4326");
  assert.equal(requestedUrl?.searchParams.get("returnGeometry"), "false");
});

test("municipal zoning lookup safely rejects conflicting polygons", async () => {
  const lookup = createMunicipalZoningLookup({
    getJson: async <T,>(): Promise<T> =>
      ({
        features: [
          { attributes: { ZONECODE: "R1" } },
          { attributes: { ZONECODE: "RM3" } },
        ],
      }) as T,
  });

  const result = await lookup(resolutionFor("burnaby"));

  assert.equal(result.status, "UNAVAILABLE");
  if (result.status === "UNAVAILABLE") {
    assert.equal(result.failureCode, "MUNICIPAL_DATA_CONFLICT");
  }
});
