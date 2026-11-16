/** One bounded feature-Preview verification: exact conversation + four wording
 * variants + one authenticated recoverable contract fault. No leads/retries. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
const base=process.env.CONCIERGE_CARD_QA_URL;
assert.ok(base&&/^https:\/\/housedelivery-v2-[a-z0-9]+-edavis-animalmarkets-projects\.vercel\.app$/.test(base),'Feature Preview only');
const out=process.env.CONCIERGE_CARD_QA_OUTPUT??'/private/tmp/hd-concierge-card-repair-20261115/preview-review';await mkdir(out,{recursive:true});
const access=(await readFile(process.env.CONCIERGE_CARD_QA_BYPASS_FILE,'utf8')).trim(),secret=(await readFile(process.env.CONCIERGE_CARD_QA_EVALUATION_FILE,'utf8')).trim();
const safe=e=>[access,secret].reduce((s,k)=>s.replaceAll(k,'[REDACTED]'),String(e)).split('\n')[0];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),turns=[],checks=[],errors=[];
let fault='none',last=0,publicReply;
const evalHeader=()=>{const p=Buffer.from(JSON.stringify({run:'card-repair-20261115',caseId:'exact-and-variants',expires:Date.now()+3600_000,fault})).toString('base64url');return p+'.'+createHmac('sha256',secret).update('hd-evaluation:'+p).digest('hex')};
async function surface(width=1440,height=950,reply){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(safe(e)));
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==base)return u.hostname==='img1.wsimg.com'?route.continue():route.abort();if(req.method()==='POST'&&u.pathname.startsWith('/api/')&&u.pathname!=='/api/concierge')return route.abort();if(reply&&u.pathname==='/api/concierge')return route.fulfill({json:req.method()==='GET'?{available:true,token:'public-reply-ui-fixture',sessionState:'ui-only'}:{reply,sessionState:'ui-only'}});return route.continue({headers:{...req.headers(),'x-vercel-protection-bypass':access,...(u.pathname==='/api/concierge'?{'x-hd-concierge-evaluation':evalHeader()}:{})}})});
 await page.goto(base,{waitUntil:'domcontentloaded'});const consent=page.getByRole('button',{name:'Essential only',exact:true});if(await consent.isVisible())await consent.click();await page.getByRole('button',{name:'Housing Concierge',exact:true}).click();await page.getByRole('button',{name:/^Ask Anything/}).click();return{context,page,close:async()=>{await context.unrouteAll({behavior:'ignoreErrors'});await context.close()}};
}
async function send(s,question,{injected=false}={}){
 assert.ok(turns.length<8,'Bounded at eight live turns');if(last){const pause=30000-(Date.now()-last);if(pause>0)await new Promise(r=>setTimeout(r,pause))}last=Date.now();fault=injected?'invalid':'none';
 const response=s.page.waitForResponse(r=>r.url()===base+'/api/concierge'&&r.request().method()==='POST',{timeout:55000});await s.page.getByLabel('Your housing question').fill(question);await s.page.getByRole('button',{name:'Send question',exact:true}).click();const r=await response,d=await r.json();assert.equal(r.status(),200);assert.ok(d.reply);await s.page.getByRole('status').filter({hasText:'Thinking through your question…'}).waitFor({state:'hidden'});
 const state=JSON.parse(Buffer.from(d.sessionState.split('.')[0],'base64url'));
 const t={question,reply:d.reply,mode:d.responseMode,values:state.values,recommended:state.recommended,evaluation:d._evaluation,injectedContractFault:injected,renderedCards:await s.page.locator('[data-concierge-answer]').last().locator('[data-concierge-model]').count()};turns.push(t);await writeFile(out+'/turns.json',JSON.stringify(turns,null,2));
 if(injected){assert.ok(d._evaluation.failures.every(f=>f.category==='output_validation'));assert.equal(d._evaluation.completedModelCalls,0);assert.equal(d.responseMode,'reviewed_fallback');assert.doesNotMatch(JSON.stringify(d.reply),/PRIVATE_OUTPUT_CANARY|connection is busy/)}else assert.deepEqual(d._evaluation.failures,[],'Actual service/contract failure; stop without retry');
 return t;
}
async function cards(s,label){
 const answer=s.page.locator('[data-concierge-answer]').last(),rendered=answer.locator('[data-concierge-model]');assert.ok(await rendered.count()>=2);
 for(const card of await rendered.all()){await card.scrollIntoViewIfNeeded();const photo=card.locator('img');if(await photo.count()){await photo.evaluate(img=>img.decode());assert.ok(await photo.evaluate(img=>img.naturalWidth>0))}const title=card.locator('h4');assert.ok(await title.textContent());assert.ok(await card.getByRole('link',{name:'View home',exact:true}).count());assert.ok(await card.getByRole('link',{name:'Floor plans',exact:true}).count());assert.match(await card.textContent(),/bedrooms[\s\S]*sq\. ft\./);assert.ok(await card.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('[role=log]').getBoundingClientRect();return a.width>0&&a.height>100&&a.left>=b.left&&a.right<=b.right&&el.scrollWidth<=el.clientWidth+1}));}
 await rendered.first().scrollIntoViewIfNeeded();await s.page.screenshot({path:out+'/'+label+'.png'});await rendered.first().getByRole('link',{name:'Floor plans',exact:true}).focus();assert.ok(await rendered.first().getByRole('link',{name:'Floor plans',exact:true}).evaluate(el=>el===document.activeElement));assert.equal(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks.push({case:label,cards:await rendered.count(),imagesLoaded:true,linksAndKeyboard:true,noOverflow:true});
}
try{
 const s=await surface();
 const qs=['I have a property 4800 square feet in Vancouver','I want to build a home on the lot','3 or 4 bedroom home','I need three bedrooms','three or four bedrooms','show me family homes','what homes would work for my Vancouver property?'];
 for(let i=0;i<qs.length;i++){
  const t=await send(s,qs[i]);assert.equal(t.values.siteArea.value.sqft,4800);assert.equal(t.values.location.value,'Vancouver');assert.equal(t.values.areaTarget,undefined);
  if(i===0){assert.equal(t.evaluation.modelCalls,0);assert.match(t.reply.answerSegments[0].text,/4,800 sq\. ft\. lot in Vancouver/);assert.doesNotMatch(t.reply.answerSegments[0].text,/don’t have a confirmed answer/)}
  if(i===3){assert.deepEqual(t.values.bedroomOptions.value,[3]);assert.equal(t.renderedCards,0,'No invented architectural three-bedroom match')}
  if(i===2||i>=4){assert.deepEqual(t.values.bedroomOptions.value,[3,4]);assert.ok(t.reply.modelCards.length>=2&&t.reply.modelCards.length<=3);assert.equal(t.renderedCards,t.reply.modelCards.length);assert.deepEqual(t.recommended,t.reply.modelCards.map(c=>c.id));assert.ok(t.reply.modelCards.every(c=>c.specs.some(s=>s==='4 bedrooms')));await cards(s,i===2?'desktop-after':'variant-'+i);publicReply=t.reply;}
 }
 const fallback=await send(s,'three or four bedrooms',{injected:true});assert.equal(fallback.renderedCards,fallback.reply.modelCards.length);assert.ok(fallback.renderedCards>=2);await cards(s,'desktop-safe-fallback');
 const generated=turns.filter(t=>t.mode==='generated'&&t.reply.modelCards?.length>=2);assert.ok(generated.length,'Observe real generated recommendations as well as fallback');checks.push({case:'actual-generation-and-fallback',generatedTurns:generated.length,fallbackCards:fallback.renderedCards});
 const paths=await Promise.all(publicReply.modelCards.map(async c=>{const r=await s.context.request.get(base+c.href,{headers:{'x-vercel-protection-bypass':access},maxRedirects:0}),html=await r.text();assert.equal(r.status(),200);assert.match(html,/id="plans"/);return{href:c.href,planHref:c.floorPlanHref,status:r.status(),plansAnchor:true}}));checks.push({case:'actual-model-pages',paths});await s.close();
 for(const [label,width,height]of [['tablet',768,1024],['mobile',390,844]]){const x=await surface(width,height,publicReply),p=x.page;await p.getByLabel('Your housing question').fill('Show the captured recommendations.');await p.getByRole('button',{name:'Send question',exact:true}).click();await p.locator('[data-concierge-model]').first().waitFor();await cards(x,label+'-after');await x.close();}
 const noPhoto={...publicReply,modelCards:[{...publicReply.modelCards[0],image:undefined}],facts:[],question:''},x=await surface(390,844,noPhoto);await x.page.getByLabel('Your housing question').fill('UI-only optional-image check');await x.page.getByRole('button',{name:'Send question',exact:true}).click();const card=x.page.locator('[data-concierge-model]');await card.waitFor();assert.equal(await card.locator('img').count(),0);assert.ok(await card.getByRole('link',{name:'View home',exact:true}).count());assert.ok(await card.getByRole('link',{name:'Floor plans',exact:true}).count());assert.match(await card.textContent(),/bedrooms[\s\S]*sq\. ft\./);checks.push({case:'optional-image-text-and-link-fallback',passed:true,modelCalls:0});await x.close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,liveTurns:turns.length,checks,realInquiryPosts:0},null,2));
}catch(e){checks.push({passed:false,error:safe(e)});console.error(safe(e));process.exitCode=1}
finally{await writeFile(out+'/results.json',JSON.stringify({checks,errors,liveTurns:turns.length,modelCalls:turns.reduce((n,t)=>n+(t.evaluation?.modelCalls??0),0),injectedContractFaults:turns.filter(t=>t.injectedContractFault).length},null,2));await browser.close()}
