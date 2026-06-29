import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ScheduleCBPacketDocument } from '../ScheduleCBPacketDocument'
import {
  APPENDIX_PAGE_SIZE,
  buildFieldNoteRecordUrl,
  buildScheduleCBPacketData,
  chunkAppendixEntries,
  coerceHoldHistoryEntry,
  extractAuditCoordinates,
  formatCoordinates,
  formatDisplayTimestamp,
  formatForensicTimestamp,
  isFieldNoteDocument,
  toDisplayFileKind,
} from '../scheduleCBPacketHelpers'
import { SAMPLE_SCHEDULE_CB_PACKET_SOURCE } from '../scheduleCBPacketFixtures'

// ─── Hold history test fixtures ───────────────────────────────────────────────

function renderPacketSection(
  data: ReturnType<typeof buildScheduleCBPacketData>,
  section: 'cover' | 'trail',
): string {
  return renderToStaticMarkup(React.createElement(ScheduleCBPacketDocument, { data, section }))
}

const SAMPLE_HOLD_PAYLOAD = {
  holdId: 'hold-test-1',
  placedAt: '2026-04-12T08:00:00.000Z',
  status: 'hold_resolved_pass',
  reason: 'Minor vent support deficiency.',
  deficiencyReason: 'Vent support required at final run.',
  category: 'minor_deficiency',
  affectedItemSummaries: ['Gas venting routed and supported?'],
  builderAcceptedAt: '2026-04-12T08:05:00.000Z',
  premiumRateType: 'hourly',
  premiumRateAmount: 120,
  holdCapAmount: 180,
  actualRetainedMinutes: 37,
  premiumChargeAmount: 74,
  resolution: 'pass',
  resolutionNotes: 'Support added and re-reviewed.',
  holdEndedAt: '2026-04-12T08:42:00.000Z',
  events: [
    {
      eventType: 'hold_created',
      actorRole: 'inspector',
      actorId: 'inspector-1',
      note: 'Issue found on site.',
      createdAt: '2026-04-12T08:00:00.000Z',
    },
    {
      eventType: 'hold_resolved_pass',
      actorRole: 'inspector',
      actorId: 'inspector-1',
      note: 'Correction complete and confirmed.',
      createdAt: '2026-04-12T08:42:00.000Z',
    },
  ],
}

test('formatCoordinates renders six-decimal forensic precision', () => {
  assert.equal(formatCoordinates(49.2827321, -123.1104712), '49.282732, -123.110471')
  assert.equal(formatCoordinates(null, -123.1104712), 'Not captured')
})

test('timestamp formatters preserve exact ISO values and readable UTC display', () => {
  assert.equal(formatForensicTimestamp('2026-04-11T16:21:00-07:00'), '2026-04-11T23:21:00.000Z')
  assert.equal(formatDisplayTimestamp('2026-04-11T16:21:00-07:00'), 'Apr 11, 2026 23:21:00 UTC')
  assert.equal(formatDisplayTimestamp(undefined), 'Not captured')
})

test('toDisplayFileKind maps evidence types predictably', () => {
  assert.equal(toDisplayFileKind('image/jpeg', 'photo.jpg'), 'Photo Evidence')
  assert.equal(toDisplayFileKind('video/mp4', 'walkthrough.mp4'), 'Video Evidence')
  assert.equal(toDisplayFileKind('text/plain', 'note.txt'), 'Field Note')
  assert.equal(toDisplayFileKind(undefined, 'drawing.pdf'), 'PDF Attachment')
})

test('chunkAppendixEntries preserves order and page size', () => {
  const entries = Array.from({ length: APPENDIX_PAGE_SIZE + 2 }, (_, index) => `entry-${index + 1}`)
  const chunks = chunkAppendixEntries(entries)

  assert.equal(chunks.length, 2)
  assert.deepEqual(chunks[0], entries.slice(0, APPENDIX_PAGE_SIZE))
  assert.deepEqual(chunks[1], entries.slice(APPENDIX_PAGE_SIZE))
})

test('extractAuditCoordinates prefers latest recorded sign-off location', () => {
  const coordinates = extractAuditCoordinates(SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report)
  assert.equal(coordinates.source, 'Checklist S15 sign-off')
  assert.equal(coordinates.latitude, 49.282732)
  assert.equal(coordinates.longitude, -123.110471)
})

test('buildScheduleCBPacketData assembles compliant cover and appendix data', () => {
  const packet = buildScheduleCBPacketData(SAMPLE_SCHEDULE_CB_PACKET_SOURCE)

  assert.equal(packet.complianceBlockLabel, 'SEALED & COMPLIANT')
  assert.equal(packet.project.name, 'Vero Mixed-Use Demonstration')
  assert.equal(packet.summary.stageStatusLabel, 'Builder Stage 7 of 7 — Final Approval and Occupancy')
  assert.equal(packet.summary.checklistScopeLabel, 'Checklist Scope: S15 — Inspections, Final Approval, and Occupancy')
  assert.equal(packet.summary.verificationId, 'VERO-PACKET-2026-0001')
  assert.equal(packet.appendixEntries.length, 2)
  assert.equal(packet.appendixEntries[0]?.requirementReference, 'Checklist S15 · S15-01 — Life-Safety Systems Final Verification')
  assert.equal(packet.appendixEntries[0]?.capturedAtDisplay, 'Apr 11, 2026 16:02:00 UTC')
  assert.equal(packet.auditTrail.exactTimestampDisplay, 'Apr 11, 2026 16:21:00 UTC')
  assert.match(packet.legal.complianceTodos[0] ?? '', /Compliance TODO:/)
})

test('Stage 1/S01 packet displays builder Stage 1 and checklist S01', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    report: {
      ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report,
      currentStage: 1,
      status: 'submitted' as const,
      sealPayload: {
        ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report.sealPayload,
        stageSignOffs: {
          '1': {
            stageNumber: 1,
            signedAt: '2026-04-11T16:21:00.000Z',
          },
        },
      },
    },
    packetScope: {
      mode: 'stage_level' as const,
      stageNumbers: [1],
    },
    builderStage: {
      number: 1,
      label: 'Site Survey & Excavation',
      total: 7,
    },
    items: [
      {
        itemCode: 'S01-01',
        itemLabel: 'Project Address and Legal Description',
        stageNumber: 1,
        stageName: 'Project Intake, Site Readiness, and Permit Basis',
        inspectionStatus: 'Passed' as const,
      },
    ],
    documents: [],
  }

  const packet = buildScheduleCBPacketData(source)

  assert.equal(packet.summary.stageStatusLabel, 'Builder Stage 1 of 7 — Site Survey & Excavation')
  assert.equal(packet.summary.checklistScopeLabel, 'Checklist Scope: S01 — Project Intake, Site Readiness, and Permit Basis')
})

test('stage-level packet scope limits Stage 1 report to S01 items even when future stages are persisted', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    report: {
      ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report,
      currentStage: 1,
      status: 'submitted' as const,
      sealPayload: {
        ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report.sealPayload,
        stageSignOffs: {
          '1': {
            stageNumber: 1,
            signedAt: '2026-04-11T16:21:00.000Z',
            latitude: 49.282732,
            longitude: -123.110471,
          },
        },
      },
    },
    packetScope: {
      mode: 'stage_level' as const,
      stageNumbers: [1],
    },
    items: [
      ...Array.from({ length: 5 }, (_, index) => ({
        itemCode: `S01-0${index + 1}`,
        itemLabel: `Stage 1 checklist item ${index + 1}`,
        stageNumber: 1,
        stageName: 'Project Intake, Site Readiness, and Permit Basis',
        inspectionStatus: 'Passed' as const,
        ...(index === 4 ? { responseNote: 'Stage 1 closeout note captured by the inspector.' } : {}),
      })),
      ...Array.from({ length: 14 }, (_, index) => {
        const stageNumber = index + 2
        return {
          itemCode: `S${String(stageNumber).padStart(2, '0')}-01`,
          itemLabel: `Future stage ${stageNumber} placeholder`,
          stageNumber,
          stageName: `Future stage ${stageNumber}`,
          inspectionStatus: 'Pending' as const,
          ahjNotes: `Default AHJ guidance for future stage ${stageNumber}.`,
        }
      }),
    ],
    documents: [
      {
        id: 'doc-stage-1',
        itemCode: 'S01-01',
        fileName: 'stage-1-photo.jpg',
        storagePath: 'fixture://stage-1-photo.jpg',
        mimeType: 'image/jpeg',
        createdAt: '2026-04-11T16:02:00.000Z',
      },
      {
        id: 'doc-future-stage',
        itemCode: 'S02-01',
        fileName: 'future-stage-photo.jpg',
        storagePath: 'fixture://future-stage-photo.jpg',
        mimeType: 'image/jpeg',
        createdAt: '2026-04-11T16:03:00.000Z',
      },
    ],
  }

  const packet = buildScheduleCBPacketData(source)

  assert.equal(packet.items.length, 5)
  assert.equal(packet.checklistSummary.passCount, 5)
  assert.equal(packet.checklistSummary.failCount, 0)
  assert.equal(packet.checklistSummary.pendingCount, 0)
  assert.equal(packet.checklistSummary.totalCount, 5)
  assert.ok(packet.items.every(item => item.stageNumber === 1), 'Stage 1 packet must only include S01 items')
  assert.ok(packet.items.every(item => item.itemCode.startsWith('S01-')), 'Stage 1 packet must exclude S02-S15 rows')
  assert.ok(
    packet.appendixEntries.every(entry => !entry.requirementReference.includes('S02-')),
    'Stage 1 packet must not create appendix entries for future-stage documents or AHJ guidance',
  )
  assert.ok(
    packet.appendixEntries.some(entry => entry.caption === 'Stage 1 closeout note captured by the inspector.'),
    'Scoped signed-stage response notes must still appear as Field Observation appendix entries',
  )
})

test('full project packet scope can include multiple signed stages without duplicate item rows', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    packetScope: {
      mode: 'full_project' as const,
      stageNumbers: [1, 5, 15],
    },
    items: [
      {
        itemCode: 'S01-01',
        itemLabel: 'Project Address and Legal Description',
        stageNumber: 1,
        stageName: 'Project Intake, Site Readiness, and Permit Basis',
        inspectionStatus: 'Pending' as const,
      },
      {
        itemCode: 'S01-01',
        itemLabel: 'Project Address and Legal Description',
        stageNumber: 1,
        stageName: 'Project Intake, Site Readiness, and Permit Basis',
        inspectionStatus: 'Passed' as const,
      },
      {
        itemCode: 'S05-01',
        itemLabel: 'Footings, Foundation Walls, Rebar, and Embedded Items',
        stageNumber: 5,
        stageName: 'Foundation Pour',
        inspectionStatus: 'Passed' as const,
      },
      {
        itemCode: 'S15-01',
        itemLabel: 'Life-Safety Systems Final Verification',
        stageNumber: 15,
        stageName: 'Inspections, Final Approval, and Occupancy',
        inspectionStatus: 'Passed' as const,
      },
    ],
    documents: [],
  }

  const packet = buildScheduleCBPacketData(source)

  assert.deepEqual(packet.items.map(item => item.itemCode), ['S01-01', 'S05-01', 'S15-01'])
  assert.equal(packet.items.find(item => item.itemCode === 'S01-01')?.inspectionStatus, 'Passed')
  assert.equal(packet.checklistSummary.passCount, 3)
  assert.equal(packet.checklistSummary.totalCount, 3)
  assert.equal(packet.summary.stageStatusLabel, 'Builder Stage 7 of 7 — Final Approval and Occupancy')
  assert.equal(packet.summary.checklistScopeLabel, 'Checklist Scope: Signed stages S01, S05, S15')
})

test('Stage 2/S05 packet displays builder Stage 2 and checklist S05 while keeping S05 item scope', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    report: {
      ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report,
      currentStage: 5,
      status: 'submitted' as const,
      sealPayload: {
        ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report.sealPayload,
        stageSignOffs: {
          '5': {
            stageNumber: 5,
            signedAt: '2026-04-11T16:21:00.000Z',
            latitude: 49.282732,
            longitude: -123.110471,
          },
        },
      },
    },
    packetScope: {
      mode: 'stage_level' as const,
      stageNumbers: [5],
    },
    builderStage: {
      number: 2,
      label: 'Foundation Pour',
      total: 7,
    },
    items: [
      {
        itemCode: 'S05-01',
        itemLabel: 'Footings, Foundation Walls, Rebar, and Embedded Items',
        stageNumber: 5,
        stageName: 'Footings, Foundation, and Slab',
        inspectionStatus: 'Passed' as const,
      },
      {
        itemCode: 'S05-02',
        itemLabel: 'Drainage, Dampproofing, and Foundation Protection',
        stageNumber: 5,
        stageName: 'Footings, Foundation, and Slab',
        inspectionStatus: 'Passed' as const,
      },
      {
        itemCode: 'S05-03',
        itemLabel: 'Slab Preparation, Radon, Soil Gas, and Under-Slab Conditions',
        stageNumber: 5,
        stageName: 'Footings, Foundation, and Slab',
        inspectionStatus: 'Passed' as const,
      },
      {
        itemCode: 'S05-04',
        itemLabel: 'Concrete Pour, Placement, Curing, and Post-Pour Review',
        stageNumber: 5,
        stageName: 'Footings, Foundation, and Slab',
        inspectionStatus: 'Passed' as const,
      },
      {
        itemCode: 'S06-01',
        itemLabel: 'Future framing item',
        stageNumber: 6,
        stageName: 'Framing and Lock-Up',
        inspectionStatus: 'Pending' as const,
      },
    ],
    documents: [
      {
        id: 'doc-s05-01',
        itemCode: 'S05-01',
        fileName: 'foundation-rebar.jpg',
        storagePath: 'fixture://foundation-rebar.jpg',
        mimeType: 'image/jpeg',
        createdAt: '2026-04-11T16:02:00.000Z',
      },
    ],
  }

  const packet = buildScheduleCBPacketData(source)

  assert.equal(packet.summary.stageStatusLabel, 'Builder Stage 2 of 7 — Foundation Pour')
  assert.equal(packet.summary.checklistScopeLabel, 'Checklist Scope: S05 — Footings, Foundation, and Slab')
  assert.equal(packet.auditTrail.coordinatesSource, 'Checklist S05 sign-off')
  assert.equal(packet.checklistSummary.passCount, 4)
  assert.equal(packet.checklistSummary.failCount, 0)
  assert.equal(packet.checklistSummary.totalCount, 4)
  assert.equal(packet.items.length, 4)
  assert.ok(packet.items.every(item => item.itemCode.startsWith('S05-')))
  const coverHtml = renderPacketSection(packet, 'cover')
  assert.match(coverHtml, /Builder Stage 2 of 7 — Foundation Pour/)
  assert.match(coverHtml, /Checklist Scope: S05 — Footings, Foundation, and Slab/)
  assert.match(coverHtml, /4 passed · 0 failed \(4 items\)/)
  assert.match(coverHtml, /STAGE COMPLETE/)
  assert.match(coverHtml, /INSPECTION PASSED/)
  assert.match(coverHtml, /4 OF 4 ITEMS PASSED/)
  assert.equal(
    packet.appendixEntries[0]?.requirementReference,
    'Checklist S05 · S05-01 — Footings, Foundation Walls, Rebar, and Embedded Items',
  )
  assert.ok(
    !packet.appendixEntries[0]?.requirementReference.includes('Stage 5'),
    'S05 evidence appendix requirement labels must not use ambiguous Stage 5 wording',
  )
})

test('cover status badge does not claim Inspection Passed for failed or mixed results', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    items: [
      {
        itemCode: 'S05-01',
        itemLabel: 'Footings, Foundation Walls, Rebar, and Embedded Items',
        stageNumber: 5,
        stageName: 'Footings, Foundation, and Slab',
        inspectionStatus: 'Passed' as const,
      },
      {
        itemCode: 'S05-02',
        itemLabel: 'Drainage, Dampproofing, and Foundation Protection',
        stageNumber: 5,
        stageName: 'Footings, Foundation, and Slab',
        inspectionStatus: 'Failed' as const,
      },
    ],
    report: {
      ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report,
      currentStage: 5,
      sealPayload: {
        ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report.sealPayload,
        overallResult: 'pass',
        stageSignOffs: {
          '5': {
            stageNumber: 5,
            signedAt: '2026-04-11T16:21:00.000Z',
          },
        },
      },
    },
    packetScope: {
      mode: 'stage_level' as const,
      stageNumbers: [5],
    },
    builderStage: {
      number: 2,
      label: 'Foundation Pour',
      total: 7,
    },
  }

  const packet = buildScheduleCBPacketData(source)
  const coverHtml = renderPacketSection(packet, 'cover')

  assert.equal(packet.summary.overallResult, 'fail')
  assert.doesNotMatch(coverHtml, /INSPECTION PASSED/)
  assert.match(coverHtml, /INSPECTION REVIEW REQUIRED/)
  assert.match(coverHtml, /1 PASSED · 1 FAILED \(2 ITEMS\)/)
})

test('platform status badge is confined to the cover wrapper, not the audit trail or statutory form generator', () => {
  const packet = buildScheduleCBPacketData(SAMPLE_SCHEDULE_CB_PACKET_SOURCE)
  const trailHtml = renderPacketSection(packet, 'trail')
  const statutoryGeneratorSource = readFileSync('src/lib/pdf/scheduleCBGenerator.ts', 'utf8')

  assert.doesNotMatch(trailHtml, /INSPECTION PASSED/)
  assert.doesNotMatch(trailHtml, /Platform inspection outcome/)
  assert.doesNotMatch(trailHtml, /STAGE COMPLETE/)
  assert.doesNotMatch(statutoryGeneratorSource, /INSPECTION PASSED|STAGE COMPLETE|status-badge/)
})

test('Stage 3 discipline override packet preserves internal checklist code while showing builder Stage 3', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    report: {
      ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report,
      currentStage: 10,
      status: 'submitted' as const,
      sealPayload: {
        ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report.sealPayload,
        stageSignOffs: {
          '10': {
            stageNumber: 10,
            signedAt: '2026-04-11T16:21:00.000Z',
          },
        },
      },
    },
    packetScope: {
      mode: 'stage_level' as const,
      stageNumbers: [10],
    },
    builderStage: {
      number: 3,
      label: 'Framing & Lock-up',
      total: 7,
    },
    items: [
      {
        itemCode: 'S10-01',
        itemLabel: 'Electrical Permit and Service Readiness',
        stageNumber: 10,
        stageName: 'Electrical Permit and Scope',
        inspectionStatus: 'Passed' as const,
      },
    ],
    documents: [],
  }

  const packet = buildScheduleCBPacketData(source)

  assert.equal(packet.summary.stageStatusLabel, 'Builder Stage 3 of 7 — Framing & Lock-up')
  assert.equal(packet.summary.checklistScopeLabel, 'Checklist Scope: S10 — Electrical Permit and Scope')
})

// ─── Hold history: coerceHoldHistoryEntry ─────────────────────────────────────

test('coerceHoldHistoryEntry maps a fully-populated hold payload', () => {
  const entry = coerceHoldHistoryEntry(SAMPLE_HOLD_PAYLOAD)
  assert.ok(entry !== null)
  assert.equal(entry.holdId, 'hold-test-1')
  assert.equal(entry.resolution, 'pass')
  assert.equal(entry.actualRetainedMinutes, 37)
  assert.equal(entry.premiumChargeAmount, 74)
  assert.equal(entry.builderDecision, 'accepted')
  assert.equal(entry.initiatedByRole, 'inspector')
  assert.equal(entry.affectedItemSummaries.length, 1)
})

test('coerceHoldHistoryEntry derives correctionEvidenceRefs from non-creation events', () => {
  const entry = coerceHoldHistoryEntry(SAMPLE_HOLD_PAYLOAD)
  assert.ok(entry !== null)
  // hold_created is excluded; hold_resolved_pass note is included
  assert.equal(entry.correctionEvidenceCount, 1)
  assert.equal(entry.correctionEvidenceRefs.length, 1)
  assert.equal(entry.correctionEvidenceRefs[0], 'Correction complete and confirmed.')
})

test('coerceHoldHistoryEntry returns null for non-object input', () => {
  assert.equal(coerceHoldHistoryEntry(null), null)
  assert.equal(coerceHoldHistoryEntry('string'), null)
  assert.equal(coerceHoldHistoryEntry(42), null)
  assert.equal(coerceHoldHistoryEntry([]), null)
})

test('coerceHoldHistoryEntry marks builder decision as declined when status is hold_declined', () => {
  const entry = coerceHoldHistoryEntry({ ...SAMPLE_HOLD_PAYLOAD, status: 'hold_declined', builderAcceptedAt: undefined })
  assert.ok(entry !== null)
  assert.equal(entry.builderDecision, 'declined')
})

test('coerceHoldHistoryEntry marks builder decision as pending when no response fields are set', () => {
  const entry = coerceHoldHistoryEntry({
    ...SAMPLE_HOLD_PAYLOAD,
    status: 'hold_offered',
    builderAcceptedAt: undefined,
    expiredAt: undefined,
  })
  assert.ok(entry !== null)
  assert.equal(entry.builderDecision, 'pending')
})

// ─── Hold history: buildScheduleCBPacketData extraction ──────────────────────

test('buildScheduleCBPacketData populates holdHistory from sealPayload when present', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    report: {
      ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report,
      sealPayload: {
        ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report.sealPayload,
        holdHistory: [SAMPLE_HOLD_PAYLOAD],
      },
    },
  }
  const data = buildScheduleCBPacketData(source)
  assert.equal(data.holdHistory.length, 1)
  assert.equal(data.holdHistory[0]?.holdId, 'hold-test-1')
  assert.equal(data.holdHistory[0]?.resolution, 'pass')
  assert.equal(data.holdHistory[0]?.actualRetainedMinutes, 37)
})

test('buildScheduleCBPacketData produces empty holdHistory when sealPayload has no holdHistory', () => {
  const data = buildScheduleCBPacketData(SAMPLE_SCHEDULE_CB_PACKET_SOURCE)
  assert.equal(data.holdHistory.length, 0)
})

test('buildScheduleCBPacketData silently drops malformed holdHistory entries', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    report: {
      ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report,
      sealPayload: {
        ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report.sealPayload,
        holdHistory: [SAMPLE_HOLD_PAYLOAD, null, 'bad-entry', 42],
      },
    },
  }
  const data = buildScheduleCBPacketData(source)
  // Only the valid entry should survive
  assert.equal(data.holdHistory.length, 1)
  assert.equal(data.holdHistory[0]?.holdId, 'hold-test-1')
})

// ─── A. overallResult guard — reviewedCount === 0 must not force 'fail' ───────

test('overallResult stays pass on a sealed report even when reviewedCount is zero', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    items: [
      {
        itemCode: 'S15-01',
        itemLabel: 'Life-Safety Systems Final Verification',
        stageNumber: 15,
        stageName: 'Inspections, Final Approval, and Occupancy',
        // inspectionStatus deliberately absent — simulates status not persisted before seal
      },
    ],
    report: {
      ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report,
      sealPayload: {
        ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report.sealPayload,
        overallResult: 'pass',
      },
    },
  }
  const data = buildScheduleCBPacketData(source)
  assert.equal(
    data.summary.overallResult,
    'pass',
    'A sealed pass must not be downgraded to fail just because reviewedCount === 0',
  )
  assert.equal(data.complianceTone, 'compliant')
})

test('overallResult downgrades to fail when explicit failed items exist', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    items: [
      {
        itemCode: 'S15-01',
        itemLabel: 'Life-Safety Systems Final Verification',
        stageNumber: 15,
        stageName: 'Inspections, Final Approval, and Occupancy',
        inspectionStatus: 'Failed' as const,
      },
    ],
    report: {
      ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report,
      sealPayload: {
        ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report.sealPayload,
        overallResult: 'pass',
      },
    },
  }
  const data = buildScheduleCBPacketData(source)
  assert.equal(data.summary.overallResult, 'fail')
  assert.equal(data.complianceTone, 'review_required')
})

// ─── B. ahjNotes reaches the packet item record ───────────────────────────────

test('buildScheduleCBPacketData passes ahjNotes through to items array', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    items: [
      {
        itemCode: 'S15-01',
        itemLabel: 'Life-Safety Systems Final Verification',
        stageNumber: 15,
        stageName: 'Inspections, Final Approval, and Occupancy',
        inspectionStatus: 'Passed' as const,
        responseNote: 'Confirmed on site.',
        ahjNotes: 'AHJ requires fire authority sign-off separately.',
      },
    ],
  }
  const data = buildScheduleCBPacketData(source)
  assert.equal(data.items.length, 1)
  assert.equal(data.items[0]?.ahjNotes, 'AHJ requires fire authority sign-off separately.')
})

// ─── C & D. Note-only appendix entries ───────────────────────────────────────

test('note-only items with responseNote but no document produce a Field Observation appendix entry', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    items: [
      {
        itemCode: 'S15-03',
        itemLabel: 'Professional Assurance, Closeout Documents, and Final Vero Evidence Package',
        stageNumber: 15,
        stageName: 'Inspections, Final Approval, and Occupancy',
        inspectionStatus: 'Passed' as const,
        responseNote: 'Letters of Assurance confirmed on file.',
      },
    ],
    documents: [],
  }
  const data = buildScheduleCBPacketData(source)
  assert.equal(data.appendixEntries.length, 1, 'note-only item must produce one appendix entry')
  assert.equal(data.appendixEntries[0]?.fileKindLabel, 'Field Observation')
  assert.equal(data.appendixEntries[0]?.caption, 'Letters of Assurance confirmed on file.')
  assert.ok(
    data.appendixEntries[0]?.requirementReference.includes('S15-03'),
    'Field Observation entry must reference the item code',
  )
})

test('items with attached documents do not also produce a note-only appendix entry', () => {
  // Both items in the standard fixture have documents — no note-only entries expected
  const data = buildScheduleCBPacketData(SAMPLE_SCHEDULE_CB_PACKET_SOURCE)
  const noteOnlyEntries = data.appendixEntries.filter(e => e.fileKindLabel === 'Field Observation')
  assert.equal(noteOnlyEntries.length, 0, 'items with documents must not also produce Field Observation entries')
})

test('items with ahjNotes but no responseNote and no document do not produce a Field Observation entry', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    items: [
      {
        itemCode: 'S15-04',
        itemLabel: 'AHJ Final Approval Status and Occupancy Permit Documentation',
        stageNumber: 15,
        stageName: 'Inspections, Final Approval, and Occupancy',
        inspectionStatus: 'Passed' as const,
        ahjNotes: 'Confirm occupancy permit reference with AHJ before project close.',
      },
    ],
    documents: [],
  }
  const data = buildScheduleCBPacketData(source)
  assert.equal(data.items[0]?.ahjNotes, 'Confirm occupancy permit reference with AHJ before project close.')
  assert.equal(data.appendixEntries.length, 0)
})

// ─── E. items array is present in packet data ─────────────────────────────────

test('buildScheduleCBPacketData exposes items array for per-item rendering', () => {
  const data = buildScheduleCBPacketData(SAMPLE_SCHEDULE_CB_PACKET_SOURCE)
  assert.ok(Array.isArray(data.items), 'data.items must be an array')
  assert.equal(data.items.length, SAMPLE_SCHEDULE_CB_PACKET_SOURCE.items.length)
  assert.equal(data.items[0]?.itemCode, 'S15-01')
})

// ─── F. Statutory form isolation ─────────────────────────────────────────────

test('statutory Schedule C-B form fields remain separate from evidence appendix details', () => {
  // The statutory form is filled by scheduleCBGenerator (pdf-lib), not by the
  // packet helpers. The packet data object must not include form field values
  // that could contaminate the statutory template.
  const data = buildScheduleCBPacketData(SAMPLE_SCHEDULE_CB_PACKET_SOURCE)
  // Packet data has no raw form field map — statutory fields are passed via officialFormOptions
  assert.ok(!('formFields' in data), 'packet data must not expose a raw form fields map')
  assert.ok(!('statutoryFields' in data), 'packet data must not expose a statutory fields map')
})

// ─── G. Legal wording guard ───────────────────────────────────────────────────

test('packet data complianceBlockLabel does not claim Vero issues occupancy or grants approval', () => {
  const data = buildScheduleCBPacketData(SAMPLE_SCHEDULE_CB_PACKET_SOURCE)
  const label = data.complianceBlockLabel.toLowerCase()
  assert.ok(!label.includes('occupancy issued'), 'complianceBlockLabel must not say "occupancy issued"')
  assert.ok(!label.includes('grants approval'), 'complianceBlockLabel must not say "grants approval"')
  assert.ok(!label.includes('certifies'), 'complianceBlockLabel must not say "certifies"')
})

test('platform_preview disclaimerText explicitly states this is not an occupancy authorization', () => {
  const source = { ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE, exportMode: 'platform_preview' as const }
  const data = buildScheduleCBPacketData(source)
  assert.ok(
    data.disclaimerText.toLowerCase().includes('not a building permit') ||
    data.disclaimerText.toLowerCase().includes('occupancy authorization'),
    'platform_preview disclaimer must disclaim occupancy authorization status',
  )
})

// ─── H. Field Note Record routing ─────────────────────────────────────────────

test('isFieldNoteDocument detects text field notes and excludes other evidence', () => {
  assert.equal(isFieldNoteDocument('text/plain', 'field-note.txt'), true)
  assert.equal(isFieldNoteDocument(undefined, 'field-note.txt'), false)
  assert.equal(isFieldNoteDocument('image/jpeg', 'photo.jpg'), false)
  assert.equal(isFieldNoteDocument('application/pdf', 'doc.pdf'), false)
})

test('buildFieldNoteRecordUrl builds an absolute record URL and is safe on empty inputs', () => {
  assert.equal(buildFieldNoteRecordUrl('https://app.veropermit.com', 'doc-1'), 'https://app.veropermit.com/field-note/doc-1')
  assert.equal(buildFieldNoteRecordUrl('https://app.veropermit.com/', 'doc-1'), 'https://app.veropermit.com/field-note/doc-1')
  assert.equal(buildFieldNoteRecordUrl(undefined, 'doc-1'), undefined)
  assert.equal(buildFieldNoteRecordUrl('https://app.veropermit.com', ''), undefined)
})

test('field-note document appendix entry links to the formal record when appBaseUrl is set', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    appBaseUrl: 'https://app.veropermit.com',
    documents: [
      {
        id: 'note-doc-1',
        itemCode: 'S15-01',
        fileName: 'field-note-2026-04-11.txt',
        storagePath: 'inspector_documents/note-doc-1.txt',
        mimeType: 'text/plain',
        createdAt: '2026-04-11T16:02:00.000Z',
        capturedAt: '2026-04-11T16:02:00.000Z',
        signedUrl: 'https://storage.example.com/sign/note-doc-1.txt',
      },
    ],
  }
  const data = buildScheduleCBPacketData(source)
  const entry = data.appendixEntries.find(e => e.id === 'note-doc-1')
  assert.ok(entry, 'field-note document must appear in appendix')
  assert.equal(entry?.fileKindLabel, 'Field Note')
  assert.equal(entry?.recordUrl, 'https://app.veropermit.com/field-note/note-doc-1')
})

test('non-text evidence never gets a Field Note Record URL even when appBaseUrl is set', () => {
  const source = { ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE, appBaseUrl: 'https://app.veropermit.com' }
  const data = buildScheduleCBPacketData(source)
  // The fixture contains only image evidence — none should be routed to /field-note.
  assert.ok(data.appendixEntries.every(e => e.recordUrl === undefined))
})

test('field-note document keeps raw signed link when no appBaseUrl is provided', () => {
  const source = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    documents: [
      {
        id: 'note-doc-2',
        itemCode: 'S15-01',
        fileName: 'field-note-2026-04-11.txt',
        storagePath: 'inspector_documents/note-doc-2.txt',
        mimeType: 'text/plain',
        createdAt: '2026-04-11T16:02:00.000Z',
        signedUrl: 'https://storage.example.com/sign/note-doc-2.txt',
      },
    ],
  }
  const data = buildScheduleCBPacketData(source)
  const entry = data.appendixEntries.find(e => e.id === 'note-doc-2')
  assert.equal(entry?.recordUrl, undefined)
  assert.equal(entry?.signedUrl, 'https://storage.example.com/sign/note-doc-2.txt')
})
