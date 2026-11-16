/** Ten actual-model browser turns: exact four-message journey and two
 * three-message family/selected-home/property variations. No retries or leads. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
const base=process.env.CONCIERGE_CURRENT_QUESTION_QA_URL;
assert.ok(base&&/^https:\/\/housedelivery-v2-[a-z0-9]+-edavis-animalmarkets-projects\.vercel\.app$/.test(base),'Feature Preview only');
const out=process.env.CONCIERGE_CURRENT_QUESTION_QA_OUTPUT??'/private/tmp/hd-concierge-current-question-20261116/preview-review';await mkdir(out,{recursive:true});
const access=(await readFile(process.env.CONCIERGE_CURRENT_QUESTION_QA_BYPASS_FILE,'utf8')).trim(),secret=(await readFile(process.env.CONCIERGE_CURRENT_QUESTION_QA_EVALUATION_FILE,'utf8')).trim();
const safe=e=>[access,secret].reduce((s,k)=>s.replaceAll(k,'[REDACTED]'),String(e)).split('\n')[0];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),turns=[],checks=[],errors=[];
let fault='none',last=0,publicReply,journey='exact';
const evalHeader=()=>{const p=Buffer.from(JSON.stringify({run:'current-question-20261116',caseId:journey,expires:Date.now()+3600_000,fault})).toString('base64url');return p+'.'+createHmac('sha256',secret).update('hd-evaluation:'+p).digest('hex')};
async function surface(width=1440,height=950,reply){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(safe(e)));
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==base)return u.hostname==='img1.wsimg.com'?route.continue():route.abort();if(req.method()==='POST'&&u.pathname.startsWith('/api/')&&u.pathname!=='/api/concierge')return route.abort();if(reply&&u.pathname==='/api/concierge')return route.fulfill({json:req.method()==='GET'?{available:true,token:'public-reply-ui-fixture',sessionState:'ui-only'}:{reply,sessionState:'ui-only'}});return route.continue({headers:{...req.headers(),'x-vercel-protection-bypass':access,...(u.pathname==='/api/concierge'?{'x-hd-concierge-evaluation':evalHeader()}:{})}})});
 await page.goto(base,{waitUntil:'domcontentloaded'});const consent=page.getByRole('button',{name:'Essential only',exact:true});if(await consent.isVisible())await consent.click();await page.getByRole('button',{name:'Housing Concierge',exact:true}).click();await page.getByRole('button',{name:/^Ask Anything/}).click();return{context,page,close:async()=>{await context.unrouteAll({behavior:'ignoreErrors'});await context.close()}};
}
async function send(s,question,{injected=false}={}){
 assert.ok(turns.length<10,'Bounded at ten live turns');if(last){const pause=30000-(Date.now()-last);if(pause>0)await new Promise(r=>setTimeout(r,pause))}last=Date.now();fault=injected?'invalid':'none';
 const response=s.page.waitForResponse(r=>r.url()===base+'/api/concierge'&&r.request().method()==='POST',{timeout:55000});await s.page.getByLabel('Your housing question').fill(question);await s.page.getByRole('button',{name:'Send question',exact:true}).click();const r=await response,d=await r.json();assert.equal(r.status(),200);assert.ok(d.reply);await s.page.getByRole('status').filter({hasText:'Thinking through your question…'}).waitFor({state:'hidden'});
 const state=JSON.parse(Buffer.from(d.sessionState.split('.')[0],'base64url'));
 const t={journey,question,reply:d.reply,mode:d.responseMode,values:state.values,recommended:state.recommended,evaluation:d._evaluation,injectedContractFault:injected,renderedCards:await s.page.locator('[data-concierge-answer]').last().locator('[data-concierge-model]').count()};turns.push(t);await writeFile(out+'/turns.json',JSON.stringify(turns,null,2));
 if(injected){assert.ok(d._evaluation.failures.every(f=>f.category==='output_validation'));assert.equal(d._evaluation.completedModelCalls,0);assert.equal(d.responseMode,'reviewed_fallback');assert.doesNotMatch(JSON.stringify(d.reply),/PRIVATE_OUTPUT_CANARY|connection is busy/)}else assert.deepEqual(d._evaluation.failures,[],'Actual service/contract failure; stop without retry');
 return t;
}
async function cards(s,label){
 const answer=s.page.locator('[data-concierge-answer]').last(),rendered=answer.locator('[data-concierge-model]');assert.ok(await rendered.count()>=1);
 for(const card of await rendered.all()){await card.scrollIntoViewIfNeeded();const photo=card.locator('img');if(await photo.count()){await photo.evaluate(img=>img.decode());assert.ok(await photo.evaluate(img=>img.naturalWidth>0))}const title=card.locator('h4');assert.ok(await title.textContent());assert.ok(await card.getByRole('link',{name:'View home',exact:true}).count());assert.ok(await card.getByRole('link',{name:'Floor plans',exact:true}).count());assert.match(await card.textContent(),/bedrooms[\s\S]*sq\. ft\./);assert.ok(await card.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('[role=log]').getBoundingClientRect();return a.width>0&&a.height>100&&a.left>=b.left&&a.right<=b.right&&el.scrollWidth<=el.clientWidth+1}));}
 await rendered.first().scrollIntoViewIfNeeded();await s.page.screenshot({path:out+'/'+label+'.png'});await rendered.first().getByRole('link',{name:'Floor plans',exact:true}).focus();assert.ok(await rendered.first().getByRole('link',{name:'Floor plans',exact:true}).evaluate(el=>el===document.activeElement));assert.equal(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks.push({case:label,cards:await rendered.count(),imagesLoaded:true,linksAndKeyboard:true,noOverflow:true});
}
try{
 const runs=[
  {id:'exact',model:'home-mayne',questions:["I'm exploring a home for myself or my family. Help me find a starting point.","Ideally it would be 3 or a 4 bedroom home maybe 3000 sq. ft.","I have a 4000 sq. ft. lot in Vancouver would this house work?","I have a 4000 sq. ft. lot how big of a home can I build?"]},
  {id:'aurora-family',model:'home-aurora',questions:["We're a couple with two kids and would like to explore the Aurora.","We like the Aurora. Can it fit on our 4800 sq. ft. property in Vancouver?","How much floor area would the zoning allow on that lot?"]},
  {id:'mayne-family',model:'home-mayne',questions:["A house for my partner and our children. We like Mayne House.","Our lot in Vancouver is 4000 square feet. Is that enough land for this design?","The lot area isn't the house size—what else do you need to check whether we can build it?"]}
 ];
 for(const run of runs){journey=run.id;const s=await surface();
  for(let i=0;i<run.questions.length;i++){
   const t=await send(s,run.questions[i]),body=t.reply.answerSegments.map(x=>x.text).join(' ');
   assert.doesNotMatch(body,/couldn’t put together|couldn’t reliably answer|don’t have a confirmed answer|remaining part of your question|AI connection|automated assistant couldn’t/);
   assert.equal(t.evaluation.fallbackReason,null,'Review actual validation rejection, not just API status');
   const selected=run.id==='exact'?i>=1:true,property=run.id==='exact'?i>=2:i>=1;
   if(selected)assert.equal(t.values.selectedModel.value,run.model);
   if(run.id==='exact'&&i>=1){assert.deepEqual(t.values.bedroomOptions.value,[3,4]);assert.equal(t.values.areaTarget.value.sqft,3000);}
   if(property){
    assert.equal(t.values.siteArea.value.sqft,run.id==='aurora-family'?4800:4000);assert.equal(t.values.location.value,'Vancouver');
    assert.equal(t.renderedCards,0,'No repeated recommendation cards for property questions');assert.doesNotMatch(body,/Laurentian|Boreal/);
    assert.equal(t.evaluation.retrieval.requestTopics.includes('matching'),false);assert.ok(t.evaluation.retrieval.requestTopics.includes('property'));
    assert.doesNotMatch(t.reply.question,/Which design would you like|What approximate home size|How many bedrooms|Would you like.*(?:browse|explore.*homes)/i);
    assert.match(body,/zoning|site|lot|property|dimension|footprint|floor area/i);
   }
   if(run.id==='exact'&&i===1){assert.equal(t.renderedCards,1);assert.equal(t.reply.modelCards[0].id,'home-mayne');assert.match(t.reply.modelCards[0].specs.join(' '),/3,116/);await cards(s,'exact-mayne-card');publicReply=t.reply;}
   if(run.id==='exact'&&i===2){assert.match(body,/Mayne/);assert.match(body,/3,116|3116/);assert.match(body,/footprint/);assert.match(body,/17\.81/);assert.match(body,/16\.42/);}
   if(i===run.questions.length-1){await s.page.screenshot({path:out+'/'+run.id+'-property-answer.png'});assert.ok(t.reply.nextAction==='property_review'||/property review|preliminary review|site review/i.test(body),'Offer the relevant property-review next step');}
  }
  checks.push({case:run.id,turns:run.questions.length,contextAndCurrentQuestion:true});await s.close();
 }
 for(const [label,width,height]of [['desktop',1440,950],['mobile',390,844]]){const x=await surface(width,height,publicReply);await x.page.getByLabel('Your housing question').fill('Captured model card: UI-only replay.');await x.page.getByRole('button',{name:'Send question',exact:true}).click();await x.page.locator('[data-concierge-model]').first().waitFor();await cards(x,label+'-mayne-card');await x.close();}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,liveTurns:turns.length,checks,realInquiryPosts:0},null,2));
}catch(e){checks.push({passed:false,error:safe(e)});console.error(safe(e));process.exitCode=1}
finally{await writeFile(out+'/results.json',JSON.stringify({checks,errors,liveTurns:turns.length,modelCalls:turns.reduce((n,t)=>n+(t.evaluation?.modelCalls??0),0),realInquiryPosts:0},null,2));await browser.close()}
