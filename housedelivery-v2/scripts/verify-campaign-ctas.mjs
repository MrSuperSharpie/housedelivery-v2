import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
const base=process.env.CTA_QA_URL||"http://localhost:3146";
const output="/private/tmp/cta-balanced-qa";await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true});
const results=[];
try {
 for(const campaign of ["custom-homes","laneway-carriage-homes"]){
  for(const width of [1440,390,320]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:"reduce"});const page=await context.newPage();const errors=[];let leads=0;
   page.on("pageerror",e=>errors.push(e.message));
   await page.route("**/api/build-your-home-inquiries",r=>{
    if(r.request().method()==="GET")return r.fulfill({json:{token:"cta-test"}});
    const body=r.request().postDataJSON();
    if(body.action==="property_review")return r.fulfill({json:{reviewToken:"cta-review",propertySnapshot:{status:"yellow",statusLabel:"REVIEW IN PROGRESS",headline:"We’re taking a closer look.",address:body.propertyAddress,municipality:body.municipality,propertyType:"Requires review",opportunity:"Human review required",message:"A closer look is needed.",modelMatchStatus:"REVIEW_PENDING"}}});
    leads++;return r.fulfill({status:500,json:{error:"Unexpected submission"}});
   });
   const laneway=campaign!=="custom-homes";const label=laneway?"Start a Free Property Check":"Start Your Home Inquiry";
   await page.goto(`${base}/build-your-home/${campaign}`,{waitUntil:"networkidle"});
   await page.getByRole("button",{name:"Essential only",exact:true}).click();
   const hero=page.locator("main > section").first();const form=page.getByRole("form");
   assert.equal(await hero.getByRole("link",{name:label,exact:true}).count(),0,"no redundant hero button");
   assert.equal(await page.locator('header a[href="#project-inquiry"]').count(),0,"no redundant header button");
   assert.equal(await hero.getByText(laneway?"Start with your property.":"Let’s start with your plans.",{exact:true}).count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.screenshot({path:`${output}/${campaign}-${width}.png`});
   const bottomSection=page.locator("main > section").last();const bottom=bottomSection.getByRole("link",{name:label});
   await bottomSection.scrollIntoViewIfNeeded();
   if(width<700)await page.locator('div[class*="mobileCta"]').waitFor({state:"visible"});
   await bottom.click();await page.waitForFunction(()=>document.activeElement?.getAttribute("name")==="municipality");
   if(width<700)await page.waitForFunction(()=>!document.querySelector('div[class*="mobileCta"]'));
   await form.getByLabel("City or municipality").fill("Victoria");
   await page.locator('a[href="#project-inquiry"]').filter({hasText:/^Discuss /}).first().click();
   assert.equal(await form.getByText(/Your interest:/).count(),1);
   await page.waitForFunction(name=>document.activeElement?.getAttribute("name")===name,laneway?"propertyAddress":"ownership");
   if(laneway){await form.getByLabel("Property address").fill("123 Example Street");await form.getByLabel("Type of home").selectOption("Laneway home");}
   await form.getByLabel("Do you own the property?").selectOption("Yes, I own the property");await form.getByLabel("Anticipated construction timeline").selectOption("6–12 months");
   await form.getByRole("button",{name:laneway?"Check My Property":"Continue",exact:true}).click();
   await form.getByLabel("Full name").fill("CTA QA");await bottom.click();
   await page.waitForFunction(()=>document.activeElement?.getAttribute("name")==="email");
   assert.equal(await form.getByLabel("Full name").inputValue(),"CTA QA");assert.equal(await form.getByLabel("City or municipality").inputValue(),"Victoria");
   await bottom.focus();await page.keyboard.press("Enter");await page.waitForFunction(()=>document.activeElement?.getAttribute("name")==="email");
   assert.equal(leads,0);assert.deepEqual(errors,[]);
   results.push({campaign,width,noHeroButton:true,bottomCta:true,mobileVisibility:true,keyboard:true,valuesPreserved:true,noLeadSent:true});await context.close();
  }
 }
 await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
