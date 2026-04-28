-- ─────────────────────────────────────────────────────────────────────────────
-- Checklist Editor Support
-- Migration: 20260427040000_checklist_editor_support.sql
--
-- Adds is_active soft-delete flag to stage_checklist_items so admins
-- can deactivate individual items without deleting historical responses.
-- Existing rows default to true (no data loss).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.stage_checklist_items
  add column if not exists is_active boolean not null default true;
