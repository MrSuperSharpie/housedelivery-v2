import {currentCommercialText} from './current-commercial';
import handbook from '@/data/concierge/company-handbook.json';
import {factIndex,knowledge,publicModel,type Model,type PublicFact} from './registry';

// Publication projections, not raw record spreading. Instructions have no
// evidence IDs and cannot authorize a customer assertion or rendered paragraph.
export type AnswerContent={text:string;qualifications:string[]};
const mixedFactSlots:Record<string,number[]>={'F-IMAGES':[0]};
const factSentences=(f:PublicFact)=>f.text.split(/(?<=[.!?])\s+/);
const qualifications:Record<string,string[]>={
 'F-PRICE':['These are starting housing-package planning references for the verified published custom-home selection, not binding quotations. Model-specific scope and final pricing require a written quotation.'],
 'F-CUSTOMIZATION':['A visual selection does not authorize a structural change or establish a free redesign.'],
 'F-TIMING':['Production, shipping, assembly and move-in timing require project-specific confirmation.'],
 'F-PARTICIPATION':['Job counts, training arrangements, wages and funding commitments require project-specific confirmation.'],
 'F-PORTFOLIO':['Planning scale is not a guaranteed production allocation, contract or delivery commitment.'],
 'F-FUNDING':['It is preliminary planning, not a quotation, eligibility decision or funding approval.'],
 'F-CATALOG-UNIT-MIX':['Reference design only; adaptable does not mean a delivered project is fully accessible.']
};
export function publicFactContent(f:PublicFact):AnswerContent{
 return{text:currentCommercialText(f.id)??(mixedFactSlots[f.id]?factSentences(f).filter((_,i)=>mixedFactSlots[f.id].includes(i)).join(' '):f.text),qualifications:qualifications[f.id]??[]};
}
export function publicFactText(id:string){const f=publicFactContent(factIndex.get(id)!);return[f.text,...f.qualifications].join(' ')}
const internalFactSlots:Record<string,number[]>={selection:[0],cost:[2]};
export function publicHandbookContent(section:typeof handbook.sections[number]){
 return{title:section.title,facts:section.facts.flatMap((text,index)=>{
  if(internalFactSlots[section.id]?.includes(index))return[];
  if(section.id==='finishes'&&index===2)return['Essential is described as a durable baseline, Premium as additional refinement and Signature as selected feature finishes. These descriptions do not establish a universal material schedule.'];
  return[text];
 })};
}
export function handbookInstructions(ids:string[]){return handbook.sections.filter(s=>ids.includes('H:'+s.id)).map(s=>({guidance:s.guidance,limits:s.limits,recordRules:s.facts.filter((_,i)=>internalFactSlots[s.id]?.includes(i))}));}
const instructions=[...handbook.sections.flatMap(s=>[s.guidance,...s.limits,...s.facts.filter((_,i)=>internalFactSlots[s.id]?.includes(i))]),...knowledge.facts.flatMap(f=>[...f.qualifiers.filter(q=>!publicFactContent(f).qualifications.includes(q)),...factSentences(f).filter((_,i)=>mixedFactSlots[f.id]&&!mixedFactSlots[f.id].includes(i))])];
const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
// Defense at the answer boundary is derived from the classified source fields,
// not a blacklist of sentences found in a particular failing conversation.
const internalPassages=instructions.flatMap(s=>s.split(/(?<=[.!?])\s+/)).map(normalize).filter(s=>s.split(' ').length>=4);
export function containsInternalInstruction(text:string){const n=normalize(text);return internalPassages.some(p=>n.includes(p));}

export function publicModelContent(m:Model){
 const value=publicModel(m);
 // Raw uncertainty/conflict notes contain editorial commands. Deterministic
 // matching retains them internally; explicit public conflicts have F-records.
 const {uncertainties,conflicts,...content}=value;void uncertainties;void conflicts;
 return content;
}
