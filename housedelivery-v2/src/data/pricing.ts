// Shared public pricing policy. Approved model selling prices belong in package-pricing.ts.
export const homePackageRates = {
  premium: 250,
  signature: 300,
} as const;

export const pricingGuide = {
  currency: "CAD",
  reviewedOn: "2026-11-09",
  reviewLabel: "November 9, 2026",
  introduction:
    `Start with your home design, then choose the package specification that fits your project. Premium is $${homePackageRates.premium} per sq. ft. and Signature is $${homePackageRates.signature} per sq. ft.`,
  homepageIntroduction:
    `Choose your home and explore Premium at $${homePackageRates.premium} per sq. ft. or Signature at $${homePackageRates.signature} per sq. ft. These are home-package prices. On-site assembly and erection, site work, foundations, services, local trades and land are separate. Appliances are selected and priced separately.`,
  referencePackagePrices:
    `Reference home-package prices: Premium $${homePackageRates.premium}/sq. ft.; Signature $${homePackageRates.signature}/sq. ft. These are not cumulative charges.`,
  applicability:
    "The base price depends on the design, size and structural complexity. Essential, Premium and Signature describe inclusions and finishes; the light-gauge steel structure and core engineered house do not change tier.",
  tierScopeNote:
    `Premium at $${homePackageRates.premium} per sq. ft. and Signature at $${homePackageRates.signature} per sq. ft. are home-package prices. They exclude on-site assembly and erection. Signature is the upgraded specification; its price is not added on top of Premium.`,
  disclosure:
    `$${homePackageRates.premium} Premium and $${homePackageRates.signature} Signature are home-package prices per sq. ft. and exclude on-site assembly and erection. Assembly, site work, foundations, services, local trades and land are separate. Appliances are selected and priced separately. Freight, import charges, tariffs, delivery/unloading, permits, local completion and applicable sales taxes are confirmed separately for the project. Prices require confirmed specifications, delivery destination and site access; entering a location alone does not calculate freight.`,
  scopes: {
    manufactured: {
      label: "Base Home Package",
      description:
        "Your selected design and structural package. Premium and Signature are complete home-package specifications; appliances are selected and priced separately.",
    },
    delivery: {
      label: "Delivered Home Package",
      budgetLabel: "Request package pricing",
      description:
        "The base package, any selected upgrade, freight, import charges, tariffs and agreed delivery/unloading. Specification, destination and access assumptions are confirmed with the quote; applicable sales taxes are extra.",
    },
    construction: {
      label: "Assembly and local completion",
      budgetLabel: "Local builder quote required",
      description:
        "On-site assembly and erection, site work, foundations, services, local trades, permits and site completion are priced for your specific property by the local builder/project team. Land is excluded. This work is separate from the home package.",
    },
  },
  levels: [
    {
      id: "essential",
      name: "Essential",
      description: "The included products and finishes for your chosen model, confirmed in its specification.",
      priceLabel: "Included in base",
    },
    {
      id: "premium",
      name: "Premium",
      description: "A coordinated Premium home-package specification. Appliances are selected and priced separately.",
      priceLabel: `$${homePackageRates.premium} / sq. ft.`,
    },
    {
      id: "signature",
      name: "Signature",
      description: "An elevated Signature home-package specification. Appliances are selected and priced separately.",
      priceLabel: `$${homePackageRates.signature} / sq. ft.`,
    },
  ],
} as const;

export type PricingLevel = (typeof pricingGuide.levels)[number]["id"];

export const modelBudgetCopy =
  "Your budget depends on your site, selected specifications and delivery location.";

export const productionTimingCopy =
  "Factory production is typically 40–45 days after approved drawings and payment. Your overall schedule also depends on site readiness, shipping, Canadian completion work and inspections.";
