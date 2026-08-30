import "server-only";

import { createHash } from "node:crypto";

import type { StoredLookBook } from "@/lib/lookbook/types";

type DeliveryResult = { sent: true } | { sent: false; reason: string };

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  );
}

function tierLabel(tier: "premium" | "signature") {
  return tier === "premium" ? "Premium" : "Signature";
}

function emailConfigurationLines(record: StoredLookBook) {
  return record.selections.map(
    (selection) =>
      `${selection.zoneTitle ?? selection.categoryTitle}: ${tierLabel(selection.tier)} | ${selection.optionName}`,
  );
}

async function sendResend(
  message: Record<string, unknown>,
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
    return { sent: true };
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

export async function sendCustomerLookBookEmail(
  record: StoredLookBook,
  origin: string,
) {
  const savedLookBookUrl = `${origin}/lookbook/${record.id}`;
  const viewUrl = `${savedLookBookUrl}?download=1`;
  const downloadUrl = viewUrl;
  const propertyUrl = `${savedLookBookUrl}#check-my-property`;
  const safeFirstName = escapeHtml(record.contact.firstName);
  const safeHomeName = escapeHtml(record.homeDisplayName);
  const text = [
    "HOUSE DELIVERY",
    "",
    `YOUR ${record.homeDisplayName.toUpperCase()} LOOK BOOK IS READY`,
    "",
    `Hello ${record.contact.firstName},`,
    "",
    "Your selections have been saved.",
    "",
    `View My Look Book: ${viewUrl}`,
    `Download My Look Book: ${downloadUrl}`,
    "",
    "Considering a real property?",
    `Check My Property: ${propertyUrl}`,
    "",
    "House Delivery",
    "hello@housedelivery.ca",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#e7e3d8;color:#111216;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:48px 24px"><p style="font-size:11px;letter-spacing:.2em;font-weight:700">HOUSE DELIVERY</p><div style="border-top:1px solid #a6a197;margin-top:28px;padding-top:36px"><p style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#605d56">Your saved design</p><h1 style="font-size:42px;line-height:1.02;letter-spacing:-.04em;margin:18px 0 24px">Your ${safeHomeName} Look Book is ready.</h1><p style="font-size:16px;line-height:1.7;color:#55524c">Hello ${safeFirstName}, your selections have been saved so you can return whenever you’re ready.</p><p style="margin:34px 0 14px"><a href="${viewUrl}" style="display:inline-block;background:#111216;color:#fff;text-decoration:none;padding:17px 24px;font-size:11px;letter-spacing:.14em;text-transform:uppercase">View My Look Book</a></p><p><a href="${downloadUrl}" style="color:#111216;font-size:12px;text-transform:uppercase;letter-spacing:.12em">Download My Look Book</a></p></div><div style="border-top:1px solid #a6a197;margin-top:42px;padding-top:28px"><p style="font-size:15px">Considering a real property?</p><p><a href="${propertyUrl}" style="color:#111216;font-size:12px;text-transform:uppercase;letter-spacing:.12em">Check My Property</a></p></div><p style="margin-top:48px;font-size:12px;line-height:1.6;color:#69655e">This is a transactional email requested to deliver and save your Look Book. It does not subscribe you to marketing. Questions? hello@housedelivery.ca</p></div></body></html>`;

  return sendResend(
    {
      from: fromAddress(),
      to: [record.contact.email],
      reply_to: "hello@housedelivery.ca",
      subject: `Your ${record.homeDisplayName} Look Book is ready`,
      text,
      html,
    },
    `lookbook-customer-${record.id}`,
  );
}

export async function sendInternalLookBookNotification(
  record: StoredLookBook,
  origin: string,
) {
  const property = record.propertyFeasibility;
  const selectionLines = emailConfigurationLines(record);
  const text = [
    "NEW HOUSE DELIVERY INQUIRY",
    "",
    `Name: ${record.contact.firstName}`,
    `Email: ${record.contact.email}`,
    `Phone: ${record.contact.phone || "Not supplied"}`,
    `Home: ${record.homeDisplayName}`,
    `Configuration ID: ${record.id}`,
    "Lead Status: Qualified Inquiry",
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
  const versionHash = createHash("sha256")
    .update(`${record.followUpSource}:${record.followUpRequestedAt}`)
    .digest("hex")
    .slice(0, 20);

  return sendResend(
    {
      from: fromAddress(),
      to: [notificationAddress],
      reply_to: record.contact.email,
      subject: `New ${record.homeDisplayName} qualified inquiry — ${record.contact.firstName}`,
      text,
    },
    `lookbook-internal-${record.id}-${versionHash}`,
  );
}
