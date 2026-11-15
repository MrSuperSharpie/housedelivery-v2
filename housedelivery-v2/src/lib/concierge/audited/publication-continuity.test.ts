import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {LanguageModel} from 'ai';
import handbook from '@/data/concierge/company-handbook.json';
import {knowledge,factIndex} from './registry';
import {publicHandbookContent,publicFactContent,containsInternalInstruction} from './publication';
import {policyEvidenceValid} from './policy-evidence';
import {initialState,mergePatch,stateValue,conversationContext,projectSummary,readState,signState} from './state';
import {answerQuestion,naturalRejection,compilePolicyAnswers,type NaturalAnswer} from './compose';
import {retrieve} from './evidence';
import {normalizeIntent,planningRatesEligible} from './request-plan';
import {questionForAnswer} from './continuity';
import type {Intent} from './intent';
import type {InferenceContext} from './llm';
const base=(question:string):Intent=>({topic:'matching',requests:[{id:'r1',topic:'matching',question,policyIds:[],pricing:'planning_rates'}],modelContext:'none',unconfirmedProduct:false,factIds:[],modelIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false});
const q='For a 1,500-square-foot home, how does a steel kit compare with timber framing on cost and construction speed?';
function modelFor(requests:NonNullable<Intent['requests']>,topic:Intent['topic']='matching'):LanguageModel{
 return{specificationVersion:'v4',provider:'local-boundary-fixture',modelId:'bounded',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async options=>{
  const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined;
  if(!schema?.properties?.patch)throw Error('Unexpected additional model call');
  const props=(schema.properties.patch as {properties:Record<string,{type?:unknown}>}).properties;
  const out={...base(requests[0].question),topic,requests,patch:Object.fromEntries(Object.entries(props).map(([k,v])=>[k,v.type==='array'?[]:null])),sectionIds:[]};
  return{content:[{type:'text',text:JSON.stringify(out)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
 }};
}
test('publication separates every handbook guidance/limit field and mixed editorial facts from answer evidence',()=>{
 for(const section of handbook.sections){const p=publicHandbookContent(section);assert.ok(!Object.hasOwn(p,'guidance'));assert.ok(!Object.hasOwn(p,'limits'));assert.ok(!p.facts.includes(section.guidance));}
 const selection=publicHandbookContent(handbook.sections.find(s=>s.id==='selection')!);assert.doesNotMatch(JSON.stringify(selection),/registry|add-on/);
 const finishes=publicHandbookContent(handbook.sections.find(s=>s.id==='finishes')!);assert.doesNotMatch(JSON.stringify(finishes),/audited guide/);
 for(const f of knowledge.facts){const p=publicFactContent(f);assert.ok(!Object.hasOwn(p,'qualifiers'));assert.doesNotMatch(JSON.stringify(p),/Do not |Confirm model applicability|retrieval|observed display/);}
 const e=retrieve({...base('How does construction work?'),topic:'origin'},initialState('P'),'How are your homes built?').evidence;
 const a:NaturalAnswer={answerSegments:[],selectedModelIds:[],nextQuestion:null,nextAction:'none'};
 for(const section of handbook.sections){if(section.guidance.split(' ').length<8)continue;assert.equal(containsInternalInstruction(section.guidance),true);assert.equal(naturalRejection({...a,answerSegments:[{text:section.guidance,evidenceRefs:['H:company']}]},e,[],false),'internal_instruction');}
 assert.equal(naturalRejection({...a,nextQuestion:handbook.sections[0].guidance},e,[],false),'internal_instruction_follow_up');
 assert.equal(policyEvidenceValid([{claim:'Visitors must do this.',entailed:true,support:[{evidenceId:'H:x',quote:'Visitors must do this.'}]}],[{id:'H:x',data:{guidance:'Visitors must do this.',limits:['Visitors must do this.']},sourceIds:[]}]),false);
});
test('steel/timber price and speed claims require comparative evidence, not generic systems facts',()=>{
 const e=retrieve({...base(q),topic:'pricing'},initialState('C'),q).evidence;
 for(const text of ['Steel is cheaper than timber today.','Steel kits are faster than local builders.','Timber framing costs more than steel.','Manufacturing saves money and creates less waste than local builders.']){
  const a:NaturalAnswer={answerSegments:[{text,evidenceRefs:['F-SYSTEMS']}],selectedModelIds:[],nextQuestion:null,nextAction:'none'};
  assert.equal(naturalRejection(a,e,[],false),'unsupported_comparison',text);
 }
 const i=normalizeIntent(base(q),q,initialState('C'));assert.equal(i.requests![0].pricing,'project_quote');assert.deepEqual(i.requests![0].policyIds,['system_comparison']);assert.equal(planningRatesEligible(i.requests![0]),false);
});
test('comparison continues through site and builder updates without design discovery or occupation inference',async()=>{
 const requests=base(q).requests!;let s=initialState('C');
 for(const question of [q,'Site is ready. Builder is experienced.','Would that make it cheaper?']){
  const ctx:InferenceContext={calls:0,model:modelFor(requests)};
  const result=await answerQuestion(question,s,ctx);s=result.state;
  const text=result.reply.answerSegments!.map(s=>s.text).join(' ');
  assert.equal(ctx.calls,1);assert.equal(result.mode,'controlled');assert.match(text,/like-for-like.*comparison is not available/);assert.match(text,/1,500/);assert.match(text,/quotations.*same design/);assert.doesNotMatch(text,/busy|couldn’t verify|Which design|CAD|\$|Essential/);assert.equal(result.reply.modelCards!.length,0);assert.equal(stateValue(s,'role'),undefined);assert.equal(stateValue(s,'areaTarget')?.sqft,1500);
 }
 assert.equal(s.activeQuestion,q);assert.equal(s.activeUpdates?.length,2);assert.match(JSON.stringify(conversationContext(s)),/Site is ready/);assert.match(projectSummary(s),/Builder is experienced/);
 const restored=readState(signState(s,'test-only-secret'),'C','test-only-secret');assert.equal(restored.activeQuestion,q);assert.match(questionForAnswer('Site is ready.',restored),/steel kit compare with timber/);
 assert.equal(questionForAnswer('What is included with Cedarview?',restored),'What is included with Cedarview?');
});
test('compound model inclusions, local scope and published rates all retain their separate applicability',async()=>{
 const question='What is included with Cedarview, what must be arranged locally, and do the published Premium and Signature rates apply to it?';
 const requests:NonNullable<Intent['requests']>=[{id:'r1',topic:'scope',question:'What is included with Cedarview?',policyIds:['package_scope'],pricing:'none'},{id:'r2',topic:'builder',question:'What must be arranged locally?',policyIds:['local_work'],pricing:'none'},{id:'r3',topic:'pricing',question:'Do published Premium and Signature package rates apply to Cedarview?',policyIds:['pricing_scope'],pricing:'planning_rates'}];
 const ctx:InferenceContext={calls:0,model:modelFor(requests,'scope')};
 const result=await answerQuestion(question,initialState('I'),ctx),text=result.reply.answerSegments!.map(s=>s.text).join(' ');
 assert.equal(ctx.calls,1);assert.deepEqual(ctx.coverage?.missing,[]);assert.deepEqual(ctx.coverage?.retained,['r1','r2','r3']);assert.match(text,/Cedarview.*cold-formed light steel frame/);assert.match(text,/not a final model-specific supply schedule/);assert.match(text,/unless expressly included/);assert.match(text,/Salt Spring.*applicability to another model/);assert.match(text,/Premium: CAD \$250/);assert.match(text,/Signature: CAD \$300/);
 for(const segment of result.reply.answerSegments!)assert.equal(containsInternalInstruction(segment.text),false);
 assert.equal(stateValue(result.state,'selectedModel'),'home-cedarview');
});
test('missing comparison evidence uses an explicit limitation and does not become an availability failure',()=>{
 const s=mergePatch(initialState('X'),{},q),i=normalizeIntent(base(q),q,s),out=compilePolicyAnswers(i.requests!,s,q,['F-SYSTEMS','F-SCOPE','F-TIMING']);
 assert.deepEqual(out.answeredRequestIds,['r1']);assert.match(out.segments[0].text,/comparison is not available here/);assert.doesNotMatch(out.segments[0].text,/connection|busy|temporarily|try again|\$|per square foot/);
 assert.ok(factIndex.get('F-PRICE')!.qualifiers.length); // source remains intact
});

test('explicit compound parts survive an intake plan that selected only inclusions; freight-only rates never acquire package prices',()=>{
 const question='What is included with Cedarview, what must be arranged locally, and do the published Premium and Signature rates apply to it?';
 const state=mergePatch(initialState('K'),{},question),i=normalizeIntent({...base(question),requests:[{id:'r1',topic:'scope',question:'What is included with Cedarview?',policyIds:['package_scope'],pricing:'none'}]},question,state);
 const records=compilePolicyAnswers(i.requests!,state,question,['F-SCOPE','F-EXCLUSIONS','F-PRICE']);
 assert.deepEqual(new Set(records.records.map(r=>r.id)),new Set(['package_scope','local_work','pricing_scope']));assert.deepEqual(records.answeredRequestIds,['r1','r2','r3']);
 const freight='What are your published freight rates for Manitoba?';const f=normalizeIntent({...base(freight),topic:'pricing',requests:[{id:'r1',topic:'pricing',question:freight,pricing:'freight',policyIds:['freight_quotation']}]},freight,initialState('F'));
 assert.ok(!f.requests!.some(r=>r.policyIds?.includes('pricing_scope')));
});
