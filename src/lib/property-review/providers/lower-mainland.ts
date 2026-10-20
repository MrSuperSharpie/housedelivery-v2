import {
  createJurisdictionRouter,
  type JurisdictionResolution,
  type JurisdictionRouter,
} from "@/lib/property-review/jurisdiction-router";
import {
  createGovernmentDataClient,
  type GovernmentDataClient,
} from "@/lib/property-review/government-data-client";
import type { JurisdictionDescriptor } from "@/lib/property-review/provider-registry";
import { createVancouverPropertyReviewProvider } from "@/lib/property-review/providers/vancouver";
import {
  createMunicipalZoningLookup,
  type MunicipalZoningLookup,
  type MunicipalZoningLookupResult,
} from "@/lib/property-review/providers/municipal-zoning";
import type {
  PropertyDataSourceEvidence,
  PropertyReviewProvider,
  PropertyReviewResult,
} from "@/lib/property-review/types";

type LowerMainlandProviderOptions = {
  router?: JurisdictionRouter;
  dataClient?: GovernmentDataClient;
  zoningLookup?: MunicipalZoningLookup;
  vancouverProvider?: PropertyReviewProvider;
  cacheTtlMs?: number;
  maximumCacheEntries?: number;
  now?: () => Date;
  logger?: Pick<Console, "info" | "error">;
};

type ResultCacheEntry = {
  expiresAt: number;
  result: PropertyReviewResult;
};

function normalizeAddress(address: string) {
  return address.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function sourceEvidenceFor(
  descriptor: JurisdictionDescriptor,
  checkedAt: string,
  zoningWasQueried = false,
): PropertyDataSourceEvidence[] {
  const confidence = descriptor.status === "FULL" ? "HIGH" : "MEDIUM";
  return [
    {
      name: descriptor.propertySource.name,
      url: descriptor.propertySource.url,
      kind: "PROPERTY",
      usage: descriptor.status === "FULL" ? "QUERIED" : "REFERENCE",
      checkedAt,
      confidence,
    },
    {
      name: descriptor.zoningSource.name,
      url: descriptor.zoningSource.url,
      kind: "ZONING",
      usage:
        descriptor.status === "FULL" || zoningWasQueried
          ? "QUERIED"
          : "REFERENCE",
      checkedAt,
      confidence,
    },
    {
      name: descriptor.ruleSource.name,
      url: descriptor.ruleSource.url,
      kind: "RULE",
      usage: descriptor.status === "FULL" ? "QUERIED" : "REFERENCE",
      checkedAt,
      confidence: descriptor.status === "FULL" ? "HIGH" : "LOW",
    },
  ];
}

function uniqueEvidence(evidence: PropertyDataSourceEvidence[]) {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    const key = `${item.kind}:${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function unresolvedResult(input: {
  submittedAddress: string;
  normalizedAddress: string;
  municipality: string;
  reason: string;
  failureCode: NonNullable<PropertyReviewResult["failureCode"]>;
  sourceEvidence: PropertyDataSourceEvidence[];
}): PropertyReviewResult {
  return {
    submittedAddress: input.submittedAddress,
    normalizedAddress: input.normalizedAddress || input.submittedAddress,
    municipality: input.municipality,
    propertyType: "Property type requires review",
    strataIndicator: "NOT CONFIDENTLY DETERMINED",
    multifamilyIndicator: false,
    commercialIndicator: false,
    industrialIndicator: false,
    appearsUnusuallyComplex: true,
    complexityReasons: [input.reason],
    leadState: "YELLOW",
    leadStateLabel: "HUMAN REVIEW REQUIRED",
    recommendedNextAction: "MANUAL PROPERTY REVIEW REQUIRED",
    matchedRules: [
      {
        ruleId: `REGIONAL-YELLOW-${input.failureCode}`,
        municipality: input.municipality,
        source:
          input.sourceEvidence.map((source) => source.name).join("; ") ||
          "Lower Mainland jurisdiction router",
        sourceAuthority: "House Delivery property review workflow",
        sourceDocument: "Lower Mainland provider status matrix",
        sourceSection: "Safe failure and unresolved-jurisdiction guard",
        lastChecked: "2026-09-29",
        machineCondition:
          "The authoritative address or boundary workflow did not complete with enough confidence for municipal rules.",
        explanation: input.reason,
        result: "YELLOW",
        confidence: "HIGH",
      },
    ],
    screening: "NEEDS REVIEW",
    reason: input.reason,
    dataSources: input.sourceEvidence.map((source) => source.name),
    sourceEvidence: input.sourceEvidence,
    failureCode: input.failureCode,
  };
}

function yellowJurisdictionResult(
  submittedAddress: string,
  resolution: JurisdictionResolution,
  checkedAt: string,
  zoning: MunicipalZoningLookupResult,
): PropertyReviewResult {
  const descriptor = resolution.descriptor;
  const special = descriptor.status === "SPECIAL_JURISDICTION";
  const authorityDetail = resolution.identifiedAuthority
    ? ` The official boundary source identified ${resolution.identifiedAuthority}.`
    : "";
  const zoningFailure = zoning.status === "UNAVAILABLE" ? zoning : undefined;
  const reason = special
    ? `${descriptor.name} has separate land-use governance.${authorityDetail} No neighbouring municipal zoning logic was applied, and House Delivery requires a jurisdiction-specific human review.`
    : zoningFailure
      ? `${zoningFailure.reason} House Delivery retained the lead for human review.`
      : zoning.status === "MATCHED"
        ? `Official ${descriptor.name} zoning identified ${zoning.zoningDistrict}${zoning.zoningClassification ? ` (${zoning.zoningClassification})` : ""}. The complete current parcel conditions and detached accessory dwelling rules are not yet safe to automate.`
        : `The property was resolved to ${descriptor.name}. Official municipal information is available, but the complete current parcel conditions and detached accessory dwelling rules are not yet safe to automate.`;
  const evidence = uniqueEvidence([
    ...resolution.sourceEvidence,
    ...sourceEvidenceFor(
      descriptor,
      checkedAt,
      zoning.status !== "NOT_CONFIGURED",
    ),
  ]);

  return {
    submittedAddress,
    normalizedAddress: resolution.normalizedAddress,
    primaryCivicAddress: resolution.primaryCivicAddress,
    ...(resolution.submittedUnit
      ? { submittedUnit: resolution.submittedUnit }
      : {}),
    municipality: descriptor.name,
    jurisdiction: descriptor.name,
    ...(resolution.identifiedAuthority
      ? { identifiedAuthority: resolution.identifiedAuthority }
      : {}),
    regionalArea: descriptor.regionalArea,
    providerStatus: descriptor.status,
    ...(resolution.addressSiteId
      ? { addressSiteId: resolution.addressSiteId }
      : {}),
    ...(zoning.status === "MATCHED"
      ? {
          zoningDistrict: zoning.zoningDistrict,
          ...(zoning.zoningClassification
            ? { zoningClassification: zoning.zoningClassification }
            : {}),
          ...(zoning.zoningCategory
            ? { zoningCategory: zoning.zoningCategory }
            : {}),
        }
      : {}),
    parcelCentroid: resolution.centroid,
    propertyType: "Property type requires municipal review",
    rearAccessIndicator: "NOT DETERMINED",
    alrIndicator: "NOT DETERMINED",
    floodplainIndicator: "NOT DETERMINED",
    environmentalConstraintIndicator: "NOT DETERMINED",
    developmentPermitAreaIndicator: "NOT DETERMINED",
    strataIndicator: "NOT CONFIDENTLY DETERMINED",
    multifamilyIndicator: false,
    commercialIndicator: false,
    industrialIndicator: false,
    appearsUnusuallyComplex: special,
    complexityReasons: special ? [descriptor.limitations] : [],
    leadState: "YELLOW",
    leadStateLabel: special
      ? "SPECIAL JURISDICTION REVIEW"
      : "HUMAN REVIEW REQUIRED",
    recommendedNextAction: "MANUAL PROPERTY REVIEW REQUIRED",
    matchedRules: [
      {
        ruleId: special
          ? `REGIONAL-YELLOW-${descriptor.id.toUpperCase()}-SPECIAL-001`
          : zoningFailure
            ? `REGIONAL-YELLOW-${descriptor.id.toUpperCase()}-DATA-001`
            : `REGIONAL-YELLOW-${descriptor.id.toUpperCase()}-LOOKUP-001`,
        municipality: descriptor.name,
        source: `${descriptor.zoningSource.name}; ${descriptor.ruleSource.name}`,
        sourceAuthority: descriptor.name,
        sourceDocument: descriptor.ruleSource.name,
        sourceSection: special
          ? "Special-jurisdiction governance guard"
          : "Phase 3 provider status and municipal rule review guard",
        lastChecked: descriptor.lastChecked,
        machineCondition: special
          ? "The property intersects or resolves to a special jurisdiction; no neighbouring municipal rule is evaluated."
          : `The ${descriptor.status} provider does not yet have a complete reviewed eligibility rule set.`,
        explanation: reason,
        result: "YELLOW",
        confidence: "HIGH",
      },
    ],
    screening: "NEEDS REVIEW",
    reason,
    dataSources: uniqueStrings(evidence.map((source) => source.name)),
    sourceEvidence: evidence,
    failureCode: special
      ? "SPECIAL_JURISDICTION_REVIEW"
      : zoningFailure
        ? zoningFailure.failureCode
        : "MUNICIPAL_RULE_REVIEW_REQUIRED",
  };
}

function cacheable(result: PropertyReviewResult) {
  return (
    !result.failureCode ||
    result.failureCode === "MUNICIPAL_RULE_REVIEW_REQUIRED" ||
    result.failureCode === "SPECIAL_JURISDICTION_REVIEW"
  );
}

export function createLowerMainlandPropertyReviewProvider(
  options: LowerMainlandProviderOptions = {},
): PropertyReviewProvider {
  const dataClient = options.dataClient ?? createGovernmentDataClient();
  const router = options.router ?? createJurisdictionRouter({ dataClient });
  const zoningLookup =
    options.zoningLookup ?? createMunicipalZoningLookup(dataClient);
  const vancouverProvider =
    options.vancouverProvider ?? createVancouverPropertyReviewProvider();
  const cacheTtlMs = options.cacheTtlMs ?? 30 * 60 * 1_000;
  const maximumCacheEntries = options.maximumCacheEntries ?? 250;
  const now = options.now ?? (() => new Date());
  const logger = options.logger ?? console;
  const resultCache = new Map<string, ResultCacheEntry>();
  const inFlight = new Map<string, Promise<PropertyReviewResult>>();

  function trimCache() {
    if (resultCache.size < maximumCacheEntries) return;
    const firstKey = resultCache.keys().next().value;
    if (typeof firstKey === "string") resultCache.delete(firstKey);
  }

  async function reviewUncached(submittedAddress: string) {
    let routing;
    try {
      routing = await router.route(submittedAddress);
    } catch (error) {
      logger.error(
        JSON.stringify({
          level: "error",
          event: "property_provider_unexpected_failure",
          provider: "Lower Mainland jurisdiction router",
          operation: "jurisdiction_routing",
          errorType: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      return unresolvedResult({
        submittedAddress,
        normalizedAddress: submittedAddress,
        municipality: "Lower Mainland jurisdiction requires review",
        reason:
          "An unexpected jurisdiction-provider error prevented the automated review. The lead was retained for human review.",
        failureCode: "UNEXPECTED_ERROR",
        sourceEvidence: [],
      });
    }
    if (!routing.ok) {
      return unresolvedResult({
        submittedAddress,
        normalizedAddress: routing.normalizedAddress,
        municipality: routing.municipality,
        reason: routing.reason,
        failureCode: routing.failureCode,
        sourceEvidence: routing.sourceEvidence,
      });
    }

    const checkedAt = now().toISOString();
    if (routing.resolution.descriptor.id !== "vancouver") {
      let zoning: MunicipalZoningLookupResult = { status: "NOT_CONFIGURED" };
      if (routing.resolution.descriptor.status === "PARTIAL") {
        try {
          zoning = await zoningLookup(routing.resolution);
        } catch (error) {
          logger.error(
            JSON.stringify({
              level: "error",
              event: "property_provider_unexpected_failure",
              provider: routing.resolution.descriptor.name,
              operation: "zoning_lookup",
              errorType: error instanceof Error ? error.name : "UnknownError",
            }),
          );
          zoning = {
            status: "UNAVAILABLE",
            reason:
              "An unexpected error prevented the official municipal zoning lookup.",
            failureCode: "MUNICIPAL_DATA_UNAVAILABLE",
          };
        }
      }
      return yellowJurisdictionResult(
        submittedAddress,
        routing.resolution,
        checkedAt,
        zoning,
      );
    }

    const descriptor = routing.resolution.descriptor;
    let result: PropertyReviewResult;
    try {
      result = await vancouverProvider.review(submittedAddress);
    } catch (error) {
      logger.error(
        JSON.stringify({
          level: "error",
          event: "property_provider_unexpected_failure",
          provider: descriptor.name,
          operation: "property_review",
          errorType: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      return unresolvedResult({
        submittedAddress,
        normalizedAddress: routing.resolution.normalizedAddress,
        municipality: descriptor.name,
        reason:
          "The municipal property provider was unavailable. The lead was retained for human review.",
        failureCode: "MUNICIPAL_DATA_UNAVAILABLE",
        sourceEvidence: routing.resolution.sourceEvidence,
      });
    }
    const evidence = uniqueEvidence([
      ...routing.resolution.sourceEvidence,
      ...sourceEvidenceFor(descriptor, checkedAt, true),
      ...(result.sourceEvidence ?? []),
    ]);
    return {
      ...result,
      jurisdiction: descriptor.name,
      regionalArea: descriptor.regionalArea,
      providerStatus: descriptor.status,
      ...(routing.resolution.addressSiteId
        ? { addressSiteId: routing.resolution.addressSiteId }
        : {}),
      sourceEvidence: evidence,
      dataSources: uniqueStrings([
        ...result.dataSources,
        ...evidence.map((source) => source.name),
      ]),
    };
  }

  return {
    municipality: "Lower Mainland",
    supports: () => true,
    async review(address) {
      const submittedAddress = normalizeAddress(address);
      const cacheKey = submittedAddress.toUpperCase();
      const cached = resultCache.get(cacheKey);
      if (cached && cached.expiresAt > now().getTime()) {
        return cached.result;
      }
      if (cached) resultCache.delete(cacheKey);

      const pending = inFlight.get(cacheKey);
      if (pending) return pending;

      const request = reviewUncached(submittedAddress);
      inFlight.set(cacheKey, request);
      try {
        const result = await request;
        if (cacheable(result)) {
          trimCache();
          resultCache.set(cacheKey, {
            result,
            expiresAt: now().getTime() + cacheTtlMs,
          });
        }
        logger.info(
          JSON.stringify({
            level: "info",
            event: "property_provider_result",
            provider: "Lower Mainland jurisdiction router",
            jurisdiction: result.jurisdiction ?? result.municipality,
            providerStatus: result.providerStatus ?? "UNRESOLVED",
            leadState: result.leadState,
            failureCode: result.failureCode,
          }),
        );
        return result;
      } finally {
        inFlight.delete(cacheKey);
      }
    },
  };
}
