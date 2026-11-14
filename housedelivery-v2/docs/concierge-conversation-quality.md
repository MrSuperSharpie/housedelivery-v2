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
