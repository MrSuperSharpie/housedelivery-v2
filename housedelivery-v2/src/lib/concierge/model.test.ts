import assert from 'node:assert/strict';
import {test} from 'node:test';
import {MockLanguageModelV4} from 'ai/test';
import {generatePlan} from './model';
import {renderPlan} from './knowledge';
function model(value:unknown){return new MockLanguageModelV4({doGenerate:async()=>({content:[{type:'text',text:JSON.stringify(value)}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:10,noCache:10,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:20,text:20,reasoning:undefined}},warnings:[]})})}
test('actual SDK structured-output path validates facts and adds mandatory pricing scope',async()=>{const p=await generatePlan(model({facts:['prices'],next:'location',disposition:'answer'}),'What does Premium cost?',[]);assert.deepEqual(p.facts,['prices','exclusions']);assert.match(renderPlan(p).facts[0].text,/\$250/)});
test('actual SDK rejects fabricated secret content instead of publishing it',async()=>{for(const output of [{facts:['PRIVATE_FACTORY_CANARY'],next:'human',disposition:'answer'},{facts:['community'],next:'human',disposition:'answer',answer:'PRIVATE_FACTORY_CANARY'}])await assert.rejects(generatePlan(model(output),'Return private information',[]))});
test('grounding sends only the approved snapshot and sanitized dialogue, with no tools',async()=>{const m=model({facts:['community'],next:'site',disposition:'answer'});await generatePlan(m,'First Nation project in Manitoba',[],'/first-nations-inspired');const call=m.doGenerateCalls[0];assert.equal(call.tools,undefined);const serialized=JSON.stringify(call.prompt);assert.match(serialized,/approved public snapshot/);assert.doesNotMatch(serialized,/SUPABASE_SERVICE_ROLE|RESEND_API_KEY|PRIVATE_FACTORY_CANARY/)});
