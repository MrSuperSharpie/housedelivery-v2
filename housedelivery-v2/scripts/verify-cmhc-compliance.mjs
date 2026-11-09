import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.CMHC_QA_BASE_URL || "http://127.0.0.1:3109";
const output = process.env.CMHC_QA_OUTPUT || "/tmp/house-cmhc-compliance-qa";
const chromePath = process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const termsPath = "/cmhc-catalogue-terms";
const officialPdf = "https://assets.cmhc-schl.gc.ca/sites/housing%20catalog/resources/housing-design-catalogue-user-terms-and-conditions.pdf?rev=8aa4ec1f-26db-4c8f-b542-fc502732904d";
const statement = "CMHC catalogue drawings are subject to the CMHC Housing Design Catalogue User Terms and Conditions.";
const oldTerminology = /pre[\s-]?approv(?:ed|al)/i;
const models = [
  ["the-micro", "ADU-01", "Accessory Dwelling Unit 01", "BC_ADU_01_Drawings.pdf"],
  ["the-mini", "ADU-02", "Accessory Dwelling Unit 02", "BC_ADU_02_Drawings.pdf"],
  ["bc-duplex", "BC-DUPLEX", "Duplex", "BC_Duplex_Drawings.pdf"],
  ["bc-rowhouse", "BC-ROWHOUSE", "Rowhouse", "BC_Rowhouse_Drawings.pdf"],
  ["bc-fourplex-1", "BC-FOURPLEX-01", "Fourplex 01", "BC_Fourplex_01_Drawings.pdf"],
  ["bc-fourplex-2", "BC-FOURPLEX-02", "Fourplex 02", "BC_Fourplex_02_Drawings.pdf"],
  ["sixplex-courtyard", "BC-SIXPLEX", "Sixplex Courtyard", "BC_Sixplex Courtyard_Drawings.pdf"],
];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const results = [];
await mkdir(output, { recursive: true });

// Verify complete response bodies, including the filename containing a space.
for (const [slug, code, , filename] of models) {
  const path = `/pdfs/${filename}`;
  const response = await fetch(new URL(path, baseUrl));
  assert.equal(response.status, 200, `${code}: PDF status`);
  assert.match(response.headers.get("content-type"), /application\/pdf/);
  const received = Buffer.from(await response.arrayBuffer());
  const original = await readFile(new URL(`../public${path}`, import.meta.url));
  assert.equal(received.subarray(0, 5).toString(), "%PDF-");
  assert.equal(sha256(received), sha256(original), `${code}: PDF bytes changed`);
  results.push({ slug, code, pdf: path, bytes: received.length, sha256: sha256(received) });
}
console.log("All seven PDF URLs return complete, byte-identical PDF files.");

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce", acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(45_000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    async function open(path) {
      const response = await page.goto(new URL(path, baseUrl).href, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200, `${path}: page status`);
      await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
      assert.doesNotMatch(await page.locator("body").innerText(), oldTerminology, `${path}: visible terminology`);
      assert.doesNotMatch(await page.title(), oldTerminology, `${path}: title terminology`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path}: horizontal overflow`);
      assert.equal(await page.locator(`footer a[href="${termsPath}"]`).count(), 1, `${path}: footer link`);
    }

    await open("/");
    const catalogue = page.locator("#pre-approved-homes"); // Preserve existing inbound anchors.
    const cards = catalogue.locator("article");
    assert.equal(await cards.count(), 7);
    assert.match(await catalogue.innerText(), /Pre-reviewed homes/i);
    for (const [slug, , designName, filename] of models) {
      const card = cards.filter({ has: page.locator(`a[href="/catalog/${slug}"]`) });
      assert.equal(await card.count(), 1);
      const download = card.locator("a[download]");
      assert.equal(await download.getAttribute("href"), `/pdfs/${filename}`);
      assert.equal(await card.getByRole("link", { name: "CMHC Terms and Conditions", exact: true }).getAttribute("href"), termsPath);
      assert.equal(await card.getByRole("link", { name: statement, exact: true }).getAttribute("href"), termsPath);
      assert.equal(await card.locator(`a[href="${officialPdf}"]`).count(), 1);
      assert.ok((await card.innerText()).includes(designName));
      const rendering = card.locator("img");
      await rendering.scrollIntoViewIfNeeded();
      await page.waitForFunction((image) => image.complete && image.naturalWidth > 0, await rendering.elementHandle());
    }
    await catalogue.screenshot({ path: join(output, `catalogue-${viewport.name}.png`) });
    const resources = catalogue.locator("#pre-approved-catalogue-resources");
    assert.equal(await resources.locator("a[download]").count(), 7);
    await resources.getByRole("link", { name: "CMHC Terms and Conditions", exact: true }).click();
    await page.waitForURL(`**${termsPath}`);
    assert.equal(await page.locator("h1").innerText(), "CMHC Housing Design Catalogue — Terms and Conditions");
    for (const heading of ["About the Catalogue", "Use of Catalogue Designs", "Site-Specific Requirements", "Pre-Reviewed Designs", "Official CMHC Terms and Conditions", "Independent Company Notice"]) {
      assert.equal(await page.getByRole("heading", { name: heading, exact: true }).count(), 1);
    }
    assert.equal(await page.getByRole("link", { name: "Read the Official CMHC Terms and Conditions (PDF)", exact: true }).getAttribute("href"), officialPdf);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://housedelivery.ca${termsPath}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(output, `terms-${viewport.name}.png`), fullPage: true });

    for (const [slug, code, designName, filename] of models) {
      await open(`/catalog/${slug}`);
      const rendering = page.locator("main section").first().locator("img");
      await page.waitForFunction((image) => image.complete && image.naturalWidth > 0, await rendering.elementHandle());
      assert.match(await page.title(), /CMHC Pre-Reviewed Design/);
      for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]']) {
        assert.doesNotMatch(await page.locator(selector).getAttribute("content"), oldTerminology);
      }
      const download = page.locator("a[download]");
      assert.equal(await download.count(), 1);
      assert.equal(await download.getAttribute("href"), `/pdfs/${filename}`);
      const box = download.locator("xpath=ancestor::section");
      const terms = box.getByRole("link", { name: "CMHC Terms and Conditions", exact: true });
      assert.equal(await terms.getAttribute("href"), termsPath);
      assert.equal(await box.getByRole("link", { name: statement, exact: true }).getAttribute("href"), termsPath);
      assert.equal(await box.locator(`a[href="${officialPdf}"]`).count(), 1);
      assert.ok((await box.innerText()).includes(designName));
      assert.match(await box.innerText(), /not automatically approved construction documents or certified House Delivery manufacturing drawings/);
      await box.scrollIntoViewIfNeeded();
      await box.screenshot({ path: join(output, `${slug}-${viewport.name}-download.png`) });

      if (viewport.name === "desktop") {
        const pending = page.waitForEvent("download");
        await download.click();
        const file = await pending;
        assert.equal(await file.failure(), null, `${code}: browser download`);
        assert.equal(file.suggestedFilename(), filename);
        const saved = await readFile(await file.path());
        assert.equal(sha256(saved), results.find((result) => result.slug === slug).sha256);
      }
      await terms.click();
      await page.waitForURL(`**${termsPath}`);
      assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
      console.log(`${code}/${viewport.name}: terminology, download, terms links and layout pass`);
    }

    for (const path of ["/inclusions", "/pricing"]) await open(path);
    assert.deepEqual(errors, [], `${viewport.name}: browser errors`);
    await context.close();
  }

  // The terms and its primary action also fit the smallest supported handset.
  const context = await browser.newContext({ viewport: { width: 320, height: 740 }, reducedMotion: "reduce", javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(new URL(termsPath, baseUrl).href);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.ok(await page.locator("h1").isVisible());
  assert.ok(await page.getByRole("link", { name: "Read the Official CMHC Terms and Conditions (PDF)", exact: true }).isVisible());
  await page.screenshot({ path: join(output, "terms-320-no-js.png"), fullPage: true });
  await context.close();
} finally {
  await browser.close();
}
await writeFile(join(output, "results.json"), JSON.stringify({ baseUrl, models: results, viewports: [1440, 390, 320], passed: true }, null, 2));
console.log(`CMHC compliance QA passed. Screenshots and PDF checksums: ${output}`);
