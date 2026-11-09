import { InquiryValidationError, type BuildHomeInquiry } from "@/lib/build-home-inquiry";

export const campaignPaths = {
  "custom-homes": "/build-your-home/custom-homes",
  "laneway-carriage-homes": "/build-your-home/laneway-carriage-homes",
} as const;
export type Campaign = keyof typeof campaignPaths;
export const campaignLabels: Record<Campaign, string> = {
  "custom-homes": "Custom homes",
  "laneway-carriage-homes": "Laneway & carriage homes",
};
export const attributionFields = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id", "gclid"] as const;
export type Touch = { landingPath: string; capturedAt: string } & Partial<Record<typeof attributionFields[number], string>>;
export type LeadAttribution = { consent: "accepted" | "declined" | "unset"; firstTouch?: Touch; latestTouch?: Touch };
export type LeadContext = { campaign?: Campaign; sourcePath: string; propertyAddress: string; modelInterest: string; attribution: LeadAttribution };
export function isCampaign(value: unknown): value is Campaign {
  return typeof value === "string" && Object.hasOwn(campaignPaths, value);
}
export function isCampaignPath(path: string) {
  return Object.values(campaignPaths).some(value => value === path) || path === "/build-your-home/thank-you";
}
function text(value: unknown, max = 240) {
  return typeof value === "string" && !/[\u0000-\u001f\u007f<>]/.test(value) ? value.trim().slice(0, max) : "";
}
export function sanitizeTouch(value: unknown): Touch | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const data = value as Record<string, unknown>;
  const landingPath = Object.values(campaignPaths).find(path => path === data.landingPath);
  if (!landingPath || typeof data.capturedAt !== "string" || !Number.isFinite(Date.parse(data.capturedAt))) return;
  const result: Touch = { landingPath, capturedAt: new Date(data.capturedAt).toISOString() };
  for (const key of attributionFields) {
    const clean = text(data[key], key === "gclid" ? 256 : 300);
    if (!clean || clean.includes("@") || (key === "gclid" && !/^[A-Za-z0-9._~-]+$/.test(clean))) continue;
    result[key] = clean;
  }
  return result;
}
export function parseLeadContext(payload: Record<string, unknown>, inquiry: BuildHomeInquiry): LeadContext {
  if (payload.campaign !== undefined && !isCampaign(payload.campaign)) throw new InquiryValidationError("Please select a valid project enquiry.");
  const campaign = isCampaign(payload.campaign) ? payload.campaign : undefined;
  if (campaign === "custom-homes" && inquiry.projectType !== "Custom home") throw new InquiryValidationError("Please select a custom-home project.");
  if (campaign === "laneway-carriage-homes" && !["Laneway home", "Carriage home", "Still exploring"].includes(inquiry.projectType)) throw new InquiryValidationError("Please select a laneway or carriage-home project.");
  for (const key of ["propertyAddress", "modelInterest"] as const) {
    if (payload[key] !== undefined && (typeof payload[key] !== "string" || payload[key].length > 240 || /[\r\n\u0000-\u001f]/.test(payload[key]))) throw new InquiryValidationError("Please check your property details.");
  }
  const raw = payload.attribution && typeof payload.attribution === "object" && !Array.isArray(payload.attribution) ? payload.attribution as Record<string, unknown> : {};
  const consent = raw.consent === "accepted" ? "accepted" : raw.consent === "declined" ? "declined" : "unset";
  return { campaign, sourcePath: campaign ? campaignPaths[campaign] : "/build-your-home", propertyAddress: text(payload.propertyAddress), modelInterest: text(payload.modelInterest), attribution: { consent, ...(consent === "accepted" ? { firstTouch: sanitizeTouch(raw.firstTouch), latestTouch: sanitizeTouch(raw.latestTouch) } : {}) } };
}
export function createLeadRecord(inquiry: BuildHomeInquiry, reference: string, context: LeadContext, now = new Date()) {
  const record: Record<string, string> = {
    lead_reference: reference, form_started_at: now.toISOString(), status: "New inquiry — follow-up required",
    environment: process.env.VERCEL_ENV ?? "development", audience: context.campaign ?? "general",
    source_page: context.sourcePath, full_name: inquiry.fullName, email: inquiry.email, phone: inquiry.phone,
    municipality: inquiry.municipality, province: "British Columbia", property_address: context.propertyAddress,
    project_type: inquiry.projectType, model_interest: context.modelInterest, property_ownership: inquiry.ownership,
    construction_timeline: inquiry.timeline, project_details: inquiry.details, attribution_consent: context.attribution.consent,
  };
  for (const [prefix, touch] of [["first", context.attribution.firstTouch], ["latest", context.attribution.latestTouch]] as const) {
    record[`${prefix}_landing_page`] = touch?.landingPath ?? "";
    record[`${prefix}_touch_at`] = touch?.capturedAt ?? "";
    for (const key of attributionFields) record[`${prefix}_${key}`] = touch?.[key] ?? "";
  }
  return record;
}
