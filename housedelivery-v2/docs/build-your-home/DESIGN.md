# Build Your Home — V2 architectural direction

Current supplied bedroom and Signature kitchen imagery, captions and review: [Interior Images](INTERIOR_IMAGES.md).

Latest home imagery and Studio entry points: [Featured Homes & Design Studio](FEATURED_HOMES_STUDIO.md).

Current message refinement: see [Intelligent Value](INTELLIGENT_VALUE.md) for the new three-part hero, model philosophy, responsive headline metrics and current Preview. Earlier hero metrics below document the original V2 composition.

Current media update: the existing homepage video now plays over the retained still-image fallback. See `HOMEPAGE_VIDEO.md`. The V2 typography and compositions documented below are preserved.

Revision date: October 26, 2026. This supersedes the first draft's visual interpretation; the original implementation remains on `feat/build-your-home-acquisition` and its original Preview.

## Source of truth

- Edgar's supplied `HOUSE_DELIVERY_V2_DESIGN_DIRECTION_RESTORED.md`, copied unchanged alongside this file. It explicitly describes itself as a reconstructed working brief, not the original Awwwards review. No unverified Awwwards examples were introduced.
- Approved V2 source: `luxury-hero.tsx`, `model-showcase.tsx`, `headline-reveal.tsx`, `site-header.tsx`, `src/app/page.tsx`, `globals.css`, the approved housing images and existing Design Studio collections. The shared components are used or referenced without modifying their approved behavior.
- Approved production baseline: `edbf6e0`. The original, unrelated dirty checkout was preserved. Vero Permit documentation supplies no House Delivery visual direction.
- Captured the unchanged approved homepage and the revised landing page at matching 1440 × 1000 and 390 × 844 viewports. Inspected the actual screenshot pixels and compared them side by side.

## Specific implementation choices

**Typography.** The desktop hero now has the same measured metrics as the approved homepage at 1440px: Geist, 154.08px, weight 500, line-height 121.723px (`.79`) and letter-spacing -11.556px (`-.075em`). The original first draft used a materially smaller, looser headline. Headlines reuse `HeadlineReveal`; the page does not modify that component. Section headings follow ModelShowcase's `6.2vw`, `.92` leading and `-.065em` tracking. The value narrative and finale use the established larger V2 editorial scale. Mobile sizes adapt to keep complete phrases and CTAs visible.

**Composition.** The hero follows LuxuryHero's 1600px shell, 48px desktop gutter, immersive image, 12-column layout, smaller supporting-copy column and bottom divider. The exact page headline remains 'Build your home with House Delivery'; shorter visual lines establish its hierarchy. All primary CTAs lead to the working project inquiry. No delivery-time promise or artificial urgency is introduced.

**Imagery.** The hero is the approved Langley interior already used by FinancialCorridors (`/Langley-3.avif`). The cinematic value image is the existing Solace Premium Warm Natural collection. Housing stories reuse Willow Nook, Lantern House, Solace and Salt Spring images. These remain explicitly design references, not claimed completed Canadian projects. No new generated imagery, supplier branding or credentials were introduced. The hero serves the original 1536px AVIF (113 KB), preserving portrait-crop detail and avoiding a heavier WebP recompression.

**Editorial rhythm.** Manufacturing experience is a large typographic anchor with two supporting editorial rows. Housing solutions use staggered large/small image stories instead of four uniform cards. Process steps become a simple numbered sequence. A single warm off-white inquiry section follows the existing project-review treatment; it is not a decorative alternating colour block. FAQs and finale use the same restrained grid and hierarchy.

**Voice.** Concise, confident project language replaces generic marketing headings. The narrative remains warm and commercially clear: considered design, manufacturing knowledge, durable components, appropriate systems, procurement and Canadian construction coordination. No fabricated certification, supplier identity, project, guaranteed schedule or demonstration-home offer appears.

**Motion and access.** Existing HeadlineReveal supplies restrained reveals with readable server-rendered content. Route-specific hero image parallax follows LuxuryHero and respects reduced motion; it does not fade the inquiry controls. All core content and direct email fallback remain available without JavaScript. Inputs retain labels, focus states and 16px text, with V2's transparent underlined styling and vertical stacking. The working form component and all API, email, anti-spam and consent logic remain unchanged.

## Review artifacts

Desktop and mobile captures plus a matching-viewport comparison are stored under `v2-review/`. Review the complete Preview as the primary artifact; screenshots document tested states, not a claim of pixel-identical pages with different content.
