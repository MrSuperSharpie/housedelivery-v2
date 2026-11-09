import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
const base = process.env.CAMPAIGN_QA_URL || "http://localhost:3145";
const output = "/private/tmp/house-focused-qa";
await mkdir(output,{recursive:true});
const browser = await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true});
const results=[];
try {
 for(const campaign of (process.env.CAMPAIGN_QA_CAMPAIGN ? [process.env.CAMPAIGN_QA_CAMPAIGN] : ["custom-homes","laneway-carriage-homes"])) {
  for(const width of [1440,768,390,320]) {
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:"reduce"});
   const page=await context.newPage(); const errors=[];const tracking=[];let submissions=0;let fail=true;let sent;
   page.on("pageerror",e=>errors.push(e.message));
   page.on("request",r=> {if(/googletagmanager|google-analytics|clarity.ms|snap.licdn/.test(r.url()))tracking.push(r.url());});
   await page.route("**/api/build-your-home-inquiries",route=> {
    if(route.request().method()==="GET")return route.fulfill({json:{token:"mock-token"}});
    const body=route.request().postDataJSON();
    if(body.action === "property_review") return route.fulfill({json:{reviewToken:"mock-review-token",propertySnapshot:{status:"yellow",statusLabel:"REVIEW IN PROGRESS",headline:"We’re taking a closer look.",address:body.propertyAddress,municipality:body.municipality,propertyType:"Property type requires review",opportunity:"Human review required before a recommendation",message:"The available information needs a closer look before a recommendation can be made.",modelMatchStatus:"REVIEW_PENDING"}}});
    submissions++; sent=body;
    return route.fulfill({status:fail?502:200,json:fail?{error:"Delivery unavailable. Please try again."}:{accepted:true,inquiryId:"00000000-0000-4000-8000-000000000001"}});
   });
   const response=await page.goto(`${base}/build-your-home/${campaign}?utm_source=preview-qa&utm_campaign=${campaign}&gclid=TEST_ONLY_click`,{waitUntil:"networkidle"});
   assert.equal(response.status(),200);assert.equal(await page.locator("h1").count(),1);
   assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"),"noindex, nofollow");
   await page.getByRole("button",{name:"Allow analytics",exact:true}).click();
   assert.equal(await page.locator("header nav").count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${campaign}/${width} overflow`);
   for(const img of await page.locator("main img").all()){await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode());}
   await page.evaluate(()=>scrollTo({top:0,behavior:"instant"}));
   await page.screenshot({path:`${output}/${campaign}-${width}.png`});
   if(width===1440 || width===390)await page.screenshot({path:`${output}/${campaign}-${width}-full.png`,fullPage:true});
   for(const link of await page.locator('a[href^="#"]').all())assert.equal(await page.locator(await link.getAttribute("href")).count(),1);
   const form=page.getByRole("form");
   await form.getByRole("button",{name:campaign==="custom-homes"?"Continue":"Check My Property",exact:true}).click();
   assert.equal(await form.getByText("Your project / Step 1 of 2").count(),1);assert.equal(submissions,0);
   await form.getByLabel("City or municipality").fill("Victoria");
   if(campaign==="laneway-carriage-homes"){await form.getByLabel("Type of home").selectOption("Laneway home");await form.getByLabel("Property address").fill("TEST PROPERTY — NOT A REAL LEAD");}
   await form.getByLabel("Do you own the property?").selectOption("Yes, I own the property");
   await form.getByLabel("Anticipated construction timeline").selectOption("6–12 months");
   await form.getByRole("button",{name:campaign==="custom-homes"?"Continue":"Check My Property",exact:true}).click();
   await form.getByLabel("Full name").fill("Preview QA Example");
   await form.getByRole("button",{name:"Back to property details"}).click();
   assert.equal(await form.getByLabel("City or municipality").inputValue(),"Victoria");
   await form.getByRole("button",{name:campaign==="custom-homes"?"Continue":"Check My Property",exact:true}).click();
   assert.equal(await form.getByLabel("Full name").inputValue(),"Preview QA Example");
   if(campaign!=="custom-homes") { assert.equal(await form.getByText("REVIEW IN PROGRESS").count(),1); assert.equal(submissions,0,"property review alone must not send a lead"); }
   await form.getByLabel("Email address").fill("preview-qa@example.com");
   const submit=form.getByRole("button",{name:"Request a Conversation",exact:true});
   await submit.click();await page.getByRole("alert").filter({hasText:"Delivery unavailable"}).waitFor();
   assert.equal(await form.getByLabel("Full name").inputValue(),"Preview QA Example");
   fail=false;await submit.click();await page.waitForURL("**/build-your-home/thank-you");
   await page.getByRole("heading",{name:"Thank you for sharing your plans."}).waitFor();
   assert.equal(submissions,2);assert.equal(sent.campaign,campaign);assert.equal(sent.attribution.firstTouch.utm_source,"preview-qa");assert.equal(sent.attribution.latestTouch.gclid,"TEST_ONLY_click");
   await page.reload();await page.getByRole("heading",{name:"Thank you for sharing your plans."}).waitFor();assert.equal(submissions,2);
   assert.deepEqual(errors,[]);assert.deepEqual(tracking,[],"Preview must never load external tracking tags");
   results.push({campaign,width,passed:true}); await context.close();
  }
 }
 const context=await browser.newContext();const page=await context.newPage();
 await page.goto(`${base}/build-your-home/thank-you`);
 await page.getByRole("heading",{name:"Every great home starts with a conversation."}).waitFor();
 assert.equal(await page.getByText("Your inquiry reference:",{exact:false}).count(),0);
 await context.close();
 await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
