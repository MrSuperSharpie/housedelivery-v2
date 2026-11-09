import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = process.env.WILLOW_QA_URL || "http://localhost:3146";
const lanewayPath = "/build-your-home/laneway-carriage-homes";
const output = "/private/tmp/willow-film-review/browser";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const results = [];
async function open(options = {}, blockVideo = false, saveData = false) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  if (saveData) await context.addInitScript(() => { const connection = new EventTarget(); connection.saveData = true; Object.defineProperty(navigator, "connection", { value: connection, configurable: true }); });
  const page = await context.newPage(); const errors = []; const requests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => requests.push(request.url()));
  await page.route("**/api/build-your-home-inquiries", route => route.fulfill({ json: { token: "media-only-test" } }));
  if (blockVideo) await page.route("**/media/laneway/*.mp4", route => route.fulfill({ status: 404, body: "Video unavailable" }));
  return { context, page, errors, requests };
}
try {
  for (const width of [1440, 768, 390, 320]) {
    const { context, page, errors, requests } = await open({ viewport: { width, height: 1000 } });
    await page.goto(`${base}${lanewayPath}`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => { const v = document.querySelector("video"); return v && !v.paused && v.currentTime > .1; });
    const state = await page.locator("video").evaluate(v => ({ src: v.currentSrc, width: v.videoWidth, muted: v.muted, loop: v.loop, inline: v.playsInline, duration: v.duration }));
    const mobile = width <= 700;
    assert.ok(state.src.endsWith("willow-nook-laneway-opening-trim.mp4"));
    assert.equal(state.width, 1280);
    assert.ok(Math.abs(state.duration - 9.51) < .05, "entire remaining original footage is present"); assert.equal(state.muted, true); assert.equal(state.loop, true); assert.equal(state.inline, true);
    const poster = await page.locator("picture img").evaluate(img => ({ src: img.currentSrc, width: img.naturalWidth, complete: img.complete }));
    assert.ok(poster.complete && poster.width > 0); assert.ok(poster.src.includes(mobile ? "poster-mobile.webp" : "laneway-poster.webp"));
    if (mobile) assert.equal(requests.some(url => url.endsWith("laneway-poster.webp")), false, "mobile must not download the desktop poster");
    await page.getByRole("button", { name: "Pause background video" }).click();
    const stopped = await page.locator("video").evaluate(v => v.currentTime); await page.waitForTimeout(350);
    assert.equal(await page.locator("video").evaluate(v => v.paused), true); assert.ok(Math.abs(await page.locator("video").evaluate(v => v.currentTime) - stopped) < .05);
    await page.getByRole("button", { name: "Play background video" }).click();
    await page.waitForFunction(time => document.querySelector("video").currentTime > time + .1, stopped);
    await page.locator("video").evaluate(v => { v.currentTime = v.duration - .15; });
    await page.waitForFunction(() => document.querySelector("video").currentTime < 1);
    await page.getByRole("button", { name: "Essential only", exact: true }).click();
    await page.locator("video").evaluate(v => { v.currentTime = 2.7; });
    await page.waitForTimeout(150);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `${output}/laneway-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.match(await page.locator("h1").innerText(), /More possibility/);
    assert.equal(await page.getByRole("form", { name: "Free preliminary property review" }).count(), 1);
    assert.equal(await page.locator("#project-inquiry").count(), 1);
    assert.deepEqual(errors, []); assert.equal(requests.some(url => /googletagmanager|google-analytics|clarity.ms|snap.licdn/.test(url)), false);
    results.push({ width, playback: true, pause: true, loop: true, poster: true }); await context.close();
  }
  for (const mode of ["reduced-motion", "save-data", "failed-video", "no-javascript"]) {
    const { context, page, errors, requests } = await open({ reducedMotion: mode === "reduced-motion" ? "reduce" : "no-preference", javaScriptEnabled: mode !== "no-javascript" }, mode === "failed-video", mode === "save-data");
    await page.goto(`${base}${lanewayPath}`, { waitUntil: "networkidle" });
    if (mode === "failed-video") await page.waitForFunction(() => !document.querySelector("video"));
    assert.equal(await page.locator("video").count(), 0, mode);
    assert.ok(await page.locator("picture img").evaluate(img => img.complete && img.naturalWidth > 0));
    if (mode !== "failed-video") assert.equal(requests.some(url => url.includes("/media/laneway/") && url.endsWith(".mp4")), false);
    assert.deepEqual(errors, []); results.push({ mode, staticFallback: true }); await context.close();
  }
  const { context, page } = await open();
  await page.goto(`${base}/build-your-home/custom-homes`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("video source").getAttribute("src"), "/videos/house-delivery-hero.mp4");
  assert.equal(await page.locator('img[src*="Langley-3.avif"]').count(), 1);
  assert.equal(await page.locator('img[src*="willow-nook"]').count(), 0);
  await context.close(); results.push({ customHomes: "original hero retained" });
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
} finally { await browser.close(); }
