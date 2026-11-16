import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Intent} from './intent';
import {initialState,mergePatch,stateValue,readState,signState} from './state';
import {normalizeIntent,prioritizeCurrentQuestion} from './request-plan';
import {timingAsked,designChangeAsked,manufacturingRangeAsked} from './question-subject';
import {compilePolicyAnswers,naturalRejection} from './compose';
import {renderPolicies,contextualPolicy} from './policies';
import {commercialRelease,validateCommercialRelease,publicPackageRates} from './current-commercial';
import {publicFactContent} from './publication';
import {factIndex} from './registry';
import {retrieve} from './evidence';
const plan=(q:string,topic:Intent['topic']='customization',policyIds=['design_changes']):Intent=>({topic,requests:[{id:'r1',topic,question:q,policyIds,pricing:'none'}],modelContext:'follow_up',unconfirmedProduct:false,factIds:[],modelIds:[],sectionIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false});
for(const q of [
 'From the day I choose a floor plan, how long does it actually take to move in?',
 'Once we select a floor plan, what is the timeline until occupancy?',
 'How soon can we move in after choosing an existing design?',
 'How long after my architect completes the drawings could we occupy the house?'
])test('scheduling priority survives incidental design words and legacy overrides: '+q,()=>{
 const state=mergePatch(initialState('schedule'),{},'We like Mayne House, 3 or 4 bedrooms, with a 4000 sq. ft. lot in Vancouver.');
 const i=prioritizeCurrentQuestion({...normalizeIntent(plan(q),q,state),topic:'customization'},q,state),r=retrieve(i,state,q);
 assert.equal(timingAsked(q),true);assert.equal(designChangeAsked(q),false);assert.equal(i.topic,'process');assert.ok(i.requests!.every(p=>p.topic==='process'));assert.deepEqual(i.requests![0].policyIds,['project_timing']);assert.ok(r.evidence.some(e=>e.id==='F-TIMING'));assert.equal(stateValue(state,'selectedModel'),'home-mayne');assert.equal(stateValue(state,'siteArea')?.value,4000);assert.equal(stateValue(state,'areaTarget'),undefined);
});
test('independent scheduling and finish questions both survive rather than a keyword winner',()=>{
 const q='How long until occupancy, and can I pick different flooring and windows?';
 const i=normalizeIntent({...plan(q),requests:[{id:'r1',topic:'process',question:'How long until occupancy?',policyIds:[],pricing:'none'},{id:'r2',topic:'customization',question:'Can I pick different flooring and windows?',policyIds:['design_changes'],pricing:'none'}]},q,initialState('compound'));
 assert.equal(i.requests!.length,2);assert.ok(i.requests!.some(r=>r.policyIds?.includes('project_timing')));assert.ok(i.requests!.some(r=>r.policyIds?.includes('design_changes')));
});
test('approved ordinary policies remain authority without falsely marking a specific question fully answered',()=>{
 for(const [q,id]of [['Are cabinetry, plumbing fixtures and appliances included?','package_scope'],['Who handles foundations and assembly?','local_work'],['Do you supply stamped permit drawings?','engineering_documents'],['We want larger windows and 10-foot ceilings.','design_changes']] as const){
  const i=normalizeIntent(plan(q,'specifications',[id]),q,initialState('scope'));
  const p=compilePolicyAnswers(i.requests!,initialState('scope'),q,['F-SCOPE','F-EXCLUSIONS']);
  assert.equal(contextualPolicy(id,q),true);assert.deepEqual(p.answeredRequestIds,[]);assert.ok(p.records.some(r=>r.id===id));assert.equal(p.controlledSegments.length,0);assert.ok(p.fallbackSegments.length);
 }
 const factory="Can I inspect the manufacturing plant before I buy, or get the factory's direct engineering spec sheets?";
 const i=normalizeIntent(plan(factory,'specifications',[]),factory,initialState('factory')),p=compilePolicyAnswers(i.requests!,initialState('factory'),factory,[]);
 assert.ok(p.answeredRequestIds.length);assert.equal(p.controlledSegments.length,2);
});
test('permit drawings distinguish documentation, local professional scope and sealing without unrelated factory wording',()=>{
 const text=renderPolicies(['engineering_documents'],initialState('permit'),'Do you provide stamped architectural permit drawings?')[0].text;
 assert.match(text,/structural engineering documents.*distinct.*architectural permit-drawing set/);assert.match(text,/Qualified Canadian professionals/);assert.match(text,/sealing where required/);assert.match(text,/agreed project scope/);assert.doesNotMatch(text,/factory|confidential/i);
});
test('manufacturing limits are unknown rather than inferred from the smallest and largest catalogue homes',()=>{
 const q='What is the smallest and largest footprint you can manufacture?';assert.equal(manufacturingRangeAsked(q),true);
 const i=normalizeIntent(plan(q,'origin',['unrecorded_policy']),q,initialState('limits'));assert.ok(i.requests!.some(p=>p.policyIds?.includes('manufacturing_dimensions')));assert.ok(!i.requests!.some(p=>p.policyIds?.includes('unrecorded_policy')));
 const text=renderPolicies(['manufacturing_dimensions'],initialState('limits'),q)[0].text;assert.match(text,/No verified minimum or maximum/);assert.match(text,/do not establish factory capability limits/);assert.doesNotMatch(text,/\d/);
});
test('design wishes survive signed follow-ups without becoming approved specs, area or storeys',()=>{
 let s=mergePatch(initialState('design'),{},'We like Mayne House and want larger windows and 10-foot ceilings.');
 s=readState(signState(s,'local-only'),s.session,'local-only');s=mergePatch(s,{designRequests:'Guaranteed approved 12-foot ceilings.'},'Who would review that?');
 assert.match(stateValue(s,'designRequests')!,/10-foot ceilings/);assert.doesNotMatch(stateValue(s,'designRequests')!,/12|approved/);assert.equal(stateValue(s,'storeys'),undefined);assert.equal(stateValue(s,'areaTarget'),undefined);assert.equal(stateValue(s,'selectedModel'),'home-mayne');
});
test('sealed live-public pricing supersedes the old observation without extending to unverified products',()=>{
 assert.doesNotThrow(()=>validateCommercialRelease(commercialRelease));assert.throws(()=>validateCommercialRelease({...commercialRelease,verifiedDate:'2020-01-01'}));assert.equal(commercialRelease.sources.length,18);assert.ok(commercialRelease.sources.every(s=>s.premium&&s.signature&&s.factoryTiming&&s.standardLogistics&&s.assemblyPackage));assert.deepEqual(publicPackageRates,{Premium:250,Signature:300});
 const text=JSON.stringify(publicFactContent(factIndex.get('F-PRICE')!));assert.match(text,/18 published custom-home/);assert.match(text,/not completed-home prices or binding quotations/);assert.match(text,/timber.*project-specific pricing/);assert.match(text,/do not establish pricing for compact, CMHC or unpublished/);assert.doesNotMatch(text,/published for Salt Spring/);
 const timing=JSON.stringify(publicFactContent(factIndex.get('F-TIMING')!));assert.match(timing,/40–45 days after approved drawings and payment/);assert.match(timing,/not the full period/);
});
test('acknowledging unknown chargeable area is not an asserted area basis; qualified false assertions remain rejected',()=>{
 const q='What are package rates for Cedarview?',s=mergePatch(initialState('area'),{},q),e=retrieve(plan(q,'pricing'),s,q).evidence;
 const check=(text:string)=>naturalRejection({answerSegments:[{text,evidenceRefs:['F-SCOPE','home-cedarview']}],selectedModelIds:[],nextQuestion:null,nextAction:'none'},e,['home-cedarview'],false,s);
 assert.equal(check('Chargeable area and selected scope require a written quotation.'),null);
 assert.equal(check('Its published model area is conditioned but not confirmed for internal areas.'),'wrong_area_basis');
 assert.equal(check('Cedarview has 3337 square feet of conditioned living space.'),'wrong_area_basis');
});
