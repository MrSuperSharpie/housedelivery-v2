# Evidence audit and limits

Audit edition: 2026-11-14.qa1. Launch target: Monday, November 16, 2026. This audit uses the completed November 13 research, with targeted verification of uncertain points. The edition date is UTC.

## What was checked

- Read all 150 original questions/answers, all 75 conversation turns and all 15 adversarial cases. Each original Q&A has a disposition in `review_ledger.json`; the 50 priority references are traced back to their original IDs.
- Cross-checked all 31 model records against the retained primary model-page evidence, including architectural headline areas, bedrooms, bathrooms and storeys, compact known/unknown fields, and the linked catalogue schedules. This is verification of published statements, not independent measurement, structural review or certification.
- Reviewed the existing approved snapshot and the previously retrieved implementation files, including chat route, model, retrieval, transport contracts, conversation logic, security and rendering. The inspected feature commit was `ed89b0e18d98d857419d9b34b89f4c3cef07594d`. This audit did not claim that it remains the current deployed head.
- Freshly retrieved the Salt Spring page. It still displays $250 Premium/$300 Signature residence controls. A search service returned a month-old cached page with different rates; that stale cache was not admitted as current evidence. CAD and planning-only scope are traced separately to the already-approved customer-facing snapshot statement.
- Downloaded the two already-known conflicting reference PDFs directly from House Delivery. Visually inspected BC Duplex A001 (PDF page 2), which says three storeys and two three-bedroom/2.5-bathroom homes. Visually inspected Sixplex A001 (page 2), confirming the mixed unit schedule and three-plus-two-storey composition, and A010 (page 9), confirming 573.9 m² gross area. The source register records the fresh binary hashes.
- Reopened the official CMHC catalogue terms. Kept the supported distinction between a reference design and a project-specific design/approval, without adding legal or funding conclusions.

## Correction scope

All 31 models are retained. Seven full scraped catalogue bodies were removed from `features`; they were not suitable sanitized facts. The 31 core facts were edited where needed for clear scope, pricing provenance and default-tier ambiguity. The 18 Studio records retain only previously observed choices, not assumed complete configurator inventories. Sources remain public pages/PDFs or the explicitly identified approved public pricing statement, not private emails or supplier files.

Material safety review looked for supplier/manufacturer identities, private correspondence, internal purchasing figures, margin/markup values, confidential agreements and customer records. None is included in the corrected factual runtime input. Automated scans and closed schemas supplement this review; they are not a proof that prompting alone can prevent disclosure or invention.

## Limits that matter

The audit did not execute the live Concierge, inspect the current Vercel deployment, submit an inquiry, exercise every Studio control, independently measure every floor plan or validate code compliance. The inspected lead implementation was not completely re-audited at its current head. Provider processing and retention must be checked against actual configuration before making privacy statements. The capture harness and transport fixtures are instructions for real preview testing, not test results.

Original source URLs, collection dates and review methods are preserved in `public/sources.md` and `public/knowledge.json`. They are sufficient for targeted maintenance; another broad product-research pass is unnecessary. No private raw evidence is distributed in this package.
