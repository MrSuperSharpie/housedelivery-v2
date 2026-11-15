# Concierge inquiry simplification

## Verified production baseline

Both `housedelivery.ca` and `www.housedelivery.ca` resolved to production deployment `dpl_H2UeS9ffcGSjw9a43Kq2h3qszwM7`, URL `housedelivery-v2-73hj7j3vf-edavis-animalmarkets-projects.vercel.app`, in project `housedelivery-v2` (`prj_sAbWmbKd31KAkSvkugVp2udEPK49`). The deployment was Ready, targeted Production, and its Git metadata identified commit `ee7c8e1c8e0f6ee0952a7d2db0179d478ade84a4` from `MrSuperSharpie/housedelivery-v2`.

The new branch `feature/concierge-inquiry-simplification-20261115` was created from that exact commit before editing. The earlier visual branch and unrelated dirty Desktop checkout were preserved. Read-only production screenshots used no chat or inquiry POSTs. Production code, settings, domains and aliases were not modified.

## Changes

- Five primary fields: full name, email address, customer category, optional location, optional project description. Only the first three plus explicit contact consent are required.
- A native, keyboard-accessible disclosure contains six optional fields: organization, housing type, number of homes, site status, timing and telephone. It starts collapsed and retains entered values when closed. Existing customer categories and dropdown values, including `500+` homes and `Phased program`, remain unchanged.
- Requested heading, supporting/privacy text, submission button and acceptance confirmation. Existing glass materials, input styling, scroll area, back-to-conversation control and privacy link are retained. Added CSS applies only to inquiry details/description.
- The form starts blank. Chat summaries are no longer automatically prefilled. The chat's own summary functionality is unchanged. Neither contact details nor transcripts enter the AI request.
- The same endpoint accepts optional project fields without inventing values. Legacy municipality/province payloads remain valid. Provided optional values retain their length, plain-text and enum validation; consent, same-origin/JSON checks, signed tokens, timing, rate limits, honeypot, strict field allowlist and idempotency are unchanged.
- Existing Resend transport, sender configuration and `sales@housedelivery.ca` recipient remain unchanged. Notification subjects identify customer category and location; bodies include the description and supplied optional details. Missing details are explicitly marked `Not supplied`.
- Success still requires backend `accepted: true` and a reference after provider acceptance. Failed delivery preserves entered values. The existing privacy-safe conversion event fires only after success.

## Source scope

- `src/components/housing-concierge-lead-form.tsx`: simplified form, optional disclosure and requested copy; unchanged submission endpoint/consent handling.
- `src/components/housing-concierge-panel.tsx`: removes only automatic form-summary prefill.
- `src/components/housing-concierge.module.css`: inquiry-only disclosure, privacy text and vertical textarea resizing.
- `src/lib/concierge/lead.ts`: optional-field parsing, legacy location compatibility and notification formatting.
- `src/app/api/concierge/leads/route.ts`: uses the notification subject formatter; existing provider and security path unchanged.
- `src/lib/concierge/lead.test.ts`: minimal/advanced submissions, validation, privacy, idempotency and existing endpoint-to-provider notification contract.
- `scripts/verify-concierge-inquiry.mjs`: browser-only acceptance tests with mocked submissions; no runtime testing mode or real email.
- `scripts/verify-concierge-visual.mjs`: updates existing inquiry interactions and scopes form labels to avoid the homepage's separate location input.
- This note.

No changes to knowledge, policy records, prompts, models, retrieval, answer generation/validation, conversation state, homepage, video, architectural imagery, global styles, pricing or other forms. No dependency or database changes.

## Verification and limits

All 444 automated tests passed, including five new inquiry tests and the prior security/intelligence suite. The optimized build, audited-knowledge validation, TypeScript, changed-file lint and whitespace checks passed. The dropdown accessibility recheck passed after explicit select names were restored; the first browser check identified option text entering the computed label.

Focused browser acceptance covers 1440×900, 390×844 and 360×780: five primary fields; only three required data fields plus consent; six unchanged customer categories; blank description despite a chat summary; disclosure keyboard operation; retained optional values when collapsed; minimal and 500+ home submissions; delayed/provider-rejected/unconfirmed success handling; error/draft preservation; no form-to-AI data flow; safe conversion event; mobile scroll and simulated keyboard geometry. All these submissions are browser-mocked.

The original five Concierge responsive viewport passes are retained rather than repeated. The remaining shared interaction checks passed after correcting test selectors that also matched the homepage location field and process disclosure. A form-only continuation skipped the already completed conversation checks while completing inquiry, connection-retry and normal-motion checks. Public approved answer fixtures are test-only and never imported by runtime.

Final Preview verification and any actual email acceptance/receipt evidence are reported separately after deployment. Only clearly labelled synthetic Preview inquiries are authorized for that check. Provider acceptance and mailbox receipt must be distinguished; no real customer data is used. No claim of physical-device keyboard testing or full accessibility certification.

Artifacts: `/private/tmp/hd-concierge-inquiry-20261115/` contains baseline and updated screenshots, build/test logs, browser results and Preview verification. Preview configuration is scoped to this new branch; evaluation/test tools are not enabled. Stop at Preview for Edgar's approval; no Production promotion or merge.
