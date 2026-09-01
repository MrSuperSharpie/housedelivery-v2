import type { HomeConfiguration } from "@/data/home-configurator";
import type { HomeProductFamily } from "@/data/home-configurator-architecture";

export const lookBookLeadStates = [
  "known_engaged",
  "qualified_inquiry",
] as const;

export type LookBookLeadState = (typeof lookBookLeadStates)[number];

export const followUpSources = [
  "email_assistance_checkbox",
  "property_check",
] as const;

export type FollowUpSource = (typeof followUpSources)[number];

export type LookBookAttribution = {
  anonymousSessionId: string;
  initialReferrer?: string;
  landingPath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

export type LookBookContact = {
  firstName: string;
  email: string;
  phone?: string;
};

export const propertyStatuses = [
  "owned_or_controlled",
  "acquiring",
  "identified",
  "exploring",
] as const;

export type PropertyStatus = (typeof propertyStatuses)[number];

export const projectTypes = [
  "one_home",
  "multiple_homes",
  "development_project",
  "first_nations_community_housing",
  "general_contractor_builder",
  "other",
] as const;

export type PropertyProjectType = (typeof projectTypes)[number];

export const projectTimings = [
  "as_soon_as_possible",
  "within_6_months",
  "6_to_12_months",
  "12_plus_months",
  "just_exploring",
] as const;

export type PropertyTiming = (typeof projectTimings)[number];

export type PropertyFeasibility = {
  municipality: string;
  province: string;
  postalCode: string;
  propertyStatus: PropertyStatus;
  projectType: PropertyProjectType;
  timing: PropertyTiming;
  address?: string;
  unitCount?: number;
  notes?: string;
  submittedAt: string;
};

export type StoredLookBookSelection = {
  categoryId: string;
  categoryTitle: string;
  zoneId?: string;
  zoneTitle?: string;
  optionId: string;
  optionNumber?: string;
  optionName: string;
  tier: "premium" | "signature";
};

export type StoredLookBook = {
  id: string;
  homeSlug: string;
  homeDisplayName: string;
  homeFamily: HomeProductFamily;
  configuratorVersion: number;
  configuration: HomeConfiguration;
  selections: StoredLookBookSelection[];
  contact: LookBookContact;
  leadState: LookBookLeadState;
  followUpRequested: boolean;
  followUpRequestedAt?: string;
  followUpSource?: FollowUpSource;
  propertyFeasibility?: PropertyFeasibility;
  attribution: LookBookAttribution;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
  emailRequestedAt?: string;
};

export type LookBookEmailIntent = {
  intent: "email";
  configurationId?: string;
  homeSlug: string;
  configuration: unknown;
  contact: unknown;
  followUpRequested: unknown;
  attribution: unknown;
  company?: unknown;
};

export type LookBookPropertyIntent = {
  intent: "property_check";
  configurationId?: string;
  homeSlug?: string;
  configuration?: unknown;
  contact?: unknown;
  property: unknown;
  attribution?: unknown;
  company?: unknown;
};

export type LookBookSubmission =
  | LookBookEmailIntent
  | LookBookPropertyIntent;
