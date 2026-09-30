import { createJurisdictionRouter } from "../src/lib/property-review/jurisdiction-router";
import { createGovernmentDataClient } from "../src/lib/property-review/government-data-client";
import { createMunicipalZoningLookup } from "../src/lib/property-review/providers/municipal-zoning";
import type { LowerMainlandJurisdictionId } from "../src/lib/property-review/provider-registry";

const officialCivicCheckpoints: ReadonlyArray<{
  id: LowerMainlandJurisdictionId;
  address: string;
}> = [
  { id: "anmore", address: "2697 Sunnyside Road, Anmore, BC" },
  { id: "belcarra", address: "4084 Bedwell Bay Road, Belcarra, BC" },
  { id: "bowen-island", address: "981 Artisan Lane, Bowen Island, BC" },
  { id: "burnaby", address: "4949 Canada Way, Burnaby, BC" },
  { id: "coquitlam", address: "3000 Guildford Way, Coquitlam, BC" },
  { id: "delta", address: "4500 Clarence Taylor Crescent, Delta, BC" },
  { id: "langley-city", address: "20399 Douglas Crescent, Langley, BC" },
  { id: "langley-township", address: "20338 65 Avenue, Langley, BC" },
  { id: "lions-bay", address: "400 Centre Road, Lions Bay, BC" },
  { id: "maple-ridge", address: "11995 Haney Place, Maple Ridge, BC" },
  { id: "new-westminster", address: "511 Royal Avenue, New Westminster, BC" },
  { id: "north-vancouver-city", address: "141 West 14th Street, North Vancouver, BC" },
  { id: "north-vancouver-district", address: "355 West Queens Road, North Vancouver, BC" },
  { id: "pitt-meadows", address: "12007 Harris Road, Pitt Meadows, BC" },
  { id: "port-coquitlam", address: "2580 Shaughnessy Street, Port Coquitlam, BC" },
  { id: "port-moody", address: "100 Newport Drive, Port Moody, BC" },
  { id: "richmond", address: "6911 No. 3 Road, Richmond, BC" },
  { id: "surrey", address: "13450 104 Avenue, Surrey, BC" },
  { id: "vancouver", address: "3193 Kitchener Street, Vancouver, BC" },
  { id: "west-vancouver", address: "750 17th Street, West Vancouver, BC" },
  { id: "white-rock", address: "15322 Buena Vista Avenue, White Rock, BC" },
  { id: "metro-electoral-area-a", address: "2329 West Mall, Vancouver, BC" },
  { id: "tsawwassen-first-nation", address: "1926 Tsawwassen Drive, Delta, BC" },
  { id: "abbotsford", address: "32315 South Fraser Way, Abbotsford, BC" },
  { id: "chilliwack", address: "8550 Young Road, Chilliwack, BC" },
  { id: "harrison-hot-springs", address: "495 Hot Springs Road, Harrison Hot Springs, BC" },
  { id: "hope", address: "325 Wallace Street, Hope, BC" },
  { id: "kent", address: "7170 Cheam Avenue, Agassiz, BC" },
  { id: "mission", address: "8645 Stave Lake Street, Mission, BC" },
  { id: "fvrd-electoral-area", address: "47585 Trans Canada Highway, Boston Bar, BC" },
  { id: "first-nation-reserve", address: "6735 Salish Drive, Vancouver, BC" },
];

async function main() {
  const dataClient = createGovernmentDataClient();
  const router = createJurisdictionRouter({ dataClient });
  const zoningLookup = createMunicipalZoningLookup(dataClient);
  const results: Array<{
    expected: string;
    actual: string;
    zoning: string;
    ok: boolean;
  }> = [];

  for (const checkpoint of officialCivicCheckpoints) {
    const result = await router.route(checkpoint.address);
    const actual = result.ok
      ? result.resolution.descriptor.id
      : `${result.failureCode}: ${result.reason}`;
    const zoning =
      result.ok && result.resolution.descriptor.status === "PARTIAL"
        ? await zoningLookup(result.resolution)
        : undefined;
    results.push({
      expected: checkpoint.id,
      actual,
      zoning:
        zoning?.status === "MATCHED"
          ? zoning.zoningDistrict
          : zoning?.status === "UNAVAILABLE"
            ? `${zoning.failureCode}: ${zoning.reason}`
            : "—",
      ok:
        result.ok &&
        actual === checkpoint.id &&
        (result.resolution.descriptor.status !== "PARTIAL" ||
          zoning?.status === "MATCHED"),
    });
  }

  console.table(results);
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

void main();
