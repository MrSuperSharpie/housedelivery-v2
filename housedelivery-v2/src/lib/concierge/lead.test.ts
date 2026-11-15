import assert from 'node:assert/strict';
import {test} from 'node:test';
import {POST} from '@/app/api/concierge/leads/route';
import {audiences} from './contracts';
import {formatLead,handleLead,leadLocation,leadSubject,parseLead} from './lead';
import {issueToken} from './security';

const secret='inquiry-unit-test-secret-only';
const minimal={fullName:'Preview Test Visitor',email:'visitor@example.test',audience:'Individual / family',consent:true};
const advanced={...minimal,audience:'Developer',location:'Winnipeg, Manitoba',objective:'A phased community.\nPlease discuss a 500+ home program.',organization:'Test Housing Organization',housingType:'Multi-home development',homeCount:'500+',siteStatus:'Site owned / controlled',timeline:'Phased program',phone:'+1 204 555 0100'};
function request(body:unknown,key:string){return new Request('https://preview.example/api/concierge/leads',{method:'POST',headers:{origin:'https://preview.example','content-type':'application/json','x-vercel-forwarded-for':key},body:JSON.stringify(body)})}
function token(){return issueToken(secret,'lead',Date.now()-1000)}

test('an exploratory inquiry requires only name, email, customer category and explicit consent',()=>{
  for(const audience of audiences){
    const lead=parseLead({...minimal,audience});assert.equal(lead.audience,audience);
    for(const key of ['phone','organization','location','municipality','province','housingType','homeCount','siteStatus','timeline','objective'] as const)assert.equal(lead[key],'');
    assert.equal(lead.sourcePath,'/');assert.equal(leadLocation(lead),'Not supplied');
    assert.match(formatLead('test',lead),/Project description: Not supplied/);
    assert.match(leadSubject(lead),new RegExp(audience.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
  for(const key of ['fullName','email','audience','consent']){const body:Record<string,unknown>={...minimal};delete body[key];assert.throws(()=>parseLead(body),key)}
});

test('optional details remain validated when provided, without inventing absent project information',()=>{
  const blank=parseLead({...minimal,location:' ',objective:'',housingType:'',homeCount:'',siteStatus:'',timeline:''});assert.equal(blank.location,'');assert.equal(blank.housingType,'');
  for(const extra of [{location:'x'.repeat(241)},{location:'City\nBcc: test@example.test'},{location:'<script>'},{objective:'x'.repeat(1201)},{housingType:'Imaginary option'},{homeCount:'5000'},{timeline:'Tomorrow guaranteed'},{province:'Invalid province'},{phone:123},{organization:{}},{transcript:'private chat'},{sessionState:'private state'}])assert.throws(()=>parseLead({...minimal,...extra}));
});

test('all supplied development details reach the notification, with legacy locations still supported',()=>{
  const lead=parseLead(advanced),email=formatLead('test-reference',lead);
  for(const value of [advanced.audience,advanced.location,advanced.objective,advanced.organization,advanced.housingType,advanced.homeCount,advanced.siteStatus,advanced.timeline,advanced.phone])assert.ok(email.includes(value),value);
  assert.equal(leadLocation(lead),'Winnipeg, Manitoba');assert.match(leadSubject(lead),/Developer — Multi-home development — Winnipeg, Manitoba/);
  const legacy=parseLead({...minimal,municipality:'Test Community',province:'Manitoba'});assert.equal(leadLocation(legacy),'Test Community, Manitoba');assert.match(formatLead('legacy',legacy),/Location: Test Community, Manitoba/);
  assert.equal(leadLocation(parseLead({...minimal,province:'Manitoba'})),'Manitoba');
});

test('minimal inquiry keeps idempotency, consent, honeypot and delivery-failure protections',async()=>{
  let sent=0;const body={...minimal,token:token()};
  const deliver=async()=>{sent++;return Response.json({id:'test-provider-id'})};
  const first=await handleLead(request(body,'minimal-idempotent'),{secret,deliver});assert.equal(first.status,200);
  assert.equal((await handleLead(request(body,'minimal-idempotent'),{secret,deliver})).status,200);assert.equal(sent,1);
  assert.equal((await handleLead(request({...body,objective:'Different inquiry'},'minimal-idempotent'),{secret,deliver})).status,409);assert.equal(sent,1);
  for(const [i,extra]of [{consent:false},{website:'bot.example'},{token:issueToken(secret,'chat',Date.now()-1000)}].entries()){
    const result=await handleLead(request({...minimal,token:token(),...extra},'minimal-invalid-'+i),{secret,deliver});assert.equal(result.status,400);
  }
  assert.equal(sent,1);
  const failed=await handleLead(request({...minimal,token:token()},'minimal-provider-failure'),{secret,deliver:async()=>Response.json({error:'Rejected'},{status:503})});assert.equal(failed.status,502);assert.equal((await failed.json()).accepted,undefined);
});

test('the existing endpoint delivers minimal and development notifications through the same provider contract',async t=>{
  const envKeys=['CONCIERGE_ENABLED','CONCIERGE_REQUEST_SECRET','RESEND_API_KEY','VERCEL_ENV','INQUIRY_FROM_EMAIL'] as const;
  const previous=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
  Object.assign(process.env,{CONCIERGE_ENABLED:'true',CONCIERGE_REQUEST_SECRET:secret,RESEND_API_KEY:'unit-test-provider-key',VERCEL_ENV:'preview',INQUIRY_FROM_EMAIL:'House Delivery Website <inquiries@housedelivery.ca>'});
  t.after(()=>{for(const key of envKeys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}});
  const messages:Record<string,unknown>[]=[];
  t.mock.method(globalThis,'fetch',async(url:unknown,init:RequestInit)=>{
    assert.equal(url,'https://api.resend.com/emails');assert.equal(init.method,'POST');
    const headers=init.headers as Record<string,string>;assert.match(headers['Idempotency-Key'],/^ai-concierge-/);
    const message=JSON.parse(init.body as string);messages.push(message);return Response.json({id:'provider-accepted-'+messages.length});
  });
  for(const [i,lead]of [minimal,advanced].entries()){
    const response=await POST(request({...lead,token:token()},'endpoint-inquiry-'+i));assert.equal(response.status,200);const body=await response.json();assert.equal(body.accepted,true);assert.equal(body._evaluation,undefined);assert.doesNotMatch(JSON.stringify(body),/visitor@example|Preview Test Visitor/);
  }
  assert.equal(messages.length,2);
  for(const message of messages){assert.deepEqual(message.to,['sales@housedelivery.ca']);assert.equal(message.reply_to,minimal.email);assert.match(message.subject as string,/^\[PREVIEW\] AI Concierge/);assert.match(message.text as string,/Express permission/);assert.match(message.text as string,/No conversation transcript/)}
  assert.match(messages[0].subject as string,/Individual \/ family/);assert.match(messages[0].text as string,/Location: Not supplied/);
  assert.match(messages[1].subject as string,/Developer — Multi-home development — Winnipeg, Manitoba/);assert.ok((messages[1].text as string).includes(advanced.objective));assert.match(messages[1].text as string,/Approximate number of homes: 500\+/);
});
