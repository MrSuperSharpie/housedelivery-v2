# Larger-Build Coverage Diagnostic Audit

Date: 2026-07-07

Branch: `docs/larger-build-coverage-diagnostic-audit`

Purpose: Document what Vero Permit currently supports for larger projects and what remains future-phase work.

## Executive Verdict

Vero Permit is currently strongest for smaller and simpler projects: single-family homes, small builders, staged residential-style inspections, and controlled Part 9 launch paths.

The Admin Coverage Diagnostic is accurate: larger-building dimensions are visible as diagnostic gaps, but they are not governed resolver inputs today. The current DB checklist resolver uses inspection stage and jurisdiction only. Larger-project concepts appear in checklist language, runtime guidance, and display metadata, but they do not yet drive template selection, inspector eligibility, evidence enforcement, or authority package scoping.

This means larger-build support is partly represented and diagnostically understood, but not yet ready as a governed workflow for office buildings, apartment buildings, mixed-use projects, 5-storey buildings, broad Part 3 paths, or complex multi-unit development.

## Current Resolver Basis in Plain English

The live DB checklist resolver works like this:

1. A builder-facing job stage is converted into a DB inspection stage number.
2. The project city is mapped to a jurisdiction.
3. Vancouver resolves to `vbbl_2025`; other BC projects fall back to `bcbc_2024`.
4. The resolver selects the latest active checklist template for that stage and jurisdiction.

The resolver does not currently consider building type, occupancy classification, project complexity, Part 3 / Part 9 path, floor, unit, area, location, mixed-use classification, or catalogue/model designation.

The Coverage Diagnostic screen reports this directly. Its "Current Resolver Basis" section reflects the live resolver, and its "Larger-Project Gaps" section lists project dimensions that are not used by the resolver.

## What Vero Supports Today

Vero supports a practical small-project launch shape:

- Builder dispatch by site address, city, permit reference, stage, discipline, schedule, and optional small-housing catalogue label.
- A builder-facing 1-7 stage request model mapped into the internal 15-stage permit checklist model.
- Jurisdiction-aware DB template reference coverage for Vancouver vs provincial BC templates.
- A richer runtime inspector completion workspace with 15 stages, item-level status, evidence capture, field notes, AHJ overlay copy, and authority-boundary disclaimers.
- Basic project and job metadata such as `project_type`, `permit_family`, `permit_number`, `required_discipline`, `region`, and `catalogue_model_code`.
- Small-housing catalogue metadata for micro/ADU, mini home, duplex, rowhouse, BC fourplex variants, and sixplex.
- Inspector eligibility by verified discipline, approved role lane, credential authority, and region.
- Vault and authority package output that records jurisdiction, stage, permit, evidence, inspector, and authority disclaimers.

Important limitation: `catalogue_model_code` is explicitly metadata/display only. It does not alter inspection stages, checklist templates, resolver behavior, pricing, or eligibility. `project_type` is free text and can influence runtime overlay wording, but it is not a governed large-building classifier.

## What Is Not Yet Governed for Larger Buildings

The following larger-project dimensions are not yet governed inputs:

- Building type, such as house, townhouse, apartment, office, commercial, or mixed-use.
- Occupancy classification.
- Project complexity.
- Part 3 / Part 9 code path.
- Floor, unit, area, suite, or inspected-location scope.
- Mixed-use classification or segmented occupancies.
- Building area, height, storeys, unit count, or high-building triggers as resolver inputs.
- Catalogue/model designation as a compliance driver.
- Template draft/review/publish governance beyond `version`, `is_active`, and effective dates.
- Professional/AHJ review rules for larger-building template applicability.
- Inspector eligibility tiers for Part 3 apartment, mixed-use, office/commercial, high-building, or occupancy-specific work.

Some of these topics appear in checklist text. For example, the runtime completion model references Part 3 / Part 9, occupancy context, registered professionals, fire authority, AHJ acceptance, TSBC, WorkSafeBC, and professional assurance. Those references are guidance and record language, not a complete governed model.

## Larger-Project Risks If Rushed

Rushing larger-build support before the data model is ready could create false confidence.

Key risks:

- A complex building could receive a simple stage/jurisdiction checklist because the resolver cannot distinguish occupancy, Part path, storeys, mixed-use, or professional assurance triggers.
- Inspectors could be matched by discipline alone even when the job needs a more specific large-building competency or professional authority.
- Evidence requirements could be under-scoped for concealed work, life-safety systems, commissioning, fire authority, professional assurance, or occupancy dependencies.
- Authority packages could imply broader readiness than Vero can defensibly support.
- Mixed-use or multi-building projects could lose scope clarity without floor/unit/area/location identifiers.
- Admins could lack review/publish controls for templates that need professional or AHJ approval before use.
- The small-project launch could be destabilized by premature schema, resolver, and template expansion.

The safest interpretation is that larger-build support is a roadmap track, not a launch promise.

## Recommended Phased Roadmap

### Phase 1: Launch-Safe Small-Project Support

Keep launch focused on single-family homes, small Part 9 projects, and simple staged residential inspections.

Recommended work:

- Preserve the current stage and jurisdiction resolver.
- Keep small-housing catalogue data as display metadata only.
- Tighten launch copy so Vero does not imply comprehensive Part 3 or mixed-use coverage.
- Continue improving evidence hints, AHJ boundary language, and small-project workflow clarity.
- Avoid hard enforcement for larger-building dimensions until the model exists.

### Phase 2: Larger Part 9 and Small Multi-Unit

Add structured small multi-unit project taxonomy without disrupting the launch flow.

Recommended work:

- Add governed fields for building category, unit count, storeys, project subtype, and scope path.
- Distinguish single-family, duplex, rowhouse, fourplex, sixplex, townhouse, and small apartment-like Part 9 cases.
- Add resolver-safe optional template variants for small multi-unit conditions.
- Add item-level applicability rules for N/A and evidence prompts.
- Keep professional/AHJ review questions out of hard enforcement until approved.

### Phase 3: Part 3, Multi-Storey, and Mixed-Use

Create the larger-building model explicitly.

Recommended work:

- Add structured Part 3 / Part 9 path.
- Add occupancy classification and mixed-use segmentation.
- Add floor, unit, area, suite, and inspected-location scope.
- Add building height, storeys, area, sprinkler/fire alarm, and life-safety system triggers.
- Separate observation evidence, permit/status proof, commissioning/test evidence, and professional assurance documents.
- Add project-scope-specific template resolution and package scoping.

### Phase 4: Professional/AHJ Governed Enterprise Support

Add enterprise controls for complex projects and authority collaboration.

Recommended work:

- Add template draft/review/publish governance.
- Add professional/AHJ review and approval status fields for template families.
- Add large-building inspector eligibility tiers and role-specific authority.
- Add governed authority package workflows for submission, review, response, and resubmission.
- Add audit trails that distinguish Vero package readiness from AHJ approval, occupancy issuance, or registered-professional certification.

## Launch Boundary Statement

For controlled launch, Vero Permit should be positioned around smaller projects, simpler Part 9 paths, and evidence-backed inspection workflow support. It should not be positioned as a complete large-building, Part 3, mixed-use, office/commercial, or authority-replacement platform yet.

Vero can record observations, evidence, field notes, and submitted documents. It must not imply that it replaces an AHJ, TSBC, WorkSafeBC, fire authority, registered professional, municipal occupancy decision, or statutory professional assurance process.

Larger-build expansion should happen after launch through deliberate model, template, professional review, and AHJ-governed phases.

## Documentation-Only Confirmation

This audit is documentation only.

No app code, migrations, Supabase configuration, SQL, production settings, Stripe/payment logic, auth/RLS, Vault/seal/completion security, job claiming, escrow/payment eligibility, Admin UI checklist templates, or template resolver behavior are changed by this document.
