import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright-core";

const baseUrl = process.env.LOOKBOOK_QA_BASE_URL || "http://localhost:3000";
const outputDirectory =
  process.env.LOOKBOOK_PDF_OUTPUT_DIR || "/private/tmp/langley-lookbook-pdf";
const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });

  await page.goto(`${baseUrl}/homes/langley`, { waitUntil: "networkidle" });

  for (let step = 0; step < 12; step += 1) {
    if (await page.locator("[data-lookbook-lead-capture]").count()) break;
    const confirm = page.locator(
      '[data-category-state="active"] [data-confirm-category]',
    );
    await confirm.first().click();
    await page.waitForTimeout(80);
  }

  await page
    .locator("[data-lookbook-lead-capture]")
    .waitFor({ state: "visible" });
  await page.locator("#home-look-book-content").scrollIntoViewIfNeeded();
  await page.emulateMedia({ media: "print" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(
      document.querySelectorAll("[data-look-book-print-page] img"),
    );
    images.forEach((image) => {
      image.loading = "eager";
    });
    await Promise.race([
      Promise.all(images.map((image) => image.decode().catch(() => undefined))),
      new Promise((resolve) => window.setTimeout(resolve, 15_000)),
    ]);
  });

  const pages = page.locator("[data-look-book-print-page]");
  const pageCount = await pages.count();
  assert.equal(pageCount, 12, "Langley Look Book should render exactly 12 pages");

  const pageSummaries = [];
  for (let index = 0; index < pageCount; index += 1) {
    const pdfPage = pages.nth(index);
    const text = (await pdfPage.innerText()).replace(/\s+/g, " ").trim();
    const clipping = await pdfPage.evaluate((element) => {
      const pageRect = element.getBoundingClientRect();
      return Array.from(element.querySelectorAll("h1, h2, h3, h4, p"))
        .filter((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return (
            rect.left < pageRect.left - 1 ||
            rect.right > pageRect.right + 1 ||
            rect.top < pageRect.top - 1 ||
            rect.bottom > pageRect.bottom + 1
          );
        })
        .map((candidate) => candidate.textContent?.trim().slice(0, 120));
    });

    await pdfPage.screenshot({
      path: path.join(
        outputDirectory,
        `page-${String(index + 1).padStart(2, "0")}.png`,
      ),
      animations: "disabled",
    });
    pageSummaries.push({
      page: index + 1,
      text,
      clipping,
    });
  }

  assert.equal(
    pageSummaries.some(({ text }) => /\bchoose (?:one|a)\b/i.test(text)),
    false,
    "final Look Book pages must not contain configurator instructions",
  );
  assert.deepEqual(
    pageSummaries.flatMap(({ clipping }) => clipping),
    [],
    "PDF text must remain inside every page",
  );
  const completeText = pageSummaries.map(({ text }) => text).join(" ");
  for (const expectedHeadline of [
    "Factory precision. Premium design.",
    "Why House Delivery.",
    "Could this home cost materially less to deliver?",
    "Your Langley. Ready to become real.",
  ]) {
    assert.ok(
      completeText.toLowerCase().includes(expectedHeadline.toLowerCase()),
      `PDF preserves headline word spacing: ${expectedHeadline}`,
    );
  }

  await page.pdf({
    path: path.join(outputDirectory, "langley-lookbook.pdf"),
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  await writeFile(
    path.join(outputDirectory, "inspection.json"),
    `${JSON.stringify({ pageCount, pages: pageSummaries }, null, 2)}\n`,
  );

  process.stdout.write(
    `Rendered ${pageCount} Langley Look Book pages to ${outputDirectory}.\n`,
  );
} finally {
  await browser.close();
}
