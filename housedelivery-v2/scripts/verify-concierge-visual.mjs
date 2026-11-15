/** UI-only regression check. Public reply captured from approved Production 2026-11-15.
 * All Concierge and lead requests are intercepted in the browser; no AI call/email.
 * Run against the local build or a feature Preview, never live Production. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const base=process.env.CONCIERGE_VISUAL_BASE_URL??'http://127.0.0.1:3017';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname)||new URL(base).hostname.endsWith('.vercel.app'),'Use a local build or feature Preview');
const output=process.env.CONCIERGE_VISUAL_OUTPUT??'/private/tmp/hd-concierge-premium-20261115/qa';
await mkdir(output,{recursive:true});
const fixture=JSON.parse(await readFile(new URL('./fixtures/concierge-visual-reply.json',import.meta.url),'utf8'));
const access=process.env.CONCIERGE_VISUAL_BYPASS_FILE?(await readFile(process.env.CONCIERGE_VISUAL_BYPASS_FILE,'utf8')).trim():'';
const browser=await chromium.launch({headless:true,...(process.env.CONCIERGE_VISUAL_CHROME?{executablePath:process.env.CONCIERGE_VISUAL_CHROME}:{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})});
const results=[],errors=[];
if(process.env.CONCIERGE_VISUAL_RESUME==='true'){const saved=JSON.parse(await readFile(output+'/results.json','utf8'));results.push(...saved.results.filter(r=>r.viewport&&r.passed));}
const viewports=[['desktop',1440,900],['laptop',1280,800],['tablet',768,1024],['mobile',390,844],['small-mobile',360,780]];
async function surface(width,height,{failConnect=false,motion='reduce'}={}){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:motion}),page=await context.newPage(),posts=[],leads=[];
 const controls={delay:0,failNext:false,failConnect};let gets=0;
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!==base)return route.continue();
  if(url.pathname==='/api/concierge'){
   if(req.method()==='GET'){gets++;if(controls.failConnect){return route.fulfill({status:503,json:{available:false,error:'The assistant is temporarily unavailable. Please try again or talk with our team.'}})}return route.fulfill({json:{available:true,token:'visual-fixture-only',sessionState:'fixture-session-'+gets}})}
   const payload=req.postDataJSON();posts.push(payload);if(controls.delay)await new Promise(r=>setTimeout(r,controls.delay));if(controls.failNext){controls.failNext=false;return route.fulfill({status:503,json:{error:'I couldn’t connect just now. Your question is still here; please try again.'}})}return route.fulfill({json:{reply:fixture.reply,sessionState:'fixture-reply-'+posts.length}});
  }
  if(url.pathname==='/api/concierge/leads'){
   if(req.method()==='GET')return route.fulfill({json:{token:'visual-lead-fixture-only'}});
   leads.push(req.postDataJSON());return route.fulfill({json:{accepted:true,reference:'visual-review-fixture'}});
  }
  if(req.method()==='POST'&&url.pathname.startsWith('/api/'))return route.abort();
  return route.continue({headers:{...req.headers(),...(access?{'x-vercel-protection-bypass':access}:{})}});
 });
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
 const cookies=page.getByRole('button',{name:'Essential only',exact:true});await cookies.waitFor({timeout:2000}).catch(()=>{});if(await cookies.isVisible())await cookies.click();
 await page.addStyleTag({content:'nextjs-portal{display:none}'});
 if(process.env.CONCIERGE_VISUAL_TOOLBAR==='true')await page.evaluate(()=>{const s=document.createElement('script');s.type='application/json';s.src='https://vercel.live/_next-live/feedback/feedback.js';document.head.append(s)});
 const launcher=page.getByRole('button',{name:'Housing Concierge',exact:true});await launcher.waitFor();
 return{context,page,launcher,posts,leads,controls,getCount:()=>gets};
}
const dialog=page=>page.locator('#housing-concierge-panel');
async function open(s){await s.launcher.click();await dialog(s.page).waitFor();await s.page.getByRole('button',{name:/^Ask Anything/}).waitFor();}
async function send(s,text){await s.page.getByLabel('Your housing question').fill(text);await s.page.getByRole('button',{name:'Send question',exact:true}).click();await s.page.getByRole('status').filter({hasText:'Thinking through your question…'}).waitFor({state:'hidden'});await s.page.locator('[data-concierge-answer]').last().waitFor();}
function contrast(a,b){const channel=x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4};const lum=hex=>{const v=hex.match(/../g).map(s=>channel(parseInt(s,16)));return .2126*v[0]+.7152*v[1]+.0722*v[2]};const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
try{
 for(const [name,width,height]of viewports){
  if(results.some(r=>r.viewport===name&&r.passed))continue;
  const s=await surface(width,height),p=s.page;
  const launcherBounds=await s.launcher.boundingBox();assert.ok(launcherBounds.height>=44&&launcherBounds.width>=44);
  const overlaps=await s.launcher.evaluate(el=>{const a=el.getBoundingClientRect();return [...document.querySelectorAll('header a,header button,main a[href="/plan-a-housing-project"],main button[aria-label*="architectural film"]')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.height&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top}).map(e=>e.textContent.trim())});assert.deepEqual(overlaps,[],name+' launcher overlap');
  await p.screenshot({path:output+'/'+name+'-launcher.png'});await open(s);assert.equal(await s.launcher.isVisible(),false);assert.equal(await p.locator('#concierge-title').evaluate(e=>e===document.activeElement),true);
  const fit=await dialog(p).evaluate(el=>{const d=el.getBoundingClientRect(),log=el.querySelector('[role=log]'),r=log.getBoundingClientRect();return {x:d.x,y:d.y,right:d.right,bottom:d.bottom,noPageOverflow:document.documentElement.scrollWidth<=innerWidth,cards:[...el.querySelectorAll('[aria-label="Choose your housing journey"] button')].map(e=>{const b=e.getBoundingClientRect();return {height:b.height,top:b.top,bottom:b.bottom,inside:b.top>=r.top&&b.bottom<=r.bottom+1}})}});
  assert.ok(fit.x>=0&&fit.y>=76&&fit.right<=width&&fit.bottom<=height&&fit.noPageOverflow,name+' bounds');assert.ok(fit.cards.every(c=>c.inside&&c.height>=44),name+' all four journeys visible');
  if(process.env.CONCIERGE_VISUAL_TOOLBAR==='true')assert.ok(fit.right<=width-(width<640?56:72),name+' Preview Toolbar gutter');
  assert.equal(await dialog(p).evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  await p.screenshot({path:output+'/'+name+'-welcome.png'});
  await p.getByRole('button',{name:/^Ask Anything/}).click();assert.equal(s.posts.length,0);assert.ok(await p.getByLabel('Your housing question').evaluate(e=>e===document.activeElement));
  const multiline='First line\nSecond line';await p.getByLabel('Your housing question').fill('First line');await p.getByLabel('Your housing question').press('Shift+Enter');await p.getByLabel('Your housing question').pressSequentially('Second line');assert.equal(await p.getByLabel('Your housing question').inputValue(),multiline);
  await p.getByLabel('Your housing question').fill(fixture.question);await p.getByLabel('Your housing question').press('Enter');await p.locator('[data-concierge-answer]').waitFor();
  const displayed=await p.locator('[data-concierge-answer]').first().locator('p').allTextContents();assert.deepEqual(displayed,fixture.reply.answerSegments.map(x=>x.text),name+' exact unmodified answer');
  const request=s.posts[0];assert.equal(request.question,fixture.question);assert.deepEqual(request.history,[]);assert.equal(request.sourcePath,'/');assert.match(request.sessionState,/fixture-session/);
  await p.screenshot({path:output+'/'+name+'-conversation.png'});
  await p.getByLabel('Your housing question').fill('Draft kept when closing');await p.keyboard.press('Escape');await s.launcher.waitFor();await p.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Housing Concierge');assert.equal(await s.launcher.evaluate(e=>e===document.activeElement),true);await s.launcher.click();assert.equal(await p.getByLabel('Your housing question').inputValue(),'Draft kept when closing');assert.equal(await p.locator('[data-concierge-answer]').count(),1);
  if(width<=390){
   await p.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,value:460});window.visualViewport.dispatchEvent(new Event('resize'))});
   const bottom=await p.getByLabel('Your housing question').evaluate(e=>e.getBoundingClientRect().bottom);assert.ok(bottom<=460,name+' simulated keyboard');await p.screenshot({path:output+'/'+name+'-keyboard-geometry.png'});
  }
  results.push({viewport:name,width,height,passed:true,checks:'launcher/control clearance, dialog/card bounds, exact response text, shortcuts, close/reopen state, reduced motion'+(width<=390?', simulated keyboard geometry':'')});await s.context.close();
 }
 const s=await surface(1440,900),p=s.page;await open(s);
 for(const [prefix,prompt]of [['Build My Home','I’m exploring a home for myself or my family. Help me find a starting point.'],['ADU / Laneway Home','I’m exploring an ADU, laneway or carriage home. Where should I start?'],['Multi-Home Development','I’m exploring a multi-home housing project. Help me work through the first steps.']]){
  await p.getByRole('button',{name:new RegExp('^'+prefix)}).click();await p.locator('[data-concierge-answer]').waitFor();assert.equal(s.posts.at(-1).question,prompt);await p.getByRole('button',{name:'Start a new conversation'}).click();await p.getByRole('button',{name:/^Ask Anything/}).waitFor();assert.equal(await p.locator('[data-concierge-answer]').count(),0);
 }
 await p.getByRole('button',{name:/^Ask Anything/}).click();s.controls.delay=1800;await p.getByLabel('Your housing question').fill('A housing question');await p.getByRole('button',{name:'Send question'}).click();await p.getByRole('status').filter({hasText:'Thinking through your question…'}).waitFor();assert.equal(await p.getByRole('button',{name:'Send question'}).isDisabled(),true);await p.screenshot({path:output+'/desktop-loading.png'});await p.locator('[data-concierge-answer]').waitFor();s.controls.delay=0;
 for(let i=0;i<5;i++)await send(s,'Follow-up '+i);assert.equal(await p.locator('[data-concierge-answer]').count(),6);assert.equal(s.posts.at(-1).history.length,4);assert.match(s.posts.at(-1).sessionState,/fixture-reply/);
 const scroll=p.getByRole('log',{name:'Conversation with House Delivery'});assert.ok(await scroll.evaluate(e=>e.scrollHeight>e.clientHeight*2));await scroll.evaluate(e=>e.scrollTo({top:0}));assert.ok(await scroll.evaluate(e=>e.scrollTop<1));await scroll.focus();await p.keyboard.press('PageDown');await p.waitForFunction(()=>document.querySelector('[role=log]').scrollTop>0);
 s.controls.failNext=true;await p.getByLabel('Your housing question').fill('Question preserved after service error');await p.getByRole('button',{name:'Send question'}).click();await dialog(p).getByRole('alert').waitFor();assert.equal(await p.getByLabel('Your housing question').inputValue(),'Question preserved after service error');assert.equal(await dialog(p).getByRole('alert').locator('a').getAttribute('href'),'/plan-a-housing-project');await p.screenshot({path:output+'/desktop-error.png'});await send(s,'Retry after connection error');
 await p.getByRole('button',{name:'Talk with our team',exact:true}).click();await p.getByLabel('I’m planning as',{exact:true}).waitFor();await p.getByLabel('I’m planning as',{exact:true}).selectOption('Developer');await p.getByLabel('Province / territory',{exact:true}).selectOption('Manitoba');await p.getByLabel('Housing type',{exact:true}).selectOption('Multi-home development');await p.getByLabel('Approximate number of homes',{exact:true}).selectOption('2–10');await p.getByLabel('Land / site status',{exact:true}).selectOption('Site owned / controlled');await p.getByLabel('Timing',{exact:true}).selectOption('12–24 months');await p.getByLabel('Municipality / community',{exact:true}).fill('Test community');await p.getByLabel('Review your project summary',{exact:true}).fill('Browser-only visual test.');await p.getByLabel('Full name',{exact:true}).fill('Visual Test');await p.getByLabel('Email',{exact:true}).fill('visual@example.test');
 await p.getByRole('button',{name:'Send for personal review'}).click();assert.equal(s.leads.length,0);await p.getByRole('checkbox').check();await p.getByRole('button',{name:'Send for personal review'}).click();await p.getByText('Your reviewed project details were delivered to House Delivery for personal follow-up.').waitFor();assert.equal(s.leads.length,1);assert.equal(s.leads[0].consent,true);assert.ok(!Object.hasOwn(s.leads[0],'transcript'));assert.equal(s.leads[0].sourcePath,'/');await p.screenshot({path:output+'/desktop-lead-confirmation.png'});await p.getByRole('button',{name:'Back to conversation'}).click();assert.ok(await p.locator('[data-concierge-answer]').count()>0);assert.equal(await p.locator('a[href="/privacy"]').filter({hasText:'Privacy'}).count()>0,true);await s.context.close();
 const e=await surface(390,844,{failConnect:true});await e.launcher.click();await dialog(e.page).getByRole('alert').waitFor();await e.page.screenshot({path:output+'/mobile-connection-error.png'});e.controls.failConnect=false;await e.page.getByRole('button',{name:'Try connecting again'}).click();await e.page.getByRole('button',{name:/^Ask Anything/}).waitFor();await e.context.close();
 // Check the actual playing-film control too: reduced-motion correctly omits it.
 for(const [width,height]of [[1440,900],[768,1024],[390,844]]){
  const s=await surface(width,height,{motion:'no-preference'}),p=s.page;
  if(width>=768){
   const film=p.getByRole('button',{name:'Pause architectural film',exact:true});await film.waitFor({timeout:20000});
   const a=await s.launcher.boundingBox(),b=await film.boundingBox();assert.ok(a.x+a.width<=b.x||a.x>=b.x+b.width||a.y+a.height<=b.y||a.y>=b.y+b.height,'launcher clears playing film at '+width);
   await film.click();await p.getByRole('button',{name:'Play architectural film',exact:true}).waitFor();
  }
  await open(s);await p.waitForFunction(()=>!document.querySelector('#housing-concierge-panel').getAnimations().some(a=>a.playState==='running'));
  const materials=await dialog(p).evaluate(e=>({blur:getComputedStyle(e).backdropFilter,animated:[e,...e.querySelectorAll('*')].filter(e=>getComputedStyle(e).animationName!=='none').length}));assert.match(materials.blur,/blur/);assert.equal(materials.animated,0);
  await p.screenshot({path:output+'/normal-motion-'+width+'.png'});results.push({normalMotion:width,passed:true,checks:'actual film pause/play and launcher clearance where video is enabled; one bounded glass shell; no continuous interface animation'});await s.context.close();
 }
 const pairs=[['body','2d302b','e0e2d8'],['secondary','454b43','d5d8ce'],['brand','5b4c32','bdc4b7'],['visitor','33372f','edf0e8'],['notice','454b43','c3c8bd'],['launcher','30332f','bec5b5'],['source link','615037','e2e5dc']];const contrasts=pairs.map(([label,a,b])=>({label,ratio:contrast(a,b)}));assert.ok(contrasts.every(x=>x.ratio>=4.5));assert.deepEqual(errors,[]);
 results.push({flows:'four unchanged journey prompts; loading; exact responses; bounded history; long-scroll keyboard; error/draft recovery; reset; close focus; secure lead UI and consent; privacy routes',passed:true,leadDelivery:'browser-mocked only, no real email',contrasts});
 console.log(JSON.stringify({passed:true,results},null,2));
}catch(e){results.push({passed:false,error:String(e)});console.error(e);process.exitCode=1;}finally{await writeFile(output+'/results.json',JSON.stringify({results,errors},null,2));await browser.close();}
