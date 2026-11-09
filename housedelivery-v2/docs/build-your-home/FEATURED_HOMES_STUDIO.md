# Featured homes and Design Studio

October 26, 2026. Feature branch: `feat/build-your-home-homepage-video`.

## Landing-page changes

The five stories now read: The Cedarview House (01), The Maplewood House (02), The Salt Spring Duplex (03), Laneway Homes (04), Carriage Homes (05). The three named homes form the featured custom-home lineup. Desktop retains the large/small staggered editorial layout; tablet uses two columns and mobile follows the same reading order vertically.

Cedarview, Maplewood and Salt Spring reuse their existing model data, approved hero images and descriptions from `src/data/models.ts`. Images and titles open `/homes/cedarview`, `/homes/maplewood` and `/homes/salt-spring`. No duplicate catalogue or new model content was created. The Maplewood path has no trailing punctuation.

The Carriage Homes feature (05) now shows Heritage Mews in place of the Lantern House. It uses the existing approved `/images/carriage-homes/Heritage-Mews-1.jpg`, the approved exterior alt text and `/homes/laneway-carriage/heritage-mews` for its image, heading and “Explore The Heritage Mews” link. The category title, description, story order and staggered layout are preserved.

The Design Studio is now an explicit customer journey: the hero's exploration CTA leads to the new Studio feature, a prominent CTA introduces it above the housing stories, all three featured custom homes link directly to their respective existing Studios, and the customer-journey copy includes it. The main inquiry CTA remains “Start Your Build”.

The dedicated Studio feature describes Premium and Signature collections and the personalized House Look Book. It uses the existing Cedarview Signature 1 — Raven Basalt kitchen board, the shared DesignStudioImageNote, the same Geist typography, charcoal palette and editorial spacing. Its actions open `/homes/cedarview#home-inclusions`, `/homes/maplewood#home-inclusions` and `/homes/salt-spring#home-inclusions`. Existing home pages, Design Studio components, configuration behavior, Look Book generation, homepage, navigation and inquiry/consent/delivery logic have no changes.

## Verification

- Production build, typecheck and changed-file ESLint passed.
- All 301 unit tests passed. Repository lint retains the existing planner effect error and unused import warning.
- Lineup/Studio browser checks at 1440, 768 and 390px verified the five-story order, desktop stagger, correct model links, all new imagery, hero-to-Studio anchor clearance and all three model-specific Studio routes, rendered design headings and the Salt Spring duplex tier controls. No browser page errors.
- The latest full landing/form regression before the Heritage image/link replacement passed at 1440, 1024, 768, 390 and 320px, including field validation, delivery-error recovery, one successful-submission event, no Preview tracking and no-JavaScript fallback. Delivery was mocked; no emails were sent.
- Heritage replacement browser checks passed at 1440 and 390px: the approved image decodes, alt text and links are correct, the destination opens with the Heritage Mews heading, no overflow or page errors, and the three custom homes remain in order.
- Only feature-branch files were changed; the original checkout and its unrelated work were preserved.

## Visual review

- [Desktop Heritage Mews feature](featured-homes-studio-review/heritage-1440.jpg)
- [Mobile Heritage Mews feature](featured-homes-studio-review/heritage-390.jpg)

- [Desktop featured homes](featured-homes-studio-review/homes-1440.jpg)
- [Mobile featured homes](featured-homes-studio-review/homes-390.jpg)
- [Desktop Studio](featured-homes-studio-review/studio-1440.jpg)
- [Mobile Studio](featured-homes-studio-review/studio-390.jpg)

## Current Vercel Preview

[Open the landing page](https://housedelivery-v2-l3kjgzwr5-edavis-animalmarkets-projects.vercel.app/build-your-home)

The latest interior image/caption replacement, hosted verification and current deployment details are recorded in [Interior Images](INTERIOR_IMAGES.md). The featured-home and Studio journey implementation above is preserved.
