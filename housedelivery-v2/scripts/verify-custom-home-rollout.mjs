import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = (process.env.HD_QA_BASE_URL ?? "http://127.0.0.1:3210").replace(/\/$/, "");
const origin = new URL(base).origin;
const token = origin.endsWith(".vercel.app") ? process.env.VERCEL_OIDC_TOKEN : undefined;
const output = process.env.HD_QA_OUTPUT_DIR ?? "/private/tmp/hd-custom-home-rollout-browser-qa";
const { models } = await import("../src/data/models.ts");
const { customHomePresentations } = await import("../src/data/custom-home-presentation.ts");
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
await mkdir(output, { recursive: true });
const result = { routes: [], inquiries: [], realSubmissions: 0 };

async function context(options = {}) {
  const c = await browser.newContext(options);
  await c.route("**/*", route => {
    const request = route.request();
    const url = new URL(request.url());
    // Never send a real inquiry, email, save or other mutation, including when
    // this verification script is pointed at a hosted deployment.
    if (url.origin === origin && url.pathname.startsWith("/api/") && !["GET", "HEAD"].includes(request.method())) return route.abort();
    return token && url.origin === origin ? route.continue({ headers: { ...request.headers(), "x-vercel-trusted-oidc-idp-token": token } }) : route.continue();
  });
  return c;
}
async function noOverflow(page, label) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, label); }
async function settle(page, element) { await element.scrollIntoViewIfNeeded(); await page.waitForTimeout(200); }

try {
  if (!process.env.HD_QA_INQUIRY_ONLY) for (const width of [1440, 390]) {
    const c = await context({ viewport: { width, height: width === 1440 ? 900 : 844 }, reducedMotion: "reduce" });
    const page = await c.newPage();
    for (const model of models) {
      const errors = [];
      const onError = error => errors.push(error.message);
      const onConsole = message => { if (message.type() === "error") errors.push(message.text()); };
      page.on("pageerror", onError); page.on("console", onConsole);
      const response = await page.goto(`${base}/homes/${model.slug}`, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      const hero = page.locator("#top");
      assert.equal(await page.locator("h1").count(), 1, `${model.slug}: one H1`);
      assert.equal((await page.locator("h1").innerText()).trim(), model.name);
      assert.ok((await hero.innerText()).includes(customHomePresentations[model.slug].hero.valueLine));
      assert.equal(await hero.locator("img").getAttribute("loading"), "eager");
      assert.equal(await hero.locator("img").getAttribute("fetchpriority"), "high");
      await hero.locator("img").evaluate(image => image.decode());
      const primary = hero.locator("[data-home-primary-action]");
      const href = await primary.getAttribute("href");
      assert.equal(await page.locator(href).count(), 1);
      if (width === 390) {
        const action = await primary.boundingBox(), image = await hero.locator("[data-home-exterior-image]").boundingBox();
        assert.ok(action.y + action.height <= image.y, `${model.slug}: mobile action precedes image`);
      }
      for (const link of await page.locator("[data-home-detail-navigation]").getByRole("link").all()) {
        const anchor = await link.getAttribute("href");
        if (anchor?.startsWith("#")) assert.equal(await page.locator(anchor).count(), 1, `${model.slug}: ${anchor} exists once`);
      }
      await primary.click();
      const galleryCount = model.images.filter(src => src !== model.floorPlanImage).length;
      assert.equal(await page.locator("[data-home-gallery-image]").count(), galleryCount);
      assert.equal(await page.locator("#film").count(), model.video ? 1 : 0);
      await page.locator("[data-home-detail-navigation]").getByRole("link", { name: "Floor Plans", exact: true }).click();
      const plans = page.locator("#plans");
      await plans.locator("img").evaluate(image => image.decode());
      assert.ok(await plans.locator("img").evaluate(image => image.naturalWidth > 0));
      const reserve = page.locator("[data-home-project-inquiry]");
      assert.equal(await reserve.locator("[data-model-inquiry-primary]").getAttribute("href"), `/?model=${model.slug}#reserve`);
      assert.equal(await reserve.locator("[data-multi-home-planning]").getAttribute("href"), "/plan-a-housing-project");
      const prices = await page.locator("[data-home-pricing]").innerText();
      assert.ok(prices.includes((250 * model.squareFeet).toLocaleString("en-CA")));
      assert.ok(prices.includes((300 * model.squareFeet).toLocaleString("en-CA")));
      assert.match(prices, /not the completed cost of a finished home/);
      assert.match(prices, /Applicable sales taxes are extra/);
      await noOverflow(page, `${model.slug}: ${width}px`);
      assert.deepEqual(errors, [], `${model.slug}: no browser/hydration errors`);
      result.routes.push({ slug: model.slug, width, galleryCount, heroAction: href, passed: true });
      page.off("pageerror", onError); page.off("console", onConsole);
      console.log(`${model.slug} ${width}: passed`);
    }
    await c.close();
  }

  // Validate the actual receiving form and editable model choice, then mock
  // every response branch without storing contact fields in review evidence.
  for (const outcome of ["accepted", "not-accepted", "network-failure", "duplicate"]) {
    const c = await context({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const page = await c.newPage();
    const calls = [];
    let release;
    const deferred = new Promise(resolve => { release = resolve; });
    await page.route("**/api/inquiries", async route => {
      const payload = route.request().postDataJSON(); calls.push(payload);
      assert.equal(payload.model, "saturna");
      assert.equal(payload.company, "");
      assert.deepEqual(Object.keys(payload).sort(), ["firstName", "lastName", "email", "phone", "model", "location", "timeline", "notes", "company"].sort());
      if (outcome === "duplicate") await deferred;
      if (outcome === "network-failure") return route.abort("failed");
      return route.fulfill({ status: 200, json: { accepted: outcome !== "not-accepted" } });
    });
    await page.goto(`${base}/homes/mayne`, { waitUntil: "networkidle" });
    const action = page.locator("[data-model-inquiry-primary]"); await settle(page, action); await action.click();
    await page.waitForURL("**/?model=mayne#reserve");
    const form = page.locator("#reserve form");
    await page.waitForFunction(() => document.querySelector('#reserve select[name="model"]')?.value === "mayne");
    assert.equal(await form.locator('[name="model"]').inputValue(), "mayne");
    await form.locator('[name="model"]').selectOption("saturna");
    if (outcome === "accepted") await page.screenshot({ path: `${output}/inquiry-preselection-editable.png` });
    await form.locator('[name="firstName"]').fill("QA");
    await form.locator('[name="lastName"]').fill("Verification");
    await form.locator('[name="email"]').fill("qa@example.test");
    if (outcome === "duplicate") {
      await form.evaluate(element => { element.requestSubmit(); element.requestSubmit(); });
      await page.waitForTimeout(300); assert.equal(calls.length, 1);
      assert.equal(await form.getByRole("button", { name: "Sending inquiry…", exact: true }).isDisabled(), true);
      release();
    } else await form.getByRole("button", { name: "Request a project review", exact: true }).click();
    if (["accepted", "duplicate"].includes(outcome)) await page.getByText("Inquiry received", { exact: true }).waitFor();
    else { await form.getByRole("alert").waitFor(); assert.equal(await form.locator('[name="model"]').inputValue(), "saturna"); assert.equal(await page.getByText("Inquiry received", { exact: true }).count(), 0); }
    assert.equal(calls.length, 1);
    await noOverflow(page, `inquiry ${outcome}`);
    result.inquiries.push({ outcome, validPreselection: true, editable: true, payloadContract: true, requestCount: calls.length, passed: true });
    await c.close();
  }
  const c = await context({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await c.newPage();
  for (const query of ["", "?model=invalid", "?model=__proto__"]) {
    await page.goto(`${base}/${query}#reserve`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(document.querySelector('#reserve select[name="model"]')));
    assert.equal(await page.locator('#reserve select[name="model"]').inputValue(), "");
  }
  await c.close();
  result.invalidAndMissingModelSafe = true;
  await writeFile(`${output}/verification.json`, JSON.stringify(result, null, 2));
  console.log("Custom-home rollout browser checks passed. All inquiry submissions were intercepted.");
} finally { await browser.close(); }
