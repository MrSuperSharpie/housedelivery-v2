import { createHash, randomUUID } from "node:crypto";

import {
  attachPropertyFeasibility,
  classifyEmailLead,
  createConfigurationId,
  LookBookValidationError,
  parseAttribution,
  parseCompletedLookBook,
  parseConfigurationId,
  parseContact,
  parsePropertyFeasibility,
  personalizeStoredConfiguration,
  singleLine,
} from "@/lib/lookbook/domain";
import {
  getLookBookPublicOrigin,
  sendCustomerLookBookEmail,
  sendInternalLookBookNotification,
} from "@/lib/lookbook/email";
import {
  getLookBookRepository,
  LookBookStorageUnavailableError,
} from "@/lib/lookbook/repository";
import type {
  LookBookSubmission,
  StoredLookBook,
} from "@/lib/lookbook/types";

export const runtime = "nodejs";

const maximumRequestBytes = 75_000;
const rateLimitWindowMs = 10 * 60 * 1_000;
const rateLimitMaximum = 10;
const rateLimitBuckets = new Map<string, number[]>();

function jsonResponse(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const address = forwarded?.trim() || "unknown";
  return createHash("sha256").update(address).digest("hex").slice(0, 24);
}

function isRateLimited(request: Request) {
  const now = Date.now();
  const key = requestFingerprint(request);
  const active = (rateLimitBuckets.get(key) ?? []).filter(
    (timestamp) => now - timestamp < rateLimitWindowMs,
  );
  if (active.length >= rateLimitMaximum) return true;
  active.push(now);
  rateLimitBuckets.set(key, active);
  return false;
}

function safeLog(event: string, requestId: string, reason?: string) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      route: "/api/lookbooks",
      requestId,
      ...(reason ? { reason } : {}),
    }),
  );
}

function isSubmission(value: unknown): value is LookBookSubmission {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "intent" in value &&
    ((value as { intent?: unknown }).intent === "email" ||
      (value as { intent?: unknown }).intent === "property_check")
  );
}

export async function POST(request: Request) {
  const requestId =
    request.headers.get("x-vercel-id") ??
    request.headers.get("x-request-id") ??
    randomUUID();
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > maximumRequestBytes) {
    return jsonResponse({ error: "Request is too large." }, 413);
  }
  if (isRateLimited(request)) {
    return jsonResponse(
      { error: "Please wait a few minutes before trying again." },
      429,
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid Look Book request." }, 400);
  }
  if (!isSubmission(payload)) {
    return jsonResponse({ error: "Invalid Look Book request." }, 400);
  }

  // Honeypot: accept silently so bots receive no useful signal.
  if (singleLine(payload.company, 200)) {
    return jsonResponse({ accepted: true });
  }

  try {
    const repository = getLookBookRepository();
    const suppliedId = parseConfigurationId(payload.configurationId);
    const existing = suppliedId
      ? await repository.findById(suppliedId)
      : null;
    const now = new Date().toISOString();
    let record: StoredLookBook;
    let shouldNotify = false;

    if (payload.intent === "email") {
      const contact = parseContact(payload.contact);
      const { registration, definition, configuration, selections } =
        parseCompletedLookBook(payload.homeSlug, payload.configuration);
      if (existing && existing.homeSlug !== definition.homeId) {
        throw new LookBookValidationError(
          "The saved Look Book belongs to a different home.",
        );
      }
      const followUpRequested = payload.followUpRequested === true;
      const classification = classifyEmailLead(
        followUpRequested,
        existing ?? undefined,
        now,
      );
      const completedAt = existing?.completedAt ?? now;
      const id = existing?.id ?? suppliedId ?? createConfigurationId();
      const personalizedConfiguration = personalizeStoredConfiguration(
        configuration,
        definition,
        contact,
        completedAt,
        existing?.configuration.lookBookPersonalization,
      );
      shouldNotify = followUpRequested && !existing?.followUpRequested;
      record = {
        id,
        homeSlug: definition.homeId,
        homeDisplayName: definition.homeName,
        homeFamily: registration.productFamily,
        configuratorVersion: definition.configurationVersion,
        configuration: personalizedConfiguration,
        selections,
        contact,
        ...classification,
        ...(existing?.propertyFeasibility
          ? { propertyFeasibility: existing.propertyFeasibility }
          : {}),
        attribution: existing?.attribution ?? parseAttribution(payload.attribution),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        completedAt,
        emailRequestedAt: now,
      };
    } else {
      const property = parsePropertyFeasibility(payload.property, now);

      if (existing) {
        shouldNotify = !existing.propertyFeasibility;
        record = attachPropertyFeasibility(existing, property, now);
      } else {
        const contact = parseContact(payload.contact);
        const { registration, definition, configuration, selections } =
          parseCompletedLookBook(payload.homeSlug, payload.configuration);
        const id = suppliedId ?? createConfigurationId();
        record = {
          id,
          homeSlug: definition.homeId,
          homeDisplayName: definition.homeName,
          homeFamily: registration.productFamily,
          configuratorVersion: definition.configurationVersion,
          configuration: personalizeStoredConfiguration(
            configuration,
            definition,
            contact,
            now,
          ),
          selections,
          contact,
          leadState: "qualified_inquiry",
          followUpRequested: true,
          followUpRequestedAt: now,
          followUpSource: "property_check",
          propertyFeasibility: property,
          attribution: parseAttribution(payload.attribution),
          createdAt: now,
          updatedAt: now,
          completedAt: now,
        };
        shouldNotify = true;
      }
    }

    const saved = await repository.save(record);
    const origin = getLookBookPublicOrigin(request.url);
    const customerDelivery =
      payload.intent === "email"
        ? await sendCustomerLookBookEmail(saved, origin)
        : undefined;
    const internalDelivery = shouldNotify
      ? await sendInternalLookBookNotification(saved, origin)
      : undefined;

    if (customerDelivery && !customerDelivery.sent) {
      safeLog(
        "lookbook_customer_delivery_failed",
        requestId,
        customerDelivery.reason,
      );
    }
    if (internalDelivery && !internalDelivery.sent) {
      safeLog(
        "lookbook_internal_delivery_failed",
        requestId,
        internalDelivery.reason,
      );
    }

    const emailSent = customerDelivery?.sent ?? false;
    return jsonResponse(
      {
        accepted: true,
        saved: true,
        configurationId: saved.id,
        leadState: saved.leadState,
        followUpRequested: saved.followUpRequested,
        ...(payload.intent === "email" ? { emailSent } : {}),
      },
      payload.intent === "email" && !emailSent ? 202 : 200,
    );
  } catch (error) {
    if (error instanceof LookBookValidationError) {
      return jsonResponse({ error: error.message }, 400);
    }
    if (error instanceof LookBookStorageUnavailableError) {
      safeLog("lookbook_storage_unavailable", requestId, "not_configured");
      return jsonResponse(
        {
          error:
            "We couldn’t save your Look Book right now. Your selections are still here and PDF download remains available.",
        },
        503,
      );
    }
    safeLog(
      "lookbook_submission_failed",
      requestId,
      error instanceof Error ? error.name : "unknown_error",
    );
    return jsonResponse(
      {
        error:
          "We couldn’t save your Look Book right now. Your selections are still here and PDF download remains available.",
      },
      502,
    );
  }
}
