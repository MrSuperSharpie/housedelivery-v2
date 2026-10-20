import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { getHomeConfiguratorRegistrationsByFamily } from "../src/data/home-configurator-registry.ts";
import { models } from "../src/data/models.ts";
import { windowsPatioDoorDirections } from "../src/data/windows-patio-doors-lookbook.ts";

const root = process.cwd();
const sourceRoot = path.join(root, "public/images/lookbook/windows-patio-doors");
const assetRoot = path.join(root, "scripts/assets/window-patio");
const portfolioRoot = path.join(root, "public/images/inclusions/windows-patio-doors/products");
const outputRoot = path.join(sourceRoot, "boards");
const chromePath = process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const lookBookAssets = JSON.parse(await readFile(path.join(root, "src/data/home-lookbook-assets.json"), "utf8"));

// Supplier crops are component references, not a single tested assembly.
const specs = {
  "premium-1": {
    summary: "A complete high-performance opening package with operable ventilation and a simple indoor–outdoor connection.",
    window: "Fixed view + operable casement", door: "Two-panel sliding opening",
    glazing: "Double-pane argon window unit", glass: "double-casement.png",
    profile: "Thermally broken slider frame", profileImage: "classic-slider.png",
    hardware: "Recessed pull + hook lock", hardwareImage: "slider-pull.png",
    doorPhoto: "hd-win-001-03.webp",
    windowCrop: [0, 80, 750, 690], doorCrop: [1010, 50, 650, 770],
  },
  "premium-2": {
    summary: "Flexible tilt-turn ventilation and broad framed views connect the living space to its terrace.",
    window: "Tilt-turn + fixed view", door: "Wide two-panel slider",
    glazing: "Double-pane window direction", glass: "double-tilt-turn.png",
    profile: "Thermally broken slider frame", profileImage: "classic-slider.png",
    hardware: "Recessed sliding pull", hardwareImage: "slider-pull.png",
    doorPhoto: "hd-win-003-01.webp",
    windowCrop: [0, 40, 700, 780], doorCrop: [820, 50, 800, 780],
  },
  "premium-3": {
    summary: "Picture glazing and a folding patio wall create a generous indoor–outdoor gathering space.",
    window: "Picture + operable view", door: "Folding patio opening",
    glazing: "Double-pane window direction", glass: "double-casement.png",
    profile: "Thermally broken folding frame", profileImage: "folding-door.png",
    hardware: "Folding handle style", hardwareImage: "folding-pull.png",
    doorPhoto: "hd-win-005-02.webp",
    windowCrop: [1120, 50, 530, 800], doorCrop: [320, 20, 1120, 820],
  },
  "premium-4": {
    summary: "Operable awning windows and a lift-slide patio opening frame the home's landscape outlook.",
    window: "Awning + fixed view", door: "Lift-slide patio opening",
    glazing: "Double-pane window direction", glass: "double-casement.png",
    profile: "Thermally broken lift-slide frame", profileImage: "lift-slide.png",
    hardware: "Dark pull finish reference", hardwareImage: "architectural-pull.png",
    doorPhoto: "hd-win-005-01.webp",
    windowCrop: [0, 50, 690, 780], doorCrop: [650, 30, 1000, 800],
  },
  "signature-1": {
    summary: "An expanded architectural opening with triple-glazed windows and a documented lift-slide door system.",
    window: "Panoramic view + operable panel", door: "Large-format lift-slide opening",
    glazing: "Triple-pane insulated window", glass: "triple-window.png",
    profile: "Thermally broken lift-slide frame", profileImage: "lift-slide.png",
    hardware: "Dark architectural pull reference", hardwareImage: "architectural-pull.png",
    doorPhoto: "hd-win-005-01.webp",
    windowCrop: [0, 60, 800, 700], doorCrop: [690, 80, 760, 740],
  },
  "signature-2": {
    summary: "Architectural triple-glazed windows meet a generous multi-panel lift-slide patio wall.",
    window: "Architectural window grouping", door: "Multi-panel lift-slide opening",
    glazing: "Triple-pane insulated window", glass: "triple-window.png",
    profile: "Thermally broken lift-slide frame", profileImage: "lift-slide.png",
    hardware: "Dark architectural pull reference", hardwareImage: "architectural-pull.png",
    doorPhoto: "hd-win-003-01.webp",
    windowCrop: [0, 40, 700, 780], doorCrop: [650, 20, 1000, 820],
  },
  "signature-3": {
    summary: "Triple-glazed windows and a multi-panel folding wall open the room to outdoor living.",
    window: "Picture + operable view", door: "Multi-panel folding opening",
    glazing: "Triple-pane insulated window", glass: "triple-window.png",
    profile: "Thermally broken folding frame", profileImage: "folding-door.png",
    hardware: "Folding handle style", hardwareImage: "folding-pull.png",
    doorPhoto: "hd-win-005-02.webp",
    windowCrop: [1200, 30, 450, 800], doorCrop: [100, 30, 1200, 820],
  },
  "signature-4": {
    summary: "Triple-glazed windows pair with an exterior-rated pocketing glass-wall concept for a full-width opening.",
    window: "Fixed view + operable panel", door: "Concealed pocketing opening",
    glazing: "Triple-pane insulated window", glass: "triple-window.png",
    profile: "Exterior-rated system required", profileImage: null,
    hardware: "Pocket + track to be designed", hardwareImage: null,
    doorPhoto: null,
    windowCrop: [0, 20, 680, 800], doorCrop: [720, 20, 920, 820],
  },
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);
const dataUrl = (bytes, type) => `data:image/${type};base64,${bytes.toString("base64")}`;

function homeSceneSource(home, direction) {
  // These older window-covering sets introduced an unrelated city skyline.
  // The alternate room views retain each model's actual architectural story.
  const categoryId = ["mayne", "south-bay"].includes(home.homeId)
    ? "whole-home-flooring-stairs" : "window-coverings";
  const category = home.categories.find((item) => item.id === categoryId);
  const references = category?.options?.length
    ? category.options
    : lookBookAssets.filter((item) => item.homeId === home.homeId && item.categoryId === categoryId);
  const matching = references.filter((item) => item.level === direction.level)
    .sort((a, b) => Number(a.optionNumber) - Number(b.optionNumber));
  const reference = matching[Number(direction.number) - 1];
  assert.ok(reference?.image?.src || reference?.src, `${home.homeId}: missing ${direction.level} ${direction.number} home scene`);
  const source = reference.image?.src || reference.src;
  assert.ok(source.startsWith(`/images/homes/${home.homeId}/`), `${home.homeId}: scene belongs to another home`);
  return source;
}

async function imagesFor(home, direction, spec) {
  // The room scene comes from this home's existing, published visual story.
  // Crop away the original window-covering board's heading and material strip.
  const sceneSource = homeSceneSource(home, direction);
  const boardBytes = await readFile(path.join(root, "public", sceneSource.slice(1)));
  const metadata = await sharp(boardBytes).metadata();
  assert.equal(metadata.width, 1448, `${sceneSource}: unexpected source width`);
  assert.equal(metadata.height, 1086, `${sceneSource}: unexpected source height`);
  const heroBytes = await sharp(boardBytes)
    .extract({ left: 24, top: 160, width: 1400, height: 550 })
    .webp({ quality: 94, effort: 5 }).toBuffer();
  const hero = sharp(heroBytes);
  const crop = async () =>
    dataUrl(await hero.clone().extract({ left: 0, top: 0, width: 650, height: 550 }).png().toBuffer(), "png");
  const asset = async (name) => name
    ? dataUrl(await readFile(path.join(assetRoot, name)), "png") : null;
  const portfolio = async (name) => name
    ? dataUrl(await readFile(path.join(portfolioRoot, name)), "webp") : null;
  return {
    sceneSource,
    hero: dataUrl(heroBytes, "webp"),
    window: await crop(), door: await portfolio(spec.doorPhoto),
    glazing: await asset(spec.glass),
    profile: await asset(spec.profileImage),
    hardware: await asset(spec.hardwareImage),
  };
}

function boardHtml(home, direction, spec, images) {
  const context = models.find((model) => model.slug === home.homeId)?.locationLabel;
  assert.ok(context, `${home.homeId}: missing architectural context`);
  const tile = (label, value, src, fallback) =>
    `<section class="tile"><div class="tile-photo ${src ? "" : "concept"}">${src
      ? `<img src="${src}" alt="">`
      : `<span>${escapeHtml(fallback)}</span>`}</div><div class="tile-heading">${escapeHtml(label)}</div><div class="tile-detail">${escapeHtml(value)}</div></section>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{width:1600px;height:1200px;margin:0}body{background:#f8f7f3;color:#202421;-webkit-font-smoothing:antialiased}
    main{width:1600px;height:1200px;padding:0 48px;display:flex;flex-direction:column}
    .eyebrow{margin-top:19px;text-align:center;font:13px Arial,sans-serif;letter-spacing:5px;color:#6c726f}
    h1{margin:17px 0 0;font:49px/1.06 Georgia,serif;letter-spacing:1px;text-align:center;white-space:nowrap}
    h2{margin:5px 0 0;font:27px/1.08 Georgia,serif;letter-spacing:2px;color:#9a785b;text-align:center;white-space:nowrap}
    .intro{margin:12px 0 15px;text-align:center;font:18px/1.2 Georgia,serif;color:#5f655f}
    .hero{width:1504px;height:609px;flex:none;overflow:hidden;background:#ddd;border:1px solid #e1ddd5}
    .hero img{width:100%;height:100%;object-fit:cover;object-position:center}
    .tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:11px;margin-top:14px}
    .tile{height:266px;border:1px solid #d9d8d1;background:#fff;padding:9px;text-align:center}
    .tile-photo{height:170px;display:grid;place-items:center;overflow:hidden;background:#f0f0eb}
    .tile-photo img{width:100%;height:100%;object-fit:contain}
    .tile-photo.concept{padding:18px;background:#e7e6df;color:#585f5a;font:17px/1.4 Georgia,serif}
    .tile-heading{margin-top:10px;font:700 14px/1 Arial,sans-serif;letter-spacing:1.2px}
    .tile-detail{margin:6px auto 0;max-width:245px;font:17px/1.14 Georgia,serif;color:#666963}
    footer{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:12px}
    .brand{font:17px Georgia,serif;letter-spacing:3px;white-space:nowrap}
    .note{max-width:940px;text-align:right;font:12px/1.25 Arial,sans-serif;color:#6c716b}
  </style></head><body><main>
    <div class="eyebrow">HOUSE DELIVERY · ${escapeHtml(context.toUpperCase())} · WINDOW & PATIO DOOR COLLECTION</div>
    <h1>${escapeHtml(home.residenceLabel.toUpperCase())} | WINDOWS & PATIO DOORS</h1>
    <h2>${escapeHtml(`${direction.level.toUpperCase()} ${direction.number} — ${direction.name.toUpperCase()}`)}</h2>
    <p class="intro">${escapeHtml(spec.summary)}</p>
    <div class="hero"><img src="${images.hero}" alt="Representative architectural visualization"></div>
    <div class="tiles">
      ${tile("WINDOW STYLE", spec.window, images.window)}
      ${tile("PATIO DOOR", spec.door, images.door, "Exterior-rated system selected for the project")}
      ${tile("GLAZING", spec.glazing, images.glazing)}
      ${tile("DOOR PROFILE", spec.profile, images.profile, "Project-specific exterior assembly")}
      ${tile(direction.level === "signature" && direction.number === "4" ? "POCKET DETAIL" : "HARDWARE STYLE", spec.hardware, images.hardware, "Structure, drainage and access")}
    </div>
    <footer><div class="brand">HOUSE DELIVERY</div><div class="note">Room scene illustrates this home's architectural setting. Component details show the selected direction using supplier references; final tested assemblies, dimensions and Canadian ratings are confirmed for each project.</div></footer>
  </main></body></html>`;
}

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
const manifest = [];
try {
  const homes = getHomeConfiguratorRegistrationsByFamily("custom-home")
    .map((registration) => registration.definition).filter(Boolean);
  assert.equal(homes.length, 18);
  assert.equal(windowsPatioDoorDirections.length, 8);
  const selectedHomes = process.env.LOOKBOOK_BOARD_HOME
    ? homes.filter((home) => home.homeId === process.env.LOOKBOOK_BOARD_HOME)
    : homes;
  assert.ok(selectedHomes.length, "No matching home for LOOKBOOK_BOARD_HOME");
  for (const home of selectedHomes) {
    for (const direction of windowsPatioDoorDirections) {
      const spec = specs[`${direction.level}-${direction.number}`];
      assert.ok(spec);
      const images = await imagesFor(home, direction, spec);
      await page.setContent(boardHtml(home, direction, spec, images), { waitUntil: "load" });
      const loaded = await page.locator("img").evaluateAll((items) =>
        items.every((item) => item.complete && item.naturalWidth > 0));
      assert.ok(loaded, `${home.homeId} ${direction.level} ${direction.number}: image failed to load`);
      const screenshot = await page.screenshot({ type: "png" });
      const filename = `${home.homeId}-${direction.level}-${direction.number}.webp`;
      const metadata = await sharp(screenshot).webp({ quality: 90, effort: 5 })
        .toFile(path.join(outputRoot, filename));
      manifest.push({ home: home.homeId, tier: direction.level, option: direction.number,
        image: filename, sceneSource: images.sceneSource,
        width: metadata.width, height: metadata.height, bytes: metadata.size });
    }
    console.log(`${home.homeId}: 8 boards`);
  }
  if (!process.env.LOOKBOOK_BOARD_HOME) {
    assert.equal(manifest.length, 144);
    await writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  }
  console.log(`Rendered ${manifest.length} boards.`);
} finally {
  await browser.close();
}
