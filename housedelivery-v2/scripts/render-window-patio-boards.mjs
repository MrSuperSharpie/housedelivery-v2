import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { getHomeConfiguratorRegistrationsByFamily } from "../src/data/home-configurator-registry.ts";
import { windowsPatioDoorDirections } from "../src/data/windows-patio-doors-lookbook.ts";

const root = process.cwd();
const outputRoot = path.join(root, "public/images/lookbook/windows-patio-doors/boards");
const supplierRoot = path.join(root, "public/images/lookbook/windows-patio-doors/supplier");
const chromePath = process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
async function supplierImage(name) {
  return `data:image/webp;base64,${(await readFile(path.join(supplierRoot, `${name}.webp`))).toString("base64")}`;
}
function tile(label, value, image, extra = "") {
  return `<section class="tile"><div class="tile-media">${image ? `<img src="${image}" alt="Supplier catalog detail">` : `<div class="spec-mark">${escapeHtml(extra)}</div>`}</div><div class="tile-label">${escapeHtml(label)}</div>${image ? `<div class="tile-value">${escapeHtml(value)}</div>` : ""}</section>`;
}
function boardHtml(home, direction, images) {
  const header = `${home.residenceLabel.toUpperCase()} | WINDOWS & PATIO DOORS`;
  const tier = `${direction.level.toUpperCase()} ${direction.number} — ${direction.name.toUpperCase()}`;
  const operation = /fold/i.test(direction.door) ? "Folding" : /lift/i.test(direction.door) ? "Lift + slide" : "Sliding";
  const hardwareImage = direction.hardwareAsset !== direction.doorAsset ? images.hardware : null;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{width:1600px;height:1200px;margin:0;background:#f8f7f4;color:#1e2422}body{font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}
  .board{width:1600px;height:1200px;padding:17px 48px 20px;background:#f8f7f4}.eyebrow{text-align:center;font:13px Arial;letter-spacing:4px;color:#777970}h1{text-align:center;margin:10px 0 4px;font:51px/1.05 Georgia,serif;white-space:nowrap}h2{text-align:center;margin:0 0 12px;font:26px/1.1 Georgia,serif;color:#987555;letter-spacing:1.4px;white-space:nowrap}
  .sub{text-align:center;font:17px/1.2 Georgia,serif;color:#62675f;margin:0 0 13px}.hero{height:590px;width:1504px;overflow:hidden;position:relative;background:#dedbd4;border:1px solid #dbd9d1}.hero img{height:100%;width:100%;object-fit:cover;object-position:center}.hero-tag{position:absolute;left:17px;bottom:17px;background:#101719db;color:white;padding:12px 16px;font:700 14px/1.15 Arial;letter-spacing:1px}
  .tiles{margin-top:14px;display:grid;grid-template-columns:repeat(5,1fr);gap:11px}.tile{height:310px;background:white;border:1px solid #dddcd6;padding:10px;text-align:center}.tile-media{height:180px;overflow:hidden;background:#f4f4f1}.tile-media img{display:block;width:100%;height:100%;object-fit:contain}.spec-mark{display:grid;place-items:center;width:100%;height:100%;background:#eaece9;color:#34413d;font:19px/1.25 Georgia,serif;padding:15px}.tile-label{font:700 14px/1.1 Arial;letter-spacing:1.2px;margin:13px 0 7px}.tile-value{font:17px/1.24 Georgia,serif;color:#4e5652}.footer{margin-top:14px;border-top:1px solid #c9c8c2;padding-top:12px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.brand{font:19px Georgia,serif;letter-spacing:3px}.source{font:12px Arial;line-height:1.4;color:#646963;text-align:right;max-width:920px}
  </style></head><body><main class="board"><div class="eyebrow">HOUSE DELIVERY · SUPPLIER PRODUCT COLLECTION</div><h1>${escapeHtml(header)}</h1><h2>${escapeHtml(tier)}</h2><p class="sub">Named supplier models, actual catalog sections and documented hardware.</p>
  <div class="hero"><img src="${images.hero}" alt="${escapeHtml(direction.doorModel)} supplier catalog image"><div class="hero-tag">${escapeHtml(direction.doorModel)} · SUPPLIER CATALOG IMAGE</div></div>
  <div class="tiles">
   ${tile("WINDOW PROFILE", direction.windowModel, images.window)}
   ${tile("PATIO DOOR SECTION", direction.doorModel, images.door)}
   ${tile("OPENING", operation, direction.operationAsset !== direction.doorAsset ? images.operation : null, `${operation} system`)}
   ${tile("HARDWARE", direction.hardware, hardwareImage, direction.hardware)}
   ${tile("CATALOG GLAZING", direction.glazing, null, direction.glazing)}
  </div><footer class="footer"><div class="brand">HOUSE DELIVERY</div><div class="source">${escapeHtml(direction.source)} · supplier catalog imagery<br>Supplier catalog configuration shown. Final products, glazing and Canadian performance require project-specific verification.</div></footer></main></body></html>`;
}

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
const manifest = [];
try {
  const homes = getHomeConfiguratorRegistrationsByFamily("custom-home").map((registration) => registration.definition).filter(Boolean);
  assert.equal(homes.length, 18);
  assert.equal(windowsPatioDoorDirections.length, 8);
  for (const direction of windowsPatioDoorDirections) {
    const images = { hero: await supplierImage(direction.heroAsset), window: await supplierImage(direction.windowAsset), door: await supplierImage(direction.doorAsset), operation: await supplierImage(direction.operationAsset), hardware: await supplierImage(direction.hardwareAsset) };
    for (const home of homes) {
      await page.setContent(boardHtml(home, direction, images), { waitUntil: "load" });
      const loaded = await page.locator("img").evaluateAll((items) => items.every((item) => item.complete && item.naturalWidth > 0));
      assert.ok(loaded, `${home.homeId} ${direction.level} ${direction.number}: supplier image failed to load`);
      const screenshot = await page.screenshot({ type: "png" });
      const filename = `${home.homeId}-${direction.level}-${direction.number}.webp`;
      const meta = await sharp(screenshot).webp({ quality: 92, effort: 5 }).toFile(path.join(outputRoot, filename));
      manifest.push({ home: home.homeId, tier: direction.level, option: direction.number, image: filename, windowModel: direction.windowModel, doorModel: direction.doorModel, catalogSource: direction.source, bytes: meta.size });
    }
    console.log(`${direction.level} ${direction.number}: 18 source-based boards`);
  }
  await writeFile(path.join(outputRoot, "manifest.json"), JSON.stringify(manifest, null, 2)+"\n");
  console.log(`Rendered ${manifest.length} boards.`);
} finally { await browser.close(); }
