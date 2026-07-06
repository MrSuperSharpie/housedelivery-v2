# Vero Permit - Pro Audit Remediation Sprint 01

**Branch:** `fix/pro-audit-remediation-sprint-01`
**Date:** 2026-07-06
**Scope:** local app copy, local docs, source-level validation tests.
**Hard stops honored:** no hosted Supabase, no SQL, no `db push`, no migration repair, no deploy, no Vercel settings, no environment variables, no Stripe/payment logic, no auth/RLS/security policies, no seal-latch logic, no Vault/seal/completion security logic, no job claiming.

## What Changed Locally

- Inspector completion copy now separates:
  - **Corrections Required**: observed deficiency; inspection can still be submitted with evidence and deficiency notes.
  - **Hold**: same-day correction while the inspector remains on site.
  - **N/A**: only when the condition is outside project scope or not triggered by the permit path.
  - **Pending**: draft/default state.
- Evidence prompts now name expected evidence types: photos, short video, permit proof, inspection card/status, manufacturer documents, field notes, test results, deficiency photos, and correction evidence.
- Final occupancy UI copy now says Vero records AHJ occupancy evidence and does not issue occupancy, grant final approval, or replace the authority having jurisdiction.
- Builder-facing vault result copy now displays non-pass outcomes as **Corrections Required** instead of **Fail**.
- Source-level regression tests were added/updated so these copy boundaries do not drift silently.

## Source Of Truth Map

| System | Source | Live Consumers | Sprint Decision |
|---|---|---|---|
| Legacy/static phase model | `src/lib/inspectionTemplates.ts` | No known non-test live consumer found in prior source-of-truth audit. | Do not delete in this sprint; keep documented as legacy until canonical cleanup. |
| DB checklist templates | `stage_checklist_templates` / `stage_checklist_items`, seeded by `supabase/migrations/*`, resolved by `src/lib/inspections/resolveActiveTemplate.ts` | Admin checklist UI, `/inspector/stages`, claim/scope previews, resolve-template API, coverage/mapping audits. | Reference/preview source. S10-S13 already fixed; do not reopen. Needs canonical generator later. |
| Runtime completion model | `src/lib/inspectorCompletion.ts` | `InspectorCompletionWorkspace`, store, submissions, Schedule C-B packet path, inspector dev preview. | Operational source for completion workflow, evidence/status logic, and Schedule C-B packet inputs. Do not alter behavior in this sprint. |

Guardrails now in place:
- `src/lib/inspections/stageAlignment.test.ts` and `docs/audit/validate-stage-alignment.mjs` guard stage title/content drift.
- `src/lib/proAuditRemediationCopy.test.ts` guards status, evidence, N/A, AHJ authority, and builder-facing result copy.

## Remediation Matrix

| Item | Disposition |
|---|---|
| A. Single source of truth | Documented live consumers and source boundaries above. Existing S10-S13 alignment guard remains active. |
| B. Corrections Required vs Hold | Implemented copy-only runtime clarification. No payment/escrow/seal behavior changed. |
| C. N/A conditions | Implemented runtime N/A guidance with examples: fire suppression, gas appliances, deep foundations, site services, phased occupancy, occupancy permit not required, Vancouver-only requirements on BCBC projects. Structured per-item N/A rules remain backlog. |
| D. Evidence prompt clarity | Implemented copy-only evidence prompts for photos, permit proof, inspection card/status, manufacturer docs, field notes, test results, deficiency and correction evidence. |
| E. S01-S09 and S14-S15 wording | Existing runtime content already carries field-ready prompts and evidence guidance. This sprint improved UI guidance instead of re-authoring regulated checklist content without professional review. |
| F. Schedule B / Schedule C-B / professional responsibility | Implemented final-stage AHJ boundary copy. Admin checklist placeholders and legal/PDF generation remain documented risk areas; Schedule C-B logic untouched. |
| G. VBBL overlays | Documented backlog below. No DB write or template migration drafted. |
| H. Runtime/status model consistency | Implemented local copy consistency for Passed / Corrections Required / Hold / N/A / Pending / Save Draft. Status values remain unchanged. |
| I. Professional review packet | Included below. This is a review packet, not a signoff. |
| J. Seal-latch open item | Remains separate security/database track. Do not fix or ledger-repair in this sprint. |
| K. Migration ledger cleanup | Remains separate targeted ledger-repair track. Must exclude `20260611000000`; payment-adjacent migrations require payments-owner signoff. |
| L. Launch readiness | Matrix included below. |

## VBBL Backlog

These need professional/code-owner review before database or canonical-template work:

- Energy/GHG: confirm Vancouver-specific energy, emissions, commissioning, airtightness, and documentation expectations beyond the current S12 Step Code overlay.
- Existing buildings: identify alternate-path, alteration, change-of-use, and heritage/TI conditions.
- Occupancy/final stage: clarify Vancouver-specific final inspection, occupancy, phased occupancy, and acceptance evidence.
- Plumbing/non-potable water: determine where Vancouver plumbing, rainwater, greywater, non-potable, sewer/storm, and placard expectations need explicit items.
- Temporary uses: add applicability and evidence guidance only where permit scope triggers temporary use or temporary occupancy.
- Local documents: identify Vancouver-specific forms, inspection cards, permit statuses, trade confirmations, and AHJ acceptance artifacts that should be accepted evidence.

## Professional Inspector / Code Reviewer Packet

Purpose: validate whether the product copy and checklist guidance support defensible field records without implying Vero Permit replaces the AHJ, registered professionals, or statutory assurance documents.

Review questions:
- Are **Corrections Required** and **Hold** separated correctly for field use?
- Are the N/A examples appropriate, and which items should never be N/A without AHJ/professional confirmation?
- For S01-S09 and S14-S15, which prompts remain too broad, too discipline-summary oriented, or too close to Schedule B/Schedule C-B assurance language?
- Are evidence expectations specific enough by stage and item, especially for documents versus photos versus test results?
- Does final occupancy copy correctly state that Vero records AHJ evidence but does not issue occupancy or grant approval?
- Which VBBL overlays are required before paid Vancouver pilots?
- Which checklist items need exact clause references verified by a code professional before public launch?

Professional validation still needed:
- Field-ready wording for S01-S09 and S14-S15.
- Per-item N/A eligibility and required evidence type.
- Vancouver overlays beyond S12.
- Professional responsibility / Schedule B / Schedule C-B boundary wording.
- Final occupancy and authority-access package language.

## Launch Readiness Matrix

| Classification | Items |
|---|---|
| Blocks demo | None from this sprint, assuming demo data avoids unresolved seal-latch/security claims and uses the corrected S10-S13 preview DB. |
| Blocks paid founding customer onboarding | Seal-latch missing effect (`20260611000000`), migration ledger drift, professional/code review of checklist language, per-item N/A governance for common non-applicable scopes, and final occupancy authority wording review. |
| Blocks public self-serve launch | Canonical source-of-truth consolidation, typed evidence requirements, governed N/A rules, richer VBBL overlays, ledger reconciliation, security-reviewed seal-latch apply, admin/auth hardening already noted in existing tests, and a professional/code-official review cycle. |
| Can wait | Deleting legacy static templates, full canonical DB generator, advanced semantic evidence validation, broader VBBL specialty overlays not needed for first pilots, and polish to admin checklist editor placeholders. |

## Blocked / Out Of Scope

- `20260611000000_inspector_completion_rls_seal_latch` remains an effect-missing security/database item. It must follow `docs/audit/seal-latch-fix-apply-decision.md` and `docs/audit/seal-latch-staging-apply-runbook.md`.
- Migration ledger cleanup remains separate. Any targeted repair must exclude `20260611000000` and needs payments-owner signoff for payment-adjacent migrations.
- DB template/schema changes for typed evidence and governed N/A rules require a canonical-template migration plan and professional/code-owner approval.
