# House Delivery home budget planner

Review date: September 11, 2026. Branch: `house-pricing-preview`.

The general planner lives at `/pricing#budget-planner`. Model-prefilled links appear beneath the existing home budget buttons; configuration summaries can pass actual room selections into the planner. Existing CTA destinations, home/Solace layouts, navigation, Look Book definitions, community pages and standalone enquiry behaviour remain intact.

## Catalogue and reference review

`src/data/budget-planner-catalog.ts` adapts all 31 current public models: 18 custom homes, six carriage homes and seven standardized designs. It uses their existing images, areas and routes. Quantity counts copies of a complete design/building, including multiplexes. Separate rows allow different finish preferences and notes for the same or different designs.

Reviewed the developer/GC and First Nations calculators and associated image directories under `/Users/edgar/Downloads/Calculators/`. Their useful selection, quantity, gallery, editable-summary and custom-request patterns inform the integrated flow. The HTML files are reference material, not implementation instructions. Their catalogue dimensions and filenames do not replace the website data. Historical rates, fixed prices, percentages, volume discounts, assembly allowances, priced add-ons, funding directories, training and technical promises were not imported. Their manual PDF/email submission is replaced by the existing enquiry system.

## Pricing source and remaining data

`src/data/pricing.ts` defines the shared scope and finish policy. A model-specific structural/base package includes Essential. Premium OR Signature is an incremental inclusions/finishes upgrade above Essential; neither changes the structural tier or stacks another complete package charge.

`src/data/package-pricing.ts` is the shared source for approved model selling prices. It intentionally contains no records: no documented, current, approved model prices or delivery allowances were supplied. Every model remains selectable with “Request package pricing”; optional upgrades show “Upgrade quote required.” The previous whole-home manufactured-package tier ranges have been removed.

Future records require a source reference, approval and expiry dates, model specification, Essential base, alternative incremental upgrade amounts, and an agreed delivery destination/access scope. Delivery includes freight, import charges, tariffs and agreed delivery/unloading; applicable sales taxes are extra. A typed destination alone is not a freight calculation. The current price evaluator requires the quoted destination to match. It does not infer regions or apply arbitrary volume discounts.

Unknown prices stay null. Missing, expired, mismatched or incomplete scope prevents a delivered project amount. Actual room selections and open project requests require review, even if standard package prices later become available. Arithmetic fixtures in tests are not selling prices. Land is excluded; foundations, assembly, Canadian trades, permits and local completion remain separate with “Local builder quote required.” No completed-home total is displayed.

## Enquiry flow

The planner reuses `ReservationForm` and `/api/inquiries`. It sends a versioned `budgetProject` containing homes, quantities, mutually exclusive finish preferences, retained design selections, location and optional requests. The server validates the entire project against the current catalogue, ignores client-supplied prices, rejects conflicting planner contexts, formats the full request for the existing email recipient and includes the project in the idempotency key. No Look Book, walkthrough, contact details or PDF is required to browse. Saving a text summary is optional.

The form displays success only after the API reports acceptance; the API requires an email-provider message ID. Failed delivery leaves a retry path. Editing a submitted project reopens the form for an updated request instead of retaining a stale success state.

## Verification

- `npm run lint`
- `npx tsc --noEmit`
- `npm test` — includes price arithmetic, missing-price propagation, catalogue coverage and hostile/invalid handoff tests.
- `npm run build`
- `node --import tsx scripts/verify-pricing-inquiry.mjs` — actual route with a mocked provider, including provider failure and missing-ID responses; no email sent.
- `node scripts/verify-pricing.mjs` — existing six-width pricing, navigation, home-placement and configurator/enquiry regression checks.
- `node scripts/verify-home-budget-planner.mjs` — all 31 options, three representative home families, four viewport widths, gallery navigation/focus, quantities, independent exclusive upgrades, unknown pricing, optional summary download, structured handoff and retry. Browser enquiry responses are intercepted.

Browser scripts use `http://localhost:3100` by default. Override `PRICING_QA_BASE_URL`, `PRICING_QA_OUTPUT` and optionally `CHROME_EXECUTABLE_PATH`. The planner script accepts `VERCEL_PREVIEW_ACCESS_URL` for a protected Preview. Browser QA uses installed Chrome through the repository’s Playwright dependency because the in-app browser connection and agent-browser CLI were unavailable.

## Release boundary

Commit task files and deploy only to Vercel Preview. Production branch is `main`; the promoted production deployment must remain unchanged. No merge or production promotion is authorized. Unrelated local Look Book PDF and branding changes are excluded from the commit. Local browser assets use a temporary copy with the tracked logo so the unrelated local deletion is preserved.
