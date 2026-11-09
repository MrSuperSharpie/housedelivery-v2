import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.PROPERTY_QA_BASE_URL || "http://localhost:3105";
const chromePath =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

async function run() {
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });
  const results = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/inquiries", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            accepted: true,
            propertySnapshot: {
              status: "yellow",
              statusLabel: "REVIEW IN PROGRESS",
              headline: "We’re taking a closer look.",
              address: "4949 Canada Way, Burnaby, BC",
              municipality: "City of Burnaby",
              jurisdiction: "City of Burnaby",
              sourceAttribution:
                "Jurisdiction resolved from official government data",
              propertyType: "Property type requires municipal review",
              opportunity: "Human review required before a recommendation",
              message:
                "We found your property, but there are details that need to be reviewed before we make a recommendation. Nothing is required from you right now. Our team will review the property and determine the next step.",
              modelMatchStatus: "REVIEW_PENDING",
            },
          }),
        });
      });

      await page.goto(baseUrl, { waitUntil: "networkidle" });
      await page
        .getByRole("button", { name: /check my property/i })
        .first()
        .click();
      const dialog = page.getByRole("dialog");
      await assert.doesNotReject(() => dialog.waitFor({ state: "visible" }));
      await dialog.getByLabel("Property address").fill("4949 Canada Way, Burnaby, BC");
      await dialog
        .getByLabel("What are you considering?")
        .selectOption({ label: "Laneway / backyard home" });
      await dialog
        .getByLabel("Do you own this property?")
        .selectOption({ label: "Yes — I own it" });
      await dialog.getByLabel("First name").fill("Preview");
      await dialog.getByLabel("Last name").fill("Tester");
      await dialog.getByLabel("Email").fill("preview@example.test");
      await dialog.getByLabel("Phone").fill("604-555-0100");
      await dialog
        .getByRole("button", { name: /^check my property$/i })
        .click();

      await dialog
        .getByRole("heading", { name: "We’re taking a closer look." })
        .waitFor();
      const dialogText = await dialog.innerText();
      assert.match(dialogText, /City of Burnaby/);
      assert.match(
        dialogText,
        /Jurisdiction resolved from official government data/,
      );
      assert.match(dialogText, /Nothing is required from you right now\./);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      assert.equal(overflow, false);
      assert.deepEqual(errors, []);
      results.push({ viewport: viewport.name, status: "pass" });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.table(results);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
