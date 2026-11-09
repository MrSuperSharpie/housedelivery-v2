# Windows & Patio Doors revival review

## Protected baseline

- Live website: Vercel deployment `dpl_3GxPoGfwSy5YrdP9nhGfBJ7xBJU6`; source matches Git `1e137be` (`origin/preview/corrected-lookbooks-2026-10-20`) except the later native-video component/test and video assets.
- Isolated branch: `feat/windows-patio-current-revival`, worktree `/tmp/house-windows-current-revival`. Preservation commit `dbdfde6` captures the live native-video implementation, no Pause/Play button, and current local verification/brand assets.
- Original working checkout remains on `house-pricing-preview` at `33b9cc1`, with its uncommitted work intact. Its complete file hash inventory, binary tracked patch, original status, and uncommitted-file archive are under `/tmp/house-windows-revival-safety`.
- The older local PDF changes are already superseded by the live site's stronger print-image pipeline and renderer version 6. These live safeguards are retained; the chapter advances the cache revision to 7.

## Selective implementation

Source chapter: `feat/windows-patio-lookbooks-upgrade`, commit `9b3a15ebd177fbd7b199a98b779e6ce11bd6d5ba`.
Only chapter registration, shared-choice presentation, preview/selection details, the specification guide, saved-book compatibility and associated regression tests are brought forward. No branch merge, website replacement, API notification-policy change, pricing change, copy refresh or video rollback is included.
New journeys require the eighth chapter; existing saved books without it retain their original confirmed pages. Existing option IDs and Premium/Signature classifications remain stable.

## Five-home board replacement

All 40 PNGs for Maplewood, Summit, South Bay, Solace and Dalton map by home, tier and option number to the existing `windows-patio-doors-{premium|signature}-{1|2|3|4}` IDs. The source finish names are provenance, not new option IDs. See `windows-patio-revival-mapping.csv` for every exact mapping and checksum.

Each WebP retains the full 2880 × 2160 source canvas with lossless encoding; decoded pixels are compared to the delivery PNG. The runtime manifest records archive/source hashes, native dimensions, byte counts, decoded-pixel hashes and content-hashed image URLs. Only those 40 runtime entries change. All 96 entries for the other twelve homes, plus Salt Spring's eight shared entries, remain byte-for-byte identical to the requested old chapter manifest. Unreferenced rejected boards for the five replacements are not copied into this revival.

## Salt Spring — decision required; no reassignment made

The website offers **one building-wide selection** from these eight stable IDs:

| Existing option ID | Existing architectural direction |
| --- | --- |
| windows-patio-doors-premium-1 | Casement + Classic Slider |
| windows-patio-doors-premium-2 | Tilt-Turn + View Slider |
| windows-patio-doors-premium-3 | Picture Window + Folding Patio |
| windows-patio-doors-premium-4 | Awning + Lift-and-Slide |
| windows-patio-doors-signature-1 | Panoramic Glass + Lift-Slide |
| windows-patio-doors-signature-2 | Architectural Glass + Grand Lift-and-Slide |
| windows-patio-doors-signature-3 | Gallery Glazing + Folding Glass Wall |
| windows-patio-doors-signature-4 | Framed Views + Pocketing Glass Wall |

The delivery instead contains the following separately labelled A/B pairs:

| Delivered tier/number | Finish | Residence-specific images |
| --- | --- | --- |
| Premium 1 | Coastal Oak | Residence-A_Premium-1_Coastal-Oak; Residence-B_Premium-1_Coastal-Oak |
| Premium 2 | Sandstone Ash | Residence-A_Premium-2_Sandstone-Ash; Residence-B_Premium-2_Sandstone-Ash |
| Signature 1 | Onyx Walnut | Residence-A_Signature-1_Onyx-Walnut; Residence-B_Signature-1_Onyx-Walnut |
| Signature 2 | Bronze Ember | Residence-A_Signature-2_Bronze-Ember; Residence-B_Signature-2_Bronze-Ember |

All eight filenames have prefix `Salt-Spring-Duplex_08_Windows-Patio-Doors_` and suffix `.png`. Their baked-in labels and views explicitly identify Residence A or B. There are no delivered shared Premium 3/4 or Signature 3/4 boards.

**Required decision:** retain the building-wide eight-choice model and provide/approve eight shared boards mapped explicitly to the eight existing direction IDs, or authorize a separately scoped redesign of Salt Spring into residence-specific choices, including new option IDs, technical envelope coordination and saved-record/PDF migration rules. Mapping A to slots 1/2 and B to slots 3/4, or choosing one residence's board to represent both, is not an equivalent substitution.

Until that decision, all existing eight shared boards, option IDs and building-wide selection semantics are retained. No Residence A/B PNG is installed in the runtime manifest.

## Verification

- Production build and TypeScript checks passed.
- All 294 unit tests passed, including decoded-pixel/manifest checks, all 18 chapter registrations and 102 legacy saved-book definitions.
- 24 browser journeys passed: both tiers at 390px and 1440px for all five replacement homes and Salt Spring. Every chapter preview decoded, selection/save/reopen succeeded, and no browser runtime errors or horizontal overflow were observed.
- All 102 legacy saved-book fixtures reopened with their original confirmed choices. A targeted compatibility fix also restores original seven-package wording on legacy books.
- 13 actual PDF downloads passed: both tiers for the six review homes plus an original Profile saved book. Counts are 13 pages for standard new books, 19 for Salt Spring, and 12 for the legacy book. Chapter pages were rendered for visual inspection.
- Later native-video checks passed at mobile/desktop widths, including muted inline playback, reduced-motion still image, missing-video fallback and absence of the removed Pause/Play control.
- Touched source files are lint-clean. Full-project lint retains an existing error in unchanged `src/components/planner-local-lookbook-fallback.tsx:88` (`react-hooks/set-state-in-effect`) and an existing unused-import warning in the First Nations planner. These unrelated files are preserved.
- Original checkout preservation check passed for all 1,338 inventoried file hashes and its exact uncommitted Git status.
- Local save/PDF tests used a loopback-only storage contract fixture. No production database writes or customer emails were sent.
- Vercel Preview: https://housedelivery-v2-kprkvk446-edavis-animalmarkets-projects.vercel.app
- Preview deployment `dpl_6U1m8DUgvNJoLTcjoLwYxk8ywU5H` is READY, built from chapter commit `a122956`; it is not a production target.
- Deployed homepage, Solace and Salt Spring returned HTTP 200. The hydrated data includes the chapter; Salt Spring still declares a shared building choice. The deployed manifest has 144 entries, exactly 40 replacement entries and eight retained Salt Spring entries. Homepage video is native MP4 with no Pause/Play control; the cancelled philosophy section remains absent.
- Production `www.housedelivery.ca` still points to `dpl_3GxPoGfwSy5YrdP9nhGfBJ7xBJU6`. No production deployment/promotion or Git push was performed.
- Vercel may require sign-in for this protected Preview.
