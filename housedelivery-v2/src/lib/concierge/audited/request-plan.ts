import type {Intent} from './intent';
import type {State} from './state';
import {stateValue} from './state';
import {policyIndex} from './policies';
export type RequestPricing='none'|'planning_rates'|'freight'|'project_quote';
export function planningRatesEligible(request:NonNullable<Intent['requests']>[number],unconfirmedProduct=false,hasPriceEvidence=true){
 const freightOnly=/freight|shipping|delivery|deliver/i.test(request.question)&&!/(?:published|planning|package)\s+(?:planning\s+)?(?:rates?|prices?)|per\s+(?:sq|square)|\/\s*(?:sq|sf)/i.test(request.question);
 return !freightOnly&&request.topic==='pricing'&&request.pricing==='planning_rates'&&!unconfirmedProduct&&hasPriceEvidence;
}
export function normalizeIntent(raw:Intent,question:string,state:State):Intent{
 const nonHousing=/\b(?:warehouse|industrial shed|industrial building|commercial warehouse)\b/i.test(question);
 const housing=/\b(?:home|homes|house|housing|residen\w*|dwelling\w*|ADU|laneway|carriage)\b/i.test(question);
 const unconfirmedProduct=nonHousing||Boolean(raw.unconfirmedProduct&&!housing);
 let requests=(raw.requests??[]).map(r=>{
  const publishedRate=r.topic==='pricing'&&/\brate|rates\b|per (?:sq|square)/i.test(r.question)&&/published|planning|package|Premium|Signature|per (?:sq|square)/i.test(r.question);
  return{...r,policyIds:(r.policyIds??[]).filter(id=>policyIndex.has(id)),pricing:(publishedRate?'planning_rates':r.pricing??'none') as RequestPricing};
 });
 const designAsk=/\b(?:which|recommend|suggest|show)\b[^?]{0,100}\b(?:designs?|homes?|models?)\b/i.test(question);
 const program=Boolean(stateValue(state,'homes'))&&/contractor|builder|developer|municip|Nation|institution/i.test((stateValue(state,'role')??'')+' '+(stateValue(state,'audience')??''));
 let topic=raw.topic;
 if(designAsk&&requests.length===1){requests=requests.map(r=>({...r,topic:'matching' as const,policyIds:[],pricing:'none' as const}));topic='matching';}
 if(program&&!designAsk&&topic==='matching'){topic=/contractor|builder/i.test(stateValue(state,'role')??'')?'builder':'community';requests=requests.map(r=>r.topic==='matching'?{...r,topic,policyIds:r.policyIds.length?r.policyIds:['builder_collaboration','program_phasing']}:r);}
 const named=stateValue(state,'selectedModel');let modelContext=raw.modelContext;
 if(named&&/\b(?:home we discussed|that home|that design|the model|the home|it|those priorities)\b/i.test(question))modelContext='follow_up';
 return{...raw,topic,requests,unconfirmedProduct,modelContext};
}
