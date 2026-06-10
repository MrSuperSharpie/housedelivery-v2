import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { buildCompletionChecklist } from './inspectorCompletion'

const SRC = fileURLToPath(new URL('..', import.meta.url))

function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

function getCodeBlock(source: string, code: string): string {
  const start = source.indexOf(`code: '${code}'`)
  assert.notStrictEqual(start, -1, `${code} must be defined`)
  const next = source.indexOf("\n  {\n    code: '", start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

const ITEM_LEVEL_EVIDENCE_TAG_PATTERN = /\((?:Camera or Video Evidence Required|Camera Evidence Required|Camera or Note Evidence Required|Evidence: Text)\)\s*$/i
const REQUIRED_PHOTO_OR_VISIBLE_CONDITION_PATTERN = /\b(?:field photos|photos showing|photo documentation|inspector-captured field photos|visible|observable|field conditions|site conditions|photos or field notes|field notes or photos)\b/i

const APPROVED_ZERO_TAG_PHOTO_EVIDENCE_EXCEPTIONS = new Map<string, string>([
  ['S09-01', 'S09 requires plumbing/trade review before label changes.'],
  ['S09-02', 'S09 requires plumbing/trade review before label changes.'],
  ['S09-03', 'S09 requires plumbing/trade review before label changes.'],
  ['S09-04', 'S09 requires plumbing/trade review before label changes.'],
  ['S09-05', 'S09 requires plumbing/trade review before label changes.'],
  ['S13-03', 'Broad interior life-safety scope; needs Edgar/AHJ mapping before tags.'],
  ['S13-04', 'Broad field notes or photos where needed; no single obvious row from repo text alone.'],
  ['S15-01', 'Final life-safety/final occupancy sensitive; needs Edgar/AHJ approval before tags.'],
])

// ── routing maps ──────────────────────────────────────────────────────────────

test('worklist page defines BUILDER_STAGE_TO_INSPECTION_STAGE with correct structural default', () => {
  const source = read('app/inspector/page.tsx')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_INSPECTION_STAGE')
  const mapEnd   = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(mapStart !== -1, 'BUILDER_STAGE_TO_INSPECTION_STAGE must be defined')
  assert.ok(mapBlock.includes('3: 6'), 'Default map must route builder stage 3 to completion stage 6 (structural)')
  assert.ok(mapBlock.includes('4: 12'), 'Default map must route builder stage 4 to completion stage 12')
  assert.ok(mapBlock.includes('5: 13'), 'Default map must route builder stage 5 to completion stage 13 (Interior Completion)')
  assert.ok(mapBlock.includes('6: 14'), 'Default map must route builder stage 6 to completion stage 14 (Exterior Works)')
  assert.ok(mapBlock.includes('7: 15'), 'Default map must route builder stage 7 to completion stage 15 (Final Approval)')
})

test('worklist page defines DISCIPLINE_INSPECTION_STAGE_OVERRIDE with mechanical → S11', () => {
  const source    = read('app/inspector/page.tsx')
  const overStart = source.indexOf('DISCIPLINE_INSPECTION_STAGE_OVERRIDE')
  const overEnd   = source.indexOf('}', overStart + 40)
  const overBlock = source.slice(overStart, overEnd + 200) // grab enough for all discipline entries
  assert.ok(overStart !== -1, 'DISCIPLINE_INSPECTION_STAGE_OVERRIDE must be defined')
  assert.ok(overBlock.includes('mechanical'), 'Override must include mechanical key')
  assert.ok(overBlock.includes('3: 11'), 'Override must map mechanical builder stage 3 to completion stage 11')
})

test('worklist page DISCIPLINE_INSPECTION_STAGE_OVERRIDE maps electrical stage 3 to S10', () => {
  const source    = read('app/inspector/page.tsx')
  const overStart = source.indexOf('DISCIPLINE_INSPECTION_STAGE_OVERRIDE')
  const overBlock = source.slice(overStart, overStart + 400)
  assert.ok(overBlock.includes('electrical'), 'Override must include electrical key')
  assert.ok(overBlock.includes('3: 10'), 'Override must map electrical builder stage 3 to completion stage 10')
})

test('worklist page DISCIPLINE_INSPECTION_STAGE_OVERRIDE maps plumbing stage 3 to S09', () => {
  const source    = read('app/inspector/page.tsx')
  const overStart = source.indexOf('DISCIPLINE_INSPECTION_STAGE_OVERRIDE')
  const overBlock = source.slice(overStart, overStart + 400)
  assert.ok(overBlock.includes('plumbing'), 'Override must include plumbing key')
  assert.ok(overBlock.includes('3: 9'), 'Override must map plumbing builder stage 3 to completion stage 9')
})

// ── stage label lookup ────────────────────────────────────────────────────────

test('worklist page INSPECTION_STAGE_LABELS has correct label for S11', () => {
  const source = read('app/inspector/page.tsx')
  assert.ok(
    source.includes("'Gas Permit and Mechanical / HVAC Scope'"),
    'INSPECTION_STAGE_LABELS must include S11 label: Gas Permit and Mechanical / HVAC Scope'
  )
})

test('worklist page INSPECTION_STAGE_LABELS has correct label for S10', () => {
  const source = read('app/inspector/page.tsx')
  assert.ok(
    source.includes("'Electrical Permit and Scope'"),
    'INSPECTION_STAGE_LABELS must include S10 label: Electrical Permit and Scope'
  )
})

test('worklist page INSPECTION_STAGE_LABELS has correct label for S15', () => {
  const source = read('app/inspector/page.tsx')
  assert.ok(
    source.includes("'Inspections, Final Approval, and Occupancy'"),
    'INSPECTION_STAGE_LABELS must include S15 label: Inspections, Final Approval, and Occupancy'
  )
})

// ── render ────────────────────────────────────────────────────────────────────

test('worklist card renders Inspection Stage label when inspectionPreview is set', () => {
  const source = read('app/inspector/page.tsx')
  assert.ok(source.includes('Inspection Stage: '), 'Worklist card must render "Inspection Stage: " label')
  assert.ok(source.includes('inspectionPreview.code'), 'Worklist card must render inspectionPreview.code')
  assert.ok(source.includes('inspectionPreview.name'), 'Worklist card must render inspectionPreview.name')
})

test('resolveInspectionStagePreview is called with assignment.stage and assignment.discipline', () => {
  const source = read('app/inspector/page.tsx')
  assert.ok(
    source.includes('resolveInspectionStagePreview(assignment.stage, assignment.discipline)'),
    'Must call resolveInspectionStagePreview with assignment.stage and assignment.discipline'
  )
})

// ── 7-stage model routing assertions ─────────────────────────────────────────

test('builder stage 5 does not route to S15 in inspector worklist', () => {
  const source = read('app/inspector/page.tsx')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_INSPECTION_STAGE')
  const mapEnd   = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(!mapBlock.includes('5: 15'), 'builder stage 5 must not route to S15 — it maps to S13 (Interior Completion)')
})

test('builder stage 5 routes to S13 in InspectorCompletionWorkspace', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_COMPLETION_STAGE')
  const mapEnd   = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(mapBlock.includes('5: 13'), 'BUILDER_STAGE_TO_COMPLETION_STAGE must map builder stage 5 to S13')
})

test('builder stage 6 routes to S14 in InspectorCompletionWorkspace', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_COMPLETION_STAGE')
  const mapEnd   = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(mapBlock.includes('6: 14'), 'BUILDER_STAGE_TO_COMPLETION_STAGE must map builder stage 6 to S14')
})

test('builder stage 7 routes to S15 in InspectorCompletionWorkspace', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_COMPLETION_STAGE')
  const mapEnd   = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(mapBlock.includes('7: 15'), 'BUILDER_STAGE_TO_COMPLETION_STAGE must map builder stage 7 to S15 (Final Approval)')
})

test('final-occupancy API gate checks builder stage 7, not stage 5', () => {
  const source = read('app/api/inspections/final-occupancy/route.ts')
  assert.ok(source.includes('job.stage !== 7'), 'final-occupancy route must gate on stage 7')
  assert.ok(!source.includes('job.stage !== 5'), 'final-occupancy route must not gate on stage 5')
})

test('final-occupancy prerequisite check covers stages 1 through 6', () => {
  const source = read('app/api/inspections/final-occupancy/route.ts')
  assert.ok(source.includes('[1, 2, 3, 4, 5, 6]'), 'final-occupancy prerequisite list must include stages 1–6')
  assert.ok(!source.includes('[1, 2, 3, 4]'), 'final-occupancy prerequisite list must not stop at stage 4')
})

test('builder page BUILDER_STAGE_DEFINITIONS contains 7 entries', () => {
  const source = read('app/builder/page.tsx')
  const defStart = source.indexOf('const BUILDER_STAGE_DEFINITIONS')
  const defEnd   = source.indexOf('] as const', defStart)
  const defBlock = source.slice(defStart, defEnd)
  assert.ok(defBlock.includes('number: 7'), 'BUILDER_STAGE_DEFINITIONS must include stage number 7')
  assert.ok(defBlock.includes('internalStage: 13'), 'Stage 5 must map to internalStage 13 (Interior Completion)')
  assert.ok(defBlock.includes('internalStage: 14'), 'Stage 6 must map to internalStage 14 (Exterior Works)')
  assert.ok(!defBlock.includes("number: 5, internalStage: 15"), 'Stage 5 must not map to internalStage 15')
})

test('builder UI denominator is 7, not 5', () => {
  const projectDetail = read('app/builder/project/[id]/page.tsx')
  const projectCard   = read('components/builder/ProjectCard.tsx')
  assert.ok(projectDetail.includes('/ 7'), 'project detail page must show stage denominator / 7')
  assert.ok(projectCard.includes('/ 7'),   'ProjectCard must show stage denominator / 7')
  assert.ok(!projectDetail.includes('/ 5'), 'project detail page must not show stale denominator / 5')
  assert.ok(!projectCard.includes('/ 5'),   'ProjectCard must not show stale denominator / 5')
})

test('mockData INSPECTION_STAGES includes ids 5, 6, and 7 with correct names', () => {
  const source = read('lib/mockData.ts')
  assert.ok(source.includes("id: 5") && source.includes("'Interior Completion'"), 'INSPECTION_STAGES id 5 must be Interior Completion')
  assert.ok(source.includes("id: 6") && source.includes("'Exterior Works and Site Finalization'"), 'INSPECTION_STAGES must include id 6: Exterior Works and Site Finalization')
  assert.ok(source.includes("id: 7") && source.includes("'Final Approval and Occupancy'"), 'INSPECTION_STAGES must include id 7: Final Approval and Occupancy')
  assert.ok(!source.includes("'Final Occupancy Permit'"), 'INSPECTION_STAGES must not contain stale Final Occupancy Permit entry')
})

test('DispatchModal isFinalOccupancyStage checks selectedStage === 7', () => {
  const source = read('components/builder/DispatchModal.tsx')
  assert.ok(source.includes('selectedStage === 7'), 'DispatchModal must check selectedStage === 7 for Final Approval stage')
  assert.ok(!source.includes('selectedStage === 5'), 'DispatchModal must not check selectedStage === 5')
})

test('DispatchModal STAGE_TO_DISCIPLINE maps stage 6 to geotech, not geotechnical', () => {
  const source = read('components/builder/DispatchModal.tsx')
  assert.ok(source.includes("6: 'geotech'"), "Stage 6 must use discipline ID 'geotech' to match DISCIPLINES array")
  assert.ok(!source.includes("6: 'geotechnical'"), "Stage 6 must not use 'geotechnical' — invalid discipline ID")
})

test('final-occupancy route BUILDER_STAGE_TO_COMPLETION_STAGE uses 7-stage model', () => {
  const source = read('app/api/inspections/final-occupancy/route.ts')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_COMPLETION_STAGE')
  const mapEnd   = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(mapBlock.includes('5: 13'), 'Route map must include 5: 13 (Interior Completion)')
  assert.ok(mapBlock.includes('6: 14'), 'Route map must include 6: 14 (Exterior Works)')
  assert.ok(mapBlock.includes('7: 15'), 'Route map must include 7: 15 (Final Approval)')
  assert.ok(!mapBlock.includes('5: 15'), 'Route map must not contain stale 5: 15 entry')
})

// ── orphan-state fixes ────────────────────────────────────────────────────────

test('invalidateJobAssignment calls updateJobStatus to reopen job as live', () => {
  const source   = read('lib/supabase/jobs.ts')
  const fnStart  = source.indexOf('export async function invalidateJobAssignment')
  const fnEnd    = source.indexOf('\nexport', fnStart + 1)
  const fnBlock  = source.slice(fnStart, fnEnd)
  assert.ok(fnBlock.includes('updateJobStatus'), 'invalidateJobAssignment must call updateJobStatus to reopen the job')
  assert.ok(fnBlock.includes("'live'"), "invalidateJobAssignment must reopen the job to status 'live'")
})

test('completeJobAssignment calls updateJobStatus to mark job as completed', () => {
  const source   = read('lib/supabase/jobs.ts')
  const fnStart  = source.indexOf('export async function completeJobAssignment')
  const fnEnd    = source.indexOf('\nexport', fnStart + 1)
  const fnBlock  = source.slice(fnStart, fnEnd)
  assert.ok(fnBlock.includes('updateJobStatus'), 'completeJobAssignment must call updateJobStatus to mark the job completed')
  assert.ok(fnBlock.includes("'completed'"), "completeJobAssignment must transition job to status 'completed'")
})

// ── 7-stage builder grid ──────────────────────────────────────────────────────

test('StageProgressRail uses grid-cols-7 for 7-stage scorecard', () => {
  const source = read('app/builder/page.tsx')
  const railStart = source.indexOf('function StageProgressRail')
  const railEnd   = source.indexOf('\nfunction', railStart + 1)
  const railBlock = source.slice(railStart, railEnd)
  assert.ok(railBlock.includes('grid-cols-7'), 'StageProgressRail must use grid-cols-7 for 7 stages')
  assert.ok(!railBlock.includes('grid-cols-5'), 'StageProgressRail must not contain stale grid-cols-5')
})

test('View Progress expanded detail grid uses md:grid-cols-7', () => {
  const source = read('app/builder/page.tsx')
  assert.ok(source.includes('md:grid-cols-7'), 'View Progress detail grid must use md:grid-cols-7')
  assert.ok(!source.includes('md:grid-cols-5'), 'View Progress detail grid must not contain stale md:grid-cols-5')
})

// ── pending-validation cancellation ──────────────────────────────────────────

test('live-request DELETE uses cancel mode allowing pending_validation', () => {
  const source = read('app/api/jobs/live-request/route.ts')
  assert.ok(
    source.includes("getAuthorizedLiveJob(body, 'cancel')"),
    "DELETE handler must call getAuthorizedLiveJob with 'cancel' mode"
  )
})

test('live-request PATCH guard still requires validation_status validated', () => {
  const source = read('app/api/jobs/live-request/route.ts')
  assert.ok(
    source.includes("validation_status !== 'validated'"),
    "edit mode guard must still require validation_status === 'validated' for PATCH"
  )
})

test('live-request DELETE job_status_events uses job.status not hardcoded live', () => {
  const source   = read('app/api/jobs/live-request/route.ts')
  const delStart = source.indexOf('export async function DELETE')
  const delEnd   = source.length
  const delBlock = source.slice(delStart, delEnd)
  assert.ok(delBlock.includes('from_status: job.status'), 'DELETE must write from_status: job.status not hardcoded string')
  assert.ok(!delBlock.includes("from_status: 'live'"), "DELETE must not hardcode from_status as 'live'")
})

test('live-request DELETE writes governance_audit_events for cancellation', () => {
  const source   = read('app/api/jobs/live-request/route.ts')
  const delStart = source.indexOf('export async function DELETE')
  const delBlock = source.slice(delStart)
  assert.ok(delBlock.includes('governance_audit_events'), 'DELETE handler must write a governance_audit_events row')
  assert.ok(delBlock.includes("action: 'job.builder_cancelled'"), "DELETE governance audit must use action 'job.builder_cancelled'")
})

test('inspector job board uses fresh open-job reads and suppresses superseded prior-stage cards', () => {
  const source = read('app/inspector/page.tsx')
  const filterStart = source.indexOf('function filterCurrentInspectorBoardJobs')
  const filterEnd = source.indexOf('\nfunction formatStoredStatus', filterStart)
  const filterBlock = source.slice(filterStart, filterEnd)

  assert.ok(
    source.includes('listOpenJobOpportunities') && source.includes('listAllJobOpportunities'),
    'inspector job board must use a fresh read-only Supabase source for open jobs and lifecycle context',
  )
  assert.ok(
    source.includes('const [dbOpenJobs, setDbOpenJobs]') && source.includes('const [dbBoardLifecycleJobs, setDbBoardLifecycleJobs]'),
    'inspector job board must keep fresh DB board state separate from cached store jobs',
  )
  assert.ok(
    source.includes('filterCurrentInspectorBoardJobs(boardSourceJobs, dbBoardLifecycleJobs)'),
    'inspector job board must run board jobs through the stale/superseded stage filter',
  )
  assert.ok(
    source.includes('function buildLatestProjectStageContext') && source.includes('CURRENT_PROJECT_STAGE_STATUSES.has(row.status)'),
    'stale-card filter must base project advancement on active/completed lifecycle statuses',
  )
  assert.ok(
    filterBlock.includes('return job.stage >= latestStage'),
    'stale-card filter must hide lower-stage jobs when a later project stage is active or completed',
  )
  assert.ok(
    !filterBlock.includes('requiredDiscipline'),
    'stale-card filter must not collapse same-stage discipline-specific jobs',
  )
})

test('inspector active worklist hides superseded lower-stage cards without collapsing same-stage disciplines', () => {
  const source = read('app/inspector/page.tsx')
  const filterStart = source.indexOf('function filterCurrentActiveWorklistItems')
  const filterEnd = source.indexOf('\nfunction formatStoredStatus', filterStart)
  const filterBlock = source.slice(filterStart, filterEnd)

  assert.ok(filterStart >= 0, 'inspector page must define an active worklist stale-stage filter')
  assert.ok(
    source.includes(".select('id, project_id, builder_id, project_name, address, city, status, stage, stage_name, required_discipline')"),
    'active worklist job read must include project identity fields for superseded-stage filtering',
  )
  assert.ok(
    source.includes('const currentWorklist = filterCurrentActiveWorklistItems(worklist, lifecycleRows)'),
    'active worklist must filter against latest project-stage lifecycle context before rendering',
  )
  assert.ok(
    filterBlock.includes('return item.stage >= latestStage'),
    'active worklist must hide lower-stage assignments when a later project stage exists',
  )
  assert.ok(
    !filterBlock.includes('discipline'),
    'active worklist stale-stage filter must preserve same-stage discipline-specific assignments',
  )
  assert.ok(
    source.includes("window.addEventListener('focus', refreshActiveWorklistOnFocus)")
      && source.includes("document.addEventListener('visibilitychange', refreshActiveWorklistOnVisibility)"),
    'active worklist must refresh when the inspector returns to the dashboard',
  )
})

test('builder page exposes pendingValidationJobs for Awaiting Validation section', () => {
  const source = read('app/builder/page.tsx')
  assert.ok(source.includes('pendingValidationJobs'), 'builder page must derive pendingValidationJobs list')
  assert.ok(
    source.includes("status === 'pending_validation'") || source.includes("status !== 'pending_validation'"),
    'builder page must reference pending_validation status for conditional rendering'
  )
})

// ── job lifecycle email notifications ─────────────────────────────────────────

test('claim route imports sendVeroEmail', () => {
  const source = read('app/api/jobs/claim/route.ts')
  assert.ok(source.includes('sendVeroEmail'), 'claim route must import and call sendVeroEmail')
})

test('claim route sends inspection.claimed_builder_notice', () => {
  const source = read('app/api/jobs/claim/route.ts')
  assert.ok(
    source.includes("'inspection.claimed_builder_notice'"),
    "claim route must use eventKey 'inspection.claimed_builder_notice'"
  )
})

test('claim route uses awaited soft-fail pattern for builder notice', () => {
  const source = read('app/api/jobs/claim/route.ts')
  assert.ok(
    !source.includes('void (async'),
    'claim route must not use fire-and-forget void IIFE — email must be awaited to ensure Resend is called'
  )
  assert.ok(
    source.includes('builder notice attempted'),
    'claim route must log builder notice attempted'
  )
  assert.ok(
    source.includes('builder notice skipped: no builder email'),
    'claim route must log skip when builder email is missing'
  )
  assert.ok(
    !source.includes('throwOnError: true'),
    'claim route must not set throwOnError: true on job lifecycle email'
  )
})

test('complete-scoped-assignment route sends inspection.passed_builder_notice', () => {
  const source = read('app/api/inspections/complete-scoped-assignment/route.ts')
  assert.ok(
    source.includes("'inspection.passed_builder_notice'"),
    "complete-scoped-assignment must use eventKey 'inspection.passed_builder_notice'"
  )
  assert.ok(
    !source.includes('void (async'),
    'complete-scoped-assignment must not use fire-and-forget void IIFE — email must be awaited'
  )
  assert.ok(
    source.includes('builder notice attempted'),
    'complete-scoped-assignment must log builder notice attempted'
  )
  assert.ok(
    source.includes('builder notice skipped: no builder email'),
    'complete-scoped-assignment must log skip when builder email is missing'
  )
  assert.ok(
    !source.includes('throwOnError: true'),
    'complete-scoped-assignment must not set throwOnError: true on job lifecycle email'
  )
})

test('complete-scoped-assignment job SELECT includes builder_id for email lookup', () => {
  const source = read('app/api/inspections/complete-scoped-assignment/route.ts')
  assert.ok(
    source.includes("'id, builder_id, project_name, status'"),
    "job_opportunities SELECT must include builder_id and project_name for email lookup"
  )
})

// ── evidence requirement display — InspectorCompletionWorkspace ───────────────

test('required-evidence containers show Evidence Required Before Pass chip in field checklist header', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  assert.ok(
    source.includes('Evidence Required Before Pass'),
    'field checklist header must show Evidence Required Before Pass chip when evidence is missing'
  )
  assert.ok(
    source.includes('passRequiresEvidence'),
    'chip visibility must be gated on shared passRequiresEvidence logic, not hardcoded to a specific stage'
  )
})

test('required-evidence containers show persistent notice inside field checklist panel when evidence is missing', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  assert.ok(
    source.includes('Required evidence missing'),
    'field checklist panel must show a clear required-evidence-missing panel when passBlockedForEvidence'
  )
  assert.ok(
    source.includes('Attach at least one evidence item before passing this container.'),
    'evidence-required panel must tell inspectors what action is required before Pass'
  )
  assert.ok(
    source.includes('Pass is disabled until evidence is captured or uploaded in this container&apos;s evidence area.'),
    'evidence-required panel must explain why Pass is disabled and where evidence must be attached'
  )
  assert.ok(
    source.includes('Attach Required Evidence'),
    'evidence-required panel must provide a clear upload/focus action'
  )
  assert.ok(
    source.includes('Required evidence attached') && source.includes('Evidence requirement satisfied. This container can now be passed if all checklist conditions are complete.'),
    'evidence-required panel must render a satisfied state after evidence is attached'
  )
  assert.ok(
    source.includes('blocked={passBlockedForEvidence}'),
    'persistent notice must be gated on shared passBlockedForEvidence, not hardcoded to a specific stage'
  )
})

test('passed is locked message is specific about evidence requirement', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  assert.ok(
    source.includes('REQUIRED_EVIDENCE_LOCK_MESSAGE'),
    'passBlockedMessage for evidence must use the shared readable evidence lock message'
  )
  assert.ok(
    !source.includes('Passed is locked until at least one evidence file is attached to this container.'),
    'stale evidence file blocker copy must be replaced with evidence item copy'
  )
  assert.ok(
    !source.includes('Upload at least one evidence file before marking this container as Passed.'),
    'stale generic evidence blocked message must be replaced with specific locked message'
  )
})

test('standard container amber box uses shared passBlockedMessage instead of hardcoded string', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  assert.ok(
    !source.includes('Action Required: This container requires at least one piece of evidence (photo or note) before it can be marked as Passed.'),
    'standard container must not use a hardcoded amber message diverging from passBlockedMessage'
  )
})

test('evidence requirement display is based on shared passRequiresEvidence logic, not stage-number hardcode', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const evidenceChipIdx = source.indexOf('Evidence Required Before Pass')
  const noticeIdx = source.indexOf('Evidence required before Pass.')
  assert.ok(
    evidenceChipIdx !== -1 && noticeIdx !== -1,
    'both evidence guidance elements must be present'
  )
  assert.ok(
    !source.includes("stageNumber === 13") && !source.includes("stageNumber === 14") && !source.includes("stageNumber === 15"),
    'evidence requirement display must not be hardcoded to specific stage numbers'
  )
})

test('required evidence blocker remains document-based and clears once evidence is attached', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  assert.ok(
    source.includes('const passRequiresEvidence = item.evidence_mode === \'required_upload\' && item.document_upload_required'),
    'required evidence gate must be driven by required_upload plus document_upload_required'
  )
  assert.ok(
    source.includes('const passBlockedForEvidence = passRequiresEvidence && item.documents.length === 0'),
    'required evidence gate must block only while no evidence item is attached'
  )
  assert.ok(
    source.includes('const passBlocked = passBlockedForEvidence || passBlockedForDependency'),
    'Passed must remain locked for evidence or dependency blockers'
  )
  assert.ok(
    source.includes('disabled={passBlocked}'),
    'Passed button must remain disabled while passBlocked is true'
  )
})

test('required evidence containers with or without item-level tags get an obvious evidence instruction', () => {
  const workspace = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const checklist = read('lib/inspectorCompletion.ts')
  const s1404 = getCodeBlock(checklist, 'S14-04')
  assert.ok(
    s1404.includes("evidenceMode: 'required_upload'") && s1404.includes('documentUploadRequired: true'),
    'S14-04 must remain a container-level required evidence container'
  )
  assert.ok(
    workspace.includes('<RequiredEvidenceActionPanel') && workspace.includes('onAttachRequiredEvidence={() => focusRequiredEvidenceUpload(item.item_code)}'),
    'container-level required evidence must show the shared actionable evidence instruction and attach action'
  )
})

test('S12-03 required evidence blocker uses shared upload action path', () => {
  const workspace = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const checklist = read('lib/inspectorCompletion.ts')
  const s1203 = getCodeBlock(checklist, 'S12-03')

  assert.ok(
    s1203.includes("evidenceMode: 'required_upload'") && s1203.includes('documentUploadRequired: true'),
    'S12-03 must remain a required-upload evidence container'
  )
  assert.ok(
    s1203.includes('Energy Documentation and Compliance Path'),
    'S12-03 must be the energy documentation container under test'
  )
  assert.ok(
    workspace.includes('function focusRequiredEvidenceUpload(itemCode: string)'),
    'Attach Required Evidence must reuse a shared focus handler'
  )
  assert.ok(
    workspace.includes('target.scrollIntoView({ behavior: \'smooth\', block: \'center\' })') &&
    workspace.includes('target.focus({ preventScroll: true })'),
    'Attach Required Evidence must scroll/focus the existing evidence upload target'
  )
  assert.ok(
    workspace.includes('highlightedEvidenceItemCode === item.item_code'),
    'Attach Required Evidence must visibly highlight the upload target'
  )
  assert.ok(
    workspace.includes('const evidenceUploadRefs = useRef<Record<string, HTMLDivElement | null>>({})'),
    'evidence upload targets must be registered through shared refs'
  )
})

test('field_view required photo evidence containers have item-level prompts or approved exceptions', () => {
  const checklist = buildCompletionChecklist({})
  const containers = checklist.stages
    .flatMap(stage => stage.items)
    .filter(item => /^S(0[1-9]|1[0-5])-/.test(item.item_code))
  const containersByCode = new Map(containers.map(item => [item.item_code, item]))

  const failures = containers
    .filter(item => item.ui_schema === 'field_view')
    .filter(item => item.evidence_mode === 'required_upload')
    .filter(item => item.document_upload_required === true)
    .filter(item => REQUIRED_PHOTO_OR_VISIBLE_CONDITION_PATTERN.test(item.required_evidence.join(' ')))
    .filter(item => {
      const itemLevelEvidenceTagCount = item.field_checklist.filter(checklistItem =>
        ITEM_LEVEL_EVIDENCE_TAG_PATTERN.test(checklistItem)
      ).length
      return itemLevelEvidenceTagCount === 0 && !APPROVED_ZERO_TAG_PHOTO_EVIDENCE_EXCEPTIONS.has(item.item_code)
    })

  assert.deepStrictEqual(
    failures.map(item => ({
      containerId: item.item_code,
      containerTitle: item.item_label,
      requiredEvidenceText: item.required_evidence.join(' '),
    })),
    [],
    'field_view required-photo evidence containers must have item-level evidence prompts or an approved exception'
  )

  for (const [code, reason] of APPROVED_ZERO_TAG_PHOTO_EVIDENCE_EXCEPTIONS) {
    const item = containersByCode.get(code)
    assert.ok(item, `${code} approved evidence guardrail exception must still exist: ${reason}`)

    const itemLevelEvidenceTagCount = item.field_checklist.filter(checklistItem =>
      ITEM_LEVEL_EVIDENCE_TAG_PATTERN.test(checklistItem)
    ).length
    assert.strictEqual(
      itemLevelEvidenceTagCount,
      0,
      `${code} approved evidence guardrail exception now has item-level evidence tags; remove the stale exception: ${reason}`
    )
  }
})

test('S14-04 has approved inline camera/video evidence prompts for visible access and fire-access conditions', () => {
  const source = read('lib/inspectorCompletion.ts')
  const s1404 = getCodeBlock(source, 'S14-04')
  const expectedTaggedItems = [
    'Pedestrian walkway to primary entry complete and usable where required. (Camera or Video Evidence Required)',
    'Accessible exterior route complete where triggered by permit path or occupancy type. (Camera or Video Evidence Required)',
    'Driveway, parking, or vehicle access complete where required by approved drawings. (Camera or Video Evidence Required)',
    'Address numbers installed and visible from the street or fire access route. (Camera or Video Evidence Required)',
    'Fire department access clearance confirmed where required by AHJ or fire authority. (Camera or Video Evidence Required)',
  ]

  for (const checklistItem of expectedTaggedItems) {
    assert.ok(
      s1404.includes(checklistItem),
      `S14-04 must include approved item-level evidence tag: ${checklistItem}`
    )
  }

  const cameraVideoPromptCount = s1404.match(/\(Camera or Video Evidence Required\)/g)?.length ?? 0
  assert.strictEqual(cameraVideoPromptCount, 5, 'S14-04 must have exactly five approved camera/video item-level prompts')
})

test('S14-04 deferred rows remain untagged in this pass', () => {
  const source = read('lib/inspectorCompletion.ts')
  const s1404 = getCodeBlock(source, 'S14-04')
  assert.ok(
    s1404.includes("'Hydrant clearance or fire route signage confirmed where required.'"),
    'S14-04 hydrant/fire-route signage row must remain untagged'
  )
  assert.ok(
    s1404.includes("'Exterior electrical service, meter, disconnect, or utility equipment complete where applicable.'"),
    'S14-04 exterior electrical row must remain untagged'
  )
  assert.ok(
    s1404.includes("'Gas meter, regulator, exterior shutoff, vents, exhausts, condensers, hose bibs, or exterior mechanical and plumbing components complete and accessible where applicable.'"),
    'S14-04 gas/mechanical/plumbing row must remain untagged'
  )
  assert.ok(
    !s1404.includes('Hydrant clearance or fire route signage confirmed where required. (Camera or Video Evidence Required)'),
    'S14-04 hydrant/fire-route signage row must not be tagged without approval'
  )
  assert.ok(
    !s1404.includes('Exterior electrical service, meter, disconnect, or utility equipment complete where applicable. (Camera or Video Evidence Required)'),
    'S14-04 exterior electrical row must not be tagged without approval'
  )
  assert.ok(
    !s1404.includes('Gas meter, regulator, exterior shutoff, vents, exhausts, condensers, hose bibs, or exterior mechanical and plumbing components complete and accessible where applicable. (Camera or Video Evidence Required)'),
    'S14-04 gas/mechanical/plumbing row must not be tagged without approval'
  )
})

test('S14-05 dependency blocker points inspectors back to S14-04', () => {
  const workspace = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const checklist = read('lib/inspectorCompletion.ts')
  assert.ok(
    getCodeBlock(checklist, 'S14-05').includes("dependencies: ['S14-04']"),
    'S14-05 must still depend on S14-04'
  )
  assert.ok(
    workspace.includes('is locked because ${dependencyCode} must be passed first. Complete ${dependencyCode}, attach required evidence, and mark ${dependencyCode} Passed before returning here.'),
    'single-dependency message must clearly tell inspectors to complete and pass the prerequisite container'
  )
})

test('inspector scoped completion panel confirms submission, notification, record, and safe payment status', () => {
  const workspace = read('components/inspector/InspectorCompletionWorkspace.tsx')

  assert.ok(workspace.includes('Stage complete'), 'post-submit completion panel must have a clear Stage complete title')
  assert.ok(
    workspace.includes('The inspection has been submitted successfully. The builder has been notified, and the official field record is now available.'),
    'completion panel must confirm submission, builder notification, and record availability',
  )
  assert.ok(workspace.includes('Inspection passed'), 'completion panel must show the passed outcome')
  assert.ok(workspace.includes('Builder notification'), 'completion panel must show builder notification status')
  assert.ok(workspace.includes('Payment status'), 'completion panel must show payment status')
  assert.ok(
    workspace.includes('Payment release is pending processing and will be processed according to the project terms.'),
    'payment copy must avoid overpromising payout completion',
  )
  assert.ok(workspace.includes('Return to Job Board'), 'completion panel must retain return navigation')
  assert.ok(workspace.includes('View Completed Record'), 'completion panel must expose the existing completed-record packet')
  assert.ok(
    workspace.includes('href={`/api/schedule-cb?reportId=${report.id}`}'),
    'completed-record link must use the existing authenticated Schedule C-B packet endpoint with the persisted report id',
  )
  assert.ok(
    workspace.includes('target="_blank"') && workspace.includes('rel="noopener noreferrer"'),
    'completed-record link must open the PDF packet safely in a new tab',
  )
  assert.ok(
    workspace.includes('{!previewMode && report.id ? ('),
    'completed-record link must be hidden when no real report-backed URL exists',
  )
})

test('inspector completion panel does not use the inert report route for completed records', () => {
  const workspace = read('components/inspector/InspectorCompletionWorkspace.tsx')
  assert.ok(
    !workspace.includes("router.push(`/inspector/report/${assignmentId}`)"),
    'completed-record action must not route to the same workspace report shell'
  )
})

test('inspector scoped completion panel scrolls into view after successful stage sign-off', () => {
  const workspace = read('components/inspector/InspectorCompletionWorkspace.tsx')

  assert.ok(
    workspace.includes('const scopedCompletionPanelRef = useRef<HTMLDivElement | null>(null)'),
    'completion panel must have a ref for post-submit focus/scroll',
  )
  assert.ok(
    workspace.includes('panel.scrollIntoView({ behavior: \'smooth\', block: \'start\' })'),
    'successful scoped sign-off must scroll to the completion panel',
  )
  assert.ok(
    workspace.includes('panel.focus({ preventScroll: true })'),
    'completion panel must be focused after scrolling so keyboard and screen-reader users land on the success state',
  )
  assert.ok(
    workspace.includes('ref={scopedCompletionPanelRef}') && workspace.includes('tabIndex={-1}'),
    'completion panel must attach the scroll/focus ref and be programmatically focusable',
  )
})

test('inspector completion payment copy does not claim payout completion', () => {
  const workspace = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const forbidden = [
    'Your payment is on its way',
    'Payment has been sent',
    'Funds released',
    'Payout complete',
    'Guaranteed payment date',
  ]

  for (const phrase of forbidden) {
    assert.ok(!workspace.includes(phrase), `completion panel must not use unsafe payment phrase: ${phrase}`)
  }
})

test('final seal location integrity gate requires GPS or a manual location note', () => {
  const workspace = read('components/inspector/InspectorCompletionWorkspace.tsx')

  assert.ok(
    workspace.includes('const hasGeo = !!ev.geo && typeof ev.geo.lat === \'number\' && typeof ev.geo.lng === \'number\''),
    'pre-seal gate must inspect evidence GPS coordinates',
  )
  assert.ok(
    workspace.includes('typeof ev.manualLocationNote === \'string\' && ev.manualLocationNote.trim().length > 0'),
    'pre-seal gate must accept a non-empty manual location note',
  )
  assert.ok(
    workspace.includes('if (!hasGeo && !hasManualLocationNote)'),
    'pre-seal gate must block evidence missing both GPS and manual location note',
  )
  assert.ok(
    !workspace.includes('gpsBypassInDev'),
    'pre-seal location integrity gate must not bypass missing GPS/manual notes in development',
  )
  assert.ok(
    workspace.includes('missing GPS coordinates and no manual location note recorded'),
    'pre-seal gate must preserve the explicit missing-location violation reason',
  )
})

test('final occupancy UI shows a pre-seal evidence location resolution panel', () => {
  const workspace = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const supabaseHelper = read('lib/supabase/inspectorCompletion.ts')

  assert.ok(
    workspace.includes('Pre-seal evidence location review required'),
    'final occupancy area must show an inline pre-seal evidence location panel',
  )
  assert.ok(
    workspace.includes('Final occupancy is blocked until each evidence item has GPS coordinates or a manual location note.'),
    'panel must explain why final occupancy is blocked',
  )
  assert.ok(
    workspace.includes('Related checklist item:'),
    'panel must identify the checklist item connected to each blocked evidence item',
  )
  assert.ok(workspace.includes('View Evidence'), 'panel must provide a safe evidence view action')
  assert.ok(workspace.includes('Add Manual Location Note'), 'panel must provide a manual location note action')
  assert.ok(
    workspace.includes('A regular checklist comment does not satisfy the final seal location integrity gate.'),
    'panel must distinguish manual location evidence notes from normal checklist comments',
  )
  assert.ok(
    workspace.includes('disabled={!finalOccupancyActionReady || sealing}'),
    'Issue Final Occupancy button must remain disabled until location integrity issues are resolved',
  )
  assert.ok(
    workspace.includes('handleManualLocationNoteSave(itemCode, doc, draft)'),
    'manual location note action must save against the affected evidence item',
  )
  assert.ok(
    supabaseHelper.includes('export async function updateInspectorCompletionDocumentManualLocationNote'),
    'manual location note save must use an explicit Supabase helper',
  )
  assert.ok(
    supabaseHelper.includes('manual_location_note: normalizedNote'),
    'manual location note helper must update the existing manual_location_note column',
  )
  assert.ok(
    !workspace.includes('Vero verified the evidence') && !workspace.includes('Vero approved occupancy') && !workspace.includes('Vero grants final approval'),
    'panel must avoid overstating Vero verification or approval authority',
  )
})

// ── conservative item-level evidence tags — S13/S14 ──────────────────────────

test('approved S13 and S14 checklist items include low-risk camera/video evidence tags', () => {
  const source = read('lib/inspectorCompletion.ts')
  const expectedTaggedItems = [
    ['S13-01', 'Firestopping applied at penetrations through rated assemblies before concealment where required. (Camera or Video Evidence Required)'],
    ['S13-02', 'Waterproofing membrane or wet-area preparation applied where required by approved drawings. (Camera or Video Evidence Required)'],
    ['S13-05', 'Accessible or adaptable suite door clear-opening widths confirmed where required by permit path. (Camera or Video Evidence Required)'],
    ['S14-01', 'Weather-resistive barrier or drainage plane installed and continuous at reviewed wall areas where applicable. (Camera or Video Evidence Required)'],
    ['S14-02', 'Exterior handrails installed at required height and continuous for the full flight where applicable. (Camera or Video Evidence Required)'],
    ['S14-03', 'Final grade slopes away from the building at reviewed locations where required by approved drawings or AHJ. (Camera or Video Evidence Required)'],
    ['S14-05', 'Erosion control blanket, mulch, or slope stabilization installed at disturbed areas where required. (Camera or Video Evidence Required)'],
  ] as const

  for (const [code, checklistItem] of expectedTaggedItems) {
    assert.ok(
      getCodeBlock(source, code).includes(checklistItem),
      `${code} must include approved low-risk evidence tag: ${checklistItem}`
    )
  }
})

test('deferred S13, S14, and S15 evidence-tag items remain untouched', () => {
  const source = read('lib/inspectorCompletion.ts')
  assert.ok(
    getCodeBlock(source, 'S13-03').includes("'Interior guards installed at open sides of stairs, landings, balconies, and mezzanines where required.'"),
    'S13-03 interior guards item must remain untagged in this pass'
  )
  assert.ok(
    !getCodeBlock(source, 'S13-03').includes('Interior guards installed at open sides of stairs, landings, balconies, and mezzanines where required. (Camera or Video Evidence Required)'),
    'S13-03 interior guards item must not receive the deferred evidence tag'
  )
  assert.ok(
    getCodeBlock(source, 'S14-05').includes("'Tree protection, retention, replacement, or arborist compliance records confirmed where required by AHJ or Vancouver-specific bylaw path.'"),
    'S14-05 tree/arborist item must remain untagged in this pass'
  )
  assert.ok(
    !getCodeBlock(source, 'S14-05').includes('Tree protection, retention, replacement, or arborist compliance records confirmed where required by AHJ or Vancouver-specific bylaw path. (Camera or Note Evidence Required)'),
    'S14-05 tree/arborist item must not receive the deferred evidence tag'
  )

  for (const code of ['S15-01', 'S15-02', 'S15-03', 'S15-04']) {
    const block = getCodeBlock(source, code)
    assert.ok(!block.includes('(Camera or Video Evidence Required)'), `${code} must not receive camera/video item tags in this pass`)
    assert.ok(!block.includes('(Camera Evidence Required)'), `${code} must not receive camera item tags in this pass`)
    assert.ok(!block.includes('(Camera or Note Evidence Required)'), `${code} must not receive camera/note item tags in this pass`)
  }
})

test('S09 evidence definitions remain untouched by S14 blocker UX pass', () => {
  const source = read('lib/inspectorCompletion.ts')
  for (const code of ['S09-01', 'S09-02', 'S09-03', 'S09-04', 'S09-05']) {
    const block = getCodeBlock(source, code)
    assert.ok(!block.includes('(Camera or Video Evidence Required)'), `${code} must not receive camera/video item tags in this pass`)
    assert.ok(!block.includes('(Camera Evidence Required)'), `${code} must not receive camera item tags in this pass`)
    assert.ok(!block.includes('(Camera or Note Evidence Required)'), `${code} must not receive camera/note item tags in this pass`)
  }
})
