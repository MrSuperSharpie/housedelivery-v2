import {landedScopeExplanation} from './technical-logistics';
import type {Intent} from './intent';
import {heatTransferSpeedOnly,thermalEnvelopeAsked} from './building-science';
export type ComparisonMetric='cost'|'quality'|'reliability'|'speed'|'superiority';
export type ComparisonLimit={missing:ComparisonMetric[];requested:ComparisonMetric[]};
type Part=NonNullable<Intent['requests']>[number];
const metricPatterns:Record<ComparisonMetric,RegExp>={
 cost:/cost|pric|cheap|expensive|spend|pay(?:ing)?|charg|\d+(?:\.\d+)?\s*%\s*(?:premium|more|higher)|sav(?:e|ing)|budget|money|financial|\bROI\b/i,
 quality:/quality|workmanship|finish quality|consisten/i,
 reliability:/reliab|durab|lifespan|last(?:s|ing)? longer|longer.last|service life/i,
 speed:/speed|fast|quick|slow|time advantage|sooner|schedule advantage/i,
 superiority:/superior|inferior|better|best|advantage|worth|why.*(?:should|choose|use|buy|hire)/i
};
const metrics=Object.keys(metricPatterns) as ComparisonMetric[];
function requestedMetrics(q:string){return metrics.filter(m=>metricPatterns[m].test(q)&&(m!=='speed'||!heatTransferSpeedOnly(q)));}
export function publishedRateComparison(q:string){
 return !/\b(?:steel|timber|wood|lumber|concrete|masonry|prefab|site[ -]?built|framers?|builders?|competitor|turnkey)\b/i.test(q)&&/\bPremium\b/i.test(q)&&/\bSignature\b/i.test(q)&&/published|planning|reference/i.test(q)&&/rate|per (?:sq|square)/i.test(q);
}
export function comparisonLimit(q:string):ComparisonLimit|null{
 if(landedScopeExplanation(q))return null;
 const comparison=/compar|differ|versus|\bvs\.?\b|\bthan\b|rather|instead|equally priced|same price|worth|more expensive|less expensive|cheaper|faster|slower|quicker|more reliable|more durable|last.*longer|better|superior|inferior|why.*(?:should|choose|use|buy|hire)/i.test(q);
 if(!comparison)return null;
 const requested=requestedMetrics(q).filter(m=>m!=='cost'||!publishedRateComparison(q));
 // A plan-feature/preference comparison is answerable from published features;
 // it does not ask for proof of a commercial/performance advantage.
 if(requested.every(m=>m==='superiority')&&/bedroom|bathroom|privacy|guest|gather|layout|study|storey|floor area|sq\.?\s*ft|family|mobility|access/i.test(q)&&!/superior|inferior|quality|reliab|durab|cost|price/i.test(q))return null;
 if(!requested.length)return null;
 return{requested,missing:metrics.filter(m=>m!=='cost'||!publishedRateComparison(q))};
}
export function relatedComparisonPart(part:Part,limit:ComparisonLimit){
 const q=part.question,explicit=/compar|versus|\bvs\b|\bthan\b|rather|instead|better|superior|advantage|why.*(?:should|choose|use|buy|hire)/i.test(q);
 // An independent mechanism question stays answerable even when the parent
 // also asks for an unsupported price or construction-performance comparison.
 if(thermalEnvelopeAsked(q)&&!comparisonLimit(q)||landedScopeExplanation(q))return false;
 const asked=requestedMetrics(q).some(m=>limit.missing.includes(m));
 // Preserve separately requested scope, documentation, freight inputs and
 // published numeric attributes; those are not unverified relative benefits.
 if(!explicit&&/includ|source locally|arrang.*locally|local responsibilit|floor plans?|drawings?|permits?|documents?|visits?|plant access|freight|shipping|delivery/i.test(q))return false;
 if(!asked&&/bedrooms?|bathrooms?|storeys?|floor area|square feet|sq\.?\s*ft|dimensions?|footprint/i.test(q))return false;
 if(publishedRateComparison(q)&&requestedMetrics(q).every(m=>m==='cost'))return false;
 return asked||explicit||part.topic==='comparison'&&!/modular|construction method|how.*built/i.test(q);
}
// The parent scope is recomputed from the actual question. A child need not
// repeat both alternatives, and cannot remove the evidence limit by rewording.
export function inheritComparisonLimits<T extends Part>(requests:T[],question:string):T[]{
 const limit=comparisonLimit(question);if(!limit)return requests;
 return requests.map(r=>relatedComparisonPart(r,limit)?{...r,topic:limit.requested.includes('cost')?'pricing':'comparison',comparisonLimit:limit,pricing:'project_quote',policyIds:['system_comparison']}:r);
}
export type AnswerSegment={text:string;evidenceRefs:string[];requestId?:string};
// Only server-rendered evidence-limit records may answer limited requests.
// Even an approving support verdict cannot authorize replacement prose.
export function finalizeComparisonAnswers(generated:AnswerSegment[],requests:Part[],published:AnswerSegment[]){
 const limited=new Set(requests.filter(r=>r.comparisonLimit||r.guidanceStage).map(r=>r.id));
 if(!limited.size)return [...generated,...published];
 const other=new Set(requests.filter(r=>!r.comparisonLimit&&!r.guidanceStage).map(r=>r.id));
 return [...generated.filter(s=>s.requestId&&other.has(s.requestId)),...published];
}
