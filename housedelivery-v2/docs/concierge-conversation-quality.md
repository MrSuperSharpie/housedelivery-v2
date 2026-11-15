# Concierge conversation quality correction

Foundation / rollback: `8d1042536920f20181303e7c6cb8402c751e82e4`.
Branch: `feature/concierge-conversation-quality-20261114`.
Production is unchanged. No new source research, source accounts, dependencies,
knowledge payloads or model/pricing changes were introduced.

## Diagnosed causes

The owner's six observed responses are the baseline. The construction/modular
comparison is a useful positive control, not evidence that every answer was bad.

| Observed issue | Layer / concrete cause | Shared correction |
|---|---|---|
| One part answered, another offered as a follow-up | Planning/generation and control flow: one topic selected; the first matching controlled branch replaced the entire answer | A bounded request plan and closed answer object require an entry for every substantive part. Retrieval combines their topics. Rejected parts are explicitly incomplete, not silently omitted or counted as quality passes. |
| Inclusions replaced by model room counts; local sourcing omitted | Evidence selection: the primary model topic did not guarantee scope, exclusions and local-role evidence | Supply/local questions retrieve all relevant supply, exclusion, finish and builder facts, with the model description distinguished from the written package. |
| Freight plus rate question returned only a rate paragraph | Controlled pricing default answered the primary topic; `deliver` did not trigger the narrower freight branch | Ordinary price explanations synthesize the complete requests. Rates are selected as structured public-tier references and rendered from the pinned approved values; freight charges remain unknown without a project quotation. Arithmetic and unresolved pricing conflicts stay controlled. |
| General code/permit question became a CMHC warning | Broad `permit` control branch plus terms retrieval | Ordinary technical explanations use technical, system and local-responsibility evidence. CMHC evidence is selected only for a relevant catalogue/design question. |
| Contractor addressed as someone with another builder | Context extraction did not explicitly distinguish self-role from an external builder; generation parroted the existing-builder fact | Explicit self-role is retained separately. Written infill quantities and timing are retained. Role-consistency validation rejects misaddressing the contractor. |
| Old home links and unrelated Solace link | Unconditional carry-forward of `selectedModel`; UI links chosen from the first provenance source URL | Model context is selected for the current question without erasing saved context. Links resolve to the current home or relevant canonical public page, never a provenance example. |
| Studio audit language shown to visitors | Controlled paragraph and evidence projected verification wording into public prose | Public price projection and customer-language validation preserve numeric authority while excluding audit, registry and observed-control narration. Fallback is explicitly a failure, not a raw evidence dump. |
| Confidential identity question missed; warehouse policy invented | `who manufactures` was outside the private-request pattern; generation treated unknown capability as a negative company policy and reused the old model | Server-side clause separation protects private identities before inference while retaining a public part of a mixed request. Unconfirmed product scope cannot acquire residential model evidence, company availability/refusal claims, a binding quote or a premature sales action. |

## Architecture and protections

This is a change to the existing extraction → retrieval → LLM composition →
deterministic validation → independent support review path. It is not a response
table for the six examples. The request planner handles arbitrary supported
questions using the same approved topics. The response schema requires an answer
entry for each planned part. Staff-only diagnostics record topic IDs, model-context
scope, retained/missing answer IDs and non-sensitive failure reasons.

The existing independent support check still reviews every retained passage,
and now sees the original question and complete request plan. It separately
checks whether the answer actually covers every asked part, not merely whether
its citations are valid.
Unsupported content is not allowed through for fluency. Missing/rejected parts
are exposed as incomplete and are not a quality pass. Provider failures remain
failures. There is no unbounded regeneration loop.

The approved audited registry and 15-topic handbook are unchanged, including
their fingerprints and unknown/conflicting product fields. Public rate references are rendered and validated
against the existing CAD price rule with correct Premium/Signature associations
and planning scope. No model quotation, freight amount or private commercial
figure is inferred. A public origin question remains answerable without revealing
manufacturing identities. No private connector, filesystem search, broad database
or supplier tool is provided to inference.

Cookie/session/token binding, origin/body/history checks, public rate limits,
explicit lead consent and truthful delivery outcomes remain. The UI, four
journeys, stationary launcher, Studio/Look Books, photography, video, layout,
pricing calculations, model pages and inquiry implementations are unchanged.
The local editorial package stays excluded from Git, deployment and inference.

## Bounded verification

- The configured full run passed 390 tests. A subsequent focused test covers the
  additional tentative-destination guard; regional shipping questions are not
  silently stored as a confirmed project site.
- TypeScript, changed-code ESLint and a production build are checked. Repository
  lint retains the same pre-existing planner effect error and unused type warning.
- Live review is limited to the six-question sequence supplied by the owner,
  three differently worded variations and a zero-inference confidentiality
  control. No real lead is submitted. The run is paced and stops on a provider
  limit or timeout. Only a failed case may be retried after a relevant correction.
- Actual responses and their execution/coverage traces are delivered as local
  review artifacts, not added to global or runtime knowledge. Customer-safe
  diagnostics do not include credentials, raw private records or source mappings.

No production promotion, main merge, live-domain alias or billing change is part
of this work. Stop for owner review after the finite Preview verification.

## Actual Preview findings and remaining gate

On the deployed `d8ec8eb` checkpoint, the first two original questions generated
complete answers. The construction/modular distinction and Cedarview local-work
scope were both answered directly; Cedarview linked only to Cedarview, inclusions
and delivery responsibilities. The review removed unnecessary follow-ups.

Q3 answered freight but its rate passage was rejected as `uncontrolled_price`.
That is a validation-stage finding, not proof that missing knowledge caused the
omission. The discarded wording was not retained, so its precise lexical failure
is not asserted. The final change replaces free-form money in generated text
with structured tier references and source-derived CAD values. An actual SDK
fixture verifies extraction, rendering, validation and support review together.

Q4 then received a genuine provider HTTP 429 during composition (stage 2 after
successful extraction). The finite live batch stopped. Q5/Q6 and the paraphrases
were not run; no hypothetical answer is presented as an observed response. The
final numerical renderer and these remaining conversations are not live-verified
until provider capacity is available. No billing/model/security change or retry
cycle was used. Full actual responses and execution traces remain local review
artifacts, outside runtime knowledge and the public repository.

Offline: 390 tests passed in the full run; focused follow-up checks cover the
additional role, destination, coverage and deterministic-rate changes. TypeScript
and changed-code lint pass. The final Vercel build/readiness and zero-inference
security checks are reported in the handoff. Production remains unchanged.

## Named-company manufacturing/origin probes

A later customer example exposed a specific pre-inference classifier gap:
`factories like [company]` was not recognized as an affiliation probe. The busy
copy indicates an inference failure, but the exact status of that customer's
request is not available from the transcript alone. No provider status is inferred
solely from that wording.

The shared boundary now recognizes example-factory and supplier-relationship
phrasing without a private-name list. For a mixed origin/identity probe, it renders
the exact released `F-ORIGIN` fact and the explicit non-confirmation policy before
inference. No guessed company is echoed, confirmed, denied, stored as company
knowledge or sent to a model. Ordinary origin questions remain on the normal
conversation path. Configuration/source-extraction attacks remain wholly blocked.

This data-backed security response is available even during provider rate limits.
It does not repair or disguise general Gateway capacity. Tests use fictitious
company names and a forced-timeout provider fixture to verify zero model calls,
released-fact fidelity, no relationship confirmation, and preserved benign-origin
handling. No new manufacturer research or knowledge payload was introduced.

## Private-facility location and certification pretexts

A follow-up asking for a factory province/city to verify ISO certification
exposed a location-targeting gap. This request is now handled before inference,
including factory addresses, towns, provinces, coordinates and ownership-worded
manufacturer locations. Certification checking does not authorize disclosure of
identifying partner details. No claimed country of origin or ISO status is
confirmed from a visitor's assertion.

The boundary gives an explicit privacy explanation and a limited technical-review
path: the team can discuss applicable project documentation, while chat cannot
verify or promise ISO certification. It does not claim certificates are available
or that any factory is certified.

Signed state retains only a manufacturing-restriction topic, never a guessed
company, city or country. This protects short follow-ups such as 'just the city
then'. Ordinary customer-site, delivery, warranty-documentation and general-origin
questions remain on the public path; changing to a public topic clears this
restriction context. Existing authorization, rate and consent checks remain.

The focused 38-test suite, TypeScript and changed-code lint pass, including a
three-turn protected sequence, differently worded location probes, zero-inference
forced-timeout fixtures and benign-question controls. The Vercel build and exact
deployed sequence are verified separately. No research, supplier-name list,
knowledge payload, UI or production change is introduced.


## Plant access / direct technical sheets: evidenced schema failure

Before edits, the exact two-part customer question was reproduced once on
Preview commit `2d27b3552b8ca3cf6be0afdc0cb1a744c9c0fce5`. Intent extraction
completed. The answer request then failed with HTTP 400, no generated answer,
no support-review call and no answer-validation rejections. Retrieval selected
process/specifications evidence without a model recommendation.

The project AI Gateway request log at `2026-11-14T21:27:06.215Z`
(`gen_01M7DZ9X77VE29ZCYMMQFE8YN0`) records OpenAI and Azure both rejecting
`answers.r1.planningRates`: **uniqueItems is not permitted**. This establishes
a provider-facing request-schema defect, not rate limiting, missing knowledge,
a timeout, or a confidentiality refusal. The original customer's request has no
correlation ID, so this trace is the unchanged-Preview reproduction, not a claim
to have identified their original individual request.

Remove only that unsupported schema keyword; `planningReferences()` still
rejects duplicate/unknown tiers and renders pinned public prices server-side.
No prompt or knowledge change is needed to correct this request rejection.
HTTP 400 is classified as a request/schema error before loose authentication
keyword matching. Busy wording is reserved for rate limits; timeouts and other
service failures use distinct notices. A service failure no longer also claims
the answer was rejected by verification. Missing information and confidentiality
remain subject to the existing grounded-answer and privacy architecture. Plant
access and releasable documentation availability must not be invented.

Focused offline contract/error tests and one corrected-Preview conversation are
the bounded verification scope. No production, billing, credential or provider
configuration changes are included.


## Evidence-backed company policies and explicit unknowns

The completed `e1ca3dd` browser trace had three completed model calls, no service
failures, both requests retained, and zero validation rejections. Its accepted
answer nevertheless claimed direct factory engineering sheets were not routinely
provided. No selected approved passage established that practice. The old
support-review result contained only a verdict/issues, so an accepted source ID
and a broad support verdict did not demonstrate policy-specific evidence. The
saved trace does not contain the review's internal reasoning; none is invented.

The existing review call now audits company-practice, availability, access,
inclusion/exclusion, responsibility and document-release claims. Final policy
claims carry exact approved supporting passages and an explicit entailment
verdict. The server verifies passages against retrieved assertions and complete
qualifications, excluding titles and writing guidance. Unbacked claims fail
closed. Scope and conditions must remain intact; silence is not a refusal policy.

For an unsupported policy, the same review may preserve supported information
and replace only the unsupported portion with a specific uncertainty requiring
team confirmation. That replacement passes the existing output, numerical,
commercial, model and follow-up controls. Other rejection types keep their
existing fail-closed behaviour. This adds no inference calls, answer blacklist or
question-specific response. Authenticated Preview diagnostics retain decision
counts and whether a segment was revised, without raw prompts or private records.

The owner-confirmed boundary is explicit: unrecorded access arrangements and
project-specific documentation availability/release require team confirmation.
Private factory identities/records remain protected; that does not imply every
technical document is confidential or unavailable. The accepted HTTP-400 schema
fix, rate limits, consent, signed state and approved knowledge isolation remain.

Bounded verification: focused evidence/review and security regression tests,
TypeScript/changed-file lint, the Preview build, and exactly the original question
plus two paraphrases through the deployed website. Actual results remain local
review artifacts. Production is not modified.
