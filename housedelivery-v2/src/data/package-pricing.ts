export type ApprovedPackagePrice = {
  modelId: string;
  sourceReference: string;
  approvedOn: string;
  validUntil: string;
  specification: string;
  currency: "CAD";
  essentialBase: number;
  // Incremental amounts above Essential, never cumulative tiers.
  premiumUpgrade: number | null;
  signatureUpgrade: number | null;
  delivery: {
    destination: string;
    accessAssumptions: string;
    // Freight, import charges, tariffs and agreed delivery/unloading included.
    amountPerPackage: number;
  } | null;
};

// No current, documented, approved model selling prices were supplied.
// Empty means unknown, not zero. Populate only after approval with a source,
// validity, specification and agreed delivery/access scope. Never copy legacy
// calculator rates, allowances, discounts or manufactured-package estimates.
export const approvedPackagePrices: readonly ApprovedPackagePrice[] = [];
