import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildHardPingResponsePayload,
  createSingleFlightSubmitter,
  normalizeHardPingResponseType,
  shouldCloseHardPingOverlay,
} from './hardPingClient'

test('hard ping response types map to backend RPC actions', () => {
  assert.equal(normalizeHardPingResponseType('en_route'), 'yes_en_route')
  assert.equal(normalizeHardPingResponseType('needs_help'), 'need_help')
  assert.equal(normalizeHardPingResponseType('cannot_attend'), 'cannot_attend')
})

test('en route hard ping payload preserves typed frontend response', () => {
  const payload = buildHardPingResponsePayload({
    assignmentId: 'assignment-1',
    jobId: 'job-1',
    responseType: 'en_route',
    clientTimestamp: '2026-04-25T18:00:00.000Z',
  })

  assert.equal(payload.assignmentId, 'assignment-1')
  assert.equal(payload.responseType, 'en_route')
  assert.equal(payload.backendAction, 'yes_en_route')
  assert.equal(payload.clientTimestamp, '2026-04-25T18:00:00.000Z')
})

test('help payload sends selected reason and trimmed details', () => {
  const payload = buildHardPingResponsePayload({
    assignmentId: 'assignment-1',
    responseType: 'needs_help',
    reasonCategory: 'app_gps_issue',
    details: '  GPS permission prompt is looping  ',
    clientTimestamp: '2026-04-25T18:00:00.000Z',
  })

  assert.equal(payload.backendAction, 'need_help')
  assert.equal(payload.reasonCategory, 'app_gps_issue')
  assert.equal(payload.details, 'GPS permission prompt is looping')
})

test('stale hard ping responses close the overlay', () => {
  assert.equal(shouldCloseHardPingOverlay({ ok: false, stale: true }), true)
  assert.equal(shouldCloseHardPingOverlay({ ok: false, hardPingActive: false }), true)
  assert.equal(shouldCloseHardPingOverlay({ ok: false, hardPingActive: true }), false)
})

test('single-flight submitter prevents double submit while pending', async () => {
  let callCount = 0
  let release: (() => void) | undefined
  const submitter = createSingleFlightSubmitter(async (value: string) => {
    callCount += 1
    await new Promise<void>(resolve => {
      release = resolve
    })
    return value
  })

  const first = submitter('first')
  const second = await submitter('second')
  release?.()
  const firstResult = await first

  assert.equal(second, null)
  assert.equal(firstResult, 'first')
  assert.equal(callCount, 1)
})

