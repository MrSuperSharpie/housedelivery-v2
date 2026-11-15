# Concierge liquid-glass design correction

Protected starting checkpoint: `172ef4188157543e550e5a5c055df4286ae3be3f` on the existing `feature/concierge-premium-visual-refinement-20261115` branch. The isolated worktree was clean before this correction. The unrelated dirty Desktop checkout was not modified. No restart, branch merge, Production deployment, alias or environment change.

## Visible changes and design review

The prior feature Preview was captured at 1440×900 and 390×844 before editing. Three focused rendered passes replaced the heavy cream frame and conventional boxed welcome cards with a thin, diffused glass shell, translucent header, fine reflective edges, restrained champagne details and editorial journey rows. The final pass made the header light rather than a solid band, removed icon boxes, and corrected measured short-screen card cutoffs. The final design was reviewed at normal screenshot scale against the starting Preview, including the launcher, welcome and long conversation.

The stationary launcher is now a compact, light glass control. Its desktop position clears the architectural-film button; tablet/mobile retain a labelled 44px control beside the menu. It remains hidden while the panel is open. The composer is integrated into a translucent footer, while dark opaque text sits on stronger opal reading surfaces so moving footage does not undermine legibility. No new animation library, dependency, image, font or continuous decorative animation. Only the closed launcher or open panel uses bounded backdrop diffusion; solid and reduced-transparency fallbacks are present.

The overlapping black circular control was identified in the owner's logged-in Chrome as the **Vercel Toolbar**. The Concierge reserves a right-edge gutter only when the observed Vercel feedback script is present anywhere in the document. A real owner-session check caught the initial body-only selector missing Vercel’s head-injected script; the selector and test fixture were corrected to cover the actual placement. No toolbar iframe, controls or functionality are suppressed; no Vercel setting was changed. This is scoped to the Concierge, rather than a global website rule. Narrow Preview screens therefore have a smaller chat width; visitor layouts without the review toolbar retain the ordinary mobile inset.

## Changed files and preservation

- `src/components/housing-concierge.module.css`: glass materials, launcher/control placement, editorial rows, message/composer treatment, responsive fitting, accessibility fallbacks and Preview toolbar clearance.
- `src/components/housing-concierge-panel.tsx`: presentation-only view attribute, removal of the forced welcome heading line break, and icon/arrow placement within unchanged journey buttons.
- `scripts/verify-concierge-visual.mjs`: Preview gutter checks, updated conservative contrast samples and normal-motion film-control checks. Optional local toolbar marker is an inert browser-only fixture.
- This review note.

No changes to knowledge, company policy records, prompts, models, retrieval, generation, validation, state, API/transport, authentication, consent or lead/email logic. No homepage, video, architectural image, global stylesheet, price or model-page changes. The four journey labels, descriptions and request prompts are unchanged. Existing answer content, source links and actions are rendered without rewriting. Evaluation/testing tools remain unaffected.

## Verification

All 439 existing unit/integration tests, TypeScript, changed-file ESLint, whitespace checks and the optimized local build pass. The build also validates the audited knowledge and company handbook. Existing image-quality warnings elsewhere in the site were left outside this task.

Browser checks cover 1440×900, 1280×800, 768×1024, 390×844 and 360×780: complete visible journey rows, no page overflow, Preview gutter, keyboard focus, exact approved reply text, Enter/Shift+Enter, drafts and history on close/reopen, reduced motion and simulated mobile keyboard geometry. Flow checks cover unchanged journey requests, loading, long-log scrolling, bounded transport history, reset, connection/error recovery, privacy and consent-based lead UI. Lead submissions are browser-mocked; no customer record or email is created. Additional normal-motion checks exercise the actual film pause/play control where video is eligible and verify launcher clearance and the absence of continuous Concierge animation.

Matching before/after screenshots use the same approved public reply fixture to isolate the visual change. That fixture is test-only and never imported by runtime. One separate live Preview answer verifies real rendering/transport; this is not represented as a new intelligence evaluation.

Artifacts: `/private/tmp/hd-concierge-glass-20261115/` contains baseline, three rendered passes, final Preview screenshots, review gallery and machine-readable UI results. These are real browser captures, not generated mockups.

Limitations: no physical iOS/Android keyboard or device GPU benchmark, nor a full assistive-technology certification. Contrast samples are conservative representative pairs, not a claim that every possible video pixel was audited. Blur is bounded to one visible Concierge surface. Toolbar clearance is designed for the observed right-edge review control; its personal draggable positioning is controlled by Vercel.

Only a feature Preview is submitted for approval. Production remains unchanged.
