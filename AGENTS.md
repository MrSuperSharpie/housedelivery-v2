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

# [siteline-clean-claude-local] recent context, 2026-04-27 1:12pm PDT

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 40 obs (16,812t read) | 864,232t work | 98% savings

### Apr 22, 2026
24 1:03p 🔴 Next.js Signup Redirect Fixed: /inspector → /inspector/onboarding
25 " 🔵 Inspector Signup Routing — Code Archaeology Complete
26 1:04p 🔴 Fixed post-signup redirect to send new users to onboarding instead of Live Job Board
27 " 🔵 Inspector signup routing architecture — redirect candidates traced
28 1:05p 🔴 Post-Signup Redirect Fixed: /inspector → /inspector/onboarding
29 " 🔴 Next.js Signup Redirect Fixed: /inspector → /inspector/onboarding
### Apr 23, 2026
30 9:17p 🔵 Vero Construction Inspection Platform — Supabase Schema Constraints for Middleware
31 9:23p 🔵 Vero Construction Inspection Platform — Project Context and Schema Constraints
32 " 🔵 Middleware Location is Root-Level, Not src/ — and Contains No Onboarding Gate
33 " 🔵 Profiles Table Schema — Confirmed Columns and Onboarding Status Source of Truth
34 " 🔵 Auth Flow — onboarding_status Read Path and Sign-In Routing Logic
35 " 🔵 Dual Onboarding Status Storage — inspector_onboarding_status Table + profiles Sync Pattern
36 9:24p 🟣 Middleware Upgraded to Enforce Inspector Onboarding-Status Routing at Edge
37 " 🔵 Tech Stack Snapshot — Next.js 16, React 19, Supabase SSR, Resend, pdf-lib
38 9:28p 🟣 Transactional Email — Application Status Notifications Wired to Admin Approval Flow
39 " 🟣 Email DNS Verification Utility Added to Health Endpoint
40 " 🔵 Pre-Deployment Lint and TypeCheck Audit — 10 Errors, 40 Warnings Found
41 " 🔴 Lint Errors Fixed — Date.now Impurity and setState-in-Effect in Inspector Pages
42 9:41p 🔵 Vero Construction Inspection Platform — Project Context and Schema Constraints
43 9:42p 🔵 veropermit.com Email DNS Records — Partial Configuration Found
44 " 🔴 DKIM Detection Logic Fixed in src/lib/mail.ts
45 9:43p 🔴 middleware.ts Routing Rewrite — Profiles-First Onboarding Gate
46 " 🔴 Inspector Signup Page — Race Condition Fix and Credential-Specific Document Collection
47 " 🔴 auth.tsx and sign-in/page.tsx — Profiles Table Is Now Source of Truth for Identity and Status
48 " 🟣 Admin Inspectors Page — Status Sync, Email Triggers, Admin Override, Digital Seal Viewer, and Service Regions
49 " ✅ Inspector Onboarding UX — Copy Updated to "Waiting for Approval" Framing
50 " 🟣 New Files — Mail API Routes, Mail Utility, Admin Health Route, and Supabase Migrations
51 9:45p 🔴 Builder Page TypeScript Build Error — listJobsByBuilder Undefined Argument Fixed
52 9:46p 🔵 Second TypeScript Build Error — InspectorCompletionWorkspace onCapture Return Type Mismatch
53 9:51p 🔵 Third TypeScript Build Error — store.tsx Assignment Reconstruction Weak Typing
54 9:53p 🔴 store.tsx — builderApprovalStatus Cast to InspectorOnboardingStatus Type
55 9:54p 🔵 Fourth TypeScript Build Error — store.tsx addProject builderId Optional vs Required
58 9:55p 🔵 Fifth TypeScript Build Error — Duplicate InspectorDiscipline Types Out of Sync Between types.ts and governance/index.ts
59 9:56p 🔴 store.tsx — objectionReason Cast to ObjectionReason Type in objectAssignment
62 10:01p 🔴 authorityAccess.ts — Missing exportedAt Field Added to recordPackageExport Call
63 " 🔴 Production Build Passed Clean — All 19 Static Routes Generated Successfully
64 " 🔵 Seventh TypeScript Error — jobs.ts builderStatus Assigned 'draft' String Fallback Against InspectorOnboardingStatus Union
67 10:02p 🔴 jobs.ts and projects.ts — GovernanceOnboardingStatus Cast and GovernanceIssue Missing Fields Fixed
68 10:04p 🔴 projects.ts — ruleSnapshot Fixed to Empty Object and /inspector/onboarding Wrapped in Suspense
69 " 🔴 Full Production Build Passed — All 38 Routes Generated (Exit Code 0)

Access 864k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>