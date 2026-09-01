import "server-only";

import {
  LookBookStorageUnavailableError,
} from "@/lib/lookbook/repository";
import type { PlannerHandoffPackage } from "@/lib/planner-handoff";
import type { PlannerState } from "@/lib/project-planner";

export type StoredPlannerProject = {
  id: string;
  submissionId: string;
  opportunityReportReference: string;
  community: string;
  lifecycleStatus: PlannerState["lifecycleStatus"];
  projectState: PlannerState;
  designPackages: readonly Pick<
    PlannerHandoffPackage,
    | "variationId"
    | "lineId"
    | "configurationId"
    | "homeSlug"
    | "homeName"
    | "designGroupName"
    | "assignedQuantity"
    | "deliveryGroup"
    | "exteriorExpression"
    | "lookBookReference"
    | "revision"
    | "designNotes"
    | "selections"
    | "lookBookUrl"
    | "pdfUrl"
    | "floorPlanUrl"
  >[];
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
};

type PlannerProjectRow = {
  id: string;
  submission_id: string;
  opportunity_report_reference: string;
  community: string;
  lifecycle_status: StoredPlannerProject["lifecycleStatus"];
  project_state: PlannerState;
  design_packages: StoredPlannerProject["designPackages"];
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
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    submitted_at: project.submittedAt,
  };
}

export async function savePlannerProject(project: StoredPlannerProject) {
  const baseUrl = process.env.LOOKBOOK_SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.LOOKBOOK_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceRoleKey) {
    throw new LookBookStorageUnavailableError(
      "Planner project storage is not configured.",
    );
  }

  const url = new URL("/rest/v1/planner_project_submissions", baseUrl);
  url.searchParams.set("on_conflict", "id");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
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
  return rows[0];
}
