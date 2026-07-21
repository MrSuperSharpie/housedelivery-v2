import assert from 'node:assert/strict'
import test from 'node:test'
import type { Browser, BrowserContext, Page } from 'playwright-core'
import {
  buildChromiumLaunchOptions,
  createPlaywrightPdfRenderer,
  serializePdfRenderer,
} from '../playwrightPdf'

const FORBIDDEN_SERVERLESS_FLAGS = [
  '--single-process',
  '--no-zygote',
  '--ignore-gpu-blocklist',
  '--in-process-gpu',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  "--headless='shell'",
]

test('serverless launch options use a minimal non-conflicting Chromium configuration', () => {
  const options = buildChromiumLaunchOptions('/tmp/chromium', false)
  const args = options.args ?? []

  assert.equal(options.executablePath, '/tmp/chromium')
  assert.equal(options.headless, true)
  assert.equal(new Set(args).size, args.length)
  assert.ok(args.includes('--no-sandbox'))
  assert.ok(args.includes('--disable-gpu'))
  assert.ok(args.includes('--disable-webgl'))
  for (const flag of FORBIDDEN_SERVERLESS_FLAGS) {
    assert.ok(!args.includes(flag), `${flag} must not be passed to Chromium`)
  }
})

test('local Chrome launch options do not inherit serverless flags', () => {
  const options = buildChromiumLaunchOptions('/Applications/Google Chrome', true)
  assert.deepEqual(options.args, [])
  assert.equal(options.executablePath, '/Applications/Google Chrome')
  assert.equal(options.headless, true)
})

function createMockResources(events: string[], pdfError?: Error) {
  const page = {
    setContent: async () => { events.push('set-content') },
    emulateMedia: async () => { events.push('emulate-media') },
    pdf: async () => {
      events.push('pdf')
      if (pdfError) throw pdfError
      return Buffer.from('pdf-result')
    },
    close: async () => { events.push('close-page') },
  } as unknown as Page
  const context = {
    newPage: async () => {
      events.push('new-page')
      return page
    },
    close: async () => { events.push('close-context') },
  } as unknown as BrowserContext
  const browser = {
    newContext: async () => {
      events.push('new-context')
      return context
    },
    close: async () => { events.push('close-browser') },
  } as unknown as Browser
  return { browser }
}

function createMockRenderer(events: string[], pdfError?: Error) {
  const { browser } = createMockResources(events, pdfError)
  return createPlaywrightPdfRenderer({
    getLaunchOptions: async () => buildChromiumLaunchOptions('/tmp/chromium', false),
    launch: async () => {
      events.push('launch')
      return browser
    },
  })
}

test('renderer closes page, context, and browser in order after success', async () => {
  const events: string[] = []
  const render = createMockRenderer(events)

  const result = await render('<html />')

  assert.equal(Buffer.from(result).toString(), 'pdf-result')
  assert.deepEqual(events.slice(-3), ['close-page', 'close-context', 'close-browser'])
})

test('renderer closes page, context, and browser when PDF generation fails', async () => {
  const events: string[] = []
  const render = createMockRenderer(events, new Error('pdf failed'))

  await assert.rejects(render('<html />'), /pdf failed/)
  assert.deepEqual(events.slice(-3), ['close-page', 'close-context', 'close-browser'])
})

test('serialized renderer never runs two Chromium renders concurrently', async () => {
  let active = 0
  let maximumActive = 0
  const completions: Array<() => void> = []
  const render = serializePdfRenderer(async () => {
    active += 1
    maximumActive = Math.max(maximumActive, active)
    await new Promise<void>(resolve => completions.push(resolve))
    active -= 1
    return new Uint8Array([1])
  })

  const first = render('first')
  const second = render('second')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(active, 1)
  assert.equal(completions.length, 1)

  completions.shift()?.()
  await first
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(active, 1)
  assert.equal(completions.length, 1)

  completions.shift()?.()
  await second
  assert.equal(maximumActive, 1)
})
