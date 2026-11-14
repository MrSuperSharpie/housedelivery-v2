import type {Intent} from './intent';
import {privateRequest} from './commercial';
import {knowledge} from './registry';

export type RequestPart={id:string;topic:Intent['topic'];question:string};
export function parts(intent:Intent):RequestPart[]{return intent.requests??[]}
export function topics(intent:Intent){return [...new Set(parts(intent).length?parts(intent).map(p=>p.topic):[intent.topic])]}
// This boundary runs before inference. A conversational claim never enables a
// private lookup. Only a remaining public clause can enter the ordinary engine.
export function publicQuestion(question:string){
  if(!privateRequest(question))return{question,restricted:false};
  if(/\.env\b|api.?key|system.?prompt|system message|hidden|source ledger|source archive|maintainer|original files|previous customer|previous chats|ignore|override|base64|rot13|private.*(?:record|email|correspondence)/i.test(question))return{question:'',restricted:true};
  const clauses=question.split(/[?;]|(?<=[.!])\s+(?=[A-Z])|,?\s+\b(?:and|or|also)\b\s+/i).map(s=>s.trim()).filter(Boolean);
  const safe=clauses.filter(s=>!privateRequest(s)&&/\b(?:home|housing|kit|built|build|design|quote|quotation|cost|price|deliver|scope|includ|warehouse|project|warrant|assembl)\w*\b/i.test(s));
  return{question:safe.join('; ').slice(0,1200),restricted:true};
}
export const confidentialityNotice='We keep manufacturing partner identities and private commercial information confidential.';
export const chatLimits={id:'CHAT-LIMITS',data:{text:'This text assistant can explain public housing information and prepare a visitor-reviewed project brief. It cannot issue binding quotations, enter contracts, confirm production capacity, submit permits, verify code certification, or confirm an unlisted product capability. A project team must confirm project-specific scope and capabilities. Unknown availability is not evidence that a product is unavailable.'},sourceIds:[] as string[]};
export function cmhcRelevant(intent:Intent,question:string,modelIds:string[]){
  return /\bCMHC\b|pre.reviewed|catalogue|catalog/i.test(question)||modelIds.some(id=>knowledge.models.some(m=>m.id===id&&m.family==='cmhc_catalogue'))&&intent.modelContext==='follow_up';
}
export function ordinarySynthesis(intent:Intent,question:string){
  if(['arithmetic','summary'].includes(intent.topic))return false;
  // Keep deterministic commercial arithmetic, unresolved published conflicts,
  // explicit guarantees and actual action outcomes. Ordinary explanations use
  // the same grounded LLM regardless of the wording or number of requests.
  return !/blended|mixed[ -]tier|per residence|per side|both sources?|which one.*trust|(?:page|drawing).*discrepancy|did you send|have you sent|share only|tell the team|can you save|save it|save that|reserve.*confirm|\b25 years\b|\$99|new approved rate|catalog.*(?:always|default)/i.test(question);
}

export function planningReferences(tiers:string[]){
  if(tiers.length>2||new Set(tiers).size!==tiers.length||tiers.some(t=>!['Premium','Signature'].includes(t)))throw Error('Invalid public rate reference');
  const rule=knowledge.price_rules.find(r=>r.id==='PR-SALT-DISPLAY')!;
  return tiers.length?'Home-package planning references — '+tiers.map(t=>`${t}: ${rule.currency} $${t==='Premium'?rule.premium_rate_per_sqft:rule.signature_rate_per_sqft} per square foot`).join('; ')+'. ':'';
}
