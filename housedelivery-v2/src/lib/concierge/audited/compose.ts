import {recommendationCard,matchingIntroduction} from './recommendations';
import {guidanceContinuation,pendingLocation,inheritFinanceGuidance} from './guidance';
import {structured,objectSchema,type InferenceContext} from './llm';
import {knowledge,modelIndex,factIndex,sourceIndex,safeLink} from './registry';
import {retrieve,modelLine,modelLink,type Evidence} from './evidence';
import {controlledAnswer} from './commercial';
import {stateValue,conversationContext,projectSummary,visitorNumbers,type State,mergePatch,deterministicPatch,namedModels,hasMatchPreferences} from './state';
import {extractIntent,type Intent} from './intent';
import {comparisonLimit,inheritComparisonLimits,finalizeComparisonAnswers} from './comparison';
import {questionForAnswer,continuesQuestion} from './continuity';
import {publicFactContent,handbookInstructions,containsInternalInstruction} from './publication';
import {handbookRelease} from './handbook';
import {policyIndex,renderPolicies} from './policies';
import {planningRatesEligible,relevantPolicyIds} from './request-plan';
import {publicQuestion,confidentialityNotice,identityConditionNotice,facilityLocationNotice,certificationReviewGuidance,ordinarySynthesis,planningReferences,parts,topics,type RequestPart} from './response-plan';
import {type ConciergeReply,type Fact} from '../contracts';
export type Action='none'|'browse_designs'|'studio'|'lookbook'|'property_review'|'consultation'|'summary';
export type NaturalAnswer={answerSegments:{text:string;evidenceRefs:string[];requestId?:string}[];selectedModelIds:string[];nextQuestion:string|null;nextAction:Action};
const actions=['none','browse_designs','studio','lookbook','property_review','consultation','summary'];
type PlannedAnswer={answers:Record<string,{text:string;evidenceRefs:string[];planningRates?:string[]}>;selectedModelIds:string[];nextQuestion:string|null;nextAction:Action};
export function outputSchema(ids:string[],models:string[],detail=false,requests:RequestPart[]=[],unconfirmedProduct=false){
  const segment=(request?:RequestPart)=>objectSchema({text:{type:'string',minLength:1,maxLength:650},evidenceRefs:{type:'array',minItems:1,maxItems:4,items:{enum:ids}},...(request&&planningRatesEligible(request,unconfirmedProduct,ids.includes('F-PRICE'))?{planningRates:{type:'array',maxItems:2,items:{enum:['Premium','Signature']}}}:{})});
  const rest={selectedModelIds:{type:'array',maxItems:models.length?2:0,items:{enum:models.length?models:['none']}},nextQuestion:{type:['string','null'],maxLength:180},nextAction:{enum:actions}};
  return requests.length?objectSchema({answers:objectSchema(Object.fromEntries(requests.map(r=>[r.id,segment(r)]))),...rest}):objectSchema({answerSegments:{type:'array',minItems:1,maxItems:detail?4:3,items:segment()},...rest});
}
export function requestAnswer(segment:{text:string;evidenceRefs:string[];planningRates?:string[]},request:RequestPart,ids:string[],unconfirmedProduct=false,ctx?:InferenceContext){
  if(/\$|\b(?:CAD|USD|EUR|GBP)\b\s*\d|\b\d[\d,.]*\s*(?:CAD|USD|EUR|GBP)\b/i.test(segment.text)){if(ctx){ctx.rejections??=[];ctx.rejections.push('free_form_money');}return null;}
  const eligible=planningRatesEligible(request,unconfirmedProduct,ids.includes('F-PRICE'));
  if(!eligible&&segment.planningRates?.length){if(ctx){ctx.rejections??=[];ctx.rejections.push('ineligible_rate_reference_ignored');}}
  const rates=eligible?segment.planningRates??[]:[];
  return{text:planningReferences(rates)+segment.text,evidenceRefs:rates.length?[...new Set(['F-PRICE','F-SCOPE',...segment.evidenceRefs])].slice(0,4):segment.evidenceRefs,requestId:request.id};
}

export function compilePolicyAnswers(requests:RequestPart[],state:State,question:string,evidenceIds:string[],unconfirmedProduct=false){
 requests=inheritFinanceGuidance(inheritComparisonLimits(requests,question),question,requests.find(r=>r.guidanceStage)?.guidanceStage);
 const groups=new Map<string,{requests:Set<string>;rates:Set<string>}>();
 for(const request of requests){
  const rate=planningRatesEligible(request,unconfirmedProduct,evidenceIds.includes('F-PRICE'));
  const ids=relevantPolicyIds(request,question,state);
  if(rate)ids.unshift('pricing_scope');
  for(const id of new Set(ids)){
   const group=groups.get(id)??{requests:new Set<string>(),rates:new Set<string>()};group.requests.add(request.id);
   if(id==='pricing_scope'&&rate){
    const tiers=['Premium','Signature'].filter(t=>new RegExp('\\b'+t+'\\b','i').test(request.question));
    const selected=tiers.length?tiers:/\brates?\b/i.test(request.question)?['Premium','Signature']:['Premium','Signature'].filter(t=>t===stateValue(state,'finish'));
    for(const tier of selected.length?selected:['Premium','Signature'])group.rates.add(tier);
   }
   groups.set(id,group);
  }
 }
 const rows=renderPolicies([...groups.keys()],state,question,requests.find(r=>r.guidanceStage)?.guidanceStage);
 const segments:NaturalAnswer['answerSegments']=rows.map(row=>({text:planningReferences(['Premium','Signature'].filter(t=>groups.get(row.id)!.rates.has(t)))+row.text,evidenceRefs:row.evidenceRefs,requestId:[...groups.get(row.id)!.requests][0]}));
 const records=rows.flatMap(row=>[...groups.get(row.id)!.requests].map(requestId=>({requestId,id:row.id,status:row.status})));
 return{segments,records,requests,limitedRequestIds:requests.filter(r=>r.comparisonLimit||r.guidanceStage).map(r=>r.id),answeredRequestIds:[...new Set(records.map(r=>r.requestId))]};
}

function publicRates(text:string,evidence:Evidence[]){
  if(!evidence.some(e=>e.id==='F-PRICE')||!/[Pp]lanning|reference|indicative/.test(text)||!/\bCAD\b/.test(text)||/\b(?:USD|EUR|GBP)\b/.test(text))return false;
  const rule=knowledge.price_rules.find(r=>r.id==='PR-SALT-DISPLAY')!;
  const amounts=[...text.matchAll(/\bCAD\s*\$?\s*([\d,.]+)|\$\s*([\d,.]+)/g)].map(m=>Number((m[1]??m[2]).replaceAll(',','')));
  if(!amounts.length||amounts.some(n=>![rule.premium_rate_per_sqft,rule.signature_rate_per_sqft].includes(n)))return false;
  if(amounts.includes(Number(rule.premium_rate_per_sqft))&&!new RegExp('Premium[^.!?]{0,55}(?:CAD\\s*)?\\$?\\s*'+rule.premium_rate_per_sqft+'\\b','i').test(text))return false;
  if(amounts.includes(Number(rule.signature_rate_per_sqft))&&!new RegExp('Signature[^.!?]{0,55}(?:CAD\\s*)?\\$?\\s*'+rule.signature_rate_per_sqft+'\\b','i').test(text))return false;
  return true;
}
function validText(text:string){return !/[<>]|https?:|www\.|\b(?:PRIVATE_[A-Z_]+|service_role|api.?key)\b/i.test(text)&&text.length<=650&&/[.!?…][’”"']?$/.test(text.trim())}
function numericSupport(text:string,evidence:Evidence[],state?:State){
  const allowed=new Set(JSON.stringify(evidence.map(e=>e.id.startsWith('H:')?(e.data as {facts:string[]}).facts:e.data)).match(/\d+(?:\.\d+)?/g)??[]);
  const visitor=visitorNumbers(state),normalized=text.replaceAll(',','');
  return [...normalized.matchAll(/\d+(?:\.\d+)?/g)].every(match=>allowed.has(match[0])||visitor.has(match[0])&&/your|target|requirement|requested|looking for|proposed|planning|discuss|review|program|phase|community|Nation/i.test(normalized.slice(Math.max(0,match.index!-65),match.index)));
}
// The approved release has no like-for-like material-price/schedule comparison.
// General manufacturing/coordination facts cannot authorize a relative benefit.
function unsupportedSystemComparison(text:string,evidence:Evidence[]){
 if(!evidence.some(e=>['F-SYSTEMS','F-ORIGIN','H:systems','H:value','H:cost'].includes(e.id)))return false;
 return text.split(/(?<=[.!?])\s+/).some(sentence=>
  /steel|timber|wood|fram(?:e|ing)|local builders?|traditional construction|manufactur/i.test(sentence)&&
  /cheaper|more expensive|less expensive|costs? (?:more|less)|faster|slower|savings|save(?:s)? (?:money|time)|less waste|(?:less|more) efficient|(?:higher|lower) (?:cost|price)/i.test(sentence)&&
  !/cannot (?:establish|confirm|compare)|can’t (?:establish|confirm|compare)|not established|not confirmed|no (?:verified|confirmed|like.for.like)|requires? .*compar|need.*(?:comparison|quotation|evidence)/i.test(sentence));
}
export function naturalRejection(answer:NaturalAnswer,evidence:Evidence[],allowedModels:string[],declined:boolean,state?:State,requests:RequestPart[]=[]){
  const limited=new Set(requests.filter(r=>r.comparisonLimit||r.guidanceStage).map(r=>r.id));
  if(answer.answerSegments.some(s=>s.requestId&&limited.has(s.requestId)))return 'comparison_evidence_required';
  const ids=new Set(evidence.map(e=>e.id));
  const scopedModels=allowedModels.map(id=>modelIndex.get(id)).filter(m=>Boolean(m));
  const wrongTier=(text:string)=>scopedModels.length>0&&(scopedModels.every(m=>m!.family==='architectural')&&/\bEssential\b/i.test(text)&&!/(?:Essential.{0,35}(?:not|isn't)|(?:not|isn't).{0,35}Essential)/i.test(text)||scopedModels.every(m=>m!.family!=='architectural')&&/\bSignature\b/i.test(text)&&!/(?:Signature.{0,35}(?:not|isn't)|(?:not|isn't).{0,35}Signature)/i.test(text));
  const unsupportedBathRelationship=(text:string)=>{if(!/bedrooms?.{0,18}each.{0,35}bath|(?:each|every) bedroom.{0,45}(?:own|private|en.?suite).{0,12}bath|private bathrooms?.{0,20}(?:each|every)/i.test(text)||/cannot confirm|can't confirm|not confirmed|not established|does not establish|cannot infer/i.test(text))return false;const mentioned=namedModels(text),relevant=scopedModels.filter(m=>!mentioned.length||mentioned.includes(m!.id));return !relevant.length||!relevant.every(m=>m!.features.some(f=>/each.{0,35}(?:private|own|en.?suite).{0,12}bath|all bedrooms.{0,35}en.?suite/i.test(f)));};

  if(answer.answerSegments.length>4||answer.selectedModelIds.some(id=>!allowedModels.includes(id)))return 'unknown_model';
  for(const seg of answer.answerSegments){const rateStatement=publicRates(seg.text,evidence);if(containsInternalInstruction(seg.text))return 'internal_instruction';if(unsupportedSystemComparison(seg.text,evidence))return 'unsupported_comparison';if(/\baudited\b|\bregistry\b|source IDs?|knowledge (?:base|snapshot)|observed[^.!?]{0,55}(?:display|controls)|controlled (?:record|registry)|\bJSON\b/i.test(seg.text))return 'internal_language';if(/\bCMHC\b/i.test(seg.text)&&!evidence.some(e=>e.id==='F-CMHC'))return 'unrelated_cmhc';if(/contractor|builder/i.test(stateValue(state??({values:{}} as State),'role')??'')&&/your (?:existing |local )?(?:builder|general contractor)\b/i.test(seg.text))return 'wrong_actor';if(evidence.some(e=>e.id==='CAPABILITY-LIMIT')&&/(?:we|House Delivery) (?:do not|don't|does not|doesn't) (?:offer|provide|supply)|(?:warehouse|commercial).{0,30}not (?:offered|available)/i.test(seg.text))return 'unconfirmed_capability';if(/\b(?:internal|living|conditioned)\s+(?:floor\s+)?(?:area|space)\b/i.test(seg.text)&&/larger|smaller|more space|less space/i.test(seg.text)&&scopedModels.some(m=>m!.internal_area_sqft_approx===undefined))return 'incomparable_area_basis';if(/suitable.{0,65}mobility|ease of access|easy access|step.free|barrier.free|wheelchair.accessible/i.test(seg.text)&&scopedModels.length&&!/review|check|assess|confirm|cannot|can't|does not establish|not established/i.test(seg.text))return 'unsupported_accessibility';if(unsupportedBathRelationship(seg.text))return 'unsupported_layout_relationship';if(/\b(?:excludes?|excluded|not included|does not include)\b[^.!?]{0,220}\b(?:site|foundation|assembly|completion|appliance|tax|permit|engineering)/i.test(seg.text)&&!/unless|expressly included|written (?:scope|quotation|quote)|agreed scope|typically|generally/i.test(seg.text))return 'scope_qualification';if(wrongTier(seg.text))return 'wrong_tier_family';if(namedModels(seg.text).some(id=>!ids.has(id)))return 'unknown_model';if(!validText(seg.text))return 'invalid_text';if(seg.evidenceRefs.some(id=>!ids.has(id)))return 'unknown_evidence';if(!numericSupport(seg.text,evidence.filter(e=>seg.evidenceRefs.includes(e.id)),state))return 'unsupported_number';
    if(/\bconditioned\b|\b(?:internal|living|chargeable)\s+(?:floor\s+)?(?:area|space)\b/i.test(seg.text)&&evidence.some(e=>modelIndex.get(e.id)?.area_basis==='published_model_area_conditioned_basis_not_confirmed'))return 'wrong_area_basis';
    if(/\bADU\b|laneway|carriage/i.test(seg.text)&&evidence.some(e=>modelIndex.get(e.id)?.family==='architectural')&&!evidence.some(e=>{const m=modelIndex.get(e.id);return m&&m.family!=='architectural'}))return 'wrong_family';
    if(/\bwe\s+(?:can\s+|will\s+)?(?:deliver|reserve|guarantee|allocate|produce)\s+\d/i.test(seg.text))return 'capacity_claim';
    if(/\bnot (?:standard|offered)\b|not available (?:as|for|in|with)/i.test(seg.text))return 'unsupported_availability';
    if(/\b(?:island|wardrobe)\b/i.test(seg.text)&&/\bstructural (?:element|modification|change)/i.test(seg.text))return 'structural_claim';
    if(!rateStatement&&(/\b\d[\d,.]*\s*(?:per\s+(?:sq|square)|\/\s*(?:sq|sf))|\bblended (?:amount|price|cost|total)\b/i.test(seg.text)||evidence.some(e=>e.id==='F-PRICE')&&/\b(?:250|300)\b/.test(seg.text)))return 'uncontrolled_price';
    if(/\b(?:includes?|included|covers?|covered)\b[^.!?]{0,80}\b(?:freight|import costs?)\b|\b(?:freight|import costs?)\b[^.!?]{0,30}\b(?:is|are) (?:included|excluded|covered)\b/i.test(seg.text))return 'freight_scope';
    // Commercial numbers and authorizations use server-controlled rendering.
    if(!rateStatement&&/\$|\b(?:CAD|USD|EUR|GBP|dollars?)\b/i.test(seg.text)||/\b(?:reserved for you|has been sent|submitted your|funding is approved|guaranteed permit)\b/i.test(seg.text))return 'private_or_authorization';
  }
  if(answer.nextQuestion&&containsInternalInstruction(answer.nextQuestion))return 'internal_instruction_follow_up';
  if(answer.nextQuestion&&(wrongTier(answer.nextQuestion)||unsupportedBathRelationship(answer.nextQuestion)||namedModels(answer.nextQuestion).some(id=>!ids.has(id))||!validText(answer.nextQuestion)||(answer.nextQuestion.match(/\?/g)??[]).length>1||declined&&/email|phone|contact|share.*brief|personal review/i.test(answer.nextQuestion)))return 'invalid_follow_up';
  return null;
}
export function validateNatural(answer:NaturalAnswer,evidence:Evidence[],allowedModels:string[],declined:boolean,state?:State){return naturalRejection(answer,evidence,allowedModels,declined,state)===null;}
async function grounded(answer:NaturalAnswer,evidence:Evidence[],state:State,ctx:InferenceContext,question:string,requests:RequestPart[],allRequests:RequestPart[]=requests):Promise<NaturalAnswer|null>{
 const issues=['unsupported_claim','wrong_model','wrong_unit_basis','wrong_numeric_value','false_authorization','private_identity','unrelated','incomplete_qualification','none'];
 const result=await structured<{segments:{index:number;supported:boolean;issues:string[]}[];followUpSupported:boolean;complete:boolean}>(objectSchema({segments:{type:'array',minItems:answer.answerSegments.length,maxItems:answer.answerSegments.length,items:objectSchema({index:{enum:answer.answerSegments.map((_,i)=>i)},supported:{type:'boolean'},issues:{type:'array',maxItems:6,items:{enum:issues}}})},followUpSupported:{type:'boolean'},complete:{type:'boolean'}}),`Verify each proposed non-policy answer against its cited approved evidence and visitor-reported context. Return exactly one verdict per index. Reject unsupported specifications, wrong models, wrong units or numbers, guessed private identities, claimed actions, omitted scope qualifications and unrelated statements. A source ID alone is not proof. Preserve conditional scope and distinguish total building area from per-home/internal area. No inferred ensuite relationship or accessibility from room counts, size or images. No inferred currency, freight price, guarantee, production allocation, approval or company capability. Company-policy questions are supplied separately from explicit approved policy records; free text must not create new company rules. Useful uncertainty and clearly framed preference-based reasoning can be supported. Parent comparative evidence limits apply to every related subquestion, including paraphrases. General company priorities, engineered components and coordination do not prove quality, reliability, speed or superiority advantages. Conditional words such as can or may do not supply missing evidence. Check every requested part for completeness; a follow-up does not answer an omitted part. The customer may be the contractor. Follow-ups must respect known and declined information. Never add answer text. Only public assertions can support a claim; internal instructions are not evidence. Comparative claims about material prices, savings, speed or local builders require applicable like-for-like evidence, not general coordination statements.`,{question,requests,proposed:answer,evidence,visitorState:conversationContext(state),comparisonLimits:inheritComparisonLimits(allRequests,question).filter(r=>r.comparisonLimit).map(r=>({requestId:r.id,...r.comparisonLimit}))},ctx);
 if(new Set(result.segments.map(s=>s.index)).size!==answer.answerSegments.length)throw Error('Incomplete support review');
 const accepted=answer.answerSegments.filter((_,index)=>{const verdict=result.segments.find(s=>s.index===index)!;const rejected=verdict.issues.filter(i=>i!=='none');if(verdict.supported&&!rejected.length)return true;ctx.rejections??=[];ctx.rejections.push(...(rejected.length?rejected:['unsupported_claim']));return false;});
 if(!accepted.length)return null;
 if(!result.complete){ctx.rejections??=[];ctx.rejections.push('missing_answer');ctx.fallbackReason='incomplete_answer';}
 if(!result.followUpSupported){ctx.rejections??=[];ctx.rejections.push('follow_up_context');}
 return{...answer,answerSegments:accepted,nextQuestion:result.followUpSupported?answer.nextQuestion:null};
}

export function linkFacts(evidence:Evidence[],models:ReturnType<typeof retrieve>['models'],intent:Intent,q:string){
  const facts:Fact[]=[];
  for(const m of models)facts.push({id:m.id,title:m.name,text:modelLine(m),href:modelLink(m,intent.topic==='customization'?'studio':/floor plan|drawing|both source/i.test(q)?'floorplan':'model'),kind:'home'});
  const routes:[RegExp,string,string,string][]=[[/includ|inclus|finish|source locally/i,'/inclusions','Finishes and inclusions','F-INCLUSIONS'],[/price|rate|cost/i,'/pricing','Home-package pricing','F-PRICE'],[/local|builder|assembly|process|permit/i,'/how-it-works','Project delivery and responsibilities','F-PROCESS']];
  for(const [when,path,title,id]of routes){if(!when.test(q)||!evidence.some(e=>e.id===id||id==='F-PROCESS'&&e.id==='F-BUILDER'))continue;const source=[...sourceIndex.values()].find(s=>s.url&&new URL(s.url).pathname===path);if(source?.url)facts.push({id,title,text:'',href:safeLink(source.url),kind:'source'});}
  if(/both source|which one.*trust/i.test(q))for(const m of models)if(m.floor_plan_url)facts.push({id:m.id,title:m.name+' — floor plans',text:'',href:modelLink(m,'floorplan'),kind:'source'});
  return [...new Map(facts.map(f=>[f.href,f])).values()].slice(0,3);
}
export type AnswerResult={reply:ConciergeReply;state:State;sourceIds:string[];mode:'generated'|'controlled'|'reviewed_fallback'|'boundary'};
export async function answerQuestion(question:string,state:State,ctx:InferenceContext):Promise<AnswerResult>{
  ctx.now??=Date.now();
  if(state.boundaryOffer==='public_manufacturing_approach'&&/^(?:please|yes(?: please)?|sure|go ahead|please do)[.!\s]*$/i.test(question.trim())){
    const next=mergePatch(state,{},question,ctx.now);delete next.boundaryOffer;next.lastQuestion='';delete next.pendingQuestion;next.lastTopic='origin';
    const rows=renderPolicies(['manufacturing_approach','structural_options'],next);next.lastEvidenceRefs=[...new Set(rows.flatMap(r=>r.evidenceRefs))];
    return{reply:{introduction:'',facts:[],answerSegments:rows.map(r=>({text:r.text,evidenceRefs:r.evidenceRefs})),question:'',next:'none',disposition:'answer',nextAction:'none',proposedSummary:projectSummary(next),knowledgeVersion:knowledge.knowledge_version},state:next,sourceIds:[...new Set(rows.flatMap(r=>r.evidenceRefs.flatMap(id=>factIndex.get(id)?.source_ids??[])))],mode:'controlled'};
  }
  if(state.boundaryOffer){state={...state};delete state.boundaryOffer;}
  const boundary=publicQuestion(question,Boolean(state.restrictedTopic)),manufacturingRestricted=boundary.restricted&&/factor|manufactur|supplier|frame|kit|partner/i.test(question);
  const boundaryState=()=>{const next=mergePatch(state,{},'',ctx.now);next.lastQuestion='';delete next.pendingQuestion;delete next.activeQuestion;next.activeUpdates=[];next.activeRequests=[];next.lastTopic='origin';next.lastEvidenceRefs=[];if(boundary.privateFacility)next.restrictedTopic='manufacturing_location';else if(manufacturingRestricted||boundary.identityCondition)next.restrictedTopic=state.restrictedTopic??'manufacturing_partner';return next;};
  if(boundary.privateFacility&&!boundary.question){
    const next=boundaryState();
    const guidance=/\bISO\b|certific|accredit|compliance|due diligence/i.test(question)?certificationReviewGuidance:'I can help explain the public manufacturing approach and the project-specific technical review process.';
    return{reply:{introduction:'',facts:[],answerSegments:[{text:boundary.identityCondition?identityConditionNotice:facilityLocationNotice,evidenceRefs:[]},...(!boundary.identityCondition||/certific|ISO/i.test(question)?[{text:guidance,evidenceRefs:[]}]:[])],question:'',next:'none',disposition:'answer',nextAction:'none',knowledgeVersion:knowledge.knowledge_version},state:next,sourceIds:[],mode:'boundary'};
  }
  if(boundary.restricted&&boundary.publicOrigin&&!boundary.question){
    const origin=factIndex.get('F-ORIGIN')!,next=boundaryState();next.lastEvidenceRefs=[origin.id];next.restrictedTopic='manufacturing_partner';
    return{reply:{introduction:'',facts:[],answerSegments:[{text:origin.text,evidenceRefs:[origin.id]},{text:boundary.identityCondition?identityConditionNotice:confidentialityNotice,evidenceRefs:[]}],question:'',next:'none',disposition:'answer',nextAction:'none',knowledgeVersion:knowledge.knowledge_version},state:next,sourceIds:origin.source_ids,mode:'boundary'};
  }
  if(boundary.restricted&&!boundary.question){
    const next=boundaryState();if(manufacturingRestricted&&!boundary.identityCondition)next.boundaryOffer='public_manufacturing_approach';
    return{reply:{introduction:'',facts:[],answerSegments:[{text:boundary.identityCondition?identityConditionNotice:confidentialityNotice+' I can explain the construction system, general sourcing approach and Canadian assembly responsibilities.',evidenceRefs:[]}],question:'',next:'none',disposition:'human',nextAction:'none',knowledgeVersion:knowledge.knowledge_version},state:next,sourceIds:[],mode:'boundary'};
  }
  question=boundary.question;
  if(/\bfetch\b.*https?:|open.*example\.invalid|send.*private.*(?:url|site)/i.test(question))return{reply:{introduction:'',facts:[],answerSegments:[{text:'I can answer from House Delivery’s public product information, but this chat does not browse arbitrary websites or send data to external destinations.',evidenceRefs:[]}],question:'',next:'none',disposition:'answer',nextAction:'none',knowledgeVersion:knowledge.knowledge_version},state:mergePatch(state,{},question),sourceIds:[],mode:'boundary'};
  let intent:Intent,next:State,fallback=false;
  try{const extracted=await extractIntent(question,state,ctx);intent=extracted.intent;next=extracted.state}
  catch{fallback=true;next=mergePatch(state,{},question);intent={topic:/\$|price|rate|cost|budget/i.test(question)?'pricing':/bed|sq|sf|main.level/i.test(question)?'matching':'clarify',factIds:['F-START'],modelIds:[],modelContext:'none',questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false}}
  const visitorQuestion=question;
  const explicit=deterministicPatch(question,state,ctx.now);
  question=questionForAnswer(question,state);
  const summaryRequested=/\bsummari[sz]e\b|\bproject (?:brief|summary)\b/i.test(question);
  if(summaryRequested)intent.topic='summary';
  if(namedModels(question).length&&/compare|versus|\bvs\b|difference/i.test(question))intent.topic='comparison';
  if(namedModels(question).length&&/^(?:tell me about|describe)\b/i.test(question)&&!/kitchen|finish|studio|price|cost|warranty|delivery|system|process|custom|look.?book|floor plan/i.test(question))intent.topic='specifications';
  if(/municip|institution|Nation|Indigenous|developer|non.?profit/i.test((stateValue(next,'audience')??'')+' '+(stateValue(next,'role')??''))&&['company','property','process','clarify',...(!stateValue(next,'selectedModel')&&!namedModels(question).length?['customization']:[])].includes(intent.topic)&&!/property (?:check|review)|check.*property|zoning/i.test(question))intent.topic='community';
  if(intent.topic==='matching'&&/municip|institution|Nation|Indigenous|developer|non.?profit/i.test((stateValue(next,'audience')??'')+' '+(stateValue(next,'role')??''))&&!namedModels(question).length&&!['bedrooms','bedroomOptions','areaTarget','areaMax','areaMin','bathroomsMin','storeys','study','unitsPerBuilding'].some(k=>Object.hasOwn(explicit,k))&&!/recommend|which.*(?:home|design|model)|show.*(?:home|design|model)/i.test(question))intent.topic='community';
  if(['scope','pricing','matching'].includes(intent.topic)&&/municip|institution|Nation|Indigenous|developer|non.?profit/i.test((stateValue(next,'audience')??'')+' '+(stateValue(next,'role')??''))&&/plan|phase|program|homes|rentals/i.test(question)&&!/scope|includ|exclud|package|finish|material|assembly|construction|foundation|appliance|price|cost|rate|quotation|\$/i.test(question)&&!namedModels(question).length&&!['bedrooms','bedroomOptions','areaTarget','areaMax','areaMin','bathroomsMin','storeys','study','unitsPerBuilding'].some(k=>Object.hasOwn(explicit,k)))intent.topic='community';
  if(state.lastEvidenceRefs?.includes('F-CATALOG-CONFLICTS')&&stateValue(state,'selectedModel')&&/which (?:one|source).*trust|both sources?|show.*sources?/i.test(question))intent.topic='specifications';
  if(/Essential|Premium|Signature/i.test(question)&&/differ|compare|difference|which tier/i.test(question))intent.topic='customization';
  if(/funding|grant/i.test(question)&&!/price|cost|rate|quotation/i.test(question))intent.topic='community';
  if(/what (?:would|do|will) you coordinate/i.test(question))intent.topic='builder';
  if(/(?:we|our team|I).*(?:supply|provide).*appliances/i.test(question))intent.topic='scope';
  if(/architect|change.*floor plan|add.*bedroom|change.*layout/i.test(question))intent.topic='customization';
  if(/\b(?:manufacturing|manufactured|factory|framing|frame)\b/i.test(question)&&!/Look.?Book|Studio|design direction/i.test(question)&&!/price|cost|rate|quotation|\$/i.test(question))intent.topic='origin';
  const systemComparison=Boolean(comparisonLimit(question));
  const arithmeticRequested=/times|multiplied by|\bdivide\b|×|\d\s*[x*]\s*\$?\d|(?:at|use)\s*\$(?:250|300)\b/i.test(question);
  if(arithmeticRequested)intent.topic='arithmetic';
  if(!systemComparison&&!(stateValue(next,'homes')&&/contractor|builder|developer|municip|Nation|institution/i.test((stateValue(next,'role')??'')+' '+(stateValue(next,'audience')??'')))&&intent.topic!=='arithmetic'&&!/price|rate|\$|multipl|times|divide|per side|per residence/i.test(question)&&(!namedModels(question).length||/want|need|looking|closest|around|about|maximum/i.test(question))&&['bedrooms','bedroomOptions','areaTarget','areaMax','areaMin','bathroomsMin','storeys','study'].some(k=>Object.hasOwn(explicit,k)))intent.topic='matching';
  if(/price|\brate\b|quotation|turnkey|shipping|freight|whole project cost|blended|mixed[ -]tier|exact.*(?:amount|total)|new approved|\$\d/i.test(question)&&!arithmeticRequested&&intent.topic!=='warranty')intent.topic='pricing';
  if(systemComparison)intent.topic='pricing';
  const result=retrieve(intent,next,question),controlled=ordinarySynthesis(intent,question)?null:controlledAnswer(question,intent,next,result.models),declined=stateValue(next,'declinedContact')===true;
  ctx.retrieval={releaseId:handbookRelease.id,sectionIds:result.evidence.filter(e=>e.id.startsWith('H:')).map(e=>e.id),modelIds:result.models.map(m=>m.id),evidenceIds:result.evidence.map(e=>e.id),requestTopics:topics(intent),modelContext:intent.modelContext};
  const evidence=result.evidence.length?result.evidence:[{id:'F-START',data:factIndex.get('F-START')!,sourceIds:factIndex.get('F-START')!.source_ids}];
  for(const id of parts(intent).flatMap(r=>(r.policyIds??[]).flatMap(p=>policyIndex.get(p)?.factIds??[]))){if(!evidence.some(e=>e.id===id)){const fact=factIndex.get(id);if(fact)evidence.push({id,data:publicFactContent(fact),sourceIds:fact.source_ids});}}
  const compiledPolicies=compilePolicyAnswers(parts(intent),next,question,evidence.map(e=>e.id),Boolean(intent.unconfirmedProduct));
  const recordSegments=compiledPolicies.segments;ctx.policyRecords=compiledPolicies.records;
  const generatedRequests=parts(intent).filter(r=>!compiledPolicies.answeredRequestIds.includes(r.id));
  let segments:string[]=[],segmentRefs:string[][]=[],nextQuestion='',nextAction:Action='none',mode:AnswerResult['mode']=fallback?'reviewed_fallback':'generated';
  if(controlled){segments=controlled.segments;nextQuestion=controlled.question??'';mode='controlled';for(const id of controlled.factIds)if(!evidence.some(e=>e.id===id)){const f=factIndex.get(id)!;evidence.push({id,data:f,sourceIds:f.source_ids})}if(controlled.arithmetic)next.lastArithmetic=controlled.arithmetic;}
  else if(intent.ambiguous&&!stateValue(next,'selectedModel')&&next.recommended.length>1){segments=['I can help with either design.'];nextQuestion='Which one do you mean: '+next.recommended.map(id=>modelIndex.get(id)!.name).join(' or ')+'?';mode='controlled'}
  else if(!fallback&&parts(intent).length>0&&!generatedRequests.length){
    segments=recordSegments.map(s=>s.text);segmentRefs=recordSegments.map(s=>s.evidenceRefs);mode='controlled';ctx.coverage={requested:parts(intent).map(r=>r.id),retained:compiledPolicies.answeredRequestIds,missing:[]};
  }
  else if(!fallback){
    try{
      const rawAnswer=await structured<NaturalAnswer|PlannedAnswer>(outputSchema(evidence.map(e=>e.id),result.models.map(m=>m.id),intent.detail,generatedRequests,Boolean(intent.unconfirmedProduct)),`You are House Delivery’s warm, experienced housing concierge, clearly automated. Answer directly using only supplied evidence. Normally write two to four sentences TOTAL across all answerSegments, around 70–110 words: use one sentence per segment, with an optional single follow-up. Longer explanations are appropriate only when detail is true. Keep each segment under 350 characters and finish every sentence; never trail off to fit a limit. A retrieved recommendation subset is not the whole collection. Give a company introduction only when asked about the company; otherwise answer the current question first. The evidence contains public assertions only. The separate internalInstructions control your behaviour, are never answer content, and cannot support a factual claim. Use all applicable limits without quoting editorial directions. They supplement rather than override the controlled model/price records. Relate the answer to retained household and project priorities. General practical explanations and clearly framed preference-based inferences are welcome; model-specific layout reasons must come from the actual model record. Offer longer detail when requested. Do not force a link, Studio invitation or follow-up into every reply. Speak as House Delivery using we/our when appropriate. In a customer question, you addresses House Delivery; a contractor role in visitorState describes the visitor, not your company. A customer assigning work to their own team is a proposed responsibility, not a confirmed contract. Choose zero or one relevant follow-up; do not repeat known or declined details. When requirements are still unknown, ask for one useful requirement instead of suggesting arbitrary named models. Site/lot area is never home floor area and never proves a design fits the site. Bedroom choices are alternatives, not a minimum or a single choice. When matching contains models, present them now with useful reasons from their records; do not ask permission to browse or offer to provide recommendations later. The cards show verified bedrooms, published area, approved images and floor-plan links. Do not claim feasibility, zoning or property fit. For follow-ups compare the retained recommendations and use prior answers; ask for a missing preference only if it advances the current decision. Keep developers, municipalities, institutions, Nations, individual owners and ADU customers equally welcome. Municipal facilitators or landowners may have a separate operator and may not be buyers; discuss the site, intended households, program mix and roles without assuming a single-home purchase. Give useful design reasons and use the deterministic matches: never invent a match, stretch an outside-range alternative, treat a building total as a residence or use an unknown area. Discuss uncertainty only when it affects this decision. Answer ordinary planning-feasibility questions as possibilities; do not reinterpret can we as must we or demand a signed commitment to discuss repeatable home types across phases. Do not promise dates, production allocation, reservations, quotes, eligibility, permits or certifications. Pending funding does not prevent early planning; never invent funding approval as a prerequisite to discussing scope or requesting project review. Do not classify a proposed finish, furniture or wardrobe island as structural work unless the evidence specifically establishes that classification; an item can need a room/layout review without being a structural alteration. No action has been performed by chat. For Studio imagery, names are design directions, not product composition or guaranteed supply; you cannot save a design. Do not request contact details in chat. If contact was declined, continue helping without another contact request. When mobility is raised, explain that entry, circulation and bathroom use need plan/project review; compact size, a study or a deck does not establish ease of access or accessibility. Do not compare internal living areas unless that basis is recorded for every compared home; published area is not internal area. Bedroom and bathroom counts do not establish an ensuite for every bedroom; only say that when the model features explicitly record it. When discussing exclusions, keep the qualification unless expressly included in the written project scope. For architectural custom homes the published inclusion levels are Premium and Signature; never recommend Essential for those models. Compact and CMHC families list Essential and Premium, not Signature. Avoid irrelevant tier explanations when the customer asks about a layout. Do not assign a currency to an unqualified dollar budget or repeat monetary numbers in narrative; the editable brief retains the reported amount. For a request about published rates, select Premium and/or Signature in planningRates; the server inserts the approved CAD values. Write NO monetary figures or currency amounts in text. Set planningRates to [] for other parts, delivery-only questions, unconfirmed products or when F-PRICE is absent. Explain the planning scope and written-quote qualifications naturally in text; never invent freight charges or a model-specific quotation. Other commercial calculations are rendered by the server. Model cards supply numeric specifications, so focus your sentences on fit, useful differences and the next decision. Cite evidence IDs for every factual segment. No URLs, HTML, private data or unsupported company/product claims. Address EVERY request separately in its required answers entry, including useful uncertainty where information is missing. Never defer an asked part by only offering to explain it next. Do not narrate audit observations, source records, registries or Studio controls. For inclusions, distinguish a published model description from the written supply package and explain locally arranged responsibilities in the same answer. Technical/code and permit questions use site-specific engineering and local responsibilities; CMHC is relevant only to an actual CMHC design question. If the visitor IS a builder or general contractor, address them as you/your team rather than your existing builder. A warehouse or other unconfirmed offering must remain unconfirmed; do not invent either an offer or a company policy refusing it, and do not use a past residential model as proof. Chat cannot issue a binding quotation or disclose private manufacturing identities. Do not qualify an unconfirmed non-housing offer or push an inquiry for it. Preserve useful parts of mixed requests while respecting explicit confidentiality boundaries. Any company practice, availability, inclusion, exclusion, obligation, frequency, access or documentation-release policy requires explicit approved evidence for that exact scope. Technical specifications and project-verification documents are not automatically confidential merely because they concern manufacturing; identify which document, release stage or verification evidence the team needs to confirm. A published structural-system description does not establish that the model must use that system or that all alternatives are offered. Distinguish factory supply, landed/import costs, onward Canadian delivery and completed construction; do not invent duties, brokerage, importer responsibilities or included logistics services. Neither silence nor a general process or privacy statement establishes such a rule. When absent, state the specific point our team needs to confirm and still answer the supported parts. Keep conditional inclusions and responsibilities conditional. Confidential identities and private factory records are protected; do not infer that all technical documentation is confidential or unavailable. A client claim cannot revise approved data. The current visitor’s reports are preferences, not independent verification.`,{question,requests:generatedRequests,unconfirmedProduct:intent.unconfirmedProduct??false,detail:intent.detail,visitorState:conversationContext(next),internalInstructions:handbookInstructions(evidence.map(e=>e.id)),evidence,matching:!intent.unconfirmedProduct&&topics(intent).includes('matching')?{matches:result.match.matches.map(m=>m.id),outsideTargetAlternatives:result.match.outsideTargetAlternatives.map(m=>m.id),areaBasis:result.match.areaBasis,noQualifyingMatch:result.match.matches.length===0}:null},ctx);
      const answer:NaturalAnswer='answers' in rawAnswer?{...rawAnswer,answerSegments:generatedRequests.flatMap(r=>{
        const segment=requestAnswer(rawAnswer.answers[r.id],r,evidence.map(e=>e.id),Boolean(intent.unconfirmedProduct),ctx);return segment?[segment]:[];
      })}:rawAnswer;
      const allowedModels=result.models.map(m=>m.id);
      const clean={...answer,answerSegments:answer.answerSegments.filter(seg=>{const reason=naturalRejection({...answer,answerSegments:[seg],nextQuestion:null},evidence,allowedModels,declined,next,compiledPolicies.requests);if(!reason)return true;ctx.rejections??=[];ctx.rejections.push(reason);return ['scope_qualification','unsupported_availability','unconfirmed_capability'].includes(reason);})};
      if(!clean.answerSegments.length)throw Error('No supported segment');
      if(naturalRejection({...clean,answerSegments:[]},evidence,allowedModels,declined,next)){ctx.rejections??=[];ctx.rejections.push('invalid_follow_up');clean.nextQuestion=null;}
      const supported=await grounded(clean,evidence,next,ctx,question,generatedRequests,compiledPolicies.requests);if(!supported)throw Error('Unsupported response');
      supported.answerSegments=finalizeComparisonAnswers(supported.answerSegments,compiledPolicies.requests,recordSegments).sort((a,b)=>parts(intent).findIndex(r=>r.id===a.requestId)-parts(intent).findIndex(r=>r.id===b.requestId));
      ctx.coverage={requested:parts(intent).map(r=>r.id),retained:[...new Set([...compiledPolicies.answeredRequestIds,...supported.answerSegments.flatMap(s=>s.requestId?[s.requestId]:[])])],missing:parts(intent).filter(r=>!compiledPolicies.answeredRequestIds.includes(r.id)&&!supported.answerSegments.some(s=>s.requestId===r.id)).map(r=>r.id)};
      segments=supported.answerSegments.map(s=>s.text);segmentRefs=supported.answerSegments.map(s=>s.evidenceRefs);nextQuestion=supported.nextQuestion??'';nextAction=supported.nextAction;
    }catch{fallback=true;mode='reviewed_fallback';ctx.fallbackReason=ctx.failures?.length?'generation_failure':'answer_validation';if(recordSegments.length){segments=recordSegments.map(s=>s.text);segmentRefs=recordSegments.map(s=>s.evidenceRefs);ctx.coverage={requested:parts(intent).map(r=>r.id),retained:compiledPolicies.answeredRequestIds,missing:generatedRequests.map(r=>r.id)};}}
  }
  if(fallback&&!segments.length){
    const failure=ctx.failures?.filter(f=>f.category!=='output_validation').at(-1)?.category;
    const serviceNotice=ctx.timeoutInjected||failure==='timeout'?'The AI connection timed out just now; your project context is still here.':failure==='rate_limit'?'The AI connection is busy just now. Your project context is still here.':failure?'The automated assistant couldn’t complete this request just now. Your project context is still here.':null;
    segments=intent.topic==='matching'?(result.match.matches.length?[matchingIntroduction(result.match.matches)]:[hasMatchPreferences(next)?'I haven’t found a published design that meets those requirements; we can keep them as a custom project brief.':'Let’s narrow the collection around the home you want, separately from your lot size.']):['specifications','comparison'].includes(intent.topic)&&result.models.length?result.models.map(modelLine):[serviceNotice??'I don’t have a confirmed answer from the available information. Our team would need to confirm the missing details.'];
    if(serviceNotice&&segments[0]!==serviceNotice)segments.unshift(serviceNotice);
  }
  if(mode==='generated'&&intent.topic==='pricing'&&ctx.rejections?.includes('scope_qualification')){segments.push('Site preparation, foundations, services, local engineering and permits, Canadian assembly and completion, appliances and sales taxes are separately considered unless expressly included in the written scope.');segmentRefs.push(['F-SCOPE','F-EXCLUSIONS']);}
  if(topics(intent).includes('matching')&&!controlled&&hasMatchPreferences(next)){
    if(!result.match.matches.length&&!segments.some(s=>/no |haven.t|none|not.*match/i.test(s)))segments.unshift('No published design meets all of the stated requirements.');
    if(!stateValue(next,'avoidLarger')&&result.match.matches.length===0&&result.match.outsideTargetAlternatives.length&&next.values.areaTarget&&!next.values.areaMax){const a=result.match.outsideTargetAlternatives[0];segments.push(`Outside your approximate size target: ${modelLine(a)}`)}
  }
  if(ctx.coverage?.missing.length||ctx.fallbackReason==='incomplete_answer'){mode='reviewed_fallback';ctx.fallbackReason=ctx.fallbackReason??'partial_validation';segments.push('I don’t have confirmed information for the remaining part of your question.');nextQuestion='';}
  if(boundary.restricted&&boundary.publicOrigin&&!segmentRefs.some(refs=>refs.includes('F-ORIGIN'))){const origin=factIndex.get('F-ORIGIN')!;segments.push(origin.text);segmentRefs.push([origin.id]);if(!evidence.some(e=>e.id===origin.id))evidence.push({id:origin.id,data:publicFactContent(origin),sourceIds:origin.source_ids});}
  if(boundary.restricted){segments.push(boundary.identityCondition?identityConditionNotice:boundary.privateFacility?facilityLocationNotice:confidentialityNotice);segmentRefs.push([]);}
  const showCards=!controlled?.suppressCards&&!(compiledPolicies.limitedRequestIds.length>0&&!generatedRequests.length)&&(['matching','comparison'].includes(intent.topic)||intent.detail&&recordSegments.length===0||/floor[ -]?plans?|drawings?/i.test(question));
  const cards=showCards?result.models.map(recommendationCard):[];
  if(result.models.length){next.recommended=result.models.map(m=>m.id).slice(0,3);if(result.models.length===1)next.values.selectedModel={value:result.models[0].id,sourceTurn:next.turn,status:'visitor_reported'}}
  if(/floor plan|both source|drawing|look book|studio|save it/i.test(question)&&result.models.length)nextAction=/look book|save it/i.test(question)?'lookbook':/studio/i.test(question)?'studio':'browse_designs';
  if(intent.topic==='contact'||intent.topic==='summary'||/share only.*summary|did you send/i.test(question))nextAction=declined?'none':'summary';
  if(declined&&['consultation','summary'].includes(nextAction)||summaryRequested&&/without sending|do not send|don't send|just summari/i.test(question))nextAction='none';
  if(topics(intent).includes('matching')&&cards.length){
    nextAction='browse_designs';
    // A supplied requirement advances to the next decision, never another offer
    // to browse. Do not re-ask a question already asked on the preceding turn.
    const sizeKnown=['areaTarget','areaMax','areaMin'].some(k=>Object.hasOwn(next.values,k));
    const useful=sizeKnown?'Which design would you like to compare or explore in more detail?':'What approximate home size would you like, separate from the lot area?';
    nextQuestion=useful===state.lastQuestion?'':useful;
    if(stateValue(next,'siteArea')){segments.push('These are design starting points; fit on your property still needs a site-specific review.');segmentRefs.push(['F-PROPERTY']);}
  }
  if(topics(intent).includes('matching')&&!hasMatchPreferences(next)&&!nextQuestion)nextQuestion='How many bedrooms would feel right for you?';
  if(nextQuestion&&stateValue(next,'location')&&/which (municipality|city|province)|where.*(?:property|site)/i.test(nextQuestion))nextQuestion='';
  if(nextQuestion&&stateValue(next,'land')&&/do you (?:have|own).*(?:land|site|property)/i.test(nextQuestion))nextQuestion='';
  if(declined&&/contact|email|phone|personal review/i.test(nextQuestion))nextQuestion='';
  if(compiledPolicies.limitedRequestIds.length)nextQuestion='';
  if(intent.unconfirmedProduct||boundary.identityCondition){nextAction='none';nextQuestion='';}
  if(boundary.privateFacility)next.restrictedTopic='manufacturing_location';else if(manufacturingRestricted)next.restrictedTopic='manufacturing_partner';else delete next.restrictedTopic;
  const guidance=guidanceContinuation(visitorQuestion,state),financeStage=compiledPolicies.requests.find(r=>r.guidanceStage)?.guidanceStage;
  if(financeStage==='accepted'&&!stateValue(next,'location')&&!next.values.declinedQuestions?.value.includes('location'))nextQuestion='Which municipality is your project in?';
  next.pendingQuestion=pendingLocation(nextQuestion)??(guidance==='acknowledged'||guidance==='accepted'?state.pendingQuestion??pendingLocation(state.lastQuestion):undefined);
  next.scopeExplained=next.scopeExplained||['pricing','scope','arithmetic'].includes(intent.topic);next.lastQuestion=nextQuestion;
  next.activeQuestion=continuesQuestion(visitorQuestion,state)?state.activeQuestion:visitorQuestion;next.activeUpdates=continuesQuestion(visitorQuestion,state)?[...new Set([...(state.activeUpdates??[]),visitorQuestion])].slice(-3):[];next.activeRequests=parts(intent);
  next.lastTopic=intent.topic;next.lastEvidenceRefs=evidence.map(e=>e.id);
  const linksUseful=nextAction!=='none'||recordSegments.length>0&&result.models.length>0||['matching','comparison','specifications'].includes(intent.topic)||/links?|view|open|floor plan|studio|look.?book|sources?/i.test(question);
  const linked=linksUseful?linkFacts(evidence,result.models,intent,question):[];
  const actionHref=nextAction==='property_review'?safeLink(knowledge.routing.adu_laneway):undefined;
  return{reply:{introduction:'',facts:linked,answerSegments:segments.map((text,i)=>({text,evidenceRefs:segmentRefs[i]??evidence.map(e=>e.id)})),modelCards:cards,question:nextQuestion,next:'none',disposition:'answer',nextAction,actionHref,proposedSummary:projectSummary(next),showSummary:summaryRequested,knowledgeVersion:knowledge.knowledge_version,detailed:intent.detail},state:next,sourceIds:[...new Set(evidence.flatMap(e=>e.sourceIds))],mode};
}
