export const projectTypes = [
  "Laneway home",
  "Carriage home",
  "Custom home",
  "Small residential development",
  "Still exploring",
] as const;

export const propertyStatuses = [
  "Yes, I own the property",
  "Purchase in progress",
  "Looking for a property",
] as const;

export const projectTimelines = [
  "Within 6 months",
  "6–12 months",
  "12–24 months",
  "More than 24 months",
  "Still exploring",
] as const;

export type BuildHomeInquiry = {
  fullName: string;
  email: string;
  phone: string;
  municipality: string;
  projectType: string;
  ownership: string;
  timeline: string;
  details: string;
};

export class InquiryValidationError extends Error {}

function field(input: Record<string, unknown>, key: string, max: number, required = true) {
  const raw = input[key];
  if (raw !== undefined && typeof raw !== "string") {
    throw new InquiryValidationError("Please check your project details.");
  }
  const value = typeof raw === "string" ? raw.trim() : "";
  if ((required && !value) || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new InquiryValidationError("Please complete the required fields and check their length.");
  }
  if (key !== "details" && /[\r\n]/.test(value)) {
    throw new InquiryValidationError("Please use a single line for contact details.");
  }
  return value;
}

export function parseBuildHomeInquiry(input: Record<string, unknown>): BuildHomeInquiry {
  const result = {
    fullName: field(input, "fullName", 160),
    email: field(input, "email", 254).toLowerCase(),
    phone: field(input, "phone", 50, false),
    municipality: field(input, "municipality", 160),
    projectType: field(input, "projectType", 80),
    ownership: field(input, "ownership", 80),
    timeline: field(input, "timeline", 80),
    details: field(input, "details", 2500, false),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) {
    throw new InquiryValidationError("Please enter a valid email address.");
  }
  if (
    !projectTypes.some((value) => value === result.projectType) ||
    !propertyStatuses.some((value) => value === result.ownership) ||
    !projectTimelines.some((value) => value === result.timeline)
  ) {
    throw new InquiryValidationError("Please select your project type, property status and timeline.");
  }
  return result;
}

export function formatBuildHomeInquiry(inquiry: BuildHomeInquiry, reference: string, sourcePath = "/build-your-home") {
  return [
    "NEW HOUSE DELIVERY PROJECT INQUIRY",
    `Reference: ${reference}`,
    `Source: ${sourcePath}`,
    "Status: New inquiry — qualification and personal follow-up needed",
    "",
    `Name: ${inquiry.fullName}`,
    `Email: ${inquiry.email}`,
    `Phone: ${inquiry.phone || "Not supplied"}`,
    `City / municipality: ${inquiry.municipality}`,
    "Province of interest: British Columbia",
    `Project type: ${inquiry.projectType}`,
    `Property status: ${inquiry.ownership}`,
    `Anticipated construction: ${inquiry.timeline}`,
    "",
    "PROJECT DETAILS",
    inquiry.details || "Not supplied",
    "",
    "The visitor requested contact about this project. This is not a marketing subscription.",
    "Follow-up: confirm site, goals, budget readiness, timing and delivery responsibilities before qualifying the opportunity.",
  ].join("\n");
}
