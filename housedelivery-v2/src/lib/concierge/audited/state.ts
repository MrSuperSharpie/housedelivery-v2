import {createHmac,timingSafeEqual} from 'node:crypto';
import {knowledgeVersion,modelIndex} from './registry';
import {toSqft,type MatchConstraints} from './matching';
export type Area={value:number;unit:'sf'|'m2';sqft:number;basis:'published'|'internal'|'footprint'|'chargeable'|'unknown'};
export type Preferences={audience:string;role:string;location:string;province:string;land:string;builder:boolean;family:'architectural'|'compact'|'cmhc_catalogue';homes:number;phasing:string;unitsPerBuilding:number;bedrooms:number;bedroomMode:'exact'|'minimum';bedroomBasis:'per_home'|'per_unit';bathroomsMin:number;storeys:number;study:boolean;accessibility:boolean;areaTarget:Area;areaMax:Area;areaMin:Area;selectedModel:string;comparedModels:string[];finish:string;budgetAmount:number;budgetCurrency:string;budgetScope:string;targetDate:string;funding:string;declinedContact:boolean;declinedQuestions:string[];requestedAction:string;avoidLarger:boolean};
export type Patch=Partial<Preferences>;
export type State={version:string;session:string;expires:number;turn:number;values:{[K in keyof Preferences]?:{value:Preferences[K];sourceTurn:number;status:'visitor_reported'}};recommended:string[];scopeExplained:boolean;lastQuestion:string;lastArithmetic:{area:number;rate:number}|null;lastTopic?:string;lastEvidenceRefs?:string[]};
export function initialState(session:string,now=Date.now()):State{return{version:knowledgeVersion,session,expires:now+3600_000,turn:0,values:{},recommended:[],scopeExplained:false,lastQuestion:'',lastArithmetic:null}}
export function stateValue<K extends keyof Preferences>(s:State,key:K):Preferences[K]|undefined{return s.values[key]?.value}
export function conversationContext(s:State){return{turn:s.turn,values:s.values,recommended:s.recommended,scopeExplained:s.scopeExplained,lastQuestion:s.lastQuestion,lastArithmetic:s.lastArithmetic,lastTopic:s.lastTopic,lastEvidenceRefs:s.lastEvidenceRefs}}
export function signState(s:State,secret:string){const payload=Buffer.from(JSON.stringify(s)).toString('base64url');return payload+'.'+createHmac('sha256',secret).update('hd-concierge-state:'+payload).digest('hex')}
export function readState(raw:unknown,session:string,secret:string,now=Date.now()):State{
  if(raw===undefined||raw==='')return initialState(session,now);
  if(typeof raw!=='string'||raw.length>14000)throw Error('Invalid signed conversation');const [payload,signature,extra]=raw.split('.');if(extra||!/^[a-f0-9]{64}$/.test(signature??''))throw Error('Invalid signed conversation');
  const expected=createHmac('sha256',secret).update('hd-concierge-state:'+payload).digest('hex');if(!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw Error('Invalid signed conversation');
  const s=JSON.parse(Buffer.from(payload,'base64url').toString()) as State;if(s.version!==knowledgeVersion||s.session!==session||s.expires<now||s.turn>16)throw Error('Invalid signed conversation');return s;
}
const wordNumbers:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,ten:10,twenty:20,fifty:50,hundred:100};
export function namedModels(q:string){return [...modelIndex.values()].filter(m=>new RegExp('\\b'+m.name.replace(/^the /i,'').replace(/\s+(house|duplex)$/i,'').trim().replaceAll(' ','\\s+')+'\\b','i').test(q)).map(m=>m.id)}
export function deterministicPatch(q:string,s:State):Patch{
  const p:Patch={},lower=q.toLowerCase(),num=(x:string)=>(x.toLowerCase()==='one hundred'?100:wordNumbers[x.toLowerCase()]??Number(x.replaceAll(',','')));
  const bed=[...q.matchAll(/\b(one|two|three|four|five|six|seven|eight|\d+)[ -]?(?:bedrooms?|beds?|br)\b/gi)].at(-1);if(bed){p.bedrooms=num(bed[1]);p.bedroomMode=/at least|minimum|or more/i.test(q)?'minimum':'exact'}
  const bath=q.match(/\b(one|two|three|four|five|\d+(?:\.\d+)?)[ -]?(?:bathrooms?|baths?)\b/i);if(bath)p.bathroomsMin=num(bath[1]);
  if(/no stairs|single.storey|one.storey/i.test(q))p.storeys=1;
  const storey=q.match(/\b(two|three|\d)[ -]storey/i);if(storey)p.storeys=num(storey[1]);
  if(/\bADU\b|laneway|carriage|backyard|\bsmall (?:home|one.bed|two.bed)|\bcompact (?:home|housing)/i.test(q))p.family='compact';
  if(/detached|not a duplex|myself|my family|our family/i.test(q)){p.family='architectural';p.unitsPerBuilding=1;p.bedroomBasis='per_home'}
  if(/fourplex|sixplex|rowhouse|BC Duplex/i.test(q))p.family='cmhc_catalogue';
  if(/fourplex|four (family )?rentals/i.test(q)){p.family='cmhc_catalogue';p.unitsPerBuilding=4;p.bedroomBasis='per_unit'}
  if(/sixplex/i.test(q)){p.family='cmhc_catalogue';p.unitsPerBuilding=6;p.bedroomBasis='per_unit'}
  const count=q.match(/\b(\d+|twenty|fifty|one hundred)[ +]*(?:homes|rentals|dwellings|units)\b/i);if(count)p.homes=num(count[1]);
  if(/\bstudy\b|\boffice\b/i.test(q))p.study=!/more than a study|instead of.*study|no study|not.*study/i.test(q);
  if(/wheelchair|accessible|accessibility/i.test(q))p.accessibility=true;
  if(/own (?:a |the |our )?(?:land|site|property|lot)|owned (?:land|site)|community.owned/i.test(q))p.land='owned';
  if(/have (?:a |our )?(?:builder|general contractor)|use (?:my|our) own builder|already have a builder/i.test(q))p.builder=true;
  if(/do not want.*email|don't want.*email|no (?:email|contact)|decline.*contact|not.*give.*(?:email|phone)/i.test(q))p.declinedContact=true;
  if(/stop suggesting big|not.*larger|keep the size firm/i.test(q))p.avoidLarger=true;
  if(/funding is not approved|funding.*pending|not.*approved.*funding/i.test(q))p.funding='not approved — visitor report';
  const area=[...q.matchAll(/\b([\d,]+(?:\.\d+)?)\s*(k)?\s*(?:square (feet|metres|meters)|sq\.?\s*(ft|m)|sf\b|m²)/gi)].at(-1);
  if(area){const value=num(area[1])*(area[2]?1000:1),unit=/met|m²|sq\.?\s*m/i.test(area[0])?'m2':'sf',basis=/internal|living area/i.test(q)?'internal':/footprint/i.test(q)?'footprint':/chargeable/i.test(q)?'chargeable':'published';const a:Area={value,unit,sqft:toSqft(value,unit),basis};if(/maximum|\bmax\b|ceiling|no more than|at most|under/i.test(q))p.areaMax=a;else if(/minimum|at least.*(?:feet|sf|m²)/i.test(q))p.areaMin=a;else p.areaTarget=a;}
  if(/keep (?:the )?size firm|hard (?:size|ceiling|limit)/i.test(q)&&!p.areaMax&&stateValue(s,'areaTarget'))p.areaMax=stateValue(s,'areaTarget');
  if(!p.family&&!stateValue(s,'family')&&(p.areaTarget?.sqft??p.areaMax?.sqft??Infinity)<=1200&&(p.bedrooms??stateValue(s,'bedrooms')??9)<=2)p.family='compact';
  const ids=namedModels(q);if(ids.length===1)p.selectedModel=ids[0];if(ids.length>1)p.comparedModels=ids.slice(0,3);
  if(!ids.length&&/\b(that one|that home|that design|it)\b/i.test(q)){if(stateValue(s,'selectedModel'))p.selectedModel=stateValue(s,'selectedModel');else if(s.recommended.length===1)p.selectedModel=s.recommended[0];}
  if(!ids.length&&/\bfirst (one|design|home)\b/i.test(q)&&s.recommended[0])p.selectedModel=s.recommended[0];
  if(!ids.length&&/\bsecond (one|design|home)\b/i.test(q)&&s.recommended[1])p.selectedModel=s.recommended[1];
  if(/correction|actually|not Vancouver/i.test(q)&&/Calgary/i.test(q)){p.location='Calgary';p.province='Alberta'}
  if(/please tell.*approved funding/i.test(lower)&&/not approved|pending/.test(stateValue(s,'funding')??''))delete p.funding;
  return p;
}
export function mergePatch(s:State,patch:Patch,q:string){
  const combined={...patch,...deterministicPatch(q,s)},turn=s.turn+1,values={...s.values};
  for(const [key,value]of Object.entries(combined))if(value!==null&&value!==undefined)(values as Record<string,unknown>)[key]={value,sourceTurn:turn,status:'visitor_reported'};
  if(/please tell.*approved funding/i.test(q)&&/not approved|pending/.test(stateValue(s,'funding')??''))values.funding=s.values.funding;
  return {...s,values,turn};
}
export function constraints(s:State):MatchConstraints{
  const v=<K extends keyof Preferences>(key:K)=>stateValue(s,key),family=v('family')??'architectural',basis=v('areaMax')?.basis??v('areaTarget')?.basis??'published';
  const perUnit=v('bedroomBasis')==='per_unit';
  return{family,units:v('unitsPerBuilding')??(family==='cmhc_catalogue'?null:1),bedrooms:perUnit?undefined:v('bedrooms'),minimumBedrooms:v('bedroomMode')==='minimum',bedroomsPerUnit:perUnit?v('bedrooms'):undefined,bathroomsMin:v('bathroomsMin'),storeys:v('storeys'),targetSqft:v('areaTarget')?.sqft,maxSqft:v('areaMax')?.sqft,minSqft:v('areaMin')?.sqft,areaBasis:basis==='internal'?'internal':'published',unsupportedAreaBasis:!['internal','published'].includes(basis),study:v('study')};
}
export function projectSummary(s:State){const names:Partial<Record<keyof Preferences,string>>={funding:'Funding (visitor report)',audience:'Planning as',role:'Role',location:'Location',province:'Province',land:'Land/site',family:'Housing',homes:'Approximate homes',phasing:'Phasing',bedrooms:'Bedrooms',builder:'Existing builder',targetDate:'Target timing',finish:'Design direction'};const lines=Object.entries(names).flatMap(([key,label])=>{const slot=s.values[key as keyof Preferences];return slot?[`${label}: ${String(slot.value)}`]:[]});const selected=stateValue(s,'selectedModel');if(selected)lines.splice(1,0,'Selected design: '+modelIndex.get(selected)!.name);for(const key of ['areaTarget','areaMax','areaMin'] as const){const a=stateValue(s,key);if(a)lines.push(`${key==='areaMax'?'Hard maximum':key==='areaMin'?'Minimum':'Target'}: ${a.value} ${a.unit}, ${a.basis} basis`)}return lines.join('\n').slice(0,1200)}
