# Concierge publication and comparison correction

Foundation: `a68fb53`, on the existing Concierge feature branch. The prior `91d948f` checkpoint/tag and accepted schema fix remain intact. No production change.

## Evidence inspected before edits

- Saved `bounded-acceptance-a68fb53` response/state/decision traces showed scope records rendered directly and the earlier state/role corrections working. They do not contain the newly reported failing comparison.
- Preview runtime-log lookup for the deployed commit (three-hour window, Concierge filter) returned no matching logs. Ordinary customer transcripts are not logged. The full new transcript and its two exact leaked sentences were not supplied with the request; a text clarification was requested. No exact provider/validation verdict for that unrecorded conversation is claimed.
- Code inspection demonstrated two instruction-to-answer paths: `selectHandbook` exposed guidance and limits as evidence; `policies.ts` concatenated all fact qualifiers directly into rendered text. Instruction content also appeared inside mixed fact text, model uncertainty notes and Studio retrieval notes.
- The support helper admitted `limits` as evidence for a company assertion. State retained topic/evidence IDs, but not the active question; measurements could independently trigger matching. General system and coordination facts established no like-for-like steel/timber price or speed advantage.

## Corrections

Explicit publication projections separate public facts and customer-facing qualifications from editorial guidance, limits and raw uncertainty notes. The original fingerprinted knowledge JSON is unchanged. Internal guidance is separately labelled for generation and cannot be cited by the support step. Policy rendering uses projected public text. A provenance-derived answer-boundary check covers instruction copying in answers and follow-ups; it is not a blacklist of the two reported sentences.

The existing record mechanism now represents the absence of a verified steel/timber comparison. It answers that limitation and calls for quotations with the same design, engineering, supply, freight and local scope. It supplies no material-price, savings, speed or inferior-builder claim. Existing free-text support validation also rejects unsupported comparative benefits. Actual provider errors retain their separate service notices. No reviewer/model call was added.

Signed conversation state retains the active question, request plan and short visitor-reported project updates. Site readiness and builder experience continue the active decision without inventing an occupation, an agreed scope or a price. Hyphenated square-foot measurements retain their full value. Explicit compound package/local-work/published-rate questions cannot silently lose a known public part when intake combines clauses.

Model package guidance distinguishes the published structural-system description from a final model-specific supply schedule. Published pricing retains Salt Spring applicability and the need to confirm another model, chargeable area, scope and delivery. No package rate becomes a steel/timber comparison or completed-home quotation.

## Local verification

420 tests passed. Six added regression tests cover all classified publication fields, instruction copying, unsupported comparative claims, active-question continuity through follow-ups and signed-state restoration, compound answers, omitted intake parts and freight-only pricing eligibility. Focused tests also passed after adding the follow-up publication guard. TypeScript, changed-file ESLint, whitespace and local Next.js build checks passed.

Preview verification is bounded to one run of the reported question/follow-up and labelled reconstruction/variation; no new research, real leads, private-source access, production deployment or promotion.
