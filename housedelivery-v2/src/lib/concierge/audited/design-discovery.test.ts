import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {LanguageModel} from 'ai';
import {initialState,mergePatch,stateValue,signState,readState,projectSummary,type State} from './state';
import {shortlist} from './matching';
import {storeyPreference} from './storey-requirements';
import {normalizeIntent} from './request-plan';
import {retrieve} from './evidence';
import {answerQuestion,compilePolicyAnswers} from './compose';
import {designLibrary,validateDesignLibrary} from './design-library';
import {knowledge} from './registry';
import type {Intent} from './intent';
import type {InferenceContext} from './llm';
const journey=['I want a 3 or 4 bedroom home.','But what if I wanted to pick different floors and windows, etc?','I think I am looking for a single level home because my mother has a hard time with stairs.','Yes, please show me single-level options.','Do you have other designs beyond what is on the website?'];
const plan=(q:string,topic:Intent['topic']='matching'):Intent=>({topic,requests:[{id:'r1',topic,question:q,policyIds:[],pricing:'none'}],modelContext:'follow_up',unconfirmedProduct:false,factIds:[],modelIds:[],sectionIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false});
const initial=()=>{const s=mergePatch(initialState('discovery'),{},journey[0]);s.recommended=['home-aurora','home-summit','home-mayne'];return s;};
for(const phrase of ['a single level home','a one-level home','a rancher','a single-storey house','a one story home','a ranch-style house','a home with no stairs','a home without interior stairs'])test('natural fully single-level preference: '+phrase,()=>{
 const s=mergePatch(initial(),{accessibility:true},'I am looking for '+phrase+' because my mother has trouble with stairs.');assert.equal(stateValue(s,'storeys'),1);assert.equal(stateValue(s,'accessibility'),undefined);assert.deepEqual(stateValue(s,'bedroomOptions'),[3,4]);assert.deepEqual(s.recommended,[]);assert.equal(s.previousModels?.length,3);
});
test('information questions, negations and ground-floor priorities are not invented full single-level requirements',()=>{
 for(const q of ['What is a rancher?','I do not want a single level home.','A main-floor bedroom would be useful.','My mother has difficulty with stairs.','Is the Aurora single level?'])assert.equal(storeyPreference(q),undefined,q);
 const s=mergePatch(initial(),{storeys:1,accessibility:true},'My mother has difficulty with stairs.');assert.equal(stateValue(s,'storeys'),undefined);assert.equal(stateValue(s,'accessibility'),undefined);assert.match(stateValue(s,'householdNeeds')!,/difficulty with stairs/);const i=normalizeIntent(plan('My mother has difficulty with stairs.'),'My mother has difficulty with stairs.',s);assert.equal(i.topic,'clarify');assert.deepEqual(retrieve(i,s,'My mother has difficulty with stairs.').models,[]);
});
test('changed requirements retire unselected shortlists as well as a selected model, with signed history',()=>{
 for(const selected of [false,true]){let s=initial();if(selected)s=mergePatch(s,{},'Mayne House');s=mergePatch(s,{},journey[2]);s=readState(signState(s,'local-only'),s.session,'local-only');assert.deepEqual(s.recommended,[]);assert.equal(stateValue(s,'selectedModel'),undefined);assert.ok(s.previousModels?.includes('home-mayne'));assert.match(projectSummary(s),/Storeys required: 1/);assert.match(projectSummary(s),/Acceptable bedrooms: 3 or 4/);}
});
test('the exact single-level request searches verified current requirements, not a main-floor-suite substitution',()=>{
 const s=mergePatch(initial(),{},journey[2]),i=normalizeIntent(plan(journey[2],'scope'),journey[2],s),r=retrieve(i,s,journey[2]);assert.equal(i.topic,'matching');assert.equal(r.match.searched,true);assert.deepEqual(r.models,[]);assert.deepEqual(r.match.matches,[]);assert.equal(r.historicalModels.length,3);assert.ok(r.evidence.some(e=>e.id===designLibrary.id));
 assert.ok(knowledge.models.filter(m=>m.family==='architectural').every(m=>m.storeys===2));assert.deepEqual(shortlist({family:'compact',units:1,bedrooms:1,storeys:1,areaBasis:'published'}).matches.map(m=>m.id),['catalog-the-micro']);
});
test('founder public statement is exact, sealed and never an unpublished inventory',()=>{
 assert.equal(designLibrary.text,'House Delivery has access to hundreds of additional home designs beyond the curated selection currently featured on our website.');assert.equal(designLibrary.source.kind,'founder_confirmation');assert.equal(designLibrary.effective_date,'2026-11-16');assert.doesNotThrow(()=>validateDesignLibrary(designLibrary));assert.throws(()=>validateDesignLibrary({...designLibrary,text:'Every design is guaranteed available.'}));assert.doesNotMatch(JSON.stringify(designLibrary),/manufacturer|supplier|private|maintainer|docs\//i);
 const s=mergePatch(initial(),{},journey[2]),i=normalizeIntent(plan(journey[4],'scope'),journey[4],s),r=retrieve(i,s,journey[4]);assert.equal(i.topic,'company');assert.equal(i.modelContext,'none');assert.equal(normalizeIntent({...plan(journey[4]),unconfirmedProduct:true},journey[4],s).unconfirmedProduct,false);assert.equal(normalizeIntent({...plan(journey[3]),unconfirmedProduct:true},journey[3],s).unconfirmedProduct,false);assert.ok(r.evidence.some(e=>e.id===designLibrary.id));assert.deepEqual(r.models,[]);
});
test('ordinary requests for other published homes remain design matching',()=>{
 const q='Show me other homes',s=initial(),i=normalizeIntent(plan(q),q,s),r=retrieve(i,s,q);assert.equal(i.topic,'matching');assert.ok(r.models.length>0);
});
test('finish and window questions answer actual selection boundaries without another matching request',()=>{
 const s=initial(),i=normalizeIntent(plan(journey[1]),journey[1],s),r=retrieve(i,s,journey[1]),policies=compilePolicyAnswers(i.requests!,s,journey[1],r.evidence.map(e=>e.id));assert.equal(i.topic,'customization');assert.ok(i.requests!.every(p=>p.topic!=='matching'));assert.equal(policies.segments.length,1);const text=policies.segments[0].text;assert.match(text,/flooring or glazing design directions.*actually presents/);assert.match(text,/resize or move windows/);assert.match(text,/separate project-specific design and engineering review/);
});
type Schema={type?:unknown;properties:Record<string,Schema>;items:Schema;enum:(string|number)[]};
function fixture(q:string,{invalid=false,historyOnly=false,question='Would you like to explore other designs?'}={}):LanguageModel{
 return{specificationVersion:'v4',provider:'local-design-discovery',modelId:'no-network',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async options=>{
  const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined,p=schema!.properties as Record<string,Schema>;let out:unknown;
  if(p.patch)out={...plan(q),patch:Object.fromEntries(Object.entries(p.patch.properties).map(([k,v])=>[k,v.type==='array'?[]:null]))};
  else if(p.answers)out={answers:Object.fromEntries(Object.entries(p.answers.properties).map(([id,segment])=>[id,{text:invalid?'These homes have 99999 square feet.':historyOnly?'The Aurora is a two-storey design, so it does not meet your fully single-level brief.':designLibrary.text+' '+designLibrary.qualification,evidenceRefs:historyOnly?['home-aurora']:segment.properties.evidenceRefs.items.enum.includes(designLibrary.id)?[designLibrary.id]:['F-START'],...(segment.properties.planningRates?{planningRates:[]}: {})}])),selectedModelIds:[],nextQuestion:question,nextAction:'browse_designs'};
  else out={segments:p.segments.items.properties.index.enum.map(index=>({index,supported:true,issues:[]})),followUpSupported:true,complete:true};
  return{content:[{type:'text',text:JSON.stringify(out)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
 }};
}
test('historical two-storey facts can be explained without reappearing as recommendations',async()=>{
 const q=journey[2],ctx:InferenceContext={calls:0,model:fixture(q,{historyOnly:true})},r=await answerQuestion(q,initial(),ctx);assert.equal(r.mode,'generated');assert.deepEqual(r.reply.modelCards,[]);assert.deepEqual(r.state.recommended,[]);assert.ok(r.state.previousModels?.includes('home-aurora'));assert.match(r.reply.answerSegments!.map(s=>s.text).join(' '),/does not meet/);assert.doesNotMatch(r.reply.question,/^Would you like|explore other/i);
});
test('matching fallback offers the wider library honestly, never rejected images or fabricated unpublished results',async()=>{
 const q=journey[2],ctx:InferenceContext={calls:0,model:fixture(q,{invalid:true})},r=await answerQuestion(q,initial(),ctx);assert.equal(r.mode,'reviewed_fallback');assert.deepEqual(r.reply.modelCards,[]);assert.deepEqual(r.state.recommended,[]);const text=r.reply.answerSegments!.map(s=>s.text).join(' ');assert.match(text,/hundreds of additional home designs/);assert.match(text,/personal design review/);assert.doesNotMatch(text,/Aurora|Summit|Mayne|found.*unpublished|searched.*hundreds/);
});
test('the full five-turn pipeline keeps bedrooms, one level and the mother’s stated needs while advancing accepted help',async()=>{
 let s:State=initial();for(const [n,q]of journey.entries()){
  const r=await answerQuestion(q,s,{calls:0,model:fixture(q)});s=readState(signState(r.state,'local-only'),s.session,'local-only');assert.deepEqual(stateValue(s,'bedroomOptions'),[3,4]);
  if(n>=2){assert.equal(stateValue(s,'storeys'),1);assert.deepEqual(r.reply.modelCards,[]);assert.deepEqual(s.recommended,[]);assert.match(stateValue(s,'householdNeeds')!,/mother.*stairs/);assert.doesNotMatch(r.reply.question,/^Would you like|explore other/i);}
 }
});
