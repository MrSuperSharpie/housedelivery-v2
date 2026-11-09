"use client";

import { trackAnalyticsEvent } from "@/lib/analytics";
import type { LookBookAttribution } from "@/lib/lookbook/types";

export type LookBookAnalyticsEvent =
  | "configurator_viewed"
  | "configurator_started"
  | "configurator_category_completed"
  | "configurator_completed"
  | "lookbook_downloaded"
  | "lookbook_email_started"
  | "lookbook_email_submitted"
  | "follow_up_requested"
  | "property_check_started"
  | "property_check_submitted"
  | "lookbook_reopened";

type EventProperties = {
  home_slug: string;
  home_name: string;
  home_family: string;
  category?: string;
  completion_percentage?: number;
  selected_tier?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  utm_id?: string;
};

export function attributionEventProperties(
  attribution: LookBookAttribution,
) {
  return {
    ...(attribution.utmSource ? { utm_source: attribution.utmSource } : {}),
    ...(attribution.utmMedium ? { utm_medium: attribution.utmMedium } : {}),
    ...(attribution.utmCampaign
      ? { utm_campaign: attribution.utmCampaign }
      : {}),
    ...(attribution.utmContent ? { utm_content: attribution.utmContent } : {}),
    ...(attribution.utmTerm ? { utm_term: attribution.utmTerm } : {}),
    ...(attribution.utmId ? { utm_id: attribution.utmId } : {}),
  };
}

export function trackLookBookEvent(
  event: LookBookAnalyticsEvent,
  properties: EventProperties,
) {
  // The shared analytics manager is the only provider bridge. Keeping this
  // provider-neutral prevents duplicate delivery and keeps PII out of vendors.
  trackAnalyticsEvent(event, properties);
}
