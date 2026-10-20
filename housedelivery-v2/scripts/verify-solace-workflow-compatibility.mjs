import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const base='http://127.0.0.1:3121';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[];
try {
 for(const tier of ['premium','signature']){
  const context=await browser.newContext({viewport:{width:768,height:1024},reducedMotion:'reduce'});const page=await context.newPage();
  await page.goto(`${base}/homes/solace?inclusionTier=${tier}`,{waitUntil:'networkidle'});await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
  const choices=[];
  for(let chapter=0;chapter<7;chapter++){
   const active=page.locator('[data-category-state="active"]');await active.locator('[data-home-option]').first().waitFor();assert.equal(await active.locator('[data-home-option]').count(),4);
   const card=active.locator('[data-home-option]').nth(2);const id=await card.getAttribute('data-home-option');choices.push(id);await card.click();await active.locator('[data-confirm-category]').click();
  }
  await page.locator('[data-look-book-ready="true"]').waitFor();
  const book=page.locator('#home-look-book');await book.getByRole('button',{name:'Edit',exact:true}).first().click();
  const active=page.locator('[data-category-state="active"]');assert.equal(await active.getAttribute('data-home-category'),'kitchen-look-feel');assert.equal(await active.locator('[data-home-option]').count(),4);
  const original=active.locator('[data-home-option]').first();const originalId=await original.getAttribute('data-home-option');await original.click();await active.locator('[data-confirm-category]').click();
  await page.locator('[data-look-book-ready="true"]').waitFor();assert.ok(await book.locator(`[data-look-book-option="${originalId}"]`).count());
  for(const id of choices.slice(1))assert.ok(await book.locator(`[data-look-book-option="${id}"]`).count());
  await page.locator('[data-lookbook-primary-cta]').click();const form=page.locator('#lookbook-email-form');await form.locator('[name="firstName"]').fill('Local Workflow');await form.locator('[name="email"]').fill('workflow@example.invalid');
  const saveWait=page.waitForResponse(r=>r.url()===base+'/api/lookbooks'&&r.request().method()==='POST');await form.locator('[type="submit"]').click();const saveResponse=await saveWait;assert.equal(saveResponse.status(),202);const saved=await saveResponse.json();assert.ok(saved.saved);
  const completion=page.locator('[data-lookbook-lead-capture]');await completion.getByRole('button',{name:'Check My Property',exact:true}).click();
  const property=completion.locator('form').filter({hasText:'Property feasibility'});assert.equal(await property.locator('[name="firstName"]').count(),0);
  await property.locator('[name="municipality"]').fill('Vancouver');await property.locator('[name="postalCode"]').fill('V6B 1A1');await property.locator('[name="propertyStatus"]').selectOption('owned_or_controlled');await property.locator('[name="projectType"]').selectOption('one_home');await property.locator('[name="timing"]').selectOption('within_6_months');
  const propertyWait=page.waitForResponse(r=>r.url()===base+'/api/lookbooks'&&r.request().method()==='POST');await property.getByRole('button',{name:'Submit Property Check'}).click();const response=await propertyWait;assert.ok([200,202].includes(response.status()));const payload=await response.json();assert.equal(payload.configurationId,saved.configurationId);assert.equal(payload.followUpRequested,true);
  await completion.getByText('Request received',{exact:false}).waitFor();
  const rows=await(await fetch('http://127.0.0.1:3122/qa/records')).json();const row=rows.find(n=>n.id===saved.configurationId);assert.equal(row.lead_state,'qualified_inquiry');assert.equal(row.follow_up_source,'property_check');assert.equal(row.selections.length,7);assert.ok(row.selections.every(n=>n.tier===tier));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  results.push({tier,width:768,editingPreservesOtherSelections:true,originalAndNewChoicesMixedWithinTier:true,propertyHandoffPreservesConfigurationId:true,passed:true});await context.close();console.log(`PASS ${tier}: tablet, edit/reconfirm, mixed original/new selection, save and real property/quotation handoff.`);
 }
 await writeFile('../evidence/browser/workflow-results.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
