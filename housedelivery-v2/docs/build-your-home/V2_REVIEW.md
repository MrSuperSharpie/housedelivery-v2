# V2 architectural revision — review record

October 26, 2026. Branch: `feat/build-your-home-v2-architecture`.

## Reference and preservation

Read Edgar's supplied design-direction file in full, reviewed the approved House Delivery V2 components and captured their rendered output. The reference is explicitly a reconstructed working brief; no original Awwwards review or specific inspiration sites are claimed.

Base: first-draft commit `554ea56`, preserving its complete inquiry functionality and earlier Preview. Original approved production source remains `edbf6e0`; production deployment remains `dpl_7S93FDGJRqmhxLiafZ1X3RSU4FkP`. The separate original checkout's unrelated changes were not moved, stashed, reset or edited.

The revision changes only landing-page composition, its CSS, a new route-specific hero, the browser QA script and documentation. Existing homepage, header, footer, Design Studio, global CSS, shared reveal components, form component, email API, security, consent and conversion logic have no diff against the first draft.

## Visual comparison

Captured the approved homepage and revised page at matching desktop and mobile sizes and inspected the actual screenshot pixels together. Measured desktop hero font family, size, weight, leading and tracking all match the approved LuxuryHero: Geist 154.08px / 500 / 121.723px / -11.556px at 1440px viewport width. Section hierarchy follows ModelShowcase and existing V2 page heroes.

The layout now has a cinematic approved interior, a quieter side column and a single project conversation action; oversized experience typography; full-bleed material imagery; offset housing stories; editorial process rows; and a vertically stacked inquiry section with the existing V2 field treatment. All housing and interiors are approved design references, not claims of completed local projects.

Manual review caught and resolved an internally clipped mobile CTA and an undersized portrait image derivative. Browser QA now checks control bounds even when a parent clips document overflow. The final mobile crop retains the balcony lines, kitchen and garden rather than centring the pendant lights. A throttled loading check also caught heavier WebP recompression of the existing 113 KB AVIF; the final hero serves that original approved AVIF directly. No extra image generation, icon family or colour palette was introduced.

## Verification

- `npm test`: **301 passed, 0 failed**.
- `npx tsc --noEmit`: **passed**.
- `npm run build`: **passed**, Next.js 16.2.11. The landing page remains static; the existing inquiry endpoint is unchanged.
- Changed-file ESLint: **passed**.
- Full `npm run lint`: retains the same pre-existing planner `set-state-in-effect` error and unused-import warning; no changed-file lint issue.
- Five-width browser QA: **passed** at 1440, 1024, 768, 390 and 320px. Verified navigation targets, control bounds, image decoding, form labels and vertical stacking, required validation, failure recovery with preserved input, one lead event after success, no lead event after failure, focused confirmation, native FAQs and no JavaScript page errors.
- Standard-motion parallax, reduced-motion checks and no-JavaScript content / direct email fallback passed. Preview tracking providers made no requests.
- Repeated UI delivery is mocked to avoid emailing the team. API and notification code are unchanged and retain their unit coverage. The original live Preview email acceptance test is recorded in `QA.md`; this visual revision does not claim a new inbox-delivery confirmation.

Desktop, mobile and comparison captures are in `v2-review/`. Visual approval remains with Edgar; automated checks establish working behavior, not a claim that subjective design approval has been granted.

## Deployment boundary

Create a new Vercel Preview on the existing `housedelivery-v2` project only. Do not merge, push to the production branch, promote, change production aliases, install advertising credentials, activate campaigns, or purchase services. The existing first-draft Preview remains available for comparison.

## Loading check

The final original-AVIF version recorded LCP **2736ms**, CLS **0**, on a local production server with cold browser cache, 390px viewport / DPR 2, simulated 1.6 Mbps download, 100ms latency and 4× CPU slowdown. The initial recompressed-image version recorded 4808ms under the same lab setup, prompting the correction. These are laboratory observations, not field Core Web Vitals or a guaranteed result for every device. Seven existing destination routes returned HTTP 200.

## Final hosted Preview

- URL: https://housedelivery-v2-2ynyzsfqa-edavis-animalmarkets-projects.vercel.app/build-your-home
- Deployment: `dpl_3CsUkWE8pVjJFug1RQnVhgSJ7eZr`, **READY**, Preview (`target: null`), existing project `prj_sAbWmbKd31KAkSvkugVp2udEPK49`.
- Deployed application commit: `7e0e8f6b0d6e34f1142672806f84d3174234f62f`, branch `feat/build-your-home-v2-architecture`, verified from deployment metadata.
- Authenticated hosted checks passed for the headline, form, Preview noindex metadata and form verification endpoint. The hosted AVIF is byte-for-byte identical to the original approved asset. Existing deployment protection was preserved.
- Production remains `dpl_7S93FDGJRqmhxLiafZ1X3RSU4FkP` on `main`. No production deployment, alias, subscription, campaign or tracking configuration was changed.
- No additional live email was sent during this visual revision. The preserved delivery logic and original notification acceptance remain documented in the first-draft QA record.
- This final evidence record is a documentation-only follow-up to the deployed application commit.
