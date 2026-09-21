import { inquiryModels } from "@/data/inquiry-models";
import { approvedPackagePrices, type ApprovedPackagePrice } from "@/data/package-pricing";

export const finishPreferences = {
  essential: "Essential — included",
  premium: "Premium upgrade",
  signature: "Signature upgrade",
  undecided: "Help me decide",
} as const;
export type FinishPreference = keyof typeof finishPreferences;
export const projectRequestLabels = {
  customDesign: "Custom-design changes",
  accessibility: "Accessibility needs",
  offGrid: "Off-grid needs",
  localCompletion: "Help coordinating local completion",
} as const;
export type ProjectRequest = keyof typeof projectRequestLabels;
export type BudgetHomeLine = {
  id: string;
  modelId: string;
  quantity: number;
  finish: FinishPreference;
  selections: string;
};
export type HomeBudgetProject = {
  version: 1;
  homes: BudgetHomeLine[];
  location: string;
  requests: ProjectRequest[];
  details: string;
};
export const maximumBudgetLines = 50;
export const maximumHomeQuantity = 100;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid project.");
  return value as Record<string, unknown>;
}
function boundedText(value: unknown, limit: number) {
  if (typeof value !== "string" || value.length > limit) throw new Error("Invalid project text.");
  return value.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

// Shared validation for the enquiry API and saved drafts. Reconstruct accepted
// fields rather than trusting submitted prices, names, IDs or quantities.
export function parseHomeBudgetProject(value: unknown): HomeBudgetProject {
  const input = record(value);
  if (input.version !== 1 || !Array.isArray(input.homes) || !input.homes.length || input.homes.length > maximumBudgetLines) throw new Error("Invalid homes.");
  const ids = new Set<string>();
  const homes = input.homes.map((value): BudgetHomeLine => {
    const line = record(value);
    const id = boundedText(line.id, 100);
    const modelId = boundedText(line.modelId, 100);
    if (!id || ids.has(id) || !inquiryModels.some((home) => home.slug === modelId)) throw new Error("Invalid home.");
    ids.add(id);
    if (typeof line.quantity !== "number" || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > maximumHomeQuantity) throw new Error("Invalid quantity.");
    if (typeof line.finish !== "string" || !Object.hasOwn(finishPreferences, line.finish)) throw new Error("Invalid finish.");
    return { id, modelId, quantity: line.quantity, finish: line.finish as FinishPreference, selections: boundedText(line.selections, 4000) };
  });
  if (!Array.isArray(input.requests) || input.requests.length > 4 || input.requests.some((key) => typeof key !== "string" || !Object.hasOwn(projectRequestLabels, key))) throw new Error("Invalid requests.");
  return { version: 1, homes, location: boundedText(input.location, 160).replace(/\s+/g, " "), requests: [...new Set(input.requests)] as ProjectRequest[], details: boundedText(input.details, 4000) };
}

export function getDeliveredLinePrice(
  line: BudgetHomeLine,
  location: string,
  prices: readonly ApprovedPackagePrice[] = approvedPackagePrices,
  date = new Date().toISOString().slice(0, 10),
) {
  const price = prices.find((item) => item.modelId === line.modelId && item.approvedOn <= date && item.validUntil >= date && item.currency === "CAD" && item.sourceReference.trim() && item.specification.trim());
  const upgrade = line.finish === "essential" ? 0 : line.finish === "premium" ? price?.premiumUpgrade : line.finish === "signature" ? price?.signatureUpgrade : null;
  const delivery = price?.delivery;
  const amounts = [price?.essentialBase, upgrade, delivery?.amountPerPackage];
  const matchesDestination = Boolean(location.trim() && delivery?.destination.trim().toLowerCase() === location.trim().toLowerCase() && delivery.accessAssumptions.trim());
  const complete = Number.isInteger(line.quantity) && line.quantity >= 1 && line.quantity <= maximumHomeQuantity && !line.selections.trim() && matchesDestination && amounts.every((amount) => typeof amount === "number" && Number.isFinite(amount) && amount >= 0);
  return {
    amount: complete && price && delivery && typeof upgrade === "number" ? (price.essentialBase + upgrade + delivery.amountPerPackage) * line.quantity : null,
    price: complete ? price : undefined,
  };
}

export function getDeliveredProjectPrice(project: HomeBudgetProject, prices = approvedPackagePrices, date?: string) {
  const lines = project.homes.map((line) => getDeliveredLinePrice(line, project.location, prices, date));
  // Open requests require scope review, even if standard packages have prices.
  const amount = lines.length > 0 && !project.requests.length && !project.details.trim() && lines.every((line) => line.amount !== null)
    ? lines.reduce((sum, line) => sum + line.amount!, 0) : null;
  return { lines, amount };
}

export function formatHomeBudgetProject(project: HomeBudgetProject) {
  return [
    "Home budget planner — site-specific budget request",
    ...project.homes.flatMap((line, index) => [
      `${index + 1}. ${inquiryModels.find((model) => model.slug === line.modelId)!.name} × ${line.quantity} (${line.modelId})`,
      `Inclusions / finishes: ${finishPreferences[line.finish]}`,
      "Reference home-package prices: Premium $225/sq. ft.; Signature $275/sq. ft. These are not cumulative charges.",
      line.finish === "premium" || line.finish === "signature" ? "Final package scope and price require confirmation." : "",
      line.selections ? `Design selections / requests: ${line.selections}` : "",
    ]),
    `Delivery location: ${project.location || "To be confirmed"}`,
    "Delivered Home Package: Request package pricing. Location is a request, not a freight calculation.",
    "Delivered scope: base package, selected upgrade, freight, import charges, tariffs and agreed delivery/unloading. Applicable sales taxes extra.",
    "Separate scope: on-site assembly/erection, site work, foundations, services, local trades and land. Appliances are selected and priced separately. No completed-home total.",
    ...project.requests.map((key) => `Requested for separate review and quote: ${projectRequestLabels[key]}`),
    project.details ? `Project details: ${project.details}` : "",
  ].filter(Boolean).join("\n");
}
