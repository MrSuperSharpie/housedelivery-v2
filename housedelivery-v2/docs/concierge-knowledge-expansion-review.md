# Bounded Preview review — 14 November 2026

This is a review candidate, not a production launch approval. Production has not
been changed. The original package remains local and byte-identical; only the
validated customer-safe JSON is runtime knowledge.

## Evidence and limits

- Rollback checkpoint: `58eae784b1543916fc14c0ece0d1960376022df6`.
- Conversation baseline: that exact parent Preview.
- Corrected conversational captures: `12a2157ffc01c8ebd112919d3b7e07140794f7fd`.
- Final source adds the shared layout/accessibility/scope guards described below;
  these last guards are offline-tested but were **not live-retested**.
- Knowledge release: `2026-11-14.knowledge-expansion.1`.
- Runtime SHA-256: `de6457fdad3bc8ab0929b57b301e140ab43599f690af5c145bff283f0a45d98d`.

The baseline stopped at a genuine provider HTTP 429 on T11's last turn. The
finite after batch captured seven conversations and six controls, and stopped
immediately at another 429 on T14's final turn. No provider retry cycle, billing
change, model swap or security relaxation was attempted. A 429 or reviewed
fallback is not a conversational quality pass. Earlier failed captures remain
preserved. There is no claim that all responses passed, or that this is a load
certification.

## Six actual before/after excerpts

These are excerpts of synthetic conversations executed against deployed APIs,
not idealized sample answers. Complete captures are retained locally. The after
text below predates the final guards where explicitly stated.

| Scenario / same visitor question | Before | Observed after | Review |
|---|---|---|---|
| Company / existing builder — We already have a general contractor. Where would you fit? | House Delivery welcomes working alongside your existing general contractor. They remain responsible for local site execution and construction management within the agreed scope. We fit by collaborating on site, model choices, design directions, and… | With your general contractor in place, House Delivery coordinates manufacturing, logistics, and the supply package, while your builder manages local site execution and trades, ensuring clear responsibilities for foundations, utilities, permits, and… | Directer role explanation; no replacement of the visitor’s GC. |
| Home and lifestyle fit — Why would that home suit us? | The Aurora suits your exact 4-bedroom need and offers 3 bathrooms within about 2486 sqft, close to your 2500 sqft target. It also includes a main-floor bedroom suite, which may add flexibility to your living arrangement. The Summit model also fits 4… | The Aurora suits your needs with its 4 bedrooms including a main-floor suite, spread over about 2486 sq ft, fitting your exact bedroom and low-maintenance preferences well. Alternatively, The Summit offers 4 bedrooms and 4 bathrooms with a slightly… | Useful comparison, but a later turn invented an ensuite relationship. Final shared guard blocks it; not live-retested. |
| Total budget — Would a published package rate tell me if that works? | The observed Salt Spring Studio controls show Premium at CAD $250 per sq. ft. and Signature at CAD $300 per sq. ft. These are home-package planning references, not verified offers for every model or completed-home prices; model applicability,… | A published package rate gives a home-package planning reference, not a confirmed price for your specific model or turnkey construction. It excludes site prep, foundations, local engineering, permits, assembly, completion and taxes, which require… | No invented USD after the correction. The later scope qualification guard is offline-tested, not live-retested. |
| ADU and mobility — It needs to be easy for her to move around. | Both the Limetree House and the Moonlight House are compact models about 616 to 647 sq ft, designed as laneway carriage homes with single story or small footprints that support easy movement. The Limetree House includes a dedicated study and has two… | Both Limetree House and Moonlight House offer two bedrooms suitable for accommodating your mother with mobility considerations in mind. Limetree House includes a dedicated study and a slightly larger internal living area, which could provide more… | Failed quality: unverified internal-area ranking and access inference. Final shared guards reject these; not live-retested. |
| Development phases — We are planning 100 rental homes, starting with 20. | We support planning multiple home types and phases for 20, 50, 100 or more homes, fitting your 100 rental homes project starting with 20 units well into our process. The home package includes engineered kits and selected materials; appliances, site… | Planning 100 rental homes in phases, starting with 20, fits well with House Delivery's approach to organized housing developments involving multiple home types, quantities and phases. The next best step is to start with your site and housing needs,… | Signed state retains 100 total / 20 phase one, builder and pending funding separately. |
| Nation-led participation — We want local people involved in the work. | We support First Nations and Indigenous community projects that emphasize local participation and roles, including assembly training as agreed between the community and delivery team. This allows families and elders to be directly involved in their… | House Delivery is Indigenous-owned and supports including local teams and community participation in housing projects, aligning roles and work opportunities with the specific development. Local construction teams typically assemble homes on site,… | Project-specific local roles and training discussion; no job or grant promise. Baseline last turn was unavailable due to 429. |

## What changed and what remains unverified

The application already used an LLM and support review. Added complete, connected
company sections now reach that model alongside the unchanged controlled model
and price registry. Synthesis, signed household priorities and explicit total /
phase memory improve breadth. Studio links are no longer a default answer to
unrelated questions. Supported passages can survive another passage's rejection.

Live review caught a wrong Essential-tier suggestion for architectural models and
an invented USD budget; the corrected live pass did not repeat those failures.
Further review caught an assumed Summit ensuite relationship, unqualified package
exclusions, and an unsupported compact-home internal-area/accessibility comparison.
The final shared guards block these claims, retain valid recorded Moonlight
private-bathroom features, and preserve the written-scope qualification. They add
no new model facts. No further live attempt was made after the recurring 429.
These specific final behaviors remain a live-verification gate.

T01 is direct and broader, but can still be longer than ideal. T11's first turn
had a supported partial answer with an imprecise 'these models' follow-up after an
unrelated model passage was rejected. S03's adversarial attempt to turn a visitor
budget into company pricing failed safely with a reviewed fallback; it is a
security result, not a natural-answer quality pass.

Known factual gaps remain unknown: selected compact areas, Langley bathroom count,
BC Duplex storeys, Sixplex area basis, catalogue default tier, pricing applicability
and chargeable areas, and unrecorded room relationships/access details. No source
research, private account retrieval or specification invention was used to fill them.

## Actual retrieval trace

For T14's mixed manufacturing / Look Book / builder question, staff-only evidence
recorded these complete sections:
`H:company`, `H:systems`, `H:design`, `H:roles`, `H:process`, `H:aftercare`.
No arbitrary model was selected. The generated answer explained off-site components,
Look Book design intent, and local construction roles. The next turn failed at
intent extraction with provider HTTP 429, stage 1; it used a reviewed fallback and
is not counted as a quality pass.

T02 retrieved controlled `home-aurora` and `home-summit` records. Approximate
2,500 sq. ft. matching retained both within the existing soft-target tolerance;
no new eligibility rule, model figure or price was introduced. Signed T09 state
retained 100 total and 20 phase-one homes at turn 1, and builder/pending funding at
turn 2. The state is visitor-reported, not verified company/government authority.

## Checks

- Full configured run: all 372 existing tests passed. Added regression tests were
  corrected only after actual parser or test-fixture findings. The 15 existing
  audited tests plus 11 new expansion tests pass in the final focused checks.
- Final TypeScript and changed-code lint passed. Vercel build status and exact
  final Preview commit are verified in the handoff.
- Repository-wide lint retains the pre-existing planner set-state-in-effect error
  and unused type warning; both unrelated files remain unchanged.
- Offline checks validate the exact publication hash, closed schema, source IDs,
  complete limits, all fifteen added scenarios' bounded retrieval, unchanged
  numeric/model restrictions, memory, extraction attacks, forged history and
  session separation. An SDK fixture verifies actual handbook context and partial
  support rejection. This does not establish perfect generative grounding.
- Four journeys visible/enabled; stationary launcher, nonmodal panel, keyboard
  focus/close/reopen, and 1440/768/390px geometry passed in actual Chrome. UI-control
  checks made no additional model calls. Screenshots were visually inspected.
- Fourteen deployed security/exposure checks passed: forged authority/history,
  prototype IDs, handbook labels as client authority, cross-session state/token,
  cross-origin, private ledger/connector extraction, unconsented lead, and five
  documentation/archive/source paths returning 404. Zero real leads/emails.
- Benign origin control answered domestic timber / internationally manufactured
  light-gauge steel and Canadian site work/assembly without naming private partners.
- Private editorial URLs/text were absent from built JS. No handbook, maintainer
  material or evaluation artifacts appeared in client bundles. Current Git contains
  only the approved runtime payload, schema/manifest and sanitized test fixture;
  the eight-file source package is locally ignored.

## Editorial-link disclosure

I initially included the local editorial package in this public repository's
feature commit. It contained seven editorial source URLs; no source-document
bodies, credentials, correspondence or customer records were imported. I removed
the package from the current branch, preserved all local files and a local-only
checkpoint, and added both tracked and local Git exclusions to prevent accidental
republication. GitHub may retain the old commit/tree in caches; rewriting this
feature branch does not guarantee erasure. Review sharing on the referenced
Drive documents if those links grant access. The runtime never retrieved or
received this ledger.

## Review status

Production remains disabled and its live deployment/aliases are preserved.
Commercial review, provider capacity and live verification of the last guards
remain open. Do not promote this candidate as launch-certified. Stop here for
Edgar's review. No further inference, research or optimization batch was run after
the recurring provider limit.
