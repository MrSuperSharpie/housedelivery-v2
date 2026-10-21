// Isolated transport check: no real database or email provider is contacted.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { randomUUID } from 'node:crypto';
registerHooks({resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return {url:new URL('../node_modules/next/dist/compiled/server-only/empty.js',import.meta.url).href,shortCircuit:true};
  return nextResolve(specifier, context);
}});
process.env.LOOKBOOK_SUPABASE_URL='http://127.0.0.1:3132';
process.env.LOOKBOOK_SUPABASE_SERVICE_ROLE_KEY='local-email-test';
process.env.LOOKBOOK_PUBLIC_URL='http://127.0.0.1:3131';
process.env.RESEND_API_KEY='mock-only-never-sent';
process.env.LOOKBOOK_NOTIFICATION_EMAIL='team@example.invalid';
const rows=new Map(),messages=[];
let rejectEmail=false,client=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{
  const target=new URL(String(url));
  if(target.origin==='https://api.resend.com' && target.pathname==='/emails') {
    messages.push({body:JSON.parse(options.body),key:options.headers['Idempotency-Key']});
    return Response.json(rejectEmail?{error:'temporary failure'}:{id:randomUUID()},{status:rejectEmail?503:200});
  }
  assert.equal(target.origin,'http://127.0.0.1:3132','Unexpected network request');
  assert.equal(target.pathname,'/rest/v1/lookbook_configurations');
  if(options.method==='POST'){const row=JSON.parse(options.body);rows.set(row.id,row);return Response.json([row]);}
  const row=rows.get(target.searchParams.get('id')?.replace(/^eq\./,''));return Response.json(row?[row]:[]);
};
try {
  const {POST}=await import('../src/app/api/lookbooks/route.ts');
  const {getHomeConfiguratorRegistrationsByFamily}=await import('../src/data/home-configurator-registry.ts');
  const {createDefaultHomeConfiguration,getHomeConfiguratorJourneyCategories}=await import('../src/data/home-configurator.ts');
  async function submit(payload) {return POST(new Request('http://127.0.0.1:3131/api/lookbooks',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':`192.0.2.${++client}`},body:JSON.stringify(payload)}));}
  const results=[];
  let sample;
  for(const home of getHomeConfiguratorRegistrationsByFamily('custom-home')) for(const tier of ['premium','signature']) {
    const definition=home.definition,configuration=createDefaultHomeConfiguration(definition);
    for(const category of getHomeConfiguratorJourneyCategories(definition)) {
      assert.equal(category.kind,'room-look');
      const option=category.options.find(option=>option.level===tier)||category.options[0];
      configuration.inclusionSelections[category.id]={optionId:option.id,status:'confirmed'};
    }
    const payload={intent:'email',homeSlug:home.homeId,configuration,contact:{firstName:'Local Test',email:'customer@example.invalid'},followUpRequested:false};
    const before=messages.length,response=await submit(payload),saved=await response.json();
    assert.equal(response.status,200);assert.equal(saved.emailSent,true);assert.equal(saved.leadState,'known_engaged');assert.equal(saved.followUpRequested,false);
    assert.equal(messages.length,before+2);
    const [customer,internal]=messages.slice(before);
    assert.deepEqual(customer.body.to,['customer@example.invalid']);assert.deepEqual(internal.body.to,['team@example.invalid']);
    assert.ok(customer.body.text.includes(`/lookbook/${saved.configurationId}/pdf?disposition=attachment`));
    assert.match(internal.body.text,/Windows & Patio Doors:/);assert.match(internal.body.text,/Follow-up Requested: No/);assert.match(internal.body.text,/DOWNLOAD LOOK BOOK:/);
    const row=rows.get(saved.configurationId),glazing=row.selections.find(selection=>selection.categoryId==='windows-patio-doors');
    assert.equal(glazing.optionId,`windows-patio-doors-${tier}-1`);assert.ok(internal.body.text.includes(glazing.optionName));
    results.push({home:home.homeId,tier,selections:row.selections.length,customerAndHouseDeliveryCopy:true,followUpUnchanged:true});
    if(home.homeId==='solace'&&tier==='premium')sample={...payload,configurationId:saved.configurationId};
  }
  const beforeRetry=messages.length;assert.equal((await submit(sample)).status,200);const retryKeys=messages.slice(-2).map(message=>message.key);
  assert.equal((await submit(sample)).status,200);assert.deepEqual(messages.slice(-2).map(message=>message.key),retryKeys);
  sample.configuration.inclusionSelections['windows-patio-doors'].optionId='windows-patio-doors-premium-4';
  assert.equal((await submit(sample)).status,200);assert.notDeepEqual(messages.slice(-2).map(message=>message.key),retryKeys);
  const followResponse=await submit({...sample,followUpRequested:true});assert.equal(followResponse.status,200);
  assert.match(messages.at(-1).body.subject,/qualified inquiry/);assert.match(messages.at(-1).body.text,/Follow-up Requested: Yes/);
  rejectEmail=true;const failure=await submit({...sample,configurationId:undefined});const failureBody=await failure.json();
  assert.equal(failure.status,202);assert.equal(failureBody.saved,true);assert.equal(failureBody.emailSent,false);assert.ok(rows.has(failureBody.configurationId));
  assert.ok(messages.length>beforeRetry);
  console.log(JSON.stringify({journeys:results,stableRetryKeys:true,editedSelectionGetsNewEmail:true,assistanceStillExplicit:true,providerFailurePreservesSavedBook:true,realEmailsSent:0},null,2));
} finally {globalThis.fetch=originalFetch;}
