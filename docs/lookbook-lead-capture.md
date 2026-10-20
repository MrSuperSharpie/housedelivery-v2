# Look Book lead capture and saved configurations

## Customer flow

- A completed configurator immediately becomes a printable/downloadable Look Book. No personal information is required.
- **Email My Look Book** stores the structured configuration and sends a secure return link. Without the optional assistance checkbox, the record is `known_engaged` and does not trigger an internal sales notification.
- The assistance checkbox or **Check My Property** changes the same record to `qualified_inquiry`, sets `follow_up_requested = true`, and triggers the internal notification.
- Property Check reuses contact information already collected for that configuration. It never asks for an exact street address as a prerequisite.
- Updating and emailing a configuration again upserts the same UUID record during the current configurator session. Saved views are read-only.

## Storage

`src/lib/lookbook/repository.ts` defines the provider-neutral repository boundary. The production adapter uses Supabase's server-side REST API without exposing credentials or adding a browser SDK.

Apply:

```text
supabase/migrations/20260829000000_create_lookbook_configurations.sql
```

The table has Row Level Security enabled and intentionally defines no browser policies. All reads and writes go through server code with the service-role key. The UUID in `/lookbook/[configurationId]` is the bearer token and contains approximately 122 random bits; sequential IDs are never exposed.

Required Vercel environment variables:

```text
LOOKBOOK_SUPABASE_URL
LOOKBOOK_SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
```

For Preview deployments, confirm the variables apply to the branch being
reviewed. A variable scoped to a different Git branch is not injected into the
deployment, even when the same variable name appears in the Vercel project.
After changing a variable's branch scope, redeploy the target branch before
testing persistence.

Optional configuration:

```text
LOOKBOOK_FROM_EMAIL
LOOKBOOK_NOTIFICATION_EMAIL
LOOKBOOK_PUBLIC_URL
```

`LOOKBOOK_NOTIFICATION_EMAIL` defaults to `hello@housedelivery.ca`. `LOOKBOOK_FROM_EMAIL` falls back to the existing `INQUIRY_FROM_EMAIL` pattern. `LOOKBOOK_PUBLIC_URL` should be `https://housedelivery.ca` in production and can be omitted in local/preview environments, where the request origin is used.

## Email behavior

The existing Resend REST pattern is reused. Customer email contains View, Download/Print PDF, and Check My Property links; the PDF is not attached. Resend idempotency keys prevent repeat sends from creating uncontrolled duplicate delivery.

Storage completes before delivery is attempted. If customer delivery fails, the saved URL remains available and the UI reports the delivery delay without losing selections. Internal-notification failure is logged without changing the customer's success response.

## Attribution and analytics

`src/lib/lookbook/attribution.ts` stores first-touch referrer and standard UTM values in versioned first-party local storage. Existing attribution is never overwritten during navigation. No contact or exact address enters attribution.

The provider-neutral analytics bridge emits `house-delivery:analytics` browser events and pushes to an existing `window.dataLayer` when present. It does not install an analytics SDK. Events:

- `configurator_viewed`
- `configurator_started`
- `configurator_category_completed`
- `configurator_completed`
- `lookbook_downloaded`
- `lookbook_email_started`
- `lookbook_email_submitted`
- `follow_up_requested`
- `property_check_started`
- `property_check_submitted`
- `lookbook_reopened`

Only home, chapter, completion, tier, and campaign properties are included.

## Security and privacy

- Canonical server-side home/option validation rejects invented home, chapter, zone, or option IDs.
- Request size limits, a honeypot, a best-effort per-instance rate limit, normalized length limits, and safe generic logs protect the endpoint.
- Names, emails, phones, and addresses are not logged or sent to general analytics.
- Known engagement is distinct from an explicit follow-up request; transactional delivery never subscribes a visitor to marketing.
- Random/malformed saved IDs return the same safe not-found response as unknown records.

## Production activation

1. Create or select a Supabase project.
2. Apply the included SQL migration.
3. Add the required variables to Vercel for Production and Preview, and verify
   any Preview branch scope matches the branch being deployed.
4. Confirm `housedelivery.ca` is verified in Resend for the configured sender.
5. Redeploy and complete one end-to-end known-engaged save and one Property Check using non-production test contact details.
