import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {LanguageModel} from 'ai';
import type {Intent} from './intent';
import type {InferenceContext} from './llm';
import {initialState,mergePatch,stateValue,signState,readState,conversationContext} from './state';
import {answerQuestion,compilePolicyAnswers,naturalRejection,type NaturalAnswer} from './compose';
import {publicQuestion} from './response-plan';
import {questionForAnswer} from './continuity';
import {guidanceContinuation} from './guidance';
import {normalizeIntent} from './request-plan';
import {finalizeComparisonAnswers} from './comparison';
export const guidanceQuestions=[
 'Do you only sell the bare steel framing shell, or can I get a package that includes windows, exterior cladding, and interior finishes like cabinetry?',
 'If I go with a higher inclusion package that has European-style windows and kitchen cabinets, who manufactures those—and can I swap out appliances or fixtures locally?',
 'Can I get a standard Canadian bank mortgage for one of your kit homes, or do I need a special construction loan?',
 'Guidance','yes','vancouver'
];
const raw=(question:string,policyIds:string[]=[],topic:Intent['topic']='process'):Intent=>({topic,requests:[{id:'r1',topic,question,policyIds,pricing:'none'}],modelContext:'none',unconfirmedProduct:false,sectionIds:[],factIds:[],modelIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false});
function intake(value:Intent):LanguageModel{
 return{specificationVersion:'v4',provider:'local-guidance-fixture',modelId:'approved-policy-only',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async options=>{
  const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined;if(!schema?.properties?.patch)throw Error('Unexpected extra generation or reviewer');
  const props=(schema.properties.patch as {properties:Record<string,{type?:unknown}>}).properties;
  const out={...value,patch:{...Object.fromEntries(Object.entries(props).map(([k,v])=>[k,v.type==='array'?[]:null])),...value.patch}};
  return{content:[{type:'text',text:JSON.stringify(out)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
 }};
}
const publicReplies=(r:Awaited<ReturnType<typeof answerQuestion>>)=>r.reply.answerSegments!.map(s=>s.text).join(' ');
test('the supplied package/privacy/financing transcript answers supported parts without fabricated financing or offer loops',async()=>{
 let s=initialState('six');
 for(let i=0;i<guidanceQuestions.length;i++){
  const q=guidanceQuestions[i],value=i===0?raw(q,['package_scope'],'scope'):i===1?raw('Can I swap out appliances or fixtures locally?',[],'customization'):raw(q,[],'process');
  const ctx:InferenceContext={calls:0,model:intake(value),contexts:[]};const r=await answerQuestion(q,s,ctx),text=publicReplies(r);s=r.state;
  assert.equal(ctx.calls,1,String(i));assert.equal(r.mode,'controlled',String(i));assert.deepEqual(ctx.failures??[],[]);assert.deepEqual(ctx.coverage?.missing,[]);
  if(i===0){assert.match(text,/windows.*kitchens\/cabinetry/);assert.match(text,/not confirmed model\/package inclusions/);assert.match(text,/cladding.*need confirmation/);assert.match(text,/design, manufacturing, purchasing, logistics and Canadian construction/);}
  if(i===1){assert.match(text,/Locally sourced appliances or fixtures can be proposed/);assert.match(text,/compatibility.*agreed specification and scope/);assert.match(text,/manufacturing partner identities.*confidential/i);assert.doesNotMatch(ctx.contexts!.join(' '),/who manufactures|European-style/);}
  if(i>=2){assert.doesNotMatch(text,/standard.*(?:not sufficient|insufficient)|often required|commonly needed|we (?:can|will) (?:guide you to|identify|introduce|refer)|convert.*permanent financing|recommended lenders/i);assert.equal(r.reply.nextAction,'none');}
  if(i===3){assert.match(text,/organize the selected design and site information/);assert.match(text,/don’t have a verified lender list/);assert.equal(r.reply.question,'Which municipality is your project in?');assert.equal(s.pendingQuestion?.kind,'location');}
  if(i===4){assert.equal(r.reply.question,'');assert.equal(s.pendingQuestion?.kind,'location');assert.doesNotMatch(text,/would you like|shall I|can I help/i);}
  if(i===5){assert.match(text,/Vancouver project/);assert.equal(stateValue(s,'location'),'Vancouver');assert.equal(stateValue(s,'province'),undefined);assert.equal(s.activeQuestion,guidanceQuestions[2]);assert.equal(s.pendingQuestion,undefined);assert.match(text,/don’t have a verified lender list/);assert.equal(stateValue(s,'role'),undefined);}
 }
});
test('independent public customization/sourcing survives identity and facility restrictions across varied clauses',async()=>{
 const variants=[
  'Who makes the frames, and where are they based? Can I source fixtures locally?',
  'Who makes your frames, and can I customize the bathrooms and source the windows locally?',
  'Which factory supplies the system? Can I swap out the kitchen fixtures or appliances locally?',
  'Where is your factory located, and could we replace the bathroom fixtures with local selections?',
  'Do the imported frames come from manufacturers such as PrivateExampleCo, and can I customize the kitchen?'
 ];
 for(const q of variants){const boundary=publicQuestion(q);assert.ok(boundary.restricted);assert.match(boundary.question,/customiz|swap|replac|source/i);assert.doesNotMatch(boundary.question,/PrivateExampleCo|which factory|who makes|where.*factory|where are they based/i);
  const ctx:InferenceContext={calls:0,contexts:[],model:intake(raw(boundary.question,[],'customization'))};const r=await answerQuestion(q,initialState('mix'),ctx),text=publicReplies(r);
  assert.equal(ctx.calls,1);assert.match(text,/project review|project-specific design/);assert.match(text,/confidential/);assert.doesNotMatch(text,/PrivateExampleCo|connection|unavailable/);assert.doesNotMatch(ctx.contexts!.join(' '),/PrivateExampleCo/);
 }
});
test('accepted prior offers resolve to the requested information; an unsupported lender promise never authorizes a referral',async()=>{
 for(const accept of ['yes','Yes please','Guidance','Please go ahead','Tell me more']){
  const s=initialState('offer');s.activeQuestion='Can I finance my home project?';s.activeRequests=raw(s.activeQuestion).requests;s.lastQuestion='Would you like guidance on potential lenders experienced with construction loans?';
  assert.equal(guidanceContinuation(accept,s),'accepted');assert.match(questionForAnswer(accept,s),/potential lenders/);
  const ctx:InferenceContext={calls:0,model:intake(raw('Please provide lender contacts.'))};const r=await answerQuestion(accept,s,ctx),text=publicReplies(r);
  assert.equal(ctx.calls,1);assert.match(text,/organize the selected design/);assert.match(text,/don’t have a verified lender list/);assert.doesNotMatch(text,/Would you like|we recommend|partner lenders/i);
 }
 const old=initialState('legacy');old.activeQuestion='yes';old.activeRequests=raw('Help identify suitable lenders.').requests;old.lastQuestion='What is your project location or preferred lender type?';
 const r=await answerQuestion('vancouver',old,{calls:0,model:intake(raw('Use the provided location for the lender discussion.'))});assert.match(publicReplies(r),/Vancouver project/);assert.match(publicReplies(r),/don’t have a verified lender list/);
});
test('short locality answers retain planning purpose without converting consent, requirements or financial claims',()=>{
 let s=initialState('state');s.activeQuestion='How can I organize project financing information?';s.activeRequests=raw(s.activeQuestion).requests;s.pendingQuestion={kind:'location',text:'Which municipality is your project in?'};
 s=mergePatch(s,{location:'Vancouver',province:'British Columbia'},'vancouver');assert.equal(stateValue(s,'location'),'Vancouver');assert.equal(stateValue(s,'province'),undefined);assert.equal(stateValue(s,'declinedContact'),undefined);
 const restored=readState(signState(s,'fixture-only-secret'),'state','fixture-only-secret');assert.equal(restored.pendingQuestion?.kind,'location');assert.match(JSON.stringify(conversationContext(restored)),/financing information/);
 assert.equal(guidanceContinuation('No thanks',s),null);assert.equal(guidanceContinuation('What packages are available?',s),null);
});
test('approved financial boundaries survive final validation without changing provider error handling',()=>{
 const q='Could you arrange a mortgage and recommend your partner banks?',state=initialState('financial'),i=normalizeIntent(raw(q),q,state),compiled=compilePolicyAnswers(i.requests!,state,q,['F-START','F-SCOPE','F-BUILDER']);
 const claim:NaturalAnswer={answerSegments:[{text:'Our preferred bank can arrange a construction loan for you.',evidenceRefs:['F-START'],requestId:'r1'}],selectedModelIds:[],nextQuestion:null,nextAction:'none'};
 assert.equal(naturalRejection(claim,[],[],false,state,compiled.requests),'comparison_evidence_required');assert.deepEqual(finalizeComparisonAnswers(claim.answerSegments,compiled.requests,compiled.segments),compiled.segments);
 assert.match(compiled.segments[0].text,/don’t have approved lender or loan-product information/);
});
