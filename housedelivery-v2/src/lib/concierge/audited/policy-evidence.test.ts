import {test} from 'node:test';
import assert from 'node:assert/strict';
import {policyRecords,policyIndex,renderPolicies} from './policies';
import {factIndex} from './registry';
import {initialState} from './state';
test('published policy records retain source authority and project-specific qualifications',()=>{
 assert.equal(new Set(policyRecords.map(p=>p.id)).size,policyRecords.length);
 for(const p of policyRecords)for(const id of p.factIds)assert.ok(factIndex.has(id));
 assert.match(policyIndex.get('local_work')!.text,/unless expressly included/);
 assert.match(policyIndex.get('appliances')!.text,/unless expressly included/);
});
test('unrecorded practices stay unknown and do not become a refusal or promised offer',()=>{
 const r=renderPolicies(['unrecorded_policy'],initialState('P'))[0];
 assert.equal(r.status,'team_confirmation');assert.match(r.text,/needs to confirm/);
 assert.match(r.text,/does not establish that it is available or unavailable/);
});
