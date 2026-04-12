import test from 'node:test'
import assert from 'node:assert/strict'
import {
  APPENDIX_PAGE_SIZE,
  buildScheduleCBPacketData,
  chunkAppendixEntries,
  extractAuditCoordinates,
  formatCoordinates,
  formatDisplayTimestamp,
  formatForensicTimestamp,
  toDisplayFileKind,
} from '../scheduleCBPacketHelpers'
import { SAMPLE_SCHEDULE_CB_PACKET_SOURCE } from '../scheduleCBPacketFixtures'

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
  assert.equal(packet.appendixEntries[0]?.requirementReference, 'Stage 15 · S15-01 — Final Document Verification')
  assert.equal(packet.appendixEntries[0]?.capturedAtDisplay, 'Apr 11, 2026 16:02:00 UTC')
  assert.equal(packet.auditTrail.exactTimestampDisplay, 'Apr 11, 2026 16:21:00 UTC')
  assert.match(packet.legal.complianceTodos[0] ?? '', /Compliance TODO:/)
})
