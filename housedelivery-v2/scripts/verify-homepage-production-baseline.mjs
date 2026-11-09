import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright-core";

const preview = process.env.HOMEPAGE_QA_BASE_URL || "http://127.0.0.1:3109";
const production = "https://www.housedelivery.ca";
const output = process.env.HOMEPAGE_QA_OUTPUT || "/tmp/hd-homepage-production-comparison";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const results = [];
const difference = (a, b) => [...new Set(a)].filter((value) => !b.includes(value));

try {
  for (const width of [1440, 390]) {
    const captures = {};
    for (const [name, base] of [["production", production], ["preview", preview]]) {
      const context = await browser.newContext({ viewport: { width, height: width < 768 ? 1800 : 1000 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.setDefaultTimeout(20_000);
      const response = await page.goto(base, { waitUntil: "networkidle", timeout: 60_000 });
      assert.equal(response.status(), 200);
      await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
      await page.evaluate(() => document.fonts.ready);

      const inventory = await page.evaluate(() => {
        const text = (node) => node.textContent.replace(/\s+/g, " ").trim();
        const href = (value) => {
          const url = new URL(value, location.href);
          return url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : url.href;
        };
        const image = (value) => {
          const url = new URL(value, location.href);
          return url.pathname === "/_next/image" ? url.searchParams.get("url") : url.origin === location.origin ? url.pathname : url.href;
        };
        return {
          sections: [...document.querySelector("main").children].map((node) => ({ tag: node.tagName, id: node.id, label: node.getAttribute("aria-label"), headings: [...node.querySelectorAll("h1,h2,h3")].map(text) })),
          headings: [...document.querySelectorAll("main h1,main h2,main h3,main h4")].map(text),
          images: [...document.querySelectorAll("main img")].map((node) => ({ source: image(node.currentSrc || node.src), alt: node.alt })),
          videos: [...document.querySelectorAll("main video source, main iframe")].map((node) => node.getAttribute("src")),
          links: [...document.querySelectorAll("a[href]")].map((node) => ({ text: text(node), href: href(node.href) })),
          buttons: [...document.querySelectorAll("button")].map((node) => text(node) || node.getAttribute("aria-label")),
          ids: [...document.querySelectorAll("[id]")].map((node) => node.id),
        };
      });
      const grid = page.locator("#carriage-homes-grid");
      // Record the production consent controls above, then dismiss this
      // session-only overlay so it does not obscure the comparison image.
      if (name === "production" && await page.getByRole("button", { name: "Essential only", exact: true }).count()) {
        await page.getByRole("button", { name: "Essential only", exact: true }).click();
      }
      const order = await grid.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => node.tagName === "ASIDE" ? "property-review" : node.querySelector("h3").textContent));
      assert.deepEqual(order, ["The Willow Nook", "The Lantern House", "property-review", "The Courtyard Cottage", "The Heritage Mews", "Limetree House", "Moonlight House"]);
      const section = page.locator("#laneway-property-review");
      const kitchen = section.locator("img");
      await kitchen.scrollIntoViewIfNeeded();
      await page.waitForFunction((image) => image.complete && image.naturalWidth > 0, await kitchen.elementHandle());
      const feature = await section.evaluate((node) => ({
        content: node.textContent.replace(/\s+/g, " ").trim(),
        classes: [...node.querySelectorAll("*")].map((child) => ({ tag: child.tagName, class: child.getAttribute("class") })),
        width: Math.round(node.getBoundingClientRect().width),
        height: Math.round(node.getBoundingClientRect().height),
        image: new URL(node.querySelector("img").src).searchParams.get("url"),
      }));
      await section.screenshot({ path: join(output, `${name}-${width}-property-section.png`), style: "header { visibility: hidden }" });
      await section.getByRole("button", { name: "Check my property", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Could your property support one of these homes?" });
      await dialog.waitFor();
      const form = await dialog.locator("form").evaluate((node) => [...node.querySelectorAll("input,select,button")].map((field) => ({ tag: field.tagName, name: field.getAttribute("name"), type: field.getAttribute("type"), required: field.required || false, options: field.tagName === "SELECT" ? [...field.options].map((option) => option.textContent) : undefined })));
      await dialog.screenshot({ path: join(output, `${name}-${width}-property-form.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

      if (name === "preview") {
        let submitted;
        let attempts = 0;
        await page.route("**/api/inquiries", async (route) => {
          submitted = route.request().postDataJSON();
          attempts++;
          await route.fulfill({ status: attempts === 1 ? 502 : 200, contentType: "application/json", body: JSON.stringify(attempts === 1 ? { error: "QA simulated delivery failure" } : { accepted: true, propertySnapshot: { status: "green", statusLabel: "Potential identified", headline: "Your property looks promising.", address: submitted.location, municipality: "Vancouver", propertyType: "Requires site-specific review", opportunity: "Laneway / carriage home", message: "QA fixture — site-specific review remains required.", modelMatchStatus: "REVIEW_PENDING" } }) });
        });
        await dialog.getByLabel("Property address", { exact: true }).fill("123 QA Street, Vancouver, BC");
        await dialog.locator('select[name="considering"]').selectOption({ label: "Carriage home" });
        await dialog.locator('select[name="ownership"]').selectOption({ label: "Yes — I own it" });
        for (const [label, value] of [["First name", "Property"], ["Last name", "QA"], ["Email", "qa@example.com"], ["Phone", "6045550100"]]) await dialog.getByLabel(label, { exact: true }).fill(value);
        await dialog.getByRole("button", { name: "Check my property", exact: true }).click();
        await dialog.getByRole("alert").waitFor();
        assert.equal(await dialog.getByLabel("Property address", { exact: true }).inputValue(), "123 QA Street, Vancouver, BC");
        await dialog.getByRole("button", { name: "Check my property", exact: true }).click();
        const snapshot = page.getByRole("dialog", { name: "Your property looks promising." });
        await snapshot.waitFor();
        assert.equal(submitted.source, "laneway_carriage_property_review");
        assert.equal(submitted.considering, "Carriage home");
        assert.equal(submitted.ownership, "Yes — I own it");
        assert.match(await snapshot.innerText(), /not a zoning determination/);
        await snapshot.getByRole("link", { name: "Book my property review", exact: true }).click();
        await page.waitForURL("**/#reserve");
        assert.equal(await page.getByRole("dialog").count(), 0);
      }
      captures[name] = { inventory, feature, form, errors };
      assert.deepEqual(errors, [], `${name}/${width}: page errors`);
      await context.close();
    }
    assert.deepEqual(captures.preview.feature, captures.production.feature, `${width}: original section content, appearance, image and dimensions`);
    assert.deepEqual(captures.preview.form, captures.production.form, `${width}: original property form fields and behavior`);
    const a = captures.production.inventory;
    const b = captures.preview.inventory;
    results.push({ width, propertySectionIdentical: true, productionOnlyHeadings: difference(a.headings, b.headings), previewOnlyHeadings: difference(b.headings, a.headings), productionOnlyImages: difference(a.images.map((x) => x.source), b.images.map((x) => x.source)), previewOnlyImages: difference(b.images.map((x) => x.source), a.images.map((x) => x.source)), productionOnlyButtons: difference(a.buttons, b.buttons), productionOnlyLinks: a.links.filter((x) => !b.links.some((y) => x.text === y.text && x.href === y.href)), previewOnlyLinks: b.links.filter((x) => !a.links.some((y) => x.text === y.text && x.href === y.href)), productionVideoSources: a.videos, previewVideoSources: b.videos, captures });
    console.log(`${width}: production section and form match; local retry, snapshot and CTA flow pass`);
  }
} finally {
  await browser.close();
}
await writeFile(join(output, "comparison.json"), JSON.stringify(results, null, 2));
console.log(`Full homepage inventories and property screenshots: ${output}`);
