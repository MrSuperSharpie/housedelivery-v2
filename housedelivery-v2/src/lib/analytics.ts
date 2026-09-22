"use client";

export const analyticsBrowserEvent = "house-delivery:analytics";

export type AnalyticsEventProperties = Record<
  string,
  string | number | boolean | undefined
>;

export type AnalyticsEventDetail = AnalyticsEventProperties & {
  event: string;
};

export const campaignParameterNames = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
] as const;

const blockedPropertyNames = new Set([
  "address",
  "company",
  "contact",
  "email",
  "first_name",
  "last_name",
  "location",
  "notes",
  "phone",
]);

export function isProductionAnalyticsHost(hostname: string) {
  return hostname === "housedelivery.ca" || hostname === "www.housedelivery.ca";
}

export function getSafeAnalyticsPath(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get">,
) {
  const campaignQuery = new URLSearchParams();
  for (const parameter of campaignParameterNames) {
    const value = searchParams.get(parameter)?.trim();
    if (value) campaignQuery.set(parameter, value.slice(0, 200));
  }
  const query = campaignQuery.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

export function sanitizeAnalyticsProperties(
  properties: AnalyticsEventProperties,
) {
  return Object.entries(properties).reduce<AnalyticsEventProperties>(
    (safeProperties, [key, value]) => {
      if (blockedPropertyNames.has(key.toLowerCase()) || value === undefined) {
        return safeProperties;
      }
      safeProperties[key] =
        typeof value === "string" ? value.slice(0, 300) : value;
      return safeProperties;
    },
    {},
  );
}

export function trackAnalyticsEvent(
  event: string,
  properties: AnalyticsEventProperties = {},
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AnalyticsEventDetail>(analyticsBrowserEvent, {
      detail: { event, ...sanitizeAnalyticsProperties(properties) },
    }),
  );
}

export function classifyAnalyticsClick({
  href,
  text,
}: {
  href?: string;
  text: string;
}) {
  const normalizedText = text.replace(/\s+/g, " ").trim().toLowerCase();
  const normalizedHref = href?.trim().toLowerCase() ?? "";

  if (normalizedHref.startsWith("mailto:")) return "email_click";
  if (normalizedHref.startsWith("tel:")) return "phone_click";
  if (
    normalizedHref.endsWith(".pdf") ||
    normalizedHref.includes("/pdf?") ||
    normalizedHref.includes("disposition=attachment")
  ) {
    return normalizedHref.includes("/lookbook/")
      ? "lookbook_pdf_download"
      : "pdf_download";
  }
  if (
    normalizedHref.includes("/plan-a-housing-project") ||
    normalizedHref.includes("#reserve") ||
    normalizedText.includes("request a project review") ||
    normalizedText.includes("submit project review") ||
    normalizedText.includes("begin your project review")
  ) {
    return "quote_cta_click";
  }
  if (normalizedText.includes("design my ")) {
    return "configurator_cta_click";
  }
  if (
    normalizedText.includes("look book") &&
    /\b(open|view)\b/.test(normalizedText)
  ) {
    return "lookbook_view_click";
  }
  if (
    normalizedText.includes("look book") &&
    /\b(create|get)\b/.test(normalizedText)
  ) {
    return "lookbook_cta_click";
  }
  if (
    normalizedText === "explore the homes" ||
    normalizedText === "explore homes" ||
    normalizedText === "explore the inclusions library"
  ) {
    return "major_cta_click";
  }
  return undefined;
}
