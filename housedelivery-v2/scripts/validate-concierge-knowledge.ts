import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateKnowledge} from '../src/lib/concierge/audited/registry';
const file=readFileSync('src/data/concierge/audited-knowledge.json');
const manifest=JSON.parse(readFileSync('src/data/concierge/audited-manifest.json','utf8'));
if(createHash('sha256').update(file).digest('hex')!==manifest.sha256)throw Error('Audited knowledge hash mismatch');
validateKnowledge(JSON.parse(file.toString()));console.log('Audited Concierge knowledge validated: '+manifest.version);
