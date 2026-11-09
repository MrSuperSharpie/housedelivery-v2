# Landing-page CTA clarity — Preview only

Branch `feat/landing-cta-form-actions`, based on the completed opening-only Willow Nook trim (`e020995`).

The redundant hero and header inquiry buttons are removed on both landing pages. The visible form is the primary action. A short editorial invitation balances the left side of each hero; a plain page label balances the header. Custom Homes invites visitors to share location and timing; Laneway/Carriage explains the address check and optional conversation after the snapshot.

Bottom-page inquiry links remain. The mobile return-to-form control appears only while the form is outside the viewport, so it does not repeat an action beside a visible form. The heavy outer focus highlight has been removed; form fields retain accessible focus outlines. Actual next/submit controls use forward arrows.

Inquiry links retain their native anchor/no-JavaScript fallback and focus the next empty required visible field. Existing details and step state are preserved. Model links retain the chosen model. Navigation does not submit a lead or count as a successful inquiry; submission and consent/conversion logic are unchanged.

TypeScript, changed-file ESLint and build passed. Browser checks passed on both pages at 1440, 390 and 320px: absence of redundant hero/header buttons, balanced copy/layout, bottom/model CTA activation, mobile visibility, keyboard operation, retained values and no unintended lead submissions. Tests used mocked delivery boundaries and sent no email.

Hero media (including the original Willow Nook video with its 0.5-second opening trim), property-review engine, pricing, lead notifications and tracking configuration are preserved. Preview only; no production deployment or Google Ads changes.
