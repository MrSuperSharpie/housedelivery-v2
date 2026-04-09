# SiteLine Master Workflow Blueprint (Phase 1: SFH & Prefab Focus)

## Purpose
This document is the source-of-truth workflow blueprint for SiteLine. It is written to guide product decisions and coding implementation.

**PHASE 1 STRATEGIC SCOPE:** SiteLine Phase 1 is strictly focused on standard Single-Family Homes (SFH) and Prefabricated Modular builds (specifically supporting House Delivery Inc. and First Nations communities). We are explicitly NOT building the commercial Vancouver Certified Professional (CP-1/CP-2) stream. 

SiteLine is **not** just a job board, dashboard, or inspection checklist tool.

SiteLine is the **control plane for residential and prefab field inspections**:
- verified builders
- verified Licensed Trade Inspectors and Registered Professionals
- governed assignment logic
- on-site evidence capture (geo-located, time-stamped, and offline-capable)
- pass / fail / hold outcomes with strict aging rules
- admin review and release control
- project-aware authority-ready package generation
- escrow, payout, refunds, and disputes
- immutable audit and archive

---

## Core Product Position
Use this sentence internally and externally:

**SiteLine Phase 1 is the governed marketplace and evidence control plane for residential and prefab field inspections. It dispatches only approved and eligible Licensed Trade Inspectors and Registered Professionals, captures immutable site evidence, governs Pass / Fail / Hold outcomes within role-specific authority, and produces authority-ready residential packages.**

---

## Non-Negotiable System Rules
These rules govern the entire product and protect platform liability.

### Access, Approval, and Scope Rules
1. No live job posting unless the builder is **approved**.
2. No inspector application or assignment unless credentials are **approved**.
3. **Scope-Limited Approval:** No inspector may approve outside their discipline, permit family, credential class, assigned stage, or jurisdiction eligibility.

### Permit and Authority Profile Rules
4. Every project must declare its **Authority Profile** (municipality/First Nation, permit family, package recipient, required deliverable type) before export is allowed.
5. Building permits and electrical permits remain strictly separate workflows and produce separate package sections.
6. **LOA Restriction:** Letters of Assurance (LOAs) may only be included where the project legally requires them and where they are issued by the appropriate Registered Professional. They are not generated for standard trade inspections.

### Submission, Evidence, and Offline Rules
7. Evidence must preserve original timestamp, geolocation, uploader identity, and file checksum.
8. **Offline/Low-Signal Logic:** If GPS/network is unavailable, the app must capture offline device metadata, allow delayed sync, and flag the evidence for Admin review to preserve integrity in remote communities.
9. Original evidence files are immutable; annotations are stored as derivatives.

### Audit and Financial Rules
10. Every decision, status change, and assignment must create an immutable audit event.
11. Payouts are blocked while disputes or blocking deficiencies remain. Reinspections require a new linked submission and new escrow authorization.

---

## Roles

### Builder
Creates projects, posts jobs, funds escrow, reviews results, acknowledges Hold retainer time if desired, and receives final records.

### Licensed Trade Inspector / Registered Professional
Completes the inspection, uploads evidence, records notes, and decides Pass / Fail / Hold within the strict limits of their approved trade role and jurisdiction. (e.g., Electrical FSR, Structural Engineer, Plumbing Inspector).

### Admin
Runs the control plane:
- user approvals & credential review
- assignment integrity & live submission review
- Hold aging / site-retainer review
- package release & payments / disputes

---

## End-to-End Workflow

*(Phases 1-5 remain standard governed marketplace mechanics: Onboarding, Job Posting via Escrow, Provisional Assignment, and On-Site Execution with mandatory GPS/Timestamp/Offline capture.)*

## Phase 6: Technical Outcomes

### 16. Pass
Pass can only be issued if the inspected scope passed, required checklist items and minimum evidence thresholds are met, and no open Holds or blockers remain within that inspector's scope.
- submission moves to `submitted_for_review`
- admin reviews completeness
- if accepted, submission moves to `sealed` and the final PDF package is generated.

### 17. Hold
Hold is used when correction is practical on-site or same visit, keeping the same acting reviewer.
- **Hold Aging Rule:** A Hold must either resolve within the allowed retained-time / aging window or automatically convert into a required reschedule / return-visit workflow with Admin escalation.
- Builder can acknowledge retained time for immediate correction OR decline and stop work.

### 18. Fail
Fail is used when the scope did not pass and immediate correction is not possible.
- A new linked return visit is required.
- The previous failed record remains immutable (no silent overwriting).
- Reinspection triggers new return-visit economics (new escrow).

---

## Phase 8: Package Generation and Authority Delivery

### 22. Governed Package Types
Right now, SiteLine must support controlled package types based on the Project Authority Profile:
- **Trade Inspection Record**
- **Residential Authority Submission Package**
- **LOA-Supplemented Submission Package**
- **Funding / Draw Release Package (BCH)**

### 23. Authority-Ready Package Structure
Every final package export must be a pristine PDF that includes:
1. **Cover Page**: Package ID, project name, permit number, stage, result, and sealed timestamp.
2. **Compliance Summary**: Pass/Fail count and final disposition.
3. **Declarations**: The standard inspector declaration OR proper LOAs (only if required).
4. **Evidence Appendix**: Cleanly indexed photos/notes with GPS Coordinates, offline-sync flags (if applicable), timestamps, uploader ID, and checksums.
5. **Hold and Deficiency History**: Log of any corrected issues.

---

## Strategic Extension Hooks for House Delivery Inc. & BCH

### Housing Calculator Hook
Feed back into cost and delivery estimates: likely Hold risk, compliance reserve, and schedule friction by jurisdiction.

### Funding Pathways Hook (Build Canada Homes)
Tie milestone evidence directly to capital release. SiteLine proves draw release readiness and grant milestone readiness in days, unlocking BCH funding instantly.

---

## Build Guidance for Claude
Use this blueprint as the implementation source of truth.

### First Build Priorities (Phase 1 SFH Scope)
1. Add the geo-coordinates to the Evidence Appendix.
2. Build the standard SFH Inspector Declaration block.
3. Add print-optimized CSS for a professional PDF layout.
4. Wire through the Permit Number to the cover sheet.
5. Preserve the strict governed assignment and Hold/Escrow logic. 

**DO NOT build commercial Certified Professional (CP-1/CP-2) forms or architectural code-coordination hierarchies.**