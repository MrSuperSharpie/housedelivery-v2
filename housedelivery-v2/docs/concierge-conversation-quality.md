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
| Freight plus rate question returned only a rate paragraph | Controlled pricing default answered the primary topic; `deliver` did not trigger the narrower freight branch | Ordinary price explanations synthesize the complete requests. Only source-checked CAD planning rates pass; freight charges remain unknown without a project quotation. Arithmetic and unresolved pricing conflicts stay controlled. |
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
their fingerprints and unknown/conflicting product fields. Rates are validated
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
