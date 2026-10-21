import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,basename} from 'node:path';
import sharp from 'sharp';
const source=process.argv[2];
if(!source)throw Error('Pass the extracted All-Homes_Windows-Patio-Doors_144-Boards folder.');
const root=resolve(source),target=resolve('public/images/lookbook/windows-patio-doors/boards');
const csv=(await readFile(join(root,'Board-Manifest.csv'),'utf8')).trim().split(/\r?\n/).map(line=>line.split(','));
const [headers,...lines]=csv;
assert.deepEqual(headers,['Home','Tier','Option','Individual file','Website source file','Bytes','SHA-256']);
assert.equal(lines.length,144);
const manifest=[];await mkdir(target,{recursive:true});
for(const [home,label,option,file,,size,expectedHash] of lines){
  assert.match(home,/^[a-z]+(?:-[a-z]+)*$/);assert.ok(['Premium','Signature'].includes(label));assert.match(option,/^[1-4]$/);
  const sourceFile=join(home,basename(file)),bytes=await readFile(join(root,sourceFile));
  const sha256=createHash('sha256').update(bytes).digest('hex');assert.equal(sha256,expectedHash);assert.equal(bytes.length,Number(size));
  const {width,height}=await sharp(bytes).metadata();assert.equal(width,1600);assert.equal(height,1200);
  const tier=label.toLowerCase(),image=`${home}-${tier}-${option}-${sha256.slice(0,12)}.webp`;
  await writeFile(join(target,image),bytes);
  manifest.push({home,tier,option,image,width,height,bytes:bytes.length,sha256,sourceFile});
}
assert.equal(new Set(manifest.map(board=>`${board.home}:${board.tier}:${board.option}`)).size,144);
assert.equal(new Set(manifest.map(board=>board.home)).size,18);
await writeFile(join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Imported 144 unchanged source boards with verified sizes and SHA-256 checksums.');
