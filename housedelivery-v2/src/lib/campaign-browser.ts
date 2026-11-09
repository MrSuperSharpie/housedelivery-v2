"use client";

import { attributionFields, campaignPaths, isCampaign, sanitizeTouch, type Campaign, type LeadAttribution, type Touch } from "@/lib/campaign-lead";

export const consentKey = "house-delivery:analytics-consent:v1";
export const campaignConsentEvent = "house-delivery:consent-change";
export const campaignLeadEvent = "house-delivery:campaign-lead-ready";
const firstKey = "house-delivery:campaign-first:v1";
const latestKey = "house-delivery:campaign-latest:v1";
const receiptKey = "house-delivery:campaign-receipts:v1";
const lifetime = 30 * 24 * 60 * 60 * 1000;
export type CampaignReceipt = { reference: string; campaign: Campaign; receivedAt: string; measurementPending: boolean; measured?: boolean };
export function campaignConsent(): LeadAttribution["consent"] {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl || nav.doNotTrack === "1") return "declined";
  try { const value = localStorage.getItem(consentKey); return value === "accepted" || value === "declined" ? value : "unset"; } catch { return "unset"; }
}
function readTouch(storage: Storage, key: string) {
  try { const touch = sanitizeTouch(JSON.parse(storage.getItem(key) ?? "null")); return touch && Date.now() - Date.parse(touch.capturedAt) < lifetime && Date.parse(touch.capturedAt) <= Date.now() + 60_000 ? touch : undefined; } catch { return; }
}
export function captureCampaignAttribution(campaign: Campaign): LeadAttribution {
  const consent = campaignConsent();
  if (consent !== "accepted") {
    try { localStorage.removeItem(firstKey); sessionStorage.removeItem(latestKey); } catch {}
    return { consent };
  }
  const current: Touch = { landingPath: campaignPaths[campaign], capturedAt: new Date().toISOString() };
  const query = new URLSearchParams(location.search);
  for (const key of attributionFields) { const value = query.get(key); if (value) current[key] = value; }
  const touch = sanitizeTouch(current)!;
  try {
    const firstTouch = readTouch(localStorage, firstKey) ?? touch;
    const storedLatest = readTouch(sessionStorage, latestKey);
    const hasCampaign = attributionFields.some(key => Boolean(touch[key]));
    const sameTouch = storedLatest?.landingPath === touch.landingPath && attributionFields.every(key => storedLatest?.[key] === touch[key]);
    const latestTouch = hasCampaign && !sameTouch ? touch : storedLatest ?? touch;
    localStorage.setItem(firstKey, JSON.stringify(firstTouch)); sessionStorage.setItem(latestKey, JSON.stringify(latestTouch));
    return { consent, firstTouch, latestTouch };
  } catch { return { consent, firstTouch: touch, latestTouch: touch }; }
}
export function readCampaignReceipts(): CampaignReceipt[] {
  try { const raw: unknown = JSON.parse(sessionStorage.getItem(receiptKey) ?? "[]"); return Array.isArray(raw) ? raw.filter(r => r && typeof r.reference === "string" && /^[a-f0-9-]{36}$/.test(r.reference) && isCampaign(r.campaign) && Date.now() - Date.parse(r.receivedAt) < 24 * 60 * 60 * 1000).slice(-10) : []; } catch { return []; }
}
export function storeCampaignReceipt(reference: string, campaign: Campaign) {
  const receipt: CampaignReceipt = { reference, campaign, receivedAt: new Date().toISOString(), measurementPending: campaignConsent() === "accepted" };
  try { const prior = readCampaignReceipts(); if (!prior.some(r => r.reference === reference)) sessionStorage.setItem(receiptKey, JSON.stringify([...prior, receipt].slice(-10))); } catch {}
  window.dispatchEvent(new Event(campaignLeadEvent));
}
export function consumeCampaignConversions(send: (reference: string, campaign: Campaign) => void) {
  if (campaignConsent() !== "accepted") return;
  const receipts = readCampaignReceipts();
  for (const receipt of receipts) {
    if (!receipt.measurementPending || receipt.measured) continue;
    receipt.measured = true; receipt.measurementPending = false;
    // Mark before dispatch; a page reload must not turn into another conversion.
    try { sessionStorage.setItem(receiptKey, JSON.stringify(receipts)); } catch { return; }
    send(receipt.reference, receipt.campaign);
  }
}
