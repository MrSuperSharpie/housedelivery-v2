# CMHC catalogue compliance review — November 9, 2026

Branch: `compliance/cmhc-pre-reviewed-terms-2026-11-09`

Baseline: `33b9cc1` (the committed `house-pricing-preview` checkout).

## Changes

- Replaced customer-facing CMHC “pre-approved” terminology with “pre-reviewed” in the homepage, portfolio navigation, inclusion descriptions, catalogue badges, detail-page titles and Open Graph metadata.
- Added `/cmhc-catalogue-terms`, with the existing header, footer, typography, colours and responsive spacing. It covers catalogue use, site-specific requirements, the limits of pre-review, CMHC’s official terms and House Delivery’s independent status.
- Added the exact requested terms statement, a central terms-page link and a direct official CMHC PDF link beside every model’s download, on both the homepage cards and detail pages. The homepage’s consolidated drawing-download area also has the notice.
- Added the central terms-page link to the shared footer.
- Replaced the claim that the downloadable CMHC documents are certified architectural/structural drawings. Clarified that the files are reference designs requiring professional review, adaptation and applicable municipal approvals, rather than automatically approved construction documents or House Delivery manufacturing drawings.
- Corrected the Mini’s “certified design” and Duplex’s “approved design” editorial claims.
- Added CMHC source attribution using the seven names verified on the retained PDF cover sheets, including attribution for the next-design rendering. November 9, 2026 is explicitly a reference/verification date, not an asserted publication or revision date.
- Corrected the catalogue-detail back link to target the existing homepage catalogue section.

## Preservation

The original working directory remains on `house-pricing-preview`, with its uncommitted changes and deleted files intact. The compliance work uses an isolated Git worktree at `/private/tmp/cmhc-compliance-2026-11-09`.

The preview uses committed baseline files. Uncommitted hero changes and the local deletions of the seven PDFs were not included. The original Git status and the diffs of the modified hero, PDF-artifact helper and AGENTS.md were compared with the initial snapshots and remained identical.

No PDF contents, download paths, prices, package-pricing data, model specifications, imagery, header navigation, dependencies, Next.js configuration or Vercel project settings were changed. Existing internal product-family keys, component identifiers and `#pre-approved-homes` anchors are retained for compatibility with saved configurations and inbound links; customer-facing text and metadata use the revised terminology. No forms, registration steps or download gates were added.

## Verification

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm test`: all 118 tests passed.
- `npm run build`: passed on Next.js 16.2.11; 46 static pages generated, including the new terms route.
- `git diff --check`: passed.
- `node scripts/verify-cmhc-compliance.mjs`: passed against the production build at `http://127.0.0.1:3109`.
- All seven catalogue detail pages checked at desktop 1440×1000 and mobile 390×844, with reduced motion enabled. Verified terminology, SEO/Open Graph content, rendered hero images, terms statements, central links, official PDF links and absence of horizontal overflow or JavaScript page errors.
- All seven original PDF responses returned HTTP 200 and `application/pdf`; full response SHA-256 checksums matched the retained local files. All seven actual Chrome downloads completed and matched those checksums, including the Sixplex filename containing a space.
- All seven homepage cards and the consolidated drawing-download area checked. Catalogue images loaded on both viewport sizes.
- Terms links were followed from each detail page and the homepage to the single central terms page.
- The new terms page, official PDF action, all six required headings, canonical URL and footer link were checked. The terms page and action also worked at 320×740 with JavaScript disabled.
- `/inclusions` and `/pricing` checked on desktop and mobile for terminology, layout and footer navigation.
- Desktop and mobile screenshots were visually reviewed. Temporary screenshots and the PDF checksum report are in `/private/tmp/house-cmhc-compliance-qa`.

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

## Preview target

Verified existing Vercel project: `housedelivery-v2` (`prj_sAbWmbKd31KAkSvkugVp2udEPK49`), team `team_a4BOcAiKXJr7KqOHfqPLvAIP`, repository root directory `housedelivery-v2`, Node.js 24.x.

Deployment is restricted to Preview. Production publishing and merging into `main` remain outside this change and require the owner’s later authorization.
