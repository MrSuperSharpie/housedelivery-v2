# Current Willow Nook hero — opening trim only

This revision supersedes the earlier editorial desktop/mobile films as the landing-page video source. The previous assets remain preserved; they are no longer selected by the page.

- New file: `public/media/laneway/willow-nook-laneway-opening-trim.mp4`.
- Source: the supplied `willow-nook-laneway-original.mp4`, read from the original project checkout without modification.
- Edit: begin at 0.500 seconds; retain the entire remainder to the original end. All 228 presented frames match source frames 12–239 exactly by decoded frame MD5 comparison.
- The H.264 video and AAC audio are stream-copied without re-encoding. An MP4 edit list starts presentation at 0.500 seconds; required decoding preroll remains in the container. This preserves the original compressed picture/audio quality. Faststart supports browser loading.
- No additional cuts, scene rearrangement, transitions, dissolves, inserted stills, grading, resizing, speed changes or removed family/interior scenes. The same full-length file is used on desktop and mobile.
- The high-resolution image remains the existing HTML poster/loading/error/reduced-motion fallback only; it is not inserted into the video.
- Existing page design, copy, form/property assessment, tracking and Custom Homes are preserved.

Reproduction: `ffmpeg -ss 0.5 -i <original.mp4> -map 0 -c copy -movflags +faststart <new-file.mp4>`.

Feature branch: `feat/laneway-willow-opening-trim`. Preview only; no production deployment or Google Ads changes.

Verified Preview: `dpl_C6acWzPcmrcc1iwFZSPpYdZ4qzt8`, application commit `667e918`, READY at `https://housedelivery-v2-hwdiigpoc-edavis-animalmarkets-projects.vercel.app/build-your-home/laneway-carriage-homes`. Build, TypeScript and changed-file lint passed. Browser checks passed at 1440, 768, 390 and 320px, including controls, loop, poster and static fallbacks. Live Preview checks confirmed the same 9.505-second file on desktop and mobile and the original Custom Homes video. Source hash rechecked unchanged; production remains `dpl_7S93FDGJRqmhxLiafZ1X3RSU4FkP`. No inquiry emails were sent.
