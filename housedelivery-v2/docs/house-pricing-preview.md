# House Delivery pricing guide

Approved review date: September 10, 2026.

`src/data/pricing.ts` is the public source for the Essential, Premium and Signature planning ranges, scope definitions, applicability, disclosure and production timing. These general CAD ranges must never be multiplied by an advertised model area to generate a quote.

No individual model has an approved numerical price. In particular, Saturna has no verified supplier-drawing price match. ADUs, multiplexes, remote locations and difficult sites need separate site-specific review. Existing planner model estimates remain under review with no numerical totals.

The guide explains all three finish levels. Configurator definitions and Premium defaults remain unchanged; Essential is not added to their supported options. Budget enquiries carry the actual room selections because a home can mix Premium and Signature.

The homepage, home detail templates and collection cards link to `/pricing`. Budget CTAs reuse the homepage enquiry form and `/api/inquiries`. Custom-home IDs remain compatible; carriage and catalogue enquiry IDs use `carriage:` and `catalog:` prefixes. Finish notes remain visible and editable in the enquiry form.

## Verification

- `npm run lint`
- `npx tsc --noEmit`
- `npm test`
- `npm run build` (needs access to Google Fonts)
- `node --import tsx scripts/verify-pricing-inquiry.mjs` — real handler with mocked email provider; no messages sent.
- `node scripts/verify-pricing.mjs` — built site at `http://localhost:3100`; override with `PRICING_QA_BASE_URL`. Uses installed Chrome or `CHROME_EXECUTABLE_PATH`, intercepts enquiry submission, and saves screenshots to `/tmp/house-pricing-qa` or `PRICING_QA_OUTPUT`.

The browser checks cover six viewport widths, card ordering, keyboard disclosure and expanded state, mobile/desktop navigation, collection links, home page placement, enquiry prefill, unchanged default tier, Signature selection and a mocked successful form submission.

## Release boundary

Branch: `house-pricing-preview`. Deploy to Vercel Preview only. The configured production branch is `main`; the existing promoted production deployment must remain unchanged. Merge or production deployment requires explicit user approval.

Pre-existing uncommitted lookbook PDF and branding work is excluded from this change.
