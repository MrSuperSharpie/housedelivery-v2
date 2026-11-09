# Build Your Home — verification

Scope: Google Search visitor → `/build-your-home` → project inquiry → Resend acceptance → personal follow-up. Production baseline: `edbf6e0`.

## Automated checks

- `npm test`: **301 passed, 0 failed**. Includes the new inquiry validation, notification contents, token security, rate-limit and mocked provider-boundary cases, plus the existing repository suite.
- `npx tsc --noEmit`: **passed**.
- `npm run build`: **passed**, Next.js 16.2.11. Landing page is statically rendered; inquiry API is a Node.js function. Final contrast refinement rebuilt before deployment.
- ESLint against every changed JS/TS/TSX file: **passed**.
- `npm run lint`: **blocked by pre-existing unrelated findings**: `src/components/planner-local-lookbook-fallback.tsx:88` (`react-hooks/set-state-in-effect`) and an unused import warning in `src/components/first-nations-project-planner.tsx:18`. Neither file was changed. No new lint finding remains.
- `git diff --check`: **passed**.

## Browser checks

`BUILD_HOME_QA_URL=http://localhost:3119 node scripts/verify-build-your-home.mjs` passed on a local production build at 1440, 1024, 768, 390 and 320px widths, with reduced motion enabled. The browser checks use the repository's existing Playwright Core and installed Chrome.

Verified one H1, canonical and Preview noindex metadata, all architectural images loading, no horizontal overflow, working anchor targets and header clearance, vertically stacked labelled controls, native required-field validation, recoverable delivery errors with retained input, successful confirmation and focus, exactly one lead event after accepted submission, no lead event on failure, no contact details in the event, native FAQ expansion and zero page errors. Tracking providers made zero requests in Preview mode. No-JavaScript headline and direct email fallback passed.

The UI checks mock email delivery so repeated tests do not send notifications. API tests independently cover same-origin validation, content types, actual streamed body limits, honeypot, signature validation, missing configuration, correct Edgar recipient, no default CC, configured CC, stable retry idempotency, provider errors and HTTP 200 without a message ID. A live Preview provider-acceptance check is recorded separately after deployment; acceptance is not proof of inbox receipt.

## Visual review and regression boundary

Inspected the actual live-site brand screenshot, the new desktop hero, complete desktop page and mobile hero. The page reuses the production logo, header, footer, typeface and approved home renderings. It adds no supplier identity, testimonial, project-completion claim, warranty promise or demonstration-home offer.

The shared header/footer, homepage, Design Studio, data definitions and existing route UI were not edited. Existing email transport was extracted with identical endpoint, method, payload, headers, timeout and idempotency keys. Existing destination routes are smoke-tested separately. No database migration or paid service was introduced.

## Limitations

No field Core Web Vitals or real campaign data exist for the new route. Consent-controlled analytics remain inactive on Preview by design; production GA4 / Ads reporting must be validated after release approval. Inbox delivery, bounce monitoring, Brian routing, commercial Vercel plan and advertising configuration require the owner's operational confirmation before launch. This is not a claim of a full-site WCAG audit; shared legacy footer styling was preserved.

## Final Preview verification

- Preview: https://housedelivery-v2-39y4wk5xv-edavis-animalmarkets-projects.vercel.app/build-your-home
- Deployment: `dpl_7hKs2dLSamMRj4Ln2XHjhXYvh4Sy`, **READY**, existing `housedelivery-v2` project. Preview environment (Vercel represents this as `target: null`).
- Application commit: `95eb2b153c02d8ce8c25c1e83f7a89d282057ced` on `feat/build-your-home-acquisition`, verified against deployment metadata.
- Authenticated HTTP checks confirmed the hosted headline, form, Preview noindex metadata and signed form challenge. Deployment protection was preserved.
- One clearly labelled QA inquiry was submitted to `edavis@housedelivery.ca` through the actual Preview endpoint. Response: `accepted: true`, reference `38c2cf2b-d008-4b07-b5fe-d8f98dd673f3`. This confirms Resend accepted the real notification; target inbox receipt is not independently confirmed. No customer lead or sales opportunity was represented by the test.
- Final five-width browser run passed after contrast refinements. Existing destination routes: 7/7 HTTP 200.
- Mobile lab performance: LCP **2352ms**, CLS **0**, local production server with cold browser cache, 390px viewport / DPR 2, simulated 1.6 Mbps download, 100ms latency and 4× CPU slowdown. This is a lab check, not field Core Web Vitals or a Lighthouse score.
- Production remains `dpl_7S93FDGJRqmhxLiafZ1X3RSU4FkP`; no production alias, subscription, tracking credential or ad campaign was changed. Original checkout changes remain intact.
- Created by CLI Preview deployment directly from the isolated feature worktree. No branch push or merge was necessary. This final evidence record is a documentation-only follow-up to the deployed application commit.

- Preview runtime log confirms `build_home_delivery_accepted` for the test reference, provider message ID `01a179c1-e208-756f-a6d8-51e666766680`.
- Hosted mobile hero image optimization returned a valid WebP at 828 × 466px. No image quota or image optimization error was observed for this request.
