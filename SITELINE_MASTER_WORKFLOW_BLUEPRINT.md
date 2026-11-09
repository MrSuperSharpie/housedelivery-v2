# Vero Master Workflow Blueprint (Phase 1: SFH & Prefab Focus)

## Purpose
This document is the source-of-truth workflow blueprint for Vero (formerly SiteLine). It is written to guide product decisions and coding implementation.

**PHASE 1 STRATEGIC SCOPE:** Vero Phase 1 is strictly focused on standard Single-Family Homes (SFH) and Prefabricated Modular builds. We are explicitly NOT building the commercial Vancouver Certified Professional (CP-1/CP-2) stream at this time. 

Vero is **not** just a job board, dashboard, or inspection checklist tool.

Vero is the **control plane for residential and prefab field inspections**:
- verified builders
- verified Licensed Trade Inspectors and Registered Professionals
- governed assignment logic
- on-site evidence capture (geo-located, time-stamped, and offline-capable)
- pass / fail / hold outcomes with strict aging rules
- admin review and release control
- project-aware authority-ready package generation via Secure Hosted Links
- escrow, payout, refunds, and disputes
- immutable audit and archive

---

## Core Product Position
Use this sentence internally and externally:

**Vero Phase 1 is the governed marketplace and evidence control plane for residential and prefab field inspections. It dispatches only approved and eligible Licensed Trade Inspectors and Registered Professionals, captures immutable site evidence, governs Pass / Fail / Hold outcomes within role-specific authority, and produces authority-ready digital compliance packages.**

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
12. **Rate Card Lockdown:** The premium rate card is permanently locked at 1.5x the standard hourly rate of the platform. The Inspector (and CP) has zero UI access, API access, or system permissions to reduce, discount, or override this platform-mandated rate. All financial logic, fee calculations, and escrow holding amounts are governed strictly by the admin control plane, not the field user.

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
- if accepted, submission moves to `sealed` and the final package is generated.

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
Right now, Vero must support controlled package types based on the Project Authority Profile:
- **Trade Inspection Record**
- **Residential Authority Submission Package**
- **LOA-Supplemented Submission Package**
- **Funding / Draw Release Package (BCH)**

### 23. Authority-Ready Delivery Mechanism (The Secure Link Strategy)
The final delivery mechanism to the Authority must bypass municipal email attachment limits using a lightweight summary email containing a secure, cloud-hosted link. 
* **The Summary PDF:** A lightweight, text-only PDF containing the Cover Page, Compliance Summary, Declarations, and Deficiency History.
* **The Hosted Link:** Rich media (video/high-res photos/GPS coordinates) must NEVER be sent as email attachments. The email must include a secure link to the Vero Compliance Dashboard where the Authority can view the full, high-fidelity Evidence Appendix directly in their web browser.

---

## Strategic Extension Hooks

### Housing Calculator Hook
Feed back into cost and delivery estimates: likely Hold risk, compliance reserve, and schedule friction by jurisdiction.

### Funding Pathways Hook
Tie milestone evidence directly to capital release. Vero proves draw release readiness and grant milestone readiness in days, unlocking funding instantly.

---

## Build Guidance for Claude/Codex
Use this blueprint as the implementation source of truth.

### First Build Priorities (Phase 1 SFH Scope)
1. Add the geo-coordinates to the Evidence Appendix.
2. Build the standard SFH Inspector Declaration block.
3. Wire through the Permit Number to the cover sheet.
4. Preserve the strict governed assignment, fixed 1.5x Escrow rate, and Hold logic. 
5. Build the Secure Hosted Link dashboard for Authority viewing.

**DO NOT build commercial Certified Professional (CP-1/CP-2) forms, architectural code-coordination hierarchies, or UI rate-editing tools for inspectors.**