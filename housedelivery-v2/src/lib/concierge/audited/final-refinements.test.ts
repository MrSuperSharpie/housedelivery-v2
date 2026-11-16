import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,mergePatch,stateValue,projectSummary} from './state';
import {compilePolicyAnswers} from './compose';
import {renderPolicies,policyIndex} from './policies';
import type {RequestPart} from './response-plan';
const now=Date.parse('2026-11-15T03:00:00Z');
const wrong={role:'general_contractor',audience:'Builder / general contractor',builder:true};

test('speaker occupation and selected-contractor relationship remain distinct in follow-ups and summaries',()=>{
 const cases=[
  {q:'I am a contractor.',role:'contractor',builder:undefined},
  {q:'I have a contractor.',role:undefined,builder:true},
  {q:'My contractor will handle construction.',role:undefined,builder:true},
  {q:'We have not selected a contractor.',role:undefined,builder:false}
 ];
 for(const c of cases){
  let s=mergePatch(initialState('R'),wrong,c.q,now);
  assert.equal(stateValue(s,'role'),c.role,c.q);assert.equal(stateValue(s,'builder'),c.builder,c.q);
  s=mergePatch(s,{...wrong,builder:c.builder!==true},'What would you need from us next?',now);
  assert.equal(stateValue(s,'role'),c.role,c.q+' follow-up');assert.equal(stateValue(s,'builder'),c.builder,c.q+' follow-up');
  const summary=projectSummary(s);
  if(c.role)assert.match(summary,/Role: contractor/);else{assert.doesNotMatch(summary,/Role:/);assert.doesNotMatch(summary,/Planning as: Builder/);}
  if(c.builder===true)assert.match(summary,/Existing builder: Yes/);
  if(c.builder===false)assert.match(summary,/Existing builder: Not selected/);
 }
});
test('a hired builder never replaces a previously stated role; selection changes do not erase an occupation',()=>{
 let s=mergePatch(initialState('R'),{},"I'm the homeowner on this project.",now);
 s=mergePatch(s,wrong,'I already have a general contractor.',now);assert.equal(stateValue(s,'role'),'homeowner');assert.equal(stateValue(s,'builder'),true);
 s=mergePatch(s,wrong,"We haven't yet selected a contractor.",now);assert.equal(stateValue(s,'role'),'homeowner');assert.equal(stateValue(s,'builder'),false);
 s=mergePatch(s,{},'I am a contractor.',now);assert.equal(stateValue(s,'role'),'contractor');assert.equal(stateValue(s,'builder'),false);
 s=mergePatch(s,wrong,'My contractor will handle construction.',now);assert.equal(stateValue(s,'role'),'contractor');assert.equal(stateValue(s,'builder'),true);assert.match(projectSummary(s),/My contractor will handle construction/);
 s=mergePatch(s,wrong,"I'm not a contractor.",now);assert.equal(stateValue(s,'role'),undefined);assert.equal(stateValue(s,'audience'),undefined);
});
test('saved Cedarview actor error is rejected without losing the model, location or proposed scope',()=>{
 let s=mergePatch(initialState('C'),{...wrong,location:'Kelowna'},"We're looking at Cedarview in Kelowna and already have a general contractor. What is included in the home package, and what work needs to be arranged locally?",now);
 assert.equal(stateValue(s,'role'),undefined);assert.equal(stateValue(s,'builder'),true);assert.equal(stateValue(s,'selectedModel'),'home-cedarview');assert.equal(stateValue(s,'location'),'Kelowna');
 s=mergePatch(s,wrong,"Our contractor can handle foundations and assembly, and we'll supply our own appliances. How should those responsibilities be recorded for the home we discussed?",now);
 assert.equal(stateValue(s,'role'),undefined);assert.equal(stateValue(s,'builder'),true);assert.match(stateValue(s,'constructionScope')!,/Our contractor.*we'll supply our own appliances/);assert.doesNotMatch(projectSummary(s),/Role:/);
});
test('pricing records are relevant, unique and retain all material commercial qualifications',()=>{
 const q="We're considering a Premium home package for a rural site near Brandon, Manitoba. What are your published package rates, and how is freight priced?";
 const s=mergePatch(initialState('P'),{},q,now);
 const requests:RequestPart[]=[{id:'r1',topic:'pricing',question:'Published Premium package rates?',pricing:'planning_rates',policyIds:['pricing_scope','finish_tiers']},{id:'r2',topic:'pricing',question:'How is freight priced?',pricing:'freight',policyIds:['freight_quotation','pricing_scope']}];
 const result=compilePolicyAnswers(requests,s,q,['F-PRICE','F-SCOPE','F-EXCLUSIONS']);const text=result.segments.map(s=>s.text).join(' ');
 assert.deepEqual(result.answeredRequestIds,['r2']);assert.equal(result.records.filter(r=>r.id==='pricing_scope').length,1);assert.doesNotMatch(text,/Essential|ambiguity|homepage|verified/);
 assert.match(text,/Premium: CAD \$250/);assert.match(text,/Brandon, Manitoba/);assert.equal((text.match(/not completed-home prices/g)??[]).length,1);
 for(const phrase of ['written quotation','foundations','services','permits','assembly and completion','Appliances','sales taxes','applicable import tariffs'])assert.ok(text.includes(phrase),phrase);
});
test('one shared policy paragraph can answer multiple rate requests without losing coverage',()=>{
 const requests:RequestPart[]=[{id:'r1',topic:'pricing',question:'Premium package rate?',pricing:'planning_rates',policyIds:['pricing_scope']},{id:'r2',topic:'pricing',question:'Signature package rate?',pricing:'planning_rates',policyIds:['pricing_scope']}];
 const r=compilePolicyAnswers(requests,initialState('P'),'What are the Premium and Signature package rates?',['F-PRICE']);
 assert.equal(r.segments.length,1);assert.deepEqual(r.answeredRequestIds,[]);assert.match(r.segments[0].text,/Premium: CAD \$250/);assert.match(r.segments[0].text,/Signature: CAD \$300/);
});
test('legitimate tier comparisons remain available without source metadata in customer text',()=>{
 const requests:RequestPart[]=[{id:'r1',topic:'customization',question:'Compare finish tiers.',pricing:'none',policyIds:['finish_tiers']}];
 const r=compilePolicyAnswers(requests,initialState('T'),'How do Essential, Premium and Signature tiers differ?',[]);
 assert.match(r.segments[0].text,/Essential.*Premium.*Signature/);assert.match(r.segments[0].text,/custom homes/);assert.doesNotMatch(r.segments[0].text,/homepage|ambiguity|verified|default versus/);
 const defaultText=renderPolicies(['finish_tiers'],initialState('T'),'What is the default starting package?')[0].text;assert.match(defaultText,/starting package needs confirmation/);
});
test('Look Book follow-ups retain personal context without repeating unasked change guidance',()=>{
 let s=mergePatch(initialState('L'),{householdNeeds:'multigenerational',location:'Ontario'},'We like Langley for a multigenerational household in Ontario.',now);
 const q='We prefer a warm, low-maintenance kitchen and a private space for an older parent. How would you carry those priorities forward without treating the Look Book as final construction drawings?';s=mergePatch(s,{},q,now);
 const requests:RequestPart[]=[{id:'r1',topic:'customization',question:'Carry priorities into Look Book.',pricing:'none',policyIds:['studio_lookbook','design_changes']}];
 const r=compilePolicyAnswers(requests,s,q,[]),text=r.segments.map(s=>s.text).join(' ');
 assert.deepEqual(r.records.map(p=>p.id),['studio_lookbook']);assert.match(text,/warm, low-maintenance kitchen.*older parent/);assert.match(text,/not final construction drawings/);assert.match(text,/technical suitability need project review/);assert.doesNotMatch(text,/free redesign|structural work/);
 const changes=policyIndex.get('design_changes')!.text;assert.equal((changes.match(/project-specific design and engineering review/g)??[]).length,1);assert.match(changes,/does not authorize structural work or a free redesign/);
});
