import {test} from 'node:test';import assert from 'node:assert/strict';
import {conversationPlan} from './conversation';import {retrieveFacts} from './knowledge';
import type {ChatTurn} from './contracts';
const history:ChatTurn[]=[{question:'I’m exploring a home for myself or my family.',factIds:['delivery'],next:'bedrooms'}];
test('individual five-bedroom requests exclude combined duplex and mismatched bedroom counts',()=>{
  const facts=retrieveFacts(history,'Five bedrooms, around 6,000 square feet, for our family.');
  assert.ok(facts.some(f=>f.id==='home-langley'));assert.ok(facts.some(f=>f.id==='home-solace'));assert.ok(!facts.some(f=>f.id==='home-salt-spring'));assert.ok(!facts.some(f=>f.id==='home-aurora'));
});
test('explicit named comparisons remain available despite different bedroom counts',()=>{
  const facts=retrieveFacts(history,'Compare Solace and Timberline. We originally wanted five bedrooms.');
  assert.ok(facts.some(f=>f.id==='home-solace'));assert.ok(facts.some(f=>f.id==='home-timberline'));
});
test('a site already owned and a known location are not asked again',()=>{
  const p=conversationPlan({facts:['carriage-lantern-house'],next:'site',disposition:'answer'},'We own a property in Vancouver, BC and want two bedrooms for family.',[{question:'I’m exploring an ADU or laneway home.',factIds:['site'],next:'location'}]);
  assert.ok(!['site','property','location','bedrooms'].includes(p.next));
});
test('a missing model follow-up is replaced with one approved relevant question',()=>{
  const p=conversationPlan({facts:['prices','exclusions'],next:'none',disposition:'answer'},'What are Premium and Signature prices?',[]);assert.notEqual(p.next,'none');
});
test('a known audience, location, scale, site and objectives advance to timing',()=>{
  const p=conversationPlan({facts:['community','scale'],next:'location',disposition:'answer'},'We are a First Nation planning 50 homes on community-owned land in Winnipeg, Manitoba. Local participation is a priority.',[]);assert.equal(p.next,'timeline');
});
test('normal replies select two facts, with more detail only when requested',()=>{
  const p={facts:['scale','national','municipal','delivery'],next:'timeline' as const,disposition:'answer' as const};assert.equal(conversationPlan(p,'How do I begin?',[]).facts.length,2);assert.equal(conversationPlan(p,'Explain in detail',[]).facts.length,4);
});
