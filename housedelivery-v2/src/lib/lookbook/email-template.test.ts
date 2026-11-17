import test from "node:test";
import assert from "node:assert/strict";
import { getHomeConfiguratorRegistration } from "@/data/home-configurators";
import { parseCompletedLookBook } from "./domain";
import { designAppreciation, renderCustomerLookBookEmail, verifiedEmailChoices } from "./email-template";
import { completeEmailFixture } from "./email.fixture";

for (const [slug,tier] of [["aurora","signature"],["profile","premium"]] as const) test(`${slug} email recognizes canonical ${tier} choices without inventing selections`,()=>{
 const record=completeEmailFixture(slug,tier),email=renderCustomerLookBookEmail(record,"https://preview.example.com"),choices=verifiedEmailChoices(record);
 assert.equal(choices.length,3);assert.ok(choices.every(c=>record.selections.some(s=>s.optionId===c.optionId)));assert.ok(choices.some(c=>c.tier===tier));assert.match(email.subject,/Look Book\. Beautifully done\./);assert.match(email.html,/HOUSE DELIVERY \| DESIGN STUDIO/);assert.match(email.html,/max-width:620px/);assert.match(email.html,/\[if mso\]/);assert.match(email.html,/house-delivery-logo-tan/);assert.match(email.html,new RegExp('/lookbook/'+record.id));assert.ok(email.html.includes('https://www.housedelivery.ca'+getHomeConfiguratorRegistration('custom-home',slug)!.definition!.lookBook.home.heroImage.src));
 assert.doesNotMatch(email.html,/LET.S BRING IT TO LIFE|Now, imagine|unsubscribe|employee.*review|personally reviewed|subscribed to our/i);
 const forged={...record,selections:record.selections.map(s=>({...s,optionName:"Invented solid-gold fittings",tier:"premium" as const}))};assert.equal(designAppreciation(forged),designAppreciation(record));assert.doesNotMatch(email.text,/solid-gold|employee.*review/);
});
test("limited verified data gets an honest general appreciation and hostile names are escaped",()=>{
 const record=completeEmailFixture();record.configuration={...record.configuration,inclusionSelections:{},flooringSelections:{}};record.contact.firstName='<script>alert("x")</script>';
 const email=renderCustomerLookBookEmail(record,"https://preview.example.com");assert.equal(email.choices.length,0);assert.match(email.text,/personal design direction/);assert.doesNotMatch(email.html,/<script>|Signature kitchen|marble countertop/i);assert.match(email.html,/&lt;script&gt;/);assert.throws(()=>renderCustomerLookBookEmail(record,"javascript:alert(1)"));
});
test("Essential has no active saved Design Studio and cannot acquire invented selections",()=>{
 const record=completeEmailFixture();record.configuration.inclusionSelections[Object.keys(record.configuration.inclusionSelections)[0]]={optionId:"unpublished-essential-option",status:"confirmed"};assert.throws(()=>parseCompletedLookBook("aurora",record.configuration));assert.ok(!getHomeConfiguratorRegistration("pre-approved-home","the-micro")?.definition);
});
