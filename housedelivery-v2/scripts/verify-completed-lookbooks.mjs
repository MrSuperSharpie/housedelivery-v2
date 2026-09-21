import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright-core";

const assets = JSON.parse(await readFile(new URL("../src/data/completed-look-book-assets.json", import.meta.url), "utf8"));
const baseUrl = process.env.LOOKBOOK_QA_BASE_URL || "http://127.0.0.1:3100";
const output = process.env.LOOKBOOK_QA_OUTPUT || "/tmp/house-lookbook-qa";
const chromePath = process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
await mkdir(output, { recursive: true });
const results = [];
const knownMissingGlobalLogo = "/images/brand/house-delivery-logo-tan.png";
const imagePath = (home, path) => `/images/homes/${home}/visual-guide/${path.split("/").map(encodeURIComponent).join("/")}`;

// Every installed URL must resolve, including spaces, ampersands and nesting.
for (const [home, categories] of Object.entries(assets)) {
  for (const asset of Object.values(categories).flat()) {
    const url = new URL(imagePath(home, asset.path), baseUrl);
    const response = await fetch(url, { method: "HEAD" });
    assert.equal(response.status, 200, `Missing image: ${url}`);
    assert.match(response.headers.get("content-type"), /image\/png/);
  }
  console.log(`${home}: all 56 image URLs return PNG/200`);
}

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }]) {
    for (const [home, categories] of Object.entries(assets)) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      page.setDefaultNavigationTimeout(30_000);
      console.log(`${home}/${viewport.name}: opening direct home URL`);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error" && !message.text().startsWith("Failed to load resource: the server responded with a status of 404")) {
          errors.push(message.text());
        }
      });
      page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      const response = await page.goto(`${baseUrl}/homes/${home}`, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200, `${home}: direct route`);
      await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
      assert.equal(await page.locator(`[data-home-configuration="${home}"]`).count(), 1);
      const chapterIds = await page.locator('[data-home-category]:not([data-category-kind="coordinated"])').evaluateAll((nodes) => nodes.map((node) => node.dataset.homeCategory));
      assert.equal(chapterIds.length, 7);
      const chosen = [];

      async function checkPreview(categoryId, sourceIndex, visibleIndex) {
        const option = categories[categoryId][sourceIndex];
        const id = `${categoryId}-${option.level}-${option.optionNumber}`;
        await page.locator(`[data-home-image-preview="${id}"]`).waitFor();
        const dialog = page.getByRole("dialog");
        assert.equal(await dialog.getByRole("heading").innerText(), option.name);
        assert.ok((await dialog.locator("p").allTextContents()).includes(option.level === "premium" ? "Premium — Included" : "Signature — Upgrade"));
        const img = dialog.locator("img");
        assert.equal(await img.getAttribute("src"), imagePath(home, option.path));
        await img.evaluate(async (image) => { await image.decode(); });
        assert.ok(await img.evaluate((image) => image.naturalWidth > 0));
        assert.equal(await dialog.locator("[data-show-previous-preview-option]").isDisabled(), visibleIndex === 0);
        assert.equal(await dialog.locator("[data-show-next-preview-option]").isDisabled(), visibleIndex === 3);
      }

      for (const [chapterIndex, categoryId] of chapterIds.entries()) {
        if (await page.locator("[data-close-image-preview]").count()) await page.locator("[data-close-image-preview]").click();
        const category = page.locator(`[data-home-category="${categoryId}"]`);
        assert.equal(await category.getAttribute("data-category-state"), "active");
        const premiumSection = category.locator('[data-option-tier-section="premium"]');
        const signatureSection = category.locator('[data-option-tier-section="signature"]');
        assert.equal(await premiumSection.getAttribute("data-tier-option-count"), "2");
        assert.equal(await signatureSection.getAttribute("data-tier-option-count"), "2");
        assert.match(await premiumSection.innerText(), /PREMIUM/);
        assert.match(await premiumSection.innerText(), /Included with Premium specification/);
        assert.match(await signatureSection.innerText(), /SIGNATURE/);
        assert.match(await signatureSection.innerText(), /UPGRADE COLLECTION/);
        assert.match(await signatureSection.innerText(), /Elevated materials, detailing and specification\. Upgrade pricing confirmed with the final home specification\./);
        assert.equal(await premiumSection.locator('[data-home-option][data-option-level="premium"]').count(), 2);
        assert.equal(await signatureSection.locator('[data-home-option][data-option-level="signature"]').count(), 2);
        const tierPositions = await category.locator('[data-option-tier-section]').evaluateAll((sections) => sections.map((section) => section.getBoundingClientRect().top));
        assert.ok(tierPositions[1] > tierPositions[0], `${home}/${categoryId}: Signature must follow Premium`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${home}/${categoryId}: horizontal overflow`);
        await category.scrollIntoViewIfNeeded();
        if (chapterIndex === 0) await category.screenshot({ path: join(output, `${home}-${viewport.name}-category.png`) });
        await category.locator("[data-preview-home-option]").first().click();
        const visibleSourceIndices = [0, 1, 4, 5];
        for (const [visibleIndex, sourceIndex] of visibleSourceIndices.entries()) {
          await checkPreview(categoryId, sourceIndex, visibleIndex);
          if (visibleIndex === 0 && chapterIndex === 0) await page.screenshot({ path: join(output, `${home}-${viewport.name}-preview.png`) });
          if (visibleIndex < 3) await page.locator("[data-show-next-preview-option]").click();
        }
        await page.locator("[data-show-previous-preview-option]").click();
        await checkPreview(categoryId, 4, 2);
        await page.locator("[data-show-next-preview-option]").click();
        await checkPreview(categoryId, 5, 3);
        // Complete a Signature book on desktop and a Premium book on mobile.
        const selectedIndex = viewport.name === "desktop" ? 5 : 1;
        const selectedVisibleIndex = viewport.name === "desktop" ? 3 : 1;
        for (let index = 3; index > selectedVisibleIndex; index -= 1) await page.locator("[data-show-previous-preview-option]").click();
        await checkPreview(categoryId, selectedIndex, selectedVisibleIndex);
        chosen.push({ categoryId, ...categories[categoryId][selectedIndex] });
        await page.locator("[data-select-preview-option]").click();
        if (await page.locator("[data-close-image-preview]").count()) {
          await page.locator("[data-close-image-preview]").click();
        }
        const selectedLevelLabel = categories[categoryId][selectedIndex].level === "premium" ? "PREMIUM — INCLUDED" : "SIGNATURE — UPGRADE";
        const completedCategory = page.locator(`[data-home-category="${categoryId}"][data-category-state="complete"]`);
        assert.match(await completedCategory.innerText(), new RegExp(selectedLevelLabel));
        const tierSelector = `[data-summary-option-tier="${categories[categoryId][selectedIndex].level}"]`;
        if (viewport.name === "mobile") {
          const compactSummary = page.locator("details").filter({ has: page.locator(tierSelector) }).first();
          if (!(await compactSummary.evaluate((details) => details.open))) {
            await compactSummary.locator("summary").click();
          }
        }
        const summaryTier = page.locator(`${tierSelector}:visible`).first();
        await summaryTier.waitFor();
        assert.equal((await summaryTier.innerText()).trim(), selectedLevelLabel);
        console.log(`${home}/${viewport.name}/${categoryId}: 4 public images, both tiers, next/previous, selection PASS`);
      }

      await page.locator('[data-look-book-ready="true"]').waitFor();
      assert.equal(await page.locator('[data-category-state="complete"]').count(), 7);
      const book = page.locator("#home-look-book");
      for (const selected of chosen) {
        const id = `${selected.categoryId}-${selected.level}-${selected.optionNumber}`;
        const selection = book.locator(`[data-look-book-category="${selected.categoryId}"][data-look-book-option="${id}"]`);
        assert.ok(await selection.count(), `${home}: saved ${id}`);
        assert.equal(await selection.first().getAttribute("data-look-book-level"), selected.level);
        assert.ok(await book.locator("img").evaluateAll((images, expected) => images.some((image) => image.getAttribute("src") === expected), imagePath(home, selected.path)));
      }
      await page.locator("[data-look-book-cover]").scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(output, `${home}-${viewport.name}-lookbook.png`) });
      console.log(`${home}/${viewport.name}: completed Look Book verified; checking category navigation`);
      // Completed-category navigation must reopen the right choices.
      const progress = page.getByRole("navigation", { name: new RegExp("configuration progress") });
      await progress.locator("summary").click();
      await progress.getByRole("button").first().scrollIntoViewIfNeeded();
      await progress.getByRole("button").first().click();
      assert.equal(await page.locator('[data-category-state="active"]').getAttribute("data-home-category"), chapterIds[0]);
      assert.equal(await page.locator('[data-category-state="active"] [data-home-option]').count(), 4);
      assert.equal(await page.locator('[data-category-state="active"] [data-option-tier-section="premium"] [data-home-option]').count(), 2);
      assert.equal(await page.locator('[data-category-state="active"] [data-option-tier-section="signature"] [data-home-option]').count(), 2);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const unexpectedErrors = errors.filter((error) => !error.endsWith(knownMissingGlobalLogo));
      assert.deepEqual(unexpectedErrors, [], `${home}/${viewport.name}: browser errors`);
      console.log(`${home}/${viewport.name}: complete journey PASS`);
      results.push({ home, viewport: viewport.name, categories: 7, previewedImages: 28, selectedTier: viewport.name === "desktop" ? "signature" : "premium", status: "passed" });
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
}
console.log(`PASS: ${results.length} complete desktop/mobile journeys. Screenshots and results: ${output}`);
