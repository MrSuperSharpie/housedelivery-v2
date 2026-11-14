import {knowledge,type Model} from './registry';
export type MatchConstraints={family:'architectural'|'compact'|'cmhc_catalogue';units:number|null;bedrooms?:number;minimumBedrooms?:boolean;bathroomsMin?:number;storeys?:number;bedroomsPerUnit?:number;targetSqft?:number;maxSqft?:number;minSqft?:number;areaBasis:'published'|'internal';unsupportedAreaBasis?:boolean;study?:boolean};
export function toSqft(value:number,unit:string){if(!Number.isFinite(value)||value<=0)throw Error('Invalid area');if(['m2','m²','sqm','square metres','square meters'].includes(unit.toLowerCase()))return value/0.09290304;if(['sf','sqft','sq ft','sq. ft.','square feet'].includes(unit.toLowerCase()))return value;throw Error('Unknown area unit')}
export function shortlist(c:MatchConstraints,models:Model[]=knowledge.models,tolerance=.1,limit=2){
  if(c.unsupportedAreaBasis)return{matches:[] as Model[],outsideTargetAlternatives:[] as Model[],areaBasis:c.areaBasis,tolerance};
  for(const v of [c.targetSqft,c.maxSqft,c.minSqft])if(v!==undefined&&(!Number.isFinite(v)||v<=0))throw Error('Invalid area constraint');
  if(c.minSqft!==undefined&&c.maxSqft!==undefined&&c.minSqft>c.maxSqft)throw Error('Inverted area range');
  const hasArea=[c.targetSqft,c.maxSqft,c.minSqft].some(x=>x!==undefined);
  const ranked=models.filter(m=>{
    if(c.family==='compact'?!(m.family==='laneway_carriage'||m.family==='cmhc_catalogue'&&m.units===1):m.family!==c.family)return false;
    if(c.units!==null&&m.units!==c.units)return false;
    if(c.bedrooms!==undefined&&(m.units!==1||m.bedrooms===null||(c.minimumBedrooms?m.bedrooms<c.bedrooms:m.bedrooms!==c.bedrooms)))return false;
    if(c.bedroomsPerUnit!==undefined&&((m.unit_schedule?.length??0)!==m.units||!m.unit_schedule!.every(u=>u.bedrooms===c.bedroomsPerUnit)))return false;
    if(c.bathroomsMin!==undefined&&(m.units!==1||m.bathrooms===null||m.bathrooms<c.bathroomsMin))return false;
    if(c.storeys!==undefined&&m.storeys!==c.storeys)return false;
    if(c.study&&!m.features.some(f=>/study|office/i.test(f)))return false;
    const area=c.areaBasis==='internal'?m.internal_area_sqft_approx:m.area_sqft;
    if(hasArea&&(area==null||!m.numeric_area_matching_allowed))return false;
    if(c.maxSqft!==undefined&&area!>c.maxSqft||c.minSqft!==undefined&&area!<c.minSqft)return false;
    return true;
  }).map(model=>({model,distance:c.targetSqft!==undefined?Math.abs((c.areaBasis==='internal'?model.internal_area_sqft_approx!:model.area_sqft!)-c.targetSqft):0})).sort((a,b)=>a.distance-b.distance||a.model.id.localeCompare(b.model.id));
  return {matches:ranked.filter(r=>c.targetSqft===undefined||r.distance<=c.targetSqft*tolerance).slice(0,limit).map(r=>r.model),outsideTargetAlternatives:ranked.filter(r=>c.targetSqft!==undefined&&r.distance>c.targetSqft*tolerance).slice(0,limit).map(r=>r.model),areaBasis:c.areaBasis,tolerance};
}
export function illustrativeTotal(area:number,rate:number){if(!Number.isFinite(area)||!Number.isFinite(rate)||area<=0||rate<=0)throw Error('Invalid arithmetic');return Math.round(area*rate*100)/100}

export function compactInventoryRequested(q:string){return /(?:what|which).*(?:laneway|carriage|compact).*(?:offer|available|designs)|(?:what|which).*(?:designs|homes).*(?:offer|available).*(?:laneway|carriage)/i.test(q)}
