import "server-only";

import { LookBookStorageUnavailableError } from "@/lib/lookbook/repository";
import type { StoredPlannerProject } from "@/lib/planner-project-record";

type PlannerProjectRow = {
  id: string;
  submission_id: string;
  opportunity_report_reference: string;
  community: string;
  lifecycle_status: StoredPlannerProject["lifecycleStatus"];
  project_state: StoredPlannerProject["projectState"];
  design_packages: StoredPlannerProject["designPackages"];
  review_token_hash: string | null;
  internal_review_status: StoredPlannerProject["internalReviewStatus"];
  review_notes: StoredPlannerProject["reviewNotes"];
  lou_drafts: StoredPlannerProject["louDrafts"];
  internal_review_updated_at: string | null;
  handoff_email_version: number;
  handoff_email_sent_at: string | null;
  handoff_email_provider_id: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string;
};

function toRow(project: StoredPlannerProject): PlannerProjectRow {
  return {
    id: project.id,
    submission_id: project.submissionId,
    opportunity_report_reference: project.opportunityReportReference,
    community: project.community,
    lifecycle_status: project.lifecycleStatus,
    project_state: project.projectState,
    design_packages: project.designPackages,
    review_token_hash: project.reviewTokenHash || null,
    internal_review_status: project.internalReviewStatus,
    review_notes: project.reviewNotes,
    lou_drafts: project.louDrafts,
    internal_review_updated_at: project.internalReviewUpdatedAt ?? null,
    handoff_email_version: project.handoffEmailVersion,
    handoff_email_sent_at: project.handoffEmailSentAt ?? null,
    handoff_email_provider_id: project.handoffEmailProviderId ?? null,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    submitted_at: project.submittedAt,
  };
}

function fromRow(row: PlannerProjectRow): StoredPlannerProject {
  return {
    id: row.id,
    submissionId: row.submission_id,
    opportunityReportReference: row.opportunity_report_reference,
    community: row.community,
    lifecycleStatus: row.lifecycle_status,
    projectState: row.project_state,
    designPackages: row.design_packages,
    reviewTokenHash: row.review_token_hash ?? "",
    internalReviewStatus: row.internal_review_status ?? "pending",
    reviewNotes: Array.isArray(row.review_notes) ? row.review_notes : [],
    louDrafts: Array.isArray(row.lou_drafts) ? row.lou_drafts : [],
    ...(row.internal_review_updated_at
      ? { internalReviewUpdatedAt: row.internal_review_updated_at }
      : {}),
    handoffEmailVersion: row.handoff_email_version ?? 0,
    ...(row.handoff_email_sent_at
      ? { handoffEmailSentAt: row.handoff_email_sent_at }
      : {}),
    ...(row.handoff_email_provider_id
      ? { handoffEmailProviderId: row.handoff_email_provider_id }
      : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at,
  };
}

function storageConfiguration() {
  const baseUrl = process.env.LOOKBOOK_SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.LOOKBOOK_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceRoleKey) {
    throw new LookBookStorageUnavailableError(
      "Planner project storage is not configured.",
    );
  }
  return { baseUrl, serviceRoleKey };
}

function storageHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function readOne(url: URL, serviceRoleKey: string) {
  url.searchParams.set("select", "*");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, {
    headers: storageHeaders(serviceRoleKey),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`Planner project storage read failed (${response.status}).`);
  }
  const rows = (await response.json()) as PlannerProjectRow[];
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function findPlannerProjectById(id: string) {
  const { baseUrl, serviceRoleKey } = storageConfiguration();
  const url = new URL("/rest/v1/planner_project_submissions", baseUrl);
  url.searchParams.set("id", `eq.${id}`);
  return readOne(url, serviceRoleKey);
}

export async function findPlannerProjectByReviewTokenHash(tokenHash: string) {
  const { baseUrl, serviceRoleKey } = storageConfiguration();
  const url = new URL("/rest/v1/planner_project_submissions", baseUrl);
  url.searchParams.set("review_token_hash", `eq.${tokenHash}`);
  return readOne(url, serviceRoleKey);
}

export async function createPlannerProject(project: StoredPlannerProject) {
  const { baseUrl, serviceRoleKey } = storageConfiguration();
  const url = new URL("/rest/v1/planner_project_submissions", baseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...storageHeaders(serviceRoleKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify(toRow(project)),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Planner project storage write failed (${response.status}).`);
  }
  const rows = (await response.json()) as PlannerProjectRow[];
  if (!rows[0]) {
    throw new Error("Planner project storage returned no saved record.");
  }
  return fromRow(rows[0]);
}

export async function updatePlannerProject(
  project: StoredPlannerProject,
) {
  const { baseUrl, serviceRoleKey } = storageConfiguration();
  const url = new URL("/rest/v1/planner_project_submissions", baseUrl);
  url.searchParams.set("id", `eq.${project.id}`);
  url.searchParams.set("submission_id", `eq.${project.submissionId}`);
  const row = toRow(project);
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      ...storageHeaders(serviceRoleKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      lifecycle_status: row.lifecycle_status,
      project_state: row.project_state,
      review_token_hash: row.review_token_hash,
      internal_review_status: row.internal_review_status,
      review_notes: row.review_notes,
      lou_drafts: row.lou_drafts,
      internal_review_updated_at: row.internal_review_updated_at,
      handoff_email_version: row.handoff_email_version,
      handoff_email_sent_at: row.handoff_email_sent_at,
      handoff_email_provider_id: row.handoff_email_provider_id,
      updated_at: row.updated_at,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Planner project storage update failed (${response.status}).`);
  }
  const rows = (await response.json()) as PlannerProjectRow[];
  if (!rows[0]) {
    throw new Error("Planner project storage returned no updated record.");
  }
  return fromRow(rows[0]);
}
