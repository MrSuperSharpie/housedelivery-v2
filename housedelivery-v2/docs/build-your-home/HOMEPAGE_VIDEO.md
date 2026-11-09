# Homepage video on the landing page

October 26, 2026. Branch: `feat/build-your-home-homepage-video`, based on the V2 landing-page revision `a380ea0`.

Edgar requested the homepage video banner for `/build-your-home`. The landing hero now uses the same existing self-hosted `/videos/house-delivery-hero.mp4`, with muted, looping, inline autoplay and the homepage's playback/error reconciliation. The asset is reused unchanged; no new video, service, embed or paid player was introduced.

Asset SHA-256: `05cfa9234d2d789156bff5bb49cc7cdc90e073d662a9c17c9ba66fc8d15cd9e0`.

The existing Langley still remains underneath until playback starts, when autoplay is blocked, for reduced motion, and if the video fails. Reduced motion pauses and hides the video. The image and all landing-page typography, inquiry CTAs, form, email, anti-spam and consent logic are preserved. The media credit now identifies the House Delivery collection rather than attributing the entire film to the Langley.

The approved homepage component and video file have no changes. The original checkout and image-library review artifacts remain intact. No production deployment or promotion is authorized.

## Verification

- Actual decoded video advances at desktop 1440px and mobile 390px.
- Muted, loop and playsInline properties verified; primary inquiry CTA retained.
- No third-party video player requests or JavaScript page errors.
- Reduced-motion video is paused and hidden with the still image visible.
- A forced video 404 preserves the still image without a broken playback control.
- `npm test`: 301 passed, 0 failed.
- Typecheck, production build and changed-file ESLint passed.
- Repository-wide lint retains the pre-existing planner effect error and unused import warning.

The static-hero performance measurements in the earlier V2 record describe the previous image-only version, not this video version. The existing MP4 is approximately 15 MB; browsers use the same-origin video delivery already used on the homepage. No subscription or hosting configuration was changed.

- Full landing/form browser regression passed at 1440, 1024, 768, 390 and 320px, including recovery, one successful-submission event, no Preview tracking and the no-JavaScript fallback. UI delivery was mocked; no new emails were sent.

## Vercel Preview

- [Open landing-page Preview](https://housedelivery-v2-i7jy2hi06-edavis-animalmarkets-projects.vercel.app/build-your-home)
- Deployment `dpl_AhoVMob58dJ5WN433Sn5q6qZDeTy`: READY, Preview target, existing `housedelivery-v2` project.
- Application commit: `832d57bbf03e712cd3b91b0e11f4a40c45f96423`.
- Hosted page verified: video source, autoplay/muted/loop/playsinline attributes, inquiry form, and noindex metadata. A 1024-byte range request returned the expected MP4 asset successfully.
- Production remains `dpl_7S93FDGJRqmhxLiafZ1X3RSU4FkP`, unchanged after the Preview deployment. Original checkout remains on `house-pricing-preview` with its existing unrelated changes.

## Label and housing-order refinement — October 26, 2026

Edgar requested a design-focused replacement for the hero's ownership label and to lead the housing stories with larger projects. The small hero label now reads “Design-led homes”, alongside the existing “Canadian housing company” descriptor. The main “Exceptional Design. Lasting Value.” line remains above the headline. The company description elsewhere is unchanged.

The stories now appear as Custom Homes, Small Residential Developments, Laneway Homes, then Carriage Homes. Existing imagery, links, editorial layout, video and inquiry logic are unchanged.

[Updated Preview](https://housedelivery-v2-jfzgoxyhb-edavis-animalmarkets-projects.vercel.app/build-your-home) — READY deployment `dpl_71yKpp71gjzbiNSba3nJTQ37YyZB`, application commit `3c0652a3294d5cf84de466bab14c405e2a624864`, same separate feature branch. Hosted content was verified. Production remains `dpl_7S93FDGJRqmhxLiafZ1X3RSU4FkP`.

Verification: local build, typecheck, changed-file ESLint and all 301 unit tests passed. Desktop 1440px and mobile 390px browser checks verified both content and visual scrolling order, the new label and all four images. Existing landing/form checks passed at 1440, 1024, 768, 390 and 320px, including the no-JavaScript fallback; delivery was mocked and no emails were sent. Repository lint still reports the pre-existing planner effect error and unused import warning.
