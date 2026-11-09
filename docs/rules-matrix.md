# SiteLine Rules Matrix

## Purpose
This matrix defines the core governed rules Codex must implement.
Critical rules must be enforced in backend or service logic, not only in UI.

## Rule Matrix

| Rule ID | Domain | Actor | Trigger | Preconditions | Hard Blocker | System Action | Admin Override | Audit Required |
|---|---|---|---|---|---|---|---|---|
| R-001 | Access | Builder | Builder signs up | Account created | None | Set status = draft | No | Yes |
| R-002 | Access | Builder | Builder submits onboarding | Required base fields present | Missing required docs | Set status = submitted or needs_info | Yes | Yes |
| R-003 | Access | Builder | Builder attempts dashboard access | Builder approved | Not approved or suspended | Redirect to onboarding/status page | No | Yes |
| R-004 | Access | Inspector | Inspector signs up | Account created | None | Set status = draft | No | Yes |
| R-005 | Access | Inspector | Inspector submits onboarding | Required credential fields present | Missing credential docs | Set status = submitted or needs_info | Yes | Yes |
| R-006 | Access | Inspector | Inspector opens Live Job Board | Inspector approved and eligible | Not approved, suspended, or expired credential | Deny access | No | Yes |
| R-007 | Approval | Admin | Admin reviews Builder docs | Builder submitted | None | Approve, reject, request more info, suspend | Yes | Yes |
| R-008 | Approval | Admin | Admin reviews Inspector docs | Inspector submitted | None | Approve, reject, request more info, suspend | Yes | Yes |
| R-009 | Approval | System | Credential expiry passes threshold | Credential has expiry date | Expired critical credential | Restrict eligibility or suspend | Yes | Yes |
| R-010 | Project | Builder | Builder creates project | Builder approved | Builder not approved | Deny creation | No | Yes |
| R-011 | Project | Builder | Builder creates job | Project exists and complete enough | Project missing core identity | Keep job draft | Yes | Yes |
| R-012 | Validation | System | Builder submits job for live posting | Builder approved, project complete, docs present, escrow green | Any validation failure | Keep status = pending_validation and show blockers | Yes | Yes |
| R-013 | Validation | System | Permit family checked | Job has permit family | Invalid permit family | Block live posting | Yes | Yes |
| R-014 | Validation | System | Discipline checked | Job has discipline | Discipline mismatch with permit family | Block live posting | Yes | Yes |
| R-015 | Validation | System | Dependency check runs | Project has linked prior stages | Required prior stage not sealed | Block new job creation or live posting | Yes | Yes |
| R-016 | Commercial | Builder | Builder funds escrow | Payment method present | Authorization fails | Keep job non-live | No | Yes |
| R-017 | Dispatch | System | Job goes live | Validation passed | None | Publish to filtered Live Job Board | No | Yes |
| R-018 | Dispatch | Inspector | Inspector claims slot | Eligible by credential, permit family, discipline, region, stage | Not eligible or already locked | Deny claim | No | Yes |
| R-019 | Dispatch | System | Valid claim received | Inspector eligible, slot open | Duplicate lock or race conflict | Reject conflicting claim | No | Yes |
| R-020 | Dispatch | System | Claim accepted | Valid provisional assignment created | None | Start objection timer, notify Builder | No | Yes |
| R-021 | Dispatch | Builder | Builder objects to provisional assignment | Objection window open | Invalid objection reason | Reject objection | Yes | Yes |
| R-022 | Dispatch | Admin | Admin reviews objection | Provisional assignment exists | None | Confirm, cancel, or re-open job | Yes | Yes |
| R-023 | Pre-Site | Builder | Builder confirms site readiness | Assignment confirmed | Site details incomplete | Warn and flag risk | Yes | Yes |
| R-024 | Pre-Site | Inspector | Inspector checks in | Confirmed assignment | Wrong job state or invalid session | Deny check-in | Yes | Yes |
| R-025 | Field | Inspector | Inspector uploads evidence | Active submission exists | Unsupported file or corrupt upload | Reject upload | Yes | Yes |
| R-026 | Field | System | Evidence stored | Valid upload | None | Save original immutably, generate checksum, link metadata | No | Yes |
| R-027 | Field | System | Geolocation validation runs | Location data available | Outside reasonable geofence | Allow with anomaly flag and explanation requirement | Yes | Yes |
| R-028 | Outcome | Inspector | Inspector selects Pass | Required checklist complete, evidence present, no open Hold | Missing required item or blocker | Prevent Pass submission | No | Yes |
| R-029 | Outcome | Inspector | Inspector selects Hold | Submission active | None | Create Hold record, notify Builder | No | Yes |
| R-030 | Outcome | Builder | Builder responds to Hold | Hold open | None | Accept Hold or decline Hold | No | Yes |
| R-031 | Outcome | System | Builder accepts Hold | Hold open | None | Start retained-time timer, allow correction evidence flow | No | Yes |
| R-032 | Outcome | System | Builder declines Hold | Hold open | None | Resolve submission outcome = Fail | No | Yes |
| R-033 | Outcome | Inspector | Inspector resolves Hold | Hold acknowledged and correction reviewed | Hold still technically unresolved | Prevent resolution | Yes | Yes |
| R-034 | Outcome | Inspector | Inspector selects Fail | Submission active | None | Create deficiency record and close technical visit | No | Yes |
| R-035 | Review | Admin | Admin reviews submission | Submission submitted | Missing evidence or logic defect | Request more info or return for correction | Yes | Yes |
| R-036 | Review | Admin | Admin seals submission | Submission complete and technically acceptable | Open Hold or technical blocker | Prevent sealing | No | Yes |
| R-037 | Package | System | Package generation starts | Submission sealed | None | Build versioned package manifest | No | Yes |
| R-038 | Package | System | Package finalized | Package built | None | Generate package hash and verification code | No | Yes |
| R-039 | Package | Admin | Admin approves export | Package ready | Technical blocker or readiness blocker | Prevent export | No | Yes |
| R-040 | Authority | System | Authority access granted | Package exported and recipient set | Invalid or expired access scope | Deny access | Yes | Yes |
| R-041 | Authority | Authority Reviewer | Reviewer opens package | Valid scoped access | None | Allow read-only package access | No | Yes |
| R-042 | Authority | Authority Reviewer | Reviewer attempts unrelated data access | Logged in through scoped link | Always | Deny access | No | Yes |
| R-043 | Commercial | System | Valid site visit completed | Check-in confirmed and technical visit valid | Fraud or invalid attendance flag | Mark base fee earned_pending_review | Yes | Yes |
| R-044 | Commercial | System | Hold premium calculation runs | Builder accepted Hold | None | Add premium charges per timer/rules | Yes | Yes |
| R-045 | Commercial | Builder | Refund requested | Charge exists | None | Open refund case | Yes | Yes |
| R-046 | Commercial | Any authorized actor | Dispute opened | Related entity exists | None | Create dispute and apply commercial blocker if required | Yes | Yes |
| R-047 | Commercial | System | Payout release runs | Payment ready | Open blocking dispute or control-plane exception | Prevent payout | Yes | Yes |
| R-048 | Archive | System | Package exported or submission closed | Valid final record exists | None | Store in Vault with retention tier | No | Yes |
| R-049 | Archive | Admin | Re-export requested | Archived record exists | Legal / insurance hold conflict | Deny or escalate | Yes | Yes |
| R-050 | Audit | System | Any governed action occurs | None | None | Write immutable audit event with actor, before, after, reason | No | Yes |

## Blocker Types

### Technical blockers
Technical blockers prevent:
- job publication
- submission sealing
- package export
- next-stage progression

Examples:
- Builder not approved
- Inspector not eligible
- permit family / discipline mismatch
- dependency not sealed
- open Hold
- missing required evidence
- unresolved technical exception

### Commercial blockers
Commercial blockers prevent:
- payout release
- refund release
- financial closure

Examples:
- payment authorization failure
- blocking dispute
- payout exception
- fraud review
- no-show billing exception

## Mandatory Implementation Notes

1. These rules must be enforced in backend or domain services.
2. UI checks are helpful but not sufficient.
3. Project and Job must remain separate concepts.
4. Submission and Package must remain separate concepts.
5. Hold and Deficiency must remain separate concepts.
6. Every governed transition must create an audit event.
7. Package sealing must generate:
   - version number
   - package hash
   - verification code
   - sealed timestamp
   - sealed-by identity
8. Original evidence must remain immutable.
9. Hold must remain a hard fork:
   - accept Hold = retained-time correction path
   - decline Hold = immediate Fail
10. Authority access must be package-scoped, read-only, time-limited, and audited.