import {test} from 'node:test';
import assert from 'node:assert/strict';
import {conciergeJourneys} from './contracts';
import {approvedFacts,renderPlan,qualifyPlan} from './knowledge';
import {detailRequested,presentFact} from './presentation';

test('four journeys include individuals, ADU, development and open questions',()=>{
  assert.deepEqual(conciergeJourneys.map(j=>j.label),['Build My Home','ADU / Laneway Home','Multi-Home Development','Ask Anything']);
  assert.equal(conciergeJourneys[3].prompt,'');
});
test('concise price response retains current rates, exclusions and planning scope',()=>{
  const reply=renderPlan(qualifyPlan({facts:['prices'],next:'location',disposition:'answer'}),'What do the packages cost?');
  assert.equal(reply.introduction,'');assert.equal(reply.facts.length,2);
  const text=reply.facts.map(f=>f.text).join(' ');
  assert.match(text,/\$250/);assert.match(text,/\$300/);assert.match(text,/not a completed-construction price/);assert.match(text,/foundations, assembly, freight, taxes/);assert.ok(text.length<550);assert.equal(reply.question.includes('?'),true);
});
test('all 18 home summaries keep the approved name, size and bedroom count',()=>{
  for(const f of approvedFacts.filter(f=>f.kind==='home')){
    const copy=presentFact(f),area=f.text.match(/: ([\d,]+) sq\. ft\./)![1];
    assert.ok(copy.includes(f.title));assert.ok(copy.includes(area));assert.ok(copy.length<430);
    if(f.id==='home-salt-spring')assert.match(copy,/across both homes/);
    else assert.ok(copy.includes(f.text.match(/; (\d+) bedrooms/)![1]+' bedrooms'));
  }
});
test('comparison fits four response sentences without losing either named design',()=>{
  const r=renderPlan({facts:['home-solace','home-timberline'],next:'design',disposition:'answer'});
  assert.equal(r.facts.length,2);const text=r.facts.map(f=>f.text).join(' ').replace(/sq\. ft\./g,'square feet.');
  assert.equal([...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)].length,4);
  assert.match(text,/Solace/);assert.match(text,/Timberline/);
});
test('CMHC short answers retain property-specific qualification and terms link',()=>{
  const r=renderPlan(qualifyPlan({facts:['catalog-the-micro'],next:'property',disposition:'answer'}));
  assert.ok(r.facts.some(f=>f.id==='cmhc-terms'&&f.href==='/cmhc-catalogue-terms'));assert.match(r.facts.map(f=>f.text).join(' '),/not permits/);assert.match(r.facts.find(f=>f.id==='catalog-the-micro')!.text,/one-bedroom/);
});
test('details are opt-in and preserve the exact approved detailed facts',()=>{
  for(const q of ['Tell me more','More details please','Full specifications for that design','Explain in detail'])assert.equal(detailRequested(q),true);
  assert.equal(detailRequested('How much is Premium?'),false);
  const r=renderPlan({facts:['home-aurora','customization'],next:'site',disposition:'answer'},'Full specifications for Aurora');
  assert.equal(r.detailed,true);assert.deepEqual(r.facts,approvedFacts.filter(f=>['home-aurora','customization'].includes(f.id)).reverse());
});
test('user words can rank approved selections but cannot become published text or links',()=>{
  const f=approvedFacts.find(f=>f.id==='studio-solace-kitchen-look-feel')!;
  const text=presentFact(f,'Sculpted White PRIVATE_FACTORY_CANARY https://attacker.example');
  assert.match(text,/Sculpted White/);assert.doesNotMatch(text,/PRIVATE_FACTORY_CANARY|attacker\.example/);
  const r=renderPlan({facts:[f.id],next:'design',disposition:'answer'},'PRIVATE_FACTORY_CANARY');assert.equal(r.facts[0].href,f.href);
});
test('public planning summaries retain community leadership and project-specific timing',()=>{
  assert.match(presentFact(approvedFacts.find(f=>f.id==='community')!),/Your Nation’s housing priorities/);
  assert.match(presentFact(approvedFacts.find(f=>f.id==='timing')!),/Timing is established for the site/);
});
