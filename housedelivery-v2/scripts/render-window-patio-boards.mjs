import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright-core";
import sharp from "sharp";

import { getHomeConfiguratorRegistrationsByFamily } from "../src/data/home-configurator-registry.ts";
import { windowsPatioDoorDirections } from "../src/data/windows-patio-doors-lookbook.ts";

const root = process.cwd();
const sourceRoot = path.join(root, "public/images/lookbook/windows-patio-doors");
const outputRoot = path.join(sourceRoot, "boards");
const chromePath = process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function openingDiagram(kind) {
  const folding = /fold/i.test(kind);
  const pocket = /pocket/i.test(kind);
  const panels = folding
    ? '<path d="M75 52 L124 28 L173 52 L222 28 L271 52"/><path d="M75 52 L75 159 M124 28 L124 159 M173 52 L173 159 M222 28 L222 159 M271 52 L271 159"/>'
    : pocket
      ? '<rect x="64" y="43" width="36" height="124" fill="#e7e5dd"/><path d="M100 50 H283 V160 H100 Z M145 50 V160 M205 50 V160"/><path d="M165 175 H70 M77 168 L70 175 L77 182"/>'
      : '<path d="M62 50 H284 V160 H62 Z M173 50 V160"/><path d="M151 175 H255 M248 168 L255 175 L248 182"/>';
  return `<svg viewBox="0 0 350 220" aria-hidden="true"><g fill="none" stroke="#5b635f" stroke-width="5" stroke-linecap="square" stroke-linejoin="miter">${panels}</g><path d="M42 192 H310" stroke="#bbb8ad" stroke-width="2"/></svg>`;
}

function boardHtml(home, direction, hero) {
  const title = `${home.residenceLabel.toUpperCase()} | WINDOWS & PATIO DOORS`;
  const tier = `${direction.level.toUpperCase()} ${direction.number} — ${direction.name.toUpperCase()}`;
  const safeImage = `data:image/webp;base64,${hero.toString("base64")}`;
  const imageTile = (imagePosition) => `<div class="photo"><img src="${safeImage}" style="transform-origin:${imagePosition}" alt=""></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;padding:0;width:1600px;height:1200px;background:#f9f8f5;color:#1d201e}
    body{font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}
    .board{position:relative;width:1600px;height:1200px;background:#faf9f6;padding:0 48px}
    .eyebrow{height:36px;padding-top:18px;text-align:center;font:13px Arial,Helvetica,sans-serif;letter-spacing:5px;color:#73756f}
    h1{margin:10px 0 2px;text-align:center;font:52px/1.08 Georgia,'Times New Roman',serif;letter-spacing:1px;white-space:nowrap}
    h2{margin:5px 0 0;text-align:center;font:27px/1.18 Georgia,'Times New Roman',serif;letter-spacing:2px;color:#9a7656;white-space:nowrap}
    .intro{margin:12px 0 16px;text-align:center;font:17px/1.25 Georgia,'Times New Roman',serif;color:#656761}
    .hero{width:1504px;height:628px;overflow:hidden;background:#dedbd3;border:1px solid #e3e0d9}
    .hero img{width:100%;height:100%;object-fit:cover;object-position:center center}
    .tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:11px;margin-top:14px}
    .tile{height:257px;background:white;border:1px solid #dddcd6;padding:9px;text-align:center}
    .photo,.diagram,.glass{height:162px;overflow:hidden;background:#e9e9e2}
    .photo img{width:100%;height:100%;object-fit:cover;transform:scale(2.7)}
    .diagram{display:grid;place-items:center;background:linear-gradient(145deg,#f4f3ee,#deded8)}
    .diagram svg{width:80%;height:85%}
    .glass{display:grid;place-items:center;background:linear-gradient(135deg,#dce8e9 0%,#eff2ee 52%,#ccd8d6 100%)}
    .glass-layers{display:flex;gap:9px;transform:skewY(-7deg) rotate(-1deg);filter:drop-shadow(8px 7px 5px #879a9855)}
    .glass-layers span{display:block;width:43px;height:115px;border:4px solid #c2d5d3;background:linear-gradient(140deg,#f7ffffbb,#a8c3c4aa);box-shadow:inset 5px 0 #ffffff80}
    .tile-label{margin:11px 0 4px;font:700 14px/1 Arial,Helvetica,sans-serif;letter-spacing:1.2px;color:#2d322e}
    .tile-value{margin:0;font:17px/1.25 Georgia,'Times New Roman',serif;color:#68675f}
    .footer{height:46px;display:flex;align-items:center;justify-content:space-between;gap:20px}
    .brand{font:17px Georgia,'Times New Roman',serif;letter-spacing:3px;white-space:nowrap}
    .note{font:12px Arial,Helvetica,sans-serif;color:#77786f;text-align:right}
  </style></head><body><main class="board">
    <div class="eyebrow">HOUSE DELIVERY · WINDOW & PATIO DOOR COLLECTION</div>
    <h1>${escapeHtml(title)}</h1>
    <h2>${escapeHtml(tier)}</h2>
    <p class="intro">A coordinated West Coast opening direction for daylight, ventilation and indoor–outdoor living.</p>
    <div class="hero"><img src="${safeImage}" alt="Representative architectural visualization"></div>
    <div class="tiles">
      <section class="tile">${imageTile("19% 34%")}<p class="tile-label">WINDOW STYLE</p><p class="tile-value">${escapeHtml(direction.windowLabel)}</p></section>
      <section class="tile"><div class="glass"><div class="glass-layers"><span></span><span></span><span></span></div></div><p class="tile-label">WINDOW GLAZING</p><p class="tile-value">Triple-glazed direction</p></section>
      <section class="tile">${imageTile("91% 54%")}<p class="tile-label">PATIO DOOR SYSTEM</p><p class="tile-value">${escapeHtml(direction.doorLabel)}</p></section>
      <section class="tile"><div class="diagram">${openingDiagram(direction.operationLabel)}</div><p class="tile-label">OPENING ACTION</p><p class="tile-value">${escapeHtml(direction.operationLabel)}</p></section>
      <section class="tile">${imageTile("89% 24%")}<p class="tile-label">FRAME FINISH</p><p class="tile-value">Exterior-coordinated</p></section>
    </div>
    <div class="footer"><div class="brand">HOUSE DELIVERY</div><div class="note">Representative visualization. Final products, dimensions and Canadian performance are confirmed during project review.</div></div>
  </main></body></html>`;
}

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
const manifest = [];
try {
  const homes = getHomeConfiguratorRegistrationsByFamily("custom-home")
    .map((registration) => registration.definition)
    .filter(Boolean);
  assert.equal(homes.length, 18);
  assert.equal(windowsPatioDoorDirections.length, 8);
  for (const home of homes) {
    for (const direction of windowsPatioDoorDirections) {
      const hero = await readFile(path.join(sourceRoot, direction.image));
      await page.setContent(boardHtml(home, direction, hero), { waitUntil: "load" });
      const loaded = await page.locator("img").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0));
      assert.ok(loaded, `${home.homeId} ${direction.level} ${direction.number}: image failed to load`);
      const screenshot = await page.screenshot({ type: "png" });
      const filename = `${home.homeId}-${direction.level}-${direction.number}.webp`;
      const output = path.join(outputRoot, filename);
      const metadata = await sharp(screenshot).webp({ quality: 90, effort: 5 }).toFile(output);
      manifest.push({ home: home.homeId, tier: direction.level, option: direction.number, image: filename, width: metadata.width, height: metadata.height, bytes: metadata.size });
    }
    console.log(`${home.homeId}: 8 boards`);
  }
  await writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Rendered ${manifest.length} boards.`);
} finally {
  await browser.close();
}
