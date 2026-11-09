# Vero Permit Inspection Evidence Matrix Audit

## Executive summary

The current Vero Permit inspection packet is **not ready to enforce evidence requirements directly from the jurisdiction templates**. The packet itself shows that the jurisdiction-aware database templates are still boolean-only, with no encoded per-item evidence rules, no N/A logic, and no item-level hold logic, while a separate runtime completion model already carries richer pass/fail/pending/evidence behavior. The packet also documents a critical title/content mismatch for Stages S10–S13, meaning any evidence matrix must be tied to the **actual attached checklist content**, not merely the rendered stage headers. fileciteturn0file0turn0file2

For launch, the safest practical position is this: use **System B** as the authoritative inventory of jurisdiction-specific checklist rows, use **System C** as the temporary source for evidence/outcome semantics, and normalize both into a single canonical stage-row-evidence model before production automation. The Province confirms that BC Building Code 2024 applies outside Vancouver, while Vancouver uses its own 2025 Building By-law with Vancouver-specific provisions; the City also makes clear that permitting, inspections, and occupancy are separate administrative controls. citeturn26view0turn19view1turn23view0turn31view1

My launch recommendation is:

- **P0 launch-critical**: require evidence before pass only for concealed work, test/commissioning results, permit-status or occupancy-status gates, professional assurance documents, and any item where work will be difficult to verify after the next construction step.
- **P1 recommended**: require evidence only when a row is failed, corrected, held, or marked N/A, especially for visible conditions that can be revisited.
- **Human review required before automation**: all rows that are really “scope applicability” checks, many “shop drawings/maintenance manuals” rows, and all rows affected by the S10–S13 title/content mismatch. fileciteturn0file0

## Basis and decision rules

This matrix is built from the packet’s actual checklist rows, normalized to the **99 unique VBBL rows** in the packet. BCBC 2024 uses the same matrix **except** for the five Vancouver-only rows: **S09.9** and **S15.3, S15.4, S15.6, S15.7**. The packet states that VBBL 2025 has 15 stages and 99 items, BCBC 2024 has 15 stages and 94 items, and that the two jurisdictions are identical across the other 13 stages. fileciteturn0file0

The decision rules below follow the user’s principle and the official BC/Vancouver workflow context:

Evidence should be mandatory before pass where the work is concealed, tied to tests or commissioning, tied to permits or occupancy/agency clearance, or likely to create disputes later. Vancouver’s inspection guidance states that work is inspected at various stages and can trigger extra cost when work progresses beyond the inspection point and must be uncovered again, which strongly supports required evidence for concealed-stage rows. Vancouver also requires approved permits and drawings to be on site for inspection, treats occupancy as a separate step after final inspection, and may require approvals from agencies such as Vancouver Fire and Rescue Services and Vancouver Coastal Health before occupancy is issued. citeturn22view0turn23view0turn31view1

For professional assurance, the Province’s Letters of Assurance page confirms that Schedules A, B, C-A, and C-B are mandatory accountability documents where applicable. The provincial guide explains that Letters of Assurance are legal accountability documents, that registered professionals of record provide assurance of field review through Schedules B and C-B, and that the authority having jurisdiction receives and checks the documents but must not request them outside their regulatory scope. The same guide also explains phased occupancies and the limits on partial C-A/C-B use. citeturn18view0turn29view1turn29view2turn30view0

### Classification legend

| Class | Meaning |
|---|---|
| **A** | Required before Pass |
| **B** | Required only if Corrections Required |
| **C** | Required only if Hold / Cannot Proceed |
| **D** | Required only if N/A is selected |
| **E** | Recommended but not required |
| **F** | Not required |

### Launch priority legend

| Priority | Meaning |
|---|---|
| **P0** | Launch-critical. Implement before pilot enforcement |
| **P1** | Strong improvement. Implement next |
| **P2** | Optional/low-friction refinement after inspector review |

## Launch-critical requirements

The **highest-value P0 evidence controls** are concentrated in six places.

First, require **pre-pass photo/note evidence** for concealed structural and enclosure work: foundations, anchor bolts, drainage sleeves, dampproofing, framing connections, fire blocking, shear-wall nailing, roof underlayment, firestopping, air/vapour barriers, insulation, and rated assemblies. Those conditions become difficult or impossible to verify without demolition once work proceeds. Vancouver’s inspection process explicitly recognizes the problem of work progressing beyond the inspection point. fileciteturn0file0 citeturn31view1

Second, require **test-result or formal document evidence** before pass on pressure tests, concrete cylinder reports, fire alarm testing, sprinkler acceptance testing, occupancy permit status, agency reviews, and Schedules C-A/C-B where required. Those are not good candidates for simple checkbox confirmation. The City’s occupancy process and the provincial Letters of Assurance framework both support documentary evidence here. citeturn23view0turn18view0turn29view1turn29view2

Third, any **Hold / Cannot Proceed** selection should force at least a field note and usually a photo or permit/status proof. Holds should be reserved for missing prerequisite permits, inaccessible/unsafe site conditions, missing required tests, missing agency approvals, or missing professional assurance documents. Vancouver’s inspection guidance identifies inaccessible or unsafe sites and missing readiness as valid reasons the inspection cannot proceed. citeturn31view1

Fourth, every **N/A** decision should force a concise justification note, and for scope-driven rows it should often force a supporting document or scope note naming the permit set, drawings, or professional scope relied on. This is especially important for generic rows such as deep foundations, shop drawings, maintenance manuals, seismic restraint of specialty components, and curtain wall/glazing rows that are not universally applicable. fileciteturn0file0

Fifth, **S10–S13 cannot be automated safely by stage title**. The packet shows the displayed stage titles do not match the attached checklists. The matrix below therefore follows the attached content, not the rendered header. fileciteturn0file0turn0file2

Sixth, **S15.1 should be system-validated, not upload-driven**. “Prerequisite specialty stages digitally sealed” is a platform-state control, not a field evidence row. That one should remain F and be enforced by system logic. The packet already describes stage dependency and sealing logic. fileciteturn0file0

## Recommended improvements

The current jurisdiction templates are too shallow to carry this evidence policy safely by themselves. The packet says System B contains only label, requirement text, item type, required flag, legal reference, and source metadata, while System C already contains pass/fail/pending logic, required/optional evidence, evidence mode, responsible party, dependencies, and code references. That means the safest implementation path is not to invent a fourth rule system, but to **merge System B row inventory and jurisdiction scoping with System C evidence semantics** into one normalized template model. fileciteturn0file0turn0file2

I would also strongly recommend converting many “where applicable” rows into **conditional visibility rows** rather than relying on inspectors to choose N/A repeatedly. That change would reduce field friction and produce cleaner audit records. The rows most in need of that treatment are deep foundations, sprinkler/hose/curtain-wall specialty rows, maintenance manuals, some functional-testing rows currently placed in rough-in stages, and several shop-drawing rows. fileciteturn0file0

The City’s permit and inspection workflow suggests another design improvement: separate evidence into three buckets in the UI. One bucket for **construction observation evidence** such as photos and notes, one for **status evidence** such as permit or occupancy proof, and one for **professional assurance evidence** such as Schedules C-A/C-B or engineer/architect letters. That separation will prevent users from confusing municipal inspection observation with registered-professional field review or occupancy administration. citeturn22view0turn23view0turn18view0turn29view2

## Items needing professional or AHJ review

Several rows in the packet should not be locked into automated evidence rules without a human inspector, registered professional, or code-official review.

The most important group is the **professional reliance group**: structural shop drawings, mechanical/electrical/plumbing shop drawings, maintenance manuals, building enclosure design/performance, and several seismic-restraint rows. These may be proper document-presence checks, but they may also be better handled as professional field-review confirmation rather than municipal or third-party inspector evidence uploads. The provincial guidance makes clear that Letters of Assurance identify the responsibilities of coordinating and discipline professionals, and that supporting professionals may provide sealed reports or related documents without directly signing Schedules B/C-B. citeturn18view0turn29view2

The second group is the **scope/applicability group**: deep foundations, curtain walls, emergency-system wiring protection, emergency electrical functional testing in rough-in, plumbing fire-emergency testing in rough-in, retaining walls, and some sewer/water servicing rows. These rows may belong in conditional logic or separate permit-type templates instead of a universal checklist. fileciteturn0file0

The third group is the **authority-boundary group**: excavation worker safety, “final inspection passed or ready for authority review,” and some permit-scope confirmations. Those should be phrased so Vero is not implying it is replacing WorkSafeBC, a municipal building official, or a registered professional. Vancouver’s and the Province’s materials distinguish permit administration, inspections, and professional assurance from one another. citeturn19view1turn23view0turn29view1

## Normalized evidence matrix

The matrix below uses the packet’s actual checklist rows. For **S10–S13**, I have followed the **attached checklist content** rather than the misleading displayed stage titles. BCBC 2024 uses the same matrix except rows marked **VBBL only** are omitted outside Vancouver. fileciteturn0file0turn0file2

**S01 — Site Survey & Excavation** fileciteturn0file0

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Survey pins and property setbacks verified | E | Camera/photo; Field note | Useful dispute record, but often still re-checkable before excavation advances | P1 | Should a surveyed site plan or stakeout certificate satisfy this row on larger jobs? |
| Excavation dimensions match structural drawings | A | Camera/photo; Field note | Excavation condition is lost once footing/formwork proceeds | P0 | Is a dimensioned photo set enough, or should survey confirmation be required for some projects? |
| Underground utilities located and protected | A | Permit/status proof; Field note | Pre-excavation safety/status gate; highly dispute-prone | P0 | Should Vero require BC One Call ticket/reference capture before pass? |
| Temporary erosion and sediment control in place | E | Camera/photo | Useful context; usually visible and revisitable | P1 | Should this remain evidence-light unless municipal servicing conditions make it critical? |
| Soil conditions consistent with geotechnical report | A | Camera/photo; Field note | Concealed after foundation work; important if unexpected soils/water appear | P0 | Should geotechnical memo/upload be required when conditions differ from report assumptions? |
| Excavation shoring and worker safety measures | C | Field note; Camera/photo | If unsafe/inaccessible, inspection should not proceed; avoid implying Vero is WorkSafeBC | P0 | Should this row be reframed as “site safe for inspection attendance” rather than safety compliance? |

**S02 — Foundation Formwork & Rebar** fileciteturn0file0

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Structural capacity, anchorage, and seismic restraint | A | Camera/photo; Field note | Concealed by concrete/backfill; high structural consequence | P0 | Should engineer field-review note be accepted in lieu of inspector photos on engineered work? |
| Deep foundations | D | Field note; Document | Often out of scope; N/A must be justified if row remains universal | P0 | Should this become a conditional row visible only on projects with deep foundations? |
| Structural shop drawings | D | Document | Best treated as scope/applicability or document-presence check | P1 | Should “reviewed” mean uploaded/linked shop drawings, or only RP confirmation? |
| Dampproofing and waterproofing below grade | A | Camera/photo | Hidden after backfill; common dispute source | P0 | Should manufacturer/spec documentation be optional or required for alternate membrane systems? |
| Site and foundation drainage | A | Camera/photo; Field note | Hidden after backfill and landscaping | P0 | Should drain tile and discharge path photos be mandatory as separate sub-evidence? |
| Geotechnical bearing capacity of soil | A | Field note; Document | Reliance item tied to geotechnical assumption before concealment | P0 | Should bearing confirmation require geotechnical report excerpt or site memo? |
| Compaction of engineered fill | A | Test result; Field note | Not readily verifiable later; compaction disputes are common | P0 | Should compaction test reports be mandatory before pass where engineered fill exists? |
| Backfill and permanent dewatering | D | Field note; Document | Often conditional; N/A rationale matters | P1 | Should temporary and permanent dewatering be split into separate conditional rows? |

**S03 — Foundation Pour** fileciteturn0file0

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Concrete mix design and compressive strength confirmed | A | Test result; Document | Formal test/report evidence is stronger than checkbox alone | P0 | Should pass require cylinder report on file, or only confirmed scheduled testing at pour? |
| Foundation dimensions match structural drawings | A | Camera/photo; Field note | Hard to verify after framing starts | P0 | Should dimensioned photos be mandatory for all walls/footings or sampled only? |
| Anchor bolts, hold-downs, and embedded hardware correct | A | Camera/photo | Fully concealed after pour/framing | P0 | Should Vero require close-up photos of every hold-down location or representative shots? |
| Drainage sleeves and utility penetrations in place | A | Camera/photo | Fully concealed after pour | P0 | Should this row require annotated photos showing sleeve locations against plan? |
| Damp-proofing or waterproofing applied | A | Camera/photo | Concealed by backfill; high leak/dispute exposure | P0 | Should this sit in S02 or S03, or be split by installation timing? |
| Curing and cold-weather protection measures | B | Field note; Camera/photo | Evidence matters mainly if conditions are deficient or weather-sensitive | P1 | Should weather data or delivery ticket temperature be captured when cold-weather risk exists? |

**S04 — Framing & Lock-up** fileciteturn0file0

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Structural framing matches approved drawings | A | Camera/photo; Field note | Much is concealed after insulation/drywall | P0 | Should key spans/header sizes require annotated photos versus general walkthrough photos? |
| Shear wall nailing, hold-downs, and straps | A | Camera/photo | Critical concealed seismic/lateral work | P0 | Should fastener-spacing photos be mandatory before cladding/interior lining? |
| Fire blocking and draft stopping installed | A | Camera/photo | Normally concealed soon after inspection | P0 | Should this row be split between wall cavities and attic/roof spaces? |
| Structural shop drawings reviewed | D | Document | Better as document-presence or RP-review row | P1 | Should this be conditional by engineered product presence? |
| Weather-resistant barrier installed | A | Camera/photo | Concealed by cladding; high audit value in coastal BC | P0 | Should photos be required at transitions and penetrations, not just wide shots? |
| Windows and exterior doors installed and flashed | A | Camera/photo; Manufacturer/spec document | Sill/head/jamb flashing becomes concealed | P0 | Should manufacturer install detail be required only for non-standard systems? |
| Roof structure and bracing complete | A | Camera/photo | Much becomes inaccessible after sheathing/insulation | P0 | Should truss layout/bracing require attic-side photos before cover? |

**S05 — Roof Deck & Sheathing** fileciteturn0file0

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Roof sheathing grade and nailing pattern | A | Camera/photo | Concealed by roofing | P0 | Should edge/field fastening have separate photo prompts? |
| Roof slope and drainage direction correct | A | Camera/photo; Field note | Harder to prove once roofing complete and later defects arise | P0 | Is a field note sufficient on simple roofs, with photos only for low-slope or complex roofs? |
| Ice and water shield at eaves and valleys | A | Camera/photo | Concealed by final roofing | P0 | Should eave protection length be annotated or measured in the note? |
| Roofing underlayment installed | A | Camera/photo | Concealed by finish roofing | P0 | Should full-roof overview plus detail shots be required? |
| Attic ventilation provisions installed | A | Camera/photo | Baffles/vent paths are partly concealed later | P0 | Should this row require both intake and exhaust evidence? |
| Roof penetration and skylight flashings | A | Camera/photo | Common leak origin; concealed by finish work | P0 | Should manufacturer detail be required for curb-mounted or custom skylights? |

**S06 — Mechanical Rough-In** fileciteturn0file0

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Mechanical systems match approved permit scope | C | Permit/status proof; Field note | Missing permit/scope should stop progress, but pass should not force upload on every visit | P0 | Can Vero derive this automatically from issued trade permits rather than manual evidence? |
| Gas line pressure test completed and documented | A | Test result; Document | Formal status/test gate; high consequence | P0 | Should witnessed test evidence be mandatory before pass, or acceptable before seal only? |
| Combustion air and venting requirements met | A | Camera/photo; Field note | Safety-critical and often hidden or hard to inspect later | P0 | Should venting rows require manufacturer/spec documentation on direct-vent systems? |
| Fire dampers at rated assemblies | A | Camera/photo | Hidden after closure; fire/life-safety critical | P0 | Should damper tags/locations require photo evidence at each rated penetration? |
| Duct support, clearances, and fire separation continuity | A | Camera/photo | Rough-in condition can be concealed later | P0 | Should this be split between support/clearance and rated-assembly continuity? |
| Exhaust fan ducting to exterior | A | Camera/photo | Common performance and condensation issue; some portions concealed later | P0 | Should exterior termination photo be mandatory where accessible? |
| Mechanical shop drawings reviewed | D | Document | Better as scope/applicability document row | P1 | Is document presence enough, or should this be RP confirmation only? |

**S07 — Fire Suppression Rough-In** fileciteturn0file0

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Sprinkler system matches approved hydraulic calculations | A | Document; Field note | Design-basis and installation-conformance item | P0 | Should uploaded hydraulic calcs be mandatory, or only referenced permit docs? |
| Pipe supports and hangers correct | A | Camera/photo | Often concealed by ceilings | P0 | Should sway bracing have dedicated evidence prompts? |
| Sprinkler head placement and coverage | A | Camera/photo | Ceiling closure can hide the rough condition | P0 | Should upright/pendent/sidewall type be recorded in note for nonstandard areas? |
| Concealed areas inspected before enclosure | A | Camera/photo; Field note | Classic concealed-work checkpoint | P0 | Should the system force before-enclosure evidence before allowing later stage completion? |
| Water supply connection and backflow preventer | A | Camera/photo | Safety-critical and partly concealed/modified later | P0 | Should tested backflow documentation be linked here or at final acceptance only? |
| System pressure test completed and documented | A | Test result; Document | Formal test evidence required | P0 | Should this accept contractor certificate, RP letter, or AHJ test record? |

**S08 — Electrical Rough-In** fileciteturn0file0

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Electrical systems match approved permit scope | C | Permit/status proof; Field note | Missing permit/scope is a hold issue more than a photo issue | P0 | Can this be auto-validated from permit metadata? |
| Fire separation continuity at electrical penetrations | A | Camera/photo | Hidden after closure; high fire-separation risk | P0 | Should individual penetration photos be required in rated walls/shafts only? |
| Functional testing of electrical fire emergency systems | D | Field note; Document | Often not applicable at rough-in or belongs later | P0 | Should this row move to life-safety/final-testing stage instead of rough-in? |
| Electrical systems maintenance manuals | D | Document | Usually post-installation turnover item, not rough-in evidence | P1 | Should this move to final/occupancy stage? |
| Structural capacity and seismic restraint of electrical components | D | Field note; Document | Often conditional on project type/equipment | P1 | Should this be conditional for larger Part 3/equipment projects only? |
| Clearances from buildings for electrical utility equipment | E | Camera/photo; Field note | Useful dispute record, but often still visible later | P1 | Should pass evidence be required only where clearances are tight or utility-driven? |
| Fire protection of wiring for emergency systems | A | Camera/photo | Hidden once assemblies closed | P0 | Should this row be limited to emergency circuits only through scope logic? |
| Electrical shop drawings | D | Document | Better as scope/applicability check | P1 | Should this be conditional by plan-reviewed or engineered systems only? |

**S09 — Plumbing Rough-In** fileciteturn0file0

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Plumbing systems match approved permit scope | C | Permit/status proof; Field note | Missing permit/scope should hold, not generate routine upload burden | P0 | Can permit metadata satisfy this automatically? |
| Roof drainage systems | A | Camera/photo | Later concealed or less accessible; common failure source | P0 | Should leaders, sumps, and overflow paths be separate prompts? |
| Site and foundation drainage systems | A | Camera/photo | Usually concealed after backfill/site work | P0 | Should this row merge with S02/S03 drainage or stay trade-specific? |
| Fire separation continuity at plumbing penetrations | A | Camera/photo | Hidden after closure; standard concealed firestop issue | P0 | Should this be paired with listed firestop system documentation on rated shafts? |
| Functional testing of plumbing fire emergency systems | D | Field note; Document | Often conditional or better tied to suppression/final testing | P1 | Should this row move or be hidden unless specific fire-plumbing systems exist? |
| Plumbing systems maintenance manuals | D | Document | Typical turnover item, not rough-in evidence | P1 | Should this move to S15 handover/final stage? |
| Structural capacity and seismic restraint of plumbing components | D | Field note; Document | Often conditional on project complexity | P1 | Should this show only on engineered seismic projects? |
| Plumbing shop drawings | D | Document | Conditional document check, not physical evidence | P1 | Should this be document-linked only, not inspection evidence? |
| Sewer/storm connection placard data **VBBL only** | A | Camera/photo; Permit/status proof | Vancouver-specific servicing record; dispute-prone if omitted | P0 | Should this row require the City form/placard image rather than a freeform upload? |

**S10 — Rendered as Electrical Permit and Scope, actual attached content is Building Envelope** fileciteturn0file0turn0file2

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Building enclosure design and performance confirmed | E | Field note; Document | More of a design/professional review confirmation than a field photo item | P1 | Should this accept RP field-review documentation rather than inspector evidence? |
| Weather-resistant barrier continuity at penetrations | A | Camera/photo | Concealed by cladding; very high failure/dispute potential | P0 | Should transition details require close-up annotated photos? |
| Cladding drainage plane and ventilation gap | A | Camera/photo | Concealed after cladding completion | P0 | Should cavity thickness/rainscreen gap need measurement note? |
| Glazing systems and curtain wall performance | D | Document; Manufacturer/spec document | Often not applicable on simple projects; performance check is document-heavy | P1 | Should this be conditional by curtain-wall/storefront scope? |
| Air barrier continuity confirmed | A | Camera/photo | Concealed after finishes; critical for enclosure and energy | P0 | Should blower-door/airtightness results link here when available? |
| Building enclosure shop drawings reviewed | D | Document | Best treated as document-presence or RP-review item | P1 | Should enclosure shop-drawing review sit with professional sign-off rather than inspection row? |

**S11 — Rendered as Gas Permit and Mechanical / HVAC Scope, actual attached content is Insulation & Vapour Barrier** fileciteturn0file0turn0file2

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Insulation R-values meet energy code requirements | A | Camera/photo; Manufacturer/spec document | Concealed after drywall; product value may need label capture | P0 | Should labeled product photos be mandatory where R-value is not visible after install? |
| Vapour barrier continuity (6 mil poly or equivalent) | A | Camera/photo | Concealed after drywall; common audit/dispute item | P0 | Should seams/laps and penetration sealing each need dedicated prompts? |
| Air sealing at electrical boxes and penetrations | A | Camera/photo | Small but critical concealed condition | P0 | Should representative photos be enough, or should high-risk locations be listed? |
| Attic insulation baffles installed | A | Camera/photo | Common concealed ventilation issue | P0 | Should both eave intake and baffle continuity be evidenced? |
| Rim joist insulation and air sealing | A | Camera/photo | Concealed later; high thermal-bridge risk | P0 | Should this row require close-up photos at all perimeter types or only representative areas? |
| Thermal bridging at intersecting assemblies addressed | E | Camera/photo; Field note | Important but generic; full proof may be design-dependent | P1 | Should this become a design-review/energy-advisor row instead of inspection evidence? |

**S12 — Rendered as Insulation and Energy Compliance, actual attached content is Drywall & Interior Finish** fileciteturn0file0turn0file2

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Fire-rated assemblies correctly constructed | A | Camera/photo; Manufacturer/spec document | Concealed by finishing; life-safety critical | P0 | Should ULC assembly number or board labeling be captured in note/photo? |
| Fire-rated penetration firestopping | A | Camera/photo; Manufacturer/spec document | Classic concealed fire/life-safety checkpoint | P0 | Should listed firestop system documentation be required on complex penetrations? |
| Suite-to-suite sound insulation | A | Camera/photo; Manufacturer/spec document | Concealed condition and frequent dispute source | P0 | Should this rely on product labeling only, or also require field note on assembly type? |
| Shaft wall and service chase construction | A | Camera/photo | Concealed after closure and highly consequential | P0 | Should shaft-wall evidence be limited to rated shafts only through scope logic? |
| Stairwell and corridor fire separation continuity | A | Camera/photo | Concealed and occupancy-critical | P0 | Should continuity at ceiling/floor interfaces be separate sub-prompts? |

**S13 — Rendered as Interior Completion, actual attached content is Life Safety Systems** fileciteturn0file0turn0file2

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Fire alarm system functional test completed | A | Test result; Document | Formal commissioning/acceptance evidence | P0 | Should ULC-S537 report upload be mandatory before pass? |
| Smoke and CO detector placement | E | Camera/photo | Visible at final, but photo improves audit defensibility | P1 | Should houses versus larger buildings use different evidence levels here? |
| Emergency lighting and exit signs functional | A | Camera/photo; Video | Occupancy-critical functional condition | P0 | Is a short video preferable to still photos for functional testing? |
| Sprinkler system final acceptance test | A | Test result; Document | Formal acceptance gate | P0 | Should main drain and inspector test records be separate uploads? |
| Means of egress complete and unobstructed | E | Camera/photo | Visible at final; useful for later challenge/appeal | P1 | Should this become A for phased occupancy or assembly occupancies? |
| Building civic address visible from street | E | Camera/photo | Low-friction final proof, helpful for emergency-response disputes | P1 | Should this remain recommended only for small residential projects? |

**S14 — Exterior Works and Site Finalization** fileciteturn0file0

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Grade slopes away from foundation | E | Camera/photo; Field note | Visible and measurable later, but helpful before landscaping settles | P1 | Should projects with drainage complaints or flat sites elevate this to A? |
| Swales and drainage channels functional | E | Camera/photo; Field note | Visible condition; evidence useful but not always critical before pass | P1 | Should storm-event or hose-test video ever be required on problematic sites? |
| Paved surfaces sloped to drain | E | Camera/photo; Field note | Usually revisitable and visible | P2 | Is evidence needed only when drainage defects are observed? |
| Retaining walls permitted and inspected | C | Permit/status proof; Document | Missing permit/engineering should hold, not just fail | P0 | Should this row be conditional by retaining-wall height/jurisdiction trigger? |
| Stormwater management compliant with municipal requirements | A | Permit/status proof; Document | Tied to municipal servicing approval and later dispute exposure | P0 | Should approved civil drawings or servicing sign-off be mandatory before pass? |
| Erosion and sediment controls removed or stabilized | E | Camera/photo | Useful closeout evidence, but not usually worth hard-gating pass | P2 | Should this be stronger only where development permit/site-servicing conditions require it? |

**S15 — Inspections, Final Approval, and Occupancy** fileciteturn0file0

| Checklist item | Class | Evidence type | Reason | Priority | Professional review question |
|---|---|---|---|---|---|
| Prerequisite specialty stages digitally sealed | F | Not required | Best validated by system state, not uploads | P0 | Can this be hard-locked in workflow so no manual override is possible? |
| Final inspection passed or ready for authority review | C | Permit/status proof; Field note | Administrative status gate, not routine photo evidence | P0 | Should “ready for authority review” be a separate state from pass to avoid false positives? |
| Occupancy permit identified for commercial or multi-unit residential **VBBL only** | A | Permit/status proof; Document | City occupancy gate before use | P0 | Should this row be conditionally hidden for houses/laneway houses? |
| Issued permits in place before occupancy application **VBBL only** | A | Permit/status proof | Direct City administrative prerequisite | P0 | Can the platform read this from issued permit records instead of requiring upload? |
| Schedules C-A and C-B or equivalent letters of assurance | A | Document | Formal professional assurance document | P0 | Should pass require uploaded PDF copies, or only verified receipt/status metadata? |
| Required agency reviews complete **VBBL only** | A | Permit/status proof; Document | City states external approvals may be required before occupancy | P0 | Should agency-specific substatus fields replace a single generic row? |
| Permit terms and outstanding deficiencies resolved **VBBL only** | B | Field note; Document | Evidence is most important when unresolved items remain or staged occupancy is sought | P0 | Should this row require closed deficiency log evidence before final seal? |

## Professional-review queue distilled from the matrix

The rows below should be explicitly routed to human review before hard enforcement:

- All **S10–S13** rows, because the packet documents a stage title/content mismatch. fileciteturn0file0turn0file2
- All **shop drawing** and **maintenance manual** rows, because these are document-governance items, not straightforward site-observation items. fileciteturn0file0
- All rows that are heavily **scope-conditional**: deep foundations, glazing/curtain wall performance, emergency-system specialty rows, retaining walls, and some seismic-restraint rows. fileciteturn0file0
- Any row that could be mistaken for **registered-professional field review** rather than inspection observation. The provincial guide assigns field-review assurance to the coordinating registered professional and registered professionals of record through Schedules B and C-B. citeturn29view1turn29view2
- Any row that could imply Vero is exercising **municipal acceptance authority** rather than recording readiness, deficiency, or documentary status. Vancouver separates permit issuance, inspection, and occupancy processes, and occupancy may depend on approvals from multiple departments and agencies. citeturn22view0turn23view0

## Implementation note for Claude Code

The packet itself shows enough to justify a narrow implementation instruction set.

Do **not** encode this matrix directly into the boolean-only DB templates as freeform comments and assume the problem is solved. Instead:

1. Keep the **stage-row inventory** from the jurisdiction-aware templates.
2. Bind evidence semantics to the **actual attached row content**, not the rendered S10–S13 titles.
3. Use a single normalized per-row structure for:
   - evidence class A-F,
   - allowed evidence types,
   - fail/hold/N/A note requirements,
   - conditional visibility,
   - jurisdiction tag,
   - “professional document accepted” flags.
4. Treat **S15.1** as system-state logic, not upload logic.
5. Add a universal rule that **any Corrections Required, Hold, or N/A selection always forces at least a field note**, even for rows whose primary class is E or F.
6. Route the professional-review queue above to a human inspector/code reviewer before making those rows mandatory. fileciteturn0file0turn0file2

This matrix does **not** claim legal sign-off. It is a practical launch recommendation for audit-defensible evidence collection aligned to the packet’s real checklist rows and to the official BC/Vancouver permitting, inspection, occupancy, and Letters of Assurance framework. fileciteturn0file0 citeturn26view0turn19view1turn18view0turn23view0turn31view1