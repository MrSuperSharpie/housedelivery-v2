/** One bounded feature-Preview review: three multi-turn journeys, actual
 * recommendations, responsive cards and inquiry handoff. No real leads/retries. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
const base=process.env.CONCIERGE_CONVERSATION_QA_URL;
assert.ok(base&&/^https:\/\/housedelivery-v2-[a-z0-9]+-edavis-animalmarkets-projects\.vercel\.app$/.test(base),'Feature Preview only');
const out=process.env.CONCIERGE_CONVERSATION_QA_OUTPUT??'/private/tmp/hd-concierge-conversation-root-20261116/preview-review';await mkdir(out,{recursive:true});
const access=(await readFile(process.env.CONCIERGE_CONVERSATION_QA_BYPASS_FILE,'utf8')).trim(),secret=(await readFile(process.env.CONCIERGE_CONVERSATION_QA_EVALUATION_FILE,'utf8')).trim();
const safe=e=>[access,secret].reduce((s,k)=>s.replaceAll(k,'[REDACTED]'),String(e)).split('\n')[0];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),turns=[],checks=[],errors=[];
let fault='none',last=0,publicReply,journey='family';
const evalHeader=()=>{const p=Buffer.from(JSON.stringify({run:'conversation-root-20261116',caseId:journey,expires:Date.now()+3600_000,fault})).toString('base64url');return p+'.'+createHmac('sha256',secret).update('hd-evaluation:'+p).digest('hex')};
async function surface(width=1440,height=950,reply){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(safe(e)));
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==base)return u.hostname==='img1.wsimg.com'?route.continue():route.abort();if(req.method()==='POST'&&u.pathname.startsWith('/api/')&&u.pathname!=='/api/concierge')return route.abort();if(reply&&u.pathname==='/api/concierge')return route.fulfill({json:req.method()==='GET'?{available:true,token:'public-reply-ui-fixture',sessionState:'ui-only'}:{reply,sessionState:'ui-only'}});return route.continue({headers:{...req.headers(),'x-vercel-protection-bypass':access,...(u.pathname==='/api/concierge'?{'x-hd-concierge-evaluation':evalHeader()}:{})}})});
 await page.goto(base,{waitUntil:'domcontentloaded'});const consent=page.getByRole('button',{name:'Essential only',exact:true});if(await consent.isVisible())await consent.click();await page.getByRole('button',{name:'Housing Concierge',exact:true}).click();await page.getByRole('button',{name:/^Ask Anything/}).click();return{context,page,close:async()=>{await context.unrouteAll({behavior:'ignoreErrors'});await context.close()}};
}
async function send(s,question,{injected=false}={}){
 assert.ok(turns.length<17,'Bounded at seventeen live turns');if(last){const pause=30000-(Date.now()-last);if(pause>0)await new Promise(r=>setTimeout(r,pause))}last=Date.now();fault=injected?'invalid':'none';
 const response=s.page.waitForResponse(r=>r.url()===base+'/api/concierge'&&r.request().method()==='POST',{timeout:55000});await s.page.getByLabel('Your housing question').fill(question);await s.page.getByRole('button',{name:'Send question',exact:true}).click();const r=await response,d=await r.json();assert.equal(r.status(),200);assert.ok(d.reply);await s.page.getByRole('status').filter({hasText:'Thinking through your question…'}).waitFor({state:'hidden'});
 const state=JSON.parse(Buffer.from(d.sessionState.split('.')[0],'base64url'));
 const t={journey,question,reply:d.reply,mode:d.responseMode,values:state.values,recommended:state.recommended,evaluation:d._evaluation,injectedContractFault:injected,renderedCards:await s.page.locator('[data-concierge-answer]').last().locator('[data-concierge-model]').count()};turns.push(t);await writeFile(out+'/turns.json',JSON.stringify(turns,null,2));
 if(injected){assert.ok(d._evaluation.failures.every(f=>f.category==='output_validation'));assert.equal(d._evaluation.completedModelCalls,0);assert.equal(d.responseMode,'reviewed_fallback');assert.doesNotMatch(JSON.stringify(d.reply),/PRIVATE_OUTPUT_CANARY|connection is busy/)}else assert.deepEqual(d._evaluation.failures,[],'Actual service/contract failure; stop without retry');
 return t;
}
async function cards(s,label){
 const answer=s.page.locator('[data-concierge-answer]').last(),rendered=answer.locator('[data-concierge-model]');assert.ok(await rendered.count()>=2);
 for(const card of await rendered.all()){await card.scrollIntoViewIfNeeded();const photo=card.locator('img');if(await photo.count()){await photo.evaluate(img=>img.decode());assert.ok(await photo.evaluate(img=>img.naturalWidth>0))}const title=card.locator('h4');assert.ok(await title.textContent());assert.ok(await card.getByRole('link',{name:'View home',exact:true}).count());assert.ok(await card.getByRole('link',{name:'Floor plans',exact:true}).count());assert.match(await card.textContent(),/bedrooms[\s\S]*sq\. ft\./);assert.ok(await card.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('[role=log]').getBoundingClientRect();return a.width>0&&a.height>100&&a.left>=b.left&&a.right<=b.right&&el.scrollWidth<=el.clientWidth+1}));}
 await rendered.first().scrollIntoViewIfNeeded();await s.page.screenshot({path:out+'/'+label+'.png'});await rendered.first().getByRole('link',{name:'Floor plans',exact:true}).focus();assert.ok(await rendered.first().getByRole('link',{name:'Floor plans',exact:true}).evaluate(el=>el===document.activeElement));assert.equal(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks.push({case:label,cards:await rendered.count(),imagesLoaded:true,linksAndKeyboard:true,noOverflow:true});
}
try{
 const journeys=[
  {id:'family',questions:["I'm exploring a home for myself or my family.","A house for my wife and 2 kids.","I have a 4000 square foot lot in East Vancouver.","4 or 5 bedrooms.","Show me the floor plans for those homes.","Summarize our project without sending anything."]},
  {id:'family-variation',questions:["My partner and I are planning a home for ourselves and our two children.","Our property is a 4800 square foot lot in Vancouver. Three or four bedrooms would work.","What are your published Premium and Signature package rates, and are those delivered turnkey prices for these homes?","Can you guarantee the permit will be approved in six weeks?","I would like a project inquiry. What happens next?"]},
  {id:'community',questions:["Our First Nation is planning six homes for families and Elders in British Columbia.","We need four bedrooms per home, and our contractor will handle construction.","Can those designs be customized for multigenerational households?","Please summarize the requirements we have discussed. Do not send them yet."]}
 ];
 for(const run of journeys){
  journey=run.id;const s=await surface();let familySnapshot;
  for(let i=0;i<run.questions.length;i++){
   const t=await send(s,run.questions[i]),body=t.reply.answerSegments.map(x=>x.text).join(' ');
   assert.doesNotMatch(body,/don’t have a confirmed answer|couldn’t put together|couldn’t reliably answer|remaining part|AI connection|automated assistant couldn’t/,'Customer-facing failure; stop without patch/retry');
   assert.equal(t.evaluation.fallbackReason,null,'Investigate actual validation failure rather than count a successful API call');
   if(run.id==='family'){
    if(i===1){familySnapshot=t.values.householdNeeds.value;assert.match(familySnapshot,/wife and 2 kids/);assert.equal(t.values.bedrooms,undefined);assert.ok(t.renderedCards>=2);}
    if(i>=2){assert.equal(t.values.siteArea.value.sqft,4000);assert.equal(t.values.location.value,'East Vancouver');assert.equal(t.values.areaTarget,undefined);assert.ok(t.values.householdNeeds.value.includes(familySnapshot));}
    if(i>=3){assert.deepEqual(t.values.bedroomOptions.value,[4,5]);}
    if(i===3||i===4){assert.ok(t.renderedCards>=2);await cards(s,run.id+'-'+i);publicReply=t.reply;}
   }
   if(run.id==='family-variation'){
    assert.match(t.values.householdNeeds.value,/partner|two children/);
    if(i>=1){assert.equal(t.values.siteArea.value.sqft,4800);assert.equal(t.values.location.value,'Vancouver');assert.equal(t.values.areaTarget,undefined);assert.deepEqual(t.values.bedroomOptions.value,[3,4]);}
    if(i===1){assert.ok(t.renderedCards>=2);await cards(s,'variation-cards');}
    if(i===2){assert.match(body,/250/);assert.match(body,/300/);assert.match(body,/not.*(?:completed|turnkey)|not.*completed/s);assert.match(body,/quotation|quote/);}
    if(i===3)assert.doesNotMatch(body,/we guarantee|will be approved|guaranteed approval/);
   }
   if(run.id==='community'){
    assert.equal(t.values.homes.value,6);assert.match(t.values.audience.value,/Nation|Indigenous/);
    if(i>=1){assert.equal(t.values.builder.value,true);assert.doesNotMatch(t.values.role?.value??'',/contractor|builder/);assert.deepEqual(t.values.bedroomOptions.value,[4]);}
   }
   assert.equal(t.evaluation.leadSideEffects,0);if(i===run.questions.length-1)await s.page.screenshot({path:out+'/'+run.id+'-final.png'});
  }
  if(run.id==='family-variation'){
   await s.page.getByRole('button',{name:'Talk with our team',exact:true}).click();
   const form=s.page.locator('#housing-concierge-panel form');await form.locator('input[name=fullName]').waitFor();
   assert.equal(await form.locator('fieldset > div').first().locator('input,select,textarea').count(),5);
   assert.equal(await form.locator('[name=consent]').isChecked(),false);checks.push({case:'five-field-inquiry-handoff',consentUnchecked:true,realInquiryPosts:0});
  }
  checks.push({case:run.id,turns:run.questions.length,contextRetained:true});await s.close();
 }
 for(const [label,width,height]of [['desktop',1440,950],['mobile',390,844]]){const x=await surface(width,height,publicReply);await x.page.getByLabel('Your housing question').fill('Captured recommendations: UI-only replay.');await x.page.getByRole('button',{name:'Send question',exact:true}).click();await x.page.locator('[data-concierge-model]').first().waitFor();await cards(x,label+'-cards');await x.close();}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,liveTurns:turns.length,checks,realInquiryPosts:0},null,2));
}catch(e){checks.push({passed:false,error:safe(e)});console.error(safe(e));process.exitCode=1}
finally{await writeFile(out+'/results.json',JSON.stringify({checks,errors,liveTurns:turns.length,modelCalls:turns.reduce((n,t)=>n+(t.evaluation?.modelCalls??0),0),realInquiryPosts:0},null,2));await browser.close()}
