/** Safe tag QA: Preview sends no telemetry; simulated Production serves this
 * build through browser routing. Every measurement beacon and inquiry is blocked/mocked. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const base=process.env.ADS_QA_URL??'http://127.0.0.1:3021',production='https://www.housedelivery.ca';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname)||new URL(base).hostname.endsWith('.vercel.app'));
const out=process.env.ADS_QA_OUTPUT??'/private/tmp/hd-google-ads-20261115/local-qa';await mkdir(out,{recursive:true});
const access=process.env.ADS_QA_BYPASS_FILE?(await readFile(process.env.ADS_QA_BYPASS_FILE,'utf8')).trim():'';
const safeError=error=>String(error).replaceAll(access||'__no_access_value__','[REDACTED_PREVIEW_ACCESS]');
const ga='G-59Q25GQB61',ads='AW-18548497593',consentKey='house-delivery:analytics-consent:v1';
const campaigns=['custom-homes','laneway-carriage-homes'];
let activePage;
const expected={'custom-homes':'AW-18548497593/iH1vCKiUlLkdELm5zoxF','laneway-carriage-homes':'AW-18548497593/zTrzCKuUlLkdELm5zoxF'};
const resume=process.env.ADS_QA_RESUME==='true';
const browser=await chromium.launch({headless:true,executablePath:process.env.ADS_QA_CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),results=[];
async function surface({simulate=true,privacy,realLibrary=false,width=1440}={}){
 const origin=simulate?production:base,context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage(),requests=[],responses=[],blocked=[],posts=[],errors=[];const controls={fail:true};let closing=false;
 if(privacy)await page.addInitScript(kind=>{Object.defineProperty(navigator,kind==='gpc'?'globalPrivacyControl':'doNotTrack',{configurable:true,get:()=>kind==='gpc'?true:'1'})},privacy);
 page.on('pageerror',e=>errors.push(safeError(e.message)));
 page.on('response',r=>{const u=new URL(r.url());if(u.hostname==='www.googletagmanager.com'&&/\/gtag\/(js|destination)/.test(u.pathname))responses.push({path:u.pathname,id:u.searchParams.get('id'),status:r.status()})});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.hostname==='www.googletagmanager.com'&&/\/gtag\/(js|destination)$/.test(u.pathname)){
   requests.push({path:u.pathname,id:u.searchParams.get('id')});return realLibrary?route.continue():route.fulfill({contentType:'text/javascript',body:'/* test-only loader: retain app dataLayer commands; send no measurement */'});
  }
  if(u.origin!==origin){blocked.push({host:u.hostname,path:u.pathname});return route.abort()}
  if(u.pathname==='/api/build-your-home-inquiries'){
   if(req.method()==='GET')return route.fulfill({json:{token:'browser-only-token'}});
   const payload=req.postDataJSON();posts.push(payload);
   if(payload.action==='property_review')return route.fulfill({json:{reviewToken:'browser-only-review',propertySnapshot:{status:'yellow',statusLabel:'REVIEW IN PROGRESS',headline:'We’re taking a closer look.',address:payload.propertyAddress,municipality:payload.municipality,propertyType:'Property type requires review',opportunity:'Human review required before a recommendation',message:'The available information needs a closer look before a recommendation can be made.',modelMatchStatus:'REVIEW_PENDING'}}});
   return route.fulfill({status:controls.fail?502:200,json:controls.fail?{error:'Synthetic delivery unavailable'}:{accepted:true,inquiryId:payload.campaign==='custom-homes'?'a96dc47f-8e49-4d08-880a-497b1cb84dc2':'b96dc47f-8e49-4d08-880a-497b1cb84dc2'}});
  }
  if(req.method()==='POST'&&u.pathname.startsWith('/api/'))return route.abort();
  if(simulate){
   const headers={...req.headers(),...(access?{'x-vercel-protection-bypass':access}:{})};delete headers.host;
   try{const response=await route.fetch({url:base+u.pathname+u.search,headers});return await route.fulfill({response})}
   catch(e){if(!closing)errors.push('Preview proxy '+u.pathname+': '+safeError(e).split('\n')[0]);return route.abort().catch(()=>{})}
  }
  return route.continue({headers:{...req.headers(),...(access?{'x-vercel-protection-bypass':access}:{})}});
 });
 activePage=page;return{page,context,origin,requests,responses,blocked,posts,errors,controls,close:async()=>{closing=true;await context.unrouteAll({behavior:'ignoreErrors'});await context.close()}};
}
const commands=p=>p.evaluate(()=>Array.from(window.dataLayer??[],c=>Array.from(c)));
const events=async(p,name)=>(await commands(p)).filter(c=>c[0]==='event'&&c[1]===name);
async function allow(s){await s.page.getByRole('button',{name:'Allow analytics',exact:true}).click();await s.page.waitForFunction(()=>Array.from(window.dataLayer??[]).some(c=>c[0]==='config'&&c[1]==='AW-18548497593')&&Array.from(window.dataLayer??[]).some(c=>c[0]==='event'&&c[1]==='page_view'));}
async function tagged(s){const c=await commands(s.page);assert.equal(c.filter(c=>c[0]==='config'&&c[1]===ga).length,1);assert.equal(c.filter(c=>c[0]==='config'&&c[1]===ads).length,1);assert.equal(s.requests.filter(r=>r.path==='/gtag/js'&&r.id===ga).length,1);assert.ok(s.requests.every((r,i,all)=>all.findIndex(x=>x.path===r.path&&x.id===r.id)===i),'each Google destination requested only once');assert.equal(await s.page.locator('script[id="house-delivery-ga"]').count(),1);assert.equal(await s.page.locator('script[id="house-delivery-ga-init"]').count(),1);assert.equal(await s.page.locator('script[src*="/gtm.js"]').count(),0);assert.equal((await events(s.page,'page_view'))[0][2].send_to,ga);}
try{
 if(resume){
  const prior=JSON.parse(await readFile(process.env.ADS_QA_RESUME_FROM??out+'/results.json','utf8'));results.push(...prior.results.filter(r=>r.passed&&r.case!=='Real Google library'&&(r.case!=='Accepted inquiry'||r.adsDestination===expected[r.campaign])));
  const diagnostic=JSON.parse(await readFile(process.env.ADS_QA_REAL_EVIDENCE,'utf8'));
  for(const id of [ga,ads]){assert.equal(diagnostic.configs.filter(c=>c[1]===id).length,1);assert.equal(diagnostic.requests.filter(r=>r.id===id&&r.path==='/gtag/js').length,1);assert.ok(diagnostic.responses.some(r=>r.id===id&&r.status===200))}
  assert.equal(diagnostic.scripts.filter(s=>s.id==='house-delivery-ga').length,1);assert.deepEqual(diagnostic.errors,[]);
  results.push({case:'Real Google library',passed:true,loaderStatus:200,destinations:[ga,ads],applicationLoaderCount:1,googleInjectedAdsDependency:true,realMeasurementBeacons:'blocked',resources:diagnostic.responses,evidence:'saved real-library diagnosis; network request not repeated'});
 }else{
 // Ordinary Preview behavior must remain telemetry-free, even after consent.
 for(const campaign of campaigns){const s=await surface({simulate:false});await s.page.goto(base+'/build-your-home/'+campaign);await s.page.getByRole('button',{name:'Allow analytics',exact:true}).click();await s.page.waitForFunction(key=>localStorage.getItem(key)==='accepted',consentKey);assert.deepEqual(s.requests,[]);assert.equal(await s.page.locator('script[id="house-delivery-ga"]').count(),0);results.push({case:'Preview guard',campaign,passed:true});await s.close()}
 // The real Google loader is allowed once; all analytics/advertising beacons are intercepted.
 const live=await surface({realLibrary:true});await live.page.goto(production);await live.page.getByRole('button',{name:'Allow analytics',exact:true}).waitFor();assert.deepEqual(live.requests,[]);const loaded=live.page.waitForResponse(r=>r.url().includes('googletagmanager.com/gtag/js?'),{timeout:30000});await allow(live);const resource=await loaded;assert.equal(resource.status(),200);await live.page.waitForFunction(()=>Boolean(window.google_tag_manager));await tagged(live);assert.equal((await events(live.page,'generate_lead')).length,0);assert.equal((await events(live.page,'conversion')).length,0);await live.page.screenshot({path:out+'/home-tagged.png'});results.push({case:'Real Google library',passed:true,loaderStatus:200,destinations:[ga,ads],applicationLoaderCount:1,googleInjectedAdsDependency:true,realMeasurementBeacons:'blocked',resources:live.responses});await live.close();
 }
 for(const campaign of campaigns){
  if(results.some(r=>r.case==='Accepted inquiry'&&r.campaign===campaign&&r.adsDestination===expected[campaign]))continue;
  const s=await surface({width:campaign==='custom-homes'?1440:390}),p=s.page;
  await p.goto(production+'/build-your-home/'+campaign+'?utm_source=qa-google&gclid=TEST_ONLY_CLICK&email=PRIVATE_CANARY%40example.test&project=PRIVATE_CANARY');await allow(s);await tagged(s);
  assert.equal((await events(p,'generate_lead')).length,0);assert.equal((await events(p,'conversion')).length,0);
  const form=p.getByRole('form',{name:campaign==='custom-homes'?'Custom home inquiry':'Free preliminary property review'});await p.screenshot({path:out+'/'+campaign+'-tagged.png'});
  const step=form.getByRole('button',{name:campaign==='custom-homes'?'Continue':'Check My Property',exact:true});await step.click();assert.equal(s.posts.length,0);
  await form.getByLabel('City or municipality').fill('Victoria');if(campaign!=='custom-homes'){await form.getByLabel('Property address').fill('PRIVATE_FORM_CANARY — browser fixture only');await form.getByLabel('Type of home').selectOption('Laneway home')}
  await form.getByLabel('Do you own the property?').selectOption('Yes, I own the property');await form.getByLabel('Anticipated construction timeline').selectOption('6–12 months');await step.click();await form.getByLabel('Full name').fill('PRIVATE_FORM_CANARY');assert.equal((await events(p,'generate_lead')).length,0);assert.equal((await events(p,'conversion')).length,0,'a property check is not a lead');
  await form.getByLabel('Email address').fill('PRIVATE_FORM_CANARY@example.test');const submit=form.getByRole('button',{name:'Request a Conversation',exact:true});await submit.click();await form.getByRole('alert').filter({hasText:'Synthetic delivery unavailable'}).waitFor();assert.equal((await events(p,'generate_lead')).length,0);assert.equal((await events(p,'conversion')).length,0);
  s.controls.fail=false;await submit.click();await p.waitForURL('**/build-your-home/thank-you');await p.waitForFunction(()=>Array.from(window.dataLayer??[]).some(c=>c[0]==='event'&&c[1]==='generate_lead'));
  const leads=await events(p,'generate_lead');assert.equal(leads.length,1);assert.equal(leads[0][2].lead_source,campaign);assert.equal(leads[0][2].form_name,'focused_project_inquiry');assert.equal(leads[0][2].send_to,ga);
  const conversions=await events(p,'conversion');if(expected[campaign]){assert.equal(conversions.length,1);assert.deepEqual(conversions[0][2],{send_to:expected[campaign],transaction_id:leads[0][2].transaction_id})}else assert.equal(conversions.length,0,'no unknown or fabricated Ads labels');
  const serialized=JSON.stringify((await commands(p)).filter(c=>c[0]==='event'));assert.ok(!serialized.includes('PRIVATE_CANARY'));assert.ok(!serialized.includes('PRIVATE_FORM_CANARY'));assert.ok(!serialized.includes('TEST_ONLY_CLICK'));
  await p.evaluate(()=>window.dispatchEvent(new Event('house-delivery:campaign-lead-ready')));assert.equal((await events(p,'generate_lead')).length,1);await p.getByRole('link',{name:'Return to your project page'}).click();await p.waitForURL(url=>url.pathname==='/build-your-home/'+campaign,{waitUntil:'domcontentloaded'});await tagged(s);assert.equal((await events(p,'generate_lead')).length,1);await p.reload();await p.waitForFunction(()=>Array.from(window.dataLayer??[]).some(c=>c[0]==='config'&&c[1]==='AW-18548497593'));assert.equal((await events(p,'generate_lead')).length,0);assert.equal((await events(p,'conversion')).length,0);
  assert.deepEqual(s.errors,[]);results.push({case:'Accepted inquiry',campaign,passed:true,pageAndPropertyViewsAreNotLeads:true,failedSubmissionIsNotLead:true,ga4EventsBeforeReload:1,adsEventsBeforeReload:conversions.length,adsDestinationConfigured:Boolean(expected[campaign]),adsDestination:conversions[0]?.[2]?.send_to??null,repeatAndReloadDeduplicated:true,privateFormAndQueryDataExcluded:true,realEmails:0});await s.close();
 }
 for(const privacy of ['essential','gpc','dnt']){if(results.some(r=>r.case==='Privacy control'&&r.privacy===privacy))continue;const s=await surface({privacy:privacy==='essential'?undefined:privacy});await s.page.goto(production+'/homes/langley');if(privacy==='essential')await s.page.getByRole('button',{name:'Essential only',exact:true}).click();else await s.page.waitForFunction(()=>document.querySelector('main'));await s.page.waitForTimeout(500);assert.deepEqual(s.requests,[]);assert.equal(await s.page.locator('script[id="house-delivery-ga"]').count(),0);results.push({case:'Privacy control',privacy,passed:true});await s.close()}
 if(!results.some(r=>r.case==='Direct thank-you visit')){const direct=await surface();await direct.page.goto(production+'/build-your-home/thank-you');await allow(direct);await tagged(direct);assert.equal((await events(direct.page,'generate_lead')).length,0);assert.equal((await events(direct.page,'conversion')).length,0);results.push({case:'Direct thank-you visit',passed:true,leadEvents:0});await direct.close();}
 console.log(JSON.stringify({passed:true,results,actualAdvertisingConversionsSent:0,actualInquiryEmailsSent:0},null,2));
}catch(e){results.push({passed:false,error:safeError(e),url:activePage?.url()});console.error(safeError(e));process.exitCode=1}finally{await writeFile(out+'/results.json',JSON.stringify({results},null,2));await browser.close()}
