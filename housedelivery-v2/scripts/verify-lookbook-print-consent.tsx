import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium, type BrowserContext } from "playwright-core";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeLookBook } from "../src/components/home-look-book";
import { homeConfiguratorRegistrations } from "../src/data/home-configurators";
import { completeEmailFixture } from "../src/lib/lookbook/email.fixture";

// Read-only QA: emulate the public hostname entirely through a Preview proxy.
// This exercises the real consent component without adding Production analytics
// or enabling Production-only UI in application code. Every POST is blocked.
const base = process.env.LOOKBOOK_QA_URL;
assert.ok(base && /^https:\/\/housedelivery-v2-[a-z0-9]+-edavis-animalmarkets-projects\.vercel\.app$/.test(base));
const publicOrigin = "https://www.housedelivery.ca";
const out = process.env.LOOKBOOK_QA_OUTPUT ?? "/private/tmp/hd-lookbook-print-consent-20261117";
const savedPath = new URL(JSON.parse(readFileSync(process.env.LOOKBOOK_QA_SAVED_RECORD ?? "/private/tmp/hd-lookbook-pdf-fix-20261116/fresh-delivery.json", "utf8")).savedUrl).pathname;
assert.match(savedPath, /^\/lookbook\/[a-f0-9-]{36}$/);
const access = readFileSync(process.env.LOOKBOOK_QA_ACCESS_FILE ?? "/private/tmp/hd-conversation-review-20261114/preview-access", "utf8").trim();
mkdirSync(out, { recursive: true, mode: 0o700 });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const consentKey = "house-delivery:analytics-consent:v1";
const noop = () => {};
async function proxy(context: BrowserContext) {
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() !== "GET") return route.abort();
    if (url.origin === publicOrigin && url.pathname === "/__lookbook-print-qa") return route.fulfill({ contentType: "text/html", body: "<!doctype html><html><head></head><body></body></html>" });
    if (url.origin !== publicOrigin && url.origin !== base) return route.abort();
    const target = new URL(url.pathname + url.search, base);
    const headers = { ...request.headers(), "x-vercel-protection-bypass": access };
    delete (headers as Record<string, string>).host;
    const response = await route.fetch({ url: target.href, headers, maxRedirects: 0 });
    const location = response.headers().location;
    if (location) {
      const next = new URL(location, target);
      assert.equal(next.origin, base);
      return route.fulfill({ response, headers: { ...response.headers(), location: new URL(next.pathname + next.search, publicOrigin).href } });
    }
    return route.fulfill({ response });
  });
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  await proxy(context);
  const page = await context.newPage();
  await page.goto(publicOrigin + savedPath, { waitUntil: "domcontentloaded" });
  const banner = page.locator("[data-analytics-consent-ui]");
  await banner.waitFor();
  const bannerHtml = await banner.evaluate(element => element.outerHTML);
  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(elements => elements.map(element => (element as HTMLLinkElement).href));
  const htmlClass = await page.locator("html").getAttribute("class");
  await page.screenshot({ path: out + "/after-screen.png" });
  assert.equal(await page.evaluate(key => localStorage.getItem(key), consentKey), null);
  await page.emulateMedia({ media: "print" });
  assert.equal(await banner.isVisible(), false);
  assert.equal(await banner.locator("*").evaluateAll(elements => elements.every(element => element.getClientRects().length === 0)), true);
  await page.locator("[data-look-book-print-page] img").evaluateAll(images => Promise.all(images.map(async element => { const image = element as HTMLImageElement; image.loading = "eager"; await image.decode(); })));
  await page.pdf({ path: out + "/after-browser-aurora-premium.pdf", format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  await page.emulateMedia({ media: "screen" });
  assert.equal(await banner.isVisible(), true, "printing must not dismiss consent on screen");
  assert.equal(await page.evaluate(key => localStorage.getItem(key), consentKey), null, "printing must not record consent");
  await banner.getByRole("button", { name: "Essential only", exact: true }).click();
  await banner.waitFor({ state: "hidden" });
  assert.equal(await page.evaluate(key => localStorage.getItem(key), consentKey), "declined");
  await page.evaluate(key => localStorage.removeItem(key), consentKey);
  await page.reload({ waitUntil: "domcontentloaded" });
  await banner.getByRole("button", { name: "Allow analytics", exact: true }).click();
  await banner.waitFor({ state: "hidden" });
  assert.equal(await page.evaluate(key => localStorage.getItem(key), consentKey), "accepted");
  await page.locator("#house-delivery-ga").waitFor({ state: "attached" });

  const definitions = homeConfiguratorRegistrations.filter(registration => registration.productFamily === "custom-home" && registration.definition);
  assert.equal(definitions.length, 18);
  const fixture = await context.newPage();
  await fixture.goto(publicOrigin + "/__lookbook-print-qa");
  const blockImages = (route: Parameters<Parameters<typeof fixture.route>[1]>[0]) => route.request().resourceType() === "image" ? route.abort() : route.fallback();
  await fixture.route("**/*", blockImages);
  await fixture.setContent(`<!doctype html><html class="${htmlClass ?? ""}"><head>${styles.map(href => `<link rel="stylesheet" href="${href}">`).join("")}</head><body><main></main>${bannerHtml}</body></html>`);
  const matrix: { home: string; tier: string; pages: number }[] = [];
  let signatureMarkup = "";
  for (const registration of definitions) for (const tier of ["premium", "signature"] as const) {
    const record = completeEmailFixture(registration.homeId, tier);
    const markup = renderToStaticMarkup(<HomeLookBook definition={registration.definition!} configuration={record.configuration} onCreateLookBook={noop} onEditCategory={noop} onPreviewOption={noop} onSubmit={noop} readOnly directSourceImages savedView savedHasContact savedConfigurationId={record.id} printMode />);
    await fixture.emulateMedia({ media: "screen" });
    await fixture.locator("main").evaluate((element, html) => { element.innerHTML = html; }, markup);
    assert.equal(await fixture.locator("[data-analytics-consent-ui]").isVisible(), true);
    await fixture.emulateMedia({ media: "print" });
    assert.equal(await fixture.locator("[data-analytics-consent-ui]").isVisible(), false, `${registration.homeId} ${tier}`);
    const pages = fixture.locator("[data-look-book-print-page]");
    assert.ok(await pages.count() >= 6);
    assert.equal(await pages.first().isVisible(), true);
    assert.equal(await pages.last().isVisible(), true);
    matrix.push({ home: registration.homeId, tier, pages: await pages.count() });
    if (registration.homeId === "aurora" && tier === "signature") signatureMarkup = markup;
  }
  await fixture.unroute("**/*", blockImages);
  await fixture.locator("main").evaluate((element, html) => { element.innerHTML = html; }, signatureMarkup);
  await fixture.locator("[data-look-book-print-page] img").evaluateAll(images => Promise.all(images.map(async element => { const image = element as HTMLImageElement; image.loading = "eager"; await image.decode(); })));
  await fixture.pdf({ path: out + "/after-browser-aurora-signature.pdf", format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });

  let target = base + savedPath + "/pdf?disposition=attachment", response: Response | undefined;
  for (let step = 0; step < 3; step++) {
    response = await fetch(target, { headers: { "x-vercel-protection-bypass": access }, redirect: "manual", signal: AbortSignal.timeout(180_000) });
    if (response.status !== 307) break;
    const next = new URL(response.headers.get("location")!, target);
    assert.equal(next.origin, base); assert.equal(next.pathname, new URL(target).pathname); assert.ok(next.searchParams.has("pdfRevision")); target = next.href;
  }
  assert.equal(response!.status, 200);
  const bytes = Buffer.from(await response!.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.match(response!.headers.get("cache-control")!, /private.*no-store/);
  writeFileSync(out + "/after-server-aurora.pdf", bytes, { mode: 0o600 });
  writeFileSync(out + "/results.json", JSON.stringify({ passed: true, productionHostnameEmulatedWithoutProductionRequests: true, screenRestoredAfterPrint: true, consentUnchangedByPrinting: true, declineAndAcceptWork: true, analyticsTagStillMountedAfterAcceptance: true, modelTierMatrix: matrix, serverPdf: { status: response!.status, bytes: bytes.length }, liveEmails: 0, submissions: 0 }, null, 2));
  console.log("PASS: screen consent preserved; print UI excluded across 18 models × two tiers; Aurora browser and server PDFs exported.");
} catch (error) {
  console.error(String(error).replaceAll(access, "[REDACTED]"));
  process.exitCode = 1;
} finally {
  await browser.close();
}
