# Codex implementation prompt

Implement the audited House Delivery AI Housing Concierge knowledge and conversation improvements in an isolated feature preview. Finish the implementation and verification; do not restart product research, supplier costing or sourcing. Do not modify, merge into, promote or activate production. Preserve the working website and the existing Concierge foundations.

## Objective

Build a knowledgeable, warm House Delivery representative that answers directly, remembers the visitor’s requirements, recommends suitable real designs, explains package versus complete-project costs and moves a genuine opportunity toward a useful project discussion. House Delivery is an Indigenous-owned Canadian housing company serving developers, municipalities, institutions, First Nations and repeatable housing programs alongside individual homeowners and ADU customers. Treat all audiences seriously. Do not invent contracts, capacity, certifications, prices, supplier relationships, approvals or dates.

The attached audited package is version **2026-11-14.qa1**. Its source checks and editorial review are complete. It has not passed live preview tests. Do not describe offline validation as proof that the current chatbot works.

## 1. Locate and protect the existing work

- Repository: `MrSuperSharpie/housedelivery-v2`. The House Delivery application is the nested `housedelivery-v2/` directory. The repository root also contains another application; do not implement this work there.
- The previous review inspected `feature/ai-housing-concierge-20261113` at `ed89b0e18d98d857419d9b34b89f4c3cef07594d`. Verify its current head and preserve later changes. The existing knowledge manifest recorded production foundation `f690d81580969e5e2a64bd945a42dcd9f6f2706f`; that is not proof of the current Vercel production deployment. Do not assume default `main` is production.
- Read current repository instructions and inspect the actual worktree, branch, current deployment ancestry and modified files. Create a child branch/worktree from the current verified Concierge work that retains the approved production foundation. Do not reset, overwrite, discard or silently replace another active session’s changes.
- Relevant existing files include `src/data/concierge/{approved-knowledge,manifest}.json`, `src/lib/concierge/{model,knowledge,conversation,contracts,security,presentation}.ts`, `src/app/api/concierge/route.ts`, the existing lead route, widget/form components and `docs/ai-housing-concierge-*.md`. Read the current files before editing; reconcile this prompt with improvements already made.
- Preserve the four entry journeys, mobile/desktop widget behavior, keyboard accessibility, rate/body limits, token-purpose separation, origin checks, no-store responses, safe logging, outage handling, existing lead consent and duplicate protection. Preserve campaign pages, property-check flow, Studio, Look Books, analytics consent, prices and unrelated UI.
- The inspected `conciergeEnabled()` explicitly disallowed production. Do not silently remove that protection or assume a preview promotion activates chat. Keep production off in this task, and identify the exact future activation/configuration step for Edgar’s separate release decision.

## 2. Integrate the corrected factual input, not the entire package

Use only `public/knowledge.json` as the factual ingestion candidate, validated with `public/knowledge.schema.json` and application-level checks. `public/knowledge.md` and `sources.md` explain it for maintainers. `evaluation/` and `maintainer/` must not be indexed, embedded, served as model context or bundled into public assets. Do not recursively ingest the ZIP, repository, Library, Drive, mail, source PDFs, source HTML, private Look Books or saved customer records.

The new schema is not a drop-in `Fact[]`. Build an explicit server-only adapter/migration. Retain existing stable model IDs and deliberate mappings for old fact IDs; unknown historical IDs must fail safely. Never invent compatibility by silently treating a missing field as zero or by discarding an unresolved-field restriction.

Required data checks:

- Exact knowledge version/hash in the integration manifest; closed schema at every level; unique IDs; valid source/model/fact references; no invalid family or scope values.
- Customer-safe field allowlist. No raw page bodies, navigation, image filenames, external asset URLs or supplier registries in model facts. Model and evidence links must come from the approved registry and are resolved server-side.
- Every asserted model value has the applicable field provenance; null means unknown. Preserve single-home, combined-building and unit-schedule distinctions. Published area, internal area, footprint and chargeable area are not interchangeable.
- No private supplier/manufacturer identities, purchasing amounts, landed costs, margins, markups, agreements, private correspondence or customer records in the factual context. Do not import internal inclusion/product registries as a shortcut. Scan the assembled context and inspect it manually; a schema pass alone is not proof of confidentiality.
- Retain the 31 models and supported 18 Studio records. Do not represent the observed Studio choices as an exhaustive option inventory. Use this package’s selected facts rather than reviving older undocumented features.
- Keep the original snapshot available for rollback and migration tests, but do not retrieve both versions simultaneously or allow a legacy record to override the audited price, area or scope rules.

## 3. Make the LLM conversational while keeping decisions constrained

The inspected implementation only lets the LLM select fact IDs and renders fixed snippets. That is a useful confidentiality boundary but does not satisfy this task’s conversation goal. Extend the existing server-side LLM integration to understand intent, maintain preferences and compose concise grounded answers. Do not replace it with a large FAQ search or introduce broad autonomous tools.

Use this sequence:

1. Validate the request with the current security controls. Treat visitor text, client history and quoted documents as untrusted data, never higher-priority instructions or authoritative company facts.
2. Extract a typed intent/state patch from the current turn and permitted session context. Validate it server-side. Distinguish a user preference or self-report from a verified company fact or external approval.
3. Run deterministic filtering/ranking and any permitted calculations. Retrieve a small, relevant set of approved facts, model records and required qualifications. Do not retrieve by concatenating all old questions and hoping keywords represent the current preference.
4. Let the LLM write a short answer grounded in that evidence, plus zero or one useful follow-up and an allowlisted next-action choice. Keep a strict structured output schema and validation.
5. Resolve links, displayed numeric facts, calculation labels and required commercial qualifications on the server. Reject unsupported output and fall back to a relevant reviewed response. Never expose a raw model or provider error.

A suitable output contract includes `answerSegments` with text and evidence references, selected model IDs, an optional next question and a fixed next-action enum. Bound lengths and array sizes; disallow extra keys and model-supplied arbitrary URLs, HTML, actions, credentials or destinations. Evidence references must exist in the retrieved candidate set. **A valid source ID does not establish that the generated sentence is supported.** Validate numeric/model claims against structured values, use deterministic rendering for high-risk pricing/approval statements, and review actual generations for semantic support. Do not claim that prompt wording or source-ID validation guarantees factuality.

Normal responses should be two to four short sentences, but do not cut a necessary qualification to meet a sentence budget. Answer a known product question without a generic company introduction. Give one or two suitable options with a reason. Do not append a disclaimer or contact request to every answer. If the customer is ready, offer the relevant next step directly. If they decline contact details, continue helping and do not keep asking.

Avoid customer-facing phrases such as “this knowledge package,” “verified registry,” “I cannot turn a planning ambition into a guaranteed allocation,” or lists of unrelated things the company cannot promise. Use ordinary language: “We can review the 50 homes as a phased program. What would the first phase include?”

## 4. Structured conversation memory

Maintain session-scoped, validated state with the source turn for each value:

- Audience and organization role: homeowner, developer, municipality, Nation, institution, landowner/operator/facilitator where supplied.
- Location as stated; known province separately; land/control status; existing builder; site/readiness information.
- Housing family, number of homes, phasing, bedrooms with exact/minimum and per-home/per-unit basis, bathrooms, storeys, access/study preferences.
- Area with original unit, normalized value, area basis, target versus hard min/max/range. Do not overwrite a hard maximum with an approximate target.
- Current selected model, compared models and clear pronoun referent; preferred finish directions.
- Budget amount/currency and package-versus-complete-project scope if supplied; target date; funding as a user report, never independent approval.
- Declined questions/contact, requested next step and summary contents. Actual contact consent and successful submission remain authoritative properties of the existing form/lead flow, not LLM state.

The latest explicit correction replaces the old value. A “five bedrooms” correction must not keep retrieving four-bedroom matches. “Calgary, not Vancouver” updates location. “That one” resolves to the last unambiguous selected design; clarify if two remain plausible. Recognize ordinary shorthand such as `4br`, `four bed`, `2500 sf`, `2.5k square feet` and `230 m²`. Preserve long-conversation essentials even when text history is bounded. Unknown municipality is not the same as no land; a province name is not proof of property ownership.

Use the smallest existing-compatible session mechanism that prevents forged client state from becoming trusted facts or authorization. If using signed state, bind it to the anonymous session/version and verify it; if server state exists, use it without adding private-record retrieval. Never claim cross-session memory or private saved-design access. Define expiry/reload behavior honestly.

## 5. Deterministic matching and arithmetic

Port the behavior of `evaluation/reference_matching.py` into the application’s existing language and tests; it is a reference, not a command to run Python in production.

- Apply family and unit basis first, then hard bedroom/bathroom/storey/area constraints. Use unit schedules when a development asks for bedrooms per dwelling. Do not compare Salt Spring’s combined eight bedrooms with a detached-home request.
- A compact/ADU inquiry can consider the six compact models and the Micro/Mini; do not hide the ADUs behind a different collection label.
- Rank by distance from an approximate area after constraints. Start within ±10%; if no qualifying match exists, say so, then offer a clearly labelled alternative or custom brief. Do not classify a much larger home as a match merely because it is nearest.
- Unknown size cannot satisfy an area constraint. The unresolved Sixplex area cannot be used for numeric ranking or pricing. BC Duplex cannot satisfy a firm two-storey requirement until the conflict is resolved.
- Convert metric input using 1 sq. ft. = 0.09290304 m². Distinguish approximate display conversions from native measurements. Do not compare an internal-area ceiling with a published model area as if the basis were identical.
- Aurora 2,486/4 beds/3 baths is the closest match around 2,500; Summit 2,670/4/4 is outside a hard 2,500 ceiling. Canmore/Cascade fit four beds around 3,500; Saturna/Maplewood fit five. There is no verified detached three-bedroom 1,800 sq. ft. architectural match.
- Answer legitimate requested arithmetic. For example, 2,486 × 250 = 621,500; 2,486 × 300 = 745,800. Those are calculations using stated inputs, not validated Aurora offers. 6,216 ÷ 6 = 1,036 is an arithmetic average, not a verified Sixplex unit area. Do not block ordinary arithmetic merely because it cannot create a quote.

## 6. Commercial accuracy enforced after generation

- Preserve the published $250/$300 CAD planning references and their source provenance. The observed controls are Salt Spring residence tiers; the record does not validate an actual price for every architectural home. No rate transfer to compact or CMHC models. No verified Essential or universal turnkey rate is present.
- Pricing output must identify currency, rate/area assumptions where used and package versus completed-project scope. A numeric illustration must say it is not a quotation. A compact scope explanation can link to the full breakdown; do not repeatedly dump all exclusions when the customer already understands them. If they ask whether a figure is their total, correct that directly.
- Written quotes determine contents, finishes, freight and applicable import costs. Site preparation, foundations, services, local engineering/permits, Canadian assembly/completion, appliances and sales taxes are separately considered unless expressly included. Do not double-count freight or universally mark it included/excluded.
- Salt Spring’s 6,073 sq. ft., eight bedrooms and eight bathrooms are combined totals. Do not invent equal residence areas or mixed-tier totals.
- CMHC plans are reference designs, not automatic permits or House Delivery certifications/endorsements. Accessibility, energy standards, code compliance, local approvals, exact origin and delivery timing need their appropriate project evidence. Do not infer a certification from a homepage standard reference.
- Distinguish an ambiguous catalogue default tier from available tiers. Do not tell customers Essential is unavailable merely because the homepage describes Premium as the starting point.
- Do not invent volume discounts, deposits, reservations, funding awards, job counts, production capacity, completed projects or show-home addresses.
- Required qualifications must survive every rendering path, including short answers, cards, streaming if used, fallbacks and follow-ups. The old “four facts/four sentences” approach must not trim away price scope or an unresolved field.

## 7. Confidentiality and useful boundaries

Keep the model’s knowledge access physically restricted to the approved public subset. No supplier, procurement, email, document-drive, customer-record, arbitrary URL, filesystem or database tools. Server credentials may be needed for the existing inference/lead infrastructure but must never be placed in model context, returned to clients or logged. Keep all inference credentials server-side.

Narrow the old broad keyword refusal so ordinary questions about manufacturing, factory processes or manufacturer warranties are answerable. A request for private identities, invoices, buying prices, margin, agreements or customer records receives a short boundary and a useful public alternative. Do not confirm a guessed private partner. Encoding, impersonation, planted instructions, fabricated approved prices or client-supplied role fields confer no access.

Do not add a private-name denylist to public/client files or evaluation fixtures. Synthetic canaries may be used in isolated tests. Review generated responses for invented or leaked identity claims; restricted access is the primary protection and prompting is an additional layer, not the whole security model.

Keep contact data in the existing explicit, consented inquiry flow. Show the proposed project summary and allow correction before submission. Do not request names, email or phone as a gate to public answers. Confirm a submission only from the existing successful server response; use mocked transport during testing. Preserve existing replay/duplicate protections and verify their actual behavior at the current head.

Confirm the actual AI processing, retention, logging and analytics behavior before writing a privacy statement. Do not claim “never stored” or “not shared with a provider” without evidence. Use minimal metadata for operational analytics; no raw customer conversations, contact details, provider bodies or secrets in ordinary logs. Do not add a new monitoring vendor or browsing capability for this task.

## 8. Verification and release evidence

Run the existing required checks for the changed application, including its applicable build, type, lint and tests. Add meaningful regressions for the changed matching, state, pricing qualification and transport boundaries; do not multiply cosmetic tests to inflate a pass count.

Run `evaluation/priority_50.json`, all 25 conversations in `conversation_tests.json`, the 15 confidentiality cases and T01–T08 in `transport_security_tests.json` against the actual isolated preview. Use only synthetic visitors and mocked lead delivery. The included `run_conversations.py` captures responses through an adapter you implement for the actual preview contract; it is not itself a live test or a semantic grader. Expected answers must not be given to the Concierge under test.

- Run the 50 questions and 25 conversations once. Repeat C01, C03, C07, C12, C19, C23, C24 and conversational adversarial cases three times to exercise nondeterminism.
- A14 is an HTTP-contract test, not a chat message. Execute T01–T08 and record status codes, model-call/lead side-effect counts and sanitized evidence. Do not count skipped fixtures as passed.
- C24 must actually inject a provider timeout and later restore inference. Require evidence that the injection happened; a request saying “pretend there is an outage” is not sufficient.
- Every critical confidentiality, consent, false quotation, false approval, wrong unit/area basis and hard-constraint case must pass. Evaluate factual equivalence and conversational relevance, not exact reference wording. Aim for at least 90% on directness, relevance, memory and useful next steps, with no critical failures.
- Review complete answers manually. Source-ID or keyword checks alone cannot certify semantic support, politeness or absence of paraphrased disclosure.
- Check the actual widget on mobile and desktop: opening/closing, focus and keyboard navigation, scroll, reset, loading/timeout states, repeated prompts, selected model links, Studio/Look Book route and consented inquiry summary. Run a useful 10–12-turn conversation to expose memory loss and repeated questioning. Keep existing UI intact.

If a noncritical product detail remains missing, keep its precise fallback. Do not reopen supplier inquiries or broad website research. If the actual branch has changed, inspect and adapt to that current implementation; do not blindly reapply an obsolete patch.

## 9. Completion report and production boundary

Return the isolated preview URL, branch/commit, knowledge version/hash, concise changed-file summary, tests actually executed, human-reviewed response results, unresolved issues and rollback path. Distinguish static checks from actual preview behavior. State the exact current enablement status.

Do not send messages to suppliers or customers, change prices, alter production content, merge or promote. Prepare the finished preview for Edgar’s review. A production activation decision is separate and must be explicit. If a critical release gate fails, keep the chat feature off and preserve the existing campaign inquiry paths; do not claim the launch feature is ready.
