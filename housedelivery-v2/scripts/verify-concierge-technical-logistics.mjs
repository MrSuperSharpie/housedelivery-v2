/** One bounded Preview conversation review. Existing provider and safeguards;
 * no retries, emails, inquiry POSTs, or Production requests. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
const base=process.env.CONCIERGE_QA_URL;
assert.ok(base&&/^https:\/\/housedelivery-v2-[a-z0-9]+-edavis-animalmarkets-projects\.vercel\.app$/.test(base),'Feature Preview only');
const out=process.env.CONCIERGE_QA_OUTPUT??'/private/tmp/hd-concierge-technical-logistics-20261115/preview-review';await mkdir(out,{recursive:true});
const access=(await readFile(process.env.CONCIERGE_QA_BYPASS_FILE,'utf8')).trim(),secret=(await readFile(process.env.CONCIERGE_QA_EVALUATION_FILE,'utf8')).trim();
const clean=e=>[access,secret].reduce((s,k)=>s.replaceAll(k,'[REDACTED]'),String(e)).split('\n')[0];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const turns=[],checks=[],errors=[];let caseId='documentation',last=0;
function evaluation(){const p=Buffer.from(JSON.stringify({run:'technical-logistics-20261115',caseId,expires:Date.now()+3600_000,fault:'none'})).toString('base64url');return p+'.'+createHmac('sha256',secret).update('hd-evaluation:'+p).digest('hex')}
async function surface(){const context=await browser.newContext({viewport:{width:1440,height:950},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(clean(e)));
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==base)return u.hostname==='img1.wsimg.com'?route.continue():route.abort();if(req.method()==='POST'&&u.pathname.startsWith('/api/')&&u.pathname!=='/api/concierge')return route.abort();return route.continue({headers:{...req.headers(),'x-vercel-protection-bypass':access,...(u.pathname==='/api/concierge'?{'x-hd-concierge-evaluation':evaluation()}:{})}})});
 await page.goto(base,{waitUntil:'domcontentloaded'});const consent=page.getByRole('button',{name:'Essential only',exact:true});if(await consent.isVisible())await consent.click();await page.getByRole('button',{name:'Housing Concierge',exact:true}).click();await page.getByRole('button',{name:/^Ask Anything/}).click();return{page,close:async()=>{await context.unrouteAll({behavior:'ignoreErrors'});await context.close()}};
}
async function send(s,question){assert.ok(turns.length<12,'Bounded at twelve real turns');if(last){const delay=24000-(Date.now()-last);if(delay>0)await new Promise(r=>setTimeout(r,delay))}last=Date.now();const p=s.page,response=p.waitForResponse(r=>r.url()===base+'/api/concierge'&&r.request().method()==='POST',{timeout:55000});await p.getByLabel('Your housing question').fill(question);await p.getByRole('button',{name:'Send question',exact:true}).click();const r=await response,d=await r.json();assert.equal(r.status(),200);assert.ok(d.reply);await p.getByRole('status').filter({hasText:'Thinking through your question…'}).waitFor({state:'hidden'});
 const state=JSON.parse(Buffer.from(d.sessionState.split('.')[0],'base64url'));
 const turn={caseId,question,answer:[d.reply.introduction,...(d.reply.answerSegments??[]).map(s=>s.text),d.reply.question].filter(Boolean).join('\n\n'),nextQuestion:d.reply.question,nextAction:d.reply.nextAction,mode:d.responseMode,cards:d.reply.modelCards??[],links:d.reply.facts,savedRequirements:state.values,evaluation:d._evaluation};turns.push(turn);await writeFile(out+'/turns.json',JSON.stringify(turns,null,2));assert.deepEqual(d._evaluation?.failures??[],[],'Provider/contract error: saved trace, no retry');assert.deepEqual(d._evaluation?.coverage?.missing??[],[],'Unanswered request: saved trace');assert.doesNotMatch(turn.answer,/all technical documents are confidential|technical documents are unavailable|not routinely provided|we never provide|you must (?:hire|appoint).*broker|duty.free/i);return turn;
}
const scenarios=[
 ['exact-transcript',[
 'I’m exploring a home for myself or my family. Help me find a starting point.',
 'I have a 4000 square foot property in Vancouver',
 'I am not sure how big of a house I can build on a 4000 square foot lot but I would need 4 bedrooms minimum',
 "Can I inspect the manufacturing plant before I buy, or get the factory's direct engineering spec sheets?",
 'Can you tell me the factory name then?',
 'please',
 'no I need factory name first or I cannot proceed',
 'no I need factory name first or I will not proceed',
 'Do I have to deal with customs brokers, CBSA duties, or container unloading at the port, or is your pricing fully landed?',
 'Do I have to appoint my own customs broker, or do you handle it and act as importer of record?'
 ]],
 ['structural',[
 'Does the Aurora have to use light-gauge steel, or can timber and other engineered systems be considered?',
 'Is timber guaranteed to be available for this model?'
 ]]
];
try{
 for(const [id,questions]of scenarios){caseId=id;const s=await surface();
  for(const question of questions){const t=await send(s,question);
   const index=questions.indexOf(question);
   if(id==='exact-transcript'){
    if(index>=2){assert.equal(t.savedRequirements.location.value,'Vancouver');assert.equal(t.savedRequirements.siteArea.value.sqft,4000);assert.equal(t.savedRequirements.areaTarget,undefined);assert.equal(t.savedRequirements.bedrooms.value,4);assert.equal(t.savedRequirements.bedroomMode.value,'minimum')}
    if(index===2){assert.ok(t.cards.length>=2);assert.ok(t.cards.every(c=>c.image&&c.floorPlanHref));}
    if(index===3){assert.match(t.answer,/Plant-visit availability/);assert.match(t.answer,/engineering documentation require team confirmation/)}
    if(index===4){assert.equal(t.evaluation.modelCalls,0);assert.equal(t.nextQuestion,'')}
    if(index===5){assert.equal(t.evaluation.modelCalls,0);assert.match(t.answer,/steel, timber and other suitable engineered systems/);assert.match(t.answer,/Canadian.*(?:assembly|completion)/);assert.doesNotMatch(t.answer,/specification sheets are confidential|not publicly released|Plant-visit/);assert.equal(t.nextQuestion,'')}
    if(index===6||index===7){assert.match(t.answer,/condition of proceeding/);assert.equal(t.nextQuestion,'');assert.equal(t.nextAction,'none');assert.equal(t.evaluation.modelCalls,0)}
    if(index>=8){assert.match(t.answer,/CBSA duties/);assert.match(t.answer,/who appoints the customs broker/);assert.match(t.answer,/importer of record/);assert.match(t.answer,/port handling/);assert.match(t.answer,/unloading/);assert.doesNotMatch(t.answer,/CAD|\$|like-for-like.*not available|don’t have a confirmed answer/)}
   }
   if(id==='structural'){assert.match(t.answer,/steel, timber and other suitable engineered systems/);assert.match(t.answer,/project-specific design and engineering review/);assert.doesNotMatch(t.answer,/must be built with steel|timber is guaranteed/)}
  }
  await s.page.locator('[data-concierge-answer]').last().scrollIntoViewIfNeeded();await s.page.screenshot({path:out+'/'+id+'-desktop.png'});assert.equal(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks.push({case:id,turns:questions.length,passed:true});await s.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks,realTurns:turns.length,modelCalls:turns.reduce((n,t)=>n+t.evaluation.modelCalls,0),realInquiryPosts:0,latestTranscriptProvided:true},null,2));
}catch(e){checks.push({passed:false,error:clean(e)});console.error(clean(e));process.exitCode=1}
finally{await writeFile(out+'/results.json',JSON.stringify({checks,errors,realTurns:turns.length,modelCalls:turns.reduce((n,t)=>n+(t.evaluation?.modelCalls??0),0),latestTranscriptProvided:true},null,2));await browser.close()}
