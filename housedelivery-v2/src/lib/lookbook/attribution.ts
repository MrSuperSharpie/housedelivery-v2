"use client";

import type { LookBookAttribution } from "@/lib/lookbook/types";

const attributionStorageKey = "house-delivery:first-touch-attribution:v1";
const sessionStorageKey = "house-delivery:anonymous-session:v1";

function safeUuid() {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readStoredAttribution() {
  try {
    const value = window.localStorage.getItem(attributionStorageKey);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as LookBookAttribution;
    return parsed?.anonymousSessionId ? parsed : undefined;
  } catch {
    return undefined;
  }
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

  const parameters = new URLSearchParams(window.location.search);
  const value: LookBookAttribution = {
    anonymousSessionId: getSessionId(),
    landingPath: `${window.location.pathname}${window.location.search}`.slice(
      0,
      500,
    ),
    ...(document.referrer
      ? { initialReferrer: document.referrer.slice(0, 1_000) }
      : {}),
    ...(parameters.get("utm_source")
      ? { utmSource: parameters.get("utm_source")!.slice(0, 200) }
      : {}),
    ...(parameters.get("utm_medium")
      ? { utmMedium: parameters.get("utm_medium")!.slice(0, 200) }
      : {}),
    ...(parameters.get("utm_campaign")
      ? { utmCampaign: parameters.get("utm_campaign")!.slice(0, 300) }
      : {}),
    ...(parameters.get("utm_content")
      ? { utmContent: parameters.get("utm_content")!.slice(0, 300) }
      : {}),
    ...(parameters.get("utm_term")
      ? { utmTerm: parameters.get("utm_term")!.slice(0, 300) }
      : {}),
  };

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
