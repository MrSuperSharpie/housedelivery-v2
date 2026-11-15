import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {LanguageModel} from 'ai';
import type {Intent} from './intent';
import type {InferenceContext} from './llm';
import {initialState,mergePatch,stateValue} from './state';
import {comparisonLimit,inheritComparisonLimits,finalizeComparisonAnswers} from './comparison';
import {normalizeIntent,planningRatesEligible} from './request-plan';
import {answerQuestion,compilePolicyAnswers,naturalRejection,type NaturalAnswer} from './compose';
type Part=NonNullable<Intent['requests']>[number];
const part=(id:string,question:string,topic:Part['topic']='comparison'):Part=>({id,question,topic,pricing:'none',policyIds:[]});
const plan=(requests:Part[]):Intent=>({topic:'comparison',requests,modelContext:'none',unconfirmedProduct:false,factIds:[],modelIds:[],sectionIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false});
function extractionOnly(requests:Part[]):LanguageModel{
 return{specificationVersion:'v4',provider:'local-parent-comparison',modelId:'intake-only',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async options=>{
  const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined;
  if(!schema?.properties?.patch)throw Error('Comparison escaped into generation or a reviewer');
  const props=(schema.properties.patch as {properties:Record<string,{type?:unknown}>}).properties;
  const output={...plan(requests),patch:Object.fromEntries(Object.entries(props).map(([k,v])=>[k,v.type==='array'?[]:null]))};
  return{content:[{type:'text',text:JSON.stringify(output)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
 }};
}
const variants=[
 {q:"Why shouldn't I just have a local framer stick-build this with lumber? Isn't steel way more expensive right now?",parts:["Why shouldn't I just have a local framer stick-build this with lumber?","Isn't steel way more expensive right now?"]},
 {q:'Is prefab more expensive than site-built housing? Is it actually faster or better quality?',parts:['Is prefab more expensive?','Is the alternative faster or better quality?']},
 {q:'Would concrete or timber framing cost less, and which is more reliable?',parts:['Would concrete cost less?','Which is more reliable?']},
 {q:'Why choose your housing package instead of a local framing crew? What shows it saves money or lasts longer?',parts:['Why choose your housing package?','Does it save money or last longer?']},
 {q:'Does engineered timber have a lower price than masonry? Would the result be more durable?',parts:['Does engineered timber have a lower price?','Would the result be more durable?']},
 {q:'Are Cedarview and Canmore equally priced, and which has superior quality?',parts:['Are these homes equally priced?','Which has superior quality?']}
];
test('parent comparison scope binds every related child despite omitted alternatives and varied wording',async()=>{
 for(const v of variants){
  const requests=v.parts.map((q,i)=>part('r'+(i+1),q));const ctx:InferenceContext={calls:0,model:extractionOnly(requests)};
  const result=await answerQuestion(v.q,initialState('general'),ctx),text=result.reply.answerSegments!.map(s=>s.text).join(' ');
  assert.equal(ctx.calls,1,v.q);assert.equal(result.mode,'controlled',v.q);assert.deepEqual(ctx.failures??[],[],v.q);assert.deepEqual(ctx.rejections??[],[],v.q);
  assert.deepEqual(ctx.coverage,{requested:['r1','r2'],retained:['r1','r2'],missing:[]},v.q);assert.deepEqual(ctx.policyRecords?.map(p=>p.requestId),['r1','r2'],v.q);
  assert.equal(result.reply.answerSegments!.length,1,v.q);assert.match(text,/like-for-like.*comparison is not available/);assert.match(text,/same design, engineering, supply, freight and local construction scope/);
  assert.doesNotMatch(text,/steel-versus-timber|optimized|improve reliability|superior quality|couldn’t confirm|busy|just now|try again|CAD|\$/);assert.equal(result.reply.question,'');assert.deepEqual(result.reply.modelCards,[]);
 }
});
test('reviewer-approved substitute benefits cannot cross the final answer boundary',()=>{
 const q=variants[0].q,requests=inheritComparisonLimits(variants[0].parts.map((q,i)=>part('r'+(i+1),q)),q);
 const state=initialState('guard'),compiled=compilePolicyAnswers(requests,state,q,['F-SYSTEMS','F-SCOPE','F-TIMING']);
 const prose=['Our engineered kits can improve reliability and assembly quality.','This approach may deliver superior results even if prices are higher.','Your local builder might not match our durability or speed.'];
 const proposed:NaturalAnswer={answerSegments:prose.map((text,i)=>({text,evidenceRefs:['F-SYSTEMS'],requestId:i===2?undefined:'r'+(i+1)})),selectedModelIds:[],nextQuestion:null,nextAction:'none'};
 assert.equal(naturalRejection(proposed,[],[],false,state,requests),'comparison_evidence_required');
 assert.deepEqual(finalizeComparisonAnswers(proposed.answerSegments,requests,compiled.segments),compiled.segments);
 assert.equal(compiled.records.length,2);assert.equal(compiled.segments.length,1);assert.deepEqual(compiled.answeredRequestIds,['r1','r2']);
 for(const r of compiled.requests)assert.equal(planningRatesEligible(r),false);
});
test('separate local scope stays answerable alongside a limited comparison',async()=>{
 const q='Is prefab cheaper than masonry, and what work must I arrange locally?';
 const requests=[part('r1','Is prefab cheaper than masonry?'),{...part('r2','What work must I arrange locally?','builder'),policyIds:['local_work']}];
 const ctx:InferenceContext={calls:0,model:extractionOnly(requests)};const r=await answerQuestion(q,initialState('mixed'),ctx),text=r.reply.answerSegments!.map(s=>s.text).join(' ');
 assert.equal(ctx.calls,1);assert.deepEqual(ctx.coverage?.missing,[]);assert.deepEqual(ctx.policyRecords?.map(p=>p.id),['system_comparison','local_work']);assert.match(text,/foundations.*unless expressly included/);assert.match(text,/like-for-like/);
 const normalized=normalizeIntent(plan(requests),q,initialState('mixed'));assert.ok(!normalized.requests![1].comparisonLimit);
 const factual={text:'Local scope needs written confirmation.',evidenceRefs:['F-SCOPE'],requestId:'r2'};
 assert.ok(finalizeComparisonAnswers([factual],normalized.requests!,[]).includes(factual));
});
test('published model attributes and approved planning references retain their existing evidence paths',()=>{
 for(const q of ['Compare Canmore and Cascade by published floor area and bedrooms.','Which layout is better for guest privacy?','How do Essential, Premium and Signature tiers differ?','Compare published Premium and Signature planning rates per square foot.','How are your homes built, and how is this different from a traditional modular home?'])assert.equal(comparisonLimit(q),null,q);
 const q='Compare Canmore and Cascade by published floor area and bedrooms.',s=mergePatch(initialState('features'),{},q),i=normalizeIntent(plan([part('r1',q)]),q,s);
 assert.ok(!i.requests![0].comparisonLimit);assert.equal(stateValue(s,'comparedModels')?.length,2);
 assert.ok(comparisonLimit('Are the published Premium and Signature planning rates cheaper than site-built timber?'));
 const rates='Compare published Premium and Signature planning rates per square foot.';
 const p=normalizeIntent(plan([{...part('r1',rates,'pricing'),pricing:'planning_rates',policyIds:['pricing_scope']}]),rates,initialState('rates'));
 const c=compilePolicyAnswers(p.requests!,initialState('rates'),rates,['F-PRICE','F-SCOPE']);assert.match(c.segments[0].text,/Premium: CAD \$250/);assert.match(c.segments[0].text,/Signature: CAD \$300/);assert.match(c.segments[0].text,/Salt Spring/);
});

test('rejected output is not reported as provider downtime; a genuine rate limit remains a service error',async()=>{
 const question='Is prefab cheaper than conventional framing?';
 const invalid:InferenceContext={calls:0,fault:'invalid'};const rejected=await answerQuestion(question,initialState('invalid'),invalid),text=rejected.reply.answerSegments!.map(s=>s.text).join(' ');
 assert.ok(invalid.failures?.some(f=>f.category==='output_validation'));assert.match(text,/don’t have a confirmed answer/);assert.doesNotMatch(text,/connection|busy|temporarily|just now|try again/);
 const model:LanguageModel={specificationVersion:'v4',provider:'local-rate-fixture',modelId:'busy',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async()=>{throw Object.assign(new Error('Too many requests'),{statusCode:429})}};
 const busy:InferenceContext={calls:0,model};const unavailable=await answerQuestion(question,initialState('busy'),busy);
 assert.equal(busy.failures?.[0].category,'rate_limit');assert.match(unavailable.reply.answerSegments!.map(s=>s.text).join(' '),/connection is busy/);
});
