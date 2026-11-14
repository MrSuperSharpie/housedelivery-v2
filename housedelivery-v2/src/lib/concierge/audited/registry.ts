import Ajv from 'ajv/dist/2020';
import {createHash} from 'node:crypto';
import data from '@/data/concierge/audited-knowledge.json';
import schema from '@/data/concierge/audited-knowledge.schema.json';
import historicalStudios from '@/data/concierge/audited-historical-studio-ids.json';

export type Source={id:string;url:string|null;title:string};
export type PublicFact={id:string;text:string;source_ids:string[];tags:string[];qualifiers:string[]};
export type Unit={unit:string;bedrooms:number;bathrooms:number;adaptable_reference:boolean;source_ids:string[]};
export type Model={id:string;name:string;slug:string;family:'architectural'|'laneway_carriage'|'cmhc_catalogue';url:string;source_ids:string[];area_sqft:number|null;area_sqm_published:number|null;area_basis:string;area_conversion:string|null;units:number;bedrooms:number|null;bedrooms_basis:string;bathrooms:number|null;bathrooms_basis:string;storeys:number|null;features:string[];footprint:string|null;floor_plan_url:string|null;floor_plan_status:string;price_rule:string;uncertainties:string[];field_sources:Record<string,string[]>;field_status:Record<string,string>;numeric_area_matching_allowed:boolean;published_system:string|null;system_qualification:string;unit_schedule?:Unit[];internal_area_sqft_approx?:number;internal_area_sqm_published?:number;conflicts?:string[];drawing_source_ids?:string[];drawing_gross_area_sqm?:number;drawing_gross_area_sqft_approx?:number;storeys_website?:number;storeys_drawings?:number;storeys_description?:string};
export type Studio={model_id:string;source_ids:string[];chapters:string[];verified_visible_kitchen_directions:{name:string;tier:string}[];verification:string;qualification:string;availability_note:string|null;selection_count:number|null;structure?:string};
type Knowledge={knowledge_version:string;classification:string;models:Model[];facts:PublicFact[];sources:Source[];design_studios:Studio[];routing:Record<string,string>;price_rules:{id:string;[key:string]:unknown}[]};
const structural=new Ajv({allErrors:true,strict:true,allowUnionTypes:true}).compile(schema);
const hosts=new Set(['www.housedelivery.ca','housedelivery.ca','assets.cmhc-schl.gc.ca']);
const approvedUrls=new Set([...data.sources.map(s=>s.url),...data.models.map(m=>m.url),...data.models.map(m=>m.floor_plan_url),...Object.values(data.routing)].filter((u):u is string=>typeof u==='string'));
export function safeLink(url:string){const u=new URL(url);if(u.protocol!=='https:'||!hosts.has(u.hostname)||u.username||u.password)throw Error('Invalid approved link');return u.hostname.endsWith('housedelivery.ca')?u.pathname+u.search+u.hash:u.href}
export function validateKnowledge(value:unknown):asserts value is Knowledge{
  if(!structural(value))throw Error('Invalid audited knowledge schema');const k=value as Knowledge;
  if(k.knowledge_version!=='2026-11-14.qa1'||k.classification!=='customer_safe'||k.models.length!==31||k.facts.length!==31||k.design_studios.length!==18||k.sources.length!==52)throw Error('Invalid knowledge edition');
  for(const group of [k.models,k.facts,k.sources])if(new Set(group.map(x=>x.id)).size!==group.length)throw Error('Duplicate public ID');
  const sources=new Set(k.sources.map(s=>s.id)),models=new Set(k.models.map(m=>m.id)),rules=new Set(k.price_rules.map(r=>r.id));
  const refs=(ids:string[])=>{if(!ids.length||ids.some(id=>!sources.has(id)))throw Error('Invalid evidence reference')};
  for(const s of k.sources)if(s.url){safeLink(s.url);if(!approvedUrls.has(s.url))throw Error('Unapproved evidence URL')}
  for(const f of k.facts)refs(f.source_ids);
  for(const m of k.models){
    if(!['architectural','laneway_carriage','cmhc_catalogue'].includes(m.family)||!['combined_two_residences','not_verified','published_metric_home_area_basis_to_confirm','published_model_area_conditioned_basis_not_confirmed','website_labelled_total_building_area_basis_to_confirm'].includes(m.area_basis)||!['combined_building','per_unit','single_home','unit_mix_not_single_number'].includes(m.bedrooms_basis)||!['combined_building','per_home','per_unit','not_verified'].includes(m.bathrooms_basis)||!Number.isInteger(m.units)||m.units<1||!rules.has(m.price_rule))throw Error('Invalid model scope');refs(m.source_ids);safeLink(m.url);if(!approvedUrls.has(m.url)||m.floor_plan_url&&!approvedUrls.has(m.floor_plan_url))throw Error('Unapproved model URL');if(m.floor_plan_url)safeLink(m.floor_plan_url);
    for(const v of Object.values(m.field_sources))if(v.length)refs(v);
    for(const field of ['area_sqft','units','bedrooms','bathrooms','storeys','features','footprint','published_system'] as const){if(m[field]!==null&&(!m.field_sources[field]?.length))throw Error('Missing field provenance')}
    for(const field of ['area_sqft','bedrooms','bathrooms','storeys'] as const)if(m[field]!==null&&(!Number.isFinite(m[field])||m[field]!<=0||m.field_status[field]==='unknown'))throw Error('Invalid asserted model value');
    if(m.numeric_area_matching_allowed&&m.area_sqft===null)throw Error('Unknown matching area');
    if(m.units>1&&m.bedrooms_basis==='single_home')throw Error('Invalid bedroom basis');
    for(const unit of m.unit_schedule??[])refs(unit.source_ids);
  }
  for(const s of k.design_studios){if(!models.has(s.model_id))throw Error('Unknown Studio model');refs(s.source_ids)}
  const facts=new Set(k.facts.map(f=>f.id));
  for(const rule of k.price_rules){refs(rule.source_ids as string[]);if(rule.allows_model_quote!==false||(rule.observed_model_ids as string[]|undefined)?.some(id=>!models.has(id))||(rule.requires_fact_ids as string[]|undefined)?.some(id=>!facts.has(id)))throw Error('Invalid price-rule authority or reference')}
  for(const url of Object.values(k.routing))safeLink(url);
  const text=JSON.stringify(k);if(/PRIVATE_[A-Z_]*CANARY|service_role|api[_-]?key|raw_html|<[a-z][^>]*>|\.jpe?g|\.webp|\.png|landed_cost|supplier_id|manufacturer_id/i.test(text))throw Error('Disallowed knowledge field or content');
  if(k.models.find(m=>m.id==='catalog-sixplex-courtyard')?.numeric_area_matching_allowed!==false||k.models.find(m=>m.id==='catalog-bc-duplex')?.storeys!==null)throw Error('Unresolved field restriction lost');
}
// A Node-only dependency and fingerprint make this a server boundary. Next.js
// cannot import it into a client component, and an altered edition fails closed.
if(createHash('sha256').update(JSON.stringify(data)).digest('hex')!=='8041ddd412bb6b9bb0269afc69c7ee4bcedd19050437735511fec125c4dd6ad6')throw Error('Audited knowledge fingerprint mismatch');
validateKnowledge(data);
export const knowledge=data as unknown as Knowledge;
export const knowledgeVersion=knowledge.knowledge_version;
export const modelIndex=new Map(knowledge.models.map(m=>[m.id,m]));
export const factIndex=new Map(knowledge.facts.map(f=>[f.id,f]));
export const sourceIndex=new Map(knowledge.sources.map(s=>[s.id,s]));
const aliases:Record<string,string>={company:'F-COMPANY',delivery:'F-PROCESS',systems:'F-SYSTEMS',national:'F-MARKETS',scale:'F-PORTFOLIO',community:'F-NATIONS',municipal:'F-MARKETS',prices:'F-PRICE',exclusions:'F-EXCLUSIONS',tiers:'F-ESSENTIAL',customization:'F-CUSTOMIZATION',lookbook:'F-STUDIO','cmhc-terms':'F-CMHC',site:'F-PROPERTY',timing:'F-TIMING',builder:'F-BUILDER',handoff:'F-CONTACT'};
export function historicalId(id:string):string|null{
  if(modelIndex.has(id)||factIndex.has(id))return id;if(aliases[id])return aliases[id];
  if(Object.hasOwn(historicalStudios,id))return historicalStudios[id as keyof typeof historicalStudios];
  if(id.startsWith('STUDIO:')&&knowledge.design_studios.some(s=>s.model_id===id.slice(7)))return id;
  return null;
}
export function publicModel(m:Model){
  // Explicit projection: URLs, raw evidence metadata and source locations never
  // enter inference. All links are resolved independently on the server.
  return {id:m.id,name:m.name,family:m.family,area_sqft:m.area_sqft,area_sqm_published:m.area_sqm_published,area_basis:m.area_basis,area_qualification:m.area_basis==='published_model_area_conditioned_basis_not_confirmed'?'Published model area only. Conditioned living area, internal area and chargeable area are NOT established by this figure.':m.area_basis==='combined_two_residences'?'Combined building totals across two residences; no individual residence allocation is established.':'Use the stated published basis; do not substitute internal, footprint or chargeable area.',area_conversion:m.area_conversion,units:m.units,bedrooms:m.bedrooms,bedrooms_basis:m.bedrooms_basis,bathrooms:m.bathrooms,bathrooms_basis:m.bathrooms_basis,storeys:m.storeys,features:m.features,footprint:m.footprint,uncertainties:m.uncertainties,numeric_area_matching_allowed:m.numeric_area_matching_allowed,internal_area_sqft_approx:m.internal_area_sqft_approx??null,internal_area_sqm_published:m.internal_area_sqm_published??null,unit_schedule:m.unit_schedule??[],conflicts:m.conflicts??[],published_system:m.published_system,system_qualification:m.system_qualification};
}
