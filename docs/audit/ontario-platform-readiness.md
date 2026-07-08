# Ontario Platform Readiness Audit

Date: 2026-07-07

Branch: `audit/ontario-platform-readiness`

Source research: `docs/research/ontario-expansion-research-packet.md`

Mode: read-only audit plus documentation. No app code, migrations, templates, hosted Supabase state, production settings, or deployment paths are changed.

## Executive Verdict

Ontario can fit inside the existing Vero Permit architecture, but it should be added as a governed jurisdiction/template expansion, not as a second app, second product, or parallel resolver.

The current BC/Vancouver implementation has two live checklist systems:

- A DB-backed, jurisdiction-aware template system used for scope preview, stage reference, checklist admin, and coverage diagnostics.
- A TypeScript runtime completion model used by the inspector completion workspace, evidence capture, sealing workflow, completed records, Schedule C-B packets, and Vault/report surfaces.

The DB resolver currently uses only inspection stage and jurisdiction. Jurisdiction is inferred from city with a BC-specific rule: Vancouver resolves to `vbbl_2025`, and every other city falls back to `bcbc_2024`. This is safe for the current BC launch assumption, but it would be unsafe for Ontario if Ontario cities were allowed into the product before the resolver and jurisdiction model are deliberately extended.

Recommendation: keep BC/Vancouver stable, document Ontario as a dormant expansion track, and make the next Ontario loop a jurisdiction scaffold that adds Ontario data and helper structure behind review gates without changing live BC behavior.

## Files Inspected

Ontario research and audit context:

- `docs/research/ontario-expansion-research-packet.md`
- `docs/audit/larger-build-coverage-diagnostic-audit.md`
- `docs/audit/template-source-of-truth-stabilization.md`
- `docs/audit/inspection-template-printout.md`

Jurisdiction and resolver:

- `src/lib/inspections/resolveActiveTemplate.ts`
- `src/app/api/inspections/resolve-template/route.ts`
- `src/app/inspector/stages/page.tsx`
- `src/lib/rules/engine.ts`
- `src/lib/cityRegionMapping.ts`
- `src/lib/types.ts`

Inspection stages and runtime completion:

- `src/lib/inspections/builderStageMapping.ts`
- `src/components/inspector/InspectorCompletionWorkspace.tsx`
- `src/lib/inspectorCompletion.ts`
- `src/lib/inspectorDevPreview.ts`

Template/admin coverage:

- `src/app/api/admin/checklists/coverage/route.ts`
- `src/app/admin/checklists/coverage/page.tsx`
- `src/app/admin/checklists/page.tsx`
- `src/app/api/admin/checklists/route.ts`
- `src/app/api/admin/checklists/templates/[id]/new-version/route.ts`

Storage and migrations:

- `supabase/migrations/20260307000000_job_system_foundation.sql`
- `supabase/migrations/20260330010000_inspector_completion_checklist.sql`
- `supabase/migrations/20260331020000_inspector_eligibility_and_claim_rpc.sql`
- `supabase/migrations/20260407020000_project_job_validation.sql`
- `supabase/migrations/20260427010000_inspector_stage_engine.sql`
- `supabase/migrations/20260427020000_inspection_stage_seeds.sql`
- `supabase/migrations/20260427030000_checklist_template_seeds.sql`
- `supabase/migrations/20260428010000_checklist_remaining_stages.sql`
- `supabase/migrations/20260427040000_checklist_editor_support.sql`
- `supabase/migrations/20260605000000_correct_inspection_stage_labels_s10_s15.sql`
- `supabase/migrations/20260623000000_catalogue_model_code.sql`

Project, catalogue, report, and authority package surfaces:

- `src/lib/catalogue.ts`
- `src/lib/store.tsx`
- `src/lib/supabase/jobs.ts`
- `src/lib/supabase/compliance.ts`
- `src/lib/supabase/inspectorCompletion.ts`
- `src/lib/persistence/completedInspections.ts`
- `src/lib/vault.ts`
- `src/app/vault/page.tsx`
- `src/lib/packages/authority-package.ts`
- `src/app/api/schedule-cb/route.ts`
- `src/lib/pdf/scheduleCBPacketHelpers.ts`
- `src/lib/pdf/ScheduleCBPacketDocument.tsx`

BC/Vancouver wording surfaces:

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/lib/mail.ts`
- `src/app/terms/page.tsx`
- `src/components/inspector/SealButton.tsx`
- `src/components/builder/DispatchModal.tsx`

## How BC/Vancouver Is Structured Today

### Jurisdiction Data

The DB jurisdiction model lives in `public.jurisdictions`, created by `supabase/migrations/20260427010000_inspector_stage_engine.sql`.

Current columns:

- `slug`
- `name`
- `code_version`
- `effective_date`
- `is_active`

The seeded active jurisdictions are in `supabase/migrations/20260427030000_checklist_template_seeds.sql`:

- `bcbc_2024` - British Columbia Building Code 2024
- `vbbl_2025` - Vancouver Building By-law 2025

There is no province field, municipality field, principal-authority field, code-family field, amendment-document date field, or municipal overlay parent field.

### Vancouver vs BCBC Mapping

The live DB resolver logic is duplicated in two places:

- `src/lib/inspections/resolveActiveTemplate.ts`
- `src/app/inspector/stages/page.tsx`

Both define `cityToJurisdictionSlug(city)` with this rule:

- Empty city -> `bcbc_2024`
- City exactly `vancouver` -> `vbbl_2025`
- Any other city -> `bcbc_2024`

This is the current BC launch basis. It is not an Ontario-ready resolver.

There is also an older rules skeleton in `src/lib/rules/engine.ts` where `SEED_JURISDICTIONS` contains:

- `vancouver` with `VBBL`
- `bc` with `BCBC`

That rules engine evaluates Vancouver vs broader BC, but it is not the DB template resolver and should not be treated as the canonical Ontario expansion point by itself.

### Inspection Stages

Vero has a builder-facing 7-stage request model and an internal 15-stage permit/checklist model.

Builder-facing stages appear in `src/app/builder/page.tsx` as:

- Stage 1 - Site Survey & Excavation -> internal S01
- Stage 2 - Foundation Pour -> internal S05
- Stage 3 - Framing & Lock-up -> internal S06 by default
- Stage 4 - Insulation & Energy Compliance -> internal S12
- Stage 5 - Interior Completion -> internal S13
- Stage 6 - Exterior Works and Site Finalization -> internal S14
- Stage 7 - Final Approval and Occupancy -> internal S15

The shared DB-stage mapping lives in `src/lib/inspections/builderStageMapping.ts`:

- `BUILDER_STAGE_TO_INSPECTION_STAGE`
- `DISCIPLINE_INSPECTION_STAGE_OVERRIDE`
- `resolveInspectionStageNumber`

Stage 3 fans out by discipline:

- architectural -> S07
- fire protection -> S08
- plumbing -> S09
- electrical -> S10
- mechanical -> S11

The inspector completion workspace still has an inline equivalent mapping in `src/components/inspector/InspectorCompletionWorkspace.tsx`, including the same builder stage labels and discipline overrides. The final occupancy route also carries a separate 7-to-15 stage map.

### DB Checklist Templates

The DB template model is created in `supabase/migrations/20260427010000_inspector_stage_engine.sql`:

- `inspection_stages`
- `inspection_stage_dependencies`
- `jurisdictions`
- `stage_checklist_templates`
- `stage_checklist_items`
- `permit_checklist_responses`

Templates are keyed by:

- `stage_id`
- `jurisdiction_id`
- `version`

Template items are currently boolean/reference checklist rows. They carry:

- `label`
- `requirement_text`
- `item_type`
- `is_required`
- `legal_reference`
- `source_title`
- `source_url`
- `admin_notes`

They do not carry typed evidence requirements, N/A applicability, project archetype rules, building type rules, occupancy classification, Part 3/Part 9 path, floor/unit/area scope, professional review status, or review/publish workflow state.

### Runtime Inspector Completion Model

The inspector completion workspace uses `src/lib/inspectorCompletion.ts`, not the DB template rows, for the rich field workflow. This TypeScript runtime model defines `RAW_STAGES` and builds a 15-stage checklist with:

- item codes
- pass/corrections/pending logic
- required evidence guidance
- optional evidence guidance
- `evidence_mode`
- `document_upload_required`
- responsible party
- AHJ notes
- dependencies
- code references

Its overlay inference is BC-oriented. `inferAhjOverlay` recognizes:

- First Nation land office signals
- Vancouver by-law overlay
- Municipal AHJ overlay
- Province-wide BC base

The overlay text specifically references BCBC 2024, Vancouver by-law expectations, municipal servicing/tree/frontage/occupancy expectations, and related BC concepts.

### Evidence Guidance

Evidence guidance lives primarily in:

- `src/lib/inspectorCompletion.ts`
- `src/components/inspector/InspectorCompletionWorkspace.tsx`
- `src/components/inspector/FieldMediaUploader.tsx`

The live workspace gates required uploads per item where `evidence_mode === 'required_upload'` and `document_upload_required` is true. The DB template rows do not yet encode equivalent typed evidence policy.

The local typed evidence reconciliation in `src/lib/inspectionEvidencePolicy.ts` is a policy artifact, not production resolver wiring.

### Vault, Report, and Authority Package Wording

Vault/report/package paths are BC and Schedule C-B oriented:

- `src/app/api/schedule-cb/route.ts`
- `src/lib/pdf/scheduleCBPacketHelpers.ts`
- `src/lib/pdf/ScheduleCBPacketDocument.tsx`
- `src/lib/packages/authority-package.ts`
- `src/lib/vault.ts`
- `src/app/vault/page.tsx`

The packet helpers distinguish platform preview from authority-facing output and include clear disclaimers that the platform record is not a building permit, occupancy authorization, authority decision, or substitute for documents required by the AHJ.

However, many user-facing surfaces still name Schedule C-B and BC explicitly. Ontario should not reuse Schedule C-B language. Ontario needs a different authority-package vocabulary around the Ontario principal authority, municipal permit office, CBO/inspector role, Schedule 1 designer information, BCIN where applicable, and general review where applicable.

### Project and Job Metadata

Core job/project storage includes:

- `city`
- `region`
- `permit_number`
- `permit_family`
- `stage`
- `stage_name`
- `required_discipline`
- `project_type`
- `catalogue_model_code`

Relevant storage locations:

- `job_opportunities` in `supabase/migrations/20260307000000_job_system_foundation.sql`
- `governed_projects` in `supabase/migrations/20260407020000_project_job_validation.sql`
- completed inspection fields in `supabase/migrations/20260330010000_inspector_completion_checklist.sql`
- completed record reconciliation in `supabase/migrations/20260413090000_compliance_completed_records_reconcile.sql`
- catalogue metadata in `supabase/migrations/20260623000000_catalogue_model_code.sql`

Current limitations:

- `Region` is a TypeScript union of five Lower Mainland values: `burnaby`, `vancouver`, `surrey`, `coquitlam`, `richmond`.
- `src/lib/cityRegionMapping.ts` maps Metro Vancouver / Lower Mainland cities only.
- `project_type` is free text.
- `catalogue_model_code` is explicitly metadata/display only and must not drive template resolution, pricing, or stage logic.
- There is no governed Ontario municipality/principal-authority model.
- There is no OBC version/amendment-date field.
- There is no BCIN/designer information model.
- There is no Ontario municipal applicable-law/zoning-precheck model.

### Admin Coverage Diagnostic

Coverage Diagnostic is implemented in:

- `src/app/api/admin/checklists/coverage/route.ts`
- `src/app/admin/checklists/coverage/page.tsx`

The API reads:

- `jurisdictions`
- `inspection_stages`
- `stage_checklist_templates`
- `stage_checklist_items`
- `permit_checklist_responses` count

It reports the current resolver basis as:

- Inspection stage
- Jurisdiction, with city mapping Vancouver -> VBBL 2025 and otherwise BCBC 2024

It reports larger-project gaps as unsupported:

- Building type
- Occupancy classification
- Project complexity
- Part 3 / Part 9 path
- Floor / unit / area / location
- Mixed-use classification
- Catalogue / model designation

It also reports absent template review/publish governance.

## Current Jurisdiction/Resolver Architecture In Plain English

The current resolver is intentionally simple:

1. Convert a builder job stage and discipline into an internal inspection stage number.
2. Convert the project city into a jurisdiction slug.
3. Look up the jurisdiction row.
4. Look up the latest active template for that stage and jurisdiction.
5. Return a blank reference checklist.

Today the city-to-jurisdiction step is BC-only. Vancouver resolves to `vbbl_2025`. Everything else resolves to `bcbc_2024`.

Ontario cannot safely be added merely by allowing Toronto, Ottawa, or Mississauga in `city`, because the current fallback would incorrectly resolve those projects to BCBC 2024 unless the resolver is changed first.

## Current Inspection-Stage Architecture In Plain English

The app presents builders with a simplified 7-stage request model. Internally, Vero uses a 15-stage checklist model so trade scopes and final closeout can be represented more precisely.

This architecture can support Ontario in concept. Ontario should reuse the same normalized stage approach, but Ontario must have its own stage aliases, municipal inspection naming, and content overlays later. It should not create a second completion workspace or a second stage engine.

The immediate risk is duplication. Stage mapping currently exists in multiple places:

- shared `src/lib/inspections/builderStageMapping.ts`
- inline `InspectorCompletionWorkspace.tsx`
- final occupancy route mapping
- builder page display definitions

Ontario work should consolidate or extend carefully in later implementation loops, not add another parallel mapping table.

## Current Template/Content Architecture In Plain English

There are three template/content layers:

1. Legacy TypeScript phases in `src/lib/inspectionTemplates.ts`. These are effectively historical/orphaned for the main workflow.
2. DB templates in `jurisdictions`, `inspection_stages`, `stage_checklist_templates`, and `stage_checklist_items`. These are jurisdiction-aware and drive scope preview, reference pages, admin checklist pages, and coverage diagnostics.
3. Runtime completion model in `src/lib/inspectorCompletion.ts`. This drives the actual inspector checklist, evidence capture, outcome copy, and sealed records.

Ontario should eventually be added to the DB template layer and then reconciled into the runtime completion model only after the canonical template direction is chosen. It should not introduce a fourth rule system.

## Where Ontario Should Fit

Ontario should fit as a new jurisdiction family inside the existing Vero Permit platform:

- same app
- same user roles
- same builder dispatch flow, once enabled
- same inspector eligibility concepts, with Ontario-specific credentials later
- same DB template tables, extended later
- same coverage diagnostic concept
- same Vault/package architecture, with Ontario-specific output vocabulary later

The first safe Ontario concept is a dormant jurisdiction family, not live public routing.

Recommended first slugs:

- `obc_2024` for the province-level Ontario Building Code 2024 core
- later `toronto_obc_2024`, `ottawa_obc_2024`, and `mississauga_obc_2024` for municipal overlays if the existing slug style is preserved

Alternative longer-term slug style:

- `ca_on_obc_2024`
- `ca_on_toronto_obc_2024`
- `ca_on_ottawa_obc_2024`
- `ca_on_mississauga_obc_2024`

The longer-term style is clearer for national expansion, but the current table uses code-version slugs like `bcbc_2024` and `vbbl_2025`. The next loop should choose one naming convention before adding migrations.

Ontario should start as province-level OBC support plus explicit municipal overlay readiness, not province-only public support. The research packet shows Ontario is province-set but municipality/principal-authority enforced. A province-level `obc_2024` base can hold shared terminology and baseline document categories, but public templates should remain dormant until municipal overlays are reviewed.

## What Should Be Reused From BC

Reuse:

- the single Vero Permit app
- role model: builder, inspector, admin, authority reviewer
- governed dispatch concepts
- project/job lifecycle
- escrow/payment architecture, when Ontario is commercially enabled later
- inspector eligibility pattern
- `jurisdictions` and `stage_checklist_templates` as the place to store jurisdiction-scoped templates
- `inspection_stages` as the normalized stage backbone
- Coverage Diagnostic as the admin visibility model
- item-bound evidence capture pattern
- Vault/package audit trail pattern
- authority-boundary disclaimers

Do not reuse blindly:

- Schedule C-B naming
- BC Letters of Assurance terminology
- Technical Safety BC terminology
- WorkSafeBC terminology
- Vancouver-specific VBBL text
- BC region union values
- BC city-to-region mapping
- BCBC fallback for non-Vancouver cities

## What Must Be Ontario-Specific

Ontario needs its own:

- OBC 2024 code-family and amendment-document versioning
- principal-authority/municipality concept
- municipal overlay model for Toronto, Ottawa, Mississauga, and later cities
- Schedule 1 Designer Information support
- BCIN/designer qualification fields
- Schedule 2 sewage-system installer support where applicable
- applicable-law/zoning-precheck document categories
- municipal portal and submission terminology
- Ontario occupancy/final terminology
- ESA/electrical authority boundary language where applicable
- architect/engineer/general-review language where applicable
- Ontario small-residential project archetypes, including additional residential units, garden suites, coach houses, laneway suites, and more-than-two-unit escalation

Ontario should say "general review" where that legal/professional concept applies. It should not translate BC "professional assurance" copy directly into Ontario templates.

## Missing Fields/Data For Ontario

The current model is missing these Ontario-ready fields:

- province or jurisdiction family
- municipality/principal authority
- code family
- OBC regulation/version
- Ontario amendment-document date
- municipal overlay slug
- project archetype
- Part 3 / Part 9 path
- existing and proposed dwelling-unit count
- storeys
- building area
- occupancy classification
- mixed-use classification
- floor/unit/area/location scope
- new/addition/alteration/demolition/change-of-use status
- designer type
- BCIN number
- Schedule 1 applicability/status
- Schedule 2 sewage applicability/status
- architect/engineer/general-review involvement
- applicable-law/zoning-precheck status
- municipal portal/submission status
- external authority dependencies such as conservation authority, board of health, heritage, MTO, or ESA
- template draft/review/publish status
- template source review date
- professional/AHJ review approval status for Ontario templates

Some of these can live initially in metadata for research and pilot planning. They should not drive production behavior until migrations, resolver logic, tests, and professional/AHJ review are complete.

## Migrations That May Be Needed Later

Likely later migrations:

1. Add Ontario jurisdiction rows.

   - `obc_2024` or `ca_on_obc_2024`
   - municipal overlays only when reviewed
   - initially inactive or internal-only unless product decides otherwise

2. Extend jurisdiction metadata.

   Possible fields:

   - `country`
   - `province`
   - `municipality`
   - `principal_authority_type`
   - `parent_jurisdiction_id`
   - `code_family`
   - `code_version`
   - `amendment_version_date`
   - `source_reviewed_at`
   - `is_publicly_enabled`

3. Add project scope fields.

   Possible fields on governed projects and/or job opportunities:

   - `province`
   - `municipality`
   - `principal_authority`
   - `project_archetype`
   - `part_path`
   - `occupancy_classification`
   - `existing_unit_count`
   - `proposed_unit_count`
   - `storeys`
   - `building_area`
   - `mixed_use`
   - `location_scope`

4. Add Ontario practitioner/document fields.

   Possible fields:

   - `designer_name`
   - `designer_bcin`
   - `designer_qualification_basis`
   - `schedule_1_status`
   - `schedule_2_status`
   - `general_review_required`
   - `architect_or_engineer_engaged`

5. Add template governance fields.

   Possible fields:

   - `workflow_status`
   - `reviewed_by`
   - `reviewed_at`
   - `approved_by`
   - `approved_at`
   - `source_authority`
   - `source_url`
   - `jurisdiction_review_notes`

No migrations were authored or run in this loop.

## What Can Be Safely Scaffolded First

Safe first scaffold, after this documentation loop:

- Extract the duplicated city-to-jurisdiction logic into a shared resolver helper.
- Add tests proving BC behavior is unchanged: Vancouver -> `vbbl_2025`, current BC non-Vancouver -> `bcbc_2024`.
- Add a dormant Ontario jurisdiction helper or metadata file that is not wired into live dispatch.
- Add Ontario slugs only in a migration that keeps them inactive/internal until reviewed.
- Add Coverage Diagnostic visibility for jurisdiction families and dormant coverage, without changing resolver output.
- Add internal documentation for Ontario terminology and source governance.

Not safe as first scaffold:

- public Ontario dispatch
- routing Toronto/Ottawa/Mississauga through the existing BC fallback
- Ontario templates without municipal review
- Schedule C-B reuse for Ontario output
- Ontario professional/general-review automation without professional review
- adding Ontario regions to the current `Region` union without job-claiming and eligibility review

## What Must Not Be Touched Before BC Launch

Do not disturb:

- BC/Vancouver resolver behavior
- `bcbc_2024` and `vbbl_2025` active template resolution
- current inspector completion workflow
- Schedule C-B generation
- Vault/seal/completion security
- payment and escrow logic
- job claiming and eligibility logic
- auth/RLS policies
- Admin checklist templates
- production Supabase data
- Vercel or production deployment settings
- BC launch marketing and sales surfaces unless a separate reviewed copy pass is approved

Ontario should remain a branch-scoped expansion track until reviewed, merged, and promoted deliberately.

## Recommended Ontario Branch Plan

### 1. `audit/ontario-platform-readiness`

This branch. Documentation only.

Output:

- Repo-local audit of current BC/Vancouver architecture
- Ontario fit analysis
- next-loop recommendation

### 2. `feat/ontario-jurisdiction-scaffold`

Purpose:

- Add a shared jurisdiction resolver helper.
- Add tests preserving BC behavior.
- Add dormant Ontario jurisdiction metadata or inactive DB seed proposal.
- Add no public Ontario routing.

Guardrails:

- BC behavior must remain byte-for-byte equivalent from the user perspective.
- Non-Vancouver BC must still resolve to `bcbc_2024`.
- Ontario cities must not silently resolve to BCBC once Ontario routing is introduced.
- Ontario routes/templates must remain disabled until reviewed.

### 3. `feat/ontario-small-residential-templates`

Purpose:

- Add OBC 2024 small-residential template content after source review.
- Start with bounded province-level document/checklist categories.
- Keep municipal overlays separate.

Candidate first content:

- Application for a Permit to Construct or Demolish
- Schedule 1 Designer Information
- site plan
- drawings
- SB-12/energy documentation where applicable
- plumbing/HVAC/septic/applicable-law placeholders as conditional items

Guardrails:

- No self-serve compliance claim.
- No production enforcement until professional/AHJ review.
- No Schedule C-B language.

### 4. `feat/ontario-municipal-overlays`

Purpose:

- Add reviewed municipal overlays for Toronto, Ottawa, and Mississauga.
- Model municipal forms, portals, zoning/applicable-law, inspection aliases, and external-authority dependencies.

Guardrails:

- Overlays must be source-linked and review-dated.
- Municipal overlay templates should not become active/public without review/publish governance.
- High-risk scopes remain professional/AHJ governed.

## Specific Ontario Answers

### Can Ontario be added as a new jurisdiction family using the existing pattern?

Yes, but only as an extension of `jurisdictions` plus template resolution. The current tables can represent an Ontario jurisdiction row and Ontario templates. The current resolver cannot safely route Ontario yet because it treats all non-Vancouver cities as BCBC.

### What should the first Ontario slug or slugs be?

Recommended within the current slug style:

- `obc_2024` for dormant province-level Ontario core
- later `toronto_obc_2024`, `ottawa_obc_2024`, `mississauga_obc_2024`

Recommended if the team wants a national naming style:

- `ca_on_obc_2024`
- `ca_on_toronto_obc_2024`
- `ca_on_ottawa_obc_2024`
- `ca_on_mississauga_obc_2024`

Choose one convention before any migration.

### Province-level OBC only, or municipal overlays too?

Start with a province-level OBC core for internal planning and shared terminology, but do not launch Ontario as province-only. Ontario is municipality/principal-authority enforced. Municipal overlays are necessary before public template claims.

### What code paths would need to know about Ontario?

Later implementation would touch:

- jurisdiction resolver helper
- `resolveActiveTemplate`
- `/api/inspections/resolve-template`
- inspector stage reference page
- Coverage Diagnostic
- builder dispatch city/province/region handling
- inspector eligibility regions and credentials
- runtime completion overlay inference
- authority package wording
- Vault/package output labels
- tests guarding BC behavior

This loop touched none of those code paths.

### What database changes would likely be needed later?

Later changes likely include jurisdiction metadata, Ontario jurisdiction rows, project scope fields, practitioner/designer fields, municipal overlay governance, and template review/publish fields. No database changes were made in this loop.

### What template/content work would be needed later?

Ontario content work should cover:

- OBC 2024 provincial base
- amendment-document date tracking
- Schedule 1 and BCIN/designer information
- Schedule 2 sewage paths
- municipal applicable-law/zoning forms
- Toronto/Ottawa/Mississauga overlays
- Ontario inspection aliases
- occupancy/final terminology
- general-review and architect/engineer boundaries

### What should remain dormant/disabled until Ontario is reviewed?

Remain dormant:

- Ontario dispatch
- Ontario template resolution
- Ontario public claims
- Ontario inspector eligibility
- municipal overlays
- Ontario authority package generation
- any Ontario compliance or professional review automation

### How do we avoid breaking BC?

Avoid BC breakage by:

- adding Ontario behind inactive/dormant flags first
- keeping `bcbc_2024` and `vbbl_2025` untouched
- adding regression tests for current BC city resolution
- not changing Schedule C-B paths
- not adding Ontario values to the current `Region` union until job claiming is reviewed
- not replacing the existing completion workspace
- not changing production settings or hosted Supabase

## Clear Recommendation For The Next LOOP

Next LOOP should be `feat/ontario-jurisdiction-scaffold`.

Recommended scope:

1. Create a shared jurisdiction resolver helper.
2. Preserve BC behavior with tests.
3. Add a dormant Ontario jurisdiction model/design artifact or inactive seed plan.
4. Make Coverage Diagnostic capable of describing dormant/future jurisdiction families.
5. Do not activate Ontario public routing.
6. Do not add Ontario templates yet.
7. Do not touch payments, auth/RLS, Vault/seal security, job claiming, or production deployment.

The first technical goal is preventing the unsafe fallback where an Ontario city would resolve to BCBC 2024. The first product goal is keeping Ontario as an expansion path while BC/Vancouver launch remains stable.

## LOOP 02 Scaffold Notes

The first dormant scaffold should do only three things:

- centralize BC jurisdiction resolution so the duplicated Vancouver/BCBC mapping does not drift,
- preserve live BC behavior exactly, and
- introduce Ontario as inactive metadata so explicit Ontario context cannot silently receive a BCBC template.

The dormant Ontario scaffold is not a public launch. It should not add database rows, enable dispatch, create templates, change inspector eligibility, or alter Schedule C-B/Vault/seal behavior. Future Ontario slugs remain planning metadata until reviewed:

- `obc_2024`
- `toronto_obc_2024`
- `ottawa_obc_2024`
- `mississauga_obc_2024`

## LOOP 03 Admin Coverage Visibility Notes

The dormant Ontario scaffold can be shown in Coverage Diagnostic as an admin-only readiness signal. This is visibility, not activation.

The admin diagnostic should clearly report:

- Ontario is planned, dormant, and not publicly enabled,
- Ontario dispatch is disabled,
- Ontario templates are not active,
- explicit Ontario context is blocked from falling back to BCBC, and
- planned slugs remain `obc_2024`, `toronto_obc_2024`, `ottawa_obc_2024`, and `mississauga_obc_2024`.

This does not add database rows, migrations, Ontario checklist templates, builder dispatch options, inspector claiming behavior, Schedule C-B changes, Vault/seal changes, or production settings. The live BC/Vancouver coverage matrix remains driven by active DB jurisdictions and stages only.

## LOOP 04 Small Residential Template Foundation Notes

The first Ontario template foundation should remain TypeScript-only planning metadata. It can help admins see the future Ontario small-residential coverage shape without creating live Supabase checklist templates or routing Ontario work into production.

The dormant foundation should describe draft/internal categories for:

- Ontario Building Code 2024 small residential core,
- Application for a Permit to Construct or Demolish,
- Schedule 1 Designer Information,
- BCIN/designer information placeholders,
- site plan,
- architectural drawings,
- structural drawings/details where applicable,
- energy efficiency / SB-12 where applicable,
- HVAC / mechanical scope,
- plumbing scope,
- electrical authority boundary,
- applicable law / zoning / municipal precheck,
- final inspection / occupancy readiness, and
- future Toronto, Ottawa, and Mississauga municipal overlay review.

This foundation is not an active checklist template. It should be shown only in Admin Coverage Diagnostic or another internal admin-only review surface. It must not add database rows, migrations, Ontario dispatch, Ontario public routing, Ontario inspector claiming, Schedule C-B wording, Vault/seal behavior, or production settings.

## LOOP 05 Stage-Aligned Template Matrix Notes

The Ontario template foundation can be mapped to Vero's existing S01-S15 stage architecture as a dormant planning matrix. This keeps Ontario inside the existing Vero Permit platform instead of creating a separate Ontario workflow.

The stage matrix should remain TypeScript-only internal planning metadata. It should show draft Ontario coverage for the existing stages, including:

- S01 site survey / excavation readiness,
- S02-S05 planning, site, foundation, and structural readiness where applicable,
- S06-S07 framing and architectural/envelope review readiness,
- S09 plumbing scope placeholder,
- S10 electrical authority boundary placeholder,
- S11 HVAC / mechanical scope placeholder,
- S12 energy efficiency / SB-12 placeholder,
- S13 interior completion readiness,
- S14 exterior/site finalization readiness, and
- S15 final inspection / occupancy readiness placeholder.

This matrix is not an active checklist, does not participate in DB template resolution, does not create Ontario checklist responses, and does not enable Ontario dispatch, public routing, inspector claiming, Schedule C-B wording, Vault/seal behavior, or production settings. Toronto, Ottawa, and Mississauga overlays remain future/review-required placeholders.

## LOOP 06 Template Governance and Source Review Notes

The Ontario foundation and stage matrix need a dormant governance layer before any future activation decision. The layer should remain TypeScript-only internal planning metadata and should identify review status, source categories, production approval state, and activation blockers.

The governance layer should report:

- foundation status: draft, dormant, not active,
- stage matrix status: draft, dormant, not active,
- public availability: not publicly enabled,
- builder dispatch: disabled,
- inspector claiming: disabled,
- active DB template resolution: not participating,
- source review: required before activation,
- professional/AHJ review: required before activation,
- municipal overlays: future review required,
- production approval: not granted, and
- checklist responses: none expected while dormant.

Source categories remain draft/internal references for OBC 2024 core, municipal building department requirements, Schedule 1 Designer Information, BCIN/designer information, applicable law/zoning/municipal precheck, energy efficiency/SB-12, trade authority boundaries, final inspection/occupancy readiness, and future Toronto, Ottawa, and Mississauga overlays.

This governance layer does not approve Ontario content, does not make templates live, and does not change BC/Vancouver resolver behavior, dispatch, inspector claiming, Schedule C-B, Vault/seal behavior, or production settings.

## LOOP 07 Municipal Overlay Foundation Notes

Toronto, Ottawa, and Mississauga municipal overlays should be represented as dormant internal planning metadata only. The overlay foundation should make municipal readiness visible to admins without creating Supabase rows, active templates, dispatch paths, inspector claiming, public Ontario routing, or production behavior.

Each municipal overlay should remain:

- draft, planned, dormant, and not active,
- not publicly enabled,
- excluded from active DB template resolution,
- excluded from Ontario dispatch and inspector claiming,
- not production approved,
- blocked by municipal source review,
- blocked by professional/AHJ review, and
- connected to the existing dormant Ontario foundation and governance layer rather than a second workflow.

Planned municipal source categories should remain review-only references for municipal permit application requirements, zoning/applicable-law precheck, drawing submission expectations, inspection naming differences, portal/submission process, local forms and supplemental documents, external authority dependencies, and future reviewed checklist overlays.

This municipal overlay foundation must not reuse BC Schedule C-B terminology for Ontario, must not imply municipal approval or compliance, and must not activate Toronto, Ottawa, Mississauga, or `obc_2024` for live checklist resolution.

## LOOP 08 Admin Resolver Dry-Run Notes

Ontario resolver dry-run support should remain admin-only internal planning metadata. It can show how future Ontario inputs would be classified without participating in active DB template resolution or public workflows.

The dry-run should report sample outcomes for:

- Ontario province-level / OBC 2024 -> `obc_2024`,
- Toronto -> `toronto_obc_2024`,
- Ottawa -> `ottawa_obc_2024`, and
- Mississauga -> `mississauga_obc_2024`.

Each dry-run result must remain dormant and must state that public routing, dispatch, inspector claiming, active DB template resolution, and checklist responses are disabled. Source review, professional/AHJ review, and production approval remain activation blockers.

The dry-run is not a resolver activation path. Explicit Ontario context must continue to block silent fallback to `bcbc_2024`, and BC/Vancouver behavior must remain unchanged.

## Documentation-Only Confirmation

This audit is documentation only.

No app code, migrations, checklist templates, hosted Supabase state, SQL, Supabase CLI actions, migration repair, auth/RLS, Stripe/payments, Vault/seal/completion security, job claiming, escrow/payment eligibility, environment variables, Vercel settings, production settings, deployments, or promotion steps were touched by this document.
