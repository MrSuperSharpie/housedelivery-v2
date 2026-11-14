import {createHmac,timingSafeEqual} from 'node:crypto';
import {knowledge,knowledgeVersion,modelIndex} from './registry';
import {toSqft,shortlist,type MatchConstraints} from './matching';
export type Area={value:number;unit:'sf'|'m2';sqft:number;basis:'published'|'internal'|'footprint'|'chargeable'|'unknown'};
export type Preferences={audience:string;role:string;operator:string;location:string;province:string;land:string;builder:boolean;constructionScope:string;family:'architectural'|'compact'|'cmhc_catalogue';homes:number;phaseHomes:number;phasing:string;unitsPerBuilding:number;bedrooms:number;bedroomMode:'exact'|'minimum';bedroomBasis:'per_home'|'per_unit';bathroomsMin:number;storeys:number;study:boolean;accessibility:boolean;areaTarget:Area;areaMax:Area;areaMin:Area;selectedModel:string;comparedModels:string[];finish:string;budgetAmount:number;budgetCurrency:string;budgetScope:string;targetDate:string;funding:string;declinedContact:boolean;declinedQuestions:string[];requestedAction:string;avoidLarger:boolean};
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
export function namedModels(q:string){const ids=[...modelIndex.values()].filter(m=>{const title=m.name.replace(/^the /i,'');const name=(m.family==='architectural'?title.replace(/\s+(house|duplex)$/i,''):title.replace(/\s+house$/i,'')).trim().replaceAll(' ','\\s+');const matches=[...q.matchAll(new RegExp('\\b'+name+'\\b','gi'))];return matches.some(hit=>{const before=q.slice(0,hit.index),after=q.slice(hit.index!+hit[0].length);const place=/\b(?:site|land|property|project|location|lot|located|municipality|community|we are|we're|I am|I'm|based|live|build|our family)\b/i.test(q)&&/\b(?:in|near|from|at|for)\s+(?:your\s+)?$/i.test(before);return !place||/interested in\s+$/i.test(before)||/^\s+(?:house|home|model|design)\b/i.test(after)});}).map(m=>m.id);if(/\bcourtyard\s+sixplex\b/i.test(q))ids.push('catalog-sixplex-courtyard');return [...new Set(ids)]}
export function deterministicPatch(q:string,s:State):Patch{
  const p:Patch={},lower=q.toLowerCase(),num=(x:string)=>(x.toLowerCase()==='one hundred'?100:wordNumbers[x.toLowerCase()]??Number(x.replaceAll(',','')));
  if(/\bour Nation\b|\b(?:we|I).{0,25}(?:First Nation|Indigenous community)/i.test(q))p.audience='First Nation / Indigenous community';
  const bed=[...q.matchAll(/\b(one|two|three|four|five|six|seven|eight|\d+)[ -]?(?:bedrooms?|beds?|br)\b/gi)].at(-1);if(bed){p.bedrooms=num(bed[1]);p.bedroomMode=/at least|minimum|or more/i.test(q)?'minimum':'exact'}
  const bath=q.match(/\b(one|two|three|four|five|\d+(?:\.\d+)?)[ -]?(?:bathrooms?|baths?)\b/i);if(bath)p.bathroomsMin=num(bath[1]);
  if(/no stairs|single.storey|one.storey/i.test(q))p.storeys=1;
  const storey=q.match(/\b(two|three|\d)[ -]storey/i);if(storey)p.storeys=num(storey[1]);
  if(/\bADU\b|laneway|carriage|backyard|\bsmall (?:home|one.bed|two.bed)|\bcompact (?:home|housing)/i.test(q))p.family='compact';
  if(/detached|not a duplex|myself|my family|our family/i.test(q)){p.family='architectural';p.unitsPerBuilding=1;p.bedroomBasis='per_home'}
  if(/fourplex|sixplex|rowhouse|BC Duplex/i.test(q))p.family='cmhc_catalogue';
  if(/fourplex|four (family )?rentals/i.test(q)){p.family='cmhc_catalogue';p.unitsPerBuilding=4;p.bedroomBasis='per_unit'}
  if(/sixplex/i.test(q)){p.family='cmhc_catalogue';p.unitsPerBuilding=6;p.bedroomBasis='per_unit'}
  const count=q.match(/\b(\d+|twenty|fifty|one hundred)[ +]*(?:homes|rentals|dwellings|units)\b/i);if(count){const n=num(count[1]);if(stateValue(s,'homes')&&n<stateValue(s,'homes')!&&stateValue(s,'phasing')&&/reserve|phase|first/i.test(q)&&!/total|actually|instead|only/i.test(q))p.phaseHomes=n;else p.homes=n;}
  if(/\bstudy\b|\boffice\b/i.test(q))p.study=!/more than a study|instead of.*study|no study|not.*study/i.test(q);
  if(/wheelchair|accessible|accessibility/i.test(q))p.accessibility=true;
  if(/own (?:a |the |our )?(?:land|site|property|lot)|owned (?:land|site)|community.owned/i.test(q))p.land='owned';
  if(/have (?:a |our )?(?:builder|general contractor)|use (?:my|our) own builder|already have a builder/i.test(q))p.builder=true;
  if(/do not want.*email|don't want.*email|no (?:email|contact)|decline.*contact|not.*give.*(?:email|phone)/i.test(q))p.declinedContact=true;
  if(/stop suggesting big|not.*larger|keep the size firm/i.test(q))p.avoidLarger=true;
  if(/funding is not approved|funding.*pending|not.*approved.*funding/i.test(q))p.funding='not approved — visitor report';
  const areas=[...q.matchAll(/\b([\d,]+(?:\.\d+)?)\s*(k)?\s*(?:square (feet|metres|meters)|sq\.?\s*(ft|m)|sf\b|m²)/gi)],parsed:{index:number;area:Area}[]=[];
  for(let i=0;i<areas.length;i++){const hit=areas[i],before=q.slice(i?areas[i-1].index!+areas[i-1][0].length:0,hit.index),after=q.slice(hit.index!+hit[0].length),value=num(hit[1])*(hit[2]?1000:1),unit=/met|m²|sq\.?\s*m/i.test(hit[0])?'m2':'sf',context=before+' '+after.slice(0,18),basis=/internal|living area/i.test(context)?'internal':/footprint/i.test(context)?'footprint':/chargeable/i.test(context)?'chargeable':'published';const a:Area={value,unit,sqft:toSqft(value,unit),basis};parsed.push({index:hit.index!,area:a});if(/maximum|\bmax\b|ceiling|no more than|at most|under/i.test(before)||/^\s*(?:max|maximum|ceiling)\b/i.test(after))p.areaMax=a;else if(/minimum|at least/i.test(before)||/^\s*minimum\b/i.test(after))p.areaMin=a;else p.areaTarget=a;}
  // A second clause may inherit an explicit unit from the same utterance.
  for(const hit of q.matchAll(/\b(target|maximum|max|ceiling|minimum|min)\b(?:\s+(?:is|of|to|at|around|about))?\s*([\d,]+(?:\.\d+)?)(\s*k)?(?=\s*(?:,|and\b|but\b|still\b|$))/gi)){const reference=parsed.filter(a=>a.index<hit.index!).at(-1)??parsed[0];if(!reference)continue;const value=num(hit[2])*(hit[3]?1000:1),a:Area={...reference.area,value,sqft:toSqft(value,reference.area.unit)};if(/max|ceiling/i.test(hit[1]))p.areaMax=a;else if(/min/i.test(hit[1]))p.areaMin=a;else p.areaTarget=a;}
  if(/keep (?:the )?size firm|hard (?:size|ceiling|limit)/i.test(q)&&!p.areaMax&&stateValue(s,'areaTarget'))p.areaMax=stateValue(s,'areaTarget');
  if(!p.family&&!stateValue(s,'family')&&(p.areaTarget?.sqft??p.areaMax?.sqft??Infinity)<=1200&&(p.bedrooms??stateValue(s,'bedrooms')??9)<=2)p.family='compact';
  const directions=[...new Set(knowledge.design_studios.flatMap(studio=>studio.verified_visible_kitchen_directions.map(d=>d.name)))].filter(name=>q.toLowerCase().includes(name.toLowerCase()));if(directions.length===1)p.finish=directions[0];
  const ids=namedModels(q);if(ids.length===1)p.selectedModel=ids[0];if(ids.length>1)p.comparedModels=ids.slice(0,3);
  if(!ids.length&&/\b(that one|that home|that design|it)\b/i.test(q)){if(stateValue(s,'selectedModel'))p.selectedModel=stateValue(s,'selectedModel');else if(s.recommended.length===1)p.selectedModel=s.recommended[0];}
  if(!ids.length&&/\bfirst (one|design|home)\b/i.test(q)&&s.recommended[0])p.selectedModel=s.recommended[0];
  if(!ids.length&&/\bsecond (one|design|home)\b/i.test(q)&&s.recommended[1])p.selectedModel=s.recommended[1];
  const placeToken="([A-Z][\\p{L}\\p{M}'’.-]*(?:[ -][A-Z][\\p{L}\\p{M}'’.-]*){0,3})";
  const statedPlace=q.match(new RegExp("\\b(?:site|property|land|lot)\\s+(?:is\\s+)?(?:in|near|at)\\s+(?:the\\s+)?"+placeToken,'u'))??q.match(new RegExp("\\b(?:own|have|control)\\s+(?:the|our|a)\\s+"+placeToken+"\\s+(?:site|property|lot)\\b",'u'));
  if(statedPlace&&!/^(?:City|Town|District|Municipality|Village|The)$/i.test(statedPlace[1]))p.location=statedPlace[1].replace(/[.]+$/,'');
  if(/correction|actually|not Vancouver/i.test(q)&&/Calgary/i.test(q)){p.location='Calgary';p.province='Alberta'}
  if(/please tell.*approved funding/i.test(lower)&&/not approved|pending/.test(stateValue(s,'funding')??''))delete p.funding;
  return p;
}
export function mergePatch(s:State,patch:Patch,q:string){
  const explicit=deterministicPatch(q,s),combined={...patch,...explicit},turn=s.turn+1,values={...s.values};
  // Hard numeric/family requirements must be explicit in this utterance; a
  // model-extraction guess cannot silently replace a visitor's constraints.
  for(const key of ['selectedModel','comparedModels','family','unitsPerBuilding','homes','phaseHomes','bedrooms','bedroomMode','bathroomsMin','storeys','study','areaTarget','areaMax','areaMin'] as const)if(!Object.hasOwn(explicit,key))delete combined[key];
  if(!/per[ -](?:unit|dwelling|home|residence)|each (?:unit|dwelling|home|residence)/i.test(q)&&!Object.hasOwn(explicit,'bedroomBasis'))delete combined.bedroomBasis;
  const cues:Partial<Record<keyof Preferences,RegExp>>={audience:/municip|institution|Nation|Indigenous|developer|homeowner|contractor|builder|non.?profit|operator|landowner|facilitator/i,role:/municip|institution|Nation|Indigenous|developer|contractor|builder|operator|landowner|facilitator/i,operator:/operat|non.?profit/i,land:/land|site|property|lot|own|control/i,builder:/builder|contractor/i,funding:/fund|grant/i,declinedContact:/email|phone|contact|consultation|personal review/i,phasing:/phase|stage/i,targetDate:/date|timing|timeline|finish|ready|occupancy|january|february|march|april|may|june|july|august|september|october|november|december|20\d{2}/i,budgetAmount:/budget|\$|money|financ/i,budgetCurrency:/budget|\$|CAD|USD|currency/i,budgetScope:/budget|package|complete|turnkey|total/i,constructionScope:/(?:we|I|our team).*(?:do|handle|supply|provide).*(?:foundation|assembl|appliance|site work|trade)/i,accessibility:/access|wheelchair|mobility|stairs|steps/i,avoidLarger:/larger|bigger|size|firm|limit/i,finish:/finish|kitchen|signature|premium|essential|wardrobe|floor|door|window|countertop/i};
  for(const [key,cue]of Object.entries(cues))if(!cue.test(q)&&!Object.hasOwn(explicit,key))delete combined[key as keyof Preferences];
  if(combined.finish&&!Object.hasOwn(explicit,'finish')&&!/\b(?:like|prefer|want|choose|select|consider)\b/i.test(q))delete combined.finish;
  const normalize=(v:string)=>v.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim(),spoken=normalize(q);
  if(combined.location){const city=combined.location.split(',')[0].trim(),place=normalize(city);if(!place||!spoken.includes(place)||spoken.includes('not '+place)||spoken.includes('rather than '+place))delete combined.location;else combined.location=city;}
  if(combined.province&&!spoken.includes(normalize(combined.province))&&!combined.location&&!Object.hasOwn(explicit,'province'))delete combined.province;
  for(const [key,value]of Object.entries(combined))if(value!==null&&value!==undefined&&JSON.stringify(values[key as keyof Preferences]?.value)!==JSON.stringify(value))(values as Record<string,unknown>)[key]={value,sourceTurn:turn,status:'visitor_reported'};
  if(/please tell.*approved funding/i.test(q)&&/not approved|pending/.test(stateValue(s,'funding')??''))values.funding=s.values.funding;
  const next:State={...s,values,turn};
  const requirementsChanged=['family','unitsPerBuilding','bedrooms','bedroomMode','bedroomBasis','bathroomsMin','storeys','study','areaTarget','areaMax','areaMin'].some(k=>Object.hasOwn(combined,k)&&JSON.stringify(s.values[k as keyof Preferences]?.value)!==JSON.stringify(combined[k as keyof Preferences]));
  const selected=stateValue(next,'selectedModel');
  if(selected&&!stateValue(next,'family')){const m=modelIndex.get(selected)!;values.family={value:m.family==='laneway_carriage'?'compact':m.family,sourceTurn:turn,status:'visitor_reported'};}
  if(requirementsChanged&&selected&&!namedModels(q).length&&!shortlist(constraints(next),[modelIndex.get(selected)!]).matches.length){delete values.selectedModel;next.recommended=[];}
  return next;
}
export function constraints(s:State):MatchConstraints{
  const v=<K extends keyof Preferences>(key:K)=>stateValue(s,key),family=v('family')??'architectural',basis=v('areaMax')?.basis??v('areaTarget')?.basis??'published';
  const perUnit=v('bedroomBasis')==='per_unit';
  return{family,units:v('unitsPerBuilding')??(family==='cmhc_catalogue'?null:1),bedrooms:perUnit?undefined:v('bedrooms'),minimumBedrooms:v('bedroomMode')==='minimum',bedroomsPerUnit:perUnit?v('bedrooms'):undefined,bathroomsMin:v('bathroomsMin'),storeys:v('storeys'),targetSqft:v('areaTarget')?.sqft,maxSqft:v('areaMax')?.sqft,minSqft:v('areaMin')?.sqft,areaBasis:basis==='internal'?'internal':'published',unsupportedAreaBasis:!['internal','published'].includes(basis),study:v('study')};
}
export function projectSummary(s:State){const names:Partial<Record<keyof Preferences,string>>={funding:'Funding (visitor report)',audience:'Planning as',role:'Role',operator:'Prospective operator',location:'Location',province:'Province',land:'Land/site',family:'Housing',homes:'Approximate total homes',phaseHomes:'Proposed phase homes',phasing:'Phasing',bedrooms:'Bedrooms',builder:'Existing builder',constructionScope:'Visitor-proposed construction scope',targetDate:'Target timing',finish:'Design direction'};const lines=Object.entries(names).flatMap(([key,label])=>{const slot=s.values[key as keyof Preferences];return slot?[`${label}: ${key==='family'?({architectural:'Architectural custom home',compact:'ADU / laneway / carriage home',cmhc_catalogue:'CMHC pre-reviewed reference design'}[String(slot.value)]??String(slot.value)):String(slot.value)}`]:[]});const selected=stateValue(s,'selectedModel');if(selected)lines.splice(1,0,'Selected design: '+modelIndex.get(selected)!.name);for(const key of ['areaTarget','areaMax','areaMin'] as const){const a=stateValue(s,key);if(a)lines.push(`${key==='areaMax'?'Hard maximum':key==='areaMin'?'Minimum':'Target'}: ${a.value} ${a.unit}, ${a.basis} basis`)}return lines.join('\n').slice(0,1200)}
