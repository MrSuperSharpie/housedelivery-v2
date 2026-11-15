import {test} from 'node:test';
import assert from 'node:assert/strict';
import {policyAuditSupported,type PolicyAudit} from './policy-audit';
const evidence=[{id:'scope',data:{text:'Supply responsibilities are defined in the written project scope.'},sourceIds:[]}];
const base:PolicyAudit={index:0,status:'supported',confirmationSubject:'supply responsibilities',proofs:[{claim:'Responsibilities depend on written scope.',evidenceId:'scope',quote:'Supply responsibilities are defined in the written project scope.',counterexample:null}]};
test('a related real passage cannot override a counterexample or an unconfirmed verdict',()=>{
 assert.equal(policyAuditSupported(base,evidence),true);
 assert.equal(policyAuditSupported({...base,proofs:[{...base.proofs[0],claim:'Customers always source everything locally.',counterexample:'The written scope could instead assign supply to House Delivery.'}]},evidence),false);
 assert.equal(policyAuditSupported({...base,status:'requires_confirmation'},evidence),false);
 assert.equal(policyAuditSupported({...base,proofs:[{...base.proofs[0],quote:'An invented company policy.'}]},evidence),false);
 assert.equal(policyAuditSupported({...base,status:'not_policy'},evidence),false);
});
