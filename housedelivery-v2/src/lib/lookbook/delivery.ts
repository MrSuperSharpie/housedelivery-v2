import { createHash } from "node:crypto";
import type { LookBookRepository } from "./repository";
import type { StoredLookBook, LookBookDeliveryAttempt } from "./types";
import type { LookBookMessage, DeliveryResult } from "./email";

const replayWindowMs = 23 * 60 * 60 * 1000; // Stay inside Resend's 24h retention.
export const nextLookBookTimestamp = (previous: string, now = Date.now()) => new Date(Math.max(now, Date.parse(previous) + 1)).toISOString();
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);
export function internalDeliveryKey(record: StoredLookBook) {
  const property = record.propertyFeasibility ? { ...record.propertyFeasibility, submittedAt: undefined } : null;
  return `lookbook-internal-${record.id}-${hash({ requestedAt: record.followUpRequestedAt, source: record.followUpSource, property, contact: record.contact, selections: record.selections })}`;
}
export async function deliverLookBook(
  initial: StoredLookBook,
  repository: LookBookRepository,
  messages: { customer?: LookBookMessage; internal?: LookBookMessage },
  send: (message: LookBookMessage, key: string) => Promise<DeliveryResult>,
  now = Date.now(),
) {
  let record = initial;
  const result = { emailSent: false, internalNotified: false, retryAvailable: true, reasons: [] as string[] };
  for (const slot of ["customer", "internal"] as const) {
    const message = messages[slot];
    if (!message) continue;
    const key = slot === "customer" ? `lookbook-customer-v2-${record.id}` : internalDeliveryKey(record);
    const previous = record.fulfillment?.[slot];
    const payloadHash = hash(message);
    let accepted = previous?.key === key && previous.status === "accepted";
    if (!accepted) {
      let reason: string | undefined;
      if (previous?.key === key && previous.payloadHash !== payloadHash) reason = "delivery_content_changed";
      else if (previous?.key === key && now - Date.parse(previous.firstAttemptAt) > replayWindowMs) reason = "delivery_confirmation_required";
      else if (previous?.key === key && previous.status === "pending" && now - Date.parse(previous.attemptedAt) < 20_000) reason = "delivery_in_progress";
      if (reason) {
        result.reasons.push(reason);
        if (reason !== "delivery_in_progress") result.retryAvailable = false;
      } else {
        const attempt: LookBookDeliveryAttempt = { key, payloadHash, firstAttemptAt: previous?.key === key ? previous.firstAttemptAt : new Date(now).toISOString(), attemptedAt: new Date(now).toISOString(), status: "pending" };
        const persist = async (value: LookBookDeliveryAttempt) => {
          record = await repository.save({ ...record, updatedAt: nextLookBookTimestamp(record.updatedAt, now), fulfillment: { ...record.fulfillment, version: 1, [slot]: value } }, record.updatedAt);
        };
        // Persist before sending: a lost response can be retried with the same
        // payload/key. Durable acceptance prevents duplicates after 24 hours.
        await persist(attempt);
        const delivery = await send(message, key);
        accepted = delivery.sent;
        await persist(delivery.sent ? { ...attempt, status: "accepted", acceptedAt: new Date(now).toISOString(), providerId: delivery.providerId } : { ...attempt, status: "failed", reason: delivery.reason });
        if (!delivery.sent) result.reasons.push(delivery.reason);
      }
    }
    if (slot === "customer") result.emailSent = accepted;
    else result.internalNotified = accepted;
  }
  return { ...result, record };
}
