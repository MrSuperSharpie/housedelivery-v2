import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Each crop is taken from a page supplied by House Delivery. Coordinates are
// fractions of the rendered page; no product components are synthesized.
const root = "/private/tmp/hd-supplier-pages";
const out = path.join(process.cwd(), "public/images/lookbook/windows-patio-doors/supplier");
const sources = {
  dw: `${root}/derchi/hi-windows-10.png`,
  ds: `${root}/derchi/hi-sliders-19.png`,
  df: `${root}/derchi/hi-folding-24.png`,
  aw: `${root}/amj/hi/page-08.png`,
  a18: `${root}/amj/hi/page-18.png`,
  a19: `${root}/amj/hi/page-19.png`,
  a20: `${root}/amj/hi/page-20.png`,
  a22: `${root}/amj/hi/page-22.png`,
  l14: `${root}/ledow/hi/page-14.png`,
  l21: `${root}/ledow/hi/page-21.png`,
  l23: `${root}/ledow/hi/page-23.png`,
  l27: `${root}/ledow/hi/page-27.png`,
  l33: `${root}/ledow/hi/page-33.png`,
  l22: `${root}/ledow/hi/page-22.png`,
  l24: `${root}/ledow/hi/page-24.png`,
  l28: `${root}/ledow/hi/page-28.png`,
};
// x, y, width, height as ratios of the source page.
const crops = {
  "derchi-wy100-section": ["dw", .025,.505,.185,.43],
  "derchi-wy104-section": ["dw", .535,.505,.185,.43],
  "derchi-wt135d-section": ["ds", .535,.505,.18,.43],
  "derchi-wt135d-hero": ["ds", .505,.155,.49,.215],
  "derchi-wt135d-opening": ["ds", .815,.005,.15,.07],
  "derchi-wz80-section": ["df", .53,.505,.18,.43],
  "derchi-wz80-hero": ["df", .505,.135,.49,.24],
  "derchi-wz80-opening": ["df", .85,.005,.13,.07],
  "amj-88t-section": ["aw", .045,.53,.23,.40],
  "amj-155t-section": ["a20", .035,.515,.16,.42],
  "amj-155t-hero": ["a20", .505,.005,.49,.49],
  "amj-155t-operation": ["a20", .27,.20,.185,.27],
  "amj-155t-lock": ["a20", .195,.72,.13,.18],
  "amj-154t-section": ["a19", .035,.515,.43,.39],
  "amj-154t-hero": ["a19", .505,.005,.49,.49],
  "amj-154t-operation": ["a19", .27,.20,.185,.27],
  "amj-80t-section": ["a22", .04,.52,.16,.41],
  "amj-80t-hero": ["a22", .505,.005,.49,.49],
  "amj-80t-operation": ["a22", .265,.20,.185,.27],
  "amj-80t-fold-control": ["a22", .32,.51,.135,.18],
  "ledow-c75-section": ["l14", .71,.09,.26,.80],
  "ledow-g91-section": ["l33", .70,.08,.28,.82],
  "ledow-g152-section": ["l21", .70,.08,.28,.82],
  "ledow-g185-section": ["l23", .70,.08,.28,.82],
  "ledow-g120-section": ["l27", .70,.08,.28,.82],
  "ledow-g152-hero": ["l22", .015,.04,.73,.88],
  "ledow-g185-hero": ["l24", .015,.04,.73,.88],
  "ledow-g120-hero": ["l28", .015,.04,.73,.88],
};

await mkdir(out, { recursive: true });
const manifest = [];
for (const [name, [sourceKey, x, y, w, h]] of Object.entries(crops)) {
  const source = sources[sourceKey];
  const meta = await sharp(source).metadata();
  const left = Math.floor(meta.width * x);
  const top = Math.floor(meta.height * y);
  const width = Math.floor(meta.width * w);
  const height = Math.floor(meta.height * h);
  const target = path.join(out, `${name}.webp`);
  await sharp(source).extract({left,top,width,height}).webp({quality:94,effort:5}).toFile(target);
  manifest.push({name,source:sourceKey,sourceFile:source,crop:{x,y,w,h},width,height});
}
await writeFile(path.join(out, "source-manifest.json"), JSON.stringify(manifest, null, 2)+"\n");
console.log(`Extracted ${manifest.length} supplier-image crops.`);
