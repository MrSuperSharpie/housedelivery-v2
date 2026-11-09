# CMHC catalogue compliance review — November 9, 2026

Branch: `compliance/cmhc-pre-reviewed-terms-2026-11-09`

Baseline: `33b9cc1` (the committed `house-pricing-preview` checkout).

## Changes

- Replaced customer-facing CMHC “pre-approved” terminology with “pre-reviewed” in the homepage, portfolio navigation, inclusion descriptions, catalogue badges, detail-page titles and Open Graph metadata.
- Added `/cmhc-catalogue-terms`, with the existing header, footer, typography, colours and responsive spacing. It covers catalogue use, site-specific requirements, the limits of pre-review, CMHC’s official terms and House Delivery’s independent status.
- Added the requested terms statement and official PDF access on detail pages and in the homepage’s consolidated drawing-download area. Following the cleanup request, each homepage card has only View Details, Download PDF, CMHC Terms & Conditions and View Pricing Guide; the card’s terms link leads to the central explanation and official document.
- Added the central terms-page link to the shared footer.
- Replaced the claim that the downloadable CMHC documents are certified architectural/structural drawings. Clarified that the files are reference designs requiring professional review, adaptation and applicable municipal approvals, rather than automatically approved construction documents or House Delivery manufacturing drawings.
- Corrected the Mini’s “certified design” and Duplex’s “approved design” editorial claims.
- Added CMHC source attribution using the seven names verified on the retained PDF cover sheets, including attribution for the next-design rendering. The source date is February 14, 2025, verified on architectural cover sheet A001 (PDF page 2) in every retained package. All seven title blocks were rendered and visually checked, including the Fourplex date cells that are absent from extracted text. One source notice beneath the homepage grid names all seven designs; detail pages retain attribution near the drawings and next-design rendering.
- Corrected the shared public home-package rates to Premium CAD $250/sq. ft. and Signature CAD $300/sq. ft. Pricing cards, introductions, metadata, scope notes, disclosures and saved budget summaries derive their rates from `src/data/pricing.ts`.
- Corrected the catalogue-detail back link to target the existing homepage catalogue section.

## Preservation

The original working directory remains on `house-pricing-preview`, with its uncommitted changes and deleted files intact. The compliance work uses an isolated Git worktree at `/private/tmp/cmhc-compliance-2026-11-09`.

The preview uses committed baseline files. Uncommitted hero changes and the local deletions of the seven PDFs were not included. The original Git status and the diffs of the modified hero, PDF-artifact helper and AGENTS.md were compared with the initial snapshots and remained identical.

No PDF contents, download paths, model-specific package-pricing data, model specifications, imagery, header navigation, dependencies, Next.js configuration or Vercel project settings were changed. Public Premium and Signature reference rates were corrected as requested; all existing exclusions, quote requirements and the distinction between package pricing and completed construction costs remain. Existing internal product-family keys, component identifiers and `#pre-approved-homes` anchors are retained for compatibility with saved configurations and inbound links; customer-facing text and metadata use the revised terminology. No forms, registration steps or download gates were added.

## Verification

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm test`: all 118 tests passed.
- `npm run build`: passed on Next.js 16.2.11; 46 static pages generated, including the new terms route.
- `git diff --check`: passed.
- `node scripts/verify-cmhc-compliance.mjs`: passed against the production build at `http://127.0.0.1:3109`.
- `PRICING_QA_BASE_URL=http://127.0.0.1:3109 node scripts/verify-home-budget-planner.mjs`: passed across 31 models, three home families and widths 320, 390, 768 and 1440. Checked gallery/focus behavior, independent finish selections, quantities, saved summary rates, preserved exclusions, quote-only totals, mocked enquiry failure/retry and handoff. No real enquiry was sent.
- All seven catalogue detail pages checked at desktop 1440×1000 and mobile 390×844, with reduced motion enabled. Verified terminology, SEO/Open Graph content, rendered hero images, terms statements, central links, official PDF links and absence of horizontal overflow or JavaScript page errors.
- All seven original PDF responses returned HTTP 200 and `application/pdf`; full response SHA-256 checksums matched the retained local files. All seven actual Chrome downloads completed and matched those checksums, including the Sixplex filename containing a space.
- All seven homepage cards checked for the four requested actions and absence of repeated legal paragraphs or a second official-PDF link. The consolidated source section was checked below the grid, with all seven names, the verified February 14, 2025 date and the CMHC source notice. Catalogue images loaded on desktop and mobile.
- Terms links were followed from each detail page and the homepage to the single central terms page.
- The new terms page, official PDF action, all six required headings, canonical URL and footer link were checked. The terms page and action also worked at 320×740 with JavaScript disabled.
- `/inclusions` and `/pricing` checked on desktop and mobile for terminology, layout and footer navigation.
- `/pricing` cards and SEO description show Premium $250/sq. ft. and Signature $300/sq. ft. The homepage introduction and downloaded budget summary use the shared rates. No outdated public package rates remain in application source; unrelated model areas and model-specific quote records are unchanged.
- Desktop and mobile screenshots were visually reviewed. Current screenshots and the PDF checksum report are in `/private/tmp/house-cmhc-cleanup-qa`; budget-flow screenshots are in `/private/tmp/house-budget-cleanup-qa`.

| Requested design | Existing route | Desktop/mobile | PDF download / terms links |
| --- | --- | --- | --- |
| ADU-01 | `/catalog/the-micro` | Passed | Passed |
| ADU-02 | `/catalog/the-mini` | Passed | Passed |
| Duplex | `/catalog/bc-duplex` | Passed | Passed |
| Rowhouse | `/catalog/bc-rowhouse` | Passed | Passed |
| Fourplex-01 | `/catalog/bc-fourplex-1` | Passed | Passed |
| Fourplex-02 | `/catalog/bc-fourplex-2` | Passed | Passed |
| Sixplex | `/catalog/sixplex-courtyard` | Passed | Passed |

The official CMHC terms PDF supplied in the request was retrieved successfully (HTTP 200, nine pages). Source names were checked against the retained drawings without altering them. The live CMHC Accessory Dwelling Unit 01 page also confirmed that design’s name and source.

## File inventory

Created:

- `src/app/cmhc-catalogue-terms/page.tsx`
- `src/components/cmhc-catalogue-notice.tsx`
- `src/data/cmhc-catalogue.ts`
- `scripts/verify-cmhc-compliance.mjs`
- `docs/cmhc-compliance-2026-11-09.md`

Modified:

- `src/app/catalog/[slug]/page.tsx`
- `src/app/page.tsx`
- `src/components/cmhc-feature.tsx`
- `src/components/inclusion-grid.tsx`
- `src/components/inclusions-library.tsx`
- `src/components/portfolio-category-nav.tsx`
- `src/components/pre-approved-showcase.tsx`
- `src/components/site-footer.tsx`
- `src/data/catalog.ts`
- `src/components/pricing-introduction.tsx`
- `src/data/pricing.ts`
- `src/lib/home-budget-planner.ts`
- `src/lib/home-budget-planner.test.ts`
- `src/lib/budget-inquiry.test.tsx`
- `scripts/verify-home-budget-planner.mjs`

## Preview target

Verified existing Vercel project: `housedelivery-v2` (`prj_sAbWmbKd31KAkSvkugVp2udEPK49`), team `team_a4BOcAiKXJr7KqOHfqPLvAIP`, repository root directory `housedelivery-v2`, Node.js 24.x.

Deployment is restricted to Preview. Production publishing and merging into `main` remain outside this change and require the owner’s later authorization.
