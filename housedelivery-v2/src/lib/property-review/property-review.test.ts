import assert from "node:assert/strict";
import test from "node:test";

import {
  appendPropertyReviewToLeadEmail,
  buildPropertyCustomerEmail,
  buildPropertyEmailMessages,
} from "@/lib/property-review/email";
import {
  createVancouverPropertyReviewProvider,
  parseVancouverAddress,
} from "@/lib/property-review/providers/vancouver";
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

const marinasideParcel = {
  civic_number: "1288",
  streetname: "MARINASIDE CRESCENT",
  tax_coord: "16161298",
  site_id: "LMS2781",
  geo_point_2d: {
    lat: 49.2720691815906,
    lon: -123.12037049098276,
  },
  geom: {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-123.121, 49.2715],
          [-123.1198, 49.2715],
          [-123.1198, 49.2726],
          [-123.121, 49.2726],
          [-123.121, 49.2715],
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
  assert.equal(result.leadState, "GREEN");
  assert.equal(result.propertyType, "Non-strata residential parcel");
  assert.equal(result.strataIndicator, "NO");
  assert.equal(result.matchedRules[0].ruleId, "VAN-GREEN-R1-001");
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
    /civic_number="3193" AND search\(streetname,"KITCHENER"\)/,
  );
  assert.match(
    requests[1].searchParams.get("where") ?? "",
    /intersects\(geom, geom'POINT\(-123\.036807660654 49\.272541024189685\)'\)/,
  );
});

test("classifies 1480 Howe Street strata context as not a conventional fit", async () => {
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

  assert.equal(result.screening, "UNLIKELY CONVENTIONAL CANDIDATE");
  assert.equal(result.leadState, "RED");
  assert.equal(result.cd1Designation, "580");
  assert.equal(result.siteId, "EPS5752");
  assert.equal(result.legalType, "STRATA");
  assert.equal(result.strataIndicator, "YES");
  assert.match(result.reason, /not a conventional detached-lot/i);
});

test("normalizes common Vancouver unit and street-name variations", () => {
  const variations = [
    "1288 Marinaside Cres, 106, Vancouver",
    "Unit 106, 1288 Marinaside Cres",
    "#106 - 1288 Marinaside Cres",
    "106-1288 Marinaside Crescent",
    "1288 Marinaside Crescent #106",
  ];

  for (const address of variations) {
    const parsed = parseVancouverAddress(address);
    assert.ok(parsed, address);
    assert.equal(parsed.civicNumber, "1288", address);
    assert.equal(parsed.streetName, "MARINASIDE CRES", address);
    assert.equal(parsed.streetSearchName, "MARINASIDE", address);
    assert.equal(parsed.unitNumber, "106", address);
  }

  const noUnit = parseVancouverAddress(
    "1288 Marinaside Crescent Vancouver BC",
  );
  assert.ok(noUnit);
  assert.equal(noUnit.unitNumber, undefined);
  assert.equal(noUnit.civicNumber, "1288");

  const numericStreet = parseVancouverAddress(
    "1288 106 Street, Vancouver, BC",
  );
  assert.ok(numericStreet);
  assert.equal(numericStreet.unitNumber, undefined);
  assert.equal(numericStreet.civicNumber, "1288");
  assert.equal(numericStreet.streetName, "106 ST");
});

test("resolves both required Marinaside unit formats to the underlying strata parcel", async () => {
  const { provider, requests } = providerFor({
    parcel: [marinasideParcel],
    zoning: [
      {
        zoning_district: "CD-1 (297)",
        zoning_classification: "Comprehensive Development",
        zoning_category: "CD",
        cd_1_number: 297,
      },
    ],
    tax: [
      {
        legal_type: "STRATA",
        zoning_district: "CD-1 (297)",
        zoning_classification: "Comprehensive Development",
        report_year: 2026,
      },
    ],
  });

  for (const address of [
    "1288 Marinaside Cres, 106, Vancouver",
    "1288 Marinaside Crescent #106",
  ]) {
    const result = await provider.review(address);
    assert.equal(
      result.normalizedAddress,
      "1288 MARINASIDE CRESCENT, Vancouver, BC",
    );
    assert.equal(result.submittedAddress, address);
    assert.equal(result.submittedUnit, "106");
    assert.equal(result.siteId, "LMS2781");
    assert.equal(result.taxCoordinate, "16161298");
    assert.equal(result.zoningDistrict, "CD-1 (297)");
    assert.equal(result.legalType, "STRATA");
    assert.equal(result.propertyType, "Strata unit / multifamily property");
    assert.equal(result.leadState, "RED");
    assert.equal(result.matchedRules[0].ruleId, "VAN-RED-STRATA-001");
  }

  assert.match(
    requests[0].searchParams.get("where") ?? "",
    /civic_number="1288" AND search\(streetname,"MARINASIDE"\)/,
  );
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
  const customerEmail = buildPropertyCustomerEmail({
    firstName: "Alex",
    review: result,
    origin: "https://preview.example.test",
  });
  assert.equal(customerEmail.snapshot.status, "yellow");
  assert.match(customerEmail.text, /Nothing is required from you right now/);
  assert.doesNotMatch(customerEmail.text, /MUNICIPALITY_NOT_SUPPORTED/);
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
  assert.equal(result.leadState, "YELLOW");
  assert.equal(result.failureCode, "MUNICIPAL_DATA_UNAVAILABLE");
  assert.match(enrichedEmail, /^={32}\nHOUSE DELIVERY PROPERTY LEAD/);
  assert.match(enrichedEmail, /YELLOW — HUMAN REVIEW REQUIRED/);
  assert.match(enrichedEmail, /ORIGINAL INQUIRY NOTIFICATION/);
  assert.ok(enrichedEmail.includes(leadEmail));
  assert.match(enrichedEmail, /City of Vancouver Open Data returned HTTP 503/);
  assert.match(enrichedEmail, /automated preliminary screening only/i);
});

test("builds separate branded customer and internal messages for every lead state", async () => {
  const green = await providerFor({
    parcel: [detachedParcel],
    zoning: [
      {
        zoning_district: "R1-1",
        zoning_classification: "Residential Inclusive",
        zoning_category: "R1",
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
  }).provider.review("3193 Kitchener Street, Vancouver");
  const red = await providerFor({
    parcel: [marinasideParcel],
    zoning: [
      {
        zoning_district: "CD-1 (297)",
        zoning_classification: "Comprehensive Development",
        zoning_category: "CD",
        cd_1_number: 297,
      },
    ],
    tax: [
      {
        legal_type: "STRATA",
        zoning_district: "CD-1 (297)",
        zoning_classification: "Comprehensive Development",
        report_year: 2026,
      },
    ],
  }).provider.review("1288 Marinaside Crescent #106");
  const yellow = await createPropertyReviewWorkflow([
    createVancouverPropertyReviewProvider({
      apiBaseUrl,
      fetchImpl: async () => new Response(null, { status: 503 }),
    }),
  ]).review("3193 Kitchener Street, Vancouver");

  const greenEmail = buildPropertyCustomerEmail({
    firstName: "Alex",
    review: green,
    origin: "https://preview.example.test",
  });
  const yellowEmail = buildPropertyCustomerEmail({
    firstName: "Alex",
    review: yellow,
    origin: "https://preview.example.test",
  });
  const redEmail = buildPropertyCustomerEmail({
    firstName: "Alex",
    review: red,
    origin: "https://preview.example.test",
  });

  assert.equal(
    greenEmail.subject,
    "We checked your property — here’s what we found",
  );
  assert.match(greenEmail.text, /YOUR PROPERTY LOOKS PROMISING/);
  assert.match(greenEmail.text, /Book My Property Review/);
  assert.equal(greenEmail.snapshot.status, "green");
  assert.equal(
    yellowEmail.subject,
    "We’ve started reviewing your property",
  );
  assert.match(yellowEmail.text, /Nothing is required from you right now/);
  assert.doesNotMatch(yellowEmail.text, /HTTP 503|MUNICIPAL_DATA_UNAVAILABLE/);
  assert.equal(yellowEmail.snapshot.status, "yellow");
  assert.equal(redEmail.subject, "We’ve reviewed your property");
  assert.match(redEmail.text, /does not appear to be a conventional detached/);
  assert.match(redEmail.text, /Check Another Property/);
  assert.equal(redEmail.snapshot.status, "red");

  const internalText = appendPropertyReviewToLeadEmail(
    "Original lead content",
    green,
    {
      firstName: "Alex",
      lastName: "Example",
      email: "alex@example.com",
      phone: "604-555-0100",
      considering: "Laneway / backyard home",
      ownership: "Yes — I own it",
    },
  );
  const messages = buildPropertyEmailMessages({
    from: "House Delivery <inquiries@housedelivery.ca>",
    customerEmail: "alex@example.com",
    internalRecipient: "hello@housedelivery.ca",
    internalCopyRecipient: "bfong@housedelivery.ca",
    internalSubject: "Laneway / carriage property review — Alex Example",
    internalText,
    customer: greenEmail,
  });

  assert.deepEqual(messages.internal.to, ["hello@housedelivery.ca"]);
  assert.deepEqual(messages.internal.cc, ["bfong@housedelivery.ca"]);
  assert.equal(messages.internal.reply_to, "alex@example.com");
  assert.match(messages.internal.text, /RULE DETAIL/);
  assert.deepEqual(messages.customer.to, ["alex@example.com"]);
  assert.equal(messages.customer.reply_to, "hello@housedelivery.ca");
  assert.equal("cc" in messages.customer, false);
  assert.doesNotMatch(messages.customer.text, /RULE DETAIL|Internal failure code/);
  assert.match(messages.customer.html, /HOUSE DELIVERY/);
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
