import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3131',store=process.env.QA_STORE_URL||'http://127.0.0.1:3132';
assert.ok([base,store].every(url=>new URL(url).hostname==='127.0.0.1'));
const out=resolve(process.env.QA_OUTPUT_DIR||'../../work/windows-patio-20261020/browser');await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile('public/images/lookbook/windows-patio-doors/boards/manifest.json','utf8'));
const homes=[...new Set(manifest.map(board=>board.home))];assert.equal(homes.length,18);
const results={journeys:[],legacy:[],pdf:[],assets:[]};
let client=0,nextJob=0;
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
async function decode(page,selector){return page.locator(selector).evaluateAll(async nodes=>{nodes.forEach(node=>node.loading='eager');await Promise.all(nodes.map(node=>node.decode()));return nodes.every(node=>node.naturalWidth>0);});}
async function submit(payload){const r=await fetch(base+'/api/lookbooks',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':`192.0.2.${++client}`},body:JSON.stringify(payload)});assert.equal(r.status,202);const body=await r.json();assert.equal(body.saved,true);return body.configurationId;}
async function pdf(id,label,pages){const r=await fetch(`${base}/lookbook/${id}/pdf?disposition=attachment`,{signal:AbortSignal.timeout(180000)});assert.equal(r.status,200,label);assert.match(r.headers.get('content-type'),/application\/pdf/);assert.match(r.headers.get('content-disposition'),/attachment/);const b=Buffer.from(await r.arrayBuffer());assert.ok(b.length>100000);await writeFile(join(out,label+'.pdf'),b);results.pdf.push({id,label,expectedPages:pages,bytes:b.length});console.log('PASS PDF',label,b.length);}
try {
  for(const board of manifest){const r=await fetch(`${base}/images/lookbook/windows-patio-doors/boards/${board.image}`);assert.equal(r.status,200);assert.equal(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'),board.sha256);results.assets.push(board.image);}
  const jobs=homes.flatMap(slug=>['premium','signature'].flatMap(tier=>[390,1440].map(width=>({slug,tier,width}))));
  async function worker(){while(nextJob<jobs.length){const {slug,tier,width}=jobs[nextJob++],duplex=slug==='salt-spring',context=await browser.newContext({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce'}),page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);const ip=`192.0.2.${++client}`;await context.route(base+'/api/lookbooks',route=>route.continue({headers:{...route.request().headers(),'x-forwarded-for':ip}}));try{
    await page.goto(`${base}/homes/${slug}?inclusionTier=${tier}&residenceBTier=${tier==='premium'?'signature':'premium'}`,{waitUntil:'networkidle'});await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
    const ids=await page.locator('[data-home-category]:not([data-category-kind="coordinated"])').evaluateAll(nodes=>nodes.map(node=>node.dataset.homeCategory));assert.equal(ids.length,duplex?14:8);assert.equal(ids.at(-1),'exterior-arrival-openings');assert.ok(ids.includes('windows-patio-doors'));
    const selected=[];
    for(const id of ids){const active=page.locator(`[data-home-category="${id}"][data-category-state="active"]`);const cards=active.locator('[data-home-option]');await cards.first().waitFor();const count=await cards.count();let index=0;
      if(id==='windows-patio-doors'){
        assert.equal(count,duplex?8:4);if(!duplex)assert.equal(await active.locator(`[data-option-level="${tier}"]`).count(),4);
        await active.locator('[data-preview-home-option]').first().click();
        for(let i=0;i<count;i++){const dialog=page.getByRole('dialog');assert.ok(await decode(page,'[role="dialog"] img'));assert.equal(await dialog.locator('[data-show-previous-preview-option]').isDisabled(),i===0);assert.equal(await dialog.locator('[data-show-next-preview-option]').isDisabled(),i===count-1);if(i<count-1)await dialog.locator('[data-show-next-preview-option]').click();}
        await page.locator('[data-close-image-preview]').click();index=duplex?(tier==='signature'?7:3):(width===390?0:3);
        if(['solace','salt-spring'].includes(slug)){await decode(page,'[data-category-state="active"] img');await active.screenshot({path:join(out,`${slug}-${tier}-${width}-choices.png`),animations:'disabled'});}
      } else assert.equal(count,id==='exterior-arrival-openings'&&duplex?1:4);
      const card=cards.nth(index),optionId=await card.getAttribute('data-home-option');await card.click();await active.locator('[data-confirm-category]').click();selected.push({categoryId:id,optionId});
    }
    await page.locator('[data-look-book-ready="true"][data-look-book-personalized="true"]').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const glazing=selected.find(item=>item.categoryId==='windows-patio-doors');assert.ok(await page.locator(`#home-look-book [data-look-book-option="${glazing.optionId}"]`).count());
    await page.locator('[data-lookbook-primary-cta]').click();const form=page.locator('#lookbook-email-form');await form.locator('[name="firstName"]').fill('Local Review');await form.locator('[name="email"]').fill('review@example.invalid');
    const pending=page.waitForResponse(r=>r.url()===base+'/api/lookbooks'&&r.request().method()==='POST');await form.locator('[type="submit"]').click();const response=await pending;assert.equal(response.status(),202);const saved=await response.json();assert.equal(saved.saved,true);assert.equal(saved.emailSent,false);assert.equal(saved.followUpRequested,false);
    const row=(await (await fetch(store+'/qa/records')).json()).find(item=>item.id===saved.configurationId);assert.equal(row.selections.length,ids.length);assert.equal(row.selections.find(item=>item.categoryId==='windows-patio-doors').optionId,glazing.optionId);
    const reopened=await context.newPage();await reopened.goto(`${base}/lookbook/${saved.configurationId}`,{waitUntil:'networkidle'});await reopened.locator('[data-look-book-ready="true"]').waitFor();assert.ok(await reopened.locator(`[data-look-book-option="${glazing.optionId}"]`).count());assert.ok(await decode(reopened,'[data-look-book-print-page] img'));assert.equal(await reopened.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await reopened.close();
    if(['solace','salt-spring'].includes(slug)&&width===1440){const property=await fetch(base+'/api/lookbooks',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':`192.0.2.${++client}`},body:JSON.stringify({intent:'property_check',configurationId:saved.configurationId,property:{municipality:'Vancouver',province:'BC',postalCode:'V6B 1A1',propertyStatus:'owned_or_controlled',projectType:duplex?'multiple_homes':'one_home',...(duplex?{unitCount:2}:{}),timing:'within_6_months'}})});assert.equal(property.status,200);assert.equal((await property.json()).configurationId,saved.configurationId);}
    assert.deepEqual(errors,[]);results.journeys.push({slug,tier,width,id:saved.configurationId,chapters:ids.length,windowsChoice:glazing.optionId,previews:duplex?8:4,savedAndReopened:true});console.log('PASS journey',slug,tier,width);
  }finally{await context.close();}}}
  await Promise.all([worker(),worker()]);
  const records=await(await fetch(store+'/qa/records')).json();
  const legacy=JSON.parse(await readFile('scripts/fixtures/ed69bf3-saved-books.json','utf8'));
  const context=await browser.newContext(),page=await context.newPage();
  for(const row of legacy){await page.goto(`${base}/lookbook/${row.id}`,{waitUntil:'domcontentloaded'});await page.locator('[data-look-book-ready="true"]').waitFor();for(const selection of row.selections)assert.ok(await page.locator(`[data-look-book-option="${selection.optionId}"]`).count());assert.equal(await page.locator('#home-look-book').getAttribute('data-look-book-expected-pages'),'12');results.legacy.push(row.id);}
  await context.close();console.log('PASS legacy saved books',results.legacy.length);
  const sample=records.find(row=>row.home_slug==='solace'&&row.configuration.inclusionSelections['windows-patio-doors']?.optionId==='windows-patio-doors-premium-1');
  for(const tier of ['premium','signature'])for(let number=1;number<=4;number++){
    const configuration=structuredClone(sample.configuration);configuration.inclusionSelections['windows-patio-doors']={optionId:`windows-patio-doors-${tier}-${number}`,status:'confirmed'};
    const id=await submit({intent:'email',homeSlug:'solace',configuration,contact:sample.contact,followUpRequested:false});await pdf(id,`solace-${tier}-${number}`,13);
  }
  for(const tier of ['premium','signature']){const row=records.find(row=>row.home_slug==='salt-spring'&&row.configuration.inclusionSelections['windows-patio-doors']?.optionId===`windows-patio-doors-${tier}-4`);await pdf(row.id,`salt-spring-${tier}`,19);}
  await pdf(legacy.find(row=>row.home_slug==='profile').id,'profile-legacy',12);
}finally{await browser.close();await writeFile(join(out,'results.json'),JSON.stringify(results,null,2));}
