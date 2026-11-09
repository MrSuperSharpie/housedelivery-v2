# SiteLine True North
## Directional Flow, Operating Rules, and Roadmap

## 1. Purpose

This document defines the operating truth for SiteLine.

It exists to stop product drift, reduce decision fatigue, and ensure every team member understands how the platform must behave under real-world regulatory pressure.

SiteLine is not a loose marketplace, a generic dashboard, or a simple inspection checklist app.

SiteLine is a governed compliance control plane for regulated field inspections:
- verified builders
- verified inspectors / certified professionals
- governed job posting and assignment
- standardized stage-specific inspection execution
- time-stamped and geolocated evidence capture
- controlled Pass / Fail / Hold outcomes
- admin review and release control
- authority-ready professional packaging
- escrow, payout, refund, and dispute control
- secure archive retention and audit traceability

## 2. True North Statement

**SiteLine is the governed control plane for regulated inspections: approved parties, validated work, immutable evidence, controlled outcomes, authority-ready packages, and auditable release of money and records.**

## 3. Core Product Position

SiteLine is a premium governed marketplace built to sell two outcomes:
- Risk Mitigation
- Velocity

That means the platform must move faster than traditional coordination, but never at the expense of:
- credential integrity
- permit-family integrity
- evidence integrity
- assignment integrity
- payout integrity
- authority trust

## 4. Foundational Design Principles

1. No uncontrolled movement.
2. No technical outcome controlled by the payer.
3. No authority trust without chain of custody.
4. No payout before governance clears.
5. No scale through recklessness.

## 5. Core Actors

### 5.1 Admin
Admin runs the control plane. Admin:
- reviews onboarding documents
- approves or rejects Builders
- approves or rejects Inspectors / CPs
- manages governed dispatch exceptions
- reviews submissions
- validates Holds
- controls package sealing and export
- governs disputes and payouts
- administers archive and audit

### 5.2 Builder
Builder:
- creates an account
- uploads company and compliance documents
- creates projects
- posts jobs
- funds escrow
- confirms site readiness
- responds to Holds
- receives outcomes
- retrieves final records

### 5.3 Inspector / Certified Professional
Inspector / CP:
- creates an account
- uploads credentials
- becomes eligible by permit family, discipline, and jurisdiction
- claims governed work
- performs inspections
- uploads evidence
- issues Pass / Fail / Hold

### 5.4 Authority Reviewer / Final Authority
Authority reviewers receive tightly controlled, package-scoped, project-scoped, read-only access to the final submission and supporting materials.

### 5.5 Vault
Vault is SiteLine’s secure long-term archive for completed inspection records, evidence, and packaged submissions.

## 6. Non-Negotiable System Rules

### 6.1 Approval Rules
- No Builder can post live jobs until approved.
- No Inspector / CP can participate in governed dispatch until approved.
- Restricted dashboards must be blocked until approval.
- Suspended users lose access immediately.
- Expired critical credentials trigger restriction or suspension based on policy.

### 6.2 Permit Integrity Rules
- Permit family and discipline must match.
- Electrical authority does not substitute for building authority.
- Jobs must validate against permit family, discipline, jurisdiction, and stage before going live.

### 6.3 Evidence Rules
- Evidence must preserve original timestamp, uploader, and checksum.
- Geolocation should be validated through a reasonable geofence, not a brittle universal distance threshold.
- Original evidence is immutable.
- Markups and annotations are stored as derivatives, never replacements.

### 6.4 Hold Rules
- Only the Inspector / CP can initiate a Hold.
- A Hold is a technical state, not a pricing trick.
- If the Builder accepts the Hold, retained time starts, premium charges accrue under rule, correction happens, and the Inspector resolves Pass or Fail.
- If the Builder declines the Hold, the outcome immediately proceeds to Fail.
- No submission can be sealed while a Hold is open.

### 6.5 Package Rules
- No package can export with technical blockers.
- Every package must carry version metadata.
- Every sealed package must generate a digital fingerprint:
  - package hash
  - verification code
  - seal timestamp
  - sealed-by identity
  - export history

### 6.6 Commercial Rules
- Jobs must be pre-funded before going live.
- The pre-funded amount includes base fee, priority multiplier where applicable, estimated Hold exposure, and SiteLine commission.
- Base inspection fee can still be earned on a valid Fail, subject to rules and blockers.
- Hold premiums only accrue after Builder acknowledgment.
- No payout can be released while blocking disputes or control-plane exceptions remain.

### 6.7 Audit Rules
Every meaningful controlled event must create an audit record:
- approval
- rejection
- suspension
- reinstatement
- job validation outcome
- assignment claim
- objection
- override
- check-in
- outcome selection
- Hold initiation
- Hold acknowledgment / decline
- sealing
- export
- payout decision
- refund
- dispute opening / resolution

## 7. Approval Automation Policy

### Tier 1 — Fully Manual
Use manual review for:
- first-time Builder approval
- first-time Inspector / CP approval
- credential ambiguity
- conflict flags
- Holds
- disputes
- package sealing
- payout exceptions

### Tier 2 — Assisted Validation
Automate low-risk checks:
- required fields complete
- document missing
- document expiry date
- duplicate account detection
- permit-family / discipline mismatch
- invalid jurisdiction match
- payment authorization present
- project completeness
- dependency blockers

### Tier 3 — Provisional Approval
Where trusted external verification becomes available, allow provisional approval for:
- objective registry validation
- licence format and registry confirmation
- good standing confirmation where supported
- auto-suspension on expiry

Principle:
**Automate repetitive objective validation, not judgment-heavy regulatory decisions.**

## 8. The Master Flow Path

The universal SiteLine operating sequence is:

**Identity and approval → project creation → job validation → governed assignment → pre-site confirmation → on-site inspection → admin review → package generation → authority delivery → payout / refund / dispute resolution → archive**

Nothing important should jump around this.

## 9. Builder Flow

### 9.1 Builder Onboarding
Builder provides:
- legal business name
- operating name
- authorized signatory
- contact details
- business address
- billing contact
- banking / refund information
- operating regions
- requested permit-family access

Builder uploads:
- business registration / incorporation
- proof of signing authority
- government ID for signatory
- certificate of insurance
- WorkSafe or equivalent where applicable
- tax / billing information
- permit / compliance documentation required by policy

Conditional documents:
- residential builder licence
- warranty registration
- municipal licences
- owner authorization letters
- project-specific endorsements

Builder statuses:
- draft
- submitted
- under_review
- needs_info
- approved
- rejected
- suspended

### 9.2 Builder Approval
Admin reviews document by document and either:
- approves
- rejects
- requests more info
- suspends
- reinstates

### 9.3 Project Creation
Builder creates a project, which is the parent record:
- project name
- address
- jurisdiction
- permit family
- permit number
- stage
- required discipline
- plans and supporting documents
- site contact
- access notes
- safety notes
- project-level document room

### 9.4 Job Creation
Builder creates a job under the project:
- stage-specific inspection request
- one, two, or three possible time slots
- checklist type
- rate context
- rush flag
- Hold retainer settings
- notes and attachments

### 9.5 Escrow Funding
Before going live, Builder pre-funds:
- base inspection fee
- rush multiplier, if any
- estimated Hold exposure
- SiteLine commission

### 9.6 Validation Gate
A job cannot go live unless:
- Builder approved
- project complete
- permit family valid
- discipline valid
- required docs uploaded
- escrow green
- no admin risk lock
- no dependency blocker from prior stage

### 9.7 Dependency Logic
Examples:
- framing cannot be booked until foundation is sealed
- insulation cannot be booked until framing is sealed
- close-in cannot be booked until rough-in is sealed
- linked correction work must be closed before next stage opens

## 10. Inspector / CP Flow

### 10.1 Inspector / CP Onboarding
Inspector / CP provides:
- legal name
- contact information
- profile photo
- service regions
- permit-family interests
- discipline
- availability
- banking information

Uploads:
- government ID
- credential documents
- registrations / licences
- good standing evidence where applicable
- insurance
- experience summary
- independence / conflict declaration
- evidence handling acknowledgment

Statuses:
- draft
- submitted
- under_review
- needs_info
- approved
- rejected
- suspended

### 10.2 Inspector / CP Approval
Admin verifies:
- credential validity
- permit-family fit
- discipline fit
- jurisdiction fit
- expiry dates
- insurance
- conflict declarations

### 10.3 Governed Dispatch
SiteLine is not open bid-and-select.
It uses governed dispatch:
- only eligible inspectors see jobs
- first valid claim creates provisional assignment
- Builder may only object for governed reasons
- Admin can confirm, cancel, or override

### 10.4 Pre-Site Confirmation
Inspector confirms:
- ETA
- availability
- document review
- no conflict
- readiness to attend

### 10.5 On-Site Execution
Inspector checks in and records:
- timestamped photos
- geolocated photos
- video
- field notes
- correction evidence where applicable

### 10.6 Outcome Selection
Inspector issues:
- Pass
- Fail
- Hold / Modification Required

## 11. Admin Flow

### 11.1 Admin as Control Plane
Admin home should manage queues for:
- Builder approvals
- Inspector / CP approvals
- live job exceptions
- submissions awaiting review
- open Holds
- packages pending export
- payouts blocked
- disputes open
- expiring credentials
- archive requests

### 11.2 Submission Review
Admin checks:
- completeness
- evidence sufficiency
- geolocation reasonableness
- timestamp integrity
- outcome logic
- required declarations
- unresolved blockers

Possible actions:
- approve / seal
- request more info
- return for correction
- escalate exception

### 11.3 Hold Review
Admin checks:
- hold reason
- acknowledgment path
- retained time
- premium charges
- correction evidence
- final resolution

### 11.4 Package Review
Admin confirms:
- sealed submission
- no open Hold
- no technical blocker
- correct recipient
- version set
- digital fingerprint generated

### 11.5 Payments and Disputes
Admin governs:
- payout readiness
- refund requests
- no-show logic
- overbilled Hold time
- assignment integrity disputes
- commercial exceptions

Important distinction:
- technical blockers stop sealing and export
- commercial blockers stop payout and refund release

### 11.6 Archive and Audit
Admin can:
- retrieve prior records
- view export history
- re-export
- place legal / insurance hold
- inspect full audit trail

## 12. Authority Reviewer Flow

Authority access must remain:
- package-scoped
- project-scoped
- read-only
- time-limited
- version-controlled
- fully audited

Authority may:
- view final package
- view evidence index
- review included attachments
- review correction / Hold history
- acknowledge receipt
- return comments or deficiencies

Authority may not:
- browse the Vault
- view onboarding files
- view escrow or payout data
- modify internal records

## 13. Final Documentation and Chain of Custody

Every completed inspection must produce a **Defensible Professional Record**.

Minimum package contents:
1. cover page
2. project summary
3. compliance summary
4. item-by-item inspection log
5. evidence index
6. Hold and deficiency history
7. declarations and signatures
8. audit and version page

Mandatory chain-of-custody controls:
- immutable originals
- checksum on files
- package hash
- verification code
- seal timestamp
- sealed-by identity
- export history
- re-export history
- version comparison capability

## 14. Vault and Record Retention

Vault stores:
- pass or fail results
- supporting documentation
- evidence
- exported package files

Retention tiers:
- Standard Tier: 0–2 years
- Professional Tier: 2–10 years
- Legacy Tier: life of building

## 15. Roadmap

### Phase 1 — Governance Foundation
- Builder onboarding hardening
- Inspector / CP credential hardening
- restricted dashboard gating
- status lifecycles
- basic audit log

### Phase 2 — Job Integrity
- project model
- job validation gate
- permit-family / discipline rules
- governed dispatch
- objection / override logic
- dependency logic between stages

### Phase 3 — Field Execution
- check-in
- evidence capture
- standardized stage forms
- Pass / Fail / Hold
- Hold hard fork
- geofence and anomaly flags

### Phase 4 — Control Plane
- admin submission review
- Hold review
- payout blockers
- dispute intake
- sealing workflow
- export approvals

### Phase 5 — Package and Authority Bridge
- authority-ready package generation
- digital fingerprint
- verification flow
- secure review link
- receipt and deficiency tracking

### Phase 6 — Vault and Commercial Maturity
- archive search
- retention tiers
- re-export history
- payout rules
- refunds
- dispute resolution
- legal / insurance hold

### Phase 7 — Intelligent Automation
- auto-expiry alerts
- duplicate detection
- provisional approval support
- registry-assisted validation
- risk scoring
- schedule-friction signals