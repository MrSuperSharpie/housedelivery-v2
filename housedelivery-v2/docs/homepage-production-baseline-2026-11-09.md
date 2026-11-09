# Production homepage comparison and property-review restoration

Live baseline: https://www.housedelivery.ca/ — production deployment `dpl_F1zzu9MJM4rs9M5fcTSPdp6GFRr9`, inspected November 9, 2026.

Compliance branch before this correction: `d18216d`, on `compliance/cmhc-pre-reviewed-terms-2026-11-09`.

## Cause and recovery evidence

The compliance branch started from local commit `33b9cc1`, which diverged from the manually deployed production source. Earlier preservation checks compared against that local commit, not the live production homepage. They therefore did not catch the missing property-review feature.

Production's source inventory was retrieved read-only. Its file-content hashes were matched against local Git history to recover the exact deployed files, rather than recreating the feature from memory or substituting an older form.

- `carriage-home-showcase.tsx`: production SHA-1 `81942113a3f29acacd4ac4ffdcc231714b1b6ddf`, matching commit `24ecb18`. This includes the original section, kitchen image, form, result snapshot and placement after the first two cards.
- `property-snapshot.tsx`: matching production source from `2b32721`.
- Property-review workflow, jurisdiction routing, municipal providers and email formatting: exact production versions recovered from `24ecb18`, `e7dd6a8` and `694d4a0`.
- Analytics event helper and shared email transport: exact production files recovered from `f108d7e` and `95eb2b1`.

## Correction made

Restored the original “Could a laneway or carriage home work on your property?” section immediately after The Willow Nook and The Lantern House, before The Courtyard Cottage.

The original kitchen file is retained unchanged:

`/images/inclusions/kitchen-cabinetry/products/hd-kitchen-cabinetry-signature-02-luminous-oak-gallery.jpg`

The original CTA opens the property-review form. Its location, ownership, contact and housing-interest inputs, submission/retry behavior, preliminary result snapshot, disclaimers and follow-up actions are restored. Its municipal review and existing internal/customer email handling are connected to `/api/inquiries` again. The API integration preserves the current budget and Planner paths; no live test emails were sent.

Previously approved pricing links on carriage cards are preserved. CMHC terminology, clean catalogue cards, terms page, verified drawing dates, untouched PDFs and Premium CAD $250 / Signature CAD $300 rates are unchanged by this correction.

## Complete homepage comparison

Both homepages were compared at widths 1440 and 390. The comparison records every top-level main section, heading, image source, video source, link and button, and compares the original property-section DOM, CSS classes, dimensions and form schema.

| Production section | Result after restoration |
| --- | --- |
| Hero | Present; remaining video/statistic differences listed below |
| Housing category navigation | Present; remaining anchor/layout differences listed below |
| Custom homes | All 18 homes, headings, images and gallery/filter controls present |
| Laneway and carriage homes | All six cards present; property section restored at the original insertion point |
| CMHC catalogue | All seven designs present; approved terminology, source and terms changes retained |
| Langley walkthrough | Present; same image sources and video component |
| Value/funding introduction | Present; same headings and image sources |
| Modern methods and Canadian standards | Present; same headings and image sources |
| Finishes and Inclusions film | Present; approved CMHC terminology retained |
| Delivery timeline | Present; remaining timing-copy difference listed below |
| Funding pathways | Present; same headings and controls |
| Project-review form | Present; current approved budget-prefill support retained |
| Header and footer | Present; remaining privacy/navigation differences listed below |

The live homepage has 12 top-level main sections; the preview has those same sections plus the previously approved pricing introduction. After restoring the kitchen section, both homepages contain the same 47 main-content image instances and no production heading is missing. All 29 distinct local image files used by the production homepage match the production deployment's source hashes byte for byte. Remote image URLs also match.

## Other differences identified — not changed

These are outside the requested property-section correction and remain for owner review:

1. **Hero media and statistics.** Production uses `/videos/house-delivery-hero.mp4`, with playback/failure/reduced-motion handling, and shows approximately 120 days to delivery. The preview uses the older `/hero-video.mp4` and displays “One / Coordinated home system.” The production video path is absent from the preview checkout.
2. **Header and category navigation.** Production's Homes link targets `/#home-types`; the preview targets `/#models`. Production's Custom Homes category targets `#custom-homes`, while the preview uses `#models`. The carriage category targets `#laneway-carriage-homes` in production and `#carriage-homes` in the preview; the restored component retains production's carriage anchor as well as the existing preview anchor. Production also uses a different desktop/mobile header breakpoint and spacing. The preview's approved Pricing link remains.
3. **Privacy, cookies and analytics.** Production includes the analytics-consent panel with “Essential only” and “Allow analytics” controls, a Privacy & Cookies footer link and `/privacy`. Those controls, footer link, page and the analytics-manager integration are absent from the preview baseline. Restoring the property event helper does not restore the site-wide analytics manager or change consent behavior.
4. **Timing copy.** Production's timeline says project timing is established after site, design, approval and procurement requirements are understood. The preview instead states that factory production is typically 40–45 days after approved drawings and payment. This pre-existing copy difference was left unchanged.

No further production homepage section, heading or image-source omission was found. This does **not** mean the entire repository matches production: the production snapshot and local pricing branch contain additional differences on other routes. Those routes were not changed or broadly reconciled in this correction.

## Verification

- Production and restored property sections match content, image source, descendant CSS classes, width and height at 1440 and 390 pixels. Original form fields, required fields and select choices match at both widths.
- The original insertion order is asserted: Willow Nook → Lantern House → property review → Courtyard Cottage → Heritage Mews → Limetree → Moonlight.
- Local browser checks cover opening the form, simulated failure and retry, retained inputs, original source/ownership/interest payload, snapshot rendering, disclaimer, and the Book My Property Review action closing the modal and navigating to `#reserve`.
- Production's form was opened for comparison but never submitted. All local browser submissions were intercepted. API tests mock email delivery and government requests.
- All 271 unit tests pass, including the recovered production provider/routing tests and an API test verifying both restored property delivery and the unchanged approved $250/$300 budget enquiry.
- TypeScript, lint, production build and whitespace checks pass.
- The production kitchen image and all other local homepage image bytes are unchanged. The original working directory's uncommitted edits and deletions are preserved.
- Temporary inventories and screenshots: `/private/tmp/hd-homepage-production-comparison`; full text differences: `/private/tmp/hd-homepage-text-differences.json`.

Only the existing compliance branch is committed and pushed. No merge or production deployment is part of this correction. The preview still has the four explicitly listed differences awaiting owner review.
