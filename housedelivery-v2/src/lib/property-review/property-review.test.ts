import assert from "node:assert/strict";
import test from "node:test";

import { appendPropertyReviewToLeadEmail } from "@/lib/property-review/email";
import { createVancouverPropertyReviewProvider } from "@/lib/property-review/providers/vancouver";
import type { PropertyReviewProvider } from "@/lib/property-review/types";
import { createPropertyReviewWorkflow } from "@/lib/property-review/workflow";

const apiBaseUrl = "https://city.example.test/datasets";

const detachedParcel = {
  civic_number: "3193",
  streetname: "KITCHENER ST",
  tax_coord: "61128981",
  site_id: "009091661",
  geo_point_2d: {
    lat: 49.272541024189685,
    lon: -123.036807660654,
  },
  geom: {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-123.0369, 49.2724],
          [-123.0367, 49.2724],
          [-123.0367, 49.2727],
          [-123.0369, 49.2727],
          [-123.0369, 49.2724],
        ],
      ],
    },
  },
};

const howeParcel = {
  civic_number: "1480",
  streetname: "HOWE ST",
  tax_coord: "12661632",
  site_id: "EPS5752",
  geo_point_2d: {
    lat: 49.27488587881166,
    lon: -123.13084131160124,
  },
  geom: {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-123.1312, 49.2745],
          [-123.1305, 49.2745],
          [-123.1305, 49.2752],
          [-123.1312, 49.2752],
          [-123.1312, 49.2745],
        ],
      ],
    },
  },
};

type DatasetFixtures = {
  parcel?: unknown[];
  parcelTotal?: number;
  zoning?: unknown[];
  zoningTotal?: number;
  tax?: unknown[];
};

function jsonResponse(results: unknown[], totalCount = results.length) {
  return new Response(
    JSON.stringify({ total_count: totalCount, results }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function fixtureFetch(fixtures: DatasetFixtures) {
  const requests: URL[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(
      input instanceof Request ? input.url : input.toString(),
    );
    requests.push(url);
    if (url.pathname.includes("property-parcel-polygons")) {
      return jsonResponse(
        fixtures.parcel ?? [],
        fixtures.parcelTotal ?? fixtures.parcel?.length ?? 0,
      );
    }
    if (url.pathname.includes("zoning-districts-and-labels")) {
      return jsonResponse(
        fixtures.zoning ?? [],
        fixtures.zoningTotal ?? fixtures.zoning?.length ?? 0,
      );
    }
    if (url.pathname.includes("property-tax-report")) {
      return jsonResponse(fixtures.tax ?? []);
    }
    return new Response(null, { status: 404 });
  };
  return { fetchImpl, requests };
}

function providerFor(fixtures: DatasetFixtures) {
  const mocked = fixtureFetch(fixtures);
  return {
    provider: createVancouverPropertyReviewProvider({
      fetchImpl: mocked.fetchImpl,
      apiBaseUrl,
    }),
    requests: mocked.requests,
  };
}

test("classifies an exact detached Vancouver parcel as a likely candidate", async () => {
  const { provider, requests } = providerFor({
    parcel: [detachedParcel],
    zoning: [
      {
        zoning_district: "R1-1",
        zoning_classification: "Residential Inclusive",
        zoning_category: "R1",
        cd_1_number: null,
      },
    ],
    tax: [
      {
        legal_type: "LAND",
        zoning_district: "R1-1",
        zoning_classification: "Residential Inclusive",
        report_year: 2026,
      },
    ],
  });

  const result = await provider.review(
    "3193 Kitchener Street, Vancouver, BC V5K 2A3",
  );

  assert.equal(result.screening, "LIKELY CANDIDATE");
  assert.equal(result.normalizedAddress, "3193 KITCHENER ST, Vancouver, BC");
  assert.equal(result.municipality, "City of Vancouver");
  assert.equal(result.zoningDistrict, "R1-1");
  assert.equal(result.zoningClassification, "Residential Inclusive");
  assert.equal(result.siteId, "009091661");
  assert.equal(result.taxCoordinate, "61128981");
  assert.ok((result.approximateParcelAreaSquareMetres ?? 0) > 100);
  assert.equal(result.appearsUnusuallyComplex, false);
  assert.equal(requests.length, 3);
  assert.match(
    requests[0].searchParams.get("where") ?? "",
    /civic_number="3193" AND streetname="KITCHENER ST"/,
  );
  assert.match(
    requests[1].searchParams.get("where") ?? "",
    /intersects\(geom, geom'POINT\(-123\.036807660654 49\.272541024189685\)'\)/,
  );
});

test("flags 1480 Howe Street CD-1 and strata context for manual review", async () => {
  const { provider } = providerFor({
    parcel: [howeParcel],
    zoning: [
      {
        zoning_district: "CD-1 (580)",
        zoning_classification: "Comprehensive Development",
        zoning_category: "CD",
        cd_1_number: 580,
      },
    ],
    tax: [
      {
        legal_type: "STRATA",
        zoning_district: "CD-1 (580)",
        zoning_classification: "Comprehensive Development",
        report_year: 2026,
      },
    ],
  });

  const result = await provider.review("Unit 1205 1480 Howe Street, Vancouver");

  assert.equal(result.screening, "NEEDS REVIEW");
  assert.equal(result.cd1Designation, "580");
  assert.equal(result.siteId, "EPS5752");
  assert.equal(result.legalType, "STRATA");
  assert.match(result.reason, /site-specific CD-1 controls/i);
});

test("returns needs review for an invalid address without calling City data", async () => {
  const { provider, requests } = providerFor({});

  const result = await provider.review("not a valid civic address");

  assert.equal(result.screening, "NEEDS REVIEW");
  assert.equal(result.failureCode, "ADDRESS_INVALID");
  assert.equal(requests.length, 0);
});

test("does not choose between ambiguous official parcel matches", async () => {
  const { provider, requests } = providerFor({
    parcel: [detachedParcel, { ...detachedParcel, site_id: "OTHER" }],
    parcelTotal: 2,
  });

  const result = await provider.review("3193 Kitchener St, Vancouver, BC");

  assert.equal(result.screening, "NEEDS REVIEW");
  assert.equal(result.failureCode, "AMBIGUOUS_PARCEL");
  assert.match(result.reason, /2 parcel records matched/i);
  assert.equal(requests.length, 1);
});

test("identifies an explicitly outside-Vancouver address as unsupported", async () => {
  let called = false;
  const provider = createVancouverPropertyReviewProvider({
    apiBaseUrl,
    fetchImpl: async () => {
      called = true;
      throw new Error("City data should not be queried");
    },
  });
  const workflow = createPropertyReviewWorkflow([provider]);

  const result = await workflow.review("1234 Hastings Street, Burnaby, BC");

  assert.equal(result.screening, "NEEDS REVIEW");
  assert.equal(result.municipality, "MUNICIPALITY NOT YET SUPPORTED");
  assert.equal(result.failureCode, "MUNICIPALITY_NOT_SUPPORTED");
  assert.equal(called, false);
});

test("keeps the lead and appends needs review when the City API fails", async () => {
  const failingProvider = createVancouverPropertyReviewProvider({
    apiBaseUrl,
    fetchImpl: async () => new Response(null, { status: 503 }),
  });
  const workflow = createPropertyReviewWorkflow([failingProvider]);
  const leadEmail = [
    "New House Delivery project review inquiry",
    "",
    "Name: Test Customer",
    "Email: customer@example.com",
    "Project location: 3193 Kitchener Street, Vancouver, BC",
  ].join("\n");

  const result = await workflow.review(
    "3193 Kitchener Street, Vancouver, BC",
  );
  const enrichedEmail = appendPropertyReviewToLeadEmail(leadEmail, result);

  assert.equal(result.screening, "NEEDS REVIEW");
  assert.equal(result.failureCode, "MUNICIPAL_DATA_UNAVAILABLE");
  assert.ok(enrichedEmail.startsWith(leadEmail));
  assert.match(enrichedEmail, /PRELIMINARY PROPERTY REVIEW/);
  assert.match(enrichedEmail, /City of Vancouver Open Data returned HTTP 503/);
  assert.match(enrichedEmail, /automated preliminary screening only/i);
});

test("converts an unexpected provider failure into an internal review result", async () => {
  const throwingProvider: PropertyReviewProvider = {
    municipality: "City of Vancouver",
    supports: () => true,
    review: async () => {
      throw new Error("unexpected failure");
    },
  };

  const result = await createPropertyReviewWorkflow([
    throwingProvider,
  ]).review("3193 Kitchener Street, Vancouver, BC");

  assert.equal(result.screening, "NEEDS REVIEW");
  assert.equal(result.failureCode, "UNEXPECTED_ERROR");
  assert.match(result.reason, /lead still requires manual review/i);
});
