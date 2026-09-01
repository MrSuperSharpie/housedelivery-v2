import { randomUUID } from "node:crypto";

import {
  getHomeConfiguratorJourneyCategories,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
} from "@/data/home-configurator";
import { createLookBookReference } from "@/data/home-look-book";
import { getHomeConfiguratorRegistration } from "@/data/home-configurators";
import {
  projectTimings,
  projectTypes,
  propertyStatuses,
  type LookBookAttribution,
  type LookBookContact,
  type FollowUpSource,
  type LookBookLeadState,
  type PropertyFeasibility,
  type StoredLookBook,
  type StoredLookBookSelection,
} from "@/lib/lookbook/types";

export class LookBookValidationError extends Error {}

export function singleLine(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
}

export function multiline(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, maximumLength);
}

function optionalSingleLine(value: unknown, maximumLength: number) {
  return singleLine(value, maximumLength) || undefined;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseConfigurationId(value: unknown) {
  const id = singleLine(value, 80);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  )
    ? id.toLowerCase()
    : undefined;
}

export function createConfigurationId() {
  return randomUUID();
}

export function parseContact(value: unknown): LookBookContact {
  if (!isRecord(value)) {
    throw new LookBookValidationError("Contact details are required.");
  }

  const firstName = singleLine(value.firstName, 80);
  const email = singleLine(value.email, 254).toLowerCase();
  const phone = optionalSingleLine(value.phone, 50);

  if (!firstName || !isEmail(email)) {
    throw new LookBookValidationError(
      "First name and a valid email address are required.",
    );
  }

  return { firstName, email, ...(phone ? { phone } : {}) };
}

export function parseAttribution(value: unknown): LookBookAttribution {
  if (!isRecord(value)) {
    return { anonymousSessionId: randomUUID() };
  }

  const anonymousSessionId =
    parseConfigurationId(value.anonymousSessionId) ?? randomUUID();
  const initialReferrer = optionalSingleLine(value.initialReferrer, 1_000);
  const landingPath = optionalSingleLine(value.landingPath, 500);
  const utmSource = optionalSingleLine(value.utmSource, 200);
  const utmMedium = optionalSingleLine(value.utmMedium, 200);
  const utmCampaign = optionalSingleLine(value.utmCampaign, 300);
  const utmContent = optionalSingleLine(value.utmContent, 300);
  const utmTerm = optionalSingleLine(value.utmTerm, 300);

  return {
    anonymousSessionId,
    ...(initialReferrer ? { initialReferrer } : {}),
    ...(landingPath ? { landingPath } : {}),
    ...(utmSource ? { utmSource } : {}),
    ...(utmMedium ? { utmMedium } : {}),
    ...(utmCampaign ? { utmCampaign } : {}),
    ...(utmContent ? { utmContent } : {}),
    ...(utmTerm ? { utmTerm } : {}),
  };
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  const normalized = singleLine(value, 100);
  return allowed.find((candidate) => candidate === normalized);
}

export function parsePropertyFeasibility(
  value: unknown,
  submittedAt = new Date().toISOString(),
): PropertyFeasibility {
  if (!isRecord(value)) {
    throw new LookBookValidationError("Property details are required.");
  }

  const municipality = singleLine(value.municipality, 160);
  const province = singleLine(value.province, 80);
  const postalCode = singleLine(value.postalCode, 20).toUpperCase();
  const propertyStatus = enumValue(value.propertyStatus, propertyStatuses);
  const projectType = enumValue(value.projectType, projectTypes);
  const timing = enumValue(value.timing, projectTimings);
  const address = optionalSingleLine(value.address, 240);
  const unitCountRaw = Number(value.unitCount);
  const unitCount =
    Number.isInteger(unitCountRaw) && unitCountRaw > 0 && unitCountRaw <= 10_000
      ? unitCountRaw
      : undefined;
  const notes = multiline(value.notes, 2_000) || undefined;

  if (
    !municipality ||
    !province ||
    !postalCode ||
    !propertyStatus ||
    !projectType ||
    !timing
  ) {
    throw new LookBookValidationError(
      "Municipality, province, postal code, property status, project type, and timing are required.",
    );
  }

  return {
    municipality,
    province,
    postalCode,
    propertyStatus,
    projectType,
    timing,
    ...(address ? { address } : {}),
    ...(unitCount ? { unitCount } : {}),
    ...(notes ? { notes } : {}),
    submittedAt,
  };
}

function resolveConfiguration(
  definition: HomeConfiguratorDefinition,
  value: unknown,
) {
  if (!isRecord(value)) {
    throw new LookBookValidationError("A completed configuration is required.");
  }

  if (
    value.homeId !== definition.homeId ||
    value.schemaVersion !== definition.configurationVersion ||
    !isRecord(value.inclusionSelections) ||
    !isRecord(value.flooringSelections)
  ) {
    throw new LookBookValidationError("The configuration is not valid for this home.");
  }

  const inclusionSelections: HomeConfiguration["inclusionSelections"] = {};
  const flooringSelections: HomeConfiguration["flooringSelections"] = {};
  const selections: StoredLookBookSelection[] = [];

  for (const category of getHomeConfiguratorJourneyCategories(definition)) {
    if (category.kind === "standard" || category.kind === "room-look") {
      const rawSelection = value.inclusionSelections[category.id];
      if (!isRecord(rawSelection) || rawSelection.status !== "confirmed") {
        throw new LookBookValidationError("Every design chapter must be complete.");
      }
      const option = category.options.find(
        (candidate) => candidate.id === rawSelection.optionId,
      );
      if (!option) {
        throw new LookBookValidationError("A selected design option is invalid.");
      }
      inclusionSelections[category.id] = {
        optionId: option.id,
        status: "confirmed",
      };
      selections.push({
        categoryId: category.id,
        categoryTitle: category.title,
        optionId: option.id,
        optionNumber: option.optionNumber,
        optionName: option.name,
        tier: option.level,
      });
      continue;
    }

    for (const zone of category.zones) {
      const rawSelection = value.flooringSelections[zone.id];
      if (!isRecord(rawSelection) || rawSelection.status !== "confirmed") {
        throw new LookBookValidationError("Every flooring selection must be complete.");
      }
      const option = zone.options.find(
        (candidate) => candidate.id === rawSelection.optionId,
      );
      if (!option) {
        throw new LookBookValidationError("A selected flooring option is invalid.");
      }
      flooringSelections[zone.id] = {
        optionId: option.id,
        status: "confirmed",
      };
      selections.push({
        categoryId: category.id,
        categoryTitle: category.title,
        zoneId: zone.id,
        zoneTitle: zone.title,
        optionId: option.id,
        optionNumber: option.optionNumber,
        optionName: option.name,
        tier: option.level,
      });
    }
  }

  const configuration: HomeConfiguration = {
    schemaVersion: definition.configurationVersion,
    homeId: definition.homeId,
    inclusionSelections,
    flooringSelections,
    reviewStatus: "ready-for-review",
    lookBookPersonalization: null,
    ...(typeof value.culturalExteriorInterest === "boolean"
      ? { culturalExteriorInterest: value.culturalExteriorInterest }
      : {}),
  };

  return { configuration, selections };
}

export function parseCompletedLookBook(
  homeSlugValue: unknown,
  configurationValue: unknown,
) {
  const homeSlug = singleLine(homeSlugValue, 100);
  const registration = getHomeConfiguratorRegistration("custom-home", homeSlug);
  const definition = registration?.definition;

  if (!registration || registration.migrationStatus !== "canonical" || !definition) {
    throw new LookBookValidationError("This home does not have an active Look Book.");
  }

  const resolved = resolveConfiguration(definition, configurationValue);
  return { registration, definition, ...resolved };
}

export function personalizeStoredConfiguration(
  configuration: HomeConfiguration,
  definition: HomeConfiguratorDefinition,
  contact: LookBookContact,
  completedAt: string,
  existing?: HomeConfiguration["lookBookPersonalization"],
) {
  const preparedAt = existing?.preparedAt ?? completedAt;
  return {
    ...configuration,
    lookBookPersonalization: {
      customer: { firstName: contact.firstName },
      preparedAt,
      reference:
        existing?.reference ??
        createLookBookReference(definition.homeId, new Date(preparedAt)),
    },
  } satisfies HomeConfiguration;
}

export function classifyEmailLead(
  assistanceRequested: boolean,
  existing?: Pick<
    StoredLookBook,
    "leadState" | "followUpRequested" | "followUpRequestedAt" | "followUpSource"
  >,
  requestedAt = new Date().toISOString(),
): {
  leadState: LookBookLeadState;
  followUpRequested: boolean;
  followUpRequestedAt?: string;
  followUpSource?: FollowUpSource;
} {
  const followUpRequested =
    assistanceRequested || existing?.followUpRequested || false;
  if (!followUpRequested) {
    return { leadState: "known_engaged", followUpRequested: false };
  }
  return {
    leadState: "qualified_inquiry",
    followUpRequested: true,
    followUpRequestedAt: existing?.followUpRequestedAt ?? requestedAt,
    followUpSource:
      existing?.followUpSource ?? "email_assistance_checkbox",
  };
}

export function attachPropertyFeasibility(
  existing: StoredLookBook,
  propertyFeasibility: PropertyFeasibility,
  requestedAt = new Date().toISOString(),
): StoredLookBook {
  return {
    ...existing,
    leadState: "qualified_inquiry",
    followUpRequested: true,
    followUpRequestedAt: existing.followUpRequestedAt ?? requestedAt,
    followUpSource: existing.followUpSource ?? "property_check",
    propertyFeasibility,
    updatedAt: requestedAt,
  };
}
