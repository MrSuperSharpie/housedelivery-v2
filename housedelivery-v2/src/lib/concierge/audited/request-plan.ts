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
 requests=requests.map(r=>({...r,policyIds:relevantPolicyIds(r,question,state)}));
 return{...raw,topic,requests,unconfirmedProduct,modelContext};
}

// Relevance is checked against the visitor's actual turn, not an invented subquestion.
export function relevantPolicyIds(request:NonNullable<Intent['requests']>[number],question:string,state:State){
 const q=question,rate=planningRatesEligible(request);
 return [...new Set(request.policyIds??[])].filter(id=>{
  if(!policyIndex.has(id))return false;
  switch(id){
   case 'finish_tiers':return /compare|differ|versus|\bvs\b|between|tiers?|levels?|finish options/i.test(q)&&/Essential|Premium|Signature|tiers?|levels?/i.test(q);
   case 'pricing_scope':return rate;
   case 'freight_quotation':return /freight|shipping|deliver|logistics|transport/i.test(q)&&(request.pricing==='freight'||/freight|shipping|deliver|logistics|transport/i.test(request.question));
   case 'package_scope':return /includ|contents|contain|consist|supplied materials|what.*(?:package|kit)|how.*(?:package|kit).*work/i.test(q)&&!rate;
   case 'local_work':return !rate&&/local work|arrang.*locally|source locally|foundation|site work|assembl|exclu|not included|responsibilit|who.*(?:build|construct)/i.test(q);
   case 'written_scope':return /record|responsibilit|written scope|who.*(?:handle|supply)|(?:my|our) (?:contractor|crew).*(?:handle|supply)|we.*(?:provide|supply)/i.test(q);
   case 'builder_collaboration':return /(?:do|can|would|will) you.*work|work with|coordinat.*(?:builder|contractor)|collaborat|partner with|what would you coordinate/i.test(q);
   case 'program_phasing':return Boolean(stateValue(state,'homes')&&stateValue(state,'homes')!>1)&&/homes|units|program|phase|groups|development|assess/i.test(q);
   case 'project_review':return /next|start|begin|assess|review|what.*need|how.*proceed/i.test(q);
   case 'design_changes':return /adjust|chang|customiz|modif|reconfigur|keeping.*architectur/i.test(q);
   case 'studio_lookbook':return /Studio|Look.?Book|design directions?|save.*design/i.test(q);
   case 'plant_visit':return /visit|inspect|tour|access/i.test(q)&&/plant|factor|manufactur|production facility/i.test(q);
   case 'engineering_documents':return /engineering|technical|spec(?:ification)?|document|drawing/i.test(q)&&/sheet|document|drawing|release|review|access|get|availab/i.test(q);
   case 'factory_confidentiality':return /factor|manufactur|supplier|partner/i.test(q)&&/identit|name|who|records?|confidential|private/i.test(q);
   case 'technical_review':return /code|compliance|permit|certificat|rating|standards?|engineering requirements/i.test(q);
   case 'cmhc_reference':return /CMHC|pre.reviewed|catalogue|catalog/i.test(q);
   case 'manufacturing_approach':return /how.*(?:built|manufactur|construct)|Canada|Canadian|domestic|import|overseas|modular|construction system/i.test(q);
   case 'appliances':return /appliance/i.test(q);
   case 'warranty':return /warrant|aftercare|defect/i.test(q);
   default:return true;
  }
 });
}
