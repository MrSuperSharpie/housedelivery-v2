import test from 'node:test'
import assert from 'node:assert/strict'

import { buildHoldEvidenceItems, buildHoldHistorySummary } from './reporting'
import type { HoldDetail } from '@/lib/supabase/holds'

const SAMPLE_HOLD_DETAIL: HoldDetail = {
  hold: {
    id: 'hold-1',
    jobId: 'job-1',
    inspectorId: 'inspector-1',
    builderId: 'builder-1',
    createdByInspectorId: 'inspector-1',
    relatedInspectionId: 'inspection-1',
    placedAt: '2026-04-12T18:00:00.000Z',
    expiresAt: '2026-04-12T19:00:00.000Z',
    checklistItemIds: ['S11-01'],
    status: 'hold_resolved_pass',
    holdPaymentStatus: 'unpaid',
    reason: 'Minor vent support deficiency.',
    deficiencyReason: 'Vent support needed at final run.',
    holdCategory: 'minor_deficiency',
    holdEligibleForOnSiteCorrection: true,
    estimatedCorrectionMinutes: 60,
    premiumRateType: 'hourly',
    premiumRateAmount: 120,
    holdCapAmount: 180,
    builderAcceptedAt: '2026-04-12T18:05:00.000Z',
    holdStartedAt: '2026-04-12T18:05:00.000Z',
    holdEndedAt: '2026-04-12T18:42:00.000Z',
    holdResolution: 'pass',
    holdResolutionNotes: 'Support added and re-reviewed.',
    holdResolvedByUserId: 'inspector-1',
    linkedCorrectionEvidenceIds: ['hold-evidence-2'],
    affectedItemSummaries: ['Gas venting routed and supported?'],
    premiumChargeAmount: 74,
    actualRetainedMinutes: 37,
    extensionCount: 0,
    builderNote: 'Proceed on site.',
    resolutionSummary: 'Resolved on site.',
    resolvedAt: '2026-04-12T18:42:00.000Z',
    expiredAt: undefined,
    lastNotifiedAt: '2026-04-12T18:01:00.000Z',
    lastBuilderResponseAt: '2026-04-12T18:05:00.000Z',
    createdAt: '2026-04-12T18:00:00.000Z',
    updatedAt: '2026-04-12T18:42:00.000Z',
  },
  events: [
    {
      id: 'event-1',
      holdId: 'hold-1',
      jobId: 'job-1',
      eventType: 'hold_created',
      actorId: 'inspector-1',
      actorRole: 'inspector',
      note: 'Issue found on site.',
      metadata: {},
      createdAt: '2026-04-12T18:00:00.000Z',
    },
    {
      id: 'event-2',
      holdId: 'hold-1',
      jobId: 'job-1',
      eventType: 'hold_resolved_pass',
      actorId: 'inspector-1',
      actorRole: 'inspector',
      note: 'Resolved on site.',
      metadata: {},
      createdAt: '2026-04-12T18:42:00.000Z',
    },
  ],
  evidence: [
    {
      id: 'hold-evidence-1',
      holdId: 'hold-1',
      jobId: 'job-1',
      checklistItemId: 'S11-01',
      evidenceRole: 'deficiency',
      evidenceType: 'photo',
      fileName: 'deficiency.jpg',
      mimeType: 'image/jpeg',
      fileSize: 2048,
      storagePath: 'inspector_documents/inspector-1/holds/hold-1/deficiency.jpg',
      noteText: 'Original issue before correction.',
      captureGeo: {},
      capturedAt: '2026-04-12T18:00:00.000Z',
      createdByUserId: 'inspector-1',
      createdAt: '2026-04-12T18:00:00.000Z',
      updatedAt: '2026-04-12T18:00:00.000Z',
    },
    {
      id: 'hold-evidence-2',
      holdId: 'hold-1',
      jobId: 'job-1',
      checklistItemId: 'S11-01',
      evidenceRole: 'correction',
      evidenceType: 'note',
      fileName: undefined,
      mimeType: 'text/plain',
      fileSize: undefined,
      storagePath: undefined,
      noteText: 'Correction complete and confirmed.',
      captureGeo: {},
      capturedAt: '2026-04-12T18:40:00.000Z',
      createdByUserId: 'inspector-1',
      createdAt: '2026-04-12T18:40:00.000Z',
      updatedAt: '2026-04-12T18:40:00.000Z',
    },
  ],
  retentionSession: null,
}

test('buildHoldHistorySummary preserves final resolution and charge details', () => {
  const summary = buildHoldHistorySummary([SAMPLE_HOLD_DETAIL])
  assert.equal(summary.length, 1)
  assert.equal(summary[0]?.resolution, 'pass')
  assert.equal(summary[0]?.premiumChargeAmount, 74)
  assert.equal(summary[0]?.events.length, 2)
})

test('buildHoldEvidenceItems includes both original deficiency and correction evidence', () => {
  const items = buildHoldEvidenceItems([SAMPLE_HOLD_DETAIL], 'project-1')
  assert.equal(items.length, 2)
  assert.equal(items[0]?.kind, 'photo')
  assert.equal(items[0]?.metadata?.holdEvidenceRole, 'deficiency')
  assert.equal(items[1]?.kind, 'voice_note')
  assert.equal(items[1]?.metadata?.holdEvidenceRole, 'correction')
})
