import {models as publishedHomes} from '@/data/models';
import type {ModelCard} from '../contracts';
import {modelLine,modelLink} from './evidence';
import type {Model} from './registry';
// Public UI assets are joined after inference. They cannot authorize new facts
// or change the audited knowledge release. Specs always use its verified fields.
export function recommendationCard(model:Model):ModelCard{
 const photo=publishedHomes.find(home=>home.slug===model.slug)?.heroImage;
 const combined=model.units>1;
 const specs=[model.bedrooms!==null?`${model.bedrooms} bedrooms${model.bedrooms_basis==='combined_building'?' combined':combined?' per dwelling':''}`:null,
  model.numeric_area_matching_allowed&&model.area_sqft!==null?`${model.area_conversion?'Approx. ':''}${model.area_sqft.toLocaleString('en-CA')} sq. ft. ${combined?'combined building':'published model'} area`:null].filter((v):v is string=>Boolean(v));
 return{id:model.id,title:model.name,text:modelLine(model),href:modelLink(model),kind:'home',...(photo?{image:{src:photo,alt:`${model.name} — published architectural exterior`}}:{}),specs,features:model.features.slice(0,2),...(model.floor_plan_url?{floorPlanHref:modelLink(model,'floorplan')}:{})};
}
export function matchingIntroduction(models:Model[]){
 return models.map(model=>`${model.name}: ${model.features.slice(0,2).join('; ')||modelLine(model)}`).join('\n');
}
