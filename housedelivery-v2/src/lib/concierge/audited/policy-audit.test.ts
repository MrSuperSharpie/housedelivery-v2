import {test} from 'node:test';
import assert from 'node:assert/strict';
import {policyIndex,renderPolicies} from './policy-audit';
import {initialState} from './state';
test('policy authority is an explicit record, never an AI entailment decision',()=>{
 assert.equal(policyIndex.get('plant_visit')!.status,'team_confirmation');
 assert.equal(policyIndex.get('engineering_documents')!.status,'team_confirmation');
 assert.throws(()=>renderPolicies(['unapproved-policy'],initialState('S')));
});
