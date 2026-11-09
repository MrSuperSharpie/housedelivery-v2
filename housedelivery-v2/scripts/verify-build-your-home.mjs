import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.BUILD_HOME_QA_URL || "http://localhost:3117";
const output = process.env.BUILD_HOME_QA_OUTPUT || "/private/tmp/housedelivery-build-home-qa";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
await mkdir(output, { recursive: true });
const results = [];

try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    const pageErrors = [];
    const trackingRequests = [];
    let submissions = 0;
    let failDelivery = false;
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      if (/google-analytics|googletagmanager|clarity.ms|snap.licdn/.test(request.url())) trackingRequests.push(request.url());
    });
    await page.addInitScript(() => {
      window.__leadEvents = [];
      window.addEventListener("house-delivery:analytics", (event) => window.__leadEvents.push(event.detail));
    });
    // Mock the delivery boundary so repeated UI tests never email the team.
    // Real provider acceptance is checked separately on the deployed Preview.
    await page.route("**/api/build-your-home-inquiries", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: { token: "ui-test-token" } });
      }
      submissions++;
      const body = route.request().postDataJSON();
      assert.equal(body.fullName, "Preview QA Example");
      assert.equal(body.email, "preview-qa@example.com");
      assert.equal(body.municipality, "Victoria");
      assert.equal(body.projectType, "Custom home");
      assert.equal(body.ownership, "Yes, I own the property");
      assert.equal(body.timeline, "6–12 months");
      return route.fulfill({ status: failDelivery ? 502 : 200, json: failDelivery ? { error: "Delivery unavailable. Please try again." } : { accepted: true, inquiryId: "00000000-0000-4000-8000-000000000001" } });
    });
    const response = await page.goto(`${baseUrl}/build-your-home`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator("h1").count(), 1);
    assert.match(await page.locator("h1").innerText(), /Exceptional Quality\.\s+Intelligent Value\.\s+Built to Last\./);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://www.housedelivery.ca/build-your-home");
    assert.equal(await page.getByRole("form", { name: "Project inquiry" }).getAttribute("data-clarity-mask"), "true");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, `${viewport.width}px overflow`);
    for (const control of await page.locator("main a:visible, main button:visible, main input:visible, main select:visible, main textarea:visible").all()) {
      const bounds = await control.boundingBox();
      assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= viewport.width + 1, `control clipped at ${viewport.width}px: ${await control.innerText().catch(() => "field")}`);
    }
    await page.screenshot({ path: `${output}/hero-${viewport.width}.png` });
    for (const image of await page.locator("main img").all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((element) => element.decode());
      assert.ok(await image.evaluate((element) => element.naturalWidth > 0));
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `${output}/full-${viewport.width}.png`, fullPage: true });
    const hrefs = await page.locator("main a[href]").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    assert.ok(hrefs.includes("#design-studio"));
    for (const href of hrefs.filter((href) => href.startsWith("#"))) assert.equal(await page.locator(href).count(), 1);
    await page.getByRole("link", { name: "Start Your Build" }).first().click();
    // Wait for smooth anchor scrolling to finish before checking header clearance.
    await page.waitForFunction(() => Math.abs(document.querySelector("#project-inquiry").getBoundingClientRect().top - 90) < 3);
    const form = page.getByRole("form", { name: "Project inquiry" });
    await form.getByRole("button", { name: "Request a Conversation" }).click();
    assert.equal(submissions, 0, "native validation must block incomplete submissions");
    await form.getByLabel("Full name", { exact: true }).fill("Preview QA Example");
    await form.getByLabel("Email address", { exact: true }).fill("preview-qa@example.com");
    await form.getByLabel("City or municipality").fill("Victoria");
    await form.getByLabel("Type of project", { exact: true }).selectOption("Custom home");
    await form.getByLabel("Do you currently own the property?").selectOption("Yes, I own the property");
    await form.getByLabel("Anticipated construction timeline").selectOption("6–12 months");
    await form.getByLabel("Project details").fill("PREVIEW QA ONLY — no genuine housing inquiry.");
    const formPositions = await form.locator("input:visible,select,textarea").evaluateAll((fields) => fields.map((field) => ({ left: field.getBoundingClientRect().left, top: field.getBoundingClientRect().top })));
    assert.ok(formPositions.every((position) => Math.abs(position.left - formPositions[0].left) < 1), "form fields remain vertically stacked");
    failDelivery = true;
    await form.getByRole("button", { name: "Request a Conversation" }).click();
    await form.getByRole("alert").waitFor();
    assert.equal(await form.getByLabel("Full name", { exact: true }).inputValue(), "Preview QA Example");
    assert.deepEqual(await page.evaluate(() => window.__leadEvents), []);
    failDelivery = false;
    await form.getByRole("button", { name: "Request a Conversation" }).click();
    await page.getByRole("heading", { name: "Every great home starts with a conversation." }).waitFor();
    const events = await page.evaluate(() => window.__leadEvents);
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "generate_lead");
    assert.equal(events[0].form_name, "build_your_home");
    assert.ok(!JSON.stringify(events).includes("example.com"));
    assert.equal(trackingRequests.length, 0, "Preview must not load tracking providers");
    assert.deepEqual(pageErrors, []);
    assert.equal(await page.getByRole("status").evaluate((element) => element === document.activeElement), true);
    const faq = page.locator("details").first();
    await faq.locator("summary").click();
    assert.equal(await faq.getAttribute("open"), "");
    results.push({ viewport: viewport.width, assertions: "pass", pageErrors: 0, trackingRequests: 0 });
    await context.close();
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const staticPage = await noJs.newPage();
  await staticPage.goto(`${baseUrl}/build-your-home`, { waitUntil: "networkidle" });
  assert.equal(await staticPage.locator("h1").isVisible(), true);
  assert.ok(await staticPage.locator("noscript").innerText().then((text) => text.includes("hello@housedelivery.ca")));
  await noJs.close();
  await writeFile(`${output}/results.json`, JSON.stringify({ results, noJs: "pass", delivery: "UI mocked; API provider boundary covered by unit tests; live Preview acceptance checked separately" }, null, 2));
  console.table(results);
  console.log("No-JavaScript content and email fallback: pass");
} finally {
  await browser.close();
}
