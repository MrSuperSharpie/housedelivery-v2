/** Bounded Preview-only acceptance: real inference once per turn; no retries,
 * lead POSTs or tracking beacons. UI-only mode reuses a captured public reply. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
const base=process.env.CONCIERGE_QA_URL??'http://127.0.0.1:3023';
const local=['localhost','127.0.0.1'].includes(new URL(base).hostname);
assert.ok(local||/^https:\/\/housedelivery-v2-[a-z0-9]+-edavis-animalmarkets-projects\.vercel\.app$/.test(base),'Only a feature Preview/local build');
const out=process.env.CONCIERGE_QA_OUTPUT??'/private/tmp/hd-concierge-recommendations-20261115/local-ui';await mkdir(out,{recursive:true});
const mock=process.env.CONCIERGE_QA_UI_ONLY==='true';assert.ok(!local||mock,'No local provider experiments');
const access=process.env.CONCIERGE_QA_BYPASS_FILE?(await readFile(process.env.CONCIERGE_QA_BYPASS_FILE,'utf8')).trim():'';
const evaluationSecret=!mock?(await readFile(process.env.CONCIERGE_QA_EVALUATION_FILE,'utf8')).trim():'';
const clean=e=>[access,evaluationSecret].filter(Boolean).reduce((s,k)=>s.replaceAll(k,'[REDACTED]'),String(e)).split('\n')[0];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const turns=[],checks=[],errors=[];let calls=0,lastTurnAt=0,fixture=mock?JSON.parse(await readFile(process.env.CONCIERGE_QA_REPLY_FILE,'utf8')):null;
const run='recommendations-20261115';let caseId='home';
function evaluation(){const payload=Buffer.from(JSON.stringify({run,caseId,expires:Date.now()+3600_000,fault:'none'})).toString('base64url');return payload+'.'+createHmac('sha256',evaluationSecret).update('hd-evaluation:'+payload).digest('hex')}
async function surface(width=1440,height=950){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(clean(e)));
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==base){return url.hostname==='img1.wsimg.com'?route.continue():route.abort()}
  if(req.method()==='POST'&&url.pathname.startsWith('/api/')&&url.pathname!=='/api/concierge')return route.abort();
  if(mock&&url.pathname==='/api/concierge')return route.fulfill({json:req.method()==='GET'?{available:true,token:'ui-fixture-only',sessionState:'ui-fixture-only'}:{reply:fixture,sessionState:'ui-fixture-only'}});
  const headers={...req.headers(),...(access?{'x-vercel-protection-bypass':access}:{}),...(!mock&&url.pathname==='/api/concierge'?{'x-hd-concierge-evaluation':evaluation()}:{} )};
  return route.continue({headers});
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});const consent=page.getByRole('button',{name:'Essential only',exact:true});if(await consent.isVisible())await consent.click();
 await page.getByRole('button',{name:'Housing Concierge',exact:true}).click();await page.getByRole('button',{name:/^Ask Anything/}).click();
 return{context,page,close:async()=>{await context.unrouteAll({behavior:'ignoreErrors'});await context.close()}};
}
async function send(surface,question){
 if(!mock&&lastTurnAt){const wait=21000-(Date.now()-lastTurnAt);if(wait>0)await new Promise(r=>setTimeout(r,wait))}lastTurnAt=Date.now();
 assert.ok(mock||turns.length<15,'Bounded at 15 real turns');const p=surface.page;
 const response=p.waitForResponse(r=>r.url()===base+'/api/concierge'&&r.request().method()==='POST',{timeout:55000});
 await p.getByLabel('Your housing question').fill(question);await p.getByRole('button',{name:'Send question',exact:true}).click();
 const r=await response,d=await r.json();assert.equal(r.status(),200,'Customer API status');assert.ok(d.reply,'Customer reply exists');
 await p.getByRole('status').filter({hasText:'Thinking through your question…'}).waitFor({state:'hidden'});
 const state=mock?null:JSON.parse(Buffer.from(d.sessionState.split('.')[0],'base64url'));
 const turn={caseId,question,answer:[d.reply.introduction,...(d.reply.answerSegments??[]).map(s=>s.text),d.reply.question].filter(Boolean).join('\n\n'),cards:d.reply.modelCards??[],links:d.reply.facts,mode:d.responseMode,savedRequirements:state?.values,recommended:state?.recommended,evaluation:d._evaluation};
 turns.push(turn);calls+=d._evaluation?.modelCalls??0;await writeFile(out+'/turns.json',JSON.stringify(turns,null,2));
 assert.ok(!d._evaluation?.failures?.length,'No provider/contract failure; see saved trace');
 assert.ok(!d._evaluation?.coverage?.missing?.length,'All requested parts retained; see trace');
 return{reply:d.reply,state,turn};
}
async function visual(s,label){
 const p=s.page,cards=p.locator('[data-concierge-model]');assert.ok(await cards.count()>=2);
 for(const card of await cards.all()){
  await card.scrollIntoViewIfNeeded();const image=card.locator('img');if(await image.count()){await image.evaluate(img=>img.decode());assert.ok(await image.evaluate(img=>img.naturalWidth>0))}
  assert.ok(await card.getByRole('link',{name:'View home',exact:true}).count());assert.ok(await card.getByRole('link',{name:'Floor plans',exact:true}).count());
  const geometry=await card.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('[role=log]').getBoundingClientRect();return a.left>=b.left&&a.right<=b.right&&el.scrollWidth<=el.clientWidth+1});assert.ok(geometry,label+' card bounds');
 }
 await cards.first().scrollIntoViewIfNeeded();await p.screenshot({path:out+'/'+label+'-recommendations.png'});
 const link=cards.first().getByRole('link',{name:'Floor plans',exact:true});await link.focus();assert.ok(await link.evaluate(e=>e===document.activeElement));
 const href=await link.getAttribute('href');assert.match(href,/^\/homes\/[a-z-]+#plans$/);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 checks.push({case:'visual',viewport:label,imagesLoaded:true,linksAndKeyboard:true,noOverflow:true});
}
try{
 const s=await surface();
 if(mock){await send(s,'Show matching homes.');await visual(s,'desktop');await s.close();for(const [label,width,height]of [['tablet',768,1024],['mobile',390,844]]){const x=await surface(width,height);await send(x,'Show matching homes.');await visual(x,label);await x.close()}}
 else{
  for(const q of ["I'm exploring a home for myself or my family. Help me find a starting point.",'I have a 4000 square foot lot in East Vancouver.','Yes.','4 or 5 bedroom.']){const r=await send(s,q);if(q.startsWith('I have')){assert.equal(r.state.values.siteArea.value.sqft,4000);assert.equal(r.state.values.areaTarget,undefined)}}
  const match=turns.at(-1);assert.equal(match.savedRequirements.location.value,'East Vancouver');assert.deepEqual(match.savedRequirements.bedroomOptions.value,[4,5]);assert.equal(match.savedRequirements.areaTarget,undefined);assert.ok(match.cards.length>=2&&match.cards.length<=3);assert.ok(match.cards.some(c=>c.specs.some(x=>/^4 bedrooms/.test(x))));assert.ok(match.cards.some(c=>c.specs.some(x=>/^5 bedrooms/.test(x))));assert.doesNotMatch(match.answer,/These published designs meet|would you like.*(?:browse|explore|show)/i);
  await visual(s,'desktop');fixture=match.cards.length?{...turns.at(-1),modelCards:match.cards}:null;
  // Store only the public reply for mobile replay: no new AI calls.
  const publicReply=(await s.page.locator('[data-concierge-answer]').last().textContent());assert.ok(publicReply.includes(match.cards[0].title));
  const mainReply={introduction:'',facts:match.links,answerSegments:[{text:match.answer,evidenceRefs:[]}],modelCards:match.cards,question:'',next:'none',disposition:'answer'};
  await writeFile(out+'/public-reply.json',JSON.stringify(mainReply));
  for(const q of ['Compare the Aurora and Maplewood for our family.','Show their floor plans.','What would the complete built project cost, including foundations, local construction and delivery?','I would like to discuss this project with your team.'])await send(s,q);
  assert.ok(turns[6].answer.match(/quotation|quote|confirm|scope|site/i));assert.ok(turns[7].savedRequirements.siteArea.value.sqft===4000);await s.page.getByRole('button',{name:'Talk with our team',exact:true}).click();await s.page.locator('input[name=fullName]').waitFor();assert.equal(await s.page.locator('fieldset > div').first().locator('input,select,textarea').count(),5);checks.push({case:'five-field inquiry preserved',realLeadPosts:0});await s.close();
  for(const [id,qs]of [
   ['variation',['Our parcel is 600 m² in Surrey. We want four or five bedrooms in a home around 2,500 square feet. Which published designs should we explore?','Can we adjust the kitchen layout and source appliances locally?']],
   ['developer',["I'm a developer planning six four-bedroom homes in Winnipeg next year. Which published designs are starting points?",'Could we phase those into two groups of three while keeping the bedroom requirement?']],
   ['nation',['Our Nation is exploring twenty two-bedroom homes in Manitoba, starting with ten, with privacy and low maintenance for Elders. How would you help us plan?','Can we compare appropriate housing options while funding is still pending?']]
  ]){caseId=id;const x=await surface();for(const q of qs)await send(x,q);await x.close()}
  assert.equal(turns[8].savedRequirements.siteArea.value.unit,'m2');assert.equal(turns[8].savedRequirements.areaTarget.value.sqft,2500);assert.deepEqual(turns[9].savedRequirements.bedroomOptions.value,[4,5]);
  assert.equal(turns[11].savedRequirements.homes.value,6);assert.equal(turns[11].savedRequirements.phaseHomes.value,3);assert.equal(turns[11].savedRequirements.role.value,'developer');
  assert.match(turns[13].savedRequirements.audience.value,/Indigenous/);assert.equal(turns[13].savedRequirements.homes.value,20);assert.equal(turns[13].savedRequirements.phaseHomes.value,10);assert.equal(turns[13].savedRequirements.bedrooms.value,2);
  caseId='confidentiality';const x=await surface();const privateResult=await send(x,'Which company manufactures your steel frames?');assert.equal(privateResult.turn.evaluation.modelCalls,0);assert.match(privateResult.turn.answer,/confidential/);await x.close();
 }
 checks.push({case:'bounded conversation review',realTurns:mock?0:turns.length,modelCalls:calls,leadPosts:0});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks,turns:turns.map(t=>({case:t.caseId,question:t.question,answer:t.answer,cards:t.cards.map(c=>c.title)}))},null,2));
}catch(e){checks.push({passed:false,error:clean(e)});console.error(clean(e));process.exitCode=1}
finally{await writeFile(out+'/results.json',JSON.stringify({checks,errors,turns:turns.length,modelCalls:calls},null,2));await browser.close()}
