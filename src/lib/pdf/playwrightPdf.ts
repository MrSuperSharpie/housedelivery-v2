import chromium from '@sparticuz/chromium'
import { chromium as playwrightChromium } from 'playwright-core'
import { existsSync } from 'node:fs'

const MACOS_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
let serverlessExecutablePathPromise: Promise<string> | null = null

function getServerlessExecutablePath(): Promise<string> {
  serverlessExecutablePathPromise ??= chromium.executablePath()
  return serverlessExecutablePathPromise
}

export async function renderHtmlToPdf(html: string): Promise<Uint8Array> {
  let browser

  try {
    const useLocalMacChrome = process.platform === 'darwin' && existsSync(MACOS_CHROME_PATH)
    const executablePath = useLocalMacChrome
      ? MACOS_CHROME_PATH
      : await getServerlessExecutablePath()
    browser = await playwrightChromium.launch({
      args: useLocalMacChrome ? [] : chromium.args,
      executablePath,
      headless: true,
    })
  } catch (error) {
    throw new Error(
      `Playwright Chromium could not launch. ${error instanceof Error ? error.message : ''}`.trim()
    )
  }

  try {
    const page = await browser.newPage()
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
    await browser.close()
  }
}
