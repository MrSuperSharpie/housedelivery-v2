import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = process.env.PRICING_QA_BASE_URL || "http://localhost:3100";
const output = process.env.PRICING_QA_OUTPUT || "/tmp/house-budget-planner-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage({ reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "No horizontal overflow");

try {
  if (process.env.VERCEL_PREVIEW_ACCESS_URL) await page.goto(process.env.VERCEL_PREVIEW_ACCESS_URL, { waitUntil: "load" });
  for (const [route, model] of [["/homes/solace", "solace"], ["/homes/laneway-carriage/willow-nook", "carriage:willow-nook"], ["/catalog/the-micro", "catalog:the-micro"]]) {
    await page.goto(`${base}${route}`, { waitUntil: "load" });
    await page.getByRole("region", { name: "Plan your budget" }).getByRole("link", { name: "Open home budget planner" }).click();
    const planner = page.locator("#budget-planner");
    assert.equal(await planner.getByLabel("Home 1 design", { exact: true }).inputValue(), model);
    assert.equal(await planner.locator("[data-budget-home]").count(), 1);
    assert.equal(await planner.getByLabel("Home 1 quantity", { exact: true }).inputValue(), "1");
    assert.equal(await planner.locator("select option").count(), 31, "All current models remain selectable");
    assert.equal(await planner.getByLabel("First name", { exact: true }).count(), 0, "Browsing needs no contact details");
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await noOverflow();
      const trigger = planner.getByRole("button", { name: /^Expand .* gallery/ });
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible" });
      const image = dialog.locator("img");
      await image.evaluate((element) => element.complete ? undefined : new Promise((resolve) => { element.onload = resolve; element.onerror = resolve; }));
      assert.ok(await image.evaluate((element) => element.naturalWidth > 0), `${model} gallery image loads`);
      if (await dialog.getByRole("button", { name: "Next image" }).isEnabled()) {
        const before = await image.getAttribute("src");
        await dialog.getByRole("button", { name: "Next image" }).click();
        assert.notEqual(await image.getAttribute("src"), before);
        await page.keyboard.press("ArrowLeft");
        assert.equal(await image.getAttribute("src"), before);
      }
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
      assert.ok(await trigger.evaluate((element) => element === document.activeElement), "Gallery restores focus");
    }
  }

  await page.goto(`${base}/pricing?model=solace&selections=${encodeURIComponent("Kitchen: Premium; bathroom: Signature") }#budget-planner`, { waitUntil: "load" });
  const planner = page.locator("#budget-planner");
  const homes = planner.locator("[data-budget-home]");
  assert.equal(await planner.getByLabel("Home 1 selections", { exact: true }).inputValue(), "Kitchen: Premium; bathroom: Signature");
  assert.ok(await homes.nth(0).getByRole("radio", { name: "Help me decide" }).isChecked());
  await planner.getByLabel("Home 1 quantity", { exact: true }).fill("2");
  await homes.nth(0).getByRole("radio", { name: "Premium upgrade", exact: true }).check();
  await homes.nth(0).getByRole("radio", { name: "Signature upgrade", exact: true }).check();
  assert.equal(await homes.nth(0).locator('input[type="radio"]:checked').count(), 1);
  assert.equal(await homes.nth(0).getByRole("radio", { name: "Premium upgrade", exact: true }).isChecked(), false);
  await planner.getByRole("button", { name: "Add another home" }).click();
  await planner.getByLabel("Home 2 design", { exact: true }).selectOption("carriage:willow-nook");
  await homes.nth(1).getByRole("radio", { name: "Premium upgrade", exact: true }).check();
  await planner.getByRole("button", { name: "Add another home" }).click();
  await planner.getByLabel("Home 3 design", { exact: true }).selectOption("catalog:the-micro");
  assert.ok(await homes.nth(0).getByRole("radio", { name: "Signature upgrade", exact: true }).isChecked());
  assert.ok(await homes.nth(1).getByRole("radio", { name: "Premium upgrade", exact: true }).isChecked());
  assert.ok(await homes.nth(2).getByRole("radio", { name: "Essential — included", exact: true }).isChecked());
  await planner.getByLabel("Delivery location", { exact: true }).fill("QA site, BC");
  await planner.locator("summary").filter({ hasText: "Project details" }).click();
  await planner.getByLabel("Accessibility needs", { exact: true }).check();
  await planner.getByLabel("Off-grid needs", { exact: true }).check();
  await planner.getByLabel("Tell us what you have in mind", { exact: true }).fill("Review step-free entry; no assumed technical performance.");
  const summary = planner.getByRole("region", { name: "Your project summary" });
  assert.match(await summary.innerText(), /Solace × 2/);
  assert.match(await summary.innerText(), /The Willow Nook × 1/);
  assert.match(await summary.innerText(), /The Micro × 1/);
  assert.doesNotMatch(await summary.innerText(), /\$|\b0 CAD/);
  assert.match(await summary.innerText(), /Request package pricing/);
  assert.match(await summary.innerText(), /Local builder quote required/);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow();
    if (width === 390 || width === 1440) {
      await summary.screenshot({ path: `${output}/budget-summary-${width}.png` });
      await homes.first().screenshot({ path: `${output}/budget-home-${width}.png` });
    }
  }
  const download = page.waitForEvent("download");
  await planner.getByRole("button", { name: "Save summary (optional)" }).click();
  assert.equal((await download).suggestedFilename(), "House-Delivery-budget-summary.txt");
  await summary.getByRole("button", { name: "Get a site-specific budget" }).click();
  const form = page.locator("#reserve");
  await form.getByLabel("First name", { exact: true }).fill("Budget Planner");
  await form.getByLabel("Last name", { exact: true }).fill("QA");
  await form.getByLabel("Email address", { exact: true }).fill("qa@example.com");
  assert.equal(await form.getByLabel("Project location", { exact: true }).inputValue(), "QA site, BC");
  await form.getByLabel("Project location", { exact: true }).fill("Revised QA site, BC");
  assert.equal(await planner.getByLabel("Delivery location", { exact: true }).inputValue(), "Revised QA site, BC");
  await page.setViewportSize({ width: 390, height: 1000 });
  await noOverflow();
  let submitted;
  let attempt = 0;
  await page.route("**/api/inquiries", async (route) => {
    submitted = route.request().postDataJSON();
    attempt += 1;
    await route.fulfill({ status: attempt === 1 ? 502 : 200, contentType: "application/json", body: JSON.stringify(attempt === 1 ? { error: "QA simulated provider error" } : { accepted: true }) });
  });
  await form.getByRole("button", { name: "Request a project review" }).click();
  await form.getByRole("alert").waitFor({ state: "visible" });
  assert.equal(await form.getByText("Inquiry received", { exact: true }).count(), 0);
  await form.getByRole("button", { name: "Request a project review" }).click();
  await form.getByText("Inquiry received", { exact: true }).waitFor({ state: "visible" });
  assert.equal(submitted.budgetProject.homes.length, 3);
  assert.deepEqual(submitted.budgetProject.homes.map((line) => [line.modelId, line.quantity, line.finish]), [["solace", 2, "signature"], ["carriage:willow-nook", 1, "premium"], ["catalog:the-micro", 1, "essential"]]);
  assert.equal(submitted.budgetProject.location, "Revised QA site, BC");
  assert.deepEqual(submitted.budgetProject.requests, ["accessibility", "offGrid"]);
  assert.match(submitted.budgetProject.homes[0].selections, /Kitchen: Premium; bathroom: Signature/);
  assert.match(submitted.budgetProject.details, /step-free entry/);
  await homes.nth(0).getByRole("radio", { name: "Premium upgrade", exact: true }).check();
  await form.getByText("Your plan has changed since the last enquiry.", { exact: false }).waitFor({ state: "visible" });
  assert.equal(await form.getByText("Inquiry received", { exact: true }).count(), 0, "Edited projects do not retain a stale success state");
  await planner.getByRole("button", { name: "Remove home 3", exact: true }).click();
  assert.equal(await homes.count(), 2);
  await summary.getByRole("link", { name: "Edit home 2", exact: true }).click();
  assert.equal(new URL(page.url()).hash, "#budget-home-2");
  assert.deepEqual(errors, []);
  console.log("Budget planner browser QA passed: 31 models; three home families; four widths; galleries and focus; quantities; exclusive independent upgrades; unknown prices; saved summary; enquiry retry and full handoff.");
} finally {
  await browser.close();
}
