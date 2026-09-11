// Shared public pricing policy. Approved model selling prices belong in package-pricing.ts.
export const pricingGuide = {
  currency: "CAD",
  reviewedOn: "2026-09-11",
  reviewLabel: "September 11, 2026",
  introduction:
    "Start with your home design. Its base package includes Essential inclusions and finishes, with optional Premium or Signature upgrades.",
  applicability:
    "The base price depends on the design, size and structural complexity. Essential, Premium and Signature describe inclusions and finishes; the light-gauge steel structure and core engineered house do not change tier.",
  tierScopeNote:
    "Essential is included in the model’s base package. Choose Premium or Signature as an alternative incremental upgrade above Essential. Upgrades are never stacked or charged again for included products.",
  disclosure:
    "The Delivered Home Package includes the agreed home package, freight, import charges, tariffs and delivery/unloading within the agreed site scope. Applicable sales taxes are extra. Land, foundations, assembly, Canadian trades, permits and local completion are separate. Prices require confirmed specifications, delivery destination and site access; entering a location alone does not calculate freight.",
  scopes: {
    manufactured: {
      label: "Base Home Package",
      description:
        "Your selected design and structural package, including Essential inclusions and finishes. Premium or Signature upgrades are quoted above this base.",
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
        "Foundations, assembly, Canadian trades, permits and site completion are priced for your specific property by the local builder/project team. Land is excluded. This is separate from the Delivered Home Package.",
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
      description: "An optional upgrade to selected windows, doors, flooring, cabinetry, countertops, bathrooms, hardware, cladding or appliances.",
      priceLabel: "Upgrade quote required",
    },
    {
      id: "signature",
      name: "Signature",
      description: "An alternative upgrade above Essential for your preferred inclusions and finishes. Signature does not add a second Premium charge.",
      priceLabel: "Upgrade quote required",
    },
  ],
} as const;

export type PricingLevel = (typeof pricingGuide.levels)[number]["id"];

export const modelBudgetCopy =
  "Your budget depends on your site, selected specifications and delivery location.";

export const productionTimingCopy =
  "Factory production is typically 40–45 days after approved drawings and payment. Your overall schedule also depends on site readiness, shipping, Canadian completion work and inspections.";
