# Concierge state, request pricing and explicit policy records

Feature branch: `feature/concierge-conversation-quality-20261114`.
The accepted schema correction remains in history. No homepage, image, video,
pricing-data, configurator, inquiry, consent or production configuration changes.

## Diagnosis from the saved 11-turn acceptance traces

- The secondary inherited-unit parser backtracked at the comma in `3,600` and
  replaced a complete unit-bearing ceiling with `3`. Its new number boundary
  rejects prefixes, skips unit-bearing spans and cannot overwrite their fields.
- `looking at Cedarview` was classified as a place because of the preceding `at`.
  Explicit model-interest wording now disambiguates that case while retaining
  actual sites in Langley/Canmore/etc. as locations.
- The delivery comparison guard removed a stated rural site near Brandon because
  the customer had not used `my`/`our` before `site`. Explicitly stated sites now
  survive; speculative region comparisons still do not become a customer site.
- A two-bedroom qualifier between `six` and `infill homes` prevented the total
  count from being stored. Qualified counts and groups-of-three phasing now retain
  total and phase quantities separately. A builder/program question is not turned
  into model matching merely because it mentions bedrooms.
- `next year` reached extraction without a trusted reference clock and became
  `2025`. The server supplies UTC plus an America/Vancouver local date. Relative
  years/months/days use that clock and override conflicting extracted guesses.
- The added kitchen/privacy preferences lacked a deterministic fallback when
  extraction omitted them. Explicit visitor preferences are retained with prior
  needs; they are never treated as approved plan features or company commitments.
- Eight answers aborted on `unsupported_rate_reference`. Non-pricing requests
  now have no `planningRates` output field. Eligibility is per request and checks
  topic, rate purpose, freight-only wording, product scope and price evidence.
  An out-of-scope legacy selection is ignored without rendering money; free-form
  monetary claims remain rejected. Ordinary housing is not an unlisted product
  just because a model has not been selected.

## Explicit company-policy authority

`policies.ts` contains customer-safe records with stable IDs, published /
team-confirmation / confidential statuses, exact approved wording, and provenance
from the approved public facts or the owner's confirmed position. Plant visits
and the availability/release of engineering documentation require team
confirmation. Factory identities/private records stay protected; this does not
make all technical documents confidential or unavailable.

Intent extraction selects record IDs, not policy prose. The server renders those
records, preserving written-scope qualifications and visitor-proposed context.
Published package planning rates are rendered from the existing shared controlled
CAD values. Record-backed requests require no answer generation or support review.
Other factual/design reasoning keeps the existing generation and support check.
The added company-policy AI reviewer has been removed; no new model or framework
was introduced. Maintainer files and private sources remain outside inference.

## Local proof before Preview calls

`repair-regressions.test.ts` replays the saved customer wording and adverse stale
extraction values. It checks the 3,600 ceiling, model/location separation, delivery
site retention, new preferences, six-home / three-home-phase separation, and
Pacific/UTC year boundaries. It validates per-request JSON schemas with AJV,
including a freight request incorrectly labelled as a planning-rate request, and
checks that unauthorized monetary text is still rejected.

SDK fixtures prove the factory records answer both parts after extraction with
no answer/reviewer call, and that mixed package-rate/freight requests render the
approved values and retained Manitoba site without a false capability restriction.
The complete local suite, TypeScript, changed-file lint and local production build
are checked before deployment. Code tests are not answer-quality acceptance.

## Bounded deployed acceptance

Use the existing exact factory question once and five existing ordinary
conversations with one follow-up each: 11 turns total. Retain actual rendered
answers, policy IDs/statuses, reference time, saved requirements and failure codes.
No real lead is sent. No acceptance retries or code patches follow a material
failure. Production, main, live aliases and backups remain untouched.
