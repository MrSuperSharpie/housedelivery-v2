# VERO PERMIT - AI DEVELOPER INSTRUCTIONS

You are a Senior Next.js/React developer working on Vero Permit, an enterprise SaaS app for municipal building inspections and authority-ready compliance records in British Columbia.

## Product Positioning

Vero Permit is not a commodity gig marketplace. It is a governed compliance and risk-mitigation platform for builders, inspectors, certified professionals, admins, and authority reviewers.

The platform sells two outcomes: risk mitigation and velocity.

All implementation decisions must support:

- Governed dispatch
- Credentialed eligibility
- Escrow-backed execution
- Inspection-grade evidence capture
- Reliable inspector attendance
- Defensible professional records
- Controlled authority access
- Admin oversight of disputes, payouts, and exceptions

## Naming

- Use "Vero Permit" for user-facing copy.
- If existing code still uses "SiteLine," do not blindly rename database tables, storage paths, migrations, APIs, or compatibility code unless it is clearly safe.
- Prefer compatibility aliases and incremental migration where legacy naming still exists.
- Do not introduce both names in the same UI unless required for legacy reasons.

## Detected Stack

- Package manager: npm (`package-lock.json` is present).
- Framework: Next.js App Router, React 19, TypeScript.
- Styling: Tailwind CSS with shared UI components under `src/components`.
- Icons: Lucide React.
- Database/auth/storage: Supabase via `@supabase/supabase-js` and `@supabase/ssr`.
- Auth entry points: root `middleware.ts`, `src/lib/supabase/middleware.ts`, `src/lib/auth.tsx`, `src/app/sign-in/page.tsx`, role layouts, and onboarding pages.
- Database layer: `src/lib/supabase/*`, `src/lib/persistence/*`, and SQL migrations under `supabase/migrations`.
- Governance/business rules: `src/lib/governance/*`, `src/lib/holds/*`, `src/lib/eligibility.ts`, `src/lib/rules/*`.
- PDF/legal record generation: `src/lib/pdf/*`, Playwright-rendered HTML/CSS, and `public/templates/Schedule_C-B.pdf`.
- Email: Resend via `src/lib/mail.ts` and API routes under `src/app/api/mail`.

## Engineering Rules

Before modifying files:

- Inspect the existing architecture, route boundaries, data models, and helper APIs related to the request.
- Identify relevant models, routes, components, services, migrations, and tests before editing.
- Follow existing code style and naming conventions.
- Avoid duplicate business logic; prefer shared domain, governance, persistence, or Supabase helper modules.
- Avoid hardcoded policy values where configuration is better.
- Add tests for business-critical logic, especially governance, eligibility, dispatch, payout, evidence, and authority-access behavior.
- Run lint, typecheck, relevant tests, and build before the final response when feasible.
- If any verification command cannot run or fails due to pre-existing issues, report that clearly.

## Supabase / Schema Rules

- Avoid hallucinating column names for Supabase `insert`, `update`, or `upsert` operations. Verify against migrations, existing helper functions, or generated schema types before writing.
- The `profiles` table uses `onboarding_status` and `verified`; do not introduce `onboarding_completed`.
- Be careful with legacy dual-write paths. Inspector onboarding may involve both `profiles` and `inspector_onboarding_status`; builder onboarding may involve both `profiles` and `builder_onboarding_status`.
- Prefer existing helpers in `src/lib/supabase/*` and `src/lib/persistence/*` over inline table access unless the local pattern already does so.

## Inspector Accountability Principles

Implement inspector reliability as an earning and trust system, not merely a punishment system.

Reliable inspectors should receive:

- More opportunity
- Better job access
- Faster payout
- Lower reserve requirements
- Stronger professional standing

Invalid cancellations and no-shows should trigger clear, auditable, configurable consequences.

## Compliance Boundaries

- Do not design Vero Permit so inspectors are rewarded for issuing "Pass" results.
- Inspectors are paid for properly performing and documenting the inspection, whether the result is Pass, Fail, Hold, or Modification Required.
- Never create incentives that weaken inspection independence.

## Financial / Legal Guardrails

- Any reserve, penalty, payout holdback, or account restriction must be implemented as configurable policy logic, not hardcoded.
- Add comments where legal review is required before enforcement.
- Default enforcement mode should support:
  - `observe_only`
  - `soft_enforcement`
  - `full_enforcement`

## PDF Generation Protocol (Schedule C-B)

- Do not use `@react-pdf/renderer` for legal documents.
- Use Playwright plus React-rendered HTML/CSS with strict `@page` print CSS.
- Legal forms such as Schedule C-B must be visually faithful to statutory government templates. They should look boring and forensic, not branded.
- Append an Audit Trail page with exact ISO timestamps, GPS coordinates, and the specific jurisdiction by-law overlay.
- Append an Evidence Appendix using a clean 2-column grid.

## UI/UX Standards

- Do not use horizontal side-by-side splits for complex forms; prefer vertical stacking for field workers on mobile/tablets.
- If an action is blocked due to missing requirements, provide a highly visible warning banner, for example `bg-amber-100 text-amber-900`.
- Inspectors suffer from document fatigue. Design for zero friction.
- Admin interfaces should make review state, missing requirements, overrides, and audit impact obvious.

## Required Commands

- Install: `npm install`
- Lint: `npm run lint`
- Typecheck: `npx tsc --noEmit`
- Unit tests: `npm test`
- Integration tests: no dedicated integration-test script is currently defined. If integration specs are added, prefer Playwright and document/run the resulting command, commonly `npx playwright test`.
- Build: `npm run build`
- PDF browser install, when needed: `npm run pdf:install-browser`

## Verification Notes

- `npm run build` may need network access because Next font optimization fetches Google Fonts.
- `npm test` uses `tsx --test src/lib/governance/*.test.ts src/lib/holds/*.test.ts src/lib/pdf/tests/*.test.ts`.
- Do not claim tests passed unless the command was actually run and exited successfully.


<claude-mem-context>
# Memory Context

# [siteline-clean-claude-local] recent context, 2026-07-20 7:07pm PDT

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (26,323t read) | 877,516t work | 97% savings

### Jun 7, 2026
394 8:43p 🔵 S13 and S14 Checklist Definitions Read — Confirmed Zero Inline Evidence Tags Across All 10 Items
### Jun 23, 2026
417 10:21a 🔵 Vero Permit — Checklist Template System Architecture Audit (Read-Only)
418 10:22a 🔵 Vero Permit — Checklist Template System Architecture Audit (Read-Only)
### Jul 6, 2026
419 12:35p 🔵 Vero Permit — Pro Audit Remediation Sprint 01 Kickoff Context
420 " 🔵 Vero Permit — Three Inspection Systems Identified: A (Dead), B (DB Preview), C (Runtime)
421 " 🔵 Vero Permit — Hosted Migration Ledger Drift: 10 Unledgered Migrations, 1 Seal-Latch Effect Missing
422 12:38p 🟣 New Remediation Branch — fix/pro-audit-remediation-sprint-01
423 " ⚖️ Option A — Permit-Centric System C Canonical; Regenerate System B from It
424 " 🔵 S10–S13 Human Review Packet — Product Acceptance Recorded 2026-07-05
425 " 🔴 Preview UI QA — S10–S13 Template Content Mismatch Root-Caused and Resolved
426 " 🔵 Seal-Latch Security Gap — Migration 20260611000000 Absent on Hosted Supabase
427 12:39p ✅ InspectorCompletionWorkspace — Terminology Overhaul: Remove "Certification/Issuing" Language, Add N/A Scope Guidance
428 12:40p ✅ Vault Page — getResultLabel Returns "Corrections Required" Instead of "Fail"
429 12:41p 🟣 Pro Audit Remediation Copy Test Suite Added
430 " ✅ Vero Permit — Pro Audit Remediation Sprint 01 Documentation Created
431 12:42p 🔵 Supabase Hold Payment Gate Migration — Code Review Requested
432 12:43p 🔵 Test Suite — 3 Failures in 1004 Tests After Latest Pass
433 " ✅ inspectorStagePreview.test.ts — Evidence Lock Message and AHJ Occupancy Copy Corrections
434 12:45p ✅ Vero Inspector UI — Pro Audit Copy Remediation Sprint 01
435 12:46p 🟣 Pro-Audit Remediation Sprint 01 — Staged for Commit in siteline-clean
436 12:48p 🟣 Pro Audit Remediation Sprint 01 — Inspection Outcome Copy Clarified
437 12:52p 🔵 Pro Audit Remediation Sprint-01 — Branch Review Initiated
438 1:00p 🔵 fix/pro-audit-remediation-sprint-01 Branch State — AGENTS.md Unstaged Local Change
439 " 🔵 Holds Reporting Test Fixture — evidenceType 'note' Mapped to kind 'voice_note'
440 1:01p 🔵 fix/pro-audit-remediation-sprint-01 — Full Test Suite Passes: 1004/1004, TypeScript Clean
441 1:02p 🔵 HoldDetail Type — holdPaymentStatus Field Added by Hold Payment Gate Migration
442 " 🔵 siteline-pro Production Build — Next.js 16.1.6 Turbopack, 90 Routes, Zero Errors
443 3:28p 🔴 Launch QA Sprint 01 — Four UI Bugs Fixed in siteline-pro
444 " ✅ PR #3 Opened — Launch QA Sprint 01 Branch Pushed and Vercel Preview Succeeded
445 " 🔵 AGENTS.md Drift Is a Persistent Recurring Gotcha After Every Git Operation
446 3:29p ✅ PR #3 Merged — Launch QA Sprint 01 Landed into stripe-connect-sandbox-setup
447 4:24p 🟣 Pro Audit Sprint 02A — Evidence Matrix Reconciliation Sprint Initiated
448 " 🔵 Vero Permit Evidence Matrix Source — Full S01–S15 Policy Confirmed
449 4:25p 🔵 Current Active buildCompletionChecklist Rows Inventoried — S01–S15 Stage Names Differ from Pro Matrix
450 4:30p 🟣 src/lib/inspectionEvidencePolicy.ts — Typed Local Evidence Policy File Created
451 4:32p 🔵 inspectorCompletion.ts System C Schema Confirmed — Already Has Rich Evidence Semantics
452 4:33p 🟣 inspectionEvidencePolicy.test.ts — Policy Validation Test Suite Created
453 4:34p ✅ docs/audit/evidence-matrix-reconciliation.md — Full Sprint 02A Reconciliation Document Created
### Jul 12, 2026
476 7:39p ⚖️ Tablet Inspection Guide Split-Panel Architecture — Approach Defined
477 7:40p 🟣 Tablet Inspection Guide Split-Panel Layout — Autonomous Completion Task
478 " 🟣 Tablet Inspection Guide Split-Panel — Autonomous Resume on fix/tablet-inspection-guide-split-panel
479 7:42p 🔵 Tablet Inspection Guide Split-Panel — Task Scope and Constraints Defined
480 " 🟣 Tablet Inspection Guide Split Panel — Autonomous Branch Continuation Initiated
481 7:43p ⚖️ Tablet Inspection Guide — Split-Panel Layout Approach Defined
482 " 🟣 Tablet Inspection Guide — Split Panel Replaces Modal Drawer
483 7:44p 🟣 Tablet Split-Panel — Commit ae47cca Created and Pushed to GitHub
484 " 🔵 Vercel Preview Deployment Triggered — Status Pending at Specific URL
485 7:45p 🟣 Tablet Inspection Guide Split-Panel — Autonomous Loop Resumed
486 7:46p 🟣 Tablet Inspection Guide Split-Panel — Committed and Pushed
487 9:07p 🟣 Vero Favicon and App Icons — Replacement Task Initiated

Access 878k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>