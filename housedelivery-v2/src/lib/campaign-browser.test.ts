import assert from "node:assert/strict";
import test from "node:test";
import { captureCampaignAttribution, consumeCampaignConversions, storeCampaignReceipt } from "@/lib/campaign-browser";
class MemoryStorage { data = new Map<string,string>(); getItem(key:string) { return this.data.get(key) ?? null; } setItem(key:string,value:string) { this.data.set(key,value); } removeItem(key:string) { this.data.delete(key); } }
test("attribution honors consent, retains first/latest touches, and only accepted submissions create one conversion", () => {
  const local = new MemoryStorage(); const session = new MemoryStorage();
  const nav = { doNotTrack: "0", globalPrivacyControl: false };
  const loc = { search: "?utm_source=google&utm_campaign=first&gclid=TEST_click" };
  const names = ["localStorage", "sessionStorage", "navigator", "location", "window"];
  const descriptors = names.map(name => Object.getOwnPropertyDescriptor(globalThis,name));
  for (const [name,value] of Object.entries({ localStorage:local, sessionStorage:session, navigator:nav, location:loc, window:{ dispatchEvent:()=>true } })) Object.defineProperty(globalThis,name,{ configurable:true,value });
  try {
    assert.deepEqual(captureCampaignAttribution("custom-homes"),{consent:"unset"}); assert.equal(local.data.size,0);
    local.setItem("house-delivery:analytics-consent:v1","accepted");
    const first = captureCampaignAttribution("custom-homes");
    assert.equal(first.firstTouch?.utm_campaign,"first");
    assert.deepEqual(captureCampaignAttribution("custom-homes"),first,"retry attribution is stable");
    loc.search="?utm_source=google&utm_campaign=return";
    const last=captureCampaignAttribution("laneway-carriage-homes");
    assert.equal(last.firstTouch?.utm_campaign,"first"); assert.equal(last.latestTouch?.utm_campaign,"return");
    const sent:string[]=[];
    consumeCampaignConversions(ref=>sent.push(ref)); assert.equal(sent.length,0,"page visits are not leads");
    const ref="a96dc47f-8e49-4d08-880a-497b1cb84dc2";
    storeCampaignReceipt(ref,"custom-homes");
    consumeCampaignConversions(r=>sent.push(r)); consumeCampaignConversions(r=>sent.push(r));
    storeCampaignReceipt(ref,"custom-homes"); consumeCampaignConversions(r=>sent.push(r));
    assert.deepEqual(sent,[ref],"refresh and repeat acceptance cannot double count");
    nav.globalPrivacyControl=true;
    assert.deepEqual(captureCampaignAttribution("custom-homes"),{consent:"declined"});
    assert.equal(local.getItem("house-delivery:campaign-first:v1"),null);
    storeCampaignReceipt("b96dc47f-8e49-4d08-880a-497b1cb84dc2","custom-homes");
    nav.globalPrivacyControl=false; consumeCampaignConversions(r=>sent.push(r)); assert.equal(sent.length,1,"no retroactive conversion after denied submission");
  } finally { names.forEach((name,i)=> { const descriptor=descriptors[i]; if(descriptor) Object.defineProperty(globalThis,name,descriptor); else Reflect.deleteProperty(globalThis,name); }); }
});
