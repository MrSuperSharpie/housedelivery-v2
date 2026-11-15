import {factIndex,modelIndex} from './registry';
import {stateValue,type State} from './state';
export type PolicyStatus='published'|'team_confirmation'|'confidential';
export type PolicyRecord={id:string;subject:string;status:PolicyStatus;text:string;factIds:string[];authority:'approved_public_information'|'owner_confirmation_2026_11_14'};
const fact=(id:string)=>{const f=factIndex.get(id)!;return[f.text,...f.qualifiers].join(' ');};
// Explicit customer-safe policy authority. Silence in a source never creates a rule.
export const policyRecords:readonly PolicyRecord[]=Object.freeze([
 {id:'plant_visit',subject:'Manufacturing-plant visit availability before purchase',status:'team_confirmation',text:'Plant-visit availability and any access arrangements require confirmation from our team; this chat cannot promise a visit.',factIds:[],authority:'owner_confirmation_2026_11_14'},
 {id:'engineering_documents',subject:'Availability and release of project-specific engineering documentation',status:'team_confirmation',text:'The availability and release of project-specific engineering documentation require team confirmation. Factory identities and private factory records remain protected; this does not mean all technical documentation is confidential or unavailable.',factIds:[],authority:'owner_confirmation_2026_11_14'},
 {id:'factory_confidentiality',subject:'Private factory identities and records',status:'confidential',text:'Manufacturing partner identities and private factory records are confidential. We do not confirm or deny relationships with named companies.',factIds:[],authority:'owner_confirmation_2026_11_14'},
 {id:'package_scope',subject:'What a home package includes',status:'published',text:fact('F-SCOPE'),factIds:['F-SCOPE'],authority:'approved_public_information'},
 {id:'local_work',subject:'Local construction, exclusions and project-specific responsibilities',status:'published',text:fact('F-EXCLUSIONS'),factIds:['F-EXCLUSIONS','F-BUILDER'],authority:'approved_public_information'},
 {id:'written_scope',subject:'Recording customer and contractor supply/construction responsibilities',status:'published',text:'The written project scope must establish responsibility for site preparation, foundations, utilities, permits, receiving, installation, completion and handover. Proposed responsibilities need project-team confirmation before becoming an agreed scope.',factIds:['F-SCOPE','F-BUILDER'],authority:'approved_public_information'},
 {id:'finish_tiers',subject:'Essential, Premium and Signature finish tiers and model-family applicability',status:'published',text:fact('F-ESSENTIAL'),factIds:['F-ESSENTIAL'],authority:'approved_public_information'},
 {id:'cmhc_reference',subject:'CMHC pre-reviewed reference plans, terms and local approvals',status:'published',text:fact('F-CMHC'),factIds:['F-CMHC'],authority:'approved_public_information'},
 {id:'appliances',subject:'Appliance budgeting and supply',status:'published',text:fact('F-APPLIANCES'),factIds:['F-APPLIANCES'],authority:'approved_public_information'},
 {id:'design_changes',subject:'Kitchen, finish, layout and architectural customization',status:'published',text:fact('F-CUSTOMIZATION')+' Layout, structural and exterior changes need project-specific review; a visual choice does not authorize structural work.',factIds:['F-CUSTOMIZATION'],authority:'approved_public_information'},
 {id:'studio_lookbook',subject:'Using Design Studio and Look Books; design intent versus construction documents',status:'published',text:fact('F-STUDIO')+' A Look Book is not final construction drawings or a priced purchase order.',factIds:['F-STUDIO'],authority:'approved_public_information'},
 {id:'builder_collaboration',subject:'Working with a customer who is a builder/general contractor',status:'published',text:'House Delivery welcomes discussion with builders and general contractors. The general contractor remains responsible for local site execution, trades and construction management under the agreed scope.',factIds:['F-BUILDER'],authority:'approved_public_information'},
 {id:'program_phasing',subject:'Multi-home programs, quantities and phases',status:'published',text:'A housing program can be discussed as home types, quantities and phases. The housing mix, roles, timing and capacity require project-specific assessment; discussing a program does not reserve production or guarantee delivery dates.',factIds:['F-PORTFOLIO','F-START'],authority:'approved_public_information'},
 {id:'freight_quotation',subject:'Freight pricing and the information needed for delivery review',status:'published',text:'Freight and applicable import costs are established in the written project quotation. Delivery access, receiving arrangements and special logistics need review with the selected design or package and the delivery location.',factIds:['F-SCOPE','F-EXCLUSIONS'],authority:'approved_public_information'},
 {id:'pricing_scope',subject:'Published package planning rates versus completed construction costs',status:'published',text:'These are CAD home-package planning references, not completed-home prices or binding quotations. Model applicability, chargeable area, selected scope and delivery require a written quotation.',factIds:['F-PRICE','F-SCOPE'],authority:'approved_public_information'},
 {id:'project_review',subject:'What is needed to start or advance a project review',status:'published',text:'A property, idea or preferred model is enough to start a conversation. The next review establishes the site context, local requirements, housing mix, scope and delivery pathway; an inquiry creates no purchase commitment.',factIds:['F-START','F-PROPERTY'],authority:'approved_public_information'},
 {id:'technical_review',subject:'Building codes, local engineering, permits and technical suitability',status:'published',text:fact('F-TECHNICAL'),factIds:['F-TECHNICAL','F-BUILDER'],authority:'approved_public_information'},
 {id:'manufacturing_approach',subject:'Component construction, domestic/international manufacturing and Canadian assembly',status:'published',text:fact('F-ORIGIN'),factIds:['F-ORIGIN','F-SYSTEMS'],authority:'approved_public_information'},
 {id:'warranty',subject:'Warranty scope and supporting documentation',status:'published',text:fact('F-WARRANTY'),factIds:['F-WARRANTY'],authority:'approved_public_information'},
 {id:'unrecorded_policy',subject:'Any company practice or availability rule not established in another approved policy record',status:'team_confirmation',text:'Our team needs to confirm that specific arrangement and its terms. The absence of published information does not establish that it is available or unavailable.',factIds:[],authority:'owner_confirmation_2026_11_14'}
]);
export const policyIndex=new Map(policyRecords.map(p=>[p.id,p]));
export const policyIntentIndex=policyRecords.map(({id,subject,status})=>({id,subject,status}));
export function renderPolicies(ids:string[],state:State){
 return [...new Set(ids)].map(id=>{
  const record=policyIndex.get(id);if(!record)throw Error('Unapproved company policy');
  let text=record.text;
  if(id==='written_scope'&&stateValue(state,'constructionScope'))text='Your proposed responsibilities ('+stateValue(state,'constructionScope')+') should be recorded in the written project scope and confirmed with the project team. '+record.text;
  if(id==='program_phasing'&&stateValue(state,'homes'))text='For your proposed '+stateValue(state,'homes')+'-home program'+(stateValue(state,'location')?' in '+stateValue(state,'location'):'')+(stateValue(state,'targetDate')?', targeting '+stateValue(state,'targetDate'):'')+(stateValue(state,'phasing')?', with '+stateValue(state,'phasing'):'')+': '+record.text;
  if(id==='freight_quotation'&&stateValue(state,'location'))text='For delivery to '+stateValue(state,'location')+(stateValue(state,'province')&&stateValue(state,'province')!==stateValue(state,'location')?', '+stateValue(state,'province'):'')+': '+record.text;
  if(id==='project_review'){
   const model=modelIndex.get(stateValue(state,'selectedModel')??''),max=stateValue(state,'areaMax'),beds=stateValue(state,'bedrooms');
   const brief=[model?.name,stateValue(state,'location'),stateValue(state,'homes')?stateValue(state,'homes')+' proposed homes':null,stateValue(state,'targetDate')?'target timing '+stateValue(state,'targetDate'):null,beds?beds+' bedrooms':null,max?'a hard maximum of '+max.value+' '+max.unit:null,stateValue(state,'land')==='owned'?'land already owned':null].filter(Boolean).join(', ');
   if(brief)text='Your current brief: '+brief+'. '+record.text;
  }
  if(id==='studio_lookbook'&&stateValue(state,'householdNeeds'))text+=' Keep your stated priorities ('+stateValue(state,'householdNeeds')+') in the project brief for review.';
  return{id:record.id,status:record.status,text,evidenceRefs:record.factIds};
 });
}
