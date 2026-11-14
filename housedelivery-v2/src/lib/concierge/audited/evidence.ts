import {knowledge,modelIndex,factIndex,publicModel,safeLink,type Model} from './registry';
import {shortlist,compactInventoryRequested} from './matching';
import {constraints,stateValue,namedModels,type State} from './state';
import type {Intent} from './intent';
export type Evidence={id:string;data:unknown;sourceIds:string[]};
const topicFacts:Record<Intent['topic'],string[]>={company:['F-COMPANY','F-MARKETS','F-START'],matching:['F-CUSTOMIZATION'],specifications:[],comparison:[],customization:['F-CUSTOMIZATION','F-STUDIO','F-INCLUSIONS','F-ESSENTIAL'],pricing:['F-PRICE','F-SCOPE','F-EXCLUSIONS'],arithmetic:['F-PRICE','F-SCOPE','F-EXCLUSIONS'],process:['F-PROCESS','F-PARALLEL','F-TIMING'],scope:['F-SCOPE','F-EXCLUSIONS','F-APPLIANCES'],property:['F-PROPERTY','F-START'],community:['F-MARKETS','F-PORTFOLIO','F-PROCESS'],builder:['F-BUILDER','F-COMPANY','F-SCOPE','F-ORIGIN','F-PROCESS'],origin:['F-ORIGIN','F-SYSTEMS'],warranty:['F-WARRANTY'],terms:['F-CMHC','F-CMHC-INDEPENDENT','F-TECHNICAL'],contact:['F-CONTACT','F-PRIVACY','F-START'],summary:['F-CONTACT','F-PRIVACY'],clarify:['F-START'],unrelated:['F-START']};
export function retrieve(intent:Intent,state:State,question:string){
  const match=shortlist(constraints(state),/known (size|area)|published (size|area)|known floor area/i.test(question)?knowledge.models.filter(m=>m.numeric_area_matching_allowed&&m.area_sqft!==null):knowledge.models),ids=namedModels(question);
  let models:Model[]=[];
  if(compactInventoryRequested(question))models=knowledge.models.filter(m=>m.family==='laneway_carriage'||m.family==='cmhc_catalogue'&&m.units===1);
  else if(ids.length)models=ids.map(id=>modelIndex.get(id)!);
  else if(intent.topic==='matching')models=match.matches;
  else if(stateValue(state,'selectedModel'))models=[modelIndex.get(stateValue(state,'selectedModel')!)!];
  else if(state.recommended.length&&['specifications','comparison','customization','arithmetic'].includes(intent.topic))models=state.recommended.map(id=>modelIndex.get(id)!).filter(Boolean);

  if(intent.topic==='comparison'&&ids.length===1)models=[...models,...state.recommended.filter(id=>!ids.includes(id)).map(id=>modelIndex.get(id)!).filter(Boolean)].slice(0,2);
  if(/main.level|main.floor|ground.floor/i.test(question)&&models.length>1){const suited=models.filter(m=>m.features.some(f=>/main.level.*(suite|bedroom)|main.floor.*suite|ground.floor.*(bedroom|suite)/i.test(f)));if(suited.length)models=suited;}
  const requestedFacts=[...new Set([...topicFacts[intent.topic],...intent.factIds])];
  if(intent.topic==='community'&&/Nation|Indigenous/i.test(question+' '+(stateValue(state,'audience')??'')+' '+(stateValue(state,'role')??'')))requestedFacts.push('F-NATIONS','F-PARTICIPATION','F-FUNDING');
  if(/funding|grant/i.test(question))requestedFacts.push('F-FUNDING','F-START');
  if(/local jobs|training|local participation|employment|skills/i.test(question))requestedFacts.push('F-PARTICIPATION');
  if(/Essential|Premium|Signature/i.test(question))requestedFacts.unshift('F-ESSENTIAL');
  if(/show.?home|rendering|gallery|completed.*project/i.test(question))requestedFacts.push('F-IMAGES','F-CONTACT');
  if(/good value|savings|better value/i.test(question))requestedFacts.push('F-COMPANY','F-PARALLEL','F-SYSTEMS');
  if(models.some(m=>m.family==='cmhc_catalogue'))requestedFacts.push('F-CMHC');
  if(intent.topic==='pricing'||intent.topic==='arithmetic')requestedFacts.push('F-PRICE','F-SCOPE','F-EXCLUSIONS');
  if(intent.topic==='origin')requestedFacts.push('F-ORIGIN');
  if(intent.topic==='warranty')requestedFacts.push('F-WARRANTY');
  const facts=[...new Set(requestedFacts)].map(id=>factIndex.get(id)).filter((x):x is NonNullable<typeof x>=>Boolean(x));
  const studios=intent.topic==='customization'?knowledge.design_studios.filter(s=>models.some(m=>m.id===s.model_id)):[];
  const evidence:Evidence[]=[...facts.map(f=>({id:f.id,data:{text:f.text,qualifiers:f.qualifiers},sourceIds:f.source_ids})),...models.map(m=>({id:m.id,data:publicModel(m),sourceIds:m.source_ids})),...studios.map(s=>({id:'STUDIO:'+s.model_id,data:{chapters:s.chapters,directions:s.verified_visible_kitchen_directions,qualification:s.qualification,availability:s.availability_note,observedSelections:s.selection_count,structure:s.structure??null},sourceIds:s.source_ids}))];
  return {match,models,facts,studios,evidence};
}
export function modelLine(m:Model){
  const area=m.numeric_area_matching_allowed&&m.area_sqft!==null?`${m.area_conversion?'approximately ':''}${m.area_sqft.toLocaleString('en-CA')} sq. ft. ${m.units>1?'combined building':'published model'} area`:'area requires confirmation';
  const beds=m.bedrooms===null?'bedroom count requires confirmation':`${m.bedrooms} bedrooms${m.bedrooms_basis==='combined_building'?' combined across both residences':m.units>1?' per dwelling':''}`;
  const bath=m.bathrooms===null?'':`; ${m.bathrooms} bathrooms${m.bathrooms_basis==='combined_building'?' combined':m.units>1?' per dwelling':''}`;
  const schedule=m.units>1&&m.unit_schedule?`; ${m.units} dwellings — ${m.unit_schedule.map(u=>`${u.bedrooms}-bed/${u.bathrooms}-bath`).join(', ')}`:'';
  return `${m.name}: ${area}; ${beds}${bath}${schedule}.`;
}
export function modelLink(m:Model,kind:'model'|'studio'|'lookbook'|'floorplan'='model'){const href=kind==='floorplan'&&m.floor_plan_url?m.floor_plan_url:m.url;return safeLink(href)+(m.family==='architectural'?(kind==='studio'||kind==='lookbook'?'#home-inclusions':kind==='floorplan'?'#plans':''):'')}
