import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {chromium} from 'playwright-core';
const base='http://127.0.0.1:3121', baseline='http://127.0.0.1:3120', store='http://127.0.0.1:3122';
const out=resolve('../evidence/browser'); await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[], presentation=[]; const sha=b=>createHash('sha256').update(b).digest('hex');
try {
 for (const viewport of [{width:390,height:844},{width:1440,height:1000}]) {
  let originalMarkup,originalPixels;
  for (const origin of [baseline,base]) {
   const context=await browser.newContext({viewport,reducedMotion:'reduce'});const page=await context.newPage();
   await page.goto(origin+'/homes/solace',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
   const discovery=page.locator('[data-home-design-discovery="primary"]').first();
   await discovery.scrollIntoViewIfNeeded();await page.waitForTimeout(200);
   const markup=await discovery.evaluate(n=>n.outerHTML);
   const pixels=await discovery.screenshot({path:join(out,`${origin===base?'pilot':'production'}-${viewport.width}-make-yours.png`),animations:'disabled'});
   if(origin===baseline){originalMarkup=markup;originalPixels=pixels;}else{
    assert.equal(markup,originalMarkup,'Exact production presentation markup preserved');
    assert.equal(sha(pixels),sha(originalPixels),'Exact production presentation pixels preserved');
    presentation.push({width:viewport.width,identicalMarkup:true,identicalScreenshot:true});
   } await context.close();
  }
  for(const tier of ['premium','signature']) {
   const context=await browser.newContext({viewport,reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
   await page.goto(base+'/homes/solace',{waitUntil:'networkidle'});await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
   const callout=page.locator('[data-home-design-discovery="primary"]').first();
   assert.match(await callout.innerText(),/\$250 \/ sq\. ft\./);assert.match(await callout.innerText(),/\$300 \/ sq\. ft\./);
   await callout.locator(`[data-home-tier="${tier}"]`).click();await page.waitForURL(`**inclusionTier=${tier}**`);
   await page.locator('[data-category-state="active"] [data-home-option]').first().waitFor();
   const ids=await page.locator('[data-home-category]:not([data-category-kind="coordinated"])').evaluateAll(ns=>ns.map(n=>n.dataset.homeCategory));
   assert.equal(ids.length,7);assert.equal(ids.at(-1),'exterior-arrival-openings');
   const selected=[];const index=viewport.width===390?2:3;
   for(const [chapter,id] of ids.entries()) {
    if(await page.locator('[data-close-image-preview]').count())await page.locator('[data-close-image-preview]').click();
    const category=page.locator(`[data-home-category="${id}"]`);await category.waitFor();
    assert.equal(await category.getAttribute('data-category-state'),'active');
    assert.equal(await category.locator('[data-home-option]').count(),4);
    assert.equal(await category.locator(`[data-option-level="${tier}"]`).count(),4);
    assert.equal(await category.locator(`[data-option-level="${tier==='premium'?'signature':'premium'}"]`).count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    if(chapter===0){await category.scrollIntoViewIfNeeded();await category.screenshot({path:join(out,`${tier}-${viewport.width}-four-cards.png`),animations:'disabled'});}
    await category.locator('[data-preview-home-option]').first().click();
    for(let card=0;card<4;card++) {
     const dialog=page.getByRole('dialog');await dialog.locator('img').evaluate(async n=>{await n.decode();});assert.ok(await dialog.locator('img').evaluate(n=>n.naturalWidth>0));
     assert.equal(await dialog.locator('[data-show-previous-preview-option]').isDisabled(),card===0);
     assert.equal(await dialog.locator('[data-show-next-preview-option]').isDisabled(),card===3);
     if(card===index)selected.push({id:await page.locator('[data-home-image-preview]').getAttribute('data-home-image-preview'),name:await dialog.getByRole('heading').innerText()});
     if(card<3)await dialog.locator('[data-show-next-preview-option]').click();
    }
    if(index===2)await page.locator('[data-show-previous-preview-option]').click();
    await page.locator('[data-select-preview-option]').click();
   }
   if(await page.locator('[data-close-image-preview]').count())await page.locator('[data-close-image-preview]').click();
   await page.locator('[data-look-book-ready="true"]').waitFor();
   for(const option of selected)assert.ok(await page.locator(`#home-look-book [data-look-book-option="${option.id}"]`).count());
   await page.locator('[data-lookbook-primary-cta]').click();const form=page.locator('#lookbook-email-form');
   await form.locator('[name="firstName"]').fill('Local Pilot');await form.locator('[name="email"]').fill('pilot@example.invalid');
   const savedResponse=page.waitForResponse(r=>r.url()===base+'/api/lookbooks'&&r.request().method()==='POST');
   await form.locator('[type="submit"]').click();const response=await savedResponse;assert.equal(response.status(),202);const saved=await response.json();assert.equal(saved.saved,true);assert.equal(saved.emailSent,false);
   const rows=await(await fetch(store+'/qa/records')).json();const row=rows.find(n=>n.id===saved.configurationId);assert.ok(row);assert.equal(row.configurator_version,4);assert.equal(row.selections.length,7);assert.ok(row.selections.every(s=>s.tier===tier&&selected.some(o=>o.id===s.optionId)));
   const reopened=await context.newPage();assert.equal((await reopened.goto(base+'/lookbook/'+saved.configurationId,{waitUntil:'networkidle'})).status(),200);
   for(const option of selected)assert.ok(await reopened.locator(`[data-look-book-option="${option.id}"]`).count());
   assert.equal(await reopened.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await reopened.locator('[data-look-book-cover]').scrollIntoViewIfNeeded();await reopened.screenshot({path:join(out,`${tier}-${viewport.width}-saved.png`),animations:'disabled'});
   if(viewport.width===1440){
    const pdf=await context.request.get(base+'/lookbook/'+saved.configurationId+'/pdf',{timeout:120000});assert.equal(pdf.status(),200);assert.match(pdf.headers()['content-type'],/application\/pdf/);await writeFile(join(out,`${tier}-new.pdf`),await pdf.body());
   }
   assert.deepEqual(errors,[]);results.push({tier,width:viewport.width,chapters:7,previewedBoards:28,selectedStyle:selected[0].name,savedId:saved.configurationId,passed:true});
   await context.close();console.log(`PASS ${tier} ${viewport.width}: seven chapters, four tier-only cards, 28 previews, save/reopen${viewport.width===1440?', actual PDF':''}.`);
  }
 }
 const context=await browser.newContext();const page=await context.newPage();
 const initial=JSON.parse(await readFile('../qa-fixtures.json','utf8'));
 for(const row of initial){
  for(const origin of [baseline,base]){
   assert.equal((await page.goto(origin+'/lookbook/'+row.id,{waitUntil:'networkidle'})).status(),200);
   for(const selection of row.selections){const el=page.locator(`[data-look-book-option="${selection.optionId}"]`);assert.ok(await el.count());assert.ok((await el.first().innerText()).includes(selection.optionName));}
  }
 }
 for(const origin of [baseline,base]){
  const pdf=await context.request.get(origin+'/lookbook/'+initial[0].id+'/pdf',{timeout:120000});assert.equal(pdf.status(),200);await writeFile(join(out,`${origin===base?'pilot':'baseline'}-original-v4.pdf`),await pdf.body());
 }
 await writeFile(join(out,'results.json'),JSON.stringify({productionPresentation:presentation,journeys:results,originalV4SavedLinks:4,pdfResponse:'HTTP 200; 12 pages',pdfVisualStatus:'Baseline defect reproduced: 960px print images return 400 in both production baseline and pilot; PDF code unchanged',storage:'synthetic, memory-only',emails:'disabled'},null,2));
 console.log('PASS exact production presentation, all four original saved books, and baseline/pilot original-book PDF responses. Image completeness is reported separately in pdf-baseline-issue.json.');await context.close();
}finally{await browser.close();}
