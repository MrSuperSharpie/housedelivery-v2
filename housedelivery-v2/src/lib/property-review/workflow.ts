import { createVancouverPropertyReviewProvider } from "@/lib/property-review/providers/vancouver";
import type {
  PropertyReviewProvider,
  PropertyReviewResult,
} from "@/lib/property-review/types";

const unsupportedMunicipality = "MUNICIPALITY NOT YET SUPPORTED";

function needsReviewResult({
  address,
  municipality,
  reason,
  failureCode,
}: {
  address: string;
  municipality: string;
  reason: string;
  failureCode: NonNullable<PropertyReviewResult["failureCode"]>;
}): PropertyReviewResult {
  const submittedAddress = address.trim().replace(/\s+/g, " ");
  return {
    submittedAddress,
    normalizedAddress: submittedAddress,
    municipality,
    appearsUnusuallyComplex: true,
    complexityReasons: [reason],
    screening: "NEEDS REVIEW",
    reason,
    dataSources: [],
    failureCode,
  };
}

export function createPropertyReviewWorkflow(
  providers: PropertyReviewProvider[] = [
    createVancouverPropertyReviewProvider(),
  ],
) {
  return {
    async review(address: string): Promise<PropertyReviewResult> {
      const submittedAddress = address.trim().replace(/\s+/g, " ");
      if (!submittedAddress) {
        return needsReviewResult({
          address,
          municipality: "Not confidently determined",
          reason: "No property address was supplied for municipal review.",
          failureCode: "ADDRESS_INVALID",
        });
      }

      let provider: PropertyReviewProvider | undefined;
      try {
        provider = providers.find((candidate) =>
          candidate.supports(submittedAddress),
        );
      } catch {
        return needsReviewResult({
          address: submittedAddress,
          municipality: "Not confidently determined",
          reason:
            "The municipality could not be determined automatically and requires manual review.",
          failureCode: "UNEXPECTED_ERROR",
        });
      }

      if (!provider) {
        return needsReviewResult({
          address: submittedAddress,
          municipality: unsupportedMunicipality,
          reason:
            "The submitted property appears to be outside the City of Vancouver. Automated municipal review is not yet supported for this location.",
          failureCode: "MUNICIPALITY_NOT_SUPPORTED",
        });
      }

      try {
        return await provider.review(submittedAddress);
      } catch {
        return needsReviewResult({
          address: submittedAddress,
          municipality: provider.municipality,
          reason:
            "An unexpected error prevented the municipal property review from completing. The lead still requires manual review.",
          failureCode: "UNEXPECTED_ERROR",
        });
      }
    },
  };
}

export async function reviewPropertyAddress(address: string) {
  return createPropertyReviewWorkflow().review(address);
}
