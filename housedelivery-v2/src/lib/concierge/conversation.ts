import {provinces,type ChatTurn,type Fact,type FollowUp} from './contracts';
import {detailRequested} from './presentation';
type Plan={facts:string[];next:FollowUp;disposition:'answer'|'clarify'|'human'};
function context(history:ChatTurn[],question:string){return [...history.map(t=>t.question),question].join(' ')}
export function requestedBedrooms(text:string){
  const numbers:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8};
  const matches=[...text.toLowerCase().matchAll(/\b(one|two|three|four|five|six|seven|eight|[1-8])[ -]+bedrooms?\b/g)];
  const value=matches.at(-1)?.[1];return value?(numbers[value]??Number(value)):undefined;
}
export function relevantDesigns(facts:Fact[],history:ChatTurn[],question:string){
  const text=context(history,question),beds=requestedBedrooms(text);
  const individual=/myself|my family|our family|single.family/i.test(text)&&!/duplex|two residences|salt spring/i.test(question);
  // Explicit comparisons/named designs remain accessible even when their specs
  // differ. Otherwise recommend homes that meet the stated bedroom requirement.
  const named=new Set(facts.filter(f=>f.kind==='home'&&question.toLowerCase().includes(f.title.replace(/^the /i,'').toLowerCase())).map(f=>f.id));
  return facts.filter(f=>f.kind!=='home'||named.has(f.id)||(!individual||f.id!=='home-salt-spring')&&(!beds||f.text.includes(`; ${beds} bedrooms`)));
}
export function conversationPlan(plan:Plan,question:string,history:ChatTurn[]):Plan{
  const text=context(history,question),lower=text.toLowerCase();
  const location=provinces.some(p=>lower.includes(p.toLowerCase()))||/\b(BC|AB|MB|ON|NS|NB|NL|NT|NU|PEI|QC|SK|YT)\b/.test(text);
  const site=/(own|owned|control|controlled|secured|acquired|have).{0,35}\b(site|property|land|lot)\b|\b(site|property|land|lot)\b.{0,35}(owned|controlled|secured|acquired)/i.test(text);
  const known:Partial<Record<FollowUp,boolean>>={
    audience:/myself|my family|our family|developer|municipal|first nation|institution|non.profit|community.owned/i.test(text),
    location,property:location,site,bedrooms:Boolean(requestedBedrooms(text)),
    size:/\b[\d,]+\s*(square feet|sq\.?\s*ft\.?|m²|square met|sq\.?\s*m)/i.test(text),
    scale:/\b\d+[+]?\s*(homes|units|residences)\b/i.test(text),
    timeline:/\b20[2-9]\d\b|next (year|summer|spring|fall|winter)|within.{0,20}(month|year)|\d+[ -](month|year)/i.test(text),
    objective:/priorit|matters|important|local participation|multigenerational|for family|generous family|shared space|outdoor connection/i.test(text),
    design:/shared space|generous family|outdoor connection|private rooms|modern|traditional/i.test(text),
  };
  const adu=/\badu\b|laneway|carriage home/i.test(text),individual=/myself|my family|our family/i.test(text);
  const order:FollowUp[]=adu?['location','bedrooms','site','objective','timeline','human']:individual?['bedrooms','size','design','location','site','timeline','human']:['audience','location','scale','site','objective','timeline','human'];
  const next=plan.next==='none'||known[plan.next]?order.find(k=>!known[k])??'human':plan.next;
  return {...plan,next,facts:plan.facts.slice(0,detailRequested(question)?4:2)};
}
