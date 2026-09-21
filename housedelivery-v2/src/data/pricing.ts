// Shared public pricing policy. Approved model selling prices belong in package-pricing.ts.
export const pricingGuide = {
  currency: "CAD",
  reviewedOn: "2026-09-11",
  reviewLabel: "September 11, 2026",
  introduction:
    "Start with your home design, then choose the package specification that fits your project. Premium is $225 per sq. ft. and Signature is $275 per sq. ft.",
  applicability:
    "The base price depends on the design, size and structural complexity. Essential, Premium and Signature describe inclusions and finishes; the light-gauge steel structure and core engineered house do not change tier.",
  tierScopeNote:
    "Premium at $225 per sq. ft. and Signature at $275 per sq. ft. are home-package prices. They exclude on-site assembly and erection. Signature is the upgraded specification; its price is not added on top of Premium.",
  disclosure:
    "$225 Premium and $275 Signature are home-package prices per sq. ft. and exclude on-site assembly and erection. Assembly, site work, foundations, services, local trades and land are separate. Appliances are selected and priced separately. Freight, import charges, tariffs, delivery/unloading, permits, local completion and applicable sales taxes are confirmed separately for the project. Prices require confirmed specifications, delivery destination and site access; entering a location alone does not calculate freight.",
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
      priceLabel: "$225 / sq. ft.",
    },
    {
      id: "signature",
      name: "Signature",
      description: "An elevated Signature home-package specification. Appliances are selected and priced separately.",
      priceLabel: "$275 / sq. ft.",
    },
  ],
} as const;

export type PricingLevel = (typeof pricingGuide.levels)[number]["id"];

export const modelBudgetCopy =
  "Your budget depends on your site, selected specifications and delivery location.";

export const productionTimingCopy =
  "Factory production is typically 40–45 days after approved drawings and payment. Your overall schedule also depends on site readiness, shipping, Canadian completion work and inspections.";
