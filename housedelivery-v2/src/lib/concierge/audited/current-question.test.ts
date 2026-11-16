import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {LanguageModel} from 'ai';
import {answerQuestion,naturalRejection} from './compose';
import {initialState,mergePatch,stateValue,signState,readState,type State} from './state';
import {normalizeIntent,prioritizeCurrentQuestion} from './request-plan';
import {retrieve} from './evidence';
import type {Intent} from './intent';
import type {InferenceContext} from './llm';
import {propertyDecision,unsupportedSiteClaim} from './property-intent';
const exact=["I'm exploring a home for myself or my family. Help me find a starting point.",'Ideally it would be 3 or a 4 bedroom home maybe 3000 sq. ft.','I have a 4000 sq. ft. lot in Vancouver would this house work?','I have a 4000 sq. ft. lot how big of a home can I build?'];
const plan=(q:string,topic:Intent['topic']='matching'):Intent=>({topic,requests:[{id:'r1',topic,question:q,policyIds:[],pricing:'none'}],modelContext:'none',unconfirmedProduct:false,sectionIds:[],factIds:[],modelIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false});
function selected(){let s=mergePatch(mergePatch(initialState('site'),{},exact[0]),{},exact[1]);s=mergePatch(s,{},'Mayne House');s.recommended=['home-mayne'];return s;}
type Schema={type?:unknown;properties:Record<string,Schema>;items:Schema;enum:(string|number)[]};
function fixture(q:string,text:string,followUp:string|null,topic:Intent['topic']='matching'):LanguageModel{
 return{specificationVersion:'v4',provider:'local-current-question',modelId:'no-network',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async options=>{
  const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined,props=schema!.properties as Record<string,Schema>;let output:unknown;
  if(props.patch)output={...plan(q,topic),patch:Object.fromEntries(Object.entries(props.patch.properties).map(([k,v])=>[k,v.type==='array'?[]:null]))};
  else if(props.answers)output={answers:Object.fromEntries(Object.entries(props.answers.properties).map(([id,segment])=>[id,{text,evidenceRefs:segment.properties.evidenceRefs.items.enum.includes('home-mayne')?['home-mayne',...(segment.properties.evidenceRefs.items.enum.includes('H:property')?['H:property']:[])]:['H:property','V:requirements'],...(segment.properties.planningRates?{planningRates:[]}: {})}])),selectedModelIds:[],nextQuestion:followUp,nextAction:'none'};
  else output={segments:props.segments.items.properties.index.enum.map(index=>({index,supported:true,issues:[]})),followUpSupported:true,complete:true};
  return{content:[{type:'text',text:JSON.stringify(output)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
 }};
}
test('the exact preference keeps both bedroom choices and matches Mayne at the published area',()=>{
 const s=mergePatch(initialState('preferences'),{},exact[1]);assert.deepEqual(stateValue(s,'bedroomOptions'),[3,4]);assert.equal(stateValue(s,'areaTarget')?.sqft,3000);
 const result=retrieve(normalizeIntent(plan(exact[1]),exact[1],s),s,exact[1]);assert.deepEqual(result.models.map(m=>m.id),['home-mayne']);assert.equal(result.models[0].area_sqft,3116);
});
for(const unit of ['sq. ft.','sq ft','sq.ft.','square feet','sf'])test('lot measurement cannot replace desired house area or discard the selected model: '+unit,()=>{
 let s=selected();s=mergePatch(s,{},`I have a 4,000 ${unit} lot in Vancouver would this house work?`);assert.equal(stateValue(s,'siteArea')?.sqft,4000);assert.equal(stateValue(s,'areaTarget')?.sqft,3000);assert.equal(stateValue(s,'selectedModel'),'home-mayne');assert.equal(stateValue(s,'location'),'Vancouver');
});
test('a stated house size and maximum are preferences, not an allowable-size question',()=>{
 const s=mergePatch(initialState('metres'),{},'Our lot is 600 m².');const q='A house of 230 m², maximum 250.';assert.equal(propertyDecision(q,s),null);const next=mergePatch(s,{},q);assert.equal(stateValue(next,'areaTarget')?.value,230);assert.equal(stateValue(next,'areaMax')?.value,250);
});
test('named-home discovery scopes both retrieved evidence and fallback matches to that home',()=>{
 const q="We're a couple with two kids and would like to explore the Aurora.",s=mergePatch(initialState('named'),{},q),i=normalizeIntent(plan(q),q,s),r=retrieve(i,s,q);assert.deepEqual(r.models.map(m=>m.id),['home-aurora']);assert.deepEqual(r.match.matches.map(m=>m.id),['home-aurora']);
});
test('a dimensional feasibility question is not a new shopping preference',()=>{
 const s=mergePatch(selected(),{},'Would a 1500 square foot footprint fit on my lot?');assert.equal(stateValue(s,'areaTarget')?.sqft,3000);assert.equal(stateValue(s,'selectedModel'),'home-mayne');
 const changed=mergePatch(selected(),{},'Actually I want a home around 4000 square feet.');assert.equal(stateValue(changed,'areaTarget')?.sqft,4000);assert.equal(stateValue(changed,'selectedModel'),undefined,'A genuinely changed requirement may invalidate the old match');
});
test('current site questions defeat stale matching while preserving independent requests',()=>{
 const s=mergePatch(selected(),{},exact[2]);
 for(const q of [exact[2],exact[3],'Would this design fit on our parcel?','What zoning and setbacks apply to our site?']){
  const i=normalizeIntent(plan(q),q,s),r=retrieve(i,s,q);assert.equal(i.topic,'property');assert.ok(i.requests!.every(p=>p.topic!=='matching'));assert.deepEqual(r.match.matches,[]);assert.equal(stateValue(s,'selectedModel'),'home-mayne');
 }
 const current=normalizeIntent(plan(exact[2]),exact[2],s);assert.equal(current.modelContext,'follow_up');assert.deepEqual(retrieve(current,s,exact[2]).models.map(m=>m.id),['home-mayne']);
 const general=normalizeIntent(plan(exact[3]),exact[3],s);assert.equal(general.modelContext,'none');assert.deepEqual(retrieve(general,s,exact[3]).models,[]);
 const mixed='What setbacks apply, and can you show me four-bedroom designs?';const raw={...plan(mixed),requests:[{id:'r1',topic:'property' as const,question:'What setbacks apply?',policyIds:[],pricing:'none' as const},{id:'r2',topic:'matching' as const,question:'Show four-bedroom designs.',policyIds:[],pricing:'none' as const}]};assert.ok(prioritizeCurrentQuestion(raw,mixed,s).requests?.some(r=>r.topic==='matching'));
 assert.equal(propertyDecision('what homes would work for my Vancouver property?',s),null,'Open design search remains welcome without proving site fit');
});
test('full response composition preserves the property answer and useful question without repeating cards',async()=>{
 let s:State=selected();
 for(const [q,text,followUp]of [[exact[2],'Mayne House has a published model area of 3,116 sq. ft.; its recorded footprint dimensions are 17.81 × 16.42 m. These are distinct from your lot area, and site suitability requires review.','Do you know your lot frontage and depth?'],[exact[3],'Buildable floor area depends on the actual zoning district and site review; lot area alone does not determine it.','Do you know the zoning district for your property?']] as const){
  const ctx:InferenceContext={calls:0,model:fixture(q,text,followUp)},r=await answerQuestion(q,s,ctx);s=readState(signState(r.state,'local-only'),s.session,'local-only');
  assert.equal(r.mode,'generated');assert.equal(ctx.fallbackReason,undefined);assert.equal(r.reply.question,followUp);assert.deepEqual(r.reply.modelCards,[]);assert.equal(stateValue(s,'selectedModel'),'home-mayne');assert.equal(stateValue(s,'siteArea')?.sqft,4000);assert.equal(stateValue(s,'areaTarget')?.sqft,3000);assert.doesNotMatch(JSON.stringify(r.reply),/Laurentian|Boreal|Which design would you like|What approximate home size/);
 }
});
test('a generated discovery follow-up is not replaced by a server-authored sales question',async()=>{
 const q=exact[1],s=mergePatch(initialState('next'),{},exact[0]),ctx:InferenceContext={calls:0,model:fixture(q,'Mayne House is a published starting point with four bedrooms.','Would a design without a garage work for your household?')};
 const r=await answerQuestion(q,s,ctx);assert.equal(r.reply.question,'Would a design without a garage work for your household?');assert.equal(r.reply.modelCards?.[0].id,'home-mayne');
});
test('site-fit assertions cannot be rescued by a disclaimer while questions and uncertainty remain answerable',()=>{
 for(const q of ['These homes fit well on typical urban lots like yours in East Vancouver.','Mayne House is suitable for your property, subject to review.','The design works on your lot, but approval needs checking.'])assert.equal(unsupportedSiteClaim(q),true,q);
 for(const q of ['We cannot confirm whether this home fits on your lot.','A site review is needed to determine if the design works on your property.','Lot dimensions and applicable zoning need checking.'])assert.equal(unsupportedSiteClaim(q),false,q);
 const text='These homes fit well on typical urban lots like yours in East Vancouver.';assert.equal(naturalRejection({answerSegments:[{text,evidenceRefs:['H:property']}],selectedModelIds:[],nextQuestion:null,nextAction:'none'},[{id:'H:property',data:{facts:['A preliminary review is not site approval.']},sourceIds:[]}],[],false),'unsupported_site_feasibility');
});
