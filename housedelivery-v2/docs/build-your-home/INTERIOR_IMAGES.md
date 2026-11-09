# Interior image replacements

October 26, 2026. Feature branch: `feat/build-your-home-homepage-video`. Application commit: `e1a33616d6fb7a8b94801bb5168be41e78383cda`.

## Sources and captions

The attached `Master Bedroom.png` replaces the Solace Premium Warm Natural image in the full-width value figure. It was copied without alteration to `/images/build-your-home/master-bedroom.png`. The caption reads “Material, light & quiet retreat” and “Master bedroom / Interior design reference”. No model, collection or completed-project attribution was invented. Alt text describes the bedroom, timber panelling, upholstered bed and window-side seating.

Bedroom SHA-256: `8aae7fbe6e0119a11623e8f55010c5333cb80acfc2407e1f1b5dfd01c9618c4c`.

The attached `Cedarview_01_Kitchen_Signature-1_Raven-Basalt.png` is byte-identical to the existing approved visual-guide asset, so the landing page now references that existing file. No shared asset was overwritten. Its caption reads “Cedarview / Signature 1 — Raven Basalt / Design Studio reference”. Alt text identifies the Signature Raven Basalt kitchen board and coordinated materials.

Kitchen SHA-256: `57bc710704000c43b1fd90e61e13b83357567eaae225f567d608c1f7f113b100`. Both originals are 1448 × 1086 PNG files. The existing Next Image pipeline optimizes their delivered renditions.

The bedroom retains the established full-width architectural crop and caption treatment. The complete kitchen board retains its 4:3 aspect ratio, with title and material samples visible. Typography, layout, hero video, home lineup, Studio links, navigation, inquiry delivery and consent code are unchanged.

## Verification

- Build, typecheck, changed-file ESLint and all 301 unit tests passed.
- Repository lint retains the pre-existing planner effect error and unused import warning.
- Browser checks passed at 1440, 768, 390 and 320px: both images decode, captions and alt context match their subjects, kitchen board proportions are preserved, captions fit and no overflow or page errors occurred.
- This image-only change does not alter form handling; no new inquiry emails were sent.

## Screenshots

- [Desktop bedroom](interior-image-review/bedroom-1440.jpg)
- [Mobile bedroom](interior-image-review/bedroom-390.jpg)
- [Desktop Signature kitchen feature](interior-image-review/studio-1440.jpg)
- [Mobile Signature kitchen feature](interior-image-review/studio-390.jpg)

## Verified Vercel Preview

[Open the landing page](https://housedelivery-v2-l3kjgzwr5-edavis-animalmarkets-projects.vercel.app/build-your-home)

READY deployment `dpl_8xgSmmAuZJMfTfQcbxAXy7GDYwzJ` in the existing `housedelivery-v2` project, Preview target, application commit above. Both hosted PNG files were fetched and SHA-256 verified against the attachments. Hosted HTML contains the new image references, updated captions, retained video/form and noindex metadata; the old Solace and Arbutus Stone captions are absent.

Production remains `dpl_7S93FDGJRqmhxLiafZ1X3RSU4FkP`. No merge, production deployment, tracking activation or paid-service change occurred.
