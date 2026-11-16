/** One bounded Preview review: the five requested messages and a two-turn
 * rancher/design-review variation. No real leads or retries. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
const base=process.env.CONCIERGE_DESIGN_DISCOVERY_QA_URL;
assert.ok(base&&/^https:\/\/housedelivery-v2-[a-z0-9]+-edavis-animalmarkets-projects\.vercel\.app$/.test(base),'Feature Preview only');
const out=process.env.CONCIERGE_DESIGN_DISCOVERY_QA_OUTPUT??'/private/tmp/hd-concierge-design-discovery-20261116/preview-review';await mkdir(out,{recursive:true});
const access=(await readFile(process.env.CONCIERGE_DESIGN_DISCOVERY_QA_BYPASS_FILE,'utf8')).trim(),secret=(await readFile(process.env.CONCIERGE_DESIGN_DISCOVERY_QA_EVALUATION_FILE,'utf8')).trim();
const safe=e=>[access,secret].reduce((s,k)=>s.replaceAll(k,'[REDACTED]'),String(e)).split('\n')[0];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),turns=[],checks=[],errors=[];
let fault='none',last=0,publicReply,journey='exact-discovery';
const evalHeader=()=>{const p=Buffer.from(JSON.stringify({run:'design-discovery-20261116',caseId:journey,expires:Date.now()+3600_000,fault})).toString('base64url');return p+'.'+createHmac('sha256',secret).update('hd-evaluation:'+p).digest('hex')};
async function surface(width=1440,height=950,reply){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(safe(e)));
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==base)return u.hostname==='img1.wsimg.com'?route.continue():route.abort();if(req.method()==='POST'&&u.pathname.startsWith('/api/')&&u.pathname!=='/api/concierge')return route.abort();if(reply&&u.pathname==='/api/concierge')return route.fulfill({json:req.method()==='GET'?{available:true,token:'public-reply-ui-fixture',sessionState:'ui-only'}:{reply,sessionState:'ui-only'}});return route.continue({headers:{...req.headers(),'x-vercel-protection-bypass':access,...(u.pathname==='/api/concierge'?{'x-hd-concierge-evaluation':evalHeader()}:{})}})});
 await page.goto(base,{waitUntil:'domcontentloaded'});const consent=page.getByRole('button',{name:'Essential only',exact:true});if(await consent.isVisible())await consent.click();await page.getByRole('button',{name:'Housing Concierge',exact:true}).click();await page.getByRole('button',{name:/^Ask Anything/}).click();return{context,page,close:async()=>{await context.unrouteAll({behavior:'ignoreErrors'});await context.close()}};
}
async function send(s,question,{injected=false}={}){
 assert.ok(turns.length<7,'Bounded at seven live turns');if(last){const pause=30000-(Date.now()-last);if(pause>0)await new Promise(r=>setTimeout(r,pause))}last=Date.now();fault=injected?'invalid':'none';
 const response=s.page.waitForResponse(r=>r.url()===base+'/api/concierge'&&r.request().method()==='POST',{timeout:55000});await s.page.getByLabel('Your housing question').fill(question);await s.page.getByRole('button',{name:'Send question',exact:true}).click();const r=await response,d=await r.json();assert.equal(r.status(),200);assert.ok(d.reply);await s.page.getByRole('status').filter({hasText:'Thinking through your question…'}).waitFor({state:'hidden'});
 const state=JSON.parse(Buffer.from(d.sessionState.split('.')[0],'base64url'));
 const t={journey,question,reply:d.reply,mode:d.responseMode,values:state.values,recommended:state.recommended,previousModels:state.previousModels??[],evaluation:d._evaluation,injectedContractFault:injected,renderedCards:await s.page.locator('[data-concierge-answer]').last().locator('[data-concierge-model]').count()};turns.push(t);await writeFile(out+'/turns.json',JSON.stringify(turns,null,2));
 if(injected){assert.ok(d._evaluation.failures.every(f=>f.category==='output_validation'));assert.equal(d._evaluation.completedModelCalls,0);assert.equal(d.responseMode,'reviewed_fallback');assert.doesNotMatch(JSON.stringify(d.reply),/PRIVATE_OUTPUT_CANARY|connection is busy/)}else assert.deepEqual(d._evaluation.failures,[],'Actual service/contract failure; stop without retry');
 return t;
}
async function cards(s,label){
 const answer=s.page.locator('[data-concierge-answer]').last(),rendered=answer.locator('[data-concierge-model]');assert.ok(await rendered.count()>=1);
 for(const card of await rendered.all()){await card.scrollIntoViewIfNeeded();const photo=card.locator('img');if(await photo.count()){await photo.evaluate(img=>img.decode());assert.ok(await photo.evaluate(img=>img.naturalWidth>0))}const title=card.locator('h4');assert.ok(await title.textContent());assert.ok(await card.getByRole('link',{name:'View home',exact:true}).count());assert.ok(await card.getByRole('link',{name:'Floor plans',exact:true}).count());assert.match(await card.textContent(),/bedrooms[\s\S]*sq\. ft\./);assert.ok(await card.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('[role=log]').getBoundingClientRect();return a.width>0&&a.height>100&&a.left>=b.left&&a.right<=b.right&&el.scrollWidth<=el.clientWidth+1}));}
 await rendered.first().scrollIntoViewIfNeeded();await s.page.screenshot({path:out+'/'+label+'.png'});await rendered.first().getByRole('link',{name:'Floor plans',exact:true}).focus();assert.ok(await rendered.first().getByRole('link',{name:'Floor plans',exact:true}).evaluate(el=>el===document.activeElement));assert.equal(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks.push({case:label,cards:await rendered.count(),imagesLoaded:true,linksAndKeyboard:true,noOverflow:true});
}
try{
 const exact=['I want a 3 or 4 bedroom home.','But what if I wanted to pick different floors and windows, etc?','I think I am looking for a single level home because my mother has a hard time with stairs.','Yes, please show me single-level options.','Do you have other designs beyond what is on the website?'];
 const s=await surface();
 for(let i=0;i<exact.length;i++){
  const t=await send(s,exact[i]),body=t.reply.answerSegments.map(a=>a.text).join(' ');
  assert.deepEqual(t.values.bedroomOptions.value,[3,4]);assert.doesNotMatch(body,/couldn’t put together|couldn’t reliably answer|don’t have a confirmed answer|remaining part of your question|AI connection|automated assistant couldn’t/);
  if(i===0){assert.ok(t.renderedCards>=2);await cards(s,'initial-published-models');publicReply=t.reply;}
  if(i===1){assert.equal(t.renderedCards,0);assert.match(body,/floor|finish/i);assert.match(body,/window/i);assert.match(body,/review/i);assert.doesNotMatch(body,/freely (?:resize|move)|guaranteed|automatically included/i);}
  if(i>=2){assert.equal(t.values.storeys.value,1);assert.equal(t.values.accessibility,undefined);assert.match(t.values.householdNeeds.value,/mother.*stairs/i);assert.equal(t.renderedCards,0);assert.deepEqual(t.recommended,[]);assert.ok(t.previousModels?.length>=2);assert.doesNotMatch(t.reply.question,/^(?:would you like|do you want|shall I|can I (?:show|help|explore))/i);assert.doesNotMatch(body,/wheelchair|diagnos|certified accessible|guaranteed accessible|searched (?:the |our )?(?:hundreds|unpublished)/i);}
  if(i===3||i===4){assert.match(body,/wider|broader|additional|hundreds|library|design review/i);}
  if(i===4){assert.match(body,/hundreds/i);assert.match(body,/additional|other|beyond|wider|broader/i);}
  await s.page.screenshot({path:out+'/exact-turn-'+(i+1)+'.png'});
 }
 checks.push({case:'exact-five-message-journey',contextRetained:true,initialCards:turns[0].renderedCards,afterRejectionCards:turns.slice(2).map(t=>t.renderedCards)});await s.close();
 journey='rancher-variation';const v=await surface();
 for(const q of ['We want a 3 or 4 bedroom rancher.','Yes, let’s arrange a personal design review. What do you need from me?']){
  const t=await send(v,q),body=t.reply.answerSegments.map(a=>a.text).join(' ');assert.deepEqual(t.values.bedroomOptions.value,[3,4]);assert.equal(t.values.storeys.value,1);assert.equal(t.renderedCards,0);assert.deepEqual(t.recommended,[]);assert.doesNotMatch(body,/couldn’t put together|couldn’t reliably answer|don’t have a confirmed answer|AI connection|remaining part/);assert.doesNotMatch(t.reply.question,/^(?:would you like|do you want|shall I)/i);
 }
 checks.push({case:'rancher-and-accepted-review',contextRetained:true,noUnsuitableCards:true});await v.close();
 for(const [label,width,height]of [['desktop',1440,950],['mobile',390,844]]){const x=await surface(width,height,publicReply);await x.page.getByLabel('Your housing question').fill('Captured published cards: UI-only replay.');await x.page.getByRole('button',{name:'Send question',exact:true}).click();await x.page.locator('[data-concierge-model]').first().waitFor();await cards(x,label+'-published-cards');await x.close();}
 const reviewReply=turns[4].reply,x=await surface(390,844,reviewReply);await x.page.getByLabel('Your housing question').fill('Captured review reply: UI-only replay.');await x.page.getByRole('button',{name:'Send question',exact:true}).click();await x.page.locator('[data-concierge-answer]').last().waitFor();assert.equal(await x.page.locator('[data-concierge-model]').count(),0);assert.equal(await x.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await x.page.screenshot({path:out+'/mobile-personal-review.png'});
 await x.page.getByRole('button',{name:'Talk with our team',exact:true}).click();const form=x.page.locator('#housing-concierge-panel form');await form.locator('[name=fullName]').waitFor();assert.equal(await form.locator('fieldset > div').first().locator('input,select,textarea').count(),5);assert.equal(await form.locator('[name=consent]').isChecked(),false);checks.push({case:'mobile-review-and-five-field-inquiry',noCards:true,noOverflow:true,consentUnchecked:true,realInquiryPosts:0});await x.close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,liveTurns:turns.length,checks,realInquiryPosts:0},null,2));
}catch(e){checks.push({passed:false,error:safe(e)});console.error(safe(e));process.exitCode=1}
finally{await writeFile(out+'/results.json',JSON.stringify({checks,errors,liveTurns:turns.length,modelCalls:turns.reduce((n,t)=>n+(t.evaluation?.modelCalls??0),0),realInquiryPosts:0},null,2));await browser.close()}
