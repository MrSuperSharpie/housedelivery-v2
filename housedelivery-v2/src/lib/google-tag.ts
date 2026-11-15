import type { Campaign } from "@/lib/campaign-lead";

export const googleAnalyticsId = "G-59Q25GQB61";
export const googleAdsId = "AW-18548497593";

// One existing gtag.js loader serves both destinations. Keep GA4's privacy
// settings and manual SPA page views; Ads configuration is not a lead event.
export const googleTagInitialization = `window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config','${googleAnalyticsId}',{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});window.gtag('config','${googleAdsId}',{allow_ad_personalization_signals:false});`;

export type GoogleAdsDestinations = Partial<Record<Campaign, string | undefined>>;
const configuredDestinations: GoogleAdsDestinations = {
  "custom-homes": process.env.NEXT_PUBLIC_GOOGLE_ADS_CUSTOM_HOMES_SEND_TO,
  "laneway-carriage-homes": process.env.NEXT_PUBLIC_GOOGLE_ADS_LANEWAY_CARRIAGE_SEND_TO,
};

// Only exact snippets supplied by the Ads account can enable an action. An
// absent/invalid label must never invent a conversion or interrupt GA4/forms.
export function googleAdsConversion(
  reference: string,
  campaign: Campaign,
  destinations: GoogleAdsDestinations = configuredDestinations,
) {
  const sendTo = destinations[campaign]?.trim();
  if (!sendTo || !new RegExp(`^${googleAdsId}/[A-Za-z0-9_-]+$`).test(sendTo)) return null;
  if (!/^[a-f0-9-]{36}$/.test(reference)) return null;
  return { send_to: sendTo, transaction_id: reference };
}
