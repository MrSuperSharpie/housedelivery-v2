# Vero Permit Inspection Template Audit Packet

**Generated:** 2026-07-05 · **Mode:** Read-only documentation / extraction · **No app logic, templates, or production files were changed.**

This packet is a human-readable printout of the inspection stage and checklist template
data that currently exists in the Vero Permit (formerly SiteLine) codebase, for the two
seeded jurisdictions:

- **Vancouver Building By-law 2025** (`vbbl_2025`)
- **British Columbia Building Code 2024** (`bcbc_2024`)

> **Read this first — three parallel stage models exist.** The codebase does not have a
> single "inspection template" source of truth. Three overlapping stage systems coexist,
> and they do **not** all agree on stage numbering, titles, or content. This packet is
> built from the **jurisdiction-aware database template data** (System B below), because
> that is the *only* place VBBL 2025 and BCBC 2024 are represented as distinct template
> sets. The richer per-item pass/fail/evidence data (System C) is jurisdiction-agnostic
> and is documented separately in Appendix A. Please read **Section 0** before relying on
> any stage title.

---

## Section 0 — Source of Truth

### 0.1 Where the data lives

| # | System | File(s) | What it holds | Jurisdiction-aware? | Used by |
|---|--------|---------|---------------|---------------------|---------|
| **A** | Legacy TypeScript phases | `src/lib/inspectionTemplates.ts` | 9 trade/structural *phases* (EXC, FND, FRM, INS, FOC + RIP, RIE, FPL, FEL). Per item: `item_name`, `description`, `is_critical`, `code_ref`. | No (Vancouver-only, single set) | Builder wizard "View Code" panels / stage code references |
| **B** | **DB checklist templates** | `supabase/migrations/20260427010000_inspector_stage_engine.sql` (schema), `..._20260427020000_inspection_stage_seeds.sql` (15 stages), `..._20260427030000_checklist_template_seeds.sql` (4 stages × 2 jx), `..._20260428010000_checklist_remaining_stages.sql` (11 stages × 2 jx), `..._20260605000000_correct_inspection_stage_labels_s10_s15.sql` (stage renames) | **15 stages × 2 jurisdictions.** Per item: `label`, `requirement_text`, `item_type` (always `boolean`), `is_required`, `legal_reference`, `source_title`, `source_url`. Stage-level seal gate + dependency graph. | **Yes** (`bcbc_2024`, `vbbl_2025`) | `resolveActiveTemplate.ts` → inspector stage reference page / Vero-resolved scope panel |
| **C** | Runtime completion model | `src/lib/inspectorCompletion.ts` (`RAW_STAGES`, ~4,800 lines) | Permit-centric 15-stage model. Per item: `passWhen`, `failWhen`, `pendingWhen`, `requiredEvidence`, `optionalEvidence`, `evidenceMode`, `permitType`, `responsibleParty`, `documentUploadRequired`, `ahjNotes`, `dependencies`, `codeReferences[]` (with per-reference `isVbblOnly` flag). | Partial (single item set; only individual *code references* carry an `isVbblOnly` flag) | Inspector completion workspace, admin checklist picker, stage visibility logic |

**This packet's spine is System B** (the two seed migrations + the schema + the rename
migration), because it is the authoritative jurisdiction-split template data and it is what
`resolveActiveTemplate.ts` actually serves per project city
(`city === 'vancouver'` → `vbbl_2025`; everything else → `bcbc_2024`).

System C is documented in **Appendix A**. System A is legacy and is noted in **Appendix B**.

### 0.2 The data model does *not* encode per-item evidence or pass/fail/hold (System B)

This is the single most important finding for anyone expecting a rich per-item checklist.
In the jurisdiction template data (System B), **every** checklist item is:

- `item_type = 'boolean'` — a yes/no inspector-confirmation item. There is **no**
  per-item field for photo / video / notes / pin-drop / file-upload.
- `is_required = true` — every seeded item is required (no optional items, no N/A flags).

Consequently, the user-requested per-item fields map as follows for **all** System B items
(they are uniform, so they are stated once per stage rather than fabricated per item):

- **Evidence required:** Inspector confirmation (boolean). Supplemental photo/file upload is
  available in the completion workspace UI but is **not** a required, template-defined field.
- **Pass condition:** Inspector confirms the requirement statement is met for this permit.
- **Corrections Required / Fail condition:** Inspector cannot confirm the requirement; the
  item is left incomplete/flagged, which blocks the stage seal (see 0.3).
- **Hold condition:** Not modelled at the item level. "Hold" behaviour is enforced at the
  **stage** level by the dependency lock + seal gate (see 0.3).
- **N/A condition:** Not modelled. No item carries an N/A path in the template data.

Per-item pass/fail/pending(=hold)/evidence logic **does** exist — but only in **System C**
(`inspectorCompletion.ts`), which is jurisdiction-agnostic. See Appendix A.

### 0.3 Pass / seal / lock logic (stage level) — `seal_inspection_stage` RPC

Defined in `20260427010000_inspector_stage_engine.sql`. A stage can only be **sealed** when
**all** of the following hold:

1. The acting user has an `inspector_specialty` that is in the stage's `visible_to_specialties`
   (or is `master`, or `admin`). Stage 15 additionally requires a **master** seal.
2. **All dependency stages are already sealed** (`get_stage_lock_state`). If any dependency is
   unsealed, the stage is **locked** — this is the effective "hold" gate.
3. **Every `is_required` checklist item** across the stage's active templates has a
   `permit_checklist_responses` row with status `completed` or `approved`.

Seals are written to an **immutable, insert-only** `inspection_seals` audit table
(SHA-256 hashed payload). A sealed stage cannot be casually edited — writes go only through
the SECURITY DEFINER RPC. This satisfies the "sealed inspection must not be casually editable"
and "open holds/incomplete stages block final completion" rules.

### 0.4 ⚠ Critical mismatch — Stage titles (S10–S15) do not match their checklist content

Migration `20260428010000` created the templates for stages 10–15 keyed on the **original**
construction-model slugs. Migration `20260605000000` **later renamed** those same stage rows
to a permit-centric model — **but did not touch the templates or items attached to them.**
Because templates are joined by stage UUID (not slug), the renamed stage rows kept their old
checklist content. The result, which is what `resolveActiveTemplate.ts` renders today
(`S## — <renamed title>` header over the **old** item list):

| Stage # | Current stage title (rendered header) | Template title still attached | Items actually shown | Aligned? |
|--------|----------------------------------------|-------------------------------|----------------------|----------|
| 10 | **Electrical Permit and Scope** | Building Envelope | Envelope / air-barrier / cladding items | ❌ **Mismatch** |
| 11 | **Gas Permit and Mechanical / HVAC Scope** | Insulation & Vapour Barrier | Insulation / vapour-barrier items | ❌ **Mismatch** |
| 12 | **Insulation and Energy Compliance** | Drywall & Interior Finish | Fire-rated drywall / firestop items | ❌ **Mismatch** |
| 13 | **Interior Completion** | Life Safety Systems | Fire alarm / smoke / egress items | ❌ **Mismatch** |
| 14 | **Exterior Works and Site Finalization** | Final Site Grading | Grading / drainage items | ⚠ Intent aligned |
| 15 | **Inspections, Final Approval, and Occupancy** | Final Occupancy Permit | Occupancy / seal / Schedule C items | ⚠ Intent aligned |

Additionally, **stages 1–9** DB titles use the construction model
("Site Survey & Excavation", "Foundation Pour", …), which does **not** match System C's
S1–S9 permit-centric names ("Project Setup and Jurisdiction Check", "Planning and Site
Approvals", …). The two models only converge on titles for S10–S15 (and only after the rename).

> In each stage below, the heading shows the **current DB stage title** (what a user sees),
> and each stage lists the **template title + items actually attached**. Where they diverge,
> a ⚠ note is included.

### 0.5 Schedule C-B relevance

Schedule C-B (professional letters of assurance) is referenced in the template data only at
**Stage 15**, item "Schedules C-A and C-B or equivalent letters of assurance." Field-review
sign-off (Schedule B professionals) is implied throughout stages 2, 6, 8, 9 (many items cite
"BCBC 2024 Schedule B, …"). The Schedule C-B document itself is generated by
`src/components/builder/ScheduleCBGenerator.tsx` and gated by the `schedule-cb` API route —
neither was modified for this audit.

### 0.6 Is this mock / seed data?

The template content is **seed data** written directly in SQL migrations (idempotent
`ON CONFLICT DO UPDATE`). It is real, structured, code-referenced content — not random mock
fixtures — but it is **authored seed data**, not a live import from an official code database.
The `source_url` links point to public BC / City of Vancouver code pages. Treat the content as
Vero's authored checklist set, subject to professional review before operational use.

---

# Part 1 — Vancouver Building By-law 2025 (`vbbl_2025`)

Effective date seeded: **2025-01-01** · Code version label: **VBBL 2025**.

VBBL templates contain all BCBC items **plus** Vancouver-specific additions where present.
In the current seed, VBBL differs from BCBC in exactly two places:

- **Stage 9 (Plumbing):** VBBL adds item 9 — *Sewer/storm connection placard data* (9 items vs BCBC 8).
- **Stage 15 (Final Occupancy):** VBBL adds items 3, 4, 6, 7 — City of Vancouver occupancy-permit steps (7 items vs BCBC 3).

All other 13 stages are **identical** between the two jurisdictions.

_Uniform per-item fields for every item below (see §0.2): **Evidence** = inspector
confirmation (boolean; optional supplemental upload in workspace). **Pass** = inspector
confirms the requirement is met. **Fail / Corrections Required** = inspector cannot confirm →
item incomplete → stage seal blocked. **Hold** = enforced at stage level via dependency lock
(§0.3), not per item. **Required** = yes (all items)._

### Stage S01 — Site Survey & Excavation

| Field | Value |
|---|---|
| Stage number | S01 (phase 1 — Excavation & Foundation) |
| Stage title (current DB) | Site Survey & Excavation |
| Discipline / category | geotechnical |
| Visible to specialties | geotechnical, structural |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | None |
| Active template | Site Survey & Excavation — Vancouver Building By-law 2025 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Survey pins and property setbacks verified**
   - Inspector must verify: Confirm survey pins are in place and building location complies with required property setbacks per approved site plan.
   - Code reference: BCBC 2024 Part 8 / municipal zoning setback requirements
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
2. **Excavation dimensions match structural drawings**
   - Inspector must verify: Confirm excavation depth, width, and extent match the approved structural and site drawings.
   - Code reference: BCBC 2024 Schedule B, Geotechnical Permanent 8.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Underground utilities located and protected**
   - Inspector must verify: Confirm all underground utilities have been located and are adequately protected from excavation damage.
   - Code reference: BC One Call / municipal utility locate requirements
   - Source: BC One Call — https://www.bconecall.bc.ca
4. **Temporary erosion and sediment control in place**
   - Inspector must verify: Confirm silt fencing, rock check dams, or equivalent temporary erosion and sediment control measures are installed and functional.
   - Code reference: BCBC 2024 Part 8 / municipal stormwater requirements
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Soil conditions consistent with geotechnical report**
   - Inspector must verify: Confirm exposed subgrade soil conditions are consistent with the geotechnical engineer's report; no unexpected soft spots, fill, or groundwater.
   - Code reference: BCBC 2024 Schedule B, Geotechnical Permanent 8.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Excavation shoring and worker safety measures**
   - Inspector must verify: Confirm excavation shoring, benching, or sloping complies with WorkSafeBC regulations for worker safety.
   - Code reference: WorkSafeBC OHS Regulation Part 20
   - Source: WorkSafeBC — Occupational Health and Safety Regulation — https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-20-construction-excavation-and-demolition

**Audit questions — Stage S01:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S02 — Foundation Formwork & Rebar

| Field | Value |
|---|---|
| Stage number | S02 (phase 1 — Excavation & Foundation) |
| Stage title (current DB) | Foundation Formwork & Rebar |
| Discipline / category | structural |
| Visible to specialties | structural, geotechnical |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S01 |
| Active template | Foundation & Structural — Vancouver Building By-law 2025 (v1) |
| Checklist items | 8 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Structural capacity, anchorage, and seismic restraint**
   - Inspector must verify: Confirm structural capacity of foundation-related structural components, including anchorage and seismic restraint.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Deep foundations**
   - Inspector must verify: Confirm structural aspects of deep foundations where applicable.
   - Code reference: BCBC 2024 Schedule B, Structural 2.2
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Structural shop drawings**
   - Inspector must verify: Confirm review of applicable structural shop drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.3
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
4. **Dampproofing and waterproofing below grade**
   - Inspector must verify: Confirm dampproofing and/or waterproofing of walls and slabs below grade where applicable.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.17
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Site and foundation drainage**
   - Inspector must verify: Confirm site and foundation drainage systems where applicable.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.2
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Geotechnical bearing capacity of soil**
   - Inspector must verify: Confirm geotechnical bearing capacity of soil where applicable.
   - Code reference: BCBC 2024 Schedule B, Geotechnical Permanent 8.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
7. **Compaction of engineered fill**
   - Inspector must verify: Confirm compaction of engineered fill where applicable.
   - Code reference: BCBC 2024 Schedule B, Geotechnical Permanent 8.3
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
8. **Backfill and permanent dewatering**
   - Inspector must verify: Confirm backfill and permanent dewatering requirements where applicable.
   - Code reference: BCBC 2024 Schedule B, Geotechnical Permanent 8.5 and 8.6
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S02:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S03 — Foundation Pour

| Field | Value |
|---|---|
| Stage number | S03 (phase 1 — Excavation & Foundation) |
| Stage title (current DB) | Foundation Pour |
| Discipline / category | structural |
| Visible to specialties | structural, geotechnical |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S02 |
| Active template | Foundation Pour — Vancouver Building By-law 2025 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Concrete mix design and compressive strength confirmed**
   - Inspector must verify: Confirm concrete mix design meets specified compressive strength and that cylinder test reports are on file.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Foundation dimensions match structural drawings**
   - Inspector must verify: Confirm formed and poured foundation dimensions (width, depth, wall thickness) match approved structural drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Anchor bolts, hold-downs, and embedded hardware correct**
   - Inspector must verify: Confirm anchor bolt size, spacing, embedment depth, hold-down hardware, and any embedded plates match structural drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
4. **Drainage sleeves and utility penetrations in place**
   - Inspector must verify: Confirm all drainage sleeves, conduit sleeves, and utility penetrations are correctly placed before pour.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.2
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Damp-proofing or waterproofing applied**
   - Inspector must verify: Confirm damp-proofing or waterproofing membrane is applied to exterior of foundation walls below grade as required.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.17
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Curing and cold-weather protection measures**
   - Inspector must verify: Confirm adequate concrete curing measures are in place; cold-weather protection applied if ambient temperature is below 5°C.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1 / CSA A23.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S03:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S04 — Framing & Lock-up

| Field | Value |
|---|---|
| Stage number | S04 (phase 2 — Structure) |
| Stage title (current DB) | Framing & Lock-up |
| Discipline / category | structural |
| Visible to specialties | structural |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S03 |
| Active template | Framing & Lockup — Vancouver Building By-law 2025 (v1) |
| Checklist items | 7 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Structural framing matches approved drawings**
   - Inspector must verify: Confirm stud size, spacing, header and beam sizes, joist spans, and rafter spans match approved structural drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Shear wall nailing, hold-downs, and straps**
   - Inspector must verify: Confirm shear wall sheathing nailing pattern, hold-down hardware, and strap connections match lateral design drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Fire blocking and draft stopping installed**
   - Inspector must verify: Confirm fire blocking is installed at all concealed stud spaces at floor/ceiling intersections, stairs, and changes of direction; draft stopping in attic spaces.
   - Code reference: BCBC 2024 Part 3 / Part 9 — Fire blocking requirements
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Structural shop drawings reviewed**
   - Inspector must verify: Confirm review of applicable structural shop drawings including engineered wood products and custom connectors.
   - Code reference: BCBC 2024 Schedule B, Structural 2.3
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Weather-resistant barrier installed**
   - Inspector must verify: Confirm building wrap or equivalent weather-resistant barrier is installed with correct lapping, taping, and integration with window/door flanges.
   - Code reference: BCBC 2024 Part 5 — Dampproofing, Waterproofing and Water Management
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
6. **Windows and exterior doors installed and flashed**
   - Inspector must verify: Confirm windows and exterior doors are installed, plumb, and correctly flashed at head, jambs, and sill per manufacturer requirements.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
7. **Roof structure and bracing complete**
   - Inspector must verify: Confirm roof rafter or truss layout, bracing, and ridge connections are complete and match structural drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S04:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S05 — Roof Deck & Sheathing

| Field | Value |
|---|---|
| Stage number | S05 (phase 2 — Structure) |
| Stage title (current DB) | Roof Deck & Sheathing |
| Discipline / category | structural |
| Visible to specialties | structural, architectural |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S04 |
| Active template | Roof Deck & Sheathing — Vancouver Building By-law 2025 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Roof sheathing grade and nailing pattern**
   - Inspector must verify: Confirm roof sheathing panel grade and nailing pattern (size, spacing at field and edges) match structural drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Roof slope and drainage direction correct**
   - Inspector must verify: Confirm roof slope meets minimum requirements (typically 1:6 for shingles) and drains correctly to eaves or interior drains.
   - Code reference: BCBC 2024 Part 5 / Part 9 — Roof drainage
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
3. **Ice and water shield at eaves and valleys**
   - Inspector must verify: Confirm self-adhering ice and water shield membrane is installed at eaves (minimum 900mm past interior wall face) and in all valleys.
   - Code reference: BCBC 2024 Part 5 / Part 9 — Roofing
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Roofing underlayment installed**
   - Inspector must verify: Confirm roofing underlayment is installed over the full deck surface with correct lapping before finish roofing.
   - Code reference: BCBC 2024 Part 5 / Part 9 — Roofing
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Attic ventilation provisions installed**
   - Inspector must verify: Confirm attic ventilation ratio meets requirements (minimum 1:300 of attic floor area) with inlet at eaves and outlet at ridge or high on roof.
   - Code reference: BCBC 2024 Part 9 — Attic and Roof Space Ventilation
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
6. **Roof penetration and skylight flashings**
   - Inspector must verify: Confirm all roof penetrations (plumbing stacks, mechanical vents, skylights) are correctly flashed and counter-flashed.
   - Code reference: BCBC 2024 Part 5 / Part 9 — Flashings
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S05:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S06 — Mechanical Rough-In

| Field | Value |
|---|---|
| Stage number | S06 (phase 3 — Mechanical Rough-In) |
| Stage title (current DB) | Mechanical Rough-In |
| Discipline / category | mechanical |
| Visible to specialties | mechanical |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S04 |
| Active template | Mechanical Rough-In — Vancouver Building By-law 2025 (v1) |
| Checklist items | 7 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Mechanical systems match approved permit scope**
   - Inspector must verify: Confirm HVAC equipment, ductwork, and controls match the approved mechanical permit scope.
   - Code reference: BCBC 2024 Schedule B, Mechanical 5.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Gas line pressure test completed and documented**
   - Inspector must verify: Confirm gas piping pressure test has been completed, witnessed, and documented to the satisfaction of the authority having jurisdiction.
   - Code reference: BCBC 2024 Schedule B, Mechanical 5.2 / CSA B149.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Combustion air and venting requirements met**
   - Inspector must verify: Confirm combustion air supply and flue venting for all fuel-burning appliances meet code requirements and are correctly routed.
   - Code reference: BCBC 2024 Schedule B, Mechanical 5.3
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
4. **Fire dampers at rated assemblies**
   - Inspector must verify: Confirm fire dampers are installed where HVAC ducts penetrate fire-rated floor/ceiling or wall assemblies.
   - Code reference: BCBC 2024 Schedule B, Mechanical 5.4
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Duct support, clearances, and fire separation continuity**
   - Inspector must verify: Confirm duct hangers and supports are correct, clearances to combustibles are maintained, and fire separation continuity is preserved at penetrations.
   - Code reference: BCBC 2024 Schedule B, Mechanical 5.5
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Exhaust fan ducting to exterior**
   - Inspector must verify: Confirm all exhaust fan ducting (kitchen, bathrooms, dryers) terminates to exterior with approved termination cap and backdraft damper.
   - Code reference: BCBC 2024 Part 9 — Ventilation
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
7. **Mechanical shop drawings reviewed**
   - Inspector must verify: Confirm review of applicable mechanical shop drawings including custom equipment and controls.
   - Code reference: BCBC 2024 Schedule B, Mechanical 5.6
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S06:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S07 — Fire Suppression Rough-In

| Field | Value |
|---|---|
| Stage number | S07 (phase 3 — Mechanical Rough-In) |
| Stage title (current DB) | Fire Suppression Rough-In |
| Discipline / category | fire_protection |
| Visible to specialties | fire_suppression |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S04 |
| Active template | Fire Suppression Rough-In — Vancouver Building By-law 2025 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Sprinkler system matches approved hydraulic calculations**
   - Inspector must verify: Confirm sprinkler pipe sizing, head layout, and system design match the approved hydraulic calculations.
   - Code reference: BCBC 2024 Part 3 / NFPA 13 — Sprinkler Systems
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
2. **Pipe supports and hangers correct**
   - Inspector must verify: Confirm sprinkler pipe hangers, supports, and sway bracing are installed per NFPA 13 and match the approved drawings.
   - Code reference: BCBC 2024 Part 3 / NFPA 13
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
3. **Sprinkler head placement and coverage**
   - Inspector must verify: Confirm sprinkler head spacing, type, and orientation meet coverage requirements for the hazard classification.
   - Code reference: BCBC 2024 Part 3 / NFPA 13
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Concealed areas inspected before enclosure**
   - Inspector must verify: Confirm sprinkler piping in concealed spaces has been inspected and approved before wall or ceiling surfaces are installed.
   - Code reference: BCBC 2024 Part 3 / NFPA 13
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Water supply connection and backflow preventer**
   - Inspector must verify: Confirm water supply connection size and backflow preventer are correctly installed at the sprinkler system inlet.
   - Code reference: BCBC 2024 Part 3 / NFPA 13 / BC Plumbing Code
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
6. **System pressure test completed and documented**
   - Inspector must verify: Confirm hydrostatic pressure test has been completed at 200 psi (or 50 psi above system working pressure) for two hours, with results documented.
   - Code reference: BCBC 2024 Part 3 / NFPA 13 Section 24.2
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S07:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S08 — Electrical Rough-In

| Field | Value |
|---|---|
| Stage number | S08 (phase 3 — Mechanical Rough-In) |
| Stage title (current DB) | Electrical Rough-In |
| Discipline / category | electrical |
| Visible to specialties | electrical |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S04 |
| Active template | Electrical Rough-In — Vancouver Building By-law 2025 (v1) |
| Checklist items | 8 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Electrical systems match approved permit scope**
   - Inspector must verify: Confirm electrical systems and devices match the approved permit scope.
   - Code reference: VBBL inspection guidance / BCBC Schedule B, Electrical 6.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Fire separation continuity at electrical penetrations**
   - Inspector must verify: Confirm continuity of fire separations at electrical penetrations.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.2
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Functional testing of electrical fire emergency systems**
   - Inspector must verify: Confirm functional testing of electrical-related fire emergency systems and devices where applicable.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.3
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
4. **Electrical systems maintenance manuals**
   - Inspector must verify: Confirm electrical systems and device maintenance manuals where required.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.4
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Structural capacity and seismic restraint of electrical components**
   - Inspector must verify: Confirm structural capacity, anchorage, and seismic restraint of electrical components where applicable.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.5
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Clearances from buildings for electrical utility equipment**
   - Inspector must verify: Confirm required clearances from buildings for electrical utility equipment.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.6
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
7. **Fire protection of wiring for emergency systems**
   - Inspector must verify: Confirm fire protection of wiring for emergency systems where applicable.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.7
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
8. **Electrical shop drawings**
   - Inspector must verify: Confirm review of applicable electrical shop drawings.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.8
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S08:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S09 — Plumbing Rough-In

| Field | Value |
|---|---|
| Stage number | S09 (phase 3 — Mechanical Rough-In) |
| Stage title (current DB) | Plumbing Rough-In |
| Discipline / category | plumbing |
| Visible to specialties | plumbing |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S04 |
| Active template | Plumbing Rough-In — Vancouver Building By-law 2025 (v1) |
| Checklist items | 9 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Plumbing systems match approved permit scope**
   - Inspector must verify: Confirm plumbing systems and devices match the approved permit scope.
   - Code reference: BC Plumbing Code 2024 / BCBC Schedule B, Plumbing 4.3
   - Source: BC Plumbing Code 2024 — https://www.bccodes.ca/bc-plumbing-code.html
2. **Roof drainage systems**
   - Inspector must verify: Confirm roof drainage systems where applicable.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Site and foundation drainage systems**
   - Inspector must verify: Confirm site and foundation drainage systems where applicable.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.2
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
4. **Fire separation continuity at plumbing penetrations**
   - Inspector must verify: Confirm continuity of fire separations at plumbing penetrations.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.4
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Functional testing of plumbing fire emergency systems**
   - Inspector must verify: Confirm functional testing of plumbing-related fire emergency systems and devices where applicable.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.5
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Plumbing systems maintenance manuals**
   - Inspector must verify: Confirm plumbing systems maintenance manuals where required.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.6
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
7. **Structural capacity and seismic restraint of plumbing components**
   - Inspector must verify: Confirm structural capacity, anchorage, and seismic restraint of plumbing components where applicable.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.7
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
8. **Plumbing shop drawings**
   - Inspector must verify: Confirm review of applicable plumbing shop drawings.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.8
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
9. **Sewer/storm connection placard data**
   - Inspector must verify: Confirm sewer/storm connection placard data is complete and matches installed conditions where Vancouver sewer/storm inspection applies.
   - Code reference: City of Vancouver sewer connection placard inspection guidance
   - Source: City of Vancouver — Plumbing and Drainage Permits — https://vancouver.ca/home-property-development/plumbing-drainage-permits.aspx

**Audit questions — Stage S09:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? VBBL-specific item(s) present (see count vs BCBC).

### Stage S10 — Electrical Permit and Scope

> ⚠ **Title / content mismatch (see §0.4).** The stage row is titled **"Electrical Permit and Scope"**, but the checklist template still attached to it is **"Building Envelope"** — its items below describe *Building Envelope*, not *Electrical Permit and Scope*.

| Field | Value |
|---|---|
| Stage number | S10 (phase 4 — Envelope & Insulation) |
| Stage title (current DB) | Electrical Permit and Scope |
| Discipline / category | electrical |
| Visible to specialties | electrical |
| Professional review / sign-off | See items |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S05 |
| Active template | Building Envelope — Vancouver Building By-law 2025 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Building enclosure design and performance confirmed**
   - Inspector must verify: Confirm building enclosure design, materials, and performance criteria have been reviewed and comply with the approved drawings.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Weather-resistant barrier continuity at penetrations**
   - Inspector must verify: Confirm weather-resistant barrier is continuous at all penetrations, window/door rough openings, and transitions between cladding systems.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.2
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Cladding drainage plane and ventilation gap**
   - Inspector must verify: Confirm exterior cladding has a functional drainage plane and ventilation gap (rainscreen) where required by the enclosure design.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.3
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
4. **Glazing systems and curtain wall performance**
   - Inspector must verify: Confirm glazing system or curtain wall installation matches approved specifications; thermal performance requirements met.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.4
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Air barrier continuity confirmed**
   - Inspector must verify: Confirm air barrier is continuous across all six faces of the building envelope with properly sealed transitions and penetrations.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.5 / Part 5
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Building enclosure shop drawings reviewed**
   - Inspector must verify: Confirm review of applicable building enclosure shop drawings including window systems, curtain wall, and specialty cladding.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.6
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S10:**
- Missing items? ⚠ Content belongs to "Building Envelope", so items for "Electrical Permit and Scope" are effectively missing.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? Sequence/label mismatch flagged above.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S11 — Gas Permit and Mechanical / HVAC Scope

> ⚠ **Title / content mismatch (see §0.4).** The stage row is titled **"Gas Permit and Mechanical / HVAC Scope"**, but the checklist template still attached to it is **"Insulation & Vapour Barrier"** — its items below describe *Insulation & Vapour Barrier*, not *Gas Permit and Mechanical / HVAC Scope*.

| Field | Value |
|---|---|
| Stage number | S11 (phase 4 — Envelope & Insulation) |
| Stage title (current DB) | Gas Permit and Mechanical / HVAC Scope |
| Discipline / category | mechanical |
| Visible to specialties | mechanical |
| Professional review / sign-off | See items |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S06, S08, S09, S07 |
| Active template | Insulation & Vapour Barrier — Vancouver Building By-law 2025 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Insulation R-values meet energy code requirements**
   - Inspector must verify: Confirm insulation R-values in walls, ceilings, and floors meet or exceed BCBC Part 10 / Step Code energy requirements for the climate zone.
   - Code reference: BCBC 2024 Part 10 — Energy and Water Efficiency / BC Energy Step Code
   - Source: BC Building Code 2024 — Part 10 — https://www.bccodes.ca/bc-building-code.html
2. **Vapour barrier continuity (6 mil poly or equivalent)**
   - Inspector must verify: Confirm vapour barrier (minimum 6 mil polyethylene or approved equivalent) is installed on the warm side of insulation with sealed laps and penetrations.
   - Code reference: BCBC 2024 Part 9 — Vapour Barriers / Part 5
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
3. **Air sealing at electrical boxes and penetrations**
   - Inspector must verify: Confirm electrical boxes, plumbing penetrations, and all other vapour barrier penetrations are air-sealed with approved sealant or gaskets.
   - Code reference: BCBC 2024 Part 9 — Air Barriers
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Attic insulation baffles installed**
   - Inspector must verify: Confirm attic ventilation baffles are installed at eaves to maintain minimum 63mm clear airway above insulation.
   - Code reference: BCBC 2024 Part 9 — Attic and Roof Space Ventilation
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Rim joist insulation and air sealing**
   - Inspector must verify: Confirm rim joists are insulated and air-sealed to prevent thermal bridging and convective heat loss at floor perimeters.
   - Code reference: BCBC 2024 Part 9 / BC Energy Step Code
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
6. **Thermal bridging at intersecting assemblies addressed**
   - Inspector must verify: Confirm thermal bridging is addressed at all structural penetrations, corners, and intersections between insulated assemblies.
   - Code reference: BCBC 2024 Part 10 / BC Energy Step Code
   - Source: BC Building Code 2024 — Part 10 — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S11:**
- Missing items? ⚠ Content belongs to "Insulation & Vapour Barrier", so items for "Gas Permit and Mechanical / HVAC Scope" are effectively missing.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? Sequence/label mismatch flagged above.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S12 — Insulation and Energy Compliance

> ⚠ **Title / content mismatch (see §0.4).** The stage row is titled **"Insulation and Energy Compliance"**, but the checklist template still attached to it is **"Drywall & Interior Finish"** — its items below describe *Drywall & Interior Finish*, not *Insulation and Energy Compliance*.

| Field | Value |
|---|---|
| Stage number | S12 (phase 5 — Interior & Life Safety) |
| Stage title (current DB) | Insulation and Energy Compliance |
| Discipline / category | (multi-discipline / none) |
| Visible to specialties | architectural, mechanical, electrical, plumbing |
| Professional review / sign-off | See items |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S11, S10 |
| Active template | Drywall & Interior Finish — Vancouver Building By-law 2025 (v1) |
| Checklist items | 5 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Fire-rated assemblies correctly constructed**
   - Inspector must verify: Confirm fire-rated wall and floor/ceiling assemblies are constructed with correct ULC-listed board type, thickness, fastener pattern, and number of layers.
   - Code reference: BCBC 2024 Part 3 / Part 9 — Fire Resistance Ratings
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
2. **Fire-rated penetration firestopping**
   - Inspector must verify: Confirm all penetrations through fire-rated assemblies (plumbing, electrical, mechanical) are firestopped with ULC-listed systems matching the assembly rating.
   - Code reference: BCBC 2024 Part 3 — Penetrations in Fire Separations
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
3. **Suite-to-suite sound insulation**
   - Inspector must verify: Confirm sound insulation (minimum STC 50) is installed in party walls and floor/ceiling assemblies between dwelling units.
   - Code reference: BCBC 2024 Part 9 — Sound Transmission
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Shaft wall and service chase construction**
   - Inspector must verify: Confirm shaft walls enclosing elevator hoistways, mechanical shafts, and service chases are built to the required fire resistance rating.
   - Code reference: BCBC 2024 Part 3 — Vertical Openings and Shafts
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Stairwell and corridor fire separation continuity**
   - Inspector must verify: Confirm fire separation continuity at stairwells and exit corridors including at ceiling/floor junctions and at concealed spaces.
   - Code reference: BCBC 2024 Part 3 — Means of Egress
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S12:**
- Missing items? ⚠ Content belongs to "Drywall & Interior Finish", so items for "Insulation and Energy Compliance" are effectively missing.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? Sequence/label mismatch flagged above.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S13 — Interior Completion

> ⚠ **Title / content mismatch (see §0.4).** The stage row is titled **"Interior Completion"**, but the checklist template still attached to it is **"Life Safety Systems"** — its items below describe *Life Safety Systems*, not *Interior Completion*.

| Field | Value |
|---|---|
| Stage number | S13 (phase 5 — Interior & Life Safety) |
| Stage title (current DB) | Interior Completion |
| Discipline / category | architectural |
| Visible to specialties | architectural |
| Professional review / sign-off | See items |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S12 |
| Active template | Life Safety Systems — Vancouver Building By-law 2025 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Fire alarm system functional test completed**
   - Inspector must verify: Confirm fire alarm system has been functionally tested to ULC-S537 by a qualified technician and test report is on file.
   - Code reference: BCBC 2024 Part 3 / ULC-S537 — Fire Alarm Systems
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
2. **Smoke and CO detector placement**
   - Inspector must verify: Confirm smoke alarms are installed on every floor, outside sleeping areas, and inside bedrooms; CO alarms installed adjacent to sleeping areas where required.
   - Code reference: BCBC 2024 Part 9 — Smoke and CO Alarms
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
3. **Emergency lighting and exit signs functional**
   - Inspector must verify: Confirm emergency lighting provides minimum 10 lux at floor level on egress paths; exit signs are illuminated and visible from required distances.
   - Code reference: BCBC 2024 Part 3 — Emergency Lighting and Exit Signs
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Sprinkler system final acceptance test**
   - Inspector must verify: Confirm sprinkler system final acceptance test has been completed per NFPA 13 including main drain test and inspector test flow.
   - Code reference: BCBC 2024 Part 3 / NFPA 13
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Means of egress complete and unobstructed**
   - Inspector must verify: Confirm all exit doors, corridors, and stairwells meet required widths, door swing, hardware, and are clear of obstructions.
   - Code reference: BCBC 2024 Part 3 — Means of Egress
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
6. **Building civic address visible from street**
   - Inspector must verify: Confirm civic address numbers are installed and clearly visible from the street and from the direction of emergency vehicle approach.
   - Code reference: BCBC 2024 Part 3 / municipal addressing bylaw
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S13:**
- Missing items? ⚠ Content belongs to "Life Safety Systems", so items for "Interior Completion" are effectively missing.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? Sequence/label mismatch flagged above.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S14 — Exterior Works and Site Finalization

| Field | Value |
|---|---|
| Stage number | S14 (phase 6 — Final) |
| Stage title (current DB) | Exterior Works and Site Finalization |
| Discipline / category | (multi-discipline / none) |
| Visible to specialties | geotechnical, structural, architectural |
| Professional review / sign-off | See items |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S03 |
| Active template | Final Site Grading — Vancouver Building By-law 2025 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Grade slopes away from foundation**
   - Inspector must verify: Confirm finished grade slopes away from the building at minimum 2% (1:50) for at least 1.5m from the foundation wall on all sides.
   - Code reference: BCBC 2024 Part 9 — Site Drainage
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
2. **Swales and drainage channels functional**
   - Inspector must verify: Confirm surface swales and drainage channels are graded and positioned to direct stormwater away from the building and to the approved discharge point.
   - Code reference: BCBC 2024 Part 9 — Site Drainage / municipal stormwater requirements
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
3. **Paved surfaces sloped to drain**
   - Inspector must verify: Confirm driveways, walkways, and paved areas are sloped at minimum 1% to drain away from the building and toward catch basins or curbs.
   - Code reference: BCBC 2024 Part 9 — Site Drainage
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Retaining walls permitted and inspected**
   - Inspector must verify: Confirm any retaining walls over 1.0m in height have been permitted, engineered, and inspected.
   - Code reference: BCBC 2024 Part 4 / Part 9 — Retaining Walls
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Stormwater management compliant with municipal requirements**
   - Inspector must verify: Confirm stormwater management measures (infiltration, detention, or connection to municipal storm) comply with municipal requirements and the approved site servicing design.
   - Code reference: Municipal stormwater management requirements / BCBC 2024 Part 9
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
6. **Erosion and sediment controls removed or stabilized**
   - Inspector must verify: Confirm temporary erosion and sediment controls have been removed and disturbed areas are stabilized with vegetation, mulch, or hard landscaping.
   - Code reference: BCBC 2024 Part 9 / municipal stormwater requirements
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S14:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S15 — Inspections, Final Approval, and Occupancy

| Field | Value |
|---|---|
| Stage number | S15 (phase 6 — Final) |
| Stage title (current DB) | Inspections, Final Approval, and Occupancy |
| Discipline / category | (multi-discipline / none) |
| Visible to specialties | (none — master seal gate) |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Yes — C-A / C-B collection item present |
| Requires master seal | Yes — Stage requires a **master inspector** seal |
| Depends on stages | S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14 |
| Active template | Final Occupancy Permit — Vancouver Building By-law 2025 (v1) |
| Checklist items | 7 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Prerequisite specialty stages digitally sealed**
   - Inspector must verify: Confirm all required prerequisite specialty stages are digitally sealed.
   - Code reference: Vero Permit dependency rule
   - Source: Vero Permit — Stage Dependency Gate
2. **Final inspection passed or ready for authority review**
   - Inspector must verify: Confirm final inspection has passed or is ready for authority review.
   - Code reference: BC building permit process — final inspection guidance
   - Source: BC Housing — Building Permit Process — https://www.bchousing.org/licensing-consumer-protection/building-safety/building-permits
3. **Occupancy permit identified for commercial or multi-unit residential**
   - Inspector must verify: Confirm required occupancy permit is identified for commercial or multi-unit residential occupancy before use.
   - Code reference: City of Vancouver Occupancy Permit guidance
   - Source: City of Vancouver — Occupancy Permits — https://vancouver.ca/home-property-development/occupancy-permits.aspx
4. **Issued permits in place before occupancy application**
   - Inspector must verify: Confirm issued permits authorizing the work are in place before occupancy permit application.
   - Code reference: City of Vancouver Occupancy Permit Step 2
   - Source: City of Vancouver — Occupancy Permits — https://vancouver.ca/home-property-development/occupancy-permits.aspx
5. **Schedules C-A and C-B or equivalent letters of assurance**
   - Inspector must verify: Confirm Schedules C-A and C-B or equivalent letters of assurance are collected where required.
   - Code reference: BC Letters of Assurance guidance
   - Source: BC Housing — Letters of Assurance — https://www.bchousing.org/licensing-consumer-protection/building-safety/letters-of-assurance
6. **Required agency reviews complete**
   - Inspector must verify: Confirm required fire/life-safety, Vancouver Fire and Rescue, Vancouver Coastal Health, Environmental Protection, grease interceptor, or similar agency reviews are complete where applicable.
   - Code reference: City of Vancouver Occupancy Permit Step 3
   - Source: City of Vancouver — Occupancy Permits — https://vancouver.ca/home-property-development/occupancy-permits.aspx
7. **Permit terms and outstanding deficiencies resolved**
   - Inspector must verify: Confirm permit terms, conditions, and outstanding deficiencies are resolved or clearly recorded.
   - Code reference: City of Vancouver Occupancy Permit guidance
   - Source: City of Vancouver — Occupancy Permits — https://vancouver.ca/home-property-development/occupancy-permits.aspx

**Audit questions — Stage S15:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? VBBL-specific item(s) present (see count vs BCBC).

---

# Part 2 — British Columbia Building Code 2024 (`bcbc_2024`)

Effective date seeded: **2024-03-08** · Code version label: **BCBC 2024**.

BCBC templates are the base set. They are **identical to Part 1 (VBBL 2025)** for 13 of 15 stages. BCBC has **fewer** items than VBBL at exactly two stages:

- **Stage S09 (Plumbing):** BCBC 8 items — VBBL adds a 9th (Sewer/storm connection placard).
- **Stage S15 (Final Occupancy):** BCBC 3 items — VBBL adds 4 City-of-Vancouver occupancy items.

_Same uniform per-item field model as Part 1 (§0.2)._

### Stage S01 — Site Survey & Excavation

| Field | Value |
|---|---|
| Stage number | S01 (phase 1 — Excavation & Foundation) |
| Stage title (current DB) | Site Survey & Excavation |
| Discipline / category | geotechnical |
| Visible to specialties | geotechnical, structural |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | None |
| Active template | Site Survey & Excavation — BC Building Code 2024 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Survey pins and property setbacks verified**
   - Inspector must verify: Confirm survey pins are in place and building location complies with required property setbacks per approved site plan.
   - Code reference: BCBC 2024 Part 8 / municipal zoning setback requirements
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
2. **Excavation dimensions match structural drawings**
   - Inspector must verify: Confirm excavation depth, width, and extent match the approved structural and site drawings.
   - Code reference: BCBC 2024 Schedule B, Geotechnical Permanent 8.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Underground utilities located and protected**
   - Inspector must verify: Confirm all underground utilities have been located and are adequately protected from excavation damage.
   - Code reference: BC One Call / municipal utility locate requirements
   - Source: BC One Call — https://www.bconecall.bc.ca
4. **Temporary erosion and sediment control in place**
   - Inspector must verify: Confirm silt fencing, rock check dams, or equivalent temporary erosion and sediment control measures are installed and functional.
   - Code reference: BCBC 2024 Part 8 / municipal stormwater requirements
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Soil conditions consistent with geotechnical report**
   - Inspector must verify: Confirm exposed subgrade soil conditions are consistent with the geotechnical engineer's report; no unexpected soft spots, fill, or groundwater.
   - Code reference: BCBC 2024 Schedule B, Geotechnical Permanent 8.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Excavation shoring and worker safety measures**
   - Inspector must verify: Confirm excavation shoring, benching, or sloping complies with WorkSafeBC regulations for worker safety.
   - Code reference: WorkSafeBC OHS Regulation Part 20
   - Source: WorkSafeBC — Occupational Health and Safety Regulation — https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-20-construction-excavation-and-demolition

**Audit questions — Stage S01:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S02 — Foundation Formwork & Rebar

| Field | Value |
|---|---|
| Stage number | S02 (phase 1 — Excavation & Foundation) |
| Stage title (current DB) | Foundation Formwork & Rebar |
| Discipline / category | structural |
| Visible to specialties | structural, geotechnical |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S01 |
| Active template | Foundation & Structural — BC Building Code 2024 (v1) |
| Checklist items | 8 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Structural capacity, anchorage, and seismic restraint**
   - Inspector must verify: Confirm structural capacity of foundation-related structural components, including anchorage and seismic restraint.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Deep foundations**
   - Inspector must verify: Confirm structural aspects of deep foundations where applicable.
   - Code reference: BCBC 2024 Schedule B, Structural 2.2
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Structural shop drawings**
   - Inspector must verify: Confirm review of applicable structural shop drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.3
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
4. **Dampproofing and waterproofing below grade**
   - Inspector must verify: Confirm dampproofing and/or waterproofing of walls and slabs below grade where applicable.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.17
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Site and foundation drainage**
   - Inspector must verify: Confirm site and foundation drainage systems where applicable.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.2
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Geotechnical bearing capacity of soil**
   - Inspector must verify: Confirm geotechnical bearing capacity of soil where applicable.
   - Code reference: BCBC 2024 Schedule B, Geotechnical Permanent 8.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
7. **Compaction of engineered fill**
   - Inspector must verify: Confirm compaction of engineered fill where applicable.
   - Code reference: BCBC 2024 Schedule B, Geotechnical Permanent 8.3
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
8. **Backfill and permanent dewatering**
   - Inspector must verify: Confirm backfill and permanent dewatering requirements where applicable.
   - Code reference: BCBC 2024 Schedule B, Geotechnical Permanent 8.5 and 8.6
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S02:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S03 — Foundation Pour

| Field | Value |
|---|---|
| Stage number | S03 (phase 1 — Excavation & Foundation) |
| Stage title (current DB) | Foundation Pour |
| Discipline / category | structural |
| Visible to specialties | structural, geotechnical |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S02 |
| Active template | Foundation Pour — BC Building Code 2024 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Concrete mix design and compressive strength confirmed**
   - Inspector must verify: Confirm concrete mix design meets specified compressive strength and that cylinder test reports are on file.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Foundation dimensions match structural drawings**
   - Inspector must verify: Confirm formed and poured foundation dimensions (width, depth, wall thickness) match approved structural drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Anchor bolts, hold-downs, and embedded hardware correct**
   - Inspector must verify: Confirm anchor bolt size, spacing, embedment depth, hold-down hardware, and any embedded plates match structural drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
4. **Drainage sleeves and utility penetrations in place**
   - Inspector must verify: Confirm all drainage sleeves, conduit sleeves, and utility penetrations are correctly placed before pour.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.2
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Damp-proofing or waterproofing applied**
   - Inspector must verify: Confirm damp-proofing or waterproofing membrane is applied to exterior of foundation walls below grade as required.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.17
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Curing and cold-weather protection measures**
   - Inspector must verify: Confirm adequate concrete curing measures are in place; cold-weather protection applied if ambient temperature is below 5°C.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1 / CSA A23.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S03:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S04 — Framing & Lock-up

| Field | Value |
|---|---|
| Stage number | S04 (phase 2 — Structure) |
| Stage title (current DB) | Framing & Lock-up |
| Discipline / category | structural |
| Visible to specialties | structural |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S03 |
| Active template | Framing & Lockup — BC Building Code 2024 (v1) |
| Checklist items | 7 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Structural framing matches approved drawings**
   - Inspector must verify: Confirm stud size, spacing, header and beam sizes, joist spans, and rafter spans match approved structural drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Shear wall nailing, hold-downs, and straps**
   - Inspector must verify: Confirm shear wall sheathing nailing pattern, hold-down hardware, and strap connections match lateral design drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Fire blocking and draft stopping installed**
   - Inspector must verify: Confirm fire blocking is installed at all concealed stud spaces at floor/ceiling intersections, stairs, and changes of direction; draft stopping in attic spaces.
   - Code reference: BCBC 2024 Part 3 / Part 9 — Fire blocking requirements
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Structural shop drawings reviewed**
   - Inspector must verify: Confirm review of applicable structural shop drawings including engineered wood products and custom connectors.
   - Code reference: BCBC 2024 Schedule B, Structural 2.3
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Weather-resistant barrier installed**
   - Inspector must verify: Confirm building wrap or equivalent weather-resistant barrier is installed with correct lapping, taping, and integration with window/door flanges.
   - Code reference: BCBC 2024 Part 5 — Dampproofing, Waterproofing and Water Management
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
6. **Windows and exterior doors installed and flashed**
   - Inspector must verify: Confirm windows and exterior doors are installed, plumb, and correctly flashed at head, jambs, and sill per manufacturer requirements.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
7. **Roof structure and bracing complete**
   - Inspector must verify: Confirm roof rafter or truss layout, bracing, and ridge connections are complete and match structural drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S04:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S05 — Roof Deck & Sheathing

| Field | Value |
|---|---|
| Stage number | S05 (phase 2 — Structure) |
| Stage title (current DB) | Roof Deck & Sheathing |
| Discipline / category | structural |
| Visible to specialties | structural, architectural |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S04 |
| Active template | Roof Deck & Sheathing — BC Building Code 2024 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Roof sheathing grade and nailing pattern**
   - Inspector must verify: Confirm roof sheathing panel grade and nailing pattern (size, spacing at field and edges) match structural drawings.
   - Code reference: BCBC 2024 Schedule B, Structural 2.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Roof slope and drainage direction correct**
   - Inspector must verify: Confirm roof slope meets minimum requirements (typically 1:6 for shingles) and drains correctly to eaves or interior drains.
   - Code reference: BCBC 2024 Part 5 / Part 9 — Roof drainage
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
3. **Ice and water shield at eaves and valleys**
   - Inspector must verify: Confirm self-adhering ice and water shield membrane is installed at eaves (minimum 900mm past interior wall face) and in all valleys.
   - Code reference: BCBC 2024 Part 5 / Part 9 — Roofing
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Roofing underlayment installed**
   - Inspector must verify: Confirm roofing underlayment is installed over the full deck surface with correct lapping before finish roofing.
   - Code reference: BCBC 2024 Part 5 / Part 9 — Roofing
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Attic ventilation provisions installed**
   - Inspector must verify: Confirm attic ventilation ratio meets requirements (minimum 1:300 of attic floor area) with inlet at eaves and outlet at ridge or high on roof.
   - Code reference: BCBC 2024 Part 9 — Attic and Roof Space Ventilation
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
6. **Roof penetration and skylight flashings**
   - Inspector must verify: Confirm all roof penetrations (plumbing stacks, mechanical vents, skylights) are correctly flashed and counter-flashed.
   - Code reference: BCBC 2024 Part 5 / Part 9 — Flashings
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S05:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S06 — Mechanical Rough-In

| Field | Value |
|---|---|
| Stage number | S06 (phase 3 — Mechanical Rough-In) |
| Stage title (current DB) | Mechanical Rough-In |
| Discipline / category | mechanical |
| Visible to specialties | mechanical |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S04 |
| Active template | Mechanical Rough-In — BC Building Code 2024 (v1) |
| Checklist items | 7 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Mechanical systems match approved permit scope**
   - Inspector must verify: Confirm HVAC equipment, ductwork, and controls match the approved mechanical permit scope.
   - Code reference: BCBC 2024 Schedule B, Mechanical 5.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Gas line pressure test completed and documented**
   - Inspector must verify: Confirm gas piping pressure test has been completed, witnessed, and documented to the satisfaction of the authority having jurisdiction.
   - Code reference: BCBC 2024 Schedule B, Mechanical 5.2 / CSA B149.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Combustion air and venting requirements met**
   - Inspector must verify: Confirm combustion air supply and flue venting for all fuel-burning appliances meet code requirements and are correctly routed.
   - Code reference: BCBC 2024 Schedule B, Mechanical 5.3
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
4. **Fire dampers at rated assemblies**
   - Inspector must verify: Confirm fire dampers are installed where HVAC ducts penetrate fire-rated floor/ceiling or wall assemblies.
   - Code reference: BCBC 2024 Schedule B, Mechanical 5.4
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Duct support, clearances, and fire separation continuity**
   - Inspector must verify: Confirm duct hangers and supports are correct, clearances to combustibles are maintained, and fire separation continuity is preserved at penetrations.
   - Code reference: BCBC 2024 Schedule B, Mechanical 5.5
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Exhaust fan ducting to exterior**
   - Inspector must verify: Confirm all exhaust fan ducting (kitchen, bathrooms, dryers) terminates to exterior with approved termination cap and backdraft damper.
   - Code reference: BCBC 2024 Part 9 — Ventilation
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
7. **Mechanical shop drawings reviewed**
   - Inspector must verify: Confirm review of applicable mechanical shop drawings including custom equipment and controls.
   - Code reference: BCBC 2024 Schedule B, Mechanical 5.6
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S06:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S07 — Fire Suppression Rough-In

| Field | Value |
|---|---|
| Stage number | S07 (phase 3 — Mechanical Rough-In) |
| Stage title (current DB) | Fire Suppression Rough-In |
| Discipline / category | fire_protection |
| Visible to specialties | fire_suppression |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S04 |
| Active template | Fire Suppression Rough-In — BC Building Code 2024 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Sprinkler system matches approved hydraulic calculations**
   - Inspector must verify: Confirm sprinkler pipe sizing, head layout, and system design match the approved hydraulic calculations.
   - Code reference: BCBC 2024 Part 3 / NFPA 13 — Sprinkler Systems
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
2. **Pipe supports and hangers correct**
   - Inspector must verify: Confirm sprinkler pipe hangers, supports, and sway bracing are installed per NFPA 13 and match the approved drawings.
   - Code reference: BCBC 2024 Part 3 / NFPA 13
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
3. **Sprinkler head placement and coverage**
   - Inspector must verify: Confirm sprinkler head spacing, type, and orientation meet coverage requirements for the hazard classification.
   - Code reference: BCBC 2024 Part 3 / NFPA 13
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Concealed areas inspected before enclosure**
   - Inspector must verify: Confirm sprinkler piping in concealed spaces has been inspected and approved before wall or ceiling surfaces are installed.
   - Code reference: BCBC 2024 Part 3 / NFPA 13
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Water supply connection and backflow preventer**
   - Inspector must verify: Confirm water supply connection size and backflow preventer are correctly installed at the sprinkler system inlet.
   - Code reference: BCBC 2024 Part 3 / NFPA 13 / BC Plumbing Code
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
6. **System pressure test completed and documented**
   - Inspector must verify: Confirm hydrostatic pressure test has been completed at 200 psi (or 50 psi above system working pressure) for two hours, with results documented.
   - Code reference: BCBC 2024 Part 3 / NFPA 13 Section 24.2
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S07:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S08 — Electrical Rough-In

| Field | Value |
|---|---|
| Stage number | S08 (phase 3 — Mechanical Rough-In) |
| Stage title (current DB) | Electrical Rough-In |
| Discipline / category | electrical |
| Visible to specialties | electrical |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S04 |
| Active template | Electrical Rough-In — BC Building Code 2024 (v1) |
| Checklist items | 8 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Electrical systems match approved permit scope**
   - Inspector must verify: Confirm electrical systems and devices match the approved permit scope.
   - Code reference: VBBL inspection guidance / BCBC Schedule B, Electrical 6.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Fire separation continuity at electrical penetrations**
   - Inspector must verify: Confirm continuity of fire separations at electrical penetrations.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.2
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Functional testing of electrical fire emergency systems**
   - Inspector must verify: Confirm functional testing of electrical-related fire emergency systems and devices where applicable.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.3
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
4. **Electrical systems maintenance manuals**
   - Inspector must verify: Confirm electrical systems and device maintenance manuals where required.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.4
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Structural capacity and seismic restraint of electrical components**
   - Inspector must verify: Confirm structural capacity, anchorage, and seismic restraint of electrical components where applicable.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.5
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Clearances from buildings for electrical utility equipment**
   - Inspector must verify: Confirm required clearances from buildings for electrical utility equipment.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.6
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
7. **Fire protection of wiring for emergency systems**
   - Inspector must verify: Confirm fire protection of wiring for emergency systems where applicable.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.7
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
8. **Electrical shop drawings**
   - Inspector must verify: Confirm review of applicable electrical shop drawings.
   - Code reference: BCBC 2024 Schedule B, Electrical 6.8
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S08:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S09 — Plumbing Rough-In

| Field | Value |
|---|---|
| Stage number | S09 (phase 3 — Mechanical Rough-In) |
| Stage title (current DB) | Plumbing Rough-In |
| Discipline / category | plumbing |
| Visible to specialties | plumbing |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S04 |
| Active template | Plumbing Rough-In — BC Building Code 2024 (v1) |
| Checklist items | 8 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Plumbing systems match approved permit scope**
   - Inspector must verify: Confirm plumbing systems and devices match the approved permit scope.
   - Code reference: BC Plumbing Code 2024 / BCBC Schedule B, Plumbing 4.3
   - Source: BC Plumbing Code 2024 — https://www.bccodes.ca/bc-plumbing-code.html
2. **Roof drainage systems**
   - Inspector must verify: Confirm roof drainage systems where applicable.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Site and foundation drainage systems**
   - Inspector must verify: Confirm site and foundation drainage systems where applicable.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.2
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
4. **Fire separation continuity at plumbing penetrations**
   - Inspector must verify: Confirm continuity of fire separations at plumbing penetrations.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.4
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Functional testing of plumbing fire emergency systems**
   - Inspector must verify: Confirm functional testing of plumbing-related fire emergency systems and devices where applicable.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.5
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Plumbing systems maintenance manuals**
   - Inspector must verify: Confirm plumbing systems maintenance manuals where required.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.6
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
7. **Structural capacity and seismic restraint of plumbing components**
   - Inspector must verify: Confirm structural capacity, anchorage, and seismic restraint of plumbing components where applicable.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.7
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
8. **Plumbing shop drawings**
   - Inspector must verify: Confirm review of applicable plumbing shop drawings.
   - Code reference: BCBC 2024 Schedule B, Plumbing 4.8
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S09:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S10 — Electrical Permit and Scope

> ⚠ **Title / content mismatch (see §0.4).** The stage row is titled **"Electrical Permit and Scope"**, but the checklist template still attached to it is **"Building Envelope"** — its items below describe *Building Envelope*, not *Electrical Permit and Scope*.

| Field | Value |
|---|---|
| Stage number | S10 (phase 4 — Envelope & Insulation) |
| Stage title (current DB) | Electrical Permit and Scope |
| Discipline / category | electrical |
| Visible to specialties | electrical |
| Professional review / sign-off | See items |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S05 |
| Active template | Building Envelope — BC Building Code 2024 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Building enclosure design and performance confirmed**
   - Inspector must verify: Confirm building enclosure design, materials, and performance criteria have been reviewed and comply with the approved drawings.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.1
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
2. **Weather-resistant barrier continuity at penetrations**
   - Inspector must verify: Confirm weather-resistant barrier is continuous at all penetrations, window/door rough openings, and transitions between cladding systems.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.2
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
3. **Cladding drainage plane and ventilation gap**
   - Inspector must verify: Confirm exterior cladding has a functional drainage plane and ventilation gap (rainscreen) where required by the enclosure design.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.3
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
4. **Glazing systems and curtain wall performance**
   - Inspector must verify: Confirm glazing system or curtain wall installation matches approved specifications; thermal performance requirements met.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.4
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
5. **Air barrier continuity confirmed**
   - Inspector must verify: Confirm air barrier is continuous across all six faces of the building envelope with properly sealed transitions and penetrations.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.5 / Part 5
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html
6. **Building enclosure shop drawings reviewed**
   - Inspector must verify: Confirm review of applicable building enclosure shop drawings including window systems, curtain wall, and specialty cladding.
   - Code reference: BCBC 2024 Schedule B, Architectural 1.6
   - Source: BC Building Code 2024 — Schedule B Letters of Assurance — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S10:**
- Missing items? ⚠ Content belongs to "Building Envelope", so items for "Electrical Permit and Scope" are effectively missing.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? Sequence/label mismatch flagged above.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S11 — Gas Permit and Mechanical / HVAC Scope

> ⚠ **Title / content mismatch (see §0.4).** The stage row is titled **"Gas Permit and Mechanical / HVAC Scope"**, but the checklist template still attached to it is **"Insulation & Vapour Barrier"** — its items below describe *Insulation & Vapour Barrier*, not *Gas Permit and Mechanical / HVAC Scope*.

| Field | Value |
|---|---|
| Stage number | S11 (phase 4 — Envelope & Insulation) |
| Stage title (current DB) | Gas Permit and Mechanical / HVAC Scope |
| Discipline / category | mechanical |
| Visible to specialties | mechanical |
| Professional review / sign-off | See items |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S06, S08, S09, S07 |
| Active template | Insulation & Vapour Barrier — BC Building Code 2024 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Insulation R-values meet energy code requirements**
   - Inspector must verify: Confirm insulation R-values in walls, ceilings, and floors meet or exceed BCBC Part 10 / Step Code energy requirements for the climate zone.
   - Code reference: BCBC 2024 Part 10 — Energy and Water Efficiency / BC Energy Step Code
   - Source: BC Building Code 2024 — Part 10 — https://www.bccodes.ca/bc-building-code.html
2. **Vapour barrier continuity (6 mil poly or equivalent)**
   - Inspector must verify: Confirm vapour barrier (minimum 6 mil polyethylene or approved equivalent) is installed on the warm side of insulation with sealed laps and penetrations.
   - Code reference: BCBC 2024 Part 9 — Vapour Barriers / Part 5
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
3. **Air sealing at electrical boxes and penetrations**
   - Inspector must verify: Confirm electrical boxes, plumbing penetrations, and all other vapour barrier penetrations are air-sealed with approved sealant or gaskets.
   - Code reference: BCBC 2024 Part 9 — Air Barriers
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Attic insulation baffles installed**
   - Inspector must verify: Confirm attic ventilation baffles are installed at eaves to maintain minimum 63mm clear airway above insulation.
   - Code reference: BCBC 2024 Part 9 — Attic and Roof Space Ventilation
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Rim joist insulation and air sealing**
   - Inspector must verify: Confirm rim joists are insulated and air-sealed to prevent thermal bridging and convective heat loss at floor perimeters.
   - Code reference: BCBC 2024 Part 9 / BC Energy Step Code
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
6. **Thermal bridging at intersecting assemblies addressed**
   - Inspector must verify: Confirm thermal bridging is addressed at all structural penetrations, corners, and intersections between insulated assemblies.
   - Code reference: BCBC 2024 Part 10 / BC Energy Step Code
   - Source: BC Building Code 2024 — Part 10 — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S11:**
- Missing items? ⚠ Content belongs to "Insulation & Vapour Barrier", so items for "Gas Permit and Mechanical / HVAC Scope" are effectively missing.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? Sequence/label mismatch flagged above.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S12 — Insulation and Energy Compliance

> ⚠ **Title / content mismatch (see §0.4).** The stage row is titled **"Insulation and Energy Compliance"**, but the checklist template still attached to it is **"Drywall & Interior Finish"** — its items below describe *Drywall & Interior Finish*, not *Insulation and Energy Compliance*.

| Field | Value |
|---|---|
| Stage number | S12 (phase 5 — Interior & Life Safety) |
| Stage title (current DB) | Insulation and Energy Compliance |
| Discipline / category | (multi-discipline / none) |
| Visible to specialties | architectural, mechanical, electrical, plumbing |
| Professional review / sign-off | See items |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S11, S10 |
| Active template | Drywall & Interior Finish — BC Building Code 2024 (v1) |
| Checklist items | 5 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Fire-rated assemblies correctly constructed**
   - Inspector must verify: Confirm fire-rated wall and floor/ceiling assemblies are constructed with correct ULC-listed board type, thickness, fastener pattern, and number of layers.
   - Code reference: BCBC 2024 Part 3 / Part 9 — Fire Resistance Ratings
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
2. **Fire-rated penetration firestopping**
   - Inspector must verify: Confirm all penetrations through fire-rated assemblies (plumbing, electrical, mechanical) are firestopped with ULC-listed systems matching the assembly rating.
   - Code reference: BCBC 2024 Part 3 — Penetrations in Fire Separations
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
3. **Suite-to-suite sound insulation**
   - Inspector must verify: Confirm sound insulation (minimum STC 50) is installed in party walls and floor/ceiling assemblies between dwelling units.
   - Code reference: BCBC 2024 Part 9 — Sound Transmission
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Shaft wall and service chase construction**
   - Inspector must verify: Confirm shaft walls enclosing elevator hoistways, mechanical shafts, and service chases are built to the required fire resistance rating.
   - Code reference: BCBC 2024 Part 3 — Vertical Openings and Shafts
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Stairwell and corridor fire separation continuity**
   - Inspector must verify: Confirm fire separation continuity at stairwells and exit corridors including at ceiling/floor junctions and at concealed spaces.
   - Code reference: BCBC 2024 Part 3 — Means of Egress
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S12:**
- Missing items? ⚠ Content belongs to "Drywall & Interior Finish", so items for "Insulation and Energy Compliance" are effectively missing.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? Sequence/label mismatch flagged above.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S13 — Interior Completion

> ⚠ **Title / content mismatch (see §0.4).** The stage row is titled **"Interior Completion"**, but the checklist template still attached to it is **"Life Safety Systems"** — its items below describe *Life Safety Systems*, not *Interior Completion*.

| Field | Value |
|---|---|
| Stage number | S13 (phase 5 — Interior & Life Safety) |
| Stage title (current DB) | Interior Completion |
| Discipline / category | architectural |
| Visible to specialties | architectural |
| Professional review / sign-off | See items |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S12 |
| Active template | Life Safety Systems — BC Building Code 2024 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Fire alarm system functional test completed**
   - Inspector must verify: Confirm fire alarm system has been functionally tested to ULC-S537 by a qualified technician and test report is on file.
   - Code reference: BCBC 2024 Part 3 / ULC-S537 — Fire Alarm Systems
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
2. **Smoke and CO detector placement**
   - Inspector must verify: Confirm smoke alarms are installed on every floor, outside sleeping areas, and inside bedrooms; CO alarms installed adjacent to sleeping areas where required.
   - Code reference: BCBC 2024 Part 9 — Smoke and CO Alarms
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
3. **Emergency lighting and exit signs functional**
   - Inspector must verify: Confirm emergency lighting provides minimum 10 lux at floor level on egress paths; exit signs are illuminated and visible from required distances.
   - Code reference: BCBC 2024 Part 3 — Emergency Lighting and Exit Signs
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Sprinkler system final acceptance test**
   - Inspector must verify: Confirm sprinkler system final acceptance test has been completed per NFPA 13 including main drain test and inspector test flow.
   - Code reference: BCBC 2024 Part 3 / NFPA 13
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Means of egress complete and unobstructed**
   - Inspector must verify: Confirm all exit doors, corridors, and stairwells meet required widths, door swing, hardware, and are clear of obstructions.
   - Code reference: BCBC 2024 Part 3 — Means of Egress
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
6. **Building civic address visible from street**
   - Inspector must verify: Confirm civic address numbers are installed and clearly visible from the street and from the direction of emergency vehicle approach.
   - Code reference: BCBC 2024 Part 3 / municipal addressing bylaw
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S13:**
- Missing items? ⚠ Content belongs to "Life Safety Systems", so items for "Interior Completion" are effectively missing.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? Sequence/label mismatch flagged above.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S14 — Exterior Works and Site Finalization

| Field | Value |
|---|---|
| Stage number | S14 (phase 6 — Final) |
| Stage title (current DB) | Exterior Works and Site Finalization |
| Discipline / category | (multi-discipline / none) |
| Visible to specialties | geotechnical, structural, architectural |
| Professional review / sign-off | See items |
| Schedule C-B relevant | Indirect (Schedule B references) |
| Requires master seal | No (specialty inspector seal) |
| Depends on stages | S03 |
| Active template | Final Site Grading — BC Building Code 2024 (v1) |
| Checklist items | 6 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Grade slopes away from foundation**
   - Inspector must verify: Confirm finished grade slopes away from the building at minimum 2% (1:50) for at least 1.5m from the foundation wall on all sides.
   - Code reference: BCBC 2024 Part 9 — Site Drainage
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
2. **Swales and drainage channels functional**
   - Inspector must verify: Confirm surface swales and drainage channels are graded and positioned to direct stormwater away from the building and to the approved discharge point.
   - Code reference: BCBC 2024 Part 9 — Site Drainage / municipal stormwater requirements
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
3. **Paved surfaces sloped to drain**
   - Inspector must verify: Confirm driveways, walkways, and paved areas are sloped at minimum 1% to drain away from the building and toward catch basins or curbs.
   - Code reference: BCBC 2024 Part 9 — Site Drainage
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
4. **Retaining walls permitted and inspected**
   - Inspector must verify: Confirm any retaining walls over 1.0m in height have been permitted, engineered, and inspected.
   - Code reference: BCBC 2024 Part 4 / Part 9 — Retaining Walls
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
5. **Stormwater management compliant with municipal requirements**
   - Inspector must verify: Confirm stormwater management measures (infiltration, detention, or connection to municipal storm) comply with municipal requirements and the approved site servicing design.
   - Code reference: Municipal stormwater management requirements / BCBC 2024 Part 9
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html
6. **Erosion and sediment controls removed or stabilized**
   - Inspector must verify: Confirm temporary erosion and sediment controls have been removed and disturbed areas are stabilized with vegetation, mulch, or hard landscaping.
   - Code reference: BCBC 2024 Part 9 / municipal stormwater requirements
   - Source: BC Building Code 2024 — https://www.bccodes.ca/bc-building-code.html

**Audit questions — Stage S14:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

### Stage S15 — Inspections, Final Approval, and Occupancy

| Field | Value |
|---|---|
| Stage number | S15 (phase 6 — Final) |
| Stage title (current DB) | Inspections, Final Approval, and Occupancy |
| Discipline / category | (multi-discipline / none) |
| Visible to specialties | (none — master seal gate) |
| Professional review / sign-off | Schedule B field-review references present |
| Schedule C-B relevant | Yes — C-A / C-B collection item present |
| Requires master seal | Yes — Stage requires a **master inspector** seal |
| Depends on stages | S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14 |
| Active template | Final Occupancy Permit — BC Building Code 2024 (v1) |
| Checklist items | 3 (all required, all boolean confirmation) |

**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.

**Checklist items:**

1. **Prerequisite specialty stages digitally sealed**
   - Inspector must verify: Confirm all required prerequisite specialty stages are digitally sealed.
   - Code reference: Vero Permit dependency rule
   - Source: Vero Permit — Stage Dependency Gate
2. **Final inspection passed or ready for authority review**
   - Inspector must verify: Confirm final inspection has passed or is ready for authority review.
   - Code reference: BC building permit process — final inspection guidance
   - Source: BC Housing — Building Permit Process — https://www.bchousing.org/licensing-consumer-protection/building-safety/building-permits
3. **Schedules C-A and C-B or equivalent letters of assurance**
   - Inspector must verify: Confirm Schedules C-A and C-B or equivalent letters of assurance are collected where required.
   - Code reference: BC Letters of Assurance guidance
   - Source: BC Housing — Letters of Assurance — https://www.bchousing.org/licensing-consumer-protection/building-safety/letters-of-assurance

**Audit questions — Stage S15:**
- Missing items? Coverage is at a professional-summary level; field-measurement sub-items are not itemised.
- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.
- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.
- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.
- Vague / duplicated / out of sequence? No duplication within the stage.
- Missing jurisdiction-specific requirements? None beyond the shared BCBC set for this stage.

---

# Part 3 — Final Summary

| Metric | VBBL 2025 | BCBC 2024 |
|---|---|---|
| Stages defined (`inspection_stages`) | 15 | 15 |
| Stages with a seeded template | 15 / 15 | 15 / 15 |
| Total checklist items | 99 | 94 |
| &nbsp;&nbsp;S01 Site Survey & Excavation | 6 | 6 |
| &nbsp;&nbsp;S02 Foundation Formwork & Rebar | 8 | 8 |
| &nbsp;&nbsp;S03 Foundation Pour | 6 | 6 |
| &nbsp;&nbsp;S04 Framing & Lock-up | 7 | 7 |
| &nbsp;&nbsp;S05 Roof Deck & Sheathing | 6 | 6 |
| &nbsp;&nbsp;S06 Mechanical Rough-In | 7 | 7 |
| &nbsp;&nbsp;S07 Fire Suppression Rough-In | 6 | 6 |
| &nbsp;&nbsp;S08 Electrical Rough-In | 8 | 8 |
| &nbsp;&nbsp;S09 Plumbing Rough-In | 9 | 8 |
| &nbsp;&nbsp;S10 Electrical Permit and Scope | 6 | 6 |
| &nbsp;&nbsp;S11 Gas Permit and Mechanical / HVAC Scope | 6 | 6 |
| &nbsp;&nbsp;S12 Insulation and Energy Compliance | 5 | 5 |
| &nbsp;&nbsp;S13 Interior Completion | 6 | 6 |
| &nbsp;&nbsp;S14 Exterior Works and Site Finalization | 6 | 6 |
| &nbsp;&nbsp;S15 Inspections, Final Approval, and Occupancy | 7 | 3 |

**Findings:**
- **All 15 stages present** for both jurisdictions; every stage has a seeded, non-empty template. No stage has zero items.
- **No stage has per-item evidence requirements** — the template model is boolean-only (§0.2). Evidence/pass/fail/pending live in System C (Appendix A), which is jurisdiction-agnostic.
- **⚠ Stages 10–13 show a title/content mismatch** (§0.4): the stage was renamed to a permit-centric label but kept the old construction-model checklist. Stages 14–15 are intent-aligned despite a title change.
- **Stages 1–9 titles** use the construction model and do **not** match System C's permit-centric S1–S9 names — terminology is inconsistent across the two models.
- **Jurisdiction divergence is minimal:** only S09 (+1 VBBL item) and S15 (+4 VBBL items). All other stages are byte-identical between jurisdictions in the seed.
- **Suspected seed/authored data:** all content is authored SQL seed (idempotent upserts), not a live code-database import. Requires professional review before operational reliance.
- **Source-of-truth uncertainty:** three parallel models (A/B/C, §0.1). The jurisdiction split exists only in System B; the completion workspace runs on System C; the builder "View Code" panel uses System A.

---

# Appendix A — Runtime completion model (System C, jurisdiction-agnostic)

`src/lib/inspectorCompletion.ts` → `RAW_STAGES` defines the 15 permit-centric stages the inspector completion workspace actually runs. Unlike System B it carries, **per item**: `passWhen`, `failWhen`, `pendingWhen` (= hold), `requiredEvidence`, `optionalEvidence`, `evidenceMode` (`required_upload` | `verify_existing`), `documentUploadRequired`, `responsibleParty`, `ahjNotes`, `dependencies`, and `codeReferences[]` with a per-reference `isVbblOnly` flag. This is the correct place to look for the photo/upload/pass/fail/hold detail. It is **not** split into two jurisdictions — a single item set is served, with individual code references flagged VBBL-only.

| S# | System C stage name (runtime) | System B stage title (DB, this packet) | Same? |
|---|---|---|---|
| S01 | Project Setup and Jurisdiction Check | Site Survey & Excavation | ❌ |
| S02 | Planning and Site Approvals | Foundation Formwork & Rebar | ❌ |
| S03 | Building Permit Submission Package | Foundation Pour | ❌ |
| S04 | Site Prep and Pre-Excavation | Framing & Lock-up | ❌ |
| S05 | Footings, Foundation, and Slab | Roof Deck & Sheathing | ❌ |
| S06 | Structural Frame | Mechanical Rough-In | ❌ |
| S07 | Building Envelope | Fire Suppression Rough-In | ❌ |
| S08 | Fire and Life Safety | Electrical Rough-In | ❌ |
| S09 | Plumbing Permit and Scope | Plumbing Rough-In | ❌ |
| S10 | Electrical Permit and Scope | Electrical Permit and Scope | ✅ |
| S11 | Gas Permit and Mechanical / HVAC Scope | Gas Permit and Mechanical / HVAC Scope | ✅ |
| S12 | Insulation and Energy Compliance | Insulation and Energy Compliance | ✅ |
| S13 | Interior Completion | Interior Completion | ✅ |
| S14 | Exterior Works and Site Finalization | Exterior Works and Site Finalization | ✅ |
| S15 | Inspections, Final Approval, and Occupancy | Inspections, Final Approval, and Occupancy | ✅ |

---

# Appendix B — Legacy phase model (System A)

`src/lib/inspectionTemplates.ts` → `INSPECTION_PHASES`: 9 phases (EXC, FND, FRM, INS, FOC + trade phases RIP, RIE, FPL, FEL), Vancouver-only, per item `item_name` / `description` / `is_critical` / `code_ref`. No jurisdiction split, no evidence fields, no 15-stage numbering. Selected by builder stage number + discipline via `getPhasesForStage()`; routing only covers builder stages 1–5, so it does not map cleanly onto the 15-stage models. Retained for the builder wizard "View Code" reference panels.

