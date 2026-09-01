import { createHash, randomUUID } from "node:crypto";

import { models } from "@/data/models";
import { getLookBookPublicOrigin } from "@/lib/lookbook/email";
import {
  getLookBookRepository,
  LookBookStorageUnavailableError,
} from "@/lib/lookbook/repository";
import {
  formatPlannerHandoffEmail,
  parsePlannerProjectHandoff,
  PlannerHandoffValidationError,
  type PlannerProjectHandoff,
} from "@/lib/planner-handoff";
import type { StoredPlannerProject } from "@/lib/planner-project-record";
import {
  createPlannerProject,
  findPlannerProjectById,
  updatePlannerProject,
} from "@/lib/planner-project-repository";
import {
  derivePlannerReviewToken,
  hashPlannerReviewToken,
  PlannerReviewAccessConfigurationError,
} from "@/lib/planner-review-access";

const inquiryRecipient = "hello@housedelivery.ca";
const inquiryRoute = "/api/inquiries";
const maximumRequestBytes = 200_000;
const plannerHandoffEmailVersion = 2;

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
  plannerRecord?: unknown;
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

  let plannerHandoff: PlannerProjectHandoff | undefined;
  let storedPlannerProject: StoredPlannerProject | undefined;
  let plannerReviewToken = "";
  let plannerReviewLinks:
    | {
        projectReviewUrl: string;
        opportunityReportUrl: string;
        opportunityReportPdfUrl: string;
      }
    | undefined;
  if (payload.plannerRecord !== undefined) {
    try {
      const publicOrigin = getLookBookPublicOrigin(request.url);
      plannerHandoff = parsePlannerProjectHandoff({
        plannerRecord: payload.plannerRecord,
        contact: {
          firstName,
          email,
          ...(phone ? { phone } : {}),
        },
        origin: publicOrigin,
      });
      const submittedAt =
        plannerHandoff.state.submittedAt ?? new Date().toISOString();
      plannerHandoff = {
        ...plannerHandoff,
        state: {
          ...plannerHandoff.state,
          reviewStatus: "submitted",
          lifecycleStatus: "submitted-for-review",
          louStatus: "project-review-requested",
          submissionId: plannerHandoff.submissionId,
          submittedAt,
        },
      };
      const reviewSecret =
        process.env.PLANNER_REVIEW_TOKEN_SECRET?.trim() ?? "";
      plannerReviewToken = derivePlannerReviewToken(
        plannerHandoff.submissionId,
        reviewSecret,
      );
      const reviewTokenHash = hashPlannerReviewToken(plannerReviewToken);
      const reviewBaseUrl = `${publicOrigin}/internal/project-review/${plannerReviewToken}`;
      plannerReviewLinks = {
        projectReviewUrl: reviewBaseUrl,
        opportunityReportUrl: `${reviewBaseUrl}/opportunity-report`,
        opportunityReportPdfUrl: `${reviewBaseUrl}/opportunity-report/pdf?disposition=attachment`,
      };

      const existingProject = await findPlannerProjectById(
        plannerHandoff.state.projectId,
      );
      if (existingProject) {
        if (existingProject.submissionId !== plannerHandoff.submissionId) {
          throw new PlannerHandoffValidationError(
            "This Project ID already has a submitted Opportunity Report. Start a new project record for a materially revised submission.",
          );
        }
        if (
          existingProject.reviewTokenHash &&
          existingProject.reviewTokenHash !== reviewTokenHash
        ) {
          throw new PlannerReviewAccessConfigurationError(
            "Planner review access configuration has changed.",
          );
        }
        storedPlannerProject = existingProject.reviewTokenHash
          ? existingProject
          : await updatePlannerProject({
              ...existingProject,
              reviewTokenHash,
              updatedAt: new Date().toISOString(),
            });
      } else {
        const repository = getLookBookRepository();
        for (const designPackage of plannerHandoff.packages) {
          const existingLookBook = await repository.findById(
            designPackage.configurationId,
          );
          if (
            existingLookBook &&
            existingLookBook.homeSlug !== designPackage.homeSlug
          ) {
            throw new PlannerHandoffValidationError(
              "A Design Group Look Book belongs to a different home.",
            );
          }
          await repository.save({
            ...designPackage.record,
            ...(existingLookBook?.propertyFeasibility
              ? { propertyFeasibility: existingLookBook.propertyFeasibility }
              : {}),
            createdAt:
              existingLookBook?.createdAt ?? designPackage.record.createdAt,
            completedAt:
              existingLookBook?.completedAt ?? designPackage.record.completedAt,
          });
        }
        storedPlannerProject = await createPlannerProject({
          id: plannerHandoff.state.projectId,
          submissionId: plannerHandoff.submissionId,
          opportunityReportReference:
            plannerHandoff.state.opportunityReportReference,
          community: plannerHandoff.state.community,
          lifecycleStatus: plannerHandoff.state.lifecycleStatus,
          projectState: plannerHandoff.state,
          designPackages: plannerHandoff.packages.map((item) => {
            const { record, ...designPackage } = item;
            void record;
            return designPackage;
          }),
          reviewTokenHash,
          internalReviewStatus: "pending",
          reviewNotes: [],
          louDrafts: [],
          handoffEmailVersion: 0,
          createdAt: submittedAt,
          updatedAt: submittedAt,
          submittedAt,
        });
      }
    } catch (error) {
      const isValidation = error instanceof PlannerHandoffValidationError;
      logInquiryFailure("planner_handoff_failed", {
        requestId,
        status: isValidation ? 400 : 503,
        durationMs: Date.now() - startedAt,
        reason: isValidation
          ? "invalid_planner_handoff"
          : error instanceof PlannerReviewAccessConfigurationError
            ? "planner_review_access_not_configured"
          : error instanceof LookBookStorageUnavailableError
            ? "lookbook_storage_not_configured"
            : "lookbook_storage_failed",
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return jsonResponse(
        {
          error: isValidation
            ? error.message
            : "Project design-package storage is temporarily unavailable.",
        },
        isValidation ? 400 : 503,
      );
    }
  }

  const shouldDeliverPlannerEmail =
    !storedPlannerProject ||
    storedPlannerProject.handoffEmailVersion < plannerHandoffEmailVersion;
  const shouldDeliverEmail = plannerHandoff
    ? shouldDeliverPlannerEmail
    : true;
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.INQUIRY_FROM_EMAIL?.trim() ||
    "House Delivery Website <inquiries@housedelivery.ca>";

  if (shouldDeliverEmail && !resendApiKey) {
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

  const isPlannerProjectReview = Boolean(plannerContext || plannerHandoff);
  const message = plannerHandoff && storedPlannerProject && plannerReviewLinks
    ? formatPlannerHandoffEmail({
        state: storedPlannerProject.projectState,
        submissionId: storedPlannerProject.submissionId,
        packages: storedPlannerProject.designPackages,
      }, {
        firstName,
        lastName,
        email,
        phone,
        notes,
        timeline,
      }, plannerReviewLinks)
    : isPlannerProjectReview
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

  const idempotencyKey = plannerHandoff
    ? `planner-handoff-v${plannerHandoffEmailVersion}-${plannerHandoff.submissionId}`
    : `project-inquiry-${createHash("sha256")
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

  if (!shouldDeliverEmail) {
    console.info(
      JSON.stringify({
        level: "info",
        event: "inquiry_delivery_deduplicated",
        route: inquiryRoute,
        requestId,
        status: 200,
        durationMs: Date.now() - startedAt,
      }),
    );
  } else {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey!}`,
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

      if (storedPlannerProject) {
        const deliveredAt = new Date().toISOString();
        storedPlannerProject = await updatePlannerProject({
          ...storedPlannerProject,
          handoffEmailVersion: plannerHandoffEmailVersion,
          handoffEmailSentAt: deliveredAt,
          handoffEmailProviderId: providerMessageId(providerResponse),
          updatedAt: deliveredAt,
        });
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
  }

  return jsonResponse({
    accepted: true,
    ...(storedPlannerProject
      ? {
          projectStatus: storedPlannerProject.lifecycleStatus,
          submissionId: storedPlannerProject.submissionId,
          designGroups: storedPlannerProject.designPackages.map((designPackage) => ({
            variationId: designPackage.variationId,
            configurationId: designPackage.configurationId,
            lookBookUrl: designPackage.lookBookUrl,
            pdfUrl: designPackage.pdfUrl,
          })),
        }
      : {}),
  });
}
