# Focused Google Ads landing pages — Preview only

## Scope and isolation

Branch: `feat/google-ads-focused-pages`, based on approved landing-page commit `831d1cb`.
Worktree: `/private/tmp/housedelivery-google-ads-focused` (app: `housedelivery-v2`).
The original working checkout, its unrelated uncommitted files, and `feat/build-your-home-homepage-video` were preserved. No merge or production release is authorized.

Routes:
- `/build-your-home/custom-homes`
- `/build-your-home/laneway-carriage-homes`
- `/build-your-home/thank-you` (always noindex)

The approved `/build-your-home` page and its images are retained. Only the three new routes suppress the global footer; other routes retain existing navigation/footer behavior. All landing inquiries now share the existing endpoint and email transport, addressed once to `sales@housedelivery.ca`. Legacy CC configuration is deliberately ignored on this pipeline so it cannot duplicate the distribution list.

## Design and claims

Reuses V2 Geist typography, tight architectural headings, charcoal/off-white palette, fine rules, generous space, approved homepage video and existing model renderings. Custom homes: Cedarview, Maplewood, Salt Spring (correctly described as a duplex design). Laneway/carriage: Willow Nook and Heritage Mews. Design Studio links use existing model routes.

Both pages include a two-step form in the opening composition, bottom invitation, mobile CTA, four-step process, FAQ and explicit separation of supplied package scope from Canadian site construction and excluded costs. The free preliminary property review is an initial discussion, not a formal zoning or permit assessment. Founder experience and Indigenous ownership are stated without claiming company/project history. No show-home progress, testimonials, suppliers, certifications, prices or construction dates were invented.

## Delivery and CRM

Uses existing `RESEND_API_KEY`, optional `BUILD_HOME_FORM_SECRET` and `INQUIRY_FROM_EMAIL`; no new paid service, database, notification provider or CRM integration.

Success requires an email-provider response with a nonempty message ID. Signed tokens, minimum completion time, origin checks, payload limits, honeypot, validation, bounded instance rate limit and provider idempotency remain in place. Same-payload retries retain the same message body and key. `form_started_at` is derived from the verified token so retries remain stable; the provider records acceptance time separately.

Every notification has reply-to set to the prospect and includes text plus CSV and JSON lead records. Fields include a unique reference, audience/source page, contact details, optional property address/model interest, municipality, ownership, timing, project details, consent and first/latest UTM/GCLID values where consented. CSV escapes multiline/quoted fields and neutralizes spreadsheet formulas. JSON preserves canonical values for Brian's custom CRM. Manual CRM entry/import is supported. No automatic sync is claimed without Brian's field schema and authenticated API specification.

Preview notifications are marked `[PREVIEW TEST]`. A provider acceptance proves handoff, not final inbox delivery. The distribution address must deliver to both Edgar and Brian; verify actual receipt rather than adding CCs. Keep test references and delivery evidence in the final handoff.

## Measurement and consent

The existing GA4 property is `G-59Q25GQB61`. No Google Ads account/conversion ID or label has been supplied or fabricated. Preview hosts do not load GA4, Clarity or LinkedIn, including after choosing Allow analytics. The consent controls are visible on the new Preview routes for QA.

On the production host, only after analytics consent, the existing manager emits `generate_lead` following accepted submission. It includes the inquiry reference as `transaction_id`, audience as `lead_source`, and `form_name=focused_project_inquiry`; no form contents or raw click identifiers are included. A session receipt prevents refresh/back-navigation from firing another lead. A direct visit to thank-you is not a conversion. Browser-storage failure can prevent measurement but does not prevent email submission. Tracking blocked by the browser is not treated as an inquiry failure.

UTM and GCLID capture honors Essential only, GPC and DNT. First-touch browser storage expires after 30 days; latest touch is session-scoped. Only allowlisted campaign fields are retained, without arbitrary query parameters. Never put customer contact details in campaign parameters.

After explicit production/tracking approval, use the existing GA4/Google Ads linkage: confirm the conversion event configuration (prefer a GA4 derived event filtered by `form_name=focused_project_inquiry` if these funnels need their own action), mark the intended event as a key event, import it into Google Ads and count leads as One. Do not simultaneously count a thank-you page-view action or a second direct Ads tag for the same inquiry. Confirm auto-tagging and consent settings in the account. Actual identifiers and launch settings must come from the approved account.

Possible final URL suffix (template only, not installed):
`utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}`
Google Ads auto-tagging supplies GCLID; do not construct one.

## Verification

Run `npm test`, `npx tsc --noEmit`, changed-file ESLint, `npm run build`, and `node scripts/verify-focused-campaigns.mjs`. Browser QA uses mocked email responses so repeated checks never notify the sales team; a separate clearly marked live Preview submission verifies the real pipeline. Existing `scripts/verify-build-your-home.mjs` remains available for the approved page regression.

Repository-wide ESLint already fails in `planner-local-lookbook-fallback.tsx:88` (set-state-in-effect); `first-nations-project-planner.tsx` also has an unused-type warning. These unrelated components are preserved.

## Preview verification — October 27, 2026 (Pacific)

- Deployed application commit: `8168c6f`.
- Preview deployment: `dpl_AAKmBC5HuTSmY841q3P6BbjHsaCV`, READY; target is Preview (not production).
- Base URL: `https://housedelivery-v2-ea2hmpcux-edavis-animalmarkets-projects.vercel.app`.
- Vercel project/repository/root verified: `housedelivery-v2`, `MrSuperSharpie/housedelivery-v2`, root `housedelivery-v2`.
- Production stayed `dpl_7S93FDGJRqmhxLiafZ1X3RSU4FkP`, source `edbf6e0cef1563249d3bfe5dea76df3ba49813cd` before and after Preview creation.
- Full test suite: 305 passed. After the final notification-source adjustment, the 10 relevant security/API/attribution/CRM tests passed again. TypeScript and changed-file ESLint passed. Local optimized build and remote Vercel build passed.
- Both new pages: browser checks passed at 1440, 768, 390 and 320px, with no horizontal overflow, broken images, browser errors or external tracking requests. Tested required-field blocking, step/back state, provider-error recovery, accepted confirmation, and reload behavior. Approved `/build-your-home`: existing regression script passed five viewports and no-JavaScript/email fallback.
- Real Custom Homes test accepted: `338bc2b3-a3d1-4003-8395-6c6c2acef5ba`; received in Edgar's connected Outlook at `2026-10-28T02:34:15Z`. Both CSV and JSON attachments confirmed by mailbox metadata.
- Real Laneway/Carriage test accepted: `76606506-33d4-45b7-beb1-e7997204f4b4`; received in Edgar's connected Outlook at `2026-10-28T02:35:05Z`, with both attachments confirmed. The initial automated attempt was correctly blocked by the two-second token guard; the retry with normal completion time succeeded. The blocked attempt sent no notification.
- Brian's receipt of both tests was confirmed by Edgar in this session after the concrete tests. Edgar's receipt and attachment metadata were independently verified through the connected Outlook account. Both-recipient delivery is confirmed without creating duplicate notifications.
- The existing Vercel team currently reports `hobby`. Vercel's Hobby plan is limited to personal non-commercial use; commercial hosting needs Pro or Enterprise before launch. No billing or protection settings were changed. Source: https://vercel.com/docs/plans/hobby . No additional service was installed or purchased.
- Share links are generated through existing Vercel Preview sharing and are temporary. Do not commit the access query tokens or disable project protection.

Remaining launch decisions: user approval of both page designs, commercial Vercel plan approval, and approved GA4/Ads conversion configuration. No production deployment or advertising launch is authorized.

## Laneway property assessment integration

The Laneway & Carriage page now runs the existing `reviewPropertyAddress` workflow using the property address and municipality before asking for contact details. The existing `PropertySnapshot` presents its preliminary result; a follow-up is optional and is sent only when the visitor submits the second step. The municipal-data coverage and manual-review limitations of the existing engine still apply. An encrypted, expiring receipt links the exact result to the form and address, without exposing internal rule details or depending on a shared serverless instance. The single sales notification includes the existing detailed property-review section and CRM exports include the review status, zoning and next action.

`sales@housedelivery.ca` is the campaign lead distribution address; `inquiries@housedelivery.ca` is the existing website's default sending address. The older homepage property-review flow has separate existing routing (hello plus a copy to Brian); that workflow was not changed. Campaign notifications continue to use the existing provider, sender and one sales recipient.

Integration Preview `dpl_AUduE83VbeEAgnCoQDwA8YEnNvdj` (application commit `2b32721`) built successfully. The 307-test suite and changed-file lint passed; the Laneway campaign passed browser checks at 1440, 768, 390 and 320px. On the real Preview, the existing property engine returned a cautious manual-review result for an ambiguous public civic address and returned a green preliminary snapshot with Vancouver zoning for an existing residential test fixture. A clearly marked follow-up test `0ac5e8f5-4432-4c21-8612-2c947bd31a26` was accepted and arrived in Edgar's Outlook, including the property-review report and CRM attachments; the existing sales distribution was previously confirmed to reach Edgar and Brian. Production remained `dpl_7S93FDGJRqmhxLiafZ1X3RSU4FkP`. Preview review links are temporary and the access token is not stored in the repository.
