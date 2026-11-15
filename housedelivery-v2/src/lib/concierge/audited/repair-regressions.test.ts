import {test} from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv/dist/2020';
import type {LanguageModel} from 'ai';
import {initialState,mergePatch,stateValue,constraints} from './state';
import {shortlist} from './matching';
import {knowledge} from './registry';
import {referenceClock} from './clock';
import {normalizeIntent} from './request-plan';
import {outputSchema,requestAnswer,answerQuestion} from './compose';
import {policyIndex,renderPolicies} from './policies';
import {retrieve} from './evidence';
import type {Intent} from './intent';
import type {InferenceContext} from './llm';
const now=Date.parse('2026-11-15T03:00:00Z');
const base=(topic:Intent['topic'],question:string):Intent=>({topic,requests:[{id:'r1',topic,question,policyIds:[],pricing:'none'}],modelContext:'none',unconfirmedProduct:false,factIds:[],modelIds:[],sectionIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false});
const selection="We're a family of four planning a detached home in Nanaimo. We need four bedrooms and around 3,500 sq. ft., with a firm maximum of 3,600 sq. ft. Which designs should we start with?";
const inclusions="We're looking at Cedarview in Kelowna and already have a general contractor. What is included in the home package, and what work needs to be arranged locally?";
const freight="We're considering a Premium home package for a rural site near Brandon, Manitoba. What are your published package rates, and how is freight priced?";
const development="I'm a general contractor planning six two-bedroom infill homes in Winnipeg next year. My crew would handle foundations and assembly. Do you work with builders on projects like this, and how would we start?";

test('saved measurement failure: complete comma-formatted bounds survive and cannot be overwritten',()=>{
 let s=mergePatch(initialState('S'),{areaMax:{value:3,unit:'sf',sqft:3,basis:'published'},location:'Nanaimo'},selection,now);
 assert.equal(stateValue(s,'areaTarget')?.sqft,3500);assert.equal(stateValue(s,'areaMax')?.sqft,3600);
 s=mergePatch(s,{},'We already own the lot, and Canmore appeals to us. What would you need next, keeping our bedroom count and size limit in mind?',now);
 assert.equal(stateValue(s,'areaMax')?.sqft,3600);assert.equal(stateValue(s,'selectedModel'),'home-canmore');assert.equal(stateValue(s,'land'),'owned');
 for(const [q,expected] of [['around 3500 sf, maximum 3,600, and four bedrooms',3600],['maximum 3,600 sq. ft., target 3500',3600],['3500 sf, maximum 3,600.5, and four bedrooms',3600.5]] as const)assert.equal(stateValue(mergePatch(initialState('N'),{},q,now),'areaMax')?.sqft,expected,q);
 assert.equal(stateValue(mergePatch(initialState('N'),{},'3500 sf, maximum 3,60, and four bedrooms',now),'areaMax'),undefined);
});
test('saved context losses: model interest, stated delivery site and follow-up preferences are retained',()=>{
 let s=mergePatch(initialState('C'),{location:'Kelowna',builder:true},inclusions,now);assert.equal(stateValue(s,'selectedModel'),'home-cedarview');
 s=mergePatch(s,{constructionScope:'foundations, assembly; supplying appliances'},"Our contractor can handle foundations and assembly, and we'll supply our own appliances. How should those responsibilities be recorded for the home we discussed?",now);assert.equal(stateValue(s,'selectedModel'),'home-cedarview');
 const shipping=mergePatch(initialState('F'),{},freight,now);assert.equal(stateValue(shipping,'location'),'Brandon');assert.equal(stateValue(shipping,'province'),'Manitoba');assert.equal(stateValue(shipping,'finish'),'Premium');
 const compare=mergePatch(initialState('F'),{location:'Manitoba',province:'Manitoba'},'What does it cost to deliver a kit to Manitoba or rural BC?',now);assert.equal(stateValue(compare,'location'),undefined);
 const place=mergePatch(initialState('P'),{},'We own a site in Langley and want a two-bedroom laneway home.',now);assert.equal(stateValue(place,'selectedModel'),undefined);
 const home=mergePatch(initialState('L'),{location:'Ontario',householdNeeds:'multigenerational'},'We like Langley for a multigenerational household in Ontario.',now);
 const preferences=mergePatch(home,{},'We prefer a warm, low-maintenance kitchen and a private space for an older parent. How would you carry those priorities forward?',now);
 assert.equal(stateValue(preferences,'selectedModel'),'home-langley');assert.match(stateValue(preferences,'householdNeeds')!,/multigenerational.*warm.*low-maintenance.*older parent/);
});
test('authoritative Pacific clock resolves relative dates and preserves total homes through phasing',()=>{
 assert.deepEqual(referenceClock(now),{utc:'2026-11-15T03:00:00.000Z',timeZone:'America/Vancouver',localDate:'2026-11-14',year:2026});
 let s=mergePatch(initialState('D'),{targetDate:'2025',location:'Winnipeg',constructionScope:'foundations and assembly'},development,now);
 assert.equal(stateValue(s,'homes'),6);assert.equal(stateValue(s,'bedrooms'),2);assert.equal(stateValue(s,'targetDate'),'2027');assert.equal(stateValue(s,'role'),'general contractor');
 s=mergePatch(s,{homes:3,targetDate:'2025'},'Could we phase those into two groups of three, and what do you still need to assess the project?',now);
 assert.equal(stateValue(s,'homes'),6);assert.equal(stateValue(s,'phaseHomes'),3);assert.equal(stateValue(s,'targetDate'),'2027');
 for(const [at,year]of [['2027-01-01T02:00:00Z','2027'],['2027-01-01T09:00:00Z','2028']])assert.equal(stateValue(mergePatch(initialState('T'),{targetDate:'2025'},'We want to start next year.',Date.parse(at)),'targetDate'),year);
});
test('request plans reconcile design matching and builder programs without declaring ordinary housing unconfirmed',()=>{
 const s=mergePatch(initialState('S'),{location:'Nanaimo'},selection,now),i=normalizeIntent(base('property',selection),selection,s);
 assert.equal(i.requests![0].topic,'matching');const models=retrieve(i,s,selection).models.map(m=>m.id);assert.ok(models.includes('home-canmore'));assert.ok(models.every(id=>knowledge.models.find(m=>m.id===id)!.area_sqft!<=3600));assert.ok(shortlist(constraints(s),knowledge.models,.1,99).matches.some(m=>m.id==='home-cedarview'));
 const d=mergePatch(initialState('D'),{},development,now),p=normalizeIntent(base('matching',development),development,d);assert.equal(p.topic,'builder');assert.equal(p.requests![0].topic,'builder');
 assert.equal(normalizeIntent({...base('pricing',freight),unconfirmedProduct:true},freight,initialState('P')).unconfirmedProduct,false);
 assert.equal(normalizeIntent(base('pricing','Can you quote a commercial warehouse?'),'Can you quote a commercial warehouse?',initialState('P')).unconfirmedProduct,true);
});
test('rate choices exist only for an eligible individual request, never for freight or ordinary text',()=>{
 const requests:NonNullable<Intent['requests']>=[{id:'r1',topic:'pricing',question:'Published rates?',pricing:'planning_rates'},{id:'r2',topic:'pricing',question:'Freight estimate inputs?',pricing:'freight'},{id:'r3',topic:'matching',question:'Which design?',pricing:'none'}];
 const misleading=outputSchema(['F-PRICE'],[],false,[{id:'r2',topic:'pricing',question:'Freight rate for a Premium kit?',pricing:'planning_rates'}]);assert.ok(!JSON.stringify(misleading).includes('planningRates'));
 const schema=outputSchema(['F-PRICE','F-SCOPE'],[],false,requests);const validate=new Ajv({strict:true}).compile(schema);
 const good={answers:{r1:{text:'Planning references need a written scope.',evidenceRefs:['F-PRICE'],planningRates:['Premium','Signature']},r2:{text:'Freight needs project review.',evidenceRefs:['F-SCOPE']},r3:{text:'These designs fit.',evidenceRefs:['F-SCOPE']}},selectedModelIds:[],nextQuestion:null,nextAction:'none'};
 assert.equal(validate(good),true);for(const id of ['r2','r3'])assert.equal(validate({...good,answers:{...good.answers,[id]:{...good.answers[id as 'r2'|'r3'],planningRates:['Premium']}}}),false);
 const ctx:InferenceContext={calls:0};const ordinary=requestAnswer({text:'These designs fit.',evidenceRefs:['F-SCOPE'],planningRates:['Premium']},requests[2],['F-SCOPE'],false,ctx);assert.equal(ordinary?.text,'These designs fit.');assert.deepEqual(ctx.rejections,['ineligible_rate_reference_ignored']);
 assert.equal(requestAnswer({text:'It costs CAD $225.',evidenceRefs:['F-SCOPE']},requests[2],['F-SCOPE']),null);
 assert.equal(requestAnswer({text:'It costs 225 CAD.',evidenceRefs:['F-SCOPE']},requests[2],['F-SCOPE']),null);
});
test('explicit policy records preserve unknown availability, confidentiality and commercial qualifications',()=>{
 assert.equal(policyIndex.get('plant_visit')!.status,'team_confirmation');assert.equal(policyIndex.get('engineering_documents')!.status,'team_confirmation');
 const text=renderPolicies(['plant_visit','engineering_documents'],initialState('P')).map(p=>p.text).join(' ');
 assert.match(text,/Plant-visit availability.*confirmation/);assert.match(text,/availability and release.*confirmation/);assert.match(text,/does not mean all technical documentation is confidential or unavailable/);assert.doesNotMatch(text,/not routinely|never offer|always included/);
 assert.match(policyIndex.get('local_work')!.text,/unless expressly included/);assert.match(policyIndex.get('appliances')!.text,/unless expressly included/);
});
function extractionFixture(requests:NonNullable<Intent['requests']>,patch:Record<string,unknown>={},unconfirmedProduct=false):LanguageModel{
 return{specificationVersion:'v4',provider:'local-extraction-fixture',modelId:'approved-records',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async options=>{
  const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined;if(!schema?.properties?.patch)throw Error('Unexpected generation or reviewer: records must be rendered directly');
  const props=(schema.properties.patch as {properties:Record<string,{type?:unknown}>}).properties;
  const value={...base(requests[0].topic,requests[0].question),requests,unconfirmedProduct,patch:{...Object.fromEntries(Object.entries(props).map(([k,v])=>[k,v.type==='array'?[]:null])),...patch}};
  return{content:[{type:'text',text:JSON.stringify(value)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
 }};
}
test('factory records answer both requests without a generated policy or an AI reviewer',async()=>{
 const q='Can I inspect the manufacturing plant before I buy, or get the factory’s direct engineering spec sheets?';
 const requests:NonNullable<Intent['requests']>=[{id:'r1',topic:'process',question:'Plant visits?',policyIds:['plant_visit'],pricing:'none'},{id:'r2',topic:'specifications',question:'Direct engineering documentation?',policyIds:['engineering_documents'],pricing:'none'}];
 const ctx:InferenceContext={calls:0,now,model:extractionFixture(requests)};const r=await answerQuestion(q,initialState('F'),ctx);
 assert.equal(ctx.calls,1);assert.equal(r.mode,'controlled');assert.deepEqual(ctx.coverage?.missing,[]);assert.match(r.reply.answerSegments!.map(s=>s.text).join(' '),/availability and release.*team confirmation/);
});


test('mixed rates and freight render independently with the retained site and no false product restriction',async()=>{
 const requests:NonNullable<Intent['requests']>=[{id:'r1',topic:'pricing',question:'Published package rates?',policyIds:[],pricing:'planning_rates'},{id:'r2',topic:'pricing',question:'How is freight priced?',policyIds:['freight_quotation'],pricing:'freight'}];
 const ctx:InferenceContext={calls:0,now,model:extractionFixture(requests,{},true)};
 const r=await answerQuestion(freight,initialState('P'),ctx);
 assert.equal(ctx.calls,1);assert.equal(r.mode,'controlled');assert.deepEqual(ctx.coverage?.missing,[]);
 const text=r.reply.answerSegments!.map(s=>s.text).join(' ');assert.match(text,/Premium: CAD \$250/);assert.match(text,/Signature: CAD \$300/);assert.match(text,/Brandon, Manitoba/);assert.match(text,/written project quotation/);assert.match(text,/not completed-home/);
});
