# Recommendation-card regression repair

Verified live Production: `48e1748fbcb323c163fe4217dc5b45c23c53b81d` / `dpl_7aoTAKY6cajnpj3duTYUnqg7cRhT`. Separate branch: `feature/concierge-card-repair-20261115`, retaining the direct Production lineage and every approved Preview change through `a8da64f28ab23b78ced39674c48a3e4ba0a30688`. No main/Production changes.

## Reproduced cause

The exact three-turn transcript was replayed on a8da64f's current Preview before editing. The final answer listed Aurora, Summit and Mayne, but the API returned modelCards=[] and React rendered zero cards. The raw request remained classified as scope after the preceding process/supply answer. The primary topic became matching, but retrieval followed the scope request parts and supplied no model records. Generated numeric content was rejected. matchingIntroduction() independently read successful deterministic matches, while card construction read the empty retrieval models array. No provider failure occurred. React's existing card renderer was functioning as written; it had no cards to display.

The first-turn error did not recur in that single reproduction, illustrating its generation-dependent nature. Reporting known lot information was unnecessarily routed through inference and factual/numeric validation. It now has a narrowly scoped, deterministic acknowledgement of visitor-reported site values and an appropriate next question, without claiming feasibility or inferring home floor area.

## Targeted changes

- Bare bedroom preference replies reconcile stale request topics; compound questions retain independent scope/policy parts. Selection phrasing includes relevant “what homes would work…” requests.
- Matching fallback text, cards, approved model links and signed follow-up context use the same verified model set. Existing source/specification and commercial/confidentiality limits remain intact. Generated matching requests can display cards even when their primary topic differs.
- Named public models in ordinary generated content can use the existing approved card projection; policy-only mentions do not create unrelated recommendations.
- Property measurement/location parsing retains explicitly stated location after the measurement; lot area stays separate from home target/limits.
- Existing approved imagery, card components, CSS, audited knowledge, model fields, floor-plan assets, pricing, provider, manufacturing/logistics policies, GA4/Ads and inquiry forms are unchanged. The existing optional-image renderer preserves verified text and links when no image is supplied.

## Verification

Local: 470 tests pass, including seven new card-repair cases, previous recommendation tests and technical/logistics/security regressions. TypeScript, changed-file lint, whitespace and local production build pass. Tests exercise generated recommendations, numeric-rejection fallback, mismatched request routing, exact bedroom semantics, retained lot/location, first-turn acknowledgement without inference and optional image data.

One new feature Preview verification is bounded to the exact three turns, four required wording variants and one authenticated recoverable contract fault (eight live API turns maximum, no provider retries). The injected validation fault uses existing Preview-only evaluation controls and makes no external provider call. Desktop cards and links are checked; tablet/mobile replay captured public replies without extra inference. Optional-image rendering is UI-only synthetic data, not an invented catalogue asset. No leads/emails, Production requests, account/billing changes or new services.

Baseline trace/screenshots and final actual responses/results: `/private/tmp/hd-concierge-card-repair-20261115/Review.md`. Do not claim success from status codes alone; inspect actual rendered cards and answers. Stop at Preview for review.
