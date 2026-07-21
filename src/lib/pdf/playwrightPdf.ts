import chromium from '@sparticuz/chromium'
import {
  chromium as playwrightChromium,
  type Browser,
  type BrowserContext,
  type LaunchOptions,
  type Page,
} from 'playwright-core'
import { existsSync } from 'node:fs'

const MACOS_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// Playwright already supplies its own headless, feature, and shared-memory flags.
// Keep only the serverless additions needed by this HTML-to-PDF workload. In
// particular, do not merge Sparticuz's single-process, no-zygote, or SwiftShader
// flags: concurrent packet sections can otherwise exhaust Lambda's thread limit.
const SERVERLESS_CHROMIUM_ARGS = Object.freeze([
  '--disable-domain-reliability',
  '--disable-print-preview',
  '--no-pings',
  '--font-render-hinting=none',
  '--disable-gpu',
  '--disable-webgl',
  '--disable-setuid-sandbox',
  '--no-sandbox',
])

let serverlessExecutablePathPromise: Promise<string> | null = null

function getServerlessExecutablePath(): Promise<string> {
  serverlessExecutablePathPromise ??= chromium.executablePath()
  return serverlessExecutablePathPromise
}

export function buildChromiumLaunchOptions(
  executablePath: string,
  useLocalMacChrome: boolean,
): LaunchOptions {
  return {
    args: useLocalMacChrome ? [] : [...SERVERLESS_CHROMIUM_ARGS],
    executablePath,
    headless: true,
  }
}

async function getChromiumLaunchOptions(): Promise<LaunchOptions> {
  const useLocalMacChrome = process.platform === 'darwin' && existsSync(MACOS_CHROME_PATH)
  const executablePath = useLocalMacChrome
    ? MACOS_CHROME_PATH
    : await getServerlessExecutablePath()
  return buildChromiumLaunchOptions(executablePath, useLocalMacChrome)
}

export interface PdfRenderDependencies {
  getLaunchOptions: () => Promise<LaunchOptions>
  launch: (options: LaunchOptions) => Promise<Browser>
}

async function closeQuietly(resource: { close: () => Promise<void> } | undefined): Promise<void> {
  if (!resource) return
  try {
    await resource.close()
  } catch {
    // Cleanup must not replace the render result or the original render error.
  }
}

export function createPlaywrightPdfRenderer(dependencies: PdfRenderDependencies) {
  return async (html: string): Promise<Uint8Array> => {
    let browser: Browser | undefined
    let context: BrowserContext | undefined
    let page: Page | undefined

    try {
      try {
        const launchOptions = await dependencies.getLaunchOptions()
        browser = await dependencies.launch(launchOptions)
      } catch (error) {
        throw new Error(
          `Playwright Chromium could not launch. ${error instanceof Error ? error.message : ''}`.trim(),
        )
      }

      context = await browser.newContext()
      page = await context.newPage()
      await page.setContent(html, { waitUntil: 'networkidle' })
      await page.emulateMedia({ media: 'print' })
      const pdf = await page.pdf({
        format: 'Letter',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      })
      return new Uint8Array(pdf)
    } finally {
      // Close in ownership order. Each close is attempted even if an earlier one
      // fails, ensuring warm serverless invocations do not retain processes.
      await closeQuietly(page)
      await closeQuietly(context)
      await closeQuietly(browser)
    }
  }
}

export function serializePdfRenderer(renderer: (html: string) => Promise<Uint8Array>) {
  let queue: Promise<void> = Promise.resolve()

  return (html: string): Promise<Uint8Array> => {
    const result = queue.then(() => renderer(html))
    queue = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}

const renderHtmlToPdfUnserialized = createPlaywrightPdfRenderer({
  getLaunchOptions: getChromiumLaunchOptions,
  launch: options => playwrightChromium.launch(options),
})

// Packet sections are intentionally rendered one at a time. A full Builder
// packet can contain many appendix pages, and each Chromium instance creates
// enough threads to exceed the function limit when launched in parallel.
export const renderHtmlToPdf = serializePdfRenderer(renderHtmlToPdfUnserialized)
