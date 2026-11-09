# Intelligent value — landing-page refinement

October 26, 2026. Feature branch: `feat/build-your-home-homepage-video`. Application commit: `1f3c9dfb17b2fe871c7fa9c2986f28af678a69b4`.

## Content and design

The hero now leads with Edgar’s “Exceptional Quality. Intelligent Value. Built to Last.” headline and supplied supporting copy. “Start Your Build” links to the project inquiry; “Explore Our Home Models” scrolls to the existing housing stories. The complete quality, reliability and longevity philosophy appears immediately above those stories, under “Quality, Durability & Lasting Value”.

The development story is labelled “Multi-Family Developments”, retaining the existing description of duplexes and small collections of homes. The approved order remains Custom Homes, Multi-Family Developments, Laneway Homes, Carriage Homes.

The existing video, Geist typography, tight tracking, charcoal/off-white palette, offset editorial layout and HeadlineReveal are preserved. Headline size and leading now accommodate three complete phrases, with each on one line at all five tested widths. Shared homepage/navigation, Design Studio, inquiry delivery, spam protection and consent logic have no changes.

## Verification

- Local production build and typecheck passed.
- Changed-file ESLint passed. Repository lint retains the pre-existing planner effect error and unused import warning.
- All 301 unit tests passed.
- Browser layout checks passed at 1440, 1024, 768, 390 and 320px: the three phrases fit without wrapping or clipping, the models CTA clears the fixed header, and the heading, philosophy and story order are correct.
- Existing full landing/form checks passed at those same widths, including validation, error recovery, a single successful-submission event, no Preview tracking and the no-JavaScript fallback. Email delivery was mocked; no notifications were sent.
- Actual video playback and the new inquiry CTA passed on desktop and mobile; reduced-motion and failed-video image fallbacks passed.

## Screenshots

- [Desktop hero](intelligent-value-review/hero-1440.jpg)
- [Mobile hero](intelligent-value-review/hero-390.jpg)
- [Desktop model introduction](intelligent-value-review/models-1440.jpg)
- [Mobile model introduction](intelligent-value-review/models-390.jpg)

## Preview

[Open the updated landing page](https://housedelivery-v2-lt8nfu817-edavis-animalmarkets-projects.vercel.app/build-your-home)

Deployment `dpl_Hjd6Usxsq6yGaujSscNfoCGXEQ6P` is READY in the existing `housedelivery-v2` project, with Preview target and the exact application commit above. The hosted HTML was verified for the headline, philosophy, both hero anchors, existing video, inquiry form and noindex metadata.

Production remains `dpl_7S93FDGJRqmhxLiafZ1X3RSU4FkP`. No merge, production deployment, tracking activation, service or subscription change occurred. The original checkout and its unrelated work remain unchanged.
