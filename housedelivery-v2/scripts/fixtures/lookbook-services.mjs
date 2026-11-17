/* Isolated local HTTP workflow fixture. Never imported by application code. */
if (process.env.LOOKBOOK_TEST_MODE !== 'isolated-local' || process.env.VERCEL || process.env.VERCEL_ENV || process.env.LOOKBOOK_SUPABASE_URL !== 'https://lookbook-fixture.invalid') throw Error('Local Look Book fixture only');
import fs from 'node:fs';
import crypto from 'node:crypto';
const path=process.env.LOOKBOOK_TEST_STORE;
if (!path?.startsWith('/private/tmp/hd-personalized-lookbook-review-20261116/'))throw Error('Unexpected fixture store');
const originalFetch=global.fetch;
function read(){return fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')):{rows:{},messages:[],attempts:[],faults:{}}}
function write(value){fs.writeFileSync(path,JSON.stringify(value,null,2),{mode:0o600})}
function json(value,status=200){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}})}
global.fetch=async function(input,init={}){
 const request=input instanceof Request?input:new Request(input,init);
 const url=new URL(request.url),method=request.method;
 const bodyText=['POST','PATCH'].includes(method)?await request.clone().text():'';
 const requestHeaders=new Headers(init.headers??request.headers);
 if(url.origin==='https://lookbook-fixture.invalid'){
  if(url.pathname!=='/rest/v1/lookbook_configurations')throw Error('Unexpected test relation');
  const state=read(),id=url.searchParams.get('id')?.replace(/^eq\./,'');
  if(method==='GET'){if(!id)throw Error('Unfiltered customer reads are forbidden');return json(state.rows[id]?[state.rows[id]]:[])}
  const body=JSON.parse(bodyText),headers=requestHeaders,prefer=headers.get('Prefer')??'';
  if(method==='POST'){
   if(state.rows[body.id]&&prefer.includes('ignore-duplicates'))return json([]);
   state.rows[body.id]=body;write(state);return json([body],201);
  }
  if(method==='PATCH'){
   const previous=state.rows[id],expected=url.searchParams.get('updated_at')?.replace(/^eq\./,'');
   if(!previous||previous.updated_at!==expected)return json([]);
   if(body.contact?._lookbookFulfillment?.customer?.status==='accepted'&&state.faults.databaseAcceptance?.remaining>0){state.faults.databaseAcceptance.remaining--;write(state);return json({message:'simulated acknowledgement write failure'},500);}
   state.rows[id]=body;write(state);return json([body]);
  }
  throw Error('Unexpected fixture method');
 }
 if(url.href==='https://api.resend.com/emails'){
  const state=read(),message=JSON.parse(bodyText),key=requestHeaders.get('Idempotency-Key'),fingerprint=crypto.createHash('sha256').update(JSON.stringify(message)).digest('hex');
  const existing=state.messages.find(m=>m.key===key);state.attempts.push({key,to:message.to,subject:message.subject});
  if(existing){write(state);return existing.fingerprint===fingerprint?json({id:existing.providerId}):json({message:'idempotency payload conflict'},409)}
  const fault=state.faults[message.to[0]];
  if(fault?.remaining>0){fault.remaining--;write(state);return fault.missingId?json({}):json({message:'simulated provider failure'},fault.status??503)}
  const providerId=crypto.randomUUID();state.messages.push({key,providerId,fingerprint,...message});write(state);return json({id:providerId});
 }
 if(method==='POST'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('External test sends are blocked');
 return originalFetch(input,init);
};
