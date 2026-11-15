/** Browser-only inquiry regressions. Every chat/lead POST is mocked; no email or model call. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const base=process.env.INQUIRY_QA_BASE_URL??'http://127.0.0.1:3017';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname)||new URL(base).hostname.endsWith('.vercel.app'));
const output=process.env.INQUIRY_QA_OUTPUT??'/private/tmp/hd-concierge-inquiry-20261115/form-qa';await mkdir(output,{recursive:true});
const access=process.env.INQUIRY_QA_BYPASS_FILE?(await readFile(process.env.INQUIRY_QA_BYPASS_FILE,'utf8')).trim():'';
const fixture=JSON.parse(await readFile(new URL('./fixtures/concierge-visual-reply.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.INQUIRY_QA_CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),results=[],errors=[];
try{
 for(const [name,width,height]of [['desktop',1440,900],['mobile',390,844],['small-mobile',360,780]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),posts=[],chat=[];let failure=name==='desktop'?'unavailable':'',sequence=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__inquiryEvents=[];window.addEventListener('house-delivery:analytics',e=>{if(e.detail.event==='concierge_lead_submitted')window.__inquiryEvents.push(e.detail)})});
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());if(url.origin!==base)return route.continue();
   if(url.pathname==='/api/concierge'){
    if(req.method()==='GET')return route.fulfill({json:{available:true,token:'browser-chat-fixture',sessionState:'browser-state-fixture'}});
    chat.push(req.postDataJSON());return route.fulfill({json:{reply:{...fixture.reply,proposedSummary:'This chat summary must not be copied into the inquiry.'},sessionState:'browser-reply-fixture'}});
   }
   if(url.pathname==='/api/concierge/leads'){
    if(req.method()==='GET')return route.fulfill({json:{token:'browser-lead-fixture-'+(++sequence)}});
    posts.push(req.postDataJSON());await new Promise(resolve=>setTimeout(resolve,600));
    if(failure==='unavailable'){failure='unconfirmed';return route.fulfill({status:502,json:{error:'We couldn’t confirm delivery. Your details are still here; please try again.'}})}
    if(failure==='unconfirmed'){failure='';return route.fulfill({json:{accepted:false}})}
    return route.fulfill({json:{accepted:true,reference:'browser-only-reference-'+posts.length}});
   }
   if(req.method()==='POST'&&url.pathname.startsWith('/api/'))return route.abort();
   return route.continue({headers:{...req.headers(),...(access?{'x-vercel-protection-bypass':access}:{})}});
  });
  const panel=page.locator('#housing-concierge-panel');
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});const cookie=page.getByRole('button',{name:'Essential only',exact:true});await cookie.waitFor({timeout:2000}).catch(()=>{});if(await cookie.isVisible())await cookie.click();
  await page.addStyleTag({content:'nextjs-portal{display:none}'});
  if(process.env.INQUIRY_QA_TOOLBAR==='true')await page.evaluate(()=>{const s=document.createElement('script');s.type='application/json';s.src='https://vercel.live/_next-live/feedback/feedback.js';document.head.append(s)});
  await page.getByRole('button',{name:'Housing Concierge',exact:true}).click();await page.getByRole('button',{name:/^Ask Anything/}).click();await panel.getByLabel('Your housing question').fill(fixture.question);await page.getByRole('button',{name:'Send question',exact:true}).click();await page.locator('[data-concierge-answer]').waitFor();
  async function openForm(){await page.getByRole('button',{name:'Talk with our team',exact:true}).click();await page.waitForFunction(()=>Boolean(document.querySelector('#housing-concierge-panel form input[name=fullName]'))&&!document.querySelector('#housing-concierge-panel form fieldset').disabled)}
  const send=()=>page.getByRole('button',{name:'Request a Project Conversation',exact:true});
  const success=()=>page.getByText("Thank you. We've received your inquiry.",{exact:true});
  await openForm();const form=panel.locator('form');
  const shape=await form.evaluate(f=>({primary:f.querySelector('fieldset > div').querySelectorAll('input,select,textarea').length,required:[...f.querySelectorAll('[required]')].map(e=>e.name).sort(),open:f.querySelector('details').open,advanced:[...f.querySelector('details').querySelectorAll('input,select,textarea')].map(e=>({name:e.name,required:e.required}))}));
  assert.equal(shape.primary,5);assert.deepEqual(shape.required,['audience','consent','email','fullName']);assert.equal(shape.open,false);assert.equal(shape.advanced.length,6);assert.ok(shape.advanced.every(f=>!f.required));
  assert.equal(await panel.getByLabel('Tell us about your project',{exact:false}).inputValue(),'');assert.equal(await panel.getByRole('checkbox').isChecked(),false);
  assert.equal(await panel.getByLabel("I'm planning as...",{exact:true}).locator('option:not([disabled])').count(),6);
  await page.screenshot({path:output+'/'+name+'-initial.png'});
  await send().click();assert.equal(posts.length,0);
  await panel.getByLabel('Full name',{exact:true}).fill('Preview Test Visitor');await panel.getByLabel('Email address',{exact:true}).fill('invalid-email');await panel.getByLabel("I'm planning as...",{exact:true}).selectOption('Individual / family');await send().click();assert.equal(posts.length,0);
  await panel.getByLabel('Email address',{exact:true}).fill('visitor@example.test');await send().click();assert.equal(posts.length,0);await panel.getByRole('checkbox').check();
  if(name==='desktop'){
   for(let i=0;i<2;i++){await send().click();await form.getByRole('alert').waitFor();assert.equal(await success().count(),0);assert.equal(await panel.getByLabel('Full name',{exact:true}).inputValue(),'Preview Test Visitor');assert.equal(await panel.getByLabel('Email address',{exact:true}).inputValue(),'visitor@example.test');assert.equal(await page.evaluate(()=>window.__inquiryEvents.length),0)}
  }
  await send().click();await page.getByRole('button',{name:'Sending your inquiry…'}).waitFor();assert.equal(await success().count(),0);await success().waitFor();assert.equal(posts.at(-1).audience,'Individual / family');assert.equal(posts.at(-1).location,'');assert.equal(posts.at(-1).objective,'');assert.equal(posts.at(-1).housingType,'');await page.screenshot({path:output+'/'+name+'-minimal-confirmation.png'});
  assert.equal(await page.getByRole('link',{name:/Continue browsing House Delivery/}).getAttribute('href'),'/');await page.getByRole('button',{name:'Back to conversation'}).click();assert.equal(await page.locator('[data-concierge-answer]').count(),1);await openForm();
  await panel.getByLabel('Full name',{exact:true}).fill('Preview Development Test');await panel.getByLabel('Email address',{exact:true}).fill('development@example.test');await panel.getByLabel("I'm planning as...",{exact:true}).selectOption('Developer');await panel.getByLabel('Project location',{exact:false}).fill('Winnipeg, Manitoba');await panel.getByLabel('Tell us about your project',{exact:false}).fill('A phased 500+ home program.\nBrowser-only synthetic inquiry.');
  const disclosure=panel.locator('details summary');await disclosure.focus();await page.keyboard.press('Enter');assert.equal(await panel.locator('details').evaluate(e=>e.open),true);
  await panel.getByLabel('Organization name',{exact:true}).fill('Preview Housing Test');await panel.getByLabel('Housing type',{exact:true}).selectOption('Multi-home development');await panel.getByLabel('Approximate number of homes',{exact:true}).selectOption('500+');await panel.getByLabel('Land / site status',{exact:true}).selectOption('Site owned / controlled');await panel.getByLabel('Project timing',{exact:true}).selectOption('Phased program');await panel.getByLabel('Telephone number',{exact:true}).fill('+1 204 555 0100');await page.screenshot({path:output+'/'+name+'-advanced.png'});
  await disclosure.focus();await page.keyboard.press('Space');assert.equal(await panel.locator('details').evaluate(e=>e.open),false);assert.equal(await form.evaluate(f=>new FormData(f).get('homeCount')),'500+');
  if(width<640){
   await page.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,value:460});window.visualViewport.dispatchEvent(new Event('resize'))});await panel.getByLabel('Email address',{exact:true}).scrollIntoViewIfNeeded();const b=await panel.getByLabel('Email address',{exact:true}).boundingBox();assert.ok(b.y+b.height<=460);await page.screenshot({path:output+'/'+name+'-keyboard-geometry.png'});await page.evaluate(h=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,value:h});window.visualViewport.dispatchEvent(new Event('resize'))},height);
  }
  await panel.getByRole('checkbox').check();await send().scrollIntoViewIfNeeded();await page.screenshot({path:output+'/'+name+'-ready-to-submit.png'});await send().click();await success().waitFor();
  const lead=posts.at(-1);assert.equal(lead.consent,true);assert.equal(lead.homeCount,'500+');assert.equal(lead.timeline,'Phased program');assert.equal(lead.organization,'Preview Housing Test');assert.equal(lead.phone,'+1 204 555 0100');assert.equal(lead.location,'Winnipeg, Manitoba');assert.match(lead.objective,/phased 500\+/);for(const key of ['transcript','sessionState','proposedSummary'])assert.ok(!Object.hasOwn(lead,key));
  assert.equal(chat.length,1,'contact intake never calls chat inference');assert.deepEqual(await page.evaluate(()=>window.__inquiryEvents),[{event:'concierge_lead_submitted',source:'ai-concierge'},{event:'concierge_lead_submitted',source:'ai-concierge'}]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  results.push({viewport:name,width,height,passed:true,primaryFields:5,requiredFields:['fullName','email','audience','consent'],optionalFields:8,checks:'blank description; no chat extraction; six customer categories; optional details keyboard toggle and retention; minimal and 500+ development submissions; real-acceptance-only success; privacy; no contact details to AI; preserved safe conversion event',mockedSubmissions:posts.length});await context.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,results,realEmails:0,modelCalls:0},null,2));
}catch(e){results.push({passed:false,error:String(e)});console.error(e);process.exitCode=1}finally{await writeFile(output+'/results.json',JSON.stringify({results,errors},null,2));await browser.close()}
