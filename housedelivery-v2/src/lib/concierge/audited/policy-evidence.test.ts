import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {LanguageModel} from 'ai';
import {policyEvidenceValid,type PolicyClaim} from './policy-evidence';
import {answerQuestion} from './compose';
import {initialState} from './state';
import type {InferenceContext} from './llm';
import type {Evidence} from './evidence';
import {handbookIndex} from './handbook';

const evidence:Evidence[]=[{id:'approved',data:{facts:['Assembly responsibilities are established in the written project scope.'],guidance:'Ask a useful question.'},sourceIds:[]}];
const claim:PolicyClaim={claim:'Assembly responsibility depends on the written scope.',entailed:true,support:[{evidenceId:'approved',quote:'Assembly responsibilities are established in the written project scope.'}]};
test('company policies need an entailed approved passage, not just a citation or writing guidance',()=>{
 assert.equal(policyEvidenceValid([claim],evidence),true);
 for(const invalid of [
  {...claim,support:[]},
  {...claim,entailed:false},
  {...claim,support:[{evidenceId:'missing',quote:claim.support[0].quote}]},
  {...claim,support:[{evidenceId:'approved',quote:'Assembly is always included.'}]},
  {...claim,support:[{evidenceId:'approved',quote:'Ask a useful question.'}]}
 ])assert.equal(policyEvidenceValid([invalid],evidence),false);
});

test('policy review preserves supported content and repairs unconfirmed policies without a service-error fallback',async()=>{
 const cases=[
  ['Direct factory engineering spec sheets are not routinely provided to customers.','Our team needs to confirm the availability and release of project-specific engineering documentation.'],
  ['We never offer site assembly.','Our team needs to confirm the assembly arrangements for your project.'],
  ['The package includes foundations.','Our team needs to confirm whether foundations are included in your written project scope.'],
  ['Customers must source all appliances separately.','Our team needs to confirm appliance supply responsibilities in your written project scope.']
 ];
 const company=handbookIndex.get('company')!.facts[1];
 for(const [unapproved,confirmation] of [...cases,['Direct engineering sheets are routinely withheld.','Our team needs to confirm the availability and release of project-specific engineering documentation.']]){
  let calls=0;
  const model:LanguageModel={specificationVersion:'v4',provider:'synthetic-policy-review',modelId:'unknown-is-not-policy',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async options=>{
   calls++;let output:unknown;
   if(calls===1){const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined;const props=(schema?.properties?.patch as {properties:Record<string,{type?:unknown}>}).properties;output={requests:[{id:'r1',topic:'company',question:'What does House Delivery coordinate?'},{id:'r2',topic:'scope',question:'What are the arrangements for my project?'}],modelContext:'none',unconfirmedProduct:false,topic:'scope',sectionIds:['roles'],factIds:[],modelIds:[],questionKey:null,patch:Object.fromEntries(Object.entries(props).map(([k,v])=>[k,v.type==='array'?[]:null])),arithmetic:null,detail:false,ambiguous:false};}
   else if(calls===2)output={answers:{r1:{text:'We coordinate design, purchasing, manufacturing and logistics with Canadian construction.',evidenceRefs:['H:company'],planningRates:[]},r2:{text:unapproved,evidenceRefs:['H:roles'],planningRates:[]}},selectedModelIds:[],nextQuestion:null,nextAction:'none'};
   else output={segments:[
    {index:0,supported:true,issues:[],confirmationSubject:'the requested project arrangements',policyClaims:[{claim:'House Delivery coordinates these workstreams.',entailed:true,support:[{evidenceId:'H:company',quote:company}]}]},
    unapproved==='Direct engineering sheets are routinely withheld.'?{index:1,supported:true,issues:[],confirmationSubject:'the availability and release of project-specific engineering documentation',policyClaims:[{claim:unapproved,entailed:true,support:[{evidenceId:'H:roles',quote:'Engineering sheets are routinely withheld.'}]}]}:{index:1,supported:false,issues:['unsupported_company_policy'],confirmationSubject:confirmation.replace(/^Our team needs to confirm /,'').replace(/\.$/,''),policyClaims:[]}
   ],followUpSupported:true,complete:true};
   return{content:[{type:'text',text:JSON.stringify(output)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
  }};
  const ctx:InferenceContext={calls:0,model};
  const result=await answerQuestion('What does House Delivery coordinate, and what are the arrangements for my project?',initialState('P'),ctx);
  assert.equal(calls,3);assert.equal(result.mode,'generated');assert.deepEqual(ctx.coverage?.missing,[]);assert.ok(ctx.rejections?.includes(unapproved==='Direct engineering sheets are routinely withheld.'?'missing_policy_evidence':'unsupported_company_policy'));assert.equal(ctx.policyReviews?.[1].revised,true);
  const text=result.reply.answerSegments!.map(s=>s.text).join(' ');assert.ok(text.includes(confirmation));assert.ok(!text.includes(unapproved));assert.match(text,/coordinate design/);assert.doesNotMatch(text,/busy|couldn’t verify/);
 }
});
