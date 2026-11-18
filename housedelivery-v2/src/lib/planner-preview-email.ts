import type { sendInquiryEmail } from "@/lib/inquiry-email";
import { PlannerReviewAccessConfigurationError } from "@/lib/planner-review-access";

export function getPlannerPreviewEmailCapture() {
  const isolatedOrigin = process.env.PLANNER_PREVIEW_STORAGE_ORIGIN?.trim();
  if (process.env.VERCEL_ENV !== "preview" || !isolatedOrigin) return undefined;

  const storageUrl = process.env.LOOKBOOK_SUPABASE_URL?.trim();
  const storageKey = process.env.LOOKBOOK_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (
    !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(isolatedOrigin) ||
    storageUrl?.replace(/\/$/, "") !== isolatedOrigin ||
    !storageKey
  ) {
    throw new PlannerReviewAccessConfigurationError(
      "The Planner test email capture requires the isolated Preview database.",
    );
  }

  return async ({
    idempotencyKey,
    message,
  }: Pick<Parameters<typeof sendInquiryEmail>[0], "idempotencyKey" | "message">) => {
    const id = `preview-${idempotencyKey}`;
    const capture = await fetch(
      `${isolatedOrigin}/rest/v1/planner_preview_email_receipts?on_conflict=id`,
      {
        method: "POST",
        headers: {
          apikey: storageKey,
          Authorization: `Bearer ${storageKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify({ id, message }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    return capture.ok ? Response.json({ id }) : capture;
  };
}
