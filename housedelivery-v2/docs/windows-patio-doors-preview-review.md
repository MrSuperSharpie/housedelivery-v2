# Windows & Patio Doors — corrected preview

This update preserves the cover-quality release already in production (`1e137bef434905f7abfabeefc52bbcedda57b1b6`) and includes the approved saved-Look-Book compatibility and email-copy fixes. It targets the existing `preview/windows-patio-doors-monorepo-2026-10-20` branch in the House Delivery monorepo. It does not promote production.

- All 18 custom homes offer four Premium and four Signature window-and-patio-door options. The 144 final individual boards match the Downloads export checksums and use content-hashed image URLs.
- Aurora, Canmore, Mayne and South Bay retain the exact improved production cover files. The production cover presentation is also included so a preview promotion cannot restore the older crop/layout.
- Previously saved books without a windows/patio chapter retain their original confirmed pages. A new or edited journey requires the current chapter; no window choice is invented for an older book.
- Email My Look Book stores the selections, sends the customer the existing view/download links and sends House Delivery a saved-book copy with all selections and the same links. Receiving a copy does not turn an assistance opt-out into a follow-up request.
- Identical email retries keep stable delivery keys; edited selections can generate an updated copy. Storage remains available if delivery fails.
- Salt Spring retains independent A/B interiors, one common exterior and one common windows/patio package. All rates and existing selections remain unchanged.
- The PDF renderer revision invalidates older cached artwork. The selected board is included in the saved PDF.

Run the full test suite, TypeScript, the production build and changed-file lint before uploading. `node --import tsx scripts/verify-lookbook-email.mjs` captures provider requests for all homes and both tiers without real email/database access. `node scripts/verify-windows-patio-journey.mjs` checks isolated local phone/desktop journeys and PDFs. Preview email uses the project's existing Preview configuration; a real mail test requires a supplied review recipient.
