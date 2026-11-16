import {visitorEvidence,hasHouseholdDetail} from './visitor-context';
import {knowledge,modelIndex,factIndex,safeLink,type Model} from './registry';
import {shortlist,compactInventoryRequested} from './matching';
import {constraints,stateValue,namedModels,hasMatchPreferences,type State} from './state';
import type {Intent} from './intent';
import {selectHandbook} from './handbook';
import {publicFactContent,publicModelContent} from './publication';
import {topics,cmhcRelevant,chatLimits} from './response-plan';
export type Evidence={id:string;data:unknown;sourceIds:string[]};
const topicFacts:Record<Intent['topic'],string[]>={company:['F-COMPANY','F-MARKETS','F-START'],matching:['F-CUSTOMIZATION','F-PROPERTY'],specifications:[],comparison:[],customization:['F-CUSTOMIZATION','F-STUDIO','F-INCLUSIONS','F-ESSENTIAL'],pricing:['F-PRICE','F-SCOPE','F-EXCLUSIONS'],arithmetic:['F-PRICE','F-SCOPE','F-EXCLUSIONS'],process:['F-PROCESS','F-PARALLEL','F-TIMING'],scope:['F-SCOPE','F-EXCLUSIONS','F-APPLIANCES'],property:['F-PROPERTY','F-START'],community:['F-MARKETS','F-PORTFOLIO','F-PROCESS'],builder:['F-BUILDER','F-COMPANY','F-SCOPE','F-ORIGIN','F-PROCESS'],origin:['F-ORIGIN','F-SYSTEMS'],warranty:['F-WARRANTY'],terms:['F-CMHC','F-CMHC-INDEPENDENT','F-TECHNICAL'],contact:['F-CONTACT','F-PRIVACY','F-START'],summary:['F-CONTACT','F-PRIVACY'],clarify:['F-START'],unrelated:['F-START']};
export function retrieve(intent:Intent,state:State,question:string){
  const rawMatch=shortlist(constraints(state),/known (size|area)|published (size|area)|known floor area/i.test(question)?knowledge.models.filter(m=>m.numeric_area_matching_allowed&&m.area_sqft!==null):knowledge.models,.1,(stateValue(state,'bedroomOptions')?.length??0)>1?3:2),ids=namedModels(question);
  const exploratory=!hasMatchPreferences(state)&&hasHouseholdDetail(state)&&topics(intent).includes('matching');
  const match={...(topics(intent).includes('matching')&&(hasMatchPreferences(state)||exploratory)?rawMatch:{...rawMatch,matches:[],outsideTargetAlternatives:[]}),exploratory,searched:topics(intent).includes('matching')&&(hasMatchPreferences(state)||exploratory)};
  if(ids.length){match.matches=match.matches.filter(m=>ids.includes(m.id));match.outsideTargetAlternatives=match.outsideTargetAlternatives.filter(m=>ids.includes(m.id));}
  let models:Model[]=[];
  if(intent.unconfirmedProduct)models=[];
  else if(compactInventoryRequested(question))models=knowledge.models.filter(m=>m.family==='laneway_carriage'||m.family==='cmhc_catalogue'&&m.units===1);
  else if(ids.length)models=ids.map(id=>modelIndex.get(id)!);
  else if(topics(intent).includes('matching'))models=match.matches;
  else if(intent.modelContext==='follow_up'&&state.recommended.length&&/\b(?:them|their|those|these|both|first two)\b/i.test(question))models=state.recommended.map(id=>modelIndex.get(id)!).filter(Boolean);
  else if(intent.modelContext!=='none'&&stateValue(state,'selectedModel'))models=[modelIndex.get(stateValue(state,'selectedModel')!)!];
  else if(intent.modelContext!=='none'&&state.recommended.length&&['specifications','comparison','customization','arithmetic'].includes(intent.topic))models=state.recommended.map(id=>modelIndex.get(id)!).filter(Boolean);

  if(intent.topic==='comparison'&&ids.length===1)models=[...models,...state.recommended.filter(id=>!ids.includes(id)).map(id=>modelIndex.get(id)!).filter(Boolean)].slice(0,2);
  if(/main.level|main.floor|ground.floor/i.test(question)&&models.length>1){const suited=models.filter(m=>m.features.some(f=>/main.level.*(suite|bedroom)|main.floor.*suite|ground.floor.*(bedroom|suite)/i.test(f)));if(suited.length)models=suited;}
  const requestedFacts=[...new Set([...topics(intent).flatMap(t=>topicFacts[t]),...intent.factIds])];
  if(/includ|kit|package|source locally|local.*(?:supply|responsibilit)/i.test(question))requestedFacts.push('F-SCOPE','F-EXCLUSIONS','F-INCLUSIONS','F-BUILDER');
  if(/building code|code complian|permit|regulat|certific/i.test(question))requestedFacts.push('F-TECHNICAL','F-BUILDER','F-SYSTEMS');
  if(intent.topic==='community'&&/Nation|Indigenous/i.test(question+' '+(stateValue(state,'audience')??'')+' '+(stateValue(state,'role')??'')))requestedFacts.push('F-NATIONS','F-PARTICIPATION','F-FUNDING');
  if(/funding|grant/i.test(question))requestedFacts.push('F-FUNDING','F-START');
  if(/local jobs|training|local participation|employment|skills/i.test(question))requestedFacts.push('F-PARTICIPATION');
  if(/Essential|Premium|Signature/i.test(question))requestedFacts.unshift('F-ESSENTIAL');
  if(/show.?home|rendering|gallery|completed.*project/i.test(question))requestedFacts.push('F-IMAGES','F-CONTACT');
  if(/good value|savings|better value/i.test(question))requestedFacts.push('F-COMPANY','F-PARALLEL','F-SYSTEMS');
  if(models.some(m=>m.conflicts?.length))requestedFacts.push('F-CATALOG-CONFLICTS');
  if(models.some(m=>m.family==='cmhc_catalogue'))requestedFacts.push('F-CMHC');
  if(intent.topic==='pricing'||intent.topic==='arithmetic')requestedFacts.push('F-PRICE','F-SCOPE','F-EXCLUSIONS');
  if(intent.topic==='origin')requestedFacts.push('F-ORIGIN');
  if(intent.topic==='warranty')requestedFacts.push('F-WARRANTY');
  const deliveryOnly=/freight|shipping|\bdelivery\b|\bdeliver\b/i.test(question)&&!/sq\.?|square|per foot|Premium|Signature|package rate|planning rate|kit price|package pric/i.test(question);
  const cmhc=cmhcRelevant(intent,question,models.map(m=>m.id));
  const facts=[...new Set(requestedFacts)].filter(id=>!deliveryOnly||id!=='F-PRICE').filter(id=>cmhc||!['F-CMHC','F-CMHC-INDEPENDENT','F-CATALOG-UNIT-MIX','F-CATALOG-CONFLICTS'].includes(id)).map(id=>factIndex.get(id)).filter((x):x is NonNullable<typeof x>=>Boolean(x));
  const studios=intent.topic==='customization'?knowledge.design_studios.filter(s=>models.some(m=>m.id===s.model_id)):[];
  const evidence:Evidence[]=[visitorEvidence(state,question),...selectHandbook(intent,state,question),chatLimits,...(intent.unconfirmedProduct?[{id:'CAPABILITY-LIMIT',data:{text:'Availability of the requested project type requires team confirmation. Chat cannot issue a binding quotation.'},sourceIds:[]}]:[]),...facts.map(f=>({id:f.id,data:factProjection(f),sourceIds:f.source_ids})),...models.map(m=>({id:m.id,data:publicModelContent(m),sourceIds:m.source_ids})),...studios.map(s=>({id:'STUDIO:'+s.model_id,data:{chapters:s.chapters,directions:s.verified_visible_kitchen_directions,qualification:s.qualification},sourceIds:s.source_ids}))];
  return {match,models,facts,studios,evidence};
}
export function modelLine(m:Model){
  const area=m.numeric_area_matching_allowed&&m.area_sqft!==null?`${m.area_conversion?'approximately ':''}${m.area_sqft.toLocaleString('en-CA')} sq. ft. ${m.units>1?'combined building':'published model'} area`:'area requires confirmation';
  const beds=m.bedrooms===null?'bedroom count requires confirmation':`${m.bedrooms} bedrooms${m.bedrooms_basis==='combined_building'?' combined across both residences':m.units>1?' per dwelling':''}`;
  const bath=m.bathrooms===null?'':`; ${m.bathrooms} bathrooms${m.bathrooms_basis==='combined_building'?' combined':m.units>1?' per dwelling':''}`;
  const schedule=m.units>1&&m.unit_schedule?`; ${m.units} dwellings — ${m.unit_schedule.map(u=>`${u.bedrooms}-bed/${u.bathrooms}-bath`).join(', ')}`:'';
  return `${m.name}: ${area}; ${beds}${bath}${schedule}.`;
}
export function modelLink(m:Model,kind:'model'|'studio'|'lookbook'|'floorplan'='model'){const href=kind==='floorplan'&&m.floor_plan_url?m.floor_plan_url:m.url;const link=safeLink(href);return m.family==='architectural'&&kind!=='model'?link.split('#')[0]+(kind==='floorplan'?'#plans':'#home-inclusions'):link}

const factProjection=publicFactContent;
