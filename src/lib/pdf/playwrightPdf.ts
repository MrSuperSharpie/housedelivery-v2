import { chromium } from 'playwright'

export async function renderHtmlToPdf(html: string): Promise<Uint8Array> {
  // PLAYWRIGHT_BROWSERS_PATH=0 tells Playwright to look for the browser binary
  // inside the playwright package directory (node_modules/playwright/.local-browsers)
  // rather than the user home cache (~/.cache/ms-playwright), which does not exist
  // in Vercel's serverless execution environment.
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0'

  let browser

  try {
    browser = await chromium.launch({
      headless: true,
    })
  } catch (error) {
    throw new Error(
      `Playwright Chromium could not launch. Install the browser with "npx playwright install chromium". ${error instanceof Error ? error.message : ''}`.trim()
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
