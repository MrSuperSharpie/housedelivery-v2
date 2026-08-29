"use client";

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
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function attributionEventProperties(
  attribution: LookBookAttribution,
) {
  return {
    ...(attribution.utmSource ? { utm_source: attribution.utmSource } : {}),
    ...(attribution.utmMedium ? { utm_medium: attribution.utmMedium } : {}),
    ...(attribution.utmCampaign
      ? { utm_campaign: attribution.utmCampaign }
      : {}),
  };
}

export function trackLookBookEvent(
  event: LookBookAnalyticsEvent,
  properties: EventProperties,
) {
  const detail = { event, ...properties };

  // This is deliberately provider-neutral. Existing/future analytics can listen
  // for the browser event or use a conventional dataLayer without changing the
  // configurator. Never add contact or exact-property fields here.
  window.dispatchEvent(
    new CustomEvent("house-delivery:analytics", { detail }),
  );
  window.dataLayer?.push(detail);
}
