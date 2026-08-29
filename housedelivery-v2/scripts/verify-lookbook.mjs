import assert from "node:assert/strict";

import { chromium } from "playwright-core";

const baseUrl = process.env.LOOKBOOK_QA_BASE_URL || "http://localhost:3000";
const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const homes = ["langley", "solace", "dalton", "maplewood"];
const expectedConfigurationId = "9342f2c1-8db8-4f09-a42a-f791d81b9407";

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const browserErrors = [];
  const submittedPayloads = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await page.route("**/api/lookbooks", async (route) => {
    const payload = route.request().postDataJSON();
    submittedPayloads.push(payload);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accepted: true,
        saved: true,
        configurationId: expectedConfigurationId,
        leadState:
          payload.intent === "property_check" || payload.followUpRequested
            ? "qualified_inquiry"
            : "known_engaged",
        followUpRequested:
          payload.intent === "property_check" ||
          payload.followUpRequested === true,
        ...(payload.intent === "email" ? { emailSent: true } : {}),
      }),
    });
  });

  for (const home of homes) {
    await page.goto(
      `${baseUrl}/homes/${home}?utm_source=linkedin&utm_medium=direct-outreach&utm_campaign=developers-august`,
      { waitUntil: "networkidle" },
    );
    assert.equal(
      await page.locator("[data-nextjs-dialog]").count(),
      0,
      `${home}: Next.js error overlay`,
    );
    assert.ok(
      (await page.locator("body").innerText()).length > 1_000,
      `${home}: page has meaningful content`,
    );
    assert.equal(
      await page.locator("[data-home-configuration]").count(),
      1,
      `${home}: shared configurator renders`,
    );
    const chapters = await page
      .locator(
        '[data-home-category][data-category-state]:not([data-category-kind="coordinated"])',
      )
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-home-category")),
      );
    assert.equal(chapters.length, 7, `${home}: seven canonical chapters`);
    assert.equal(
      chapters.at(-1),
      "exterior-arrival-openings",
      `${home}: Exterior Arrival & Openings remains last`,
    );
    const brokenImages = await page.locator("img").evaluateAll((images) =>
      images.filter((image) => image.complete && image.naturalWidth === 0)
        .length,
    );
    assert.equal(brokenImages, 0, `${home}: no broken imagery`);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
      `${home}: no desktop horizontal overflow`,
    );
  }

  await page.goto(
    `${baseUrl}/homes/langley?utm_source=linkedin&utm_medium=direct-outreach&utm_campaign=developers-august`,
    { waitUntil: "networkidle" },
  );
  for (let step = 0; step < 12; step += 1) {
    if (await page.locator("[data-lookbook-lead-capture]").count()) break;
    const confirm = page.locator(
      '[data-category-state="active"] [data-confirm-category]',
    );
    await confirm.first().click();
    await page.waitForTimeout(80);
  }
  const completion = page.locator("[data-lookbook-lead-capture]");
  await completion.waitFor({ state: "visible" });
  assert.match(
    await completion.innerText(),
    /Your Langley Look Book is ready/i,
  );
  assert.equal(
    await page.locator('[data-save-look-book="top"]').count(),
    0,
    "disconnected standalone save/print strip is removed",
  );
  assert.equal(
    await page.locator("[data-lookbook-content-transition]").count(),
    1,
    "complete Look Book transition is visible",
  );
  assert.equal(
    await page.evaluate(() => {
      const completionElement = document.querySelector(
        "[data-lookbook-lead-capture]",
      );
      const transitionElement = document.querySelector(
        "[data-lookbook-content-transition]",
      );
      const coverElement = document.querySelector("[data-look-book-cover]");
      const finaleElement = document.querySelector(
        "[data-look-book-next-stage]",
      );
      const closingElement = document.querySelector(
        "[data-lookbook-closing-actions]",
      );
      if (
        !completionElement ||
        !transitionElement ||
        !coverElement ||
        !finaleElement ||
        !closingElement
      ) {
        return false;
      }
      const follows = (first, second) =>
        Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
      return (
        follows(completionElement, transitionElement) &&
        follows(transitionElement, coverElement) &&
        follows(coverElement, finaleElement) &&
        follows(finaleElement, closingElement)
      );
    }),
    true,
    "completion, transition, full Look Book, and compact close are sequenced",
  );
  const closingActions = page.locator("[data-lookbook-closing-actions]");
  assert.equal(
    await closingActions.getByRole("button").count(),
    3,
    "compact close repeats download, email, and property actions",
  );

  const attribution = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("house-delivery:first-touch-attribution:v1"),
    ),
  );
  assert.equal(attribution.utmSource, "linkedin");
  assert.equal(attribution.utmMedium, "direct-outreach");
  assert.equal(attribution.utmCampaign, "developers-august");

  await page.evaluate(() => {
    window.print = () => {
      window.__lookBookPrintRequested = true;
    };
  });
  await completion.getByRole("button", { name: "Download My Look Book" }).click();
  assert.equal(
    await page.evaluate(() => window.__lookBookPrintRequested === true),
    true,
    "anonymous PDF/print remains ungated",
  );

  await completion.getByRole("button", { name: "Email My Look Book" }).click();
  const emailForm = completion.locator("form").filter({ hasText: "Email & save" });
  assert.equal(await emailForm.locator('input[name="phone"][required]').count(), 0);
  assert.equal(
    await emailForm.locator('input[name="followUpRequested"]').isChecked(),
    false,
  );
  await emailForm.locator('input[name="firstName"]').fill("Sarah");
  await emailForm.locator('input[name="email"]').fill("sarah@example.com");
  await emailForm.getByRole("button", { name: "Email My Look Book" }).click();
  await completion.getByText("Look Book saved", { exact: false }).waitFor();
  assert.equal(submittedPayloads[0].followUpRequested, false);
  assert.equal(submittedPayloads[0].attribution.utmSource, "linkedin");

  await completion.getByRole("button", { name: "Check My Property" }).click();
  const propertyForm = completion
    .locator("form")
    .filter({ hasText: "Property feasibility" });
  assert.equal(
    await propertyForm.locator('input[name="firstName"]').count(),
    0,
    "known contact is not requested twice",
  );
  await propertyForm.locator('input[name="municipality"]').fill("Vancouver");
  await propertyForm.locator('input[name="postalCode"]').fill("V6B 1A1");
  await propertyForm
    .locator('select[name="propertyStatus"]')
    .selectOption("owned_or_controlled");
  await propertyForm
    .locator('select[name="projectType"]')
    .selectOption("one_home");
  await propertyForm
    .locator('select[name="timing"]')
    .selectOption("within_6_months");
  await propertyForm
    .getByRole("button", { name: "Submit Property Check" })
    .click();
  await completion.getByText("Request received", { exact: false }).waitFor();
  assert.equal(submittedPayloads[1].configurationId, expectedConfigurationId);
  assert.equal(submittedPayloads[1].intent, "property_check");

  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await completion.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    });
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
      `${viewport.name}: no horizontal overflow`,
    );
    const box = await completion.boundingBox();
    assert.ok(box && box.width <= viewport.width, `${viewport.name}: completion fits`);
    await page.screenshot({
      path: `/private/tmp/lookbook-${viewport.name}.png`,
    });
  }

  const invalidPage = await browser.newPage();
  const invalidResponse = await invalidPage.goto(
    `${baseUrl}/lookbook/not-a-valid-id`,
    { waitUntil: "networkidle" },
  );
  assert.equal(invalidResponse?.status(), 404, "invalid saved ID fails safely");
  await invalidPage.close();

  assert.deepEqual(browserErrors, [], "no browser console or page errors");
  process.stdout.write(
    `Look Book browser QA passed for ${homes.join(", ")} across mobile, tablet, and desktop.\n`,
  );
} finally {
  await browser.close();
}
