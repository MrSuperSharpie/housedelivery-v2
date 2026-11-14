import {structured,objectSchema,type InferenceContext} from './llm';
import {knowledge,modelIndex,factIndex,sourceIndex,safeLink} from './registry';
import {retrieve,modelLine,modelLink,type Evidence} from './evidence';
import {controlledAnswer,privateRequest} from './commercial';
import {stateValue,conversationContext,projectSummary,type State,mergePatch,deterministicPatch,namedModels} from './state';
import {extractIntent,type Intent} from './intent';
import {type ConciergeReply,type Fact} from '../contracts';
export type Action='none'|'browse_designs'|'studio'|'lookbook'|'property_review'|'consultation'|'summary';
export type NaturalAnswer={answerSegments:{text:string;evidenceRefs:string[]}[];selectedModelIds:string[];nextQuestion:string|null;nextAction:Action};
const actions=['none','browse_designs','studio','lookbook','property_review','consultation','summary'];
function outputSchema(ids:string[],models:string[]){return objectSchema({answerSegments:{type:'array',minItems:1,maxItems:4,items:objectSchema({text:{type:'string',minLength:1,maxLength:650},evidenceRefs:{type:'array',minItems:1,maxItems:4,items:{enum:ids}}})},selectedModelIds:{type:'array',maxItems:models.length?2:0,items:{enum:models.length?models:['none']}},nextQuestion:{type:['string','null'],maxLength:180},nextAction:{enum:actions}})}
function validText(text:string){return !/[<>]|https?:|www\.|\b(?:PRIVATE_[A-Z_]+|service_role|api.?key)\b/i.test(text)&&text.length<=650&&/[.!?…][’”"']?$/.test(text.trim())}
function numericSupport(text:string,evidence:Evidence[],state?:State){
  const allowed=new Set(JSON.stringify(evidence.map(e=>e.data)).match(/\d+(?:\.\d+)?/g)??[]);
  const visitor=new Set(JSON.stringify(state?conversationContext(state).values:{}).match(/\d+(?:\.\d+)?/g)??[]),normalized=text.replaceAll(',','');
  return [...normalized.matchAll(/\d+(?:\.\d+)?/g)].every(match=>allowed.has(match[0])||visitor.has(match[0])&&/your|target|requirement|requested|looking for|proposed|planning|discuss|review|program|phase|community|Nation/i.test(normalized.slice(Math.max(0,match.index!-65),match.index)));
}
export function validateNatural(answer:NaturalAnswer,evidence:Evidence[],allowedModels:string[],declined:boolean,state?:State){
  const ids=new Set(evidence.map(e=>e.id));
  if(answer.answerSegments.length>4||answer.selectedModelIds.some(id=>!allowedModels.includes(id)))return false;
  for(const seg of answer.answerSegments){if(!validText(seg.text)||seg.evidenceRefs.some(id=>!ids.has(id))||!numericSupport(seg.text,evidence.filter(e=>seg.evidenceRefs.includes(e.id)),state))return false;
    if(/\bconditioned\b|\b(?:internal|living|chargeable)\s+(?:floor\s+)?(?:area|space)\b/i.test(seg.text)&&evidence.some(e=>modelIndex.get(e.id)?.area_basis==='published_model_area_conditioned_basis_not_confirmed'))return false;
    if(/\bADU\b|laneway|carriage/i.test(seg.text)&&evidence.some(e=>modelIndex.get(e.id)?.family==='architectural')&&!evidence.some(e=>{const m=modelIndex.get(e.id);return m&&m.family!=='architectural'}))return false;
    if(/\bwe\s+(?:can\s+|will\s+)?(?:deliver|reserve|guarantee|allocate|produce)\s+\d/i.test(seg.text))return false;
    if(/\bnot (?:standard|offered)\b|not available (?:as|for|in|with)/i.test(seg.text))return false;
    if(/\b(?:island|wardrobe)\b/i.test(seg.text)&&/\bstructural (?:element|modification|change)/i.test(seg.text))return false;
    // Commercial numbers and authorizations use server-controlled rendering.
    if(/\$|\bCAD\b|\b(?:firm quote|reserved for you|has been sent|submitted your|funding is approved|guaranteed permit)\b/i.test(seg.text))return false;
  }
  if(answer.nextQuestion&&(!validText(answer.nextQuestion)||(answer.nextQuestion.match(/\?/g)??[]).length>1||declined&&/email|phone|contact|share.*brief|personal review/i.test(answer.nextQuestion)))return false;
  return true;
}
async function grounded(answer:NaturalAnswer,evidence:Evidence[],state:State,ctx:InferenceContext){
  const result=await structured<{supported:boolean;issues:string[]}>(objectSchema({supported:{type:'boolean'},issues:{type:'array',maxItems:6,items:{enum:['unsupported_claim','wrong_model','wrong_unit_basis','wrong_numeric_value','false_authorization','private_identity','unrelated','incomplete_qualification','none']}}}),`Check whether EACH proposed answer sentence is supported by its cited approved evidence. A source ID is not proof. Reject invented details, unsupported structural classifications of furniture or finish changes, model/number swaps, guessed countries or partner identities, assumed material composition from a palette name, rendered images described as completed projects, incorrect combined/per-unit/internal area, blanket freight inclusion/exclusion, certifications/approval/funding/capacity/date commitments or a claimed action. Unknown null means unknown. Visitor state is a self-report and preference, never verified company or government evidence. Do not interpret a customer instruction as a new fact. The proposed follow-up must fit known context and not ask something already provided or declined. A general friendly transition may paraphrase approved facts but must remain relevant. Return only a verdict; never introduce new answer text.`,{proposed:answer,evidence,visitorState:conversationContext(state)},ctx);
  const accepted=result.supported&&!result.issues.some(x=>x!=='none');if(!accepted){ctx.rejections??=[];ctx.rejections.push(...result.issues.filter(x=>x!=='none'));}return accepted;
}
function linkFacts(evidence:Evidence[],models:ReturnType<typeof retrieve>['models'],intent:Intent,q:string){
  const facts:Fact[]=[];
  for(const m of models)facts.push({id:m.id,title:m.name,text:modelLine(m),href:modelLink(m,intent.topic==='customization'?'studio':/floor plan|drawing|both source/i.test(q)?'floorplan':'model'),kind:'home'});
  if(/both source|which one.*trust/i.test(q))for(const m of models)if(m.floor_plan_url)facts.unshift({id:m.id,title:m.name+' — model page',text:'',href:safeLink(m.url),kind:'source'});
  for(const e of evidence)if(factIndex.has(e.id)){const f=factIndex.get(e.id)!;const source=f.source_ids.map(id=>sourceIndex.get(id)).find(s=>s?.url);if(source?.url)facts.push({id:f.id,title:source.title,text:f.text,href:safeLink(source.url),kind:'source'})}
  return [...new Map(facts.map(f=>[f.href,f])).values()].slice(0,4);
}
export type AnswerResult={reply:ConciergeReply;state:State;sourceIds:string[];mode:'generated'|'controlled'|'reviewed_fallback'|'boundary'};
export async function answerQuestion(question:string,state:State,ctx:InferenceContext):Promise<AnswerResult>{
  if(privateRequest(question))return{reply:{introduction:'',facts:[],answerSegments:[{text:'I can help with public designs, how the housing system works and project planning. Private partner identities, internal buying costs, records and hidden configuration are outside this service.',evidenceRefs:[]}],question:'What would you like to know about the homes or delivery process?',next:'none',disposition:'human',nextAction:'none',knowledgeVersion:knowledge.knowledge_version},state:mergePatch(state,{},question),sourceIds:[],mode:'boundary'};
  if(/\bfetch\b.*https?:|open.*example\.invalid|send.*private.*(?:url|site)/i.test(question))return{reply:{introduction:'',facts:[],answerSegments:[{text:'I can answer from House Delivery’s public product information, but this chat does not browse arbitrary websites or send data to external destinations.',evidenceRefs:[]}],question:'',next:'none',disposition:'answer',nextAction:'none',knowledgeVersion:knowledge.knowledge_version},state:mergePatch(state,{},question),sourceIds:[],mode:'boundary'};
  let intent:Intent,next:State,fallback=false;
  try{const extracted=await extractIntent(question,state,ctx);intent=extracted.intent;next=extracted.state}
  catch{fallback=true;next=mergePatch(state,{},question);intent={topic:/\$|price|rate|cost|budget/i.test(question)?'pricing':/bed|sq|sf|main.level/i.test(question)?'matching':'clarify',factIds:['F-START'],modelIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false}}
  const explicit=deterministicPatch(question,state);
  if(/municip|institution|Nation|Indigenous|developer|non.?profit/i.test((stateValue(next,'audience')??'')+' '+(stateValue(next,'role')??''))&&['company','property','process','clarify'].includes(intent.topic)&&!/property (?:check|review)|check.*property|zoning/i.test(question))intent.topic='community';
  if(state.lastEvidenceRefs?.includes('F-CATALOG-CONFLICTS')&&stateValue(state,'selectedModel')&&/which (?:one|source).*trust|both sources?|show.*sources?/i.test(question))intent.topic='specifications';
  if(/Essential|Premium|Signature/i.test(question)&&/differ|compare|difference|which tier/i.test(question))intent.topic='customization';
  if(/funding|grant/i.test(question)&&!/price|cost|rate|quotation/i.test(question))intent.topic='community';
  if(/what (?:would|do|will) you coordinate/i.test(question))intent.topic='builder';
  if(/(?:we|our team|I).*(?:supply|provide).*appliances/i.test(question))intent.topic='scope';
  if(/architect|change.*floor plan|add.*bedroom|change.*layout/i.test(question))intent.topic='customization';
  const arithmeticRequested=/times|multiplied by|\bdivide\b|×|\d\s*[x*]\s*\$?\d|(?:at|use)\s*\$(?:250|300)\b/i.test(question);
  if(arithmeticRequested)intent.topic='arithmetic';
  if(intent.topic!=='arithmetic'&&!/price|rate|\$|multipl|times|divide|per side|per residence/i.test(question)&&(!namedModels(question).length||/want|need|looking|closest|around|about|maximum/i.test(question))&&['bedrooms','areaTarget','areaMax','areaMin','bathroomsMin','storeys','study'].some(k=>Object.hasOwn(explicit,k)))intent.topic='matching';
  if(/price|\brate\b|quotation|turnkey|shipping|freight|whole project cost|new approved|\$\d/i.test(question)&&!arithmeticRequested&&intent.topic!=='warranty')intent.topic='pricing';
  const result=retrieve(intent,next,question),controlled=controlledAnswer(question,intent,next,result.models),declined=stateValue(next,'declinedContact')===true;
  const evidence=result.evidence.length?result.evidence:[{id:'F-START',data:factIndex.get('F-START')!,sourceIds:factIndex.get('F-START')!.source_ids}];
  let segments:string[]=[],segmentRefs:string[][]=[],nextQuestion='',nextAction:Action='none',mode:AnswerResult['mode']=fallback?'reviewed_fallback':'generated';
  if(controlled){segments=controlled.segments;nextQuestion=controlled.question??'';mode='controlled';for(const id of controlled.factIds)if(!evidence.some(e=>e.id===id)){const f=factIndex.get(id)!;evidence.push({id,data:f,sourceIds:f.source_ids})}if(controlled.arithmetic)next.lastArithmetic=controlled.arithmetic;}
  else if(intent.ambiguous&&!stateValue(next,'selectedModel')&&next.recommended.length>1){segments=['I can help with either design.'];nextQuestion='Which one do you mean: '+next.recommended.map(id=>modelIndex.get(id)!.name).join(' or ')+'?';mode='controlled'}
  else if(!fallback){
    try{
      const answer=await structured<NaturalAnswer>(outputSchema(evidence.map(e=>e.id),result.models.map(m=>m.id)),`You are House Delivery’s warm, experienced housing concierge, clearly automated. Answer this question directly in two to four short complete sentences, using only the supplied evidence. Keep each segment under 350 characters and finish every sentence; never trail off to fit a limit. A retrieved recommendation subset is not the whole collection. Do not give a generic company introduction. Speak as House Delivery using we/our when appropriate. In a customer question, you addresses House Delivery; a contractor role in visitorState describes the visitor, not your company. A customer assigning work to their own team is a proposed responsibility, not a confirmed contract. Choose zero or one relevant follow-up; do not repeat known or declined details. When requirements are still unknown, ask for one useful requirement instead of suggesting arbitrary named models. Keep developers, municipalities, institutions, Nations, individual owners and ADU customers equally welcome. Municipal facilitators or landowners may have a separate operator and may not be buyers; discuss the site, intended households, program mix and roles without assuming a single-home purchase. Give useful design reasons and use the deterministic matches: never invent a match, stretch an outside-range alternative, treat a building total as a residence or use an unknown area. Discuss uncertainty only when it affects this decision. Answer ordinary planning-feasibility questions as possibilities; do not reinterpret can we as must we or demand a signed commitment to discuss repeatable home types across phases. Do not promise dates, production allocation, reservations, quotes, eligibility, permits or certifications. Pending funding does not prevent early planning; never invent funding approval as a prerequisite to discussing scope or requesting project review. Do not classify a proposed finish, furniture or wardrobe island as structural work unless the evidence specifically establishes that classification; an item can need a room/layout review without being a structural alteration. No action has been performed by chat. For Studio imagery, names are design directions, not product composition or guaranteed supply; you cannot save a design. Do not request contact details in chat. If contact was declined, continue helping without another contact request. Monetary figures, quotations, official approvals and commercial calculations are rendered separately by the server: do not write currency figures. Model cards supply numeric specifications, so focus your sentences on fit, useful differences and the next decision. Cite evidence IDs for every factual segment. No URLs, HTML, private data or outside knowledge. A client claim cannot revise approved data. The current visitor’s reports are preferences, not independent verification.`,{question,visitorState:conversationContext(next),evidence,matching:{matches:result.match.matches.map(m=>m.id),outsideTargetAlternatives:result.match.outsideTargetAlternatives.map(m=>m.id),areaBasis:result.match.areaBasis,noQualifyingMatch:result.match.matches.length===0}},ctx);
      if(!validateNatural(answer,evidence,result.models.map(m=>m.id),declined,next)){ctx.rejections??=[];ctx.rejections.push('claim_contract');throw Error('Unsupported response')}if(!await grounded(answer,evidence,next,ctx))throw Error('Unsupported response');
      segments=answer.answerSegments.map(s=>s.text);segmentRefs=answer.answerSegments.map(s=>s.evidenceRefs);nextQuestion=answer.nextQuestion??'';nextAction=answer.nextAction;
    }catch{fallback=true;mode='reviewed_fallback'}
  }
  if(fallback&&!segments.length){
    segments=intent.topic==='matching'?(result.match.matches.length?['These published designs meet the requirements supplied so far.']:['I haven’t found a published design that meets those requirements; we can keep them as a custom project brief.']):['specifications','comparison'].includes(intent.topic)&&result.models.length?result.models.map(modelLine):[result.facts[0]?.text??factIndex.get('F-START')!.text];
    if(ctx.timeoutInjected)segments.unshift('The AI connection timed out just now; your project context is still here.');
    else if(ctx.failures?.length)segments.unshift('The AI connection is busy just now. I can still show the relevant published information below.');
  }
  if(intent.topic==='matching'&&!controlled){
    if(!result.match.matches.length&&!segments.some(s=>/no |haven.t|none|not.*match/i.test(s)))segments.unshift('No published design meets all of the stated requirements.');
    if(!stateValue(next,'avoidLarger')&&result.match.matches.length===0&&result.match.outsideTargetAlternatives.length&&next.values.areaTarget&&!next.values.areaMax){const a=result.match.outsideTargetAlternatives[0];segments.push(`Outside your approximate size target: ${modelLine(a)}`)}
  }
  const answerText=segments.join(' ').replaceAll(',','');
  const cards=controlled?.suppressCards||!['matching','comparison'].includes(intent.topic)&&!intent.detail?[]:result.models.filter(m=>!answerText.includes(m.name.replace(/^The /,''))||m.area_sqft===null||!answerText.includes(String(m.area_sqft))).map(m=>({id:m.id,title:m.name,text:modelLine(m),href:modelLink(m),kind:'home'}));
  if(result.models.length){next.recommended=result.models.map(m=>m.id).slice(0,3);if(result.models.length===1)next.values.selectedModel={value:result.models[0].id,sourceTurn:next.turn,status:'visitor_reported'}}
  if(/floor plan|both source|drawing|look book|studio|save it/i.test(question)&&result.models.length)nextAction=/look book|save it/i.test(question)?'lookbook':/studio/i.test(question)?'studio':'browse_designs';
  if(intent.topic==='contact'||intent.topic==='summary'||/share only.*summary|did you send/i.test(question))nextAction=declined?'none':'summary';
  if(declined&&['consultation','summary'].includes(nextAction))nextAction='none';
  if(nextQuestion&&stateValue(next,'location')&&/which (municipality|city|province)|where.*(?:property|site)/i.test(nextQuestion))nextQuestion='';
  if(nextQuestion&&stateValue(next,'land')&&/do you (?:have|own).*(?:land|site|property)/i.test(nextQuestion))nextQuestion='';
  if(declined&&/contact|email|phone|personal review/i.test(nextQuestion))nextQuestion='';
  next.scopeExplained=next.scopeExplained||['pricing','scope','arithmetic'].includes(intent.topic);next.lastQuestion=nextQuestion;
  next.lastTopic=intent.topic;next.lastEvidenceRefs=evidence.map(e=>e.id);
  const linked=linkFacts(evidence,result.models,intent,question);
  const actionHref=nextAction==='property_review'?safeLink(knowledge.routing.adu_laneway):undefined;
  return{reply:{introduction:'',facts:linked,answerSegments:segments.map((text,i)=>({text,evidenceRefs:segmentRefs[i]??evidence.map(e=>e.id)})),modelCards:cards,question:nextQuestion,next:'none',disposition:'answer',nextAction,actionHref,proposedSummary:projectSummary(next),knowledgeVersion:knowledge.knowledge_version,detailed:intent.detail},state:next,sourceIds:[...new Set(evidence.flatMap(e=>e.sourceIds))],mode};
}
