# Build Your Home — acquisition and operations

## Release boundary

Current revision branch: `feat/build-your-home-homepage-video`. V2 image branch preserved: `feat/build-your-home-v2-architecture`. First-draft branch preserved: `feat/build-your-home-acquisition`.
Isolated worktree: `/private/tmp/housedelivery-v2-landing-refinement` (app directory: `housedelivery-v2`).
Base: verified production source `edbf6e0cef1563249d3bfe5dea76df3ba49813cd`.
Existing project: `prj_sAbWmbKd31KAkSvkugVp2udEPK49`, `housedelivery-v2`.
Team: `team_a4BOcAiKXJr7KqOHfqPLvAIP`, `edavis-animalmarkets-projects`.
Vercel Git link: `MrSuperSharpie/housedelivery-v2`, root directory `housedelivery-v2`, production branch `main`.

Original checkout has unrelated uncommitted changes. They were not reset, stashed, staged, copied into this branch or modified. No homepage, shared navigation, Design Studio, existing form interface or production configuration changes are included. Existing inquiry routes now use an extracted transport helper with the same endpoint, payload, headers, timeout and idempotency behavior.

Stop at Preview. No merge, production push, promotion, campaign launch, paid service or subscription change is authorized.

## Inquiry handling

`/build-your-home` → `GET /api/build-your-home-inquiries` for a signed form token → `POST /api/build-your-home-inquiries` → existing Resend email service → personal follow-up → qualification.

- Public contact links, no-JavaScript fallback and customer-visible error messages use `hello@housedelivery.ca`.
- Recipient is explicitly `edavis@housedelivery.ca`; visitor email is Reply-To.
- Resend must return a non-empty provider message ID before the API returns `accepted: true` and an inquiry reference.
- The team email includes name, email, optional phone, municipality, project type, ownership, timeline, details, reference and follow-up guidance. Status is **New inquiry — qualification and personal follow-up needed**, not a qualified opportunity.
- The on-page confirmation acknowledges the inquiry and personal follow-up without an unsupported response-time commitment. No automatic customer marketing email is sent.
- No new database or CRM is provisioned. The email inbox is the lead record; the server log retains the inquiry reference and provider message ID, without contact or project contents. Provider acceptance is not proof of inbox placement. Monitor the existing Resend delivery/bounce logs and confirm receipt in the target inbox before campaign launch.
- Retries share a signed nonce and the same Resend idempotency key. Resend's idempotency window applies; no claim of indefinite deduplication is made.
- Validation applies on both client and server. Required fields include qualification choices; phone and project details are optional. Full names do not require two name parts.
- Spam controls: honeypot, same-origin JSON submissions, a signed token valid for two hours and usable after two seconds, a 16 KB streamed body limit, bounded field lengths and a best-effort per-instance rate limit of five validated attempts per IP hash per 15 minutes. Honeypot submissions never return a successful conversion response. The per-instance limiter is not a globally distributed defence. Review existing Vercel WAF options if abuse warrants stronger limits; no paid CAPTCHA, KV or other service is added.
- Form failures preserve entered details and offer direct email. Expired verification can be refreshed. Static content and a direct email fallback remain available without JavaScript.

### Environment configuration

Already present in Preview: `RESEND_API_KEY` (verified by key name and scope only). Already present in production: `RESEND_API_KEY`, `INQUIRY_FROM_EMAIL`.

| Variable | Requirement |
| --- | --- |
| `RESEND_API_KEY` | Existing server-only Resend credential; required. Never place in a public variable. |
| `INQUIRY_FROM_EMAIL` | Existing verified sender; optional override. Fallback is `House Delivery Website <inquiries@housedelivery.ca>`. Preview currently uses the fallback. |
| `BUILD_HOME_FORM_SECRET` | Optional dedicated server-only signing secret. Domain-separated HMAC falls back to the existing Resend key if absent. |
| `BUILD_HOME_NOTIFICATION_CC` | Optional comma-separated internal recipients (maximum five). Keep unset until Brian's address, role and routing are confirmed. No speculative CC is enabled. |

## Consent and conversion measurement

The existing production consent manager already loads GA4, Clarity and LinkedIn only on the public production hostname after analytics consent. Preview loads none of these providers. Existing Global Privacy Control / Do Not Track behavior is retained. This work installs no new tracking credential or Ads tag.

The new form emits `generate_lead` only after an accepted API response containing its inquiry reference. Event properties are `form_name: build_your_home`, `lead_source: build_your_home` and an anonymous `transaction_id`. Name, email, phone, location, project choices and details are never included in the event. The form is masked for session recording from its initial render. Clicking a CTA, validation failure, delivery failure and viewing the page do not count as a lead.

After release approval, the account owner can mark this GA4 event as a key event and import it as a Google Ads lead conversion, with counting set to **One**. Validate it in GA4 DebugView / Google Ads diagnostics with consent, and test essential-only and privacy signals separately. Do not configure a second primary conversion for the same lead. A submission reference is available for diagnostics; GA4 generic-event transaction IDs are not claimed to provide automatic lead deduplication.

Google Ads account linking, auto-tagging / campaign attribution and any Ads-specific consent requirements must be reviewed before campaign activation. Current source attribution uses the existing consent-controlled UTM system; no GCLID storage or enhanced conversions were added. No advertising campaigns were activated.

References: [Google Ads: importing Analytics key events](https://support.google.com/google-ads/answer/2375435?hl=en), [Google Analytics conversions in Google Ads](https://support.google.com/google-ads/answer/10632359?hl=en).

## Hosting and costs

The actual Vercel account was checked on October 26, 2026: **Hobby**, active, no active trial. Current infrastructure can technically serve the static landing page, optimized images and a short Node.js form function. The existing Resend account sends notifications. A separate hosting project, database or paid form service is unnecessary for this implementation.

However, Vercel's Hobby terms restrict it to personal, non-commercial use. This business acquisition funnel requires **Pro or Enterprise for commercial use** before launch. No upgrade was performed. Confirm the current checkout price, taxes, seat allocation and spend settings in the dashboard before approving an upgrade. Pro's published starting price is US$20/month, with included usage credit and possible additional usage charges; it is not a guaranteed total cap.

For modest traffic, this architecture is lightweight, but actual cost depends on account-wide image transformations, transfer, function execution, total visits and Resend volume. The existing site's usage and the Resend account's plan, quota, sender-domain health and inbox routing were not exposed through the available connected account tools. Review those existing dashboards before launching ads. No blanket claim of zero incremental operating cost is made. Advertising spend is separate and remains unconfigured.

References: [Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines), [Hobby plan](https://vercel.com/docs/plans/hobby), [Pro plan](https://vercel.com/docs/plans/pro-plan), [current pricing](https://vercel.com/pricing).

## Lead handling

Edgar reviews each inquiry and personally confirms the property, municipality, intended housing, ownership / purchase readiness, indicative budget, timeline and construction partners. Only then advance a viable inquiry to a qualified sales opportunity. Keep the customer-funded showcase possibility private; no demonstration-home offer or incentive appears publicly. Brian's responsibilities and any internal notification route await confirmation.

## Approval items

1. Landing-page content, visual design and public production release.
2. Vercel commercial plan and its actual subscription cost.
3. Optional Brian notification address and lead-handling responsibilities.
4. GA4 key-event / Google Ads conversion setup, account linking and campaign launch.
5. Confirm test email receipt and existing email delivery monitoring before advertising.

## Public contact update — October 26, 2026

[Current landing-page Preview](https://housedelivery-v2-j3qgd7a8e-edavis-animalmarkets-projects.vercel.app/build-your-home) — READY deployment `dpl_FqmjedmzyF13BGzQx1pD3XtKrRXm`, application commit `c1fb4ab5de344c35ffb777de864439bb3073abad`, same separate feature branch. A fresh temporary review link was provided separately for Brian; no share token is stored in the repository.

Public contact is now `hello@housedelivery.ca` in the direct email link, no-JavaScript fallback and API error messages. Notification routing, sender, Reply-To, CC configuration, validation and delivery behavior are unchanged. The shared footer already linked to hello and was not modified.

Build, typecheck, changed-file ESLint and all 301 tests passed. Full form/browser regression passed at 1440, 1024, 768, 390 and 320px, including validation, error recovery, one successful-submission event and no-JavaScript email fallback. Delivery was mocked; no new notifications were sent. Hosted HTML verifies all public mailto links point to hello and the old public address is absent. Repository lint retains its pre-existing planner effect error and unused import warning.

Production remains `dpl_7S93FDGJRqmhxLiafZ1X3RSU4FkP`. No production deployment, merge, tracking activation or paid-service change occurred.
