import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.PRICING_QA_BASE_URL || "http://localhost:3100";
const output = process.env.PRICING_QA_OUTPUT || "/tmp/house-pricing-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

async function noOverflow(label) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${label}: horizontal overflow`);
}

try {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const response = await page.goto(`${baseUrl}/pricing`, { waitUntil: "load" });
    assert.equal(response.status(), 200);
    await noOverflow(`pricing ${width}`);
    const cards = page.locator("[data-pricing-level]");
    assert.equal(await cards.count(), 3);
    const positions = await cards.evaluateAll((elements) => elements.map((element) => ({ x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y })));
    assert.equal(width >= 1024 ? positions[0].y === positions[1].y : positions[0].x === positions[1].x, true);
    assert.equal(await page.getByRole("region", { name: "Three finish levels" }).getByText("The Delivered Home Package includes the agreed home package", { exact: false }).isVisible(), true);
    for (const [index, range] of ["Included in base", "Upgrade quote required", "Upgrade quote required"].entries()) {
      assert.equal(await cards.nth(index).getByText(range, { exact: true }).isVisible(), true);
      assert.equal(await cards.nth(index).getByText("Request package pricing", { exact: true }).isVisible(), true);
      assert.equal(await cards.nth(index).getByText("Local builder quote required", { exact: true }).isVisible(), true);
    }
    assert.doesNotMatch(await page.locator("main").innerText(), /Estimated completed build|Delivered package|\$(?:450–575|500–650|550–750|215–255|240–300|270–350)/);
    const details = cards.first().locator("details");
    await details.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await details.getAttribute("open"), "");
    await page.waitForFunction(() => document.querySelector("[data-pricing-level] summary").getAttribute("aria-expanded") === "true");
    assert.match(await details.ariaSnapshot(), /expanded/);
    assert.equal(await details.getByText("Foundations, assembly, Canadian trades, permits and site completion", { exact: false }).isVisible(), true);
    await page.keyboard.press("Space");
    assert.equal(await details.getAttribute("open"), null);
    if (width === 390 || width === 1440) {
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: "instant" }); });
      await page.screenshot({ path: `${output}/pricing-${width}.png`, fullPage: true });
    }
    if (width < 1280) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      const navigation = page.getByRole("navigation", { name: "Mobile", exact: true });
      await navigation.getByRole("link", { name: "Pricing", exact: true }).waitFor({ state: "visible" });
      await navigation.getByRole("link", { name: "Pricing", exact: true }).click();
      await page.getByRole("button", { name: "Open navigation" }).waitFor({ state: "visible" });
    } else {
      const links = await page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link").allTextContents();
      assert.deepEqual(links.slice(0, 2), ["Homes", "Pricing"]);
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/`, { waitUntil: "load" });
  assert.equal(await page.locator("#custom-homes-grid article").count(), await page.locator('#custom-homes-grid article a[href="/pricing"]').count());
  assert.equal(await page.locator("#pre-approved-homes-grid article").count(), await page.locator('#pre-approved-homes-grid article a[href="/pricing"]').count());
  assert.equal(await page.locator("#carriage-homes-grid article").count(), await page.locator('#carriage-homes-grid article a[href="/pricing"]').count());
  await page.locator('#custom-homes-grid article a[href="/pricing"]').first().click();
  await page.waitForURL("**/pricing");

  for (const home of ["saturna", "solace"]) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${baseUrl}/homes/${home}`, { waitUntil: "load" });
      await noOverflow(`${home} ${width}`);
      const budget = page.getByRole("region", { name: "Plan your budget" });
      assert.doesNotMatch(await budget.innerText(), /\$/);
      const budgetBox = await budget.boundingBox();
      const specifications = await page.locator("#overview dl").last().boundingBox();
      const configuratorBox = await page.locator("#home-configurator").boundingBox();
      assert.ok(budgetBox.y > specifications.y && budgetBox.y < configuratorBox.y);
      await budget.getByRole("link", { name: "Get a site-specific budget" }).click();
      await page.waitForURL(`**/?inquiry=budget&model=${home}#reserve`);
      assert.equal(await page.locator('select[name="model"]').inputValue(), home);
      assert.match(await page.locator('textarea[name="notes"]').inputValue(), /site-specific budget/);
      await noOverflow(`enquiry ${width}`);
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/homes/saturna#home-inclusions`, { waitUntil: "load" });
  const firstSelection = page.locator('[data-home-option][aria-pressed="true"]').first();
  assert.equal(await firstSelection.getAttribute("data-option-level"), "premium");
  assert.equal(await page.locator('[data-option-level="essential"]').count(), 0);
  const signature = page.locator('[data-home-option][data-option-level="signature"]').first();
  await signature.click();
  assert.equal(await signature.getAttribute("aria-pressed"), "true");
  const configurationEnquiry = page.locator('#home-configurator aside a').filter({ hasText: "Get a site-specific budget" });
  assert.match(decodeURIComponent(await configurationEnquiry.getAttribute("href")), /signature/);
  await configurationEnquiry.click();
  await page.waitForURL((url) => url.pathname === "/" && url.hash === "#reserve");
  assert.equal(await page.locator('select[name="model"]').inputValue(), "saturna");
  assert.match(await page.locator('textarea[name="notes"]').inputValue(), /signature/);

  // Capture the form request locally; never send a real enquiry during QA.
  let submission;
  await page.route("**/api/inquiries", async (route) => {
    submission = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accepted: true }) });
  });
  await page.getByLabel("First name", { exact: true }).fill("Pricing QA");
  await page.getByLabel("Last name", { exact: true }).fill("Preview");
  await page.getByLabel("Email address", { exact: true }).fill("pricing-qa@example.com");
  await page.getByRole("button", { name: "Request a project review" }).click();
  await page.getByText("Inquiry received", { exact: true }).waitFor();
  assert.equal(submission.model, "saturna");
  assert.match(submission.notes, /signature/);

  for (const [family, selector] of [["catalog", "#pre-approved-homes-grid"], ["carriage", "#carriage-homes-grid"]]) {
    await page.goto(`${baseUrl}/`, { waitUntil: "load" });
    const homeHref = await page.locator(`${selector} article a`).first().getAttribute("href");
    await page.goto(`${baseUrl}${homeHref}`, { waitUntil: "load" });
    await page.getByRole("region", { name: "Plan your budget" }).getByRole("link", { name: "Get a site-specific budget" }).click();
    await page.waitForURL((url) => url.pathname === "/" && url.hash === "#reserve");
    assert.match(await page.locator('select[name="model"]').inputValue(), new RegExp(`^${family}:`));
  }
  assert.deepEqual(errors, []);
  console.log("PASS: pricing at six widths, keyboard details, navigation, catalogue links, model enquiry prefill, preserved Premium default, Signature selection and mocked enquiry submission.");
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
}
