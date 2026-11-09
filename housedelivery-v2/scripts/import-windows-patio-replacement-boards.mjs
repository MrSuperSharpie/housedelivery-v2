import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';
import sharp from 'sharp';

const [extractedPath, zipPath] = process.argv.slice(2);
assert.ok(extractedPath && zipPath, 'Pass the extracted ZIP directory and original delivery ZIP.');
const archive = basename(zipPath);
assert.equal(archive, 'Windows-Patio-Doors_All-6-Homes_48-Boards.zip');
const zipHash = createHash('sha256');
for await (const chunk of createReadStream(zipPath)) zipHash.update(chunk);
const archiveSha256 = zipHash.digest('hex');
const root = resolve(extractedPath);
const destination = resolve('public/images/lookbook/windows-patio-doors/boards');
const manifest = JSON.parse(await readFile(join(destination, 'manifest.json'), 'utf8'));
const allowed = new Set(['maplewood', 'summit', 'south-bay', 'solace', 'dalton']);
const files = await readdir(join(root, 'public/images/homes'), {recursive: true});
const pngs = files.filter(file => file.endsWith('.png'));
assert.equal(pngs.length, 48);
let updated = 0;
for (const board of manifest) {
  if (!allowed.has(board.home)) continue;
  const match = pngs.filter(file => file.startsWith(`${board.home}/`) && basename(file).includes(`_${board.tier === 'premium' ? 'Premium' : 'Signature'}-${board.option}_`));
  assert.equal(match.length, 1, `${board.home}:${board.tier}:${board.option}`);
  const sourceFile = `public/images/homes/${match[0]}`;
  const input = await readFile(join(root, sourceFile));
  const sourceSha256 = createHash('sha256').update(input).digest('hex');
  const sourcePixels = await sharp(input).raw().toBuffer({resolveWithObject: true});
  const webp = await sharp(input).webp({lossless: true, effort: 6}).toBuffer();
  const outputPixels = await sharp(webp).raw().toBuffer({resolveWithObject: true});
  assert.deepEqual(outputPixels.info, sourcePixels.info);
  assert.ok(outputPixels.data.equals(sourcePixels.data), `Decoded pixels differ: ${sourceFile}`);
  const image = `${board.home}-${board.tier}-${board.option}-${sourceSha256.slice(0,12)}.webp`;
  const previousImage = board.image;
  await writeFile(join(destination, image), webp);
  // Replace provenance as well as the image: no stale metadata from rejected artwork.
  const identity = {home: board.home, tier: board.tier, option: board.option};
  for (const key of Object.keys(board)) delete board[key];
  Object.assign(board, identity, {
    image, width: sourcePixels.info.width, height: sourcePixels.info.height,
    bytes: webp.length, sha256: createHash('sha256').update(webp).digest('hex'),
    sourceFile, sourceZip: archive, sourceZipSha256: archiveSha256,
    sourceSha256, sourceBytes: input.length,
    decodedPixelSha256: createHash('sha256').update(sourcePixels.data).digest('hex'),
    encoding: 'lossless-webp',
  });
  if (image !== previousImage) await unlink(join(destination, previousImage)).catch(error => {if (error.code !== 'ENOENT') throw error;});
  updated++;
  console.log(`Mapped ${board.home}:${board.tier}:${board.option} (${board.width}×${board.height})`);
}
assert.equal(updated, 40);
await writeFile(join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('40 delivery PNGs converted losslessly; 104 other manifest entries unchanged, including all eight shared Salt Spring boards.');
