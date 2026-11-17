import "server-only";

import { renderCustomerLookBookEmail } from "./email-template";
import { lookBookContactRequestText } from "./consent";

import type { StoredLookBook } from "@/lib/lookbook/types";

export type DeliveryResult = { sent: true; providerId: string } | { sent: false; reason: string };
export type LookBookMessage = { from: string; to: string[]; reply_to: string; subject: string; text: string; html?: string };

function tierLabel(tier: "premium" | "signature" | "shared") {
  if (tier === "shared") return "Shared exterior · Both residences";
  return tier === "premium" ? "Premium" : "Signature";
}

function emailConfigurationLines(record: StoredLookBook) {
  return record.selections.map(
    (selection) =>
      `${selection.zoneTitle ?? selection.categoryTitle}: ${tierLabel(selection.tier)} | ${selection.optionName}`,
  );
}

export async function sendLookBookMessage(
  message: LookBookMessage,
  idempotencyKey: string,
): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, reason: "missing_resend_api_key" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { sent: false, reason: `provider_${response.status}` };
    }
    const result: unknown = await response.json().catch(() => null);
    if (!result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string" || !result.id) return { sent: false, reason: "provider_missing_acceptance" };
    return { sent: true, providerId: result.id };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.name : "unknown_provider_error",
    };
  }
}

function fromAddress() {
  return (
    process.env.LOOKBOOK_FROM_EMAIL?.trim() ||
    process.env.INQUIRY_FROM_EMAIL?.trim() ||
    "House Delivery <inquiries@housedelivery.ca>"
  );
}

export function getLookBookPublicOrigin(requestUrl: string) {
  const configured = process.env.LOOKBOOK_PUBLIC_URL?.trim();
  return configured ? configured.replace(/\/$/, "") : new URL(requestUrl).origin;
}

export function customerLookBookMessage(record: StoredLookBook, origin: string): LookBookMessage {
  const { subject, text, html } = renderCustomerLookBookEmail(record, origin);
  return { from: fromAddress(), to: [record.contact.email], reply_to: "hello@housedelivery.ca", subject, text, html };
}

export function internalLookBookMessage(
  record: StoredLookBook,
  origin: string,
): LookBookMessage {
  const property = record.propertyFeasibility;
  const selectionLines = emailConfigurationLines(record);
  const text = [
    "HOUSE DELIVERY — LOOK BOOK CONTACT REQUEST",
    "",
    `Name: ${record.contact.firstName}`,
    `Email: ${record.contact.email}`,
    `Phone: ${record.contact.phone || "Not supplied"}`,
    `Home: ${record.homeDisplayName}`,
    `Configuration ID: ${record.id}`,
    "Status: Contact requested; project not yet assessed",
    "Confirmed buyer: No",
    "Marketing subscription: No",
    `Consent: ${record.fulfillment?.consent?.contactRequestText ?? (record.followUpSource === "property_check" ? "Customer submitted the property-review form." : lookBookContactRequestText)}`,
    `Contact requested at: ${record.followUpRequestedAt ?? "Not recorded"}`,
    "Follow-up Requested: Yes",
    `Follow-up Source: ${record.followUpSource ?? "Not supplied"}`,
    "",
    "DESIGN SELECTIONS",
    ...selectionLines,
    "",
    "PROPERTY / PROJECT",
    `Municipality: ${property?.municipality ?? "Not supplied"}`,
    `Province: ${property?.province ?? "Not supplied"}`,
    `Postal Code: ${property?.postalCode ?? "Not supplied"}`,
    `Property Status: ${property?.propertyStatus ?? "Not supplied"}`,
    `Project Type: ${property?.projectType ?? "Not supplied"}`,
    `Timing: ${property?.timing ?? "Not supplied"}`,
    `Address: ${property?.address ?? "Not supplied"}`,
    `Homes / Units: ${property?.unitCount ?? "Not supplied"}`,
    `Project Note: ${property?.notes ?? "Not supplied"}`,
    "",
    "SOURCE",
    `Initial Referrer: ${record.attribution.initialReferrer ?? "Not available"}`,
    `Landing Path: ${record.attribution.landingPath ?? "Not available"}`,
    `UTM Source: ${record.attribution.utmSource ?? "Not available"}`,
    `UTM Medium: ${record.attribution.utmMedium ?? "Not available"}`,
    `UTM Campaign: ${record.attribution.utmCampaign ?? "Not available"}`,
    `UTM Content: ${record.attribution.utmContent ?? "Not available"}`,
    `UTM Term: ${record.attribution.utmTerm ?? "Not available"}`,
    `Completed: ${record.completedAt}`,
    "",
    `VIEW LOOK BOOK: ${origin}/lookbook/${record.id}`,
  ].join("\n");
  const notificationAddress =
    process.env.LOOKBOOK_NOTIFICATION_EMAIL?.trim() ||
    "hello@housedelivery.ca";
  return {
    from: fromAddress(),
    to: [notificationAddress],
    reply_to: record.contact.email,
    subject: `${record.homeDisplayName} Look Book — contact requested by ${record.contact.firstName}`,
    text,
  };
}
