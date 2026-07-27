import { mkdir, readdir, rename, rm, stat, unlink } from "node:fs/promises";
import { dirname, extname, join, parse, relative, resolve, sep } from "node:path";
import process from "node:process";

import sharp from "sharp";

const publicDirectory = resolve(process.cwd(), "public");
const supportedExtensions = new Set([
  ".avif",
  ".gif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);
const floorPlanPattern = /floor[\s_-]*plans?/i;
const temporaryMarker = ".floorplan-processing-";

async function collectImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const images = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      images.push(...(await collectImages(absolutePath)));
      continue;
    }

    if (!entry.isFile() || entry.name.includes(temporaryMarker)) {
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    if (!supportedExtensions.has(extension)) {
      continue;
    }

    const relativePath = relative(publicDirectory, absolutePath);
    const parentDirectories = dirname(relativePath).split(sep);
    const isInBlueprintDirectory = parentDirectories.some((part) =>
      /^blueprints?$/i.test(part),
    );

    if (floorPlanPattern.test(entry.name) || isInBlueprintDirectory) {
      images.push(absolutePath);
    }
  }

  return images;
}

function standardizedOutputPath(inputPath) {
  const input = parse(inputPath);
  const withoutFloorPlanLabel = input.name.replace(
    /floor[\s_-]*plans?/gi,
    " ",
  );
  const homeSlug = withoutFloorPlanLabel
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!homeSlug) {
    throw new Error(`Cannot derive a home name from ${inputPath}`);
  }

  return join(input.dir, `${homeSlug}-floorplan.jpg`);
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

const inputPaths = (await collectImages(publicDirectory)).sort();

if (inputPaths.length === 0) {
  console.log("No floor plan images found.");
  process.exit(0);
}

const jobs = inputPaths.map((inputPath, index) => {
  const outputPath = standardizedOutputPath(inputPath);
  const temporaryPath = join(
    dirname(outputPath),
    `.${parse(outputPath).name}${temporaryMarker}${process.pid}-${index}.jpg`,
  );

  return { inputPath, outputPath, temporaryPath };
});

const outputOwners = new Map();
for (const job of jobs) {
  const collisionKey = job.outputPath.toLowerCase();
  const existingOwner = outputOwners.get(collisionKey);

  if (existingOwner) {
    throw new Error(
      `Multiple inputs resolve to ${job.outputPath}: ${existingOwner} and ${job.inputPath}`,
    );
  }

  outputOwners.set(collisionKey, job.inputPath);
}

const results = [];

try {
  for (const job of jobs) {
    await mkdir(dirname(job.temporaryPath), { recursive: true });

    const inputStats = await stat(job.inputPath);
    const inputMetadata = await sharp(job.inputPath).metadata();

    await sharp(job.inputPath)
      .rotate()
      .flatten({ background: "#ffffff" })
      .normalise({ lower: 1, upper: 99 })
      .sharpen({ sigma: 1, m1: 0.5, m2: 2 })
      .jpeg({
        quality: 85,
        chromaSubsampling: "4:4:4",
        progressive: true,
        optimiseCoding: true,
      })
      .toFile(job.temporaryPath);

    const outputStats = await stat(job.temporaryPath);
    const outputMetadata = await sharp(job.temporaryPath).metadata();

    results.push({
      ...job,
      inputBytes: inputStats.size,
      outputBytes: outputStats.size,
      inputWidth: inputMetadata.width,
      inputHeight: inputMetadata.height,
      outputWidth: outputMetadata.width,
      outputHeight: outputMetadata.height,
    });
  }

  for (const job of jobs) {
    await rename(job.temporaryPath, job.outputPath);

    if (resolve(job.inputPath) !== resolve(job.outputPath)) {
      await unlink(job.inputPath);
    }
  }
} finally {
  await Promise.all(
    jobs.map(({ temporaryPath }) =>
      rm(temporaryPath, { force: true }).catch(() => undefined),
    ),
  );
}

console.log(`Processed ${results.length} floor plan images:\n`);
for (const result of results) {
  const relativeOutput = relative(process.cwd(), result.outputPath);
  console.log(
    [
      relativeOutput,
      `${result.inputWidth}×${result.inputHeight} → ${result.outputWidth}×${result.outputHeight}`,
      `${formatBytes(result.inputBytes)} → ${formatBytes(result.outputBytes)}`,
    ].join(" | "),
  );
}
