import {test} from 'node:test';
import assert from 'node:assert/strict';
import {models as publishedHomes} from '@/data/models';
import {initialState,mergePatch,stateValue,constraints,projectSummary,signState,readState,hasMatchPreferences} from './state';
import {shortlist} from './matching';
import {normalizeIntent} from './request-plan';
import {retrieve,modelLink} from './evidence';
import {knowledge,modelIndex} from './registry';
import {recommendationCard} from './recommendations';
import {answerQuestion} from './compose';
import type {Intent} from './intent';
const intent=(topic:Intent['topic'],question:string):Intent=>({topic,requests:[{id:'r1',topic,question,policyIds:[],pricing:'none'}],modelContext:'none',factIds:[],modelIds:[],questionKey:null,patch:{},arithmetic:null,detail:false,ambiguous:false});
const exact=["I'm exploring a home for myself or my family. Help me find a starting point.",'I have a 4000 square foot lot in East Vancouver.','Yes.','4 or 5 bedroom.'];
test('exact acceptance conversation keeps site area, location and both bedroom choices through signed follow-ups',()=>{
 let s=initialState('acceptance');
 s=mergePatch(s,{},exact[0]);assert.equal(hasMatchPreferences(s),false);
 s=mergePatch(s,{areaTarget:{value:4000,unit:'sf',sqft:4000,basis:'published'}},exact[1]);
 assert.equal(stateValue(s,'location'),'East Vancouver');assert.equal(stateValue(s,'siteArea')?.sqft,4000);assert.equal(stateValue(s,'areaTarget'),undefined);
 assert.equal(retrieve(intent('matching',exact[1]),s,exact[1]).models.length,0);
 s.lastQuestion='Would you like to browse our designs?';s.activeQuestion=exact[1];s.activeRequests=intent('property',exact[1]).requests;
 const yes=normalizeIntent(intent('clarify',exact[2]),exact[2],s);assert.equal(yes.topic,'matching');assert.equal(yes.requests![0].topic,'matching');
 s=mergePatch(s,{},exact[2]);s=mergePatch(s,{},exact[3]);
 assert.deepEqual(stateValue(s,'bedroomOptions'),[4,5]);assert.equal(stateValue(s,'bedrooms'),undefined);assert.equal(stateValue(s,'areaTarget'),undefined);
 const normalized=normalizeIntent(intent('specifications',exact[3]),exact[3],s),r=retrieve(normalized,s,exact[3]);
 assert.ok(r.models.length>=2&&r.models.length<=3);assert.deepEqual(new Set(r.models.map(m=>m.bedrooms)),new Set([4,5]));assert.ok(r.models.every(m=>m.units===1));
 s.recommended=r.models.map(m=>m.id);
 s=mergePatch(s,{areaTarget:{value:4000,unit:'sf',sqft:4000,basis:'published'}},'Compare those designs and show their floor plans.');
 assert.equal(stateValue(s,'areaTarget'),undefined);assert.deepEqual(stateValue(s,'bedroomOptions'),[4,5]);
 s=readState(signState(s,'test-only-secret'),'acceptance','test-only-secret');
 assert.match(projectSummary(s),/East Vancouver/);assert.match(projectSummary(s),/Lot\/site area.*4000 sf/);assert.match(projectSummary(s),/Acceptable bedrooms: 4 or 5/);assert.doesNotMatch(projectSummary(s),/Target: 4000/);
 const comparison=normalizeIntent(intent('comparison','Compare those designs.'),'Compare those designs.',s);
 assert.deepEqual(retrieve(comparison,s,'Compare those designs.').models.map(m=>m.id),s.recommended);
});
test('lot and home measurements stay independent across units, order and separate turns',()=>{
 for(const q of ['Our lot is 4,000 sq. ft.; we want a 2,500 sq. ft. home.','We want a 2,500 square foot house on a 4,000 square foot lot.','Our site is 4000 sf but the home target is 2500 sf.']){
  const s=mergePatch(initialState('areas'),{},q);assert.equal(stateValue(s,'siteArea')?.sqft,4000,q);assert.equal(stateValue(s,'areaTarget')?.sqft,2500,q);
 }
 let s=mergePatch(initialState('metric'),{},'My parcel is 600 m².');assert.equal(stateValue(s,'siteArea')?.unit,'m2');assert.equal(stateValue(s,'areaTarget'),undefined);
 s=mergePatch(s,{},'A house of 230 m², maximum 250.');assert.equal(stateValue(s,'areaTarget')?.value,230);assert.equal(stateValue(s,'areaMax')?.value,250);assert.equal(stateValue(s,'siteArea')?.value,600);
 s=mergePatch(s,{},'Actually our lot is 650 m².');assert.equal(stateValue(s,'siteArea')?.value,650);assert.equal(stateValue(s,'areaTarget')?.value,230);
});
test('bedroom alternatives, ranges and replacements preserve explicit semantics',()=>{
 for(const q of ['four or five bedrooms','4/5 bed','4 bedrooms or 5 bedrooms','between four and five bedrooms']){
  const s=mergePatch(initialState('beds'),{},q);assert.deepEqual(stateValue(s,'bedroomOptions'),[4,5],q);assert.ok(shortlist(constraints(s)).matches.every(m=>[4,5].includes(m.bedrooms!)));
 }
 let s=mergePatch(initialState('replace'),{},'Four bedrooms.');s=mergePatch(s,{},'4 or 5 bedroom.');assert.equal(stateValue(s,'bedrooms'),undefined);
 s=mergePatch(s,{},'Actually exactly four bedrooms.');assert.equal(stateValue(s,'bedrooms'),4);assert.deepEqual(stateValue(s,'bedroomOptions'),[4]);assert.ok(shortlist(constraints(s)).matches.every(m=>m.bedrooms===4));
 s=mergePatch(s,{},'At least four bedrooms.');assert.equal(stateValue(s,'bedroomMode'),'minimum');
});
test('fallback delivers real catalogue recommendations without asking permission or claiming property fit',async()=>{
 const state=mergePatch(initialState('fallback'),{},'Our lot is 4000 sf in East Vancouver.');
 const r=await answerQuestion('4 or 5 bedroom.',state,{calls:0,fault:'invalid'});
 assert.ok(r.reply.modelCards!.length>=2);const text=r.reply.answerSegments!.map(s=>s.text).join(' ');
 for(const card of r.reply.modelCards!){assert.ok(text.includes(card.title));assert.ok(card.image);assert.ok(card.specs?.length);assert.ok(card.floorPlanHref);}
 assert.doesNotMatch(text,/These published designs meet|fits? (?:your|the) (?:lot|property)|connection is busy/);assert.match(text,/site-specific review/);assert.doesNotMatch(r.reply.question,/would you like.*(?:browse|show|explore)/i);
});
test('all architectural card images/specifications/plan links come from existing approved public records',()=>{
 for(const m of knowledge.models.filter(m=>m.family==='architectural')){
  const card=recommendationCard(m);assert.equal(card.image?.src,publishedHomes.find(h=>h.slug===m.slug)!.heroImage);assert.equal(card.href,new URL(m.url).pathname);assert.equal(card.floorPlanHref,new URL(m.url).pathname+'#plans');assert.equal((card.floorPlanHref.match(/#/g)??[]).length,1);assert.deepEqual(card.features,m.features.slice(0,2));
  assert.ok(card.specs?.some(s=>s.includes(String(m.bedrooms))));assert.ok(card.specs?.some(s=>s.includes(m.area_sqft!.toLocaleString('en-CA'))));
 }
 const duplex=recommendationCard(modelIndex.get('home-salt-spring')!);assert.match(duplex.specs!.join(' '),/bedrooms combined.*combined building/);
 assert.equal(modelLink(modelIndex.get('home-saturna')!,'floorplan'),'/homes/saturna#plans');
});
test('program, phase, role and community context survive recommendations without single-home assumptions',()=>{
 let developer=mergePatch(initialState('dev'),{},'I am a developer planning six four-bedroom homes in Winnipeg next year.');
 developer=mergePatch(developer,{},'Could we phase the development in two groups of three?');assert.equal(stateValue(developer,'homes'),6);assert.equal(stateValue(developer,'phaseHomes'),3);assert.equal(stateValue(developer,'role'),'developer');assert.equal(stateValue(developer,'bedrooms'),4);
 let nation=mergePatch(initialState('nation'),{},'Our Nation is exploring twenty two-bedroom homes, starting with 10.');
 nation=mergePatch(nation,{},'We prefer low maintenance and privacy for Elders.');assert.match(stateValue(nation,'audience')!,/Indigenous/);assert.equal(stateValue(nation,'homes'),20);assert.equal(stateValue(nation,'phaseHomes'),10);assert.equal(stateValue(nation,'bedrooms'),2);
});
