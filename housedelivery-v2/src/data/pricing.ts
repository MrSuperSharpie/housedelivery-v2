// Preliminary selling estimates for Preview review, not refreshed supplier
// quotations or authorization to publish to Production. Never price a model
// by multiplying these general ranges by its advertised area.
export const pricingGuide = {
  currency: "CAD",
  reviewedOn: "2026-09-10",
  reviewLabel: "September 10, 2026",
  introduction:
    "Indicative manufactured-package budgets for selected custom homes of approximately 2,000–6,000 sq. ft. range from $150–$250 CAD/sq. ft., depending on design and specification.",
  applicability:
    "These preliminary planning ranges are based on Lower Mainland specification assumptions. They are not model-specific quotations and do not apply automatically to ADUs, multiplexes or other regional requirements.",
  tierScopeNote:
    "The tier ranges are alternative complete manufactured-package budgets, not upgrade charges to add to another base price.",
  disclosure:
    "Manufactured-package budgets exclude freight, insurance, import charges, delivery, applicable sales taxes, foundations, assembly, local trades, permits and site completion. Package inclusions and final pricing are confirmed for the selected design, specification and location.",
  scopes: {
    manufactured: {
      label: "Manufactured Package",
      description:
        "The selected housing system and specified supplied finishes.",
    },
    delivery: {
      label: "Delivery",
      budgetLabel: "Calculated for your project location.",
      description:
        "Freight, importation and delivery are calculated for your actual project location.",
    },
    construction: {
      label: "Local Construction",
      budgetLabel: "Local builder quote required",
      description:
        "Foundations, assembly, Canadian trades and site completion are priced for your specific property by the local builder/project team.",
    },
  },
  levels: [
    {
      id: "essential",
      name: "Essential",
      description: "Attractive, durable materials and thoughtful finishes for everyday living.",
      manufactured: [150, 180],
    },
    {
      id: "premium",
      name: "Premium",
      description: "A noticeable step up in materials, cabinetry, glazing and interior detailing.",
      manufactured: [165, 205],
    },
    {
      id: "signature",
      name: "Signature",
      description: "High-end materials and coordinated detailing for a distinctive custom home.",
      manufactured: [190, 250],
    },
  ],
} as const;

export type PricingLevel = (typeof pricingGuide.levels)[number]["id"];

export const modelBudgetCopy =
  "Your budget depends on your site, selected specifications and delivery location.";

export const productionTimingCopy =
  "Factory production is typically 40–45 days after approved drawings and payment. Your overall schedule also depends on site readiness, shipping, Canadian completion work and inspections.";

export function formatPricingRange(range: readonly [number, number]) {
  return `$${range[0]}–${range[1]}`;
}
