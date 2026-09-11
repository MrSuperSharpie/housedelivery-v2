// Approved public selling ranges only. These are not model quotation inputs.
export const pricingGuide = {
  currency: "CAD",
  reviewedOn: "2026-09-10",
  reviewLabel: "September 10, 2026",
  introduction:
    "Understand the cost of your home—from the manufactured package to a completed build. These indicative budgets help you plan; your site and selections determine the final price.",
  applicability:
    "Planning ranges for straightforward custom homes of approximately 2,000–6,000 sq. ft. on cleared, serviced Lower Mainland sites. They do not establish prices for individual models, ADUs, multiplexes, remote locations or difficult sites.",
  disclosure:
    "CAD planning estimates, reviewed September 2026. Package-only prices exclude applicable sales taxes. Completed-build budgets include material PST and exclude GST, land, municipal fees and development charges, additional professional services, demolition, major utility upgrades, difficult ground, retaining works and landscaping. Final pricing depends on confirmed specifications and site conditions.",
  scopes: {
    manufactured: {
      label: "Manufactured package",
      description:
        "Structure, envelope and specified supplied finishes, before freight and importation.",
    },
    delivered: {
      label: "Delivered package",
      description:
        "Manufactured package plus freight, insurance, applicable customs charges, ordinary Lower Mainland delivery and unloading.",
    },
    completed: {
      label: "Estimated completed build",
      description:
        "Includes normal foundations and site work, Canadian assembly and finishing, plumbing, electrical, heating and ventilation, selected appliances and model/site engineering.",
    },
  },
  levels: [
    {
      id: "essential",
      name: "Essential",
      description: "Attractive, durable materials and thoughtful finishes for everyday living.",
      manufactured: [150, 180],
      delivered: [215, 255],
      completed: [450, 575],
    },
    {
      id: "premium",
      name: "Premium",
      description: "A noticeable step up in materials, cabinetry, glazing and interior detailing.",
      manufactured: [165, 205],
      delivered: [240, 300],
      completed: [500, 650],
    },
    {
      id: "signature",
      name: "Signature",
      description: "High-end materials and coordinated detailing for a distinctive custom home.",
      manufactured: [190, 250],
      delivered: [270, 350],
      completed: [550, 750],
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
