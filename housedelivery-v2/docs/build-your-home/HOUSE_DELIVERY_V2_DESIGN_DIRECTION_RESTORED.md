# HOUSE DELIVERY — V2 ARCHITECTURAL DESIGN DIRECTION

**Reconstructed reference · 26 October 2026**

This is a new working brief reconstructed from the approved House Delivery V2 website and prior design discussions. It is **not** a recovered copy of the earlier Awwwards review or its original Markdown file.

## Source of visual truth

Start by inspecting the current House Delivery experience and existing, approved V2 implementation. The repository contains House Delivery code under `housedelivery-v2/`:

- `housedelivery-v2/src/app/globals.css`
- `housedelivery-v2/src/app/page.tsx`
- `housedelivery-v2/src/components/luxury-hero.tsx`
- `housedelivery-v2/src/components/site-header.tsx`
- `housedelivery-v2/src/components/model-showcase.tsx`
- `housedelivery-v2/src/components/headline-reveal.tsx`

**Important:** Do not take House Delivery brand or design instructions from the repository-root `AGENTS.md` or `PRODUCT.md` if they describe the separate **Vero Permit** product. Preserve applicable engineering instructions, but use House Delivery's own visual identity for House Delivery pages.

## Creative direction

House Delivery should feel like a leading architectural practice and a sophisticated housing delivery company, not a commodity kit-home retailer or generic SaaS startup.

- **Visual language:** cinematic architectural imagery; immersive, full-bleed hero; rigorous composition; generous negative space; clean editorial grids; restrained elegance.
- **Colour:** deep charcoal/near-black (`#0B0C10` in the existing implementation), warm off-white (`#F7F7F3`) and carefully selected natural/material tones. Avoid loud accent colours, cheap gradients, and decorative colour blocks.
- **Typography:** bold, oversized editorial headlines, disciplined small labels, comfortable body text, exact hierarchy. Borrow established type/spacing patterns from the approved site rather than inventing a disconnected new system.
- **Imagery:** exceptional real architectural photography or verified project visuals; believable daylight, materials, proportion and detail. Avoid generic AI-looking homes, low-quality renders and unsupported project claims.
- **Motion:** tasteful reveals and measured parallax only where they improve the experience. Prioritize responsiveness, accessibility, speed and clear navigation.
- **UI:** few, purposeful CTAs; crisp geometry; minimal icons; no generic service-card grids, cartoon illustrations, glowing widgets or visual clutter.

## Brand voice

Confident, experienced, warm and commercially clear. Sophisticated without being pretentious. We deliver well-designed housing systems through manufacturing, coordinated procurement, independent quality control, international logistics and capable Canadian construction partners. Speak to developers, communities, institutions and homeowners as serious potential customers. Distinguish established relationships from future commitments. Never publish supplier identities, confidential pricing or unverified project claims.

Suggested creative test: *Would this landing page look at home beside an exceptional architecture studio's website? Would a developer trust this company to coordinate a significant housing project?*

## Landing-page rules

1. Establish a single audience and conversion action for this landing page; align its headline, proof and CTA to that purpose.
2. Lead with one extraordinary architectural visual and a strong, short proposition—not explanatory clutter.
3. Explain the value of coordinated factory-built systems with Canadian site execution in plain English.
4. Use purposeful evidence, real imagery, a concise process and appropriately qualified claims.
5. Keep the page visually consistent with the live House Delivery site, while improving the conversion journey.

## Change safety and review

Before any edit, inspect the active Git branch and uncommitted changes. Preserve all approved work, isolate experiments on a dedicated feature branch, and produce a Vercel Preview. Do not merge, deploy or promote to production without Edgar's express approval. Provide desktop and mobile screenshots for visual review and explain specifically how the result follows these House Delivery design principles.

**Awwwards note:** Awwwards.com was used as architectural-site inspiration in earlier discussions, but the individual websites and an original Awwwards-derived Markdown document have not been verified. Do not invent a list of supposedly approved reference sites.
