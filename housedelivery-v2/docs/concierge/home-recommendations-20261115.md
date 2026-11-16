# Concierge home recommendations — controlled Preview

Verified Production baseline: `48e1748fbcb323c163fe4217dc5b45c23c53b81d`, deployment `dpl_7aoTAKY6cajnpj3duTYUnqg7cRhT` (`housedelivery-v2-nch3j3yok-edavis-animalmarkets-projects.vercel.app`). This includes Google Ads/GA4 and the approved five-field inquiry. Work is isolated on `feature/concierge-home-recommendations-20261115`. No Production settings, aliases or deployments are changed by this task.

## Diagnosis

- Every explicit area was assigned to a home-area field, regardless of whether it described a lot. The deterministic merge therefore overrode even correct inference.
- The bedroom parser matched the last number preceding “bedroom”, collapsing alternatives to one exact count.
- Matching routing updated the primary topic without always updating its request plan; retrieval follows the latter. A browse acceptance could inherit the earlier property topic.
- The fallback supplied a generic sentence, while card suppression removed cards when the narrative repeated their name and area. The UI rendered remaining cards as text-only specification blocks.

## Targeted corrections

- Separate visitor-reported site area from home target/minimum/maximum. Inherited measurements cannot borrow site units or overwrite a complete measurement. Matching never treats site area as available floor area or establishes feasibility.
- Retain exact, minimum and alternative bedroom requirements, including later corrections, signed follow-ups and project summaries. Choice-based shortlists represent different acceptable bedroom counts when qualifying published models exist.
- Reconcile matching request routing and accepted browsing; retain recommended-model context for plural comparisons and plan requests. Developer and community program guidance remains separate from single-home discovery.
- Keep verified cards visible and provide actual catalogue features in a matching fallback. Recommendation follow-ups advance to a missing decision instead of asking permission to browse again.
- Join existing public catalogue images after inference, separately from the unchanged, fingerprinted audited knowledge. Cards use audited specifications/features, approved imagery, model links and floor-plan links. Normalize architectural plan anchors once.
- Keep the existing provider, grounding review, confidentiality boundaries, commercial policies, consent and lead capture. No extra model calls, services, packages or knowledge edits.

## Verification and limits

Local: 454 tests pass, including six new regression tests covering the exact acceptance sequence, measurement variations, bedroom alternatives/replacements, fallback, all 18 architectural cards/links and broader project roles. TypeScript, changed-file lint and optimized build pass. Mock-only desktop 1440px, tablet 768px and mobile 390px card checks confirm loaded images, keyboard links and no horizontal overflow. Screenshots are in `/private/tmp/hd-concierge-recommendations-20261115/local-ui/`.

Deployed review is bounded to one feature build: the exact four-turn sequence, four connected follow-ups, a two-turn measurement/customization variation, two developer turns, two Indigenous community turns and one confidentiality boundary (15 real turns maximum). There are no automatic retries, lead submissions, account/campaign changes or Production requests. Existing authenticated evaluation is Preview-only; independent secrets are scoped to this branch. Mobile/tablet rendering can replay the captured public answer without more inference. Judge actual answers and retained state; successful HTTP calls alone are insufficient.

The Preview URL, exact feature commit, captured public answers, saved visitor requirements, evaluation traces and final results are recorded in the external review artifact `/private/tmp/hd-concierge-recommendations-20261115/Review.md` after the bounded check. No access credentials, signed sessions, customer records or maintainer knowledge are committed.
