# AI Housing Concierge V1 — implementation and review

## Verified foundation and preview boundary

The existing `feature/ai-housing-concierge-20261113` branch retains its brief commit and merges actual production `f690d81580969e5e2a64bd945a42dcd9f6f2706f`. Both live aliases were verified on deployment `dpl_5yoHEvVMwNydhQtMr3AngNZzEs3r` before work. No main merge or production changes are authorized. The original branch is saved as `ai-concierge-before-foundation-20261113`.

Enablement is branch-specific Preview configuration. Both the UI and endpoints fail closed in Vercel's production environment. A later production release requires explicit approval and a deliberate activation review; there is no automatic promotion.

## Knowledge boundary — beyond prompting

`src/data/concierge/approved-knowledge.json` is a frozen customer-safe snapshot of approved production content. Its manifest records the exact source fields, baseline, version and SHA-256. The reviewed snapshot contains 255 facts. It covers all 18 custom homes, seven CMHC reference designs, six laneway/carriage designs, 15 inclusions categories, public product selections, and the public active Design Studio choices for all 18 homes. General facts cover Canadian construction, project scope, national development, municipal/institutional projects, community-led Indigenous housing, participation, site review, timing, customization, Look Books, rates and exclusions.

Only expressly selected public fields were copied. No image filenames, original asset identifiers, saved personalizations, supplier/manufacturer identity or relationship fields, quotes, internal costs, margins, markups, contracts, negotiations, customer records, correspondence or credentials are included. The runtime never imports the source registries; it imports the reviewed snapshot only. There is no automatic crawler, repository ingestion, embeddings database, document search, URL loader, SQL tool, filesystem tool or model tool loop.

The model is a constrained conversational planner. It selects **fact IDs**, a follow-up question key and a disposition from a schema. It cannot publish free-form answer text, invent a URL, attach a file, retrieve private data or make an external action. Runtime validation checks every ID against the approved candidate set and rejects extra fields. The server renders only approved wording and resolves approved links. This remains true even if an attacker bypasses the pre-inference confidentiality detector or persuades the model to ignore its instructions. Pricing exclusions and CMHC qualifications are added by deterministic code.

No confidential-value denylist is supplied to the model. Confidentiality depends on data exclusion and the closed publishing vocabulary, not a prompt or a list of secret names. The system will not independently synthesize new project estimates or make unapproved capacity, schedule, funding or regulatory commitments.

To update knowledge: review the specific public website change; manually copy only the manifest's permitted fields; check facts and links, exclusions and absence of confidential identifiers; update the snapshot version and manifest hash; run scope and extraction tests; review in a separate Preview. Never add a private data source or connect an unrestricted database.

## AI and conversation processing

AI SDK 7 uses Vercel AI Gateway with a server-only environment model ID. The first selected model was blocked by this team's free-tier restrictions. `openai/gpt-4.1-mini` was verified available and supports structured output, no-training and zero-data-retention routing. No billing changes or provider keys were created. The model is configured through `AI_GATEWAY_MODEL`; it is not hard-coded into application code.

Requests require `disallowPromptTraining` and `zeroDataRetention`. There is no less-private fallback when those filters cannot be satisfied. Raw model answers/reasoning are never sent to the browser. No AI telemetry or transcript logging is enabled by this feature. The website stores conversations only in the current panel's memory. Contact-shaped emails and telephone numbers in chat are redacted before inference. Visitors are told not to put personal/confidential information in chat; arbitrary names in free text cannot be reliably detected. Lead-form contents are structurally separate and never enter inference.

The text-only transport and approved response contract can later support explicitly consented voice transcription and speech. V1 adds no microphone, audio autoplay or voice dependency.

## Request and abuse controls

- Same-host browser Origin, HTTPS (localhost exception), JSON-only mutations and cross-site rejection.
- Actual streamed-body byte caps, length/shape checks, allowlisted fields and bounded histories.
- Purpose-bound signed tokens with expiry, honeypot checks and replay-resistant provider idempotency for lead delivery.
- HMAC-hashed IP identifiers, bounded expiring per-instance rate buckets, per-session turn limits, inference concurrency cap, output-token cap, no SDK retries, cancellation and timeout.
- No-store responses and sanitized error messages; logs contain event names only, never PII, prompt text, provider bodies or credentials.
- Existing Vercel deployment protection remains enabled. Rate buckets are **per warm function instance**, not a distributed quota. Before a public production release, establish a durable/global request and spend limit; do not claim these in-memory buckets enforce a team-wide budget.

## Permission-based lead intake

The visitor reviews project/organization, municipality/province, housing type/count, site status, timing, objective and contact details in a separate form. The explicit consent checkbox is required and is not preselected. No transcript is attached or sent automatically. The lead route has no AI call and uses the existing `sendInquiryEmail` transport to the existing `sales@housedelivery.ca` workflow with source `ai-concierge`, a stable idempotency reference and reply-to validation. It reads no customer database.

Success is shown only after the email provider accepts the request and returns a non-empty message ID. Errors preserve the form and provide the existing `/plan-a-housing-project` alternative. No marketing subscription is created. Tests use a mocked email provider; no test inquiry emails are sent to the team.

## Desktop/mobile and privacy

The lightweight site-wide launcher loads the panel only when opened. It measures visible geometry locally, never forwarding page DOM or private form contents to the AI. On mobile it prefers a clear space near the top rather than covering the hero’s primary actions or the architectural subject. It avoids visible controls/consent banners and yields to existing modal experiences. The panel uses a native modal dialog for focus containment, Escape dismissal and background inertness, restores launcher focus, respects reduced motion, uses readable mobile input sizes and scrolls its content independently. Chat and lead contents are masked from Clarity; analytics events have only non-personal metadata. The privacy notice describes AI processing and separate inquiry consent.

## Configuration and rollback

Only this branch's Preview has `CONCIERGE_ENABLED=true`, `AI_GATEWAY_MODEL` and a new secret `CONCIERGE_REQUEST_SECRET`. Existing Preview Resend configuration is reused by the lead route. No production environment variable is changed. Deployed readiness uses Vercel’s trusted request-context OIDC helper, matching the Gateway SDK; it does not assume deployed tokens are environment variables. Local verification uses short-lived project OIDC, never a committed `.env` or provider key.

Rollback: disable `CONCIERGE_ENABLED` for this branch and create a new Preview, or revert the Concierge implementation commit. The merge bringing the branch onto current production may remain. Existing website functionality does not depend on the Concierge; existing project-review forms remain available. Do not promote or change live aliases without Edgar's explicit approval.
