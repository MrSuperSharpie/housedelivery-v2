# Personalized Look Book delivery — feature review

Baseline: production `3355ecf064a19da3e0a5fe653f0ed9daba0f95f8`. Separate branch: `feature/personalized-lookbook-delivery-20261116`. No production deployment or database migration is part of this change.

## Customer experience

The existing cream collection form retains three fields: required first name/email and optional phone. The project-contact checkbox is optional and initially unchecked. Its exact approved text and privacy reassurance are shared with server-side consent recording. Opening the form focuses its heading and accounts for the model page's sticky navigation. Anonymous online viewing, saved viewing, PDF download and the separate property-review form remain available.

The email uses the real House Delivery wordmark and the selected model's approved Look Book hero image, served from the public production asset host so email clients do not need Preview authentication to display images. A table-based layout, system-font fallbacks, Outlook conditional wrapper, plain-text alternative, hidden preheader and mobile styles support major email clients. Actual Gmail/Outlook/Apple Mail inbox rendering is a final human review, not claimed by browser screenshots.

Personalization resolves confirmed option IDs against the canonical model definition. It ignores submitted/stored descriptive labels and never infers materials from images. Up to three different design chapters are recognized; identical directions are grouped instead of repeating their names. Tier names describe selected directions, not a purchased package. Insufficient verified data receives a general appreciation.

## Fulfilment and project contact are separate

The delivery email contains only the requested Look Book, download link, design appreciation and service/privacy contact. The optional building-project invitation, including “Let's bring it to life,” stays on the website and opens the existing property-review form with the same saved design/contact context. No marketing list is created, and email delivery does not require project-contact permission.

This conservative separation follows CRTC's distinction between requested responses and messages with promotional purposes:
- https://crtc.gc.ca/eng/com500/faq500.htm
- https://crtc.gc.ca/eng/com500/info.htm

A new contact request remains `known_engaged` with `follow_up_requested=true`, source, timestamp and exact consent wording. It is not automatically a qualified project or confirmed buyer. Historical `qualified_inquiry` records remain readable and are not reclassified. Notifications explicitly state “Contact requested; project not yet assessed.”

## Existing infrastructure and storage compatibility

Resend and the existing server-only Supabase REST adapter are reused. Required variables are unchanged: `LOOKBOOK_SUPABASE_URL`, `LOOKBOOK_SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`. Sender/notification/public-origin overrides retain their existing names. No new paid service, dependency, schema migration or browser database access is introduced.

Delivery acknowledgements and consent are stored under `_lookbookFulfillment` inside the existing `contact` JSONB column. The repository projects these into separate server-side fields and strips the envelope from the ordinary contact object. It never passes this metadata, email or phone to the public saved-page component. Existing rows without the envelope remain compatible. Existing planner upsert callers keep their behavior; this delivery flow uses create-only inserts and timestamp-conditional updates to detect races.

A changed rendered design or delivery email gets a new UUID snapshot instead of replacing the earlier emailed design. Saved references remain random UUIDv4 bearer links (approximately 122 random bits), noindex and no-referrer. Anyone holding a link can view its personalized design. PDF responses are now private/no-store; the existing renderer, image sizing, page layout and warm-instance revision cache are retained. The on-site Concierge is excluded only from Look Book printing, and the PDF revision is bumped for that print-only correction. This removes shared CDN caching of personalized documents and can make a cold download slower.

## Reliable delivery

Only a successful provider response with an acceptance ID is reported as accepted for delivery; inbox arrival is not guaranteed. Each send is persisted as pending before the provider request and accepted afterward. Persistent acknowledgements prevent duplicates beyond Resend's 24-hour idempotency window; retries inside 23 hours retain the exact key/body. Concurrent active sends do not start another delivery. Old uncertain attempts or changed pending payloads require team confirmation instead of a blind resend. Provider credentials, bodies and personal details are not logged.

Internal notifications have independent acknowledgement state. A failed notification is recoverable without resending an accepted customer email. A pure Look Book request does not initiate a new sales notification. The same property-review submission does not create repeated notifications.

References: https://resend.com/docs/dashboard/emails/idempotency-keys and https://resend.com/docs/api-reference/emails/send-email

## Verification and limits

- Unit tests cover Aurora Signature, Profile Premium, forged labels, incomplete/limited data, consent, provider acceptance and independent retries.
- The actual built HTTP routes and browser flow run against local Supabase/Resend fixtures. These fixtures reject deployment environments and block unexpected external sends. No customer database or sales inbox is used in these tests.
- Browser cases cover anonymous viewing, all three form fields, unchecked contact permission, invalid email, saved viewing, delayed delivery, retry and property-review context on desktop/mobile.
- An actual 13-page A4 Look Book PDF is generated through the unchanged renderer; PDF headers, download and rendered pages are checked.
- Current active Design Studios define Premium and Signature only. Compact/CMHC registry entries have no active saved configuration; an Essential end-to-end case is therefore unavailable. Unsupported Essential IDs are rejected, rather than inventing a design or changing approved tier/catalogue data.
- One live Preview email is authorized to the user-approved test recipient, with contact permission unchecked; other notifications stay mocked. The delivery result and exact Preview/commit are reported separately after verification.

The Preview's saved links require the existing Vercel Preview access. No bypass credential is placed in an email link. Public production links will use the production origin only after approval and release.
