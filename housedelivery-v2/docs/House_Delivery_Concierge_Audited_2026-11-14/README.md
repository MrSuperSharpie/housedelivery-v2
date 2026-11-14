# House Delivery Concierge: audited implementation package

**Edition 2026-11-14.qa1 · Monday launch target: November 16, 2026**

The completed research has been audited and improved, not restarted. This package replaces the earlier runtime candidate and the corresponding launch evaluation references. It is ready for integration into an isolated Codex preview, not a claim that the current Concierge has passed live testing.

## Start here

1. Read [the executive assessment](maintainer/executive_assessment.md) for the decision and material corrections.
2. Give Codex [the implementation prompt](maintainer/codex_implementation_prompt.md) with this complete package.
3. Use [the 50 priority answers](evaluation/priority_50.md) and [conversation tests](evaluation/conversation_tests.md) to review actual preview behavior.
4. Complete [the essential improvements](maintainer/essential_improvements.md) before any separate release decision.

## Deliverables

| Deliverable | Files | Use |
| --- | --- | --- |
| Executive assessment | `maintainer/executive_assessment.md` | Concise independent quality review |
| Corrected knowledge | `public/knowledge.json`, `knowledge.schema.json`, `knowledge.md`, `sources.md` | 31 models, 31 core facts, 18 observed Studio records and 52 source records |
| Launch-priority answers | `evaluation/priority_50.json` and `.md` | 50 source-grounded examples across all 10 categories, with 100 distinct conversational variations |
| Revised conversation evaluation | `evaluation/conversation_tests.json` and `.md` | 25 conversations, 75 context-specific reference answers and 15 confidentiality cases |
| Real security checks | `evaluation/transport_security_tests.json` | Eight transport, consent, data-access and failure specifications; A14 runs these instead of pretending an API attack is chat text |
| Monday actions | `maintainer/essential_improvements.md` | Six finite release checks and contained product unknowns |
| Codex handoff | `maintainer/codex_implementation_prompt.md` | One comprehensive implementation prompt preserving working functionality and production protections |
| Audit trail | `maintainer/review_ledger.json`, `evidence_audit.md` | Dispositions for all original 150 answers and the evidence/limitations |
| Offline checks | `evaluation/reference_matching.py`, `validate_audit.py`, `run_conversations.py`, `maintainer/validation_report.json` | Matching reference, artifact validation and a preview-response capture harness |

Only `public/knowledge.json` is eligible factual runtime input. The schema is a build/server validation aid. Do not index the whole package or the old FAQ. Evaluation and maintainer material remain offline. The full previous 150-answer document is historical review input, not an additional competing source of truth; the ledger maps its priority replacements.

## What has and has not passed

The corrected artifacts pass ten groups of structural and deterministic checks. The 150 original answers and all 75 conversation references received an editorial/evidence review. Targeted fresh source checks confirmed the observed pricing controls and two drawing discrepancies. These checks do not establish actual LLM behavior, privacy configuration, live security or successful inquiry delivery.

Run the existing application checks, the 50 answers, 25 conversations and security/transport cases in the actual current preview using synthetic data and mocked lead delivery. The adapter for that current preview contract must be implemented by Codex. A captured response is not automatically a semantic pass.

```bash
python -m pip show jsonschema
python evaluation/validate_audit.py
python evaluation/run_conversations.py --output /tmp/house-delivery-preview-results.json --adapter python /absolute/path/preview_adapter.py
```

`validate_audit.py` requires Python and `jsonschema`. The capture harness uses the Python standard library. Do not run a test adapter against production or send real lead emails.

No production website change, price change, supplier inquiry or new sourcing work was made. Deployment and activation remain separate decisions.
