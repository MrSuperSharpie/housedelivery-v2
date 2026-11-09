import type { EvidenceItem } from '@/lib/domain/types'
import type { HoldDetail, HoldEvidenceRecord } from '@/lib/supabase/holds'

function toEvidenceKind(evidence: HoldEvidenceRecord): EvidenceItem['kind'] {
  if (evidence.evidenceType === 'photo') return 'photo'
  if (evidence.evidenceType === 'video') return 'video'
  if (evidence.evidenceType === 'note') return 'voice_note'
  return 'document'
}

export function buildHoldHistorySummary(details: HoldDetail[]) {
  return details.map(detail => ({
    holdId: detail.hold.id,
    status: detail.hold.status,
    reason: detail.hold.reason,
    deficiencyReason: detail.hold.deficiencyReason,
    category: detail.hold.holdCategory,
    estimatedCorrectionMinutes: detail.hold.estimatedCorrectionMinutes,
    premiumRateType: detail.hold.premiumRateType,
    premiumRateAmount: detail.hold.premiumRateAmount,
    holdCapAmount: detail.hold.holdCapAmount,
    premiumChargeAmount: detail.hold.premiumChargeAmount,
    actualRetainedMinutes: detail.hold.actualRetainedMinutes,
    resolution: detail.hold.holdResolution,
    resolutionNotes: detail.hold.holdResolutionNotes,
    placedAt: detail.hold.placedAt,
    builderAcceptedAt: detail.hold.builderAcceptedAt,
    holdStartedAt: detail.hold.holdStartedAt,
    holdEndedAt: detail.hold.holdEndedAt,
    expiredAt: detail.hold.expiredAt,
    affectedItemSummaries: detail.hold.affectedItemSummaries,
    events: detail.events.map(event => ({
      eventType: event.eventType,
      actorRole: event.actorRole,
      actorId: event.actorId,
      note: event.note,
      createdAt: event.createdAt,
    })),
  }))
}

export function buildHoldEvidenceItems(details: HoldDetail[], projectId: string): EvidenceItem[] {
  return details.flatMap(detail =>
    detail.evidence.map(evidence => ({
      id: evidence.id,
      projectId,
      holdPointId: detail.hold.id,
      kind: toEvidenceKind(evidence),
      fileType: evidence.mimeType,
      originalFilename: evidence.fileName,
      storagePath: evidence.storagePath,
      captureTimestamp: evidence.capturedAt ?? evidence.createdAt,
      uploadedBy: evidence.createdByUserId,
      notes: evidence.noteText ?? detail.hold.reason,
      validationState: 'pending' as const,
      metadata: {
        holdId: detail.hold.id,
        holdStatus: detail.hold.status,
        holdEvidenceRole: evidence.evidenceRole,
        holdResolution: detail.hold.holdResolution ?? null,
        checklistItemId: evidence.checklistItemId ?? null,
      },
      createdAt: evidence.createdAt,
      updatedAt: evidence.updatedAt,
    })),
  )
}
