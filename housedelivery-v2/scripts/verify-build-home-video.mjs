import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.BUILD_HOME_VIDEO_QA_URL || "http://localhost:3143/build-your-home";
const output = process.env.BUILD_HOME_VIDEO_QA_OUTPUT || "/private/tmp/house-build-home-video-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    const errors = [];
    const vimeoRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (request.url().includes("vimeo.com")) vimeoRequests.push(request.url());
    });
    assert.equal((await page.goto(baseUrl, { waitUntil: "load" })).status(), 200);
    await page.waitForFunction(() => {
      const video = document.querySelector("#build-home-content > section:first-child video");
      return video && !video.paused && video.currentTime > 0.25 && getComputedStyle(video).opacity === "1";
    });
    const video = page.locator("#build-home-content > section:first-child video");
    assert.equal(await video.evaluate((element) => element.muted && element.loop && element.playsInline), true);
    const firstTime = await video.evaluate((element) => element.currentTime);
    await page.waitForFunction((time) => document.querySelector("#build-home-content > section:first-child video").currentTime > time + 0.25, firstTime);
    assert.equal(await page.getByRole("button", { name: /(?:Pause|Play) background video/ }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(vimeoRequests, []);
    assert.deepEqual(errors, []);
    assert.equal(await page.getByRole("link", { name: "Start Your Build" }).first().getAttribute("href"), "#project-inquiry");
    await page.screenshot({ path: `${output}/hero-${width}.png` });
    console.log(`PASS ${width}px: homepage video advances, muted inline autoplay, landing CTA retained, no third-party player or page errors`);
    await page.close();
  }

  const reduced = await browser.newPage({ reducedMotion: "reduce" });
  await reduced.goto(baseUrl, { waitUntil: "load" });
  await reduced.waitForFunction(() => document.querySelector("#build-home-content > section:first-child video")?.paused);
  assert.equal(await reduced.locator("#build-home-content > section:first-child video").isVisible(), false);
  assert.equal(await reduced.getByRole("button", { name: "Play background video" }).isVisible(), false);
  assert.equal(await reduced.locator("#build-home-content > section:first-child img").first().isVisible(), true);
  console.log("PASS reduced motion: video paused and hidden, fallback image visible");
  await reduced.close();

  const blocked = await browser.newPage();
  await blocked.route("**/videos/house-delivery-hero.mp4", (route) => route.fulfill({ status: 404, body: "Not found" }));
  await blocked.goto(baseUrl, { waitUntil: "load" });
  await blocked.waitForFunction(() => document.querySelector("#build-home-content > section:first-child video source")?.parentElement.networkState === 3);
  await blocked.getByRole("button", { name: "Play background video" }).waitFor({ state: "hidden" });
  assert.equal(await blocked.locator("#build-home-content > section:first-child video").evaluate((video) => getComputedStyle(video).opacity), "0");
  assert.equal(await blocked.locator("#build-home-content > section:first-child img").first().isVisible(), true);
  assert.equal(await blocked.getByRole("button", { name: "Play background video" }).count(), 0);
  console.log("PASS video unavailable: still-image fallback remains visible without a broken play control");
  await blocked.close();

} finally {
  await browser.close();
}
