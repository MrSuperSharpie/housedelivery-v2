import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {LanguageModel} from 'ai';
import type {Intent} from './intent';
import {answerQuestion} from './compose';
import {initialState,mergePatch,stateValue,constraints} from './state';
import {normalizeIntent} from './request-plan';
import {shortlist} from './matching';
import {retrieve} from './evidence';
import {modelIndex} from './registry';
import {recommendationCard,matchingIntroduction} from './recommendations';
import {bedroomStatement} from './measurements';
const intent=(topic:Intent['topic'],q:string):Intent=>({topic,requests:[{id:'r1',topic,question:q,policyIds:[],pricing:'none'}],modelContext:'none',unconfirmedProduct:false,sectionIds:[],factIds:[],modelIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false});
function fixture(raw:Intent,valid=false):LanguageModel{
 return{specificationVersion:'v4',provider:'local-card-regression',modelId:'no-service',supportedUrls:{},doStream:async()=>{throw Error('No streaming')},doGenerate:async options=>{
  const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined,props=schema?.properties as Record<string,Record<string,unknown>>;let out:unknown;
  if(props.patch){const p=(props.patch as {properties:Record<string,{type?:unknown}>}).properties;out={...raw,patch:Object.fromEntries(Object.entries(p).map(([k,v])=>[k,v.type==='array'?[]:null]))};}
  else if(props.answers){const entries=(props.answers as {properties:Record<string,{properties:{evidenceRefs:{items:{enum:string[]}}}} >}).properties;
   out={answers:Object.fromEntries(Object.entries(entries).map(([id,v])=>{const refs=v.properties.evidenceRefs.items.enum,model=refs.map(r=>modelIndex.get(r)).find(Boolean);return[id,{text:valid?(model?model.name+' is a published starting point; '+model.features[0]+'.':'Property feasibility needs site-specific review.'):'These homes have 99999 square feet.',evidenceRefs:[model?.id??refs[0]]}]})),selectedModelIds:[],nextQuestion:null,nextAction:'none'};
  }else{const indexes=(props.segments as {items:{properties:{index:{enum:number[]}}}}).items.properties.index.enum;out={segments:indexes.map(index=>({index,supported:true,issues:[]})),followUpSupported:true,complete:true};}
  return{content:[{type:'text',text:JSON.stringify(out)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
 }};
}
const site='I have a property 4800 square feet in Vancouver';
test('first-turn property information is acknowledged from reported values without a provider or invented home area',async()=>{
 const ctx={calls:0,fault:'timeout' as const};const r=await answerQuestion(site,initialState('property'),ctx);
 assert.equal(ctx.calls,0);assert.equal(r.mode,'controlled');assert.equal(stateValue(r.state,'siteArea')?.sqft,4800);assert.equal(stateValue(r.state,'location'),'Vancouver');assert.equal(stateValue(r.state,'areaTarget'),undefined);
 const text=r.reply.answerSegments!.map(s=>s.text).join(' ');assert.match(text,/4,800 sq\. ft\. lot in Vancouver/);assert.match(text,/site-specific review/);assert.doesNotMatch(text,/confirmed answer|temporarily|busy|approved|will fit/);assert.equal(r.reply.modelCards,undefined);assert.ok(r.reply.question);
});
test('bedroom replies override stale scope routing while compound scope questions keep their independent parts',()=>{
 for(const q of ['3 or 4 bedroom home','I need three bedrooms','three or four bedrooms','I would like at least four bedrooms please']){
  const state=mergePatch(mergePatch(initialState('beds'),{},site),{},q),i=normalizeIntent(intent('scope',q),q,state);
  assert.equal(bedroomStatement(q),true,q);assert.equal(i.topic,'matching');assert.deepEqual(i.requests!.map(r=>r.topic),['matching']);
 }
 const q='I need four bedrooms. What is included in the package?';assert.equal(bedroomStatement(q),false);
 const state=mergePatch(initialState('compound'),{},q),raw={...intent('scope',q),requests:[{id:'r1',topic:'matching' as const,question:'Find four-bedroom homes.',policyIds:[],pricing:'none' as const},{id:'r2',topic:'scope' as const,question:'What is included in the package?',policyIds:['package_scope'],pricing:'none' as const}]};
 const normalized=normalizeIntent(raw,q,state);assert.ok(normalized.requests!.some(r=>r.topic==='scope'&&r.policyIds?.includes('package_scope')));
});
test('the exact conversation keeps site and bedroom choices, then publishes cards even after numeric rejection',async()=>{
 let s=(await answerQuestion(site,initialState('exact'),{calls:0})).state;
 s=mergePatch(s,{},'I want to build a home on the lot');const q='3 or 4 bedroom home',ctx={calls:0,model:fixture(intent('scope',q))};
 const r=await answerQuestion(q,s,ctx),models=shortlist(constraints(r.state),undefined,.1,3).matches;
 assert.equal(r.mode,'reviewed_fallback');assert.deepEqual(stateValue(r.state,'bedroomOptions'),[3,4]);assert.equal(stateValue(r.state,'siteArea')?.sqft,4800);assert.equal(stateValue(r.state,'areaTarget'),undefined);assert.equal(stateValue(r.state,'location'),'Vancouver');
 assert.deepEqual(r.reply.modelCards!.map(c=>c.id),models.map(m=>m.id));assert.deepEqual(r.state.recommended,models.map(m=>m.id));assert.ok(r.reply.answerSegments!.some(s=>s.text===matchingIntroduction(models)));
 for(const card of r.reply.modelCards!){assert.ok(card.image);assert.ok(card.specs!.length>=2);assert.equal(card.floorPlanHref,card.href+'#plans');assert.ok(r.reply.facts.some(f=>f.href===card.href));}
 assert.match(r.reply.answerSegments!.map(s=>s.text).join(' '),/site-specific review/);
});
test('fallback names and cards share strict matcher output even when retrieval was misrouted',async()=>{
 const q='For our household, three or four bedrooms would be useful.',state=mergePatch(initialState('fallback'),{},site),ctx={calls:0,model:fixture(intent('scope',q))};
 const r=await answerQuestion(q,state,ctx);assert.equal(r.mode,'reviewed_fallback');assert.ok(r.reply.modelCards!.length>=2);
 const text=r.reply.answerSegments!.map(s=>s.text).join(' ');for(const c of r.reply.modelCards!)assert.ok(text.includes(c.title));assert.deepEqual(r.state.recommended,r.reply.modelCards!.map(c=>c.id));
 for(const c of r.reply.modelCards!)assert.ok(r.sourceIds.some(id=>modelIndex.get(c.id)!.source_ids.includes(id)));
});
test('generated recommendations render when request parts match but the primary topic differs',async()=>{
 const q='Show me family homes',state=mergePatch(mergePatch(initialState('generated'),{},site),{},'three or four bedrooms');
 const raw={...intent('scope',q),requests:[{id:'r1',topic:'matching' as const,question:'Show family homes.',policyIds:[],pricing:'none' as const},{id:'r2',topic:'specifications' as const,question:'Explain the published design features.',policyIds:[],pricing:'none' as const}]};
 const ctx={calls:0,model:fixture(raw,true)},r=await answerQuestion(q,state,ctx);assert.equal(r.mode,'generated');assert.ok(r.reply.modelCards!.length>=2);assert.ok(r.reply.modelCards!.every(c=>c.image&&c.floorPlanHref));
});
test('selection phrasing uses retained requirements; exact three bedrooms never invents a match',()=>{
 let state=mergePatch(mergePatch(initialState('variants'),{},site),{},'three or four bedrooms');
 for(const q of ['show me family homes','what homes would work for my Vancouver property?']){const i=normalizeIntent(intent('property',q),q,state),r=retrieve(i,state,q);assert.ok(r.models.length>=2,q);assert.ok(r.models.every(m=>m.bedrooms===4));}
 state=mergePatch(state,{},'I need three bedrooms');const i=normalizeIntent(intent('scope','I need three bedrooms'),'I need three bedrooms',state);assert.equal(retrieve(i,state,'I need three bedrooms').models.length,0);assert.equal(stateValue(state,'siteArea')?.sqft,4800);
});
test('cards without a supplied approved image still have verified text and model/plan links',()=>{
 const card=recommendationCard(modelIndex.get('catalog-bc-duplex')!);assert.equal(card.image,undefined);assert.ok(card.text);assert.ok(card.href);assert.ok(card.floorPlanHref);assert.ok(card.specs!.length);
});
