import { createHmac } from "node:crypto";

import { formatBuildHomeInquiry, InquiryValidationError, parseBuildHomeInquiry } from "@/lib/build-home-inquiry";
import { createFormToken, createInquiryRateLimit, verifyFormToken } from "@/lib/build-home-form-security";
import { createLeadRecord, parseLeadContext } from "@/lib/campaign-lead";
import { leadAttachments } from "@/lib/campaign-lead-export";
import { reviewPropertyAddress } from "@/lib/property-review/workflow";
import { buildPublicPropertySnapshot } from "@/lib/property-review/snapshot";
import { appendPropertyReviewToLeadEmail } from "@/lib/property-review/email";
import { sealCampaignReview, openCampaignReview } from "@/lib/property-review/campaign-token";
import { sendInquiryEmail } from "@/lib/inquiry-email";

export const runtime = "nodejs";

const allowAttempt = createInquiryRateLimit();
const allowPropertyReview = createInquiryRateLimit();
const maximumBytes = 16_000;
const recipient = "sales@housedelivery.ca";

function json(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function formSecret() {
  // Domain-separated signatures work with the existing server-only email key.
  // A dedicated secret can be supplied without changing the public form.
  return process.env.BUILD_HOME_FORM_SECRET?.trim() || process.env.RESEND_API_KEY?.trim();
}

export async function GET() {
  const secret = formSecret();
  if (!secret) return json({ error: "Please email sales@housedelivery.ca while our form is unavailable." }, 503);
  return json({ token: createFormToken(secret) });
}

async function readPayload(request: Request) {
  if (!request.body) throw new InquiryValidationError("Please check your project details.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel();
        throw new InquiryValidationError("Your inquiry is too large. Please shorten the project details.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InquiryValidationError("Please check your project details.");
  return value as Record<string, unknown>;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ error: "Please submit your inquiry from the House Delivery website." }, 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: "Please check your project details." }, 415);
  }
  if (Number(request.headers.get("content-length")) > maximumBytes) return json({ error: "Your inquiry is too large." }, 413);
  const secret = formSecret();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!secret || !apiKey) return json({ error: "Please email sales@housedelivery.ca while our form is unavailable." }, 503);

  try {
    const payload = await readPayload(request);
    if (payload.company) return json({ error: "We couldn’t verify this inquiry. Please email sales@housedelivery.ca." }, 400);
    const inquiryId = verifyFormToken(payload.token, secret);
    if (!inquiryId) return json({ error: "Please refresh the form verification and try again.", refreshToken: true }, 400);
    const ip = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "unknown";
    const key = createHmac("sha256", secret).update(`inquiry-rate:${ip.split(",")[0].trim()}`).digest("hex");
    if (payload.action === "property_review") {
      if (!allowPropertyReview(key)) return json({ error: "Please wait a few minutes before checking another property, or email sales@housedelivery.ca." }, 429);
      const address = typeof payload.propertyAddress === "string" ? payload.propertyAddress.trim() : "";
      const municipality = typeof payload.municipality === "string" ? payload.municipality.trim() : "";
      if (!address || address.length > 240 || !municipality || municipality.length > 160 || /[\u0000-\u001f\u007f<>]/.test(address + municipality)) {
        return json({ error: "Please enter the property address and municipality." }, 400);
      }
      const searchAddress = address.toLowerCase().includes(municipality.toLowerCase()) ? address : `${address}, ${municipality}, BC`;
      const review = await reviewPropertyAddress(searchAddress);
      const snapshot = buildPublicPropertySnapshot(review);
      if (snapshot.status === "yellow") snapshot.message = "The available information needs a closer look before a recommendation can be made. Request a conversation and our team can review the property with you.";
      const reviewToken = sealCampaignReview(review, address, municipality, inquiryId, secret);
      return json({ propertySnapshot: snapshot, reviewToken });
    }
    const inquiry = parseBuildHomeInquiry(payload);
    const context = parseLeadContext(payload, inquiry);
    let propertyReview;
    if (context.campaign === "laneway-carriage-homes") {
      propertyReview = openCampaignReview(payload.reviewToken, context.propertyAddress, inquiry.municipality, inquiryId, secret);
      if (!propertyReview) return json({ error: "Please check your property again before requesting a conversation.", reviewAgain: true }, 400);
    }
    const record = createLeadRecord(inquiry, inquiryId, context, new Date(Number(String(payload.token).split(".")[0])));
    if (propertyReview) {
      record.property_review_status = propertyReview.leadState;
      record.property_review_reason = propertyReview.reason;
      record.property_review_jurisdiction = propertyReview.jurisdiction || propertyReview.municipality;
      record.property_review_zoning = propertyReview.zoningDistrict || "";
      record.property_review_next_action = propertyReview.recommendedNextAction;
    }
    if (!allowAttempt(key)) return json({ error: "Please wait a few minutes before trying again, or email sales@housedelivery.ca." }, 429);
    const leadText = `${formatBuildHomeInquiry(inquiry, inquiryId, context.sourcePath)}\n\nLead record (for CRM entry):\n${Object.entries(record).map(([field, value]) => `${field}: ${value}`).join("\n")}\n\nCSV and JSON copies are attached for your existing CRM workflow.`;

    // One distribution address owns Edgar/Brian routing; do not duplicate it with CCs.
    const response = await sendInquiryEmail({
      apiKey,
      idempotencyKey: `build-home-${inquiryId}`,
      message: {
        from: process.env.INQUIRY_FROM_EMAIL?.trim() || "House Delivery Website <inquiries@housedelivery.ca>",
        to: [recipient],
        reply_to: inquiry.email,
        subject: `${process.env.VERCEL_ENV === "preview" ? "[PREVIEW TEST] " : ""}Build your home — ${inquiry.projectType} — ${inquiry.municipality}`,
        text: propertyReview ? appendPropertyReviewToLeadEmail(leadText, propertyReview) : leadText,
        attachments: leadAttachments(record),
      },
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok || !result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string" || !result.id.trim()) {
      console.error(JSON.stringify({ event: "build_home_delivery_failed", inquiryId, providerStatus: response.status }));
      return json({ error: "We couldn’t send your inquiry. Your details are still here; please try again or email sales@housedelivery.ca." }, 502);
    }
    console.info(JSON.stringify({ event: "build_home_delivery_accepted", inquiryId, providerMessageId: result.id }));
    return json({ accepted: true, inquiryId });
  } catch (error) {
    if (error instanceof InquiryValidationError) return json({ error: error.message }, 400);
    if (error instanceof SyntaxError) return json({ error: "Please check your project details." }, 400);
    console.error(JSON.stringify({ event: "build_home_delivery_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    return json({ error: "We couldn’t send your inquiry. Please try again or email sales@housedelivery.ca." }, 502);
  }
}
