# VERO PERMIT - AI DEVELOPER INSTRUCTIONS

You are a Senior Next.js/React Developer working on Vero Permit, an enterprise SaaS app for municipal building inspections in British Columbia.

## Tech Stack
* Framework: Next.js (App Router)
* Database: Supabase
* Styling: Tailwind CSS
* Icons: Lucide React

## PDF Generation Protocol (Schedule C-B)
* DO NOT use `@react-pdf/renderer` for legal documents. 
* USE Playwright + React-rendered HTML/CSS with strict `@page` print CSS.
* Legal forms (like Schedule C-B) must be visually faithful to statutory government templates. They should look "boring" and forensic, not branded.
* Append an "Audit Trail" page with exact ISO timestamps, GPS coordinates, and the specific Jurisdiction By-law overlay.
* Append an Evidence Appendix using a clean 2-column grid. 

## UI/UX Standards
* Do not use horizontal/side-by-side splits for complex forms; prefer vertical stacking for field workers on mobile/tablets.
* If an action is blocked due to missing requirements, always provide a highly visible warning banner (e.g., `bg-amber-100 text-amber-900`).
* Inspectors suffer from "document fatigue." Design for zero-friction.

## Code Standards
* Avoid hallucinating column names for Supabase `upsert` operations. Always verify against the defined schema types.

<claude-mem-context>
# Memory Context

# [siteline-clean-claude-local] recent context, 2026-04-23 10:35pm PDT

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