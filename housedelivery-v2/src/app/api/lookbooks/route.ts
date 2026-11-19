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
  customerLookBookMessage,
  internalLookBookMessage,
  sendLookBookMessage,
} from "@/lib/lookbook/email";
import {
  getLookBookRepository,
  LookBookStorageUnavailableError,
  LookBookConflictError,
} from "@/lib/lookbook/repository";
import type {
  LookBookSubmission,
  StoredLookBook,
} from "@/lib/lookbook/types";

import { deliverLookBook, nextLookBookTimestamp } from "@/lib/lookbook/delivery";
import { getLookBookPdfRevision } from "@/lib/lookbook/pdf-artifact";
import { lookBookConsentVersion, lookBookContactRequestText } from "@/lib/lookbook/consent";

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
  if (request.headers.get("origin") !== new URL(request.url).origin) return jsonResponse({ error: "Please use the Look Book form on this website." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return jsonResponse({ error: "Please submit the Look Book form as JSON." }, 415);
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
    if (!request.body) throw Error("Missing request");
    const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; if (bytes > maximumRequestBytes) { await reader.cancel(); return jsonResponse({ error: "Request is too large." }, 413); } chunks.push(part.value); }
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
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

  let savedForRecovery: StoredLookBook | undefined;
  try {
    const repository = getLookBookRepository();
    const suppliedId = parseConfigurationId(payload.configurationId);
    const existing = suppliedId
      ? await repository.findById(suppliedId)
      : null;
    if (existing?.configuration.lookBookPersonalization?.project) {
      return jsonResponse({ error: "Saved Look Book not found." }, 404);
    }
    const now = new Date().toISOString();
    let record: StoredLookBook;
    let previousVersion = existing?.updatedAt;

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
        emailRequestedAt: existing?.emailRequestedAt ?? now,
        fulfillment: { ...existing?.fulfillment, version: 1, consent: {
          version: lookBookConsentVersion,
          lookBookRequestedAt: existing?.fulfillment?.consent?.lookBookRequestedAt ?? now,
          ...(classification.followUpRequested ? { contactRequestText: existing?.fulfillment?.consent?.contactRequestText ?? lookBookContactRequestText, contactRequestedAt: classification.followUpRequestedAt } : {}),
          marketingSubscribed: false,
        } },
      };
    } else {
      const property = parsePropertyFeasibility(payload.property, now);

      if (existing) {

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
          leadState: "known_engaged",
          followUpRequested: true,
          followUpRequestedAt: now,
          followUpSource: "property_check",
          propertyFeasibility: property,
          attribution: parseAttribution(payload.attribution),
          createdAt: now,
          updatedAt: now,
          completedAt: now,
        };

      }
    }

    // A changed design/contact gets a new immutable snapshot. Earlier email
    // links keep their original design; another visitor cannot replace it.
    if (payload.intent === "email" && existing && (getLookBookPdfRevision(record) !== getLookBookPdfRevision(existing) || record.contact.email !== existing.contact.email)) {
      record = { ...record, id: createConfigurationId(), completedAt: now, createdAt: now, updatedAt: now, emailRequestedAt: now, propertyFeasibility: undefined, ...classifyEmailLead(payload.followUpRequested === true, undefined, now), fulfillment: { version: 1, consent: { version: lookBookConsentVersion, lookBookRequestedAt: now, ...(payload.followUpRequested === true ? { contactRequestText: lookBookContactRequestText, contactRequestedAt: now } : {}), marketingSubscribed: false } } };
      previousVersion = undefined;
    }
    if (existing?.propertyFeasibility && record.propertyFeasibility) {
      const withoutDate = (p: typeof record.propertyFeasibility) => JSON.stringify({ ...p, submittedAt: undefined });
      if (withoutDate(existing.propertyFeasibility) === withoutDate(record.propertyFeasibility)) record.propertyFeasibility = existing.propertyFeasibility;
    }
    const unchanged = existing && record.id === existing.id && JSON.stringify({ ...record, updatedAt: undefined }) === JSON.stringify({ ...existing, updatedAt: undefined });
    const saved = unchanged ? existing : await repository.save({ ...record, updatedAt: previousVersion ? nextLookBookTimestamp(previousVersion) : now }, previousVersion ?? null);
    savedForRecovery = saved;
    const origin = getLookBookPublicOrigin(request.url);
    const delivery = await deliverLookBook(saved, repository, {
      ...(payload.intent === "email" ? { customer: customerLookBookMessage(saved, origin) } : {}),
      ...(saved.followUpRequested && (payload.intent === "property_check" || payload.followUpRequested === true || saved.fulfillment?.internal && saved.fulfillment.internal.status !== "accepted") ? { internal: internalLookBookMessage(saved, origin) } : {}),
    }, sendLookBookMessage);
    for (const reason of delivery.reasons) safeLog("lookbook_delivery_unconfirmed", requestId, reason);
    return jsonResponse({
      accepted: true, saved: true, configurationId: saved.id,
      leadState: saved.leadState, followUpRequested: saved.followUpRequested,
      followUpNotified: delivery.internalNotified || saved.fulfillment?.internal?.status === "accepted",
      deliveryRetryAvailable: delivery.retryAvailable,
      ...(payload.intent === "email" ? { emailSent: delivery.emailSent } : {}),
    }, payload.intent === "email" && !delivery.emailSent ? 202 : 200);
  } catch (error) {
    if (savedForRecovery) {
      safeLog("lookbook_delivery_persistence_unconfirmed", requestId, error instanceof Error ? error.name : "unknown_error");
      return jsonResponse({ accepted: true, saved: true, configurationId: savedForRecovery.id, leadState: savedForRecovery.leadState, followUpRequested: savedForRecovery.followUpRequested, followUpNotified: false, deliveryRetryAvailable: true, ...(payload.intent === "email" ? { emailSent: false } : {}) }, 202);
    }
    if (error instanceof LookBookConflictError) return jsonResponse({ error: "Your Look Book is being updated. Please retry shortly; your selections are still here." }, 409);
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
