import { createHash, randomUUID } from "node:crypto";

import { models } from "@/data/models";

const inquiryRecipient = "hello@housedelivery.ca";
const inquiryRoute = "/api/inquiries";
const maximumRequestBytes = 50_000;

export const runtime = "nodejs";

type InquiryPayload = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  model?: unknown;
  location?: unknown;
  timeline?: unknown;
  notes?: unknown;
  company?: unknown;
  plannerProject?: unknown;
  plannerReference?: unknown;
  plannerContext?: unknown;
};

type InquiryLogContext = {
  requestId: string;
  status: number;
  durationMs: number;
  reason?: string;
  providerStatus?: number;
  providerError?: string;
  errorType?: string;
};

type ResendResponse = {
  id?: unknown;
  name?: unknown;
};

function singleLine(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
}

function multiline(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, maximumLength);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function jsonResponse(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function logInquiryFailure(
  event: string,
  {
    requestId,
    status,
    durationMs,
    reason,
    providerStatus,
    providerError,
    errorType,
  }: InquiryLogContext,
) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      route: inquiryRoute,
      requestId,
      status,
      durationMs,
      ...(reason ? { reason } : {}),
      ...(providerStatus ? { providerStatus } : {}),
      ...(providerError ? { providerError } : {}),
      ...(errorType ? { errorType } : {}),
    }),
  );
}

function providerErrorName(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  return singleLine((value as ResendResponse).name, 100);
}

function providerMessageId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  return singleLine((value as ResendResponse).id, 200);
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId =
    request.headers.get("x-vercel-id") ??
    request.headers.get("x-request-id") ??
    randomUUID();
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > maximumRequestBytes) {
    logInquiryFailure("inquiry_validation_failed", {
      requestId,
      status: 413,
      durationMs: Date.now() - startedAt,
      reason: "request_too_large",
    });
    return jsonResponse({ error: "Inquiry is too large." }, 413);
  }

  let parsedPayload: unknown;

  try {
    parsedPayload = await request.json();
  } catch {
    logInquiryFailure("inquiry_validation_failed", {
      requestId,
      status: 400,
      durationMs: Date.now() - startedAt,
      reason: "invalid_json",
    });
    return jsonResponse({ error: "Invalid inquiry data." }, 400);
  }

  if (
    !parsedPayload ||
    typeof parsedPayload !== "object" ||
    Array.isArray(parsedPayload)
  ) {
    logInquiryFailure("inquiry_validation_failed", {
      requestId,
      status: 400,
      durationMs: Date.now() - startedAt,
      reason: "invalid_payload",
    });
    return jsonResponse({ error: "Invalid inquiry data." }, 400);
  }

  const payload = parsedPayload as InquiryPayload;

  // Honeypot fields should remain empty for real visitors.
  if (singleLine(payload.company, 200)) {
    return jsonResponse({ accepted: true });
  }

  const firstName = singleLine(payload.firstName, 80);
  const lastName = singleLine(payload.lastName, 80);
  const email = singleLine(payload.email, 254).toLowerCase();
  const phone = singleLine(payload.phone, 50);
  const modelSlug = singleLine(payload.model, 100);
  const location = singleLine(payload.location, 160);
  const timeline = singleLine(payload.timeline, 80);
  const notes = multiline(payload.notes, 4_000);
  const plannerProject = singleLine(payload.plannerProject, 160);
  const plannerReference = singleLine(payload.plannerReference, 100);
  const plannerContext = multiline(payload.plannerContext, 30_000);

  if (!firstName || !lastName || !isEmail(email)) {
    logInquiryFailure("inquiry_validation_failed", {
      requestId,
      status: 400,
      durationMs: Date.now() - startedAt,
      reason: "missing_required_fields",
    });
    return jsonResponse(
      { error: "Name and a valid email address are required." },
      400,
    );
  }

  const selectedModel = modelSlug
    ? models.find((model) => model.slug === modelSlug)
    : undefined;

  if (modelSlug && !selectedModel) {
    logInquiryFailure("inquiry_validation_failed", {
      requestId,
      status: 400,
      durationMs: Date.now() - startedAt,
      reason: "invalid_model",
    });
    return jsonResponse({ error: "Invalid model selection." }, 400);
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.INQUIRY_FROM_EMAIL?.trim() ||
    "House Delivery Website <inquiries@housedelivery.ca>";

  if (!resendApiKey) {
    logInquiryFailure("inquiry_configuration_failed", {
      requestId,
      status: 503,
      durationMs: Date.now() - startedAt,
      reason: "missing_resend_api_key",
    });
    return jsonResponse(
      { error: "Inquiry delivery is temporarily unavailable." },
      503,
    );
  }

  const isPlannerProjectReview = Boolean(plannerContext);
  const message = isPlannerProjectReview
    ? [
        "New House Delivery Planner project review",
        "",
        `Opportunity Report: ${plannerReference || "Not provided"}`,
        `Community / project: ${plannerProject || "Not provided"}`,
        `Review contact: ${firstName} ${lastName}`,
        `Email: ${email}`,
        `Phone: ${phone || "Not provided"}`,
        `Project location: ${location || "Not provided"}`,
        `Desired start: ${timeline || "Not provided"}`,
        `Additional review notes: ${notes || "Not provided"}`,
        "",
        plannerContext,
      ].join("\n")
    : [
        "New House Delivery project review inquiry",
        "",
        `Name: ${firstName} ${lastName}`,
        `Email: ${email}`,
        `Phone: ${phone || "Not provided"}`,
        `Preferred model: ${selectedModel?.name ?? "Still exploring"}`,
        `Project location: ${location || "Not provided"}`,
        `Desired start: ${timeline || "Not provided"}`,
        "",
        "Project details:",
        notes || "Not provided",
      ].join("\n");

  const idempotencyKey = `project-inquiry-${createHash("sha256")
    .update(
      JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        modelSlug,
        location,
        timeline,
        notes,
        plannerProject,
        plannerReference,
        plannerContext,
      }),
    )
    .digest("hex")}`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [inquiryRecipient],
        reply_to: email,
        subject: isPlannerProjectReview
          ? `Planner project review — ${plannerProject || `${firstName} ${lastName}`}${plannerReference ? ` — ${plannerReference}` : ""}`
          : `Project inquiry — ${firstName} ${lastName}`,
        text: message,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const providerResponse: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      logInquiryFailure("inquiry_provider_failed", {
        requestId,
        status: 502,
        durationMs: Date.now() - startedAt,
        providerStatus: response.status,
        providerError: providerErrorName(providerResponse),
      });
      return jsonResponse({ error: "Inquiry delivery failed." }, 502);
    }

    if (!providerMessageId(providerResponse)) {
      logInquiryFailure("inquiry_provider_failed", {
        requestId,
        status: 502,
        durationMs: Date.now() - startedAt,
        reason: "missing_provider_message_id",
        providerStatus: response.status,
      });
      return jsonResponse({ error: "Inquiry delivery failed." }, 502);
    }

    console.info(
      JSON.stringify({
        level: "info",
        event: "inquiry_delivery_accepted",
        route: inquiryRoute,
        requestId,
        status: 200,
        durationMs: Date.now() - startedAt,
      }),
    );
  } catch (error) {
    logInquiryFailure("inquiry_provider_failed", {
      requestId,
      status: 502,
      durationMs: Date.now() - startedAt,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "Inquiry delivery failed." }, 502);
  }

  return jsonResponse({ accepted: true });
}
