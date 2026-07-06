# Evidence Matrix Reconciliation - Pro Audit Sprint 02A

Date: 2026-07-06

Branch: `fix/pro-audit-sprint-02a-evidence-matrix-reconciliation`

Source authority: `docs/audit/pro-evidence-matrix-source.md`

## Scope

This sprint reconciles the Pro evidence matrix against the current active Vero Permit completion checklist. It does not enforce new upload gates, change templates, edit Supabase, edit SQL, or alter security/payment/workflow logic.

## Active Inventory

The current inspector completion workspace uses the runtime completion model in `src/lib/inspectorCompletion.ts`, consumed by `src/components/inspector/InspectorCompletionWorkspace.tsx`. For the Vancouver/general-building context inspected in this sprint, the active inventory is 15 stages and 62 checklist rows.

System B jurisdiction templates remain important source material, but they are not the active completion workspace enforcement model for this audit. System C, the runtime completion model, is the active source of the rows reconciled below.

## Reconciliation Rules

- Evidence is required before Pass only where the source matrix supports concealed work, test/commissioning proof, permit/status proof, occupancy/status gates, professional assurance, or similarly dispute-prone conditions.
- Evidence is not assigned merely because a row exists.
- Corrections Required, Hold / Cannot Proceed, and N/A outcomes should require at least a field note unless a safer or more specific model is implemented.
- Professional reliance, authority-boundary, and scope/applicability rows are documented for Sprint 02B or professional/AHJ review rather than hard-enforced here.
- S15.1, "Prerequisite specialty stages digitally sealed", remains system-state logic and is not modeled as upload-driven evidence.

## S10-S13 Result

The Pro source warned that old packet S10-S13 rendered stage titles did not match attached content. The current active application now contains corrected S10-S13 rows:

- S10 is Electrical Permit and Scope.
- S11 is Gas Permit and Mechanical / HVAC Scope.
- S12 is Insulation and Energy Compliance.
- S13 is Interior Completion.

This reconciliation therefore follows the current active corrected rows, not the stale packet mismatch labels. The stale mismatch remains documented as source context, but it is not used as the active policy inventory.

## Typed Policy

The reconciled policy is captured locally in `src/lib/inspectionEvidencePolicy.ts`. That file exports the allowed classes, evidence types, launch priorities, universal outcome-note rule, the S15.1 system-state exception, and one evidence policy entry for each active checklist row.

## Reconciliation Matrix

| Stage ID | Checklist row | Pro matrix classification | Reconciled classification | Evidence type | Reason | Launch priority | Implementation status | Professional/AHJ review question |
|---|---|---|---|---|---|---|---|---|
| S01 | S01-01 Project Address and Legal Description | E | E | document; permit/status proof; field note | Current row is a project-identity document check, not a field-observation row; evidence is useful for disputes but should remain verify-existing until template review. | P1 | ready_for_sprint_02b_ui_copy | Should address/legal-description proof be satisfied by permit cover page metadata instead of uploads? |
| S01 | S01-02 Governing Authority, Code Path, and Jurisdiction Overlay | E | E | permit/status proof; document; field note | Code path and AHJ identification affect scope but are primarily record metadata; collect supporting proof without hard upload enforcement. | P1 | requires_template_model_change | Can jurisdiction/code path be derived from permit metadata instead of field evidence? |
| S01 | S01-03 Project Type, Building Type, and Structural Scope Classification | D | D | field note; document | This is a scope/applicability row; the Pro matrix supports evidence when a scope path is treated as not applicable or exceptional. | P1 | requires_template_model_change | Which project-type signals should hide downstream rows instead of requiring repeated N/A evidence? |
| S01 | S01-04 Site Record, Drawings, and Revision Package Readiness | C, D | C | document; permit/status proof; field note | Missing drawings or revision records are prerequisite-readiness blockers rather than routine photo evidence. | P0 | requires_template_model_change | Should drawing revision completeness be a system checklist state instead of an inspector upload prompt? |
| S01 | S01-05 Registered Professional and Permit Coordination Flags | A, D | D | professional assurance document; document; field note | Professional reliance is conditional by permit scope; if marked not applicable or exceptional, a scope note or document should support the decision. | P0 | requires_professional_ahj_review | Which RP flags require uploaded assurance documents versus metadata-only confirmation? |
| S02 | S02-01 Zoning and Civic Approvals | C | C | permit/status proof; document; field note | Missing zoning or civic approval should block progress as an administrative prerequisite. | P0 | requires_template_model_change | Can approval status be read from AHJ metadata instead of uploaded proof? |
| S02 | S02-02 Site Servicing and Access | C, A | C | permit/status proof; document; field note | Servicing/access gaps are approval or cannot-proceed conditions; routine pass should not create generic uploads before model support exists. | P0 | requires_template_model_change | Which servicing approvals should be modeled as status fields? |
| S02 | S02-03 Site Clearing and Environment | E | E | camera/photo; field note | Environmental controls are visible and revisitable in many cases; evidence is useful but should not hard-gate launch pass. | P1 | ready_for_sprint_02b_ui_copy | Should municipal site-servicing conditions elevate this row to required evidence on selected projects? |
| S03 | S03-01 Site and Architectural Matrix | E, D | E | document; field note | The active row is package-readiness documentation; the Pro matrix supports targeted document proof but not mandatory uploads merely because the row exists. | P1 | requires_template_model_change | Which architectural matrix fields should become conditional visibility controls? |
| S03 | S03-02 Safety and Structural Calculations | D, A | D | document; professional assurance document; field note | Calculation evidence is professional-document governance and should be conditional to project scope before hard enforcement. | P1 | requires_professional_ahj_review | Should Vero collect calculation documents or only record RP/permit-review status? |
| S03 | S03-03 Drawing Packages and Assurances | A, D | D | document; professional assurance document; field note | Assurances are mandatory where applicable, but applicability must be governed before upload enforcement. | P0 | requires_professional_ahj_review | Which Schedules/letters are required at permit package versus final closeout? |
| S04 | S04-01 Pre-Disturbance Controls and Demolition | A, C, E | A | camera/photo; field note; permit/status proof | Pre-disturbance conditions include safety/status gates and conditions that are lost once excavation or demolition proceeds. | P0 | ready_for_sprint_02b_ui_copy | Should BC One Call or demolition permit references be structured fields? |
| S04 | S04-02 Survey, Setbacks, Siting, and Flood Level Verification | E, A | E | camera/photo; field note; document | Survey/siting evidence is dispute-useful; current active row is broader than the Pro A row and needs conditional project triggers. | P1 | requires_template_model_change | Should flood level or siting certificate requirements elevate this row to A on selected permits? |
| S04 | S04-03 Earthworks, Geotechnical, and Soil Conditions | A | A | camera/photo; field note; document; test result | Earthworks and soil conditions are concealed or difficult to verify later and may require geotechnical/test documentation. | P0 | ready_for_sprint_02b_ui_copy | When should geotechnical memo or compaction report be mandatory versus optional? |
| S04 | S04-04 Site Safety, Environmental Controls, and Temporary Drainage | C, E | C | field note; camera/photo | Unsafe or inaccessible site conditions should stop the inspection; visible environmental controls remain recommended evidence. | P0 | ready_for_sprint_02b_ui_copy | Should this row be reframed as safe inspection access rather than WorkSafeBC compliance? |
| S05 | S05-01 Footings, Foundation Walls, Rebar, and Embedded Items | A | A | camera/photo; field note | Rebar, anchors, hold-downs, and embedded items are concealed by concrete and have high structural consequence. | P0 | ready_for_sprint_02b_ui_copy | Should close-up evidence be required at every hold-down or representative locations? |
| S05 | S05-02 Drainage, Dampproofing, and Foundation Protection | A | A | camera/photo; field note; manufacturer/spec document | Foundation protection and drainage are hidden after backfill and are common dispute sources. | P0 | ready_for_sprint_02b_ui_copy | Should drain tile and discharge path photos become separate sub-evidence prompts? |
| S05 | S05-03 Slab Preparation, Radon, Soil Gas, and Under-Slab Conditions | A | A | camera/photo; field note; manufacturer/spec document | Under-slab layers, penetrations, and soil-gas measures are concealed after the slab pour. | P0 | ready_for_sprint_02b_ui_copy | Should radon/soil-gas systems have dedicated evidence prompts by jurisdiction? |
| S05 | S05-04 Concrete Pour, Placement, Curing, and Post-Pour Review | A, B | A | camera/photo; field note; test result; document | Concrete placement and test records are formal evidence points; weather/curing evidence matters when conditions are deficient. | P0 | ready_for_sprint_02b_ui_copy | Should cylinder report be required before pass or before final seal? |
| S06 | S06-01 Vertical and Horizontal Framing | A | A | camera/photo; field note | Framing members and load paths are concealed or difficult to verify after insulation/drywall. | P0 | ready_for_sprint_02b_ui_copy | Which spans/header locations need annotated photos rather than general walkthroughs? |
| S06 | S06-02 Lateral and Seismic Systems | A | A | camera/photo; field note | Lateral and seismic details are concealed and high consequence. | P0 | ready_for_sprint_02b_ui_copy | Should fastener spacing and hold-down photos be mandatory at each braced wall line? |
| S06 | S06-03 Stairs, Openings, Fire Separations, and Engineering | A, D | A | camera/photo; field note; document; professional assurance document | Openings, separations, and engineering coordination include concealed fire/structural details; document governance remains review-sensitive. | P0 | requires_professional_ahj_review | Which engineered stair/opening documents belong in RP review rather than inspector evidence? |
| S07 | S07-01 Sheathing, WRB, and Weather Barrier | A | A | camera/photo; manufacturer/spec document | Weather barrier and sheathing conditions are concealed by cladding/roofing. | P0 | ready_for_sprint_02b_ui_copy | Should transition details be required close-ups? |
| S07 | S07-02 Penetrations, Openings, Flashings, and Cladding Integration | A | A | camera/photo; manufacturer/spec document | Openings, penetrations, and flashings are high leak-risk details concealed by cladding or finishes. | P0 | ready_for_sprint_02b_ui_copy | When should manufacturer installation details be mandatory? |
| S07 | S07-03 Roof System, Drainage, Ventilation, and Weatherproofing | A | A | camera/photo; field note | Roof underlayment, eave protection, penetrations, and ventilation paths are concealed or hard to prove later. | P0 | ready_for_sprint_02b_ui_copy | Should intake and exhaust ventilation evidence be separate prompts? |
| S07 | S07-04 Envelope Field Review and Assurance | E, D, A | D | document; professional assurance document; field note | Envelope assurance is professional/document governance; applicability must be resolved before upload enforcement. | P1 | requires_professional_ahj_review | Should envelope field review evidence be RP documentation rather than inspector photos? |
| S08 | S08-01 Fire Separations and Blocking | A | A | camera/photo; manufacturer/spec document | Fire separations and blocking are concealed life-safety conditions. | P0 | ready_for_sprint_02b_ui_copy | Should listed assembly numbers be captured in structured notes? |
| S08 | S08-02 Egress, Smoke/CO Alarms, Emergency Lighting, and Exit Sign Rough-In | A, E | A | camera/photo; video; field note | Life-safety devices and egress readiness can be occupancy-critical; functional elements justify required evidence where applicable. | P0 | ready_for_sprint_02b_ui_copy | Should functional tests be video-preferred only for emergency lighting and exit signage? |
| S08 | S08-03 Accessibility and Guards | E | E | camera/photo; field note | Guards and accessibility clearances are visible and can often be revisited, but evidence improves dispute defensibility. | P1 | requires_professional_ahj_review | Which occupancy classes or adaptable-housing paths should elevate this to A? |
| S08 | S08-04 Fire Suppression System Rough-In | A | A | camera/photo; document; test result; field note | Suppression rough-in combines concealed work, approved calculations, and pressure-test evidence. | P0 | ready_for_sprint_02b_ui_copy | Which contractor certificates or AHJ records are acceptable test evidence? |
| S08 | S08-05 Fire Alarm Rough-In | A | A | camera/photo; document; field note | Fire alarm rough-in and emergency wiring protection are life-safety and may be concealed. | P0 | ready_for_sprint_02b_ui_copy | Should functional acceptance reports live at rough-in, final, or both? |
| S09 | S09-01 Permit Scope, Readiness, and Visibility | C | C | permit/status proof; field note | Permit mismatch or readiness failure should hold the inspection rather than create routine upload burden. | P0 | requires_template_model_change | Can permit metadata satisfy this automatically? |
| S09 | S09-02 Potable Water Supply Rough-In | A | A | camera/photo; test result; field note | Water rough-in can be concealed and may require pressure/backflow evidence depending on scope. | P0 | ready_for_sprint_02b_ui_copy | Should pressure-test evidence be required here or at closeout? |
| S09 | S09-03 Drain, Waste, Vent, and Drainage Rough-In | A | A | camera/photo; test result; field note | DWV and drainage routes are concealed and common dispute/failure sources. | P0 | ready_for_sprint_02b_ui_copy | Should DWV test result and slope/cleanout photos be distinct prompts? |
| S09 | S09-04 Testing, Fixtures, and Fire Separation Penetrations | A, D | A | camera/photo; test result; manufacturer/spec document; field note | Testing and rated penetrations are formal/concealed life-safety evidence points. | P0 | ready_for_sprint_02b_ui_copy | Which plumbing fire-emergency tests are in scope for this row? |
| S09 | S09-05 City Connection, Backflow, Sump, and Jurisdictional Requirements | A | A | camera/photo; permit/status proof; test result; field note | Connection, backflow, sump, and jurisdictional records are high-dispute servicing/status evidence points. | P0 | requires_template_model_change | Should Vancouver placard data be a structured field instead of freeform upload? |
| S10 | S10-01 Electrical Permit and Service Readiness | C, E, A | A | camera/photo; permit/status proof; field note; document | Current corrected S10 is electrical; service readiness includes permit scope plus observable service/grounding conditions before concealment or energization. | P0 | ready_for_sprint_02b_ui_copy | Which permit/status proof should come from Technical Safety BC versus AHJ records? |
| S10 | S10-02 Branch Circuit Rough-In | A | A | camera/photo; field note | Branch wiring support/protection and box rough-in are concealed by wall closure. | P0 | ready_for_sprint_02b_ui_copy | Should evidence be required for all rough wiring or only protected/life-safety locations? |
| S10 | S10-03 Life Safety, Specialty Circuits, and Pre-Test Readiness | A, D | A | camera/photo; field note; document | Life-safety and specialty circuits are concealed or scope-conditional; current row already limits evidence to where needed. | P0 | requires_professional_ahj_review | Which specialty systems should be conditional visibility instead of N/A? |
| S10 | S10-04 Electrical Inspection and Documentation Closeout | A, C | A | permit/status proof; document; field note | Electrical closeout is a formal inspection/status gate and should be document/status evidence, not generic photos. | P0 | requires_template_model_change | Which Technical Safety BC certificates/declarations should be accepted? |
| S11 | S11-01 Mechanical Permit and Equipment Rough-In | C, A | A | camera/photo; permit/status proof; field note; document | Current corrected S11 is mechanical/gas; equipment rough-in combines permit scope and concealed/support/clearance observations. | P0 | ready_for_sprint_02b_ui_copy | Which equipment/heat-load documents should remain optional versus required? |
| S11 | S11-02 Gas Piping, Venting, and Combustion | A | A | camera/photo; test result; document; field note | Gas piping, venting, and pressure tests are safety-critical and often concealed. | P0 | ready_for_sprint_02b_ui_copy | Should contractor pressure test records be mandatory before pass or before seal? |
| S11 | S11-03 Ventilation, Exhaust, Duct Coordination, and Fire Assembly Coordination | A | A | camera/photo; field note; manufacturer/spec document | Ducts, exhaust routing, dampers, and firestopping are concealed or hard to verify after enclosure. | P0 | ready_for_sprint_02b_ui_copy | Should damper schedules be document evidence where rated assemblies are involved? |
| S11 | S11-04 Mechanical and Gas Inspection Closeout | A, C | A | permit/status proof; document; test result; field note | Mechanical/gas closeout is a formal inspection/status gate with certificate/declaration evidence. | P0 | requires_template_model_change | Which TSBC gas documents and AHJ mechanical records are acceptable? |
| S12 | S12-01 Thermal Insulation and Continuity | A | A | camera/photo; manufacturer/spec document; field note | Current corrected S12 is insulation/energy; insulation and product values are concealed by drywall. | P0 | ready_for_sprint_02b_ui_copy | Should product label photos be mandatory where R-values are not visible later? |
| S12 | S12-02 Air Barrier, Vapour Control, and Penetrations | A | A | camera/photo; video; manufacturer/spec document; field note | Air/vapour barrier and penetration sealing are concealed and high-dispute energy/enclosure evidence points. | P0 | ready_for_sprint_02b_ui_copy | Should seams/laps and penetration sealing be separate prompts? |
| S12 | S12-03 Energy Documentation and Compliance Path | A, E | A | document; test result; professional assurance document; field note | Energy path, modeling, and testing are formal document/status evidence rather than photo-only observations. | P0 | requires_template_model_change | Which energy-adviser or blower-door documents are mandatory by compliance path? |
| S12 | S12-04 Insulation Inspection and Energy Closeout | A | A | permit/status proof; document; test result; professional assurance document | Energy closeout and insulation inspection status are formal closeout/document evidence. | P0 | requires_template_model_change | Should AHJ acceptance status be modeled separately from uploaded documents? |
| S13 | S13-01 Fire Separation, Rated Assemblies, and Sound Separation | A | A | camera/photo; manufacturer/spec document; field note | Current corrected S13 is interior completion; rated assemblies and sound separations are concealed by finishes. | P0 | ready_for_sprint_02b_ui_copy | Should ULC assembly references be structured for rated assemblies? |
| S13 | S13-02 Interior Wall Substrate, Wet-Area, and Concealed Backing | A | A | camera/photo; manufacturer/spec document; field note | Wet-area substrate, waterproofing preparation, and backing are concealed by finish materials. | P0 | ready_for_sprint_02b_ui_copy | Should waterproofing membrane data sheets be mandatory only when nonstandard systems are used? |
| S13 | S13-03 Interior Life Safety and Egress Readiness | A, E | A | camera/photo; video; field note; document | Interior egress/fire-door/alarm readiness includes visible but occupancy-critical life-safety conditions. | P0 | ready_for_sprint_02b_ui_copy | Should houses and Part 3 buildings use different evidence levels? |
| S13 | S13-04 Interior Finishes and Systems Trim | E, B | E | camera/photo; field note; manufacturer/spec document | Interior trim/finish readiness is mostly visible and revisitable; evidence should support deficiencies or disputes rather than hard-gate every pass. | P1 | ready_for_sprint_02b_ui_copy | Which finish material flame-spread conditions should become document evidence? |
| S13 | S13-05 Accessibility, Adaptable Housing, and Interior Closeout | E, D | E | camera/photo; field note; document | Accessibility/adaptable housing may be scope-conditional; visible evidence is useful but requires template triggers before hard enforcement. | P1 | requires_professional_ahj_review | Which accessibility paths should elevate this row to required evidence? |
| S14 | S14-01 Exterior Cladding, Envelope, and Weather-Resistive Continuity | A | A | camera/photo; manufacturer/spec document; field note | Cladding/envelope continuity includes concealed rainscreen and penetration details. | P0 | ready_for_sprint_02b_ui_copy | Should exterior closeout require both broad elevation and close-up transition evidence? |
| S14 | S14-02 Exterior Stairs, Decks, Guards, and Handrails | E | E | camera/photo; field note | Exterior guards and stairs are visible and revisitable; evidence is recommended for disputes and deficiencies. | P1 | requires_professional_ahj_review | Should elevated decks/guards trigger required photo evidence before pass? |
| S14 | S14-03 Site Grading, Drainage, and Stormwater Control | E, A | A | camera/photo; field note; permit/status proof; document | The active row combines visible grading with municipal stormwater compliance; the stormwater compliance component supports A. | P0 | requires_template_model_change | Should municipal stormwater sign-off be a separate status field from visible grading photos? |
| S14 | S14-04 Site Access, Servicing, Fire Authority Requirements, and Exterior Systems | C, A | A | permit/status proof; document; camera/photo; field note | Servicing, fire authority, and exterior system readiness include agency/status gates and potentially cannot-proceed conditions. | P0 | requires_template_model_change | Which fire authority and servicing statuses should be structured instead of uploaded? |
| S14 | S14-05 Landscaping, Site Restoration, and Final Exterior Closeout | E, B | E | camera/photo; field note; document | Site restoration is usually visible; evidence becomes important for deficiencies or closeout disputes. | P1 | ready_for_sprint_02b_ui_copy | Should development-permit landscaping or arborist conditions elevate this row to A? |
| S15 | S15-01 Life-Safety Systems Final Verification | A | A | test result; document; camera/photo; video | Final life-safety systems include formal commissioning/testing and occupancy-critical functional evidence. | P0 | ready_for_sprint_02b_ui_copy | Which acceptance reports should be mandatory before final stage pass? |
| S15 | S15-02 Prior-Stage Deficiency Resolution and Final Trade Confirmations | B, C | B | field note; document; permit/status proof | Evidence is most important where deficiencies or trade confirmations remain unresolved; routine pass should reflect system state where possible. | P0 | requires_template_model_change | Can prior-stage deficiency closure be system-derived instead of upload-driven? |
| S15 | S15-03 Professional Assurance, Closeout Documents, and Final Vero Evidence Package | A | A | professional assurance document; document; permit/status proof | Professional assurance and closeout documents are formal documentary evidence required where applicable. | P0 | requires_professional_ahj_review | Should pass require uploaded PDFs or verified receipt/status metadata? |
| S15 | S15-04 AHJ Final Approval Status and Occupancy Permit Documentation | A, C | A | permit/status proof; document; field note | AHJ final approval and occupancy documentation are administrative status gates; Vero records readiness/status and does not issue occupancy. | P0 | requires_template_model_change | Should ready-for-authority-review be separated from final approval/occupancy issued? |

## Sprint 02B Implementation Readiness

Ready for safe Sprint 02B UI/copy work:

- Add non-blocking evidence class labels and evidence-type hints.
- Clarify the universal field-note expectation for Corrections Required, Hold / Cannot Proceed, and N/A.
- Preserve the corrected S10-S13 row labels in all inspector-facing evidence messaging.
- Keep S15.1 as system-state language instead of upload language.

Requires template/model work before enforcement:

- Conditional visibility for scope/applicability rows.
- Separate evidence buckets for construction observation, permit/status proof, and professional assurance documents.
- Structured status fields for AHJ, TSBC, fire authority, occupancy, stormwater, and deficiency-closeout items.
- Item-level applicability rules for rows currently reconciled as D or template-model dependent.

Requires professional/AHJ review:

- Professional assurance document requirements and where Schedules/letters are mandatory.
- Shop drawing, maintenance manual, energy-adviser, and specialty-system evidence expectations.
- Authority-boundary wording so Vero does not imply it replaces AHJ, WorkSafeBC, TSBC, or registered-professional duties.
- Scope-sensitive elevation of recommended rows to required rows.

Should not block controlled launch:

- P1/P2 recommended evidence prompts for visible and revisitable conditions.
- UI polish for evidence hints.
- Deeper conditional visibility where the current checklist already has defensible notes and optional evidence.

Should block full public self-serve enforcement:

- Hard required-upload enforcement for P0 A/C rows until the model separates observation evidence, status evidence, and professional assurance evidence.
- Automatic enforcement of professional-assurance rows without professional/AHJ review.
- Final/occupancy status gating that does not distinguish Vero package readiness from AHJ approval or occupancy issuance.
