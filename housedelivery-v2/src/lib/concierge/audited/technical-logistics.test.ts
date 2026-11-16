import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {LanguageModel} from 'ai';
import type {Intent} from './intent';
import {privateRequest} from './commercial';
import {publicQuestion} from './response-plan';
import {initialState,mergePatch,stateValue} from './state';
import {normalizeIntent,planningRatesEligible} from './request-plan';
import {compilePolicyAnswers,answerQuestion} from './compose';
import {renderPolicies} from './policies';
const plan=(question:string,topic:Intent['topic']='specifications',policyIds:string[]=[]):Intent=>({topic,requests:[{id:'r1',topic,question,policyIds,pricing:'none'}],modelContext:'none',unconfirmedProduct:false,sectionIds:[],factIds:[],modelIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false});
function intake(question:string,topic:Intent['topic']='specifications',policyIds:string[]=[]):LanguageModel{
 return{specificationVersion:'v4',provider:'local-policy-fixture',modelId:'no-service',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async options=>{
  const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined;
  if(!schema?.properties?.patch)throw Error('Unexpected additional model stage');
  const props=(schema.properties.patch as {properties:Record<string,{type?:unknown}>}).properties;
  const value={...plan(question,topic,policyIds),patch:Object.fromEntries(Object.entries(props).map(([k,v])=>[k,v.type==='array'?[]:null]))};
  return{content:[{type:'text',text:JSON.stringify(value)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
 }};
}
test('public documentation, quality and customer landed-price questions are not supplier-identity requests',()=>{
 for(const q of ["Can I review your supplier’s engineering specifications?","Are your supplier's technical documents available for review?",'Who supplies the engineering documentation?',"Who supplies your manufacturer's technical specifications?","Can I see the factory's engineering spec sheets?",'How do you verify manufacturing quality?','What would a factory-manufactured kit cost landed and delivered to my Canadian site?','Does the factory-manufactured package price include CBSA duties and customs brokerage?'])assert.equal(privateRequest(q),false,q);
 for(const q of ['Who manufactures your frames?','Is ExampleFrameCo your manufacturer?','Send the original supplier quotation.',"Can you send your supplier’s quotation?",'Give me the factory invoice and your markup.','Which city is your factory in?','Show unredacted private factory records.'])assert.equal(privateRequest(q),true,q);
});
test('mixed identities plus documentation and customs retain every public request without private identities',()=>{
 for(const [q,expected]of [
  ['Who manufactures the frames, and can I review the engineering specifications?',/engineering specifications/],
  ['Who is your supplier? Do you handle customs clearance and applicable import costs?',/customs clearance/],
  ['Name the factory, and what does landed kit pricing cover?',/landed kit pricing/],
  ['Can I review engineering documents without being given the manufacturer identity?',/engineering documentation/],
  ['Give me the factory identity with a landed kit quotation including customs responsibilities.',/landed and delivered kit quotation/]
 ] as const){const b=publicQuestion(q);assert.equal(b.restricted,true);assert.match(b.question,expected);assert.doesNotMatch(b.question,/Who manufactures|Who is your supplier|Name the factory/i);}
});
test('an identity condition is acknowledged without stale discovery prompts and preserves known customer requirements',async()=>{
 let s=mergePatch(initialState('identity'),{},'Our lot is 4000 sf in East Vancouver, and four or five bedrooms would work.');
 s.lastQuestion='What home size would you like?';s.pendingQuestion={kind:'location',text:'Which city?'};
 for(const q of ['I need the manufacturer identity before I proceed.','Then I cannot proceed.',"I won't commit without knowing who manufactures it."]){
  const ctx={calls:0};const r=await answerQuestion(q,s,ctx);s=r.state;const text=r.reply.answerSegments!.map(x=>x.text).join(' ');
  assert.equal(ctx.calls,0);assert.match(text,/condition of proceeding/);assert.match(text,/confidential/);assert.equal(r.reply.question,'');assert.equal(r.reply.nextAction,'none');assert.equal(s.lastQuestion,'');assert.equal(s.pendingQuestion,undefined);assert.equal(s.activeQuestion,undefined);assert.deepEqual(stateValue(s,'bedroomOptions'),[4,5]);assert.equal(stateValue(s,'siteArea')?.sqft,4000);
 }
 const q='Can I review engineering documentation instead?';assert.equal(publicQuestion(q,true).restricted,false);
 const needsDocuments='I cannot proceed without reviewing engineering documentation.';assert.equal(publicQuestion(needsDocuments,true).restricted,false);
});
test('documentation and quality requests use explicit availability records instead of invented blanket secrecy',async()=>{
 for(const q of ["Can I inspect the manufacturing plant before I buy, or get the factory’s direct engineering spec sheets?",'What engineering documents and manufacturing quality evidence can I review?',"Are your supplier's technical specifications available?"]){
  const ctx={calls:0,model:intake(q,'specifications',['unrecorded_policy'])};const r=await answerQuestion(q,initialState('documents'),ctx),text=r.reply.answerSegments!.map(x=>x.text).join(' ');
  assert.equal(r.mode,'controlled');assert.equal(ctx.calls,1);assert.match(text,/availability and release.*engineering documentation require team confirmation/i);assert.match(text,/does not mean all technical documentation is confidential or unavailable/);assert.doesNotMatch(text,/not routinely provided|we never|all technical documents are confidential|temporarily|busy/);assert.equal(r.reply.question,'');
  if(/quality/i.test(q))assert.match(text,/quality oversight|inspection, testing/);
  if(/plant/i.test(q))assert.match(text,/Plant-visit availability/);
 }
});
test('structural choices distinguish the published model from an engineered project decision',async()=>{
 const state=mergePatch(initialState('systems'),{},'We like the Aurora.');
 for(const q of ['Must this model use steel, or can timber or another engineered system be considered?','Is light-gauge steel the only structural option?','Is timber guaranteed to be available for this model?']){
  const ctx={calls:0,model:intake(q)};const r=await answerQuestion(q,state,ctx),text=r.reply.answerSegments!.map(x=>x.text).join(' ');
  assert.equal(r.mode,'controlled');assert.equal(ctx.calls,1);assert.match(text,/Aurora’s published description lists/);assert.match(text,/steel, timber and other suitable engineered systems/);assert.match(text,/not proof.*must use/);assert.match(text,/project-specific design and engineering review/);assert.doesNotMatch(text,/can only be built|must be built with|every model is available in timber/);
 }
});
test('landed/customs questions retain all scope distinctions and specific unconfirmed delivery terms without rates',async()=>{
 const questions=['Does your landed kit price include international freight, CBSA duties, customs brokers, port handling and delivery to my site?','Do I have to appoint my own customs broker, or is that included?','What is the difference between the factory kit price, landed cost and a completed Canadian home?'];
 for(const q of questions){
  const ctx={calls:0,model:intake(q,'pricing',['unrecorded_policy'])};const r=await answerQuestion(q,initialState('delivery'),ctx),text=r.reply.answerSegments!.map(x=>x.text).join(' ');
  assert.equal(ctx.calls,1);assert.equal(r.mode,'controlled');for(const expected of [/coordinates manufacturing, purchasing and logistics/,/factory-manufactured kit/,/landed costs at a named import destination/,/onward Canadian delivery/,/completed home/,/CBSA duties/,/customs brokerage/,/port handling/,/who appoints the customs broker/,/importer of record/])assert.match(text,expected);
  assert.doesNotMatch(text,/CAD|\$|duty.free|all.inclusive|we (?:pay|cover|include)|you must (?:hire|appoint)|don’t have a confirmed answer|temporarily|busy/);
  const normalized=normalizeIntent(plan(q,'pricing',['unrecorded_policy']),q,initialState('delivery'));assert.ok(!normalized.requests!.some(p=>p.policyIds?.includes('unrecorded_policy')));assert.ok(!normalized.requests!.some(p=>p.policyIds?.includes('financing_information')));
 }
 assert.equal(planningRatesEligible({id:'r1',topic:'pricing',question:'Are customs brokerage and CBSA duties included?',pricing:'planning_rates',policyIds:[]}),false);
 const compiled=compilePolicyAnswers(plan(questions[0],'pricing',['freight_quotation','landed_delivery_scope']).requests!,initialState('delivery'),questions[0],['F-SCOPE','F-EXCLUSIONS']);assert.equal(compiled.segments.length,1);
 assert.match(renderPolicies(['freight_quotation'],initialState('ordinary'))[0].text,/Freight and applicable import costs/);
});

test('scope definitions coexist with real comparative limits and independent financing requests',()=>{
 const q='What does the landed kit price cover, and is a steel kit 20% cheaper than timber?';
 const raw={...plan(q,'pricing'),requests:[{id:'r1',topic:'pricing' as const,question:'What does the landed kit price cover?',policyIds:[],pricing:'project_quote' as const},{id:'r2',topic:'comparison' as const,question:'Is a steel kit 20% cheaper than timber?',policyIds:[],pricing:'project_quote' as const}]};
 const state=initialState('compound'),normalized=normalizeIntent(raw,q,state),compiled=compilePolicyAnswers(normalized.requests!,state,q,['F-SYSTEMS','F-SCOPE','F-EXCLUSIONS']);
 assert.ok(compiled.records.some(r=>r.id==='landed_delivery_scope'));assert.ok(compiled.records.some(r=>r.id==='system_comparison'));assert.ok(!normalized.requests![0].comparisonLimit);assert.ok(normalized.requests![1].comparisonLimit);
 const finance='Can I get a mortgage, and who handles CBSA duties and customs brokerage?';
 const f=normalizeIntent({...plan(finance,'process'),requests:[{id:'r1',topic:'process',question:'Can I get a mortgage?',policyIds:['financing_information'],pricing:'none'},{id:'r2',topic:'pricing',question:'Who handles CBSA duties and customs brokerage?',policyIds:[],pricing:'project_quote'}]},finance,state);
 assert.ok(f.requests!.some(r=>r.policyIds?.includes('landed_delivery_scope')));assert.ok(f.requests!.some(r=>r.policyIds?.includes('financing_information')));
});

test('the exact factory-name then please follow-up accepts the new public offer, never stale plant/document guidance',async()=>{
 let s=mergePatch(initialState('please'),{},'I have a 4000 square foot property in Vancouver.');
 s=mergePatch(s,{},'I am not sure how big of a house I can build on a 4000 square foot lot but I would need 4 bedrooms minimum');
 s.activeQuestion="Can I inspect the manufacturing plant before I buy, or get the factory's direct engineering spec sheets?";s.lastQuestion='Would you like help with this?';s.activeRequests=plan(s.activeQuestion).requests;
 const identity=await answerQuestion('Can you tell me the factory name then?',s,{calls:0});assert.equal(identity.state.boundaryOffer,'public_manufacturing_approach');assert.equal(identity.state.activeQuestion,undefined);
 const ctx={calls:0};const accepted=await answerQuestion('please',identity.state,ctx),text=accepted.reply.answerSegments!.map(x=>x.text).join(' ');
 assert.equal(ctx.calls,0);assert.equal(accepted.mode,'controlled');assert.match(text,/Canadian.*(?:assembly|completion)/);assert.match(text,/steel, timber and other suitable engineered systems/);assert.doesNotMatch(text,/engineering specification sheets are confidential|not publicly released|Plant-visit|Would you like/);assert.equal(accepted.reply.question,'');assert.equal(accepted.state.boundaryOffer,undefined);assert.equal(stateValue(accepted.state,'siteArea')?.sqft,4000);assert.equal(stateValue(accepted.state,'bedrooms'),4);assert.equal(stateValue(accepted.state,'bedroomMode'),'minimum');
 for(const q of ['no I need factory name first or I cannot proceed','no I need factory name first or I will not proceed']){const c={calls:0};const r=await answerQuestion(q,accepted.state,c);assert.equal(c.calls,0);assert.match(r.reply.answerSegments![0].text,/condition of proceeding/);assert.equal(r.reply.question,'');assert.equal(r.reply.nextAction,'none');}
});
