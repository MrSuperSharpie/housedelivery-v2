import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {LanguageModel} from 'ai';
import {answerQuestion,naturalRejection,type NaturalAnswer} from './compose';
import {initialState,mergePatch,stateValue,projectSummary} from './state';
import {publicFactContent,containsInternalInstruction} from './publication';
import {refersToSelectedHome} from './continuity';
import {factIndex} from './registry';
import type {Intent} from './intent';
import type {InferenceContext} from './llm';
const now=Date.parse('2026-11-15T05:00:00Z');
export const exactQuestions=[
 'How are your homes built, and how is this different from a traditional modular home?',
 'What comes included with the Cedarview model, and what do I still need to source locally?',
 'How much does it cost to deliver a kit to Manitoba or rural BC, and what does the price per square foot roughly look like?',
 "Why shouldn't I just have a local framer stick-build this with lumber? Isn't steel way more expensive right now?",
 'Fair enough on speed, but give me a real number—on a 1,500 sq. ft. build, am I spending 20% more for steel than wood?',
 'Site is ready. Builder is experienced'
];
const plans:NonNullable<Intent['requests']>[]=[
 [{id:'r1',topic:'origin',question:exactQuestions[0],policyIds:['manufacturing_approach'],pricing:'none'}],
 [{id:'r1',topic:'scope',question:exactQuestions[1],policyIds:['package_scope'],pricing:'none'}],
 [{id:'r1',topic:'pricing',question:'How is freight priced?',policyIds:['freight_quotation'],pricing:'freight'},{id:'r2',topic:'pricing',question:'Rough home-package price per square foot?',policyIds:['pricing_scope'],pricing:'planning_rates'}],
 [{id:'r1',topic:'comparison',question:"Why shouldn't I just have a local framer stick-build this with lumber?",policyIds:[],pricing:'none'},{id:'r2',topic:'comparison',question:"Isn't steel way more expensive right now?",policyIds:[],pricing:'none'}],
 [{id:'r1',topic:'matching',question:exactQuestions[4],policyIds:[],pricing:'planning_rates'}],
 [{id:'r1',topic:'builder',question:'How does the builder work with House Delivery?',policyIds:['builder_collaboration'],pricing:'none'}]
];
function intake(turn:number):LanguageModel{
 return{specificationVersion:'v4',provider:'exact-transcript-fixture',modelId:'no-provider',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async options=>{
  const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined;
  if(!schema?.properties?.patch)throw Error('Unexpected generation/reviewer');
  const props=(schema.properties.patch as {properties:Record<string,{type?:unknown}>}).properties;
  const patch={...Object.fromEntries(Object.entries(props).map(([k,v])=>[k,v.type==='array'?[]:null])),...(turn===2?{location:'Manitoba'}:{})};
  const out={topic:plans[turn][0].topic,requests:plans[turn],modelContext:turn===2?'follow_up':'none',unconfirmedProduct:false,sectionIds:[],factIds:[],modelIds:[],questionKey:null,patch,arithmetic:null,detail:false,ambiguous:false};
  return{content:[{type:'text',text:JSON.stringify(out)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
 }};
}
test('the exact six-turn transcript retains every supported part, comparison and privacy boundary',async()=>{
 assert.equal(refersToSelectedHome(exactQuestions[2]),false);assert.equal(refersToSelectedHome('How much does it cost to deliver it?'),true);assert.equal(refersToSelectedHome('How much to deliver that home?'),true);
 let state=initialState('exact',now);
 for(let turn=0;turn<exactQuestions.length;turn++){
  const ctx:InferenceContext={calls:0,now,model:intake(turn)};
  const r=await answerQuestion(exactQuestions[turn],state,ctx),text=r.reply.answerSegments!.map(s=>s.text).join(' ');state=r.state;
  assert.equal(ctx.calls,1);assert.equal(r.mode,'controlled',String(turn));assert.deepEqual(ctx.coverage?.missing,[]);assert.deepEqual(ctx.failures??[],[]);assert.equal(stateValue(state,'targetDate'),undefined);
  assert.doesNotMatch(text,/No verified public country-by-component matrix|Do not name|connection is busy|couldn’t verify a complete answer/);
  if(turn===0){assert.match(text,/Canadian.*assembly|Canadian.*completion/);assert.match(text,/component package.*volumetric modular home/);}
  if(turn===1){assert.match(text,/Cedarview.*cold-formed light steel frame/);assert.match(text,/not a final model-specific supply schedule/);assert.match(text,/foundations.*unless expressly included/);}
  if(turn===2){assert.match(text,/Freight.*written project quotation/);assert.match(text,/Premium: CAD \$250/);assert.match(text,/Signature: CAD \$300/);assert.match(text,/published for Salt Spring/);assert.equal(stateValue(state,'location'),undefined);assert.ok(!r.reply.facts.some(f=>f.href.includes('cedarview')));}
  if(turn===3){assert.deepEqual(ctx.coverage?.requested,['r1','r2']);assert.deepEqual(ctx.coverage?.retained,['r1','r2']);assert.equal(r.reply.answerSegments!.length,1);}
  if(turn>=3){assert.match(text,/like-for-like.*comparison is not available/);assert.match(text,/same design, engineering, supply, freight and local construction scope/);assert.doesNotMatch(text,/CAD|\$|20% more|steel can be more expensive|local framer.*not provide/);assert.deepEqual(r.reply.modelCards,[]);}
  if(turn>=4)assert.match(text,/can’t confirm the 20% difference you asked about/);
  if(turn===5){assert.equal(state.activeQuestion,exactQuestions[4]);assert.match(text,/1,500/);assert.match(text,/reported site readiness and builder experience/);assert.match(projectSummary(state),/Site is ready/);assert.equal(stateValue(state,'role'),undefined);assert.equal(r.reply.question,'');}
 }
});
test('both exact leaked sentences are internal at publication and answer boundaries, separately or together',()=>{
 const origin=factIndex.get('F-ORIGIN')!,p=publicFactContent(origin);
 const sentences=['No verified public country-by-component matrix.','Do not name a country, factory or partner from private knowledge.'];
 for(const text of [...sentences,sentences.join(' ')]){
  assert.ok(origin.qualifiers.some(q=>q.includes(text)));assert.ok(!JSON.stringify(p).includes(text));assert.equal(containsInternalInstruction(text),true);
  const a:NaturalAnswer={answerSegments:[{text,evidenceRefs:['F-ORIGIN']}],selectedModelIds:[],nextQuestion:null,nextAction:'none'};
  assert.equal(naturalRejection(a,[{id:'F-ORIGIN',data:p,sourceIds:origin.source_ids}],[],false),'internal_instruction');
 }
});
test('market dates never set or replace project timing; real construction goals retain authoritative relative dates',()=>{
 let s=initialState('date',now);
 for(const q of ['Is steel cheaper than wood today?','What are prices next year?','How much does delivery cost next month?']){
  s=mergePatch(s,{targetDate:'2026-11-14'},q,now);assert.equal(stateValue(s,'targetDate'),undefined,q);
 }
 s=mergePatch(s,{},'We want to start next year.',now);assert.equal(stateValue(s,'targetDate'),'2027');
 s=mergePatch(s,{targetDate:'2026-11-14'},'Is steel cheaper today?',now);assert.equal(stateValue(s,'targetDate'),'2027');
 const mixed=mergePatch(initialState('mixed',now),{},'What are steel prices today, but we want to start next year?',now);assert.equal(stateValue(mixed,'targetDate'),'2027');
 const absolute=mergePatch(initialState('absolute',now),{targetDate:'2028-03'},'Our target date is March 2028.',now);assert.equal(stateValue(absolute,'targetDate'),'2028-03');
});
