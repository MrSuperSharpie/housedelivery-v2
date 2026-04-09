-- Inspector Completion workspace
-- Supports the nested 15-stage BC compliance checklist with AHJ-aware overlays.

CREATE TABLE IF NOT EXISTS inspector_completion_reports (
  id text PRIMARY KEY,
  assignment_id text NOT NULL UNIQUE,
  job_id text NOT NULL,
  inspector_id text NOT NULL,
  project_id text,
  project_name text NOT NULL,
  address text NOT NULL,
  city text,
  region text,
  project_type text,
  current_stage smallint NOT NULL DEFAULT 1,
  stage_count smallint NOT NULL DEFAULT 15,
  jurisdiction_name text,
  ahj_overlay_type text NOT NULL CHECK (ahj_overlay_type IN ('province_base', 'municipal', 'vancouver', 'first_nation')),
  ahj_overlay_label text NOT NULL,
  overlay_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  checklist_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sealed', 'submitted')),
  seal_applied boolean NOT NULL DEFAULT false,
  seal_reference text,
  seal_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_saved_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspector_completion_stage_items (
  id text PRIMARY KEY,
  report_id text NOT NULL REFERENCES inspector_completion_reports(id) ON DELETE CASCADE,
  assignment_id text NOT NULL,
  stage_number smallint NOT NULL,
  stage_name text NOT NULL,
  item_code text NOT NULL,
  item_label text NOT NULL,
  sort_order smallint NOT NULL,
  is_required jsonb NOT NULL DEFAULT 'true'::jsonb,
  permit_type text NOT NULL,
  responsible_party text NOT NULL CHECK (responsible_party IN ('Builder', 'Inspector', 'Auditor', 'AHJ')),
  document_upload_required boolean NOT NULL DEFAULT false,
  inspection_status text NOT NULL DEFAULT 'Pending' CHECK (inspection_status IN ('Pending', 'Passed', 'Failed', 'N/A')),
  ahj_notes text,
  dependencies text[] NOT NULL DEFAULT '{}',
  response_note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_id, item_code)
);

CREATE TABLE IF NOT EXISTS inspector_completion_documents (
  id text PRIMARY KEY,
  report_id text NOT NULL REFERENCES inspector_completion_reports(id) ON DELETE CASCADE,
  assignment_id text NOT NULL,
  item_code text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size bigint,
  uploaded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspector_completion_reports_assignment_id
  ON inspector_completion_reports (assignment_id);

CREATE INDEX IF NOT EXISTS idx_inspector_completion_stage_items_report_stage
  ON inspector_completion_stage_items (report_id, stage_number, sort_order);

CREATE INDEX IF NOT EXISTS idx_inspector_completion_documents_report_item
  ON inspector_completion_documents (report_id, item_code);
