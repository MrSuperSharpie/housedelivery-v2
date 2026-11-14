import Ajv from 'ajv/dist/2020';
import {createHash} from 'node:crypto';
import data from '@/data/concierge/company-handbook.json';
import schema from '@/data/concierge/company-handbook.schema.json';
import manifest from '@/data/concierge/company-handbook-manifest.json';
import type {Intent} from './intent';
import {stateValue,type State} from './state';
import type {Evidence} from './evidence';

type Section=typeof data.sections[number];
const check=new Ajv({allErrors:true,strict:true}).compile(schema);
export function validateHandbook(value:unknown):asserts value is typeof data{
  if(!check(value))throw Error('Invalid company handbook schema');
  const h=value as typeof data;
  for(const [records,ids] of [[h.sections,manifest.sections],[h.sources,manifest.sources]] as const){
    if(new Set(records.map(r=>r.id)).size!==ids.length||ids.some(id=>!records.some(r=>r.id===id)))throw Error('Invalid handbook publication IDs');
  }
  for(const section of h.sections){
    const released=data.sections.find(s=>s.id===section.id)!;
    if(section.related.includes(section.id)||JSON.stringify(section.sources)!==JSON.stringify(released.sources)||JSON.stringify(section.limits)!==JSON.stringify(released.limits))throw Error('Handbook provenance or limits changed');
  }
  for(const source of h.sources){const released=data.sources.find(s=>s.id===source.id)!;if(source.url!==released.url||source.kind!==released.kind)throw Error('Unapproved handbook source');}
  const serialized=JSON.stringify(h);
  if(/drive\.google|docs\.google|outlook\.|libfile_|PRIVATE_[A-Z_]+|service_role|api[_-]?key|<[a-z][^>]*>|\.zip\b|source-ledger|CODEX_PROMPT/i.test(serialized))throw Error('Disallowed handbook payload');
  if(createHash('sha256').update(serialized).digest('hex')!==manifest.canonicalSha256)throw Error('Handbook release fingerprint mismatch');
}
// Explicit, Node-only release import. No docs/file/connector search is available.
validateHandbook(data);
export const handbookRelease=Object.freeze({id:manifest.releaseId,sha256:manifest.sha256});
export const handbookIndex=new Map(data.sections.map(s=>[s.id,s]));
export const handbookIntentIndex=data.sections.map(s=>({id:s.id,title:s.title,scope:s.facts[0].slice(0,220)}));
const topics:Record<Intent['topic'],string[]>={company:['roles','value'],matching:['selection','layout'],specifications:['selection'],comparison:['selection','layout'],customization:['design','layout','finishes'],pricing:['cost','roles'],arithmetic:['cost'],process:['process','roles'],scope:['roles','cost'],property:['property','selection'],community:['developments','community','process'],builder:['roles','process'],origin:['systems','roles'],warranty:['aftercare','roles'],terms:['property'],contact:['next_step'],summary:['next_step'],clarify:['next_step'],unrelated:['next_step']};
export function selectHandbook(intent:Intent,state:State,question:string):Evidence[]{
  const current:string[]=[];
  const add=(test:RegExp,...ids:string[])=>{if(test.test(question))current.push(...ids)};
  add(/manufactur|Canadian|assembly|system|steel|timber|modular/i,'systems','roles');
  add(/Look.?Book|Studio|design direction|save.*design/i,'design');
  add(/finish|maintenan|durab|lasting|value|cheapest|luxury/i,'value','finishes');
  add(/budget|cost|price|afford|rate|quotation/i,'cost','roles');
  add(/guest|privacy|gather|layout|wall|room|mother|Elder|access|move around/i,'layout','selection');
  add(/phase|unit mix|rental|portfolio|municip|institution|development/i,'developments','process');
  add(/Nation|community|local people|local participation|training/i,'community');
  add(/warrant|problem later|replacement|aftercare/i,'aftercare');
  add(/lot|property|site|approved|permit|begin/i,'property','process');
  const previous=(state.lastEvidenceRefs??[]).filter(id=>id.startsWith('H:')).map(id=>id.slice(2));
  const followUp=/^(?:why|what if|which part|what do you need|so what|and |does that|would that|it |that |can (?:we|it)|could (?:we|it))/i.test(question);
  const retained:string[]=[];
  if(/Nation|Indigenous/i.test(stateValue(state,'audience')??''))retained.push('community');
  else if(stateValue(state,'homes')||/municip|institution|developer/i.test(stateValue(state,'audience')??''))retained.push('developments');
  if(stateValue(state,'householdNeeds')||stateValue(state,'finish'))retained.push('selection','finishes');
  const chosen=[...new Set(['company',...(intent.sectionIds??[]),...current,...topics[intent.topic],...retained,...(followUp?previous:[])])].filter(id=>handbookIndex.has(id)).slice(0,7);
  // Complete sections retain qualifications. Related topics add context only when
  // space remains; limits are never trimmed into stand-alone marketing claims.
  for(const id of [...chosen]){if(chosen.length>=7)break;const related=handbookIndex.get(id)!.related.find(r=>!chosen.includes(r)&&[...current,...retained,...previous].includes(r));if(related)chosen.push(related);}
  return chosen.map(id=>{const s=handbookIndex.get(id)!;return{id:'H:'+s.id,data:{title:s.title,facts:s.facts,guidance:s.guidance,limits:s.limits},sourceIds:s.sources}});
}
export function handbookSection(id:string):Section|undefined{return handbookIndex.get(id.replace(/^H:/,''))}
