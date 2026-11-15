import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {LanguageModel} from 'ai';
import type {Intent} from './intent';
import {thermalEnvelopeRecord} from './building-science';
import {comparisonLimit,inheritComparisonLimits} from './comparison';
import {initialState} from './state';
import {normalizeIntent} from './request-plan';
import {answerQuestion,compilePolicyAnswers} from './compose';
import type {InferenceContext} from './llm';
type Part=NonNullable<Intent['requests']>[number];
const part=(id:string,question:string):Part=>({id,question,topic:'comparison',policyIds:['system_comparison'],pricing:'none'});
const plan=(requests:Part[]):Intent=>({topic:'comparison',requests,modelContext:'none',unconfirmedProduct:false,factIds:[],modelIds:[],sectionIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false});
function intake(requests:Part[]):LanguageModel{
 return{specificationVersion:'v4',provider:'local-thermal-fixture',modelId:'intake-only',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async options=>{
  const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined;
  if(!schema?.properties?.patch)throw Error('Unexpected generation or reviewer');
  const props=(schema.properties.patch as {properties:Record<string,{type?:unknown}>}).properties;
  const output={...plan(requests),patch:Object.fromEntries(Object.entries(props).map(([k,v])=>[k,v.type==='array'?[]:null]))};
  return{content:[{type:'text',text:JSON.stringify(output)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
 }};
}
test('physical heat transfer does not become a construction-speed or quotation comparison',async()=>{
 for(const q of [
  'Steel conducts cold way faster than wood—how do your wall panels prevent thermal bridging and condensation in a harsh Canadian winter?',
  'Metal transfers heat much faster than timber. How do you control wall condensation and cold spots?',
  'How does continuous exterior insulation reduce thermal bridging in steel walls?',
  'Does faster heat transfer in steel framing cause condensation, and how can wall insulation address it?'
 ]){
  assert.equal(comparisonLimit(q),null,q);
  const ctx:InferenceContext={calls:0,model:intake([part('r1',q)])};const result=await answerQuestion(q,initialState('thermal'),ctx);
  const text=result.reply.answerSegments!.map(s=>s.text).join(' ');
  assert.equal(ctx.calls,1);assert.equal(result.mode,'controlled');assert.deepEqual(ctx.failures??[],[]);assert.deepEqual(ctx.coverage?.missing,[]);
  assert.match(text,/whole-wall effective R-value/);assert.match(text,/continuous exterior insulation/);assert.match(text,/airtightness.*vapour control.*humidity.*climate/);
  assert.match(text,/House Delivery’s selected wall build-up.*need project-specific confirmation/);
  assert.doesNotMatch(text,/like-for-like|quotations|thermal break strips|R-\d|\b\d+\s*(?:mm|inches)|our walls (?:use|include|prevent)|no condensation/i);
  assert.deepEqual(ctx.policyRecords?.map(r=>r.id),['thermal_envelope']);
 }
});
test('independent technical mechanisms survive a parent price limit; commercial speed and superiority remain bounded',()=>{
 const q='Is steel more expensive than timber, and how do wall panels reduce thermal bridging and condensation?';
 const requests=[part('r1','Is steel more expensive than timber?'),part('r2','How do wall panels reduce thermal bridging and condensation?')];
 const inherited=inheritComparisonLimits(requests,q);assert.ok(inherited[0].comparisonLimit);assert.ok(!inherited[1].comparisonLimit);
 const state=initialState('compound'),intent=normalizeIntent(plan(requests),q,state),compiled=compilePolicyAnswers(intent.requests!,state,q,[]),text=compiled.segments.map(s=>s.text).join(' ');
 assert.match(text,/like-for-like/);assert.match(text,/continuous exterior insulation/);assert.deepEqual(compiled.answeredRequestIds,['r1','r2']);
 for(const commercial of [
  'How do you control thermal bridging, and are steel homes faster to build than wood?',
  'Steel conducts heat faster than wood; are your homes faster overall?',
  'How do you manage condensation, and are your walls better quality than timber?'
 ])assert.ok(comparisonLimit(commercial),commercial);
});
test('general building-science authority is separate from confirmed company specifications',()=>{
 assert.equal(thermalEnvelopeRecord.authority,'verified_general_building_science');
 assert.equal(thermalEnvelopeRecord.status,'team_confirmation');assert.deepEqual(thermalEnvelopeRecord.factIds,[]);
 assert.equal(thermalEnvelopeRecord.sourceUrls.length,2);
 assert.doesNotMatch(thermalEnvelopeRecord.text,/\d|guarantee|always|eliminate|dew point outside|our (?:panels|walls) (?:use|include)/i);
});
