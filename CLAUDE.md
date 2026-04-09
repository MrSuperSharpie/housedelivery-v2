# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev      # Start dev server (localhost:3001)
npm run build    # Production build
npm run lint     # ESLint (Next.js + TypeScript)
npm run start    # Serve production build
```

No test runner is configured. There is no `npm test` command.

---

## Stack

- **Next.js 16** (App Router, SSR) — TypeScript 5.9, React 19
- **Supabase** (Postgres + Realtime + Auth via `@supabase/ssr`)
- **Tailwind CSS 4** (PostCSS) with a custom Industrial Premium design system
- **Lucide React** (icons), **Recharts** (charts)
- **Stripe** (escrow/payouts — configured, not fully wired)
- **Mapbox** (token present, not yet active in UI)

Environment variables: copy `.env.local.example` — requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Stripe and Mapbox keys are optional for local dev.

---

## Architecture

### Role-Based Routing

Four protected role spaces enforced by `middleware.ts` (Supabase session refresh + cookie management):

| Path | Role |
|---|---|
| `/builder/*` | Builders |
| `/inspector/*` | Licensed Trade Inspectors / Registered Professionals |
| `/auditor/*` | Auditors (vault access) |
| `/admin/*` | Platform admin (control plane) |
| `/archive/*` | Public package previews |

### Auth Layer (`src/lib/auth.tsx`)

`AuthProvider` / `useAuth` — manages session state. Real Supabase users have a `supabaseId` on `AuthUser`; demo accounts (used for offline development) do not. All persistence calls check for `supabaseId` before hitting Supabase and fall back to `localStorage`.

Inspector disciplines/regions are stored in Supabase `user_metadata` JSON, not in a separate profile table.

### Store Layer (`src/lib/store.tsx`)

`StoreProvider` / `useStore` — React Context managing projects, jobs, applications, and assignments. This is not just a data cache: **business rule enforcement happens here**, not only in the UI. Five enforced service-layer rules are inline-commented:

1. Builder must be `approved` before posting
2. Inspector eligibility checked at claim time (discipline, region, credential expiry)
3. Sealing gated by Rule 11 (no open holds)
4. Package export blocked by 4 conditions (sealed, deficiencies resolved, admin approval, no holds)
5. Payout release blocked while disputed or blocked

All actions return `StoreActionResult<T>` — `{ ok: true, value }` or `{ ok: false, error: string }`.

For real Supabase accounts, jobs are loaded via a Realtime subscription. Demo accounts use mock data + `localStorage` (keys prefixed `sl_`).

### DB Layer (`src/lib/supabase/`)

Each file follows the same pattern as `jobs.ts`:
- Module-scope `supabase` client (`createClient()`)
- Private `rowTo*()` mapper (snake_case DB → camelCase TS)
- Exported async functions that return typed values or `null`/`[]` on error

**Tables in use:** `job_opportunities`, `job_applications`, `job_assignments`, `job_status_events`, `compliance_completed_records`, `builder_onboarding_status`, `job_holds` (added in Hold Aging migration).

**Migrations** live in `supabase/migrations/` as `YYYYMMDDHHMMSS_name.sql`. The Supabase CLI is not installed locally — apply migrations via the Supabase Dashboard SQL editor or CI.

### Domain Model (`src/lib/domain/`)

Canonical types for the regulated inspection record: `Authority`, `Permit`, `Submission`, `Deficiency`, `Evidence`, `EvidenceManifest`. These are re-exported from `src/lib/types.ts` as `Domain*` aliases to avoid name collisions. Rule 11 (`canSealSubmission`) is enforced in `lib/domain/index.ts`.

### Types (`src/lib/types.ts`)

Single source of truth for all shared TypeScript types. Key unions to know:

- **`InspectionStatus`** — full job-lifecycle state machine (14 states including `on_hold`, `stopped`, `awaiting_reinspection`)
- **`DispatchTier`** — `standard | priority | emergency` (drives aging windows, objection windows, and escrow timing)
- **`EscrowStatus`** — 9-state payment lifecycle
- **`HoldRecord` / `HoldStatus`** — hold aging types (see constraint notes below)

### Hold Aging (`src/lib/supabase/holds.ts`)

Six exported functions. Three non-negotiable constraints are enforced architecturally:

- **[C1]** `expiresAt` is computed only inside `placeHold()` as `placed_at + tier_interval` (standard=4h, priority=2h, emergency=1h). It is never a caller parameter.
- **[C2]** `checklistItemIds` is always `string[]` — never null. Pass `[]` for phase-level holds.
- **[C3]** `builderDeclineHold()` calls the Postgres RPC `decline_hold_and_stop_job()` — a single atomic transaction. **Do not call `updateJobStatus()` separately from `jobs.ts` for the decline path.**

### Package Generation (`src/lib/packages/authority-package.ts`)

Produces authority-ready export objects (Cover Page, Compliance Summary, Declarations, Evidence Appendix with GPS/checksum, Hold/Deficiency History). These are rendered to PDF via the `/archive/package-preview` route.

### Persistence Layer (`src/lib/persistence/`)

Server-first with `localStorage` fallback pattern used throughout:

```ts
try { await supabaseCall() } catch { /* fall through */ }
// always write to localStorage as well
```

`CompletedInspectionRecord.result` is `'pass' | 'fail' | 'stopped'` — `stopped` means a builder-declined hold terminated the inspection.

---

## Design System

Custom Tailwind tokens (see `tailwind.config.ts`):

| Token | Value | Use |
|---|---|---|
| `flame` | `#FF5F15` | Brand orange — CTAs, active states |
| `electric` | sky blue | Secondary accent |
| `ink` | near-white | Primary text |
| `muted` | dimmed | Secondary text |
| `surface` / `panel` / `raised` | dark grays | Card hierarchy |
| `success-green` / `fail-red` / `warning-amber` | status colors | Outcome badges |

Layout: 75/25 split (main content / sidebar). Max-width `7xl`. All monetary values display in `en-CA` locale; timestamps in `America/Vancouver`.

---

## Product Scope (Phase 1)

The `SITELINE_MASTER_WORKFLOW_BLUEPRINT.md` in the repo root is the implementation source of truth. Non-negotiable constraints:

- **SFH and Prefab/Modular only.** Do not build or extend commercial CP-1/CP-2 (Vancouver Certified Professional) forms or code-coordination hierarchies.
- Building permits and electrical permits are separate workflows producing separate package sections.
- LOAs (Letters of Assurance) are only included where legally required and issued by an appropriate Registered Professional — never for standard trade inspections.
- Every state change, assignment, and decision must create an immutable `job_status_events` audit row.
- Evidence files (photos, notes) are immutable; annotations are stored as derivatives.
