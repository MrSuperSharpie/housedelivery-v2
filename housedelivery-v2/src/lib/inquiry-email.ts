// Shared transport for the existing project-review forms and campaign inquiries.
// Provider acceptance is checked by each caller before reporting success.
export function sendInquiryEmail({
  apiKey,
  idempotencyKey,
  message,
}: {
  apiKey: string;
  idempotencyKey: string;
  message: Record<string, unknown>;
}) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(10_000),
  });
}
