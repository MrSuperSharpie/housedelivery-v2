import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {LanguageModel} from 'ai';
import {answerQuestion,naturalRejection} from './compose';
import {initialState,mergePatch,stateValue,projectSummary,signState,readState,type State} from './state';
import {householdUpdate,visitorEvidence} from './visitor-context';
import {retrieve} from './evidence';
import {normalizeIntent} from './request-plan';
import type {Intent} from './intent';
import type {InferenceContext} from './llm';
import {modelIndex} from './registry';
type SchemaNode={type?:unknown;properties:Record<string,SchemaNode>;items:SchemaNode;enum:string[]};
const intent=(question:string,topic:Intent['topic']='scope'):Intent=>({topic,requests:[{id:'r1',topic,question,policyIds:[],pricing:'none'}],modelContext:'none',unconfirmedProduct:false,sectionIds:[],factIds:[],modelIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false});
// Exercise the actual intake -> schema -> merge -> retrieval -> generation ->
// deterministic validation -> existing support review -> cards/state pipeline.
// These fixtures do not claim to measure real-model answer quality; Preview does.
function modelFor(q:string,{reject=false,text,seen=[]}:{reject?:boolean;text?:string;seen?:string[]}={}):LanguageModel{
 return{specificationVersion:'v4',provider:'local-conversation-regression',modelId:'no-network',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async options=>{
  seen.push(JSON.stringify(options.prompt));
  const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined,props=schema!.properties as Record<string,SchemaNode>;let out:unknown;
  if(props.patch){out={...intent(q),patch:Object.fromEntries(Object.entries(props.patch.properties).map(([k,v])=>[k,(v as {type:unknown}).type==='array'?[]:null]))};}
  else if(props.answers){out={answers:Object.fromEntries(Object.entries(props.answers.properties).map(([id,raw])=>{const v=raw as SchemaNode,refs=v.properties.evidenceRefs.items.enum as string[],m=refs.map(r=>modelIndex.get(r)).find(Boolean);return[id,{text:text??(m?`${m.name} is a design starting point; ${m.features[0]}.`:'Your household priorities can guide the home search.'),evidenceRefs:text?['V:requirements']:m?[m.id]:['V:requirements'],...(v.properties.planningRates?{planningRates:[]}: {})}]})),selectedModelIds:[],nextQuestion:null,nextAction:'none'};}
  else{out={segments:props.segments.items.properties.index.enum.map((rawIndex:string)=>{const index=Number(rawIndex);return {index,supported:!reject,issues:reject?['unsupported_claim']:[]}}),followUpSupported:true,complete:!reject};}
  return{content:[{type:'text',text:JSON.stringify(out)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
 }};
}
for(const q of ['A house for my wife and 2 kids.','A home for my husband and our two children.','We are a couple with a daughter.','Our household of four needs space for visiting parents.'])test('household context survives signed follow-ups: '+q,()=>{
 let s=mergePatch(initialState('family'),{},q);assert.ok(stateValue(s,'householdNeeds')?.includes(q));assert.equal(stateValue(s,'bedrooms'),undefined);assert.equal(stateValue(s,'homes'),undefined);
 s=readState(signState(s,'local-only'),'family','local-only');s=mergePatch(s,{},'I have a contractor.');s=mergePatch(s,{},'Can we compare designs?');assert.ok(projectSummary(s).includes(q));assert.equal(stateValue(s,'builder'),true);assert.equal(stateValue(s,'role'),undefined);
});
test('conversational updates are routed to discovery without discarding compound factual questions',()=>{
 for(const q of ["I'm exploring a home for myself or my family.",'A house for my wife and 2 kids.']){assert.equal(householdUpdate(q),true);const s=mergePatch(initialState('discovery'),{},q),i=normalizeIntent(intent(q),q,s);assert.equal(i.topic,'matching');assert.deepEqual(i.requests?.[0].policyIds,[]);}
 const q='My wife and two children need a home. What is included and what does delivery cost?';assert.equal(householdUpdate(q),false);assert.ok(stateValue(mergePatch(initialState('compound'),{},q),'householdNeeds'));
});
test('visitor grounding resolves numeric acknowledgements without making metadata or invented numbers evidence',()=>{
 const state=mergePatch(initialState('ack'),{},'A house for my wife and 2 kids.');
 const answer={answerSegments:[{text:'With 2 kids, we can explore your household’s priorities.',evidenceRefs:['V:requirements']}],selectedModelIds:[],nextQuestion:null,nextAction:'none' as const};
 assert.equal(naturalRejection(answer,[visitorEvidence(state)],[],false,state),null);
 assert.equal(naturalRejection({...answer,answerSegments:[{...answer.answerSegments[0],text:'With 9 kids, we can explore your priorities.'}]},[visitorEvidence(state)],[],false,state),'unsupported_number');
 // Reproduces the old context-loss rejection, independent of stochastic wording.
 assert.equal(naturalRejection({...answer,answerSegments:[{...answer.answerSegments[0],evidenceRefs:['F-START']}]},[{id:'F-START',data:{text:'You can start with a property or design.'},sourceIds:[]}],[],false,initialState('lost')),'unsupported_number');
 const price={...answer,answerSegments:[{text:'Your package costs CAD $2 per square foot.',evidenceRefs:['V:requirements']}]};assert.ok(naturalRejection(price,[visitorEvidence(state)],[],false,state));
 const invented={...answer,answerSegments:[{text:'The Aurora has 2 bedrooms.',evidenceRefs:['V:requirements']}]};assert.equal(naturalRejection(invented,[visitorEvidence(state)],[],false,state),'unknown_model');
});
test('a requested quantity can be discussed without turning it into a company commitment',()=>{
 const s=initialState('hypothetical'),e=visitorEvidence(s,'Can you guarantee approval in six weeks, or within 42 days?');
 const a={answerSegments:[{text:'A 42-day approval is not something this chat can guarantee.',evidenceRefs:['V:requirements']}],selectedModelIds:[],nextQuestion:null,nextAction:'none' as const};
 assert.equal(naturalRejection(a,[e],[],false,s),null);
});
test('household exploration offers verified starting points without silently inventing hard requirements',()=>{
 let s=mergePatch(initialState('explore'),{},"I'm exploring a home for myself or my family.");let i=normalizeIntent(intent('Find a home.'),"I'm exploring a home for myself or my family.",s);assert.equal(retrieve(i,s,'Find a home.').models.length,0);
 const q='A house for my wife and 2 kids.';s=mergePatch(s,{},q);i=normalizeIntent(intent(q),q,s);const r=retrieve(i,s,q);assert.equal(r.match.exploratory,true);assert.equal(r.models.length,2);assert.equal(stateValue(s,'bedrooms'),undefined);assert.equal(stateValue(s,'areaTarget'),undefined);
 s=mergePatch(s,{},'I need three bedrooms');i=normalizeIntent(intent('I need three bedrooms'),'I need three bedrooms',s);assert.equal(retrieve(i,s,'I need three bedrooms').models.length,0,'Do not relax explicit bedrooms to keep cards');
});
test('three complete pipeline journeys preserve household, property and commercial context',async()=>{
 const journeys=[
  ["I'm exploring a home for myself or my family.",'A house for my wife and 2 kids.','I have a 4000 square foot lot in East Vancouver.','4 or 5 bedrooms.','Compare those homes.'],
  ['A home for my husband and our two children.','I have a 4800 square foot property in Vancouver.','three or four bedrooms','Show their floor plans.'],
  ['We are a couple with a daughter.','I have a contractor.','Four bedrooms and a study.','I prefer Premium.','Summarize my project without sending it.']
 ];
 for(const [n,questions]of journeys.entries()){
  let s:State=initialState('journey-'+n);let sawCards=false;
  for(const q of questions){const seen:string[]=[],ctx:InferenceContext={calls:0,model:modelFor(q,{seen}),contexts:[]};const r=await answerQuestion(q,s,ctx);s=readState(signState(r.state,'local-only'),s.session,'local-only');
   assert.doesNotMatch(r.reply.answerSegments!.map(a=>a.text).join(' '),/don’t have a confirmed answer|couldn’t put together|temporarily unavailable|busy/);
   if(r.reply.modelCards?.length){sawCards=true;for(const c of r.reply.modelCards){const m=modelIndex.get(c.id)!;assert.ok(c.image);assert.ok(c.floorPlanHref);assert.equal(c.title,m.name);assert.ok(c.specs?.includes(`${m.bedrooms} bedrooms`));}}
   if(n===0&&s.turn>=2)assert.match(stateValue(s,'householdNeeds')!,/wife and 2 kids/);
   if(stateValue(s,'siteArea'))assert.equal(stateValue(s,'areaTarget'),undefined);
  }
  assert.ok(sawCards);assert.ok(stateValue(s,'householdNeeds'));if(n===2){assert.equal(stateValue(s,'builder'),true);assert.equal(stateValue(s,'role'),undefined);assert.equal(stateValue(s,'finish'),'Premium');}
 }
});
test('unsupported company claims are still rejected by the existing review and not labelled as a provider outage',async()=>{
 const q='A home for my partner and two children.',ctx:InferenceContext={calls:0,model:modelFor(q,{reject:true,text:'Every home is manufactured in Canada.'})};
 const r=await answerQuestion(q,initialState('reject'),ctx);assert.equal(ctx.failures,undefined);assert.equal(ctx.fallbackReason,'answer_validation');assert.ok(ctx.rejections?.includes('unsupported_claim'));assert.doesNotMatch(JSON.stringify(r.reply),/Every home is manufactured|connection is busy|confirmed answer/);assert.ok(r.reply.modelCards?.length);
});
test('genuine service failures remain service failures while retaining household context',async()=>{
 const q='A house for my wife and 2 kids.',ctx:InferenceContext={calls:0,fault:'timeout'};const r=await answerQuestion(q,initialState('outage'),ctx);assert.ok(ctx.failures?.some(f=>f.category==='timeout'));assert.match(JSON.stringify(r.reply),/connection timed out/);assert.match(stateValue(r.state,'householdNeeds')!,/wife and 2 kids/);
});
