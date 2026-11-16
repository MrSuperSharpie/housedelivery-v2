/** One bounded answer-accuracy Preview review with ten actual customer turns. No real leads or retries. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
const base=process.env.CONCIERGE_ANSWER_ACCURACY_QA_URL;
assert.ok(base&&/^https:\/\/housedelivery-v2-[a-z0-9]+-edavis-animalmarkets-projects\.vercel\.app$/.test(base),'Feature Preview only');
const out=process.env.CONCIERGE_ANSWER_ACCURACY_QA_OUTPUT??'/private/tmp/hd-concierge-answer-accuracy-20261116/preview-review';await mkdir(out,{recursive:true});
const access=(await readFile(process.env.CONCIERGE_ANSWER_ACCURACY_QA_BYPASS_FILE,'utf8')).trim(),secret=(await readFile(process.env.CONCIERGE_ANSWER_ACCURACY_QA_EVALUATION_FILE,'utf8')).trim();
const safe=e=>[access,secret].reduce((s,k)=>s.replaceAll(k,'[REDACTED]'),String(e)).split('\n')[0];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),turns=[],checks=[],errors=[];
let fault='none',last=0,publicReply,journey='answer-accuracy';
const evalHeader=()=>{const p=Buffer.from(JSON.stringify({run:'answer-accuracy-20261116',caseId:journey,expires:Date.now()+3600_000,fault})).toString('base64url');return p+'.'+createHmac('sha256',secret).update('hd-evaluation:'+p).digest('hex')};
async function surface(width=1440,height=950,reply){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(safe(e)));
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==base)return u.hostname==='img1.wsimg.com'?route.continue():route.abort();if(req.method()==='POST'&&u.pathname.startsWith('/api/')&&u.pathname!=='/api/concierge')return route.abort();if(reply&&u.pathname==='/api/concierge')return route.fulfill({json:req.method()==='GET'?{available:true,token:'public-reply-ui-fixture',sessionState:'ui-only'}:{reply,sessionState:'ui-only'}});return route.continue({headers:{...req.headers(),'x-vercel-protection-bypass':access,...(u.pathname==='/api/concierge'?{'x-hd-concierge-evaluation':evalHeader()}:{})}})});
 await page.goto(base,{waitUntil:'domcontentloaded'});const consent=page.getByRole('button',{name:'Essential only',exact:true});if(await consent.isVisible())await consent.click();await page.getByRole('button',{name:'Housing Concierge',exact:true}).click();await page.getByRole('button',{name:/^Ask Anything/}).click();return{context,page,close:async()=>{await context.unrouteAll({behavior:'ignoreErrors'});await context.close()}};
}
async function send(s,question,{injected=false}={}){
 assert.ok(turns.length<10,'Bounded at ten live turns');if(last){const pause=30000-(Date.now()-last);if(pause>0)await new Promise(r=>setTimeout(r,pause))}last=Date.now();fault=injected?'invalid':'none';
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
 const questions=[
  'We like Mayne House for our family, with three or four bedrooms and about 3000 square feet of home area. We have a 4000 square foot lot in Vancouver.',
  'From the day I choose a floor plan, how long does it actually take to move in?',
  'Are cabinetry, plumbing fixtures and appliances included with this home’s Premium package?',
  'Who handles the foundations and assembly if we have not selected a contractor?',
  'Do you provide stamped permit drawings, including architectural plans and structural engineering?',
  'What are the published Premium and Signature package rates for Mayne, and is that a completed-home budget?',
  "Can I modify one of your existing floor plans or bring my architect's drawings?",
  'We want larger windows and 10-foot ceilings.',
  'What is the smallest and largest footprint you can manufacture?',
  'For a coastal steel home, how are thermal bridging, corrosion and moisture addressed, and is code compliance guaranteed?'
 ];
 const s=await surface();
 for(const [i,q]of questions.entries()){
  const t=await send(s,q),body=t.reply.answerSegments.map(a=>a.text).join(' ');
  const problems=[];
  if(/couldn’t put together|couldn’t reliably answer|don’t have a confirmed answer|remaining part of your question|AI connection|automated assistant couldn’t/.test(body))problems.push('Incomplete or unavailable answer');
  if(t.evaluation?.coverage?.missing?.length)problems.push('Missing request coverage');
  if(i===0){if(!t.renderedCards)problems.push('Missing initial model card');else{publicReply=t.reply;await cards(s,'initial-mayne-cards');}}
  if(i===1){if(!/timing|schedule|production|days|occupancy|move.in/i.test(body))problems.push('Missing scheduling answer');if(/flooring|glazing|Design Studio/i.test(body))problems.push('Irrelevant finish answer');if(!/40.{0,3}45/.test(body)||!/approved drawings|payment/i.test(body))problems.push('Factory phase or trigger omitted');}
  if(i===2)for(const subject of [/cabinet/i,/plumbing|fixtures|bathroom/i,/appliance/i])if(!subject.test(body))problems.push('Unanswered component '+subject);
  if(i===3){if(!/coordinat/i.test(body)||!/scope|agreement|confirm/i.test(body))problems.push('Construction coordination/scope omitted');if(t.values.builder?.value!==false)problems.push('Builder relationship lost');}
  if(i===4){if(!/architect/i.test(body)||!/structural|engineering/i.test(body)||!/professional|local|jurisdiction/i.test(body))problems.push('Incomplete permit document distinction');if(/factory|confidential/i.test(body))problems.push('Unrelated factory confidentiality');}
  if(i===5){if(!/Premium: CAD \$250/.test(body)||!/Signature: CAD \$300/.test(body))problems.push('Missing controlled published rates');if(!/not.*completed|not.*turnkey/i.test(body))problems.push('Missing construction budget distinction');if(/only.*Salt Spring|published for Salt Spring/i.test(body))problems.push('Stale Salt Spring restriction');}
  if(i===6){if(!/floor.plan|layout|existing plan/i.test(body)||!/architect|drawings/i.test(body))problems.push('Customization part omitted');}
  if(i===7){if(!/window/i.test(body)||!/ceiling/i.test(body)||!/review|confirm|engineer/i.test(body))problems.push('Dimensional request not addressed');if(!/10.foot|10 foot/.test(t.values.designRequests?.value??''))problems.push('Design intent lost');}
  if(i===8){if(!/minimum|maximum|smallest|largest|limits|range/i.test(body)||!/confirm|review|not.*(?:verified|available|established)|don’t have/i.test(body))problems.push('Manufacturing limits not qualified');}
  if(i===9){for(const subject of [/thermal|insulation/i,/corrosion|coating|salt/i,/moisture|condensation/i,/code|compliance/i])if(!subject.test(body))problems.push('Technical part omitted '+subject);}
  if(i>0&&t.renderedCards)problems.push('Repeated recommendation cards on non-discovery question');
  if(t.values.selectedModel?.value!=='home-mayne')problems.push('Selected Mayne lost');
  if(t.values.siteArea?.value?.value!==4000||t.values.areaTarget?.value?.value!==3000)problems.push('Lot/home area distinction lost');
  checks.push({turn:i+1,problems,coverage:t.evaluation?.coverage,cards:t.renderedCards});
  await s.page.screenshot({path:out+'/actual-turn-'+(i+1)+'.png'});
 }
 await s.close();
 if(publicReply)for(const [label,width,height]of [['desktop',1440,950],['mobile',390,844]]){const x=await surface(width,height,publicReply);await x.page.getByLabel('Your housing question').fill('Captured real reply: UI-only replay.');await x.page.getByRole('button',{name:'Send question',exact:true}).click();await x.page.locator('[data-concierge-model]').first().waitFor();await cards(x,label+'-cards');await x.close();}
 assert.deepEqual(errors,[]);const failures=checks.filter(c=>c.problems?.length);console.log(JSON.stringify({passed:failures.length===0,liveTurns:turns.length,checks,realInquiryPosts:0},null,2));if(failures.length)process.exitCode=1;
}catch(e){checks.push({passed:false,error:safe(e)});console.error(safe(e));process.exitCode=1}
finally{await writeFile(out+'/results.json',JSON.stringify({checks,errors,liveTurns:turns.length,modelCalls:turns.reduce((n,t)=>n+(t.evaluation?.modelCalls??0),0),realInquiryPosts:0},null,2));await browser.close()}
