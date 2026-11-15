import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {test} from 'node:test';
import {GET as chatGet,POST as chatPost} from '@/app/api/concierge/route';
import {GET as leadGet,POST as leadPost} from '@/app/api/concierge/leads/route';
import {evaluationAccess,type Evaluation} from './audited/evaluation';
import {conciergeEnabled,verifyToken} from './security';

const secret='local-production-signing-fixture-not-a-credential';
const evaluationSecret='local-evaluation-fixture-not-a-credential';
async function production(run:()=>Promise<void>){
 const values={VERCEL_ENV:'production',CONCIERGE_ENABLED:'true',CONCIERGE_REQUEST_SECRET:secret,AI_GATEWAY_MODEL:'fixture/no-model-call',AI_GATEWAY_API_KEY:'fixture/no-network',RESEND_API_KEY:'fixture/no-email',CONCIERGE_EVALUATION_ENABLED:'true',CONCIERGE_EVALUATION_SECRET:evaluationSecret};
 const old=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));Object.assign(process.env,values);
 try{await run()}finally{for(const [k,v]of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v;}
}
const request=(path='/api/concierge',headers:Record<string,string>={})=>new Request('https://stage.example'+path,{headers});
const post=(path:string,body:object,headers:Record<string,string>={})=>new Request('https://stage.example'+path,{method:'POST',headers:{origin:'https://stage.example','content-type':'application/json',...headers},body:JSON.stringify(body)});
function evaluation(fault:Evaluation['fault']){
 const payload=Buffer.from(JSON.stringify({run:'production-must-reject',caseId:fault,expires:Date.now()+60_000,fault})).toString('base64url');
 return payload+'.'+createHmac('sha256',evaluationSecret).update('hd-evaluation:'+payload).digest('hex');
}
test('production opt-in enables signed chat and lead readiness without exposing evaluation metadata',async()=>production(async()=>{
 assert.equal(conciergeEnabled(),true);
 const response=await chatGet(request()),body=await response.json();assert.equal(response.status,200);assert.equal(body.available,true);assert.ok(verifyToken(body.token,secret,'chat'));assert.ok(body.sessionState);assert.equal(body._evaluation,undefined);
 assert.match(response.headers.get('set-cookie')!,/HttpOnly; SameSite=Strict.*Secure/);assert.equal(response.headers.get('cache-control'),'no-store');
 const lead=await leadGet(request('/api/concierge/leads')),intake=await lead.json();assert.equal(lead.status,200);assert.ok(verifyToken(intake.token,secret,'lead',Date.now()+600));assert.equal(intake._evaluation,undefined);
 // These paths reject before inference or delivery. No provider request or email.
 assert.equal((await chatPost(post('/api/concierge',{question:'Hello',history:[],token:'forged'}))).status,403);
 assert.equal((await chatPost(post('/api/concierge',{}, {origin:'https://other.example'}))).status,403);
 assert.equal((await leadPost(post('/api/concierge/leads',{token:intake.token,consent:false}))).status,400);
}));
test('production rejects correctly signed evaluation and every fault/mock mode even if evaluation flags are accidentally enabled',async()=>production(async()=>{
 for(const fault of ['none','timeout','invalid','busy','rate','lead_failure','restore'] as const){
  const headers={'x-hd-concierge-evaluation':evaluation(fault)};
  assert.throws(()=>evaluationAccess(request('/api/concierge',headers)),/Invalid evaluation access/);
  for(const response of [await chatGet(request('/api/concierge',headers)),await chatPost(post('/api/concierge',{},headers)),await leadGet(request('/api/concierge/leads',headers)),await leadPost(post('/api/concierge/leads',{},headers))]){
   assert.equal(response.status,403);const body=await response.json();assert.equal(body.error,'Invalid evaluation access.');assert.equal(body._evaluation,undefined);
  }
 }
 process.env.VERCEL_ENV='preview';assert.equal(evaluationAccess(request('/api/concierge',{'x-hd-concierge-evaluation':evaluation('none')}))?.fault,'none');
}));
test('explicit kill switch and missing production prerequisites stay fail-closed',async()=>production(async()=>{
 process.env.CONCIERGE_ENABLED='false';assert.equal(conciergeEnabled(),false);assert.equal((await chatGet(request())).status,503);assert.equal((await leadGet(request('/api/concierge/leads'))).status,503);
 process.env.CONCIERGE_ENABLED='true';delete process.env.CONCIERGE_REQUEST_SECRET;assert.equal((await chatGet(request())).status,503);assert.equal((await leadGet(request('/api/concierge/leads'))).status,503);
 process.env.CONCIERGE_REQUEST_SECRET=secret;delete process.env.AI_GATEWAY_MODEL;assert.equal((await chatGet(request())).status,503);
}));
