"use client";

import type { LookBookAttribution } from "@/lib/lookbook/types";

const attributionStorageKey = "house-delivery:first-touch-attribution:v1";
const sessionStorageKey = "house-delivery:anonymous-session:v1";
const latestAttributionStorageKey = "house-delivery:latest-touch-attribution:v1";
const sessionAttributionStorageKey = "house-delivery:session-attribution:v1";

const campaignFields = [
  ["utm_source", "utmSource", 200],
  ["utm_medium", "utmMedium", 200],
  ["utm_campaign", "utmCampaign", 300],
  ["utm_content", "utmContent", 300],
  ["utm_term", "utmTerm", 300],
  ["utm_id", "utmId", 300],
] as const;

function safeUuid() {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readStoredAttribution(
  storage?: Storage,
  key = attributionStorageKey,
) {
  if (typeof window === "undefined") return undefined;
  try {
    const value = (storage ?? window.localStorage).getItem(key);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as LookBookAttribution;
    return parsed?.anonymousSessionId ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function readUtmTouch(parameters: URLSearchParams) {
  return Object.fromEntries(
    campaignFields.flatMap(([parameter, property, maximumLength]) => {
      const value = parameters.get(parameter)?.trim().slice(0, maximumLength);
      return value ? [[property, value]] : [];
    }),
  ) as Partial<LookBookAttribution>;
}

function hasCampaignTouch(value: Partial<LookBookAttribution>) {
  return campaignFields.some(([, property]) => Boolean(value[property]));
}

function currentTouch(): LookBookAttribution {
  const parameters = new URLSearchParams(window.location.search);
  return {
    anonymousSessionId: getSessionId(),
    landingPath: `${window.location.pathname}${window.location.search}`.slice(
      0,
      500,
    ),
    ...(document.referrer
      ? { initialReferrer: document.referrer.slice(0, 1_000) }
      : {}),
    ...readUtmTouch(parameters),
  };
}

function getSessionId() {
  try {
    const existing = window.localStorage.getItem(sessionStorageKey);
    if (existing) return existing;
    const created = safeUuid();
    window.localStorage.setItem(sessionStorageKey, created);
    return created;
  } catch {
    return safeUuid();
  }
}

export function captureFirstTouchAttribution(): LookBookAttribution {
  if (typeof window === "undefined") {
    return { anonymousSessionId: "" };
  }
  const stored = readStoredAttribution();
  if (stored) return stored;

  const value = currentTouch();

  try {
    window.localStorage.setItem(attributionStorageKey, JSON.stringify(value));
  } catch {
    // Attribution is best-effort and must never block the configurator.
  }

  return value;
}

export function getFirstTouchAttribution() {
  return readStoredAttribution() ?? captureFirstTouchAttribution();
}

export function captureLatestTouchAttribution() {
  const touch = currentTouch();
  const storedSession = readStoredAttribution(
    window.sessionStorage,
    sessionAttributionStorageKey,
  );
  const storedLatest = readStoredAttribution(
    window.localStorage,
    latestAttributionStorageKey,
  );
  const latest = hasCampaignTouch(touch)
    ? touch
    : storedSession ?? storedLatest ?? touch;

  try {
    window.sessionStorage.setItem(
      sessionAttributionStorageKey,
      JSON.stringify(latest),
    );
    if (hasCampaignTouch(touch)) {
      window.localStorage.setItem(
        latestAttributionStorageKey,
        JSON.stringify(touch),
      );
    }
  } catch {
    // Attribution is best-effort and must never block the site.
  }
  return latest;
}

function campaignProperties(
  prefix: "first" | "latest",
  attribution: LookBookAttribution,
) {
  return Object.fromEntries(
    campaignFields.flatMap(([parameter, property]) =>
      attribution[property]
        ? [[`${prefix}_${parameter}`, attribution[property]]]
        : [],
    ),
  );
}

export function getCampaignAttributionProperties() {
  const first = getFirstTouchAttribution();
  const latest = captureLatestTouchAttribution();
  const effective = hasCampaignTouch(latest) ? latest : first;
  return {
    ...Object.fromEntries(
      campaignFields.flatMap(([parameter, property]) =>
        effective[property] ? [[parameter, effective[property]]] : [],
      ),
    ),
    ...campaignProperties("first", first),
    ...campaignProperties("latest", latest),
  };
}
