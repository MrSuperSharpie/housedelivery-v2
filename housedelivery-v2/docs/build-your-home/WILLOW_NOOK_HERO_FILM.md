# Willow Nook landing-page hero — Preview only

Isolated branch: `feat/laneway-willow-nook-hero-film`, based on completed campaign state `fb40b5d`. The original checkout and its unrelated dirty files are preserved. Only Laneway & Carriage hero media changes; headlines, copy, models, CTAs, property assessment, forms, email handling, attribution and conversion logic remain at their approved versions. No advertising-account changes.

## Supplied originals

Read directly from the original housedelivery-v2 checkout's `public/media/laneway/`; neither source was moved, renamed or modified.

- `willow-nook-laneway-hero.png`: 1676×938; SHA-256 `e831c73e9711eaeef1fc19f2a5e1706c69ac5a61af9eaa5ae6d2fc7e6adf1a3a`.
- `willow-nook-laneway-original.mp4`: 10.01 seconds, 1280×720, 24 fps, H.264 plus audio; SHA-256 `332e6d5d0c7f5ddc6535bbb7a215c8a4530d3844fc875e672a21333891ebf263`.

## Editorial decisions

Source frames 0–11 contain the people materializing and are excluded. Retained native-speed exterior family frames 12–47 (0.50–2.00s) and, on desktop, parents frames 49–92 (2.04–3.88s). Later doorway/interior scenes have stronger architectural inconsistencies and transitional artifacts and are excluded. No optical-flow interpolation, reversed action or overlapping people.

The new exterior image opens and closes the film. Four-frame fade-outs followed by four-frame fade-ins pass through darkness between the still and people. The wide family shot cuts directly to the parents on desktop. Matching static first/last images make the loop continuous. Mobile uses a portrait crop of the wide family shot and omits the tight parents shot so faces are not cut off. All video is silent.

## Derived outputs

| Asset | Dimensions | Duration | Bytes |
| --- | --- | --- | --- |
| Desktop MP4 | 1280×720 | 7.333s | 3,657,678 |
| Mobile MP4 | 404×720 | 6.000s | 986,825 |
| Desktop WebP poster | 1664×936 | — | 571,358 |
| Mobile WebP poster | 526×936 | — | 181,710 |

Both films use H.264/yuv420p, 24 fps and faststart. Picture sources select the mobile poster without downloading its desktop counterpart. Video is mounted only after checking motion/data-saving preferences; posters remain available without JavaScript or after playback failure. Pause/play control follows existing styling and stays at the top of the Laneway hero so it is visible before scrolling.

Reproduce with `node scripts/prepare-willow-hero.mjs <ffmpeg-executable> <original-image> <original-video>`. FFmpeg was installed temporarily outside the repository; project dependencies and lockfile are unchanged.

## Architecture review for approval

Compared against the approved `The-Willow-Nook-1.jpg`. The recreation retains the general single-storey gable, standing-seam roof, white horizontal cladding, side entry, landscape-format side windows and tall gable glazing. Door/glazing proportions, mullion details, exterior lighting and landscaping are not exact reproductions. The new landscaping and staged family scene are illustrative. Editing does not validate these as construction specifications. Review those differences before approving advertising use. No completed-project or architectural-accuracy claim was added to the page.

## Verification

Build, TypeScript and changed-file ESLint passed; all 307 existing tests passed. Chrome verification passed at 1440, 768, 390 and 320px: playback, loop, muted inline video, pause/resume, correct asset selection, poster, no horizontal overflow, form/CTA presence and no external Preview tracking. Reduced motion, save-data, missing-video and no-JavaScript cases retain static media. Custom Homes still uses `/videos/house-delivery-hero.mp4` and `/Langley-3.avif`; its existing component body and hero behavior are preserved.

Existing project verified: `housedelivery-v2`, repository `MrSuperSharpie/housedelivery-v2`, root `housedelivery-v2`. Production baseline `dpl_7S93FDGJRqmhxLiafZ1X3RSU4FkP`. Deployment is Preview only; no production promotion or merge is authorized.

Final application commit: `d764818`. Vercel Preview `dpl_3zEbuCJ2eby4EpiSDiZKHqQC7yyS` is READY at `https://housedelivery-v2-2d8v13y2y-edavis-animalmarkets-projects.vercel.app/build-your-home/laneway-carriage-homes`. The deployed page passed desktop/mobile playback and visible-control checks; Custom Homes still serves its original video. Production was verified unchanged after the final Preview deployment. Both original media hashes were rechecked unchanged. No inquiry emails were sent for these media-only checks. Access-sharing tokens are temporary and intentionally excluded from this repository.
