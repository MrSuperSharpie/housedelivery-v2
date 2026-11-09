import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ScheduleCBPacketDocument } from '../ScheduleCBPacketDocument'
import { buildScheduleCBPacketData } from '../scheduleCBPacketHelpers'
import {
  formatPacketDisplayId,
  getFriendlyEvidenceLinkLabel,
  isDemoCredentialText,
  paginateAppendixEntries,
  paginateChecklistItems,
  resolveEvidencePreviewImage,
  resolvePacketSealPresentation,
  splitPacketNoteParagraphs,
} from '../scheduleCBPacketPresentation'
import { SAMPLE_SCHEDULE_CB_PACKET_SOURCE } from '../scheduleCBPacketFixtures'
import type { ScheduleCBPacketSource } from '../scheduleCBPacketTypes'

function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|middot);/g, ' ')
    .replace(/\s+/g, ' ')
}

test('concise display IDs use the required prefix and eight uppercase characters', () => {
  assert.equal(formatPacketDisplayId('fdb54dcd-a1a2-4e11-b333-123456789abc', 'VRF'), 'VRF-FDB54DCD')
  assert.equal(formatPacketDisplayId('775cb186-a1a2-4e11-b333-123456789abc', 'SRC'), 'SRC-775CB186')
  assert.match(formatPacketDisplayId('short', 'JOB') ?? '', /^JOB-[A-F0-9]{8}$/)
})

test('display ID generation is deterministic and does not mutate the source value', () => {
  const raw = 'e6d0bf5a-a1a2-4e11-b333-123456789abc'
  assert.equal(formatPacketDisplayId(raw, 'JOB'), formatPacketDisplayId(raw, 'JOB'))
  assert.equal(raw, 'e6d0bf5a-a1a2-4e11-b333-123456789abc')
})

test('note formatting preserves paragraph content without breaking words', () => {
  assert.deepEqual(
    splitPacketNoteParagraphs('Shutoffs verified.\r\nBackflow device confirmed.\n\nSecond observation retained.'),
    ['Shutoffs verified. Backflow device confirmed.', 'Second observation retained.'],
  )
})

test('friendly evidence labels are stable for photo, field-note, and video records', () => {
  assert.equal(getFriendlyEvidenceLinkLabel('Photo Evidence'), 'Open full-size evidence')
  assert.equal(getFriendlyEvidenceLinkLabel('Field Note'), 'Open field note')
  assert.equal(getFriendlyEvidenceLinkLabel('Video Evidence'), 'Open video evidence')
})

test('photo preview selection keeps the uploaded thumbnail', () => {
  assert.equal(
    resolveEvidencePreviewImage({ fileKindLabel: 'Photo Evidence', imageUrl: 'https://secure/photo' }),
    'https://secure/photo',
  )
})

test('field-note preview selection uses the supplied permanent asset', () => {
  assert.equal(
    resolveEvidencePreviewImage(
      { fileKindLabel: 'Field Note' },
      { fieldNoteImageSrc: 'data:image/png;base64,FIELDNOTE' },
    ),
    'data:image/png;base64,FIELDNOTE',
  )
})

test('video preview selection uses the supplied permanent asset', () => {
  assert.equal(
    resolveEvidencePreviewImage(
      { fileKindLabel: 'Video Evidence' },
      { videoImageSrc: 'data:image/png;base64,VIDEO' },
    ),
    'data:image/png;base64,VIDEO',
  )
})

test('missing preview selection returns a non-empty branded image fallback', () => {
  assert.match(
    resolveEvidencePreviewImage({ fileKindLabel: 'Photo Evidence' }),
    /^data:image\/svg\+xml/,
  )
})

test('demo credential text receives only the mock demo seal and warning', () => {
  assert.equal(isDemoCredentialText('P.Eng — DEMONSTRATION CREDENTIAL'), true)
  assert.deepEqual(
    resolvePacketSealPresentation({
      actualSealSrc: 'data:image/png;base64,REAL',
      mockDemoSealSrc: 'data:image/png;base64,MOCK',
      credentialText: 'P.Eng — DEMONSTRATION CREDENTIAL',
    }),
    {
      kind: 'demo',
      imageSrc: 'data:image/png;base64,MOCK',
      notice: 'DEMONSTRATION ONLY — NOT FOR REGULATORY RELIANCE',
    },
  )
})

test('real inspector never receives the mock seal as a fallback', () => {
  assert.deepEqual(
    resolvePacketSealPresentation({ mockDemoSealSrc: 'data:image/png;base64,MOCK' }),
    { kind: 'missing' },
  )
})

test('real inspector uses the existing actual seal when available', () => {
  assert.deepEqual(
    resolvePacketSealPresentation({
      actualSealSrc: 'data:image/png;base64,REAL',
      mockDemoSealSrc: 'data:image/png;base64,MOCK',
    }),
    { kind: 'real', imageSrc: 'data:image/png;base64,REAL' },
  )
})

test('empty firm and seal values omit cleanly', () => {
  const data = buildScheduleCBPacketData({
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    officialFormOptions: {
      ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.officialFormOptions,
      firmName: '   ',
    },
    seal: { actualSealSrc: '   ' },
  })
  const auditHtml = renderToStaticMarkup(React.createElement(ScheduleCBPacketDocument, { data, section: 'trail' }))

  assert.equal(data.inspector.firmName, undefined)
  assert.equal(data.seal.kind, 'missing')
  assert.doesNotMatch(visibleText(auditHtml), /\bFirm\b/)
})

test('appendix pagination keeps two compact cards together and isolates long cards', () => {
  const compact = { caption: 'Compact evidence.', fileName: 'photo.jpg' }
  const long = { caption: 'x'.repeat(361), fileName: 'long-note.txt' }
  assert.deepEqual(paginateAppendixEntries([compact, compact, long, compact]).map(page => page.length), [2, 1, 1])
})

test('checklist pagination keeps ordinary records together and isolates oversized notes', () => {
  const compact = { itemLabel: 'Compact section', responseNote: 'Observed.', ahjNotes: 'Guidance.' }
  const long = { itemLabel: 'Long section', responseNote: 'x'.repeat(1900), ahjNotes: 'Guidance.' }
  assert.deepEqual(paginateChecklistItems([compact, compact, compact, long, compact]).map(page => page.length), [3, 1, 1])
})

test('footer and verification chain render concise IDs without visible raw UUIDs or signed URLs', () => {
  const rawIds = {
    verification: 'fdb54dcd-a1a2-4e11-b333-123456789abc',
    report: '775cb186-a1a2-4e11-b333-123456789abc',
    assignment: 'a8f37c11-a1a2-4e11-b333-123456789abc',
    job: 'e6d0bf5a-a1a2-4e11-b333-123456789abc',
    evidence: '91e2ac71-a1a2-4e11-b333-123456789abc',
  }
  const source: ScheduleCBPacketSource = {
    ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE,
    verificationId: rawIds.verification,
    report: {
      ...SAMPLE_SCHEDULE_CB_PACKET_SOURCE.report,
      id: rawIds.report,
      assignmentId: rawIds.assignment,
      jobId: rawIds.job,
    },
    documents: SAMPLE_SCHEDULE_CB_PACKET_SOURCE.documents.map((document, index) => ({
      ...document,
      id: index === 0 ? rawIds.evidence : document.id,
      signedUrl: `https://secure.example/evidence/${rawIds.evidence}?token=SECRET`,
    })),
  }
  const data = buildScheduleCBPacketData(source)
  const trailHtml = renderToStaticMarkup(React.createElement(ScheduleCBPacketDocument, { data, section: 'trail' }))
  const appendixHtml = renderToStaticMarkup(React.createElement(ScheduleCBPacketDocument, { data, section: 'appendix', appendixPageIndex: 0 }))
  const text = visibleText(`${trailHtml}${appendixHtml}`)

  assert.match(text, /VRF-FDB54DCD/)
  assert.match(text, /SRC-775CB186/)
  assert.match(text, /ASN-A8F37C11/)
  assert.match(text, /JOB-E6D0BF5A/)
  assert.match(text, /Open full-size evidence/)
  Object.values(rawIds).forEach(raw => assert.equal(text.includes(raw), false))
  assert.equal(text.includes('https://secure.example'), false)
})
