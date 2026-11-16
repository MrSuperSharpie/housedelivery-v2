// Local SDK fixture for the existing synthesis + support stages. No network.
// These representative replies exercise authority plumbing, not answer quality;
// actual question relevance is separately reviewed on Preview.
import type {LanguageModelV4CallOptions} from '@ai-sdk/provider';
export function policyStageFixture(options:LanguageModelV4CallOptions){
 const schema=options.responseFormat?.type==='json'?options.responseFormat.schema:undefined;
 if(schema?.properties?.patch)return null;
 const raw=options.prompt.find(m=>m.role==='user');
 const input=JSON.parse(raw?.content.filter(p=>p.type==='text').map(p=>p.text).join('')??'{}');
 let output:unknown;
 if(schema?.properties?.answers){
  const samples:Record<string,string>={
   package_scope:'Published windows, kitchens/cabinetry and bathroom fixtures are coordinated options, not confirmed model/package inclusions. The written project quotation confirms the supplied products and exterior cladding; appliances are selected separately.',
   local_work:'House Delivery coordinates Canadian construction with the project team. Foundations, servicing and local trades are separately scoped unless expressly included in the written project quotation. Assembly and erection can be provided as a separate project-specific package.',
   pricing_scope:'These published custom-home planning references are not completed-home prices or binding quotations. Selected scope, chargeable area, structure, location and delivery need a written quotation; exceptional-access delivery is separate.',
   design_changes:'The Studio offers the flooring or glazing design directions it actually presents, not permission to resize or move windows. Proposed layout, openings or structural changes require separate project-specific design and engineering review.'
  };
  output={answers:Object.fromEntries(input.requests.map((r:{id:string;policyIds:string[];question:string})=>{const id=r.policyIds.find(id=>samples[id])??r.policyIds[0];const properties=(schema!.properties!.answers as {properties:Record<string,{properties:Record<string,unknown>}>}).properties[r.id].properties;return[r.id,{text:r.policyIds.includes('package_scope')&&r.policyIds.includes('local_work')?'Published windows and kitchens/cabinetry are coordinated options, not confirmed model/package inclusions; supplied products and cladding need confirmation in the written quotation. Appliances are selected separately. House Delivery coordinates Canadian construction; foundations and local work are separately scoped unless expressly included.':samples[id]??'The written project scope establishes the responsibilities and details that need confirmation.',evidenceRefs:['P:'+id],...(properties.planningRates?{planningRates:['Premium','Signature']}: {})}]})),selectedModelIds:[],nextQuestion:null,nextAction:'none'};
 }else if(schema?.properties?.segments){output={segments:input.proposed.answerSegments.map((_:unknown,index:number)=>({index,supported:true,issues:[]})),followUpSupported:true,complete:true};}
 else throw Error('Unexpected local fixture stage');
 return{content:[{type:'text' as const,text:JSON.stringify(output)}],finishReason:{unified:'stop' as const,raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]};
}
