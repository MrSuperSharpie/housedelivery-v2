import test from 'node:test'
import assert from 'node:assert/strict'
import {
  APPENDIX_PAGE_SIZE,
  buildScheduleCBPacketData,
  chunkAppendixEntries,
  coerceHoldHistoryEntry,
  extractAuditCoordinates,
  formatCoordinates,
  formatDisplayTimestamp,
  formatForensicTimestamp,
  toDisplayFileKind,
} from '../scheduleCBPacketHelpers'
import { SAMPLE_SCHEDULE_CB_PACKET_SOURCE } from '../scheduleCBPacketFixtures'

// ─── Hold history test fixtures ───────────────────────────────────────────────

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
  assert.equal(coordinates.source, 'Stage 15 sign-off')
  assert.equal(coordinates.latitude, 49.282732)
  assert.equal(coordinates.longitude, -123.110471)
})

test('buildScheduleCBPacketData assembles compliant cover and appendix data', () => {
  const packet = buildScheduleCBPacketData(SAMPLE_SCHEDULE_CB_PACKET_SOURCE)

  assert.equal(packet.complianceBlockLabel, 'SEALED & COMPLIANT')
  assert.equal(packet.project.name, 'Vero Mixed-Use Demonstration')
  assert.equal(packet.summary.stageStatusLabel, 'Stage 15 of 15')
  assert.equal(packet.summary.verificationId, 'VERO-PACKET-2026-0001')
  assert.equal(packet.appendixEntries.length, 2)
  assert.equal(packet.appendixEntries[0]?.requirementReference, 'Stage 15 · S15-01 — Life-Safety Systems Final Verification')
  assert.equal(packet.appendixEntries[0]?.capturedAtDisplay, 'Apr 11, 2026 16:02:00 UTC')
  assert.equal(packet.auditTrail.exactTimestampDisplay, 'Apr 11, 2026 16:21:00 UTC')
  assert.match(packet.legal.complianceTodos[0] ?? '', /Compliance TODO:/)
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

test('items with ahjNotes but no responseNote and no document produce a Field Observation entry', () => {
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
  assert.equal(data.appendixEntries.length, 1)
  assert.equal(data.appendixEntries[0]?.fileKindLabel, 'Field Observation')
  assert.ok(data.appendixEntries[0]?.caption.length ?? 0 > 0, 'caption must be non-empty')
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
