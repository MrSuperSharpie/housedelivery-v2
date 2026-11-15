# Google Ads measurement — Preview implementation

## Protected production baseline

Project: `housedelivery-v2` (`prj_sAbWmbKd31KAkSvkugVp2udEPK49`), team `edavis-animalmarkets-projects`. Both public domain aliases resolved to Ready Production deployment `dpl_H2UeS9ffcGSjw9a43Kq2h3qszwM7`, whose Git metadata identifies `ee7c8e1c8e0f6ee0952a7d2db0179d478ade84a4` in `MrSuperSharpie/housedelivery-v2`.

`feature/google-ads-measurement-20261115` was created from that exact commit before editing. The separate inquiry-simplification branch/commit `a3be2d6` is preserved and was not merged into this work. The unrelated dirty Desktop checkout, main, Production deployments, domain aliases and Production settings are unchanged.

## Existing tagging and inquiry path

The root App Router layout already mounts `AnalyticsManager` under Suspense. It uses `next/script` with `afterInteractive`, one `gtag.js` bootstrap for GA4 `G-59Q25GQB61`, Microsoft Clarity and LinkedIn. No GTM container, Google Ads destination or conversion labels existed in the inspected application.

The public-host allowlist, opt-in banner, Essential only choice, Global Privacy Control/Do Not Track handling and internal-route exclusion remain intact. Ordinary Preview/local hosts do not load tracking providers. Google Ads detection on the live site cannot change until Edgar approves a Production release; a visitor who has not allowed analytics/campaign measurement also will not load the tag.

Both focused landing pages use the existing two-step `CampaignInquiryForm`. A preliminary laneway property check is separate from a lead. The final submission must return HTTP success, `accepted: true` and an inquiry reference before a session receipt is stored. The existing manager consumes each eligible receipt once and emits GA4 `generate_lead`, with:

- `form_name=focused_project_inquiry`
- `lead_source=custom-homes` or `laneway-carriage-homes`
- `transaction_id` equal to the anonymous inquiry reference.

Direct thank-you visits, field validation failures, preliminary property checks and failed deliveries do not qualify. Session receipt handling prevents repeat measurement on refresh, return navigation or repeated receipt notifications. No server/email, form, consent, anti-spam or receipt logic is changed.

## Implementation

- `src/lib/google-tag.ts` centralizes the existing GA4 ID and supplied Ads ID `AW-18548497593`, and adds an Ads destination to the existing initialization. GA4 manual page-view and privacy settings are preserved; advertising personalization remains disabled. There is no second application loader, GTM install, package or framework.
- `src/components/analytics-manager.tsx` reuses its existing root-level script IDs/loader. Existing events and page views explicitly target GA4, so adding another destination does not broadcast all existing analytics events to Ads. A direct Ads conversion is emitted only in the accepted-receipt callback and only when a valid, action-specific destination has been supplied.
- The direct Ads payload contains only `send_to` and `transaction_id`. No contact details, form contents, fabricated conversion value or currency are added. Missing/invalid destinations disable only direct Ads reporting; GA4 and customer inquiries continue functioning.
- `src/app/privacy/page.tsx` adds Google Ads to the existing measurement disclosure without changing layout, banner choices or the consent storage key.
- `src/lib/google-tag.test.ts` verifies initialization, privacy options, campaign mapping and fail-closed handling of missing/malformed labels. Synthetic destinations are unit-test fixtures only and are never deployment settings.
- `scripts/verify-google-ads.mjs` verifies the built site with tracking beacons and inquiry POSTs intercepted. Production-host behavior is tested by serving the feature build through browser routing; it does not modify or send submissions to Production.

Google's actual library fetched both the existing GA4 resource and a Google-injected Ads destination dependency, each once, with HTTP 200. The application still installs only its existing loader. Each destination was configured once; no GTM container or duplicate manual installation was found. Do not suppress Google's internal Ads dependency as a supposed duplicate.

## Required Google Ads configuration — not supplied yet

The Ads ID is known, but neither action's conversion label/event snippet nor whether the two actions are website actions or GA4 imports has been supplied. A request for the exact snippets/source was made. No labels are invented and no action-specific direct Ads conversions are enabled by default.

If these are **website conversion actions**, copy the complete `send_to` value from each action's event snippet and map it exactly:

| Website audience | Public build configuration | Required value |
| --- | --- | --- |
| Custom Homes | `NEXT_PUBLIC_GOOGLE_ADS_CUSTOM_HOMES_SEND_TO` | Actual `AW-18548497593/<Custom Homes label>` from Ads |
| Laneway / Carriage Homes | `NEXT_PUBLIC_GOOGLE_ADS_LANEWAY_CARRIAGE_SEND_TO` | Actual `AW-18548497593/<Laneway / Carriage label>` from Ads |

These are public tag destinations, not credentials. Configure only the review branch first and rebuild; Production values/release require approval. Do not use test fixture labels. The inquiry reference becomes the Ads transaction ID for deduplication.

If these are **GA4-imported actions**, leave direct destinations unset and confirm the intended GA4 key-event mapping uses the existing `form_name` and separate `lead_source` values. Avoid making both imported and direct versions primary conversions for the same inquiry. No Google Ads/GA4 account settings were changed.

In Ads, confirm each action measures accepted inquiries rather than a landing-page URL or ordinary thank-you page visit, use lead counting appropriate to one inquiry, and verify the intended primary/secondary status. Confirm auto-tagging and, for imports, the correct GA4/account linkage. After an approved release, check both IDs and actual accepted-inquiry behavior in Tag Assistant/Ads diagnostics with analytics consent. No campaign or spend changes are authorized by this task.

## Verification

- All 442 unit/integration tests pass, including the prior Concierge/security suite and three new tag tests. Optimized build, TypeScript, changed-file ESLint and whitespace checks pass.
- Nine unique browser cases pass: both ordinary Preview landing-page guards; real Google resources and destination initialization; both accepted inquiry journeys (desktop Custom Homes, mobile Laneway); Essential only, GPC and DNT; direct thank-you visit.
- Both campaign journeys produce one GA4 accepted lead with the correct audience and preserve GA4 routing. Failed submissions, page/property views and repeated receipt notifications produce no extra leads; reload/return navigation do not duplicate them. Test form/query canaries are absent from custom event payloads.
- No direct Ads conversion is emitted without verified labels. Positive destination selection is unit-tested using clearly synthetic fixtures; real Google Ads action receipt/account attribution cannot be verified until the actual action configuration is supplied.
- All measurement beacons and inquiry emails are blocked/mocked in browser QA. No test advertising conversion, sales inquiry, government property request or campaign change is sent. Actual Google tag JavaScript resources are fetched only for the isolated library check.
- Existing website styling, imagery, video, model/configurator/Look Book code, Concierge intelligence/API/security and inquiry delivery integrations have no diff.

Artifacts: `/private/tmp/hd-google-ads-20261115/`, including build/test logs, `real-tag-diagnostic.json`, browser results/screenshots and final Preview verification. This is not a Google Ads account-status or full accessibility certification.

## Primary references

- [Google Ads: reuse a Google tag already installed for Analytics](https://support.google.com/google-ads/answer/7548399?hl=en) — add the Ads configuration to the existing tag; use the actual action event snippet.
- [Google tag event routing](https://developers.google.com/tag-platform/gtagjs/routing) — explicit `send_to` avoids unintended default-group routing.
- [Google Ads transaction ID deduplication](https://support.google.com/google-ads/answer/6386790?hl=en) — use the unique inquiry reference for an action's duplicate protection.
- [Google consent mode concepts](https://developers.google.com/tag-platform/security/concepts/consent-mode) — existing tag blocking before consent is retained; no advanced-mode pre-consent collection is introduced.
- Installed Next.js 16.2.11 guides: `node_modules/next/dist/docs/01-app/02-guides/scripts.md` and `01-app/03-api-reference/02-components/script.md` — shared layout/client `next/script` lifecycle and IDs.

Stop at Vercel Preview. No Production merge, deployment, promotion or domain change.
