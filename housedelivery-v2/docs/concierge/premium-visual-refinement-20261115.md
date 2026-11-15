# Concierge premium visual refinement

## Protected baseline and scope

Project: `housedelivery-v2`, team `edavis-animalmarkets-projects`.
Live production deployment verified through both domain aliases: `dpl_H2aWTG3uqBRRZiCHCuF29fr6Sr3d`.
Source baseline: `999408a0f0e2bcdbc20ce1c7f61044a5a4943f10`, repository `MrSuperSharpie/housedelivery-v2`, branch `feature/concierge-production-enable-20261115`.
That CLI deployment has no Git metadata field. The recorded clean-checkout deployment provenance plus source-file fingerprints verify the baseline: all 634 available tracked source fingerprints matched, including 78 Concierge files and the Production-enablement files. The source-tree response is truncated, so it is not claimed as a complete repository hash comparison.

A fresh branch, `feature/concierge-premium-visual-refinement-20261115`, was created from that exact commit before source edits. The isolated worktree was clean. The original Desktop checkout contains unrelated changes/deletions and was not touched. Production/main/backups and Production environment variables are unchanged. The live deployment remains identifiable and available as rollback.

## Visual assessment and corrections

Current-run Production screenshots and one public live answer established the visual baseline. The original launcher overlapped the homepage CTA, remained redundant beneath the open panel, and looked mechanical. Welcome cards were compact, long answers auto-scrolled to their tails, and the composer/footer used strong rectangular frames with little hierarchy.

The final Concierge-only treatment uses the existing Geist typography, warm ivory/stone, ink and muted champagne. A restrained translucent outer frame and satin header sit around an opaque reading surface. Only the frame and closed launcher use bounded backdrop blur; solid fallbacks, reduced transparency and reduced motion are supported. No new dependencies or continuously animated effects.

- Slim “Housing Concierge” launcher. It is stationary at the upper right below desktop navigation; on tablet/mobile it becomes a labelled 44px icon beside the existing menu, clearing the page CTAs. The launcher is hidden while the panel is open.
- 448px desktop panel, lighter header/secondary controls and balanced reading/composer proportions. The mobile panel occupies the available area below site navigation with safe-area and VisualViewport keyboard sizing.
- Four equally prominent pathways, with unchanged labels/descriptions/prompts. Matching thin icons, aligned labels, warmer cards and quieter hover/focus states.
- Clear visitor/Concierge attribution, improved paragraph spacing and reading width. Every generated answer character, source link, model card, follow-up and action is preserved. The newest exchange starts in view instead of showing only the end of a long reply.
- Integrated multiline composer with bounded automatic growth; Enter, Shift+Enter, loading/disabled/error behaviour and drafts preserved. Accessible header focus on open and existing return-to-launcher focus on close. Nonmodal behaviour and no dark overlay retained.
- Shared Concierge CSS refines the existing inquiry form's surfaces only; no form logic or transport changes. Privacy remains accessible alongside contact/reset controls, with a shorter UI-only confidentiality notice.

Independent rendered review corrected actual issues: lower journey cards initially ran behind the footer, description wrapping misaligned card labels, the focus ring was doubled, and the first tablet launcher position overlapped the menu target by 8px. Those defects were corrected and measured in the final build. No arbitrary design iterations or unrelated fixes.

## Preservation

Runtime source changes are limited to `housing-concierge.tsx`, `housing-concierge-panel.tsx` and `housing-concierge.module.css`. No changes to prompts, model/provider configuration, knowledge, retrieval, generation, session state/transport, API contracts, security, prices, email/consent logic, global styles, homepage, video, photography, model pages, CMHC or landing pages.

## Validation

- All 439 existing unit/integration tests passed.
- TypeScript, changed-file lint, whitespace and optimized local production build passed.
- `scripts/verify-concierge-visual.mjs` covers 1440×900, 1280×800, 768×1024, 390×844 and 360×780.
- All five viewports passed: launcher/control clearance, dialog bounds, complete journey cards, exact unchanged answer text, Enter/Shift+Enter, close/reopen draft/history, focus return and reduced motion.
- Exact original prompts for all four journeys verified; Ask Anything does not auto-submit.
- Loading and error/recovery, token refresh/reset, bounded four-turn transport history, long-log keyboard scrolling, privacy/contact routes and consent-based lead UI verified. Lead delivery is browser-mocked; no real inquiry/email.
- A captured approved public reply is a rendering fixture under `scripts/fixtures/` only. It is never imported by runtime and does not replace any AI answer. All local test calls are intercepted in the browser, not by new runtime test modes.
- Sampled normal text pairs exceed WCAG AA 4.5:1, including secondary text, brand labels, visitor text, notice, links and launcher. Touch controls are at least 44px; keyboard log scrolling is available.

Screenshots/review artifacts: `/private/tmp/hd-concierge-premium-20261115/` (before, final QA screenshots, results and comparison report). Current-run screenshots are actual browser renders, not generated mockups. A connection failure is browser-simulated and labelled accordingly.

Limits: no claim of a full accessibility certification. Physical iOS/Android keyboard, device compositor performance and assistive-technology testing were not performed; VisualViewport geometry was simulated. Existing whole-homepage Framer reduced-motion hydration warnings appeared in development outside the Concierge; shared components were not changed. The Preview receives only branch-scoped enable/model/signing configuration; Production settings and evaluation/test access remain unchanged.

Only the final feature Preview is submitted for review. No Production deployment, merge, promotion or alias change is authorized.
