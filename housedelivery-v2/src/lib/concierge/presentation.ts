import type {Fact} from './contracts';

// Reviewed short-form wording derived solely from the approved snapshot. The
// model still selects IDs only; user/model text can never become answer copy.
const shortCopy:Record<string,string>={
  delivery:'We bring precision manufacturing, coordinated purchasing and Canadian construction together in one coordinated housing pathway.',
  systems:'Projects can use light-gauge steel, domestic timber or another suitable engineered system, with site-specific Canadian engineering.',
  national:'We work with individuals, developers, municipalities, First Nations and institutions to explore housing projects across Canada.',
  scale:'We can help you explore a single home or a phased multi-home program, starting with your housing mix, land and project priorities.',
  community:'Your Nation’s housing priorities lead the conversation, including cultural expression, multigenerational living and local participation.',
  municipal:'For municipal and institutional projects, we start with the households you want to serve, the site, housing mix and procurement requirements.',
  prices:'Premium home-package pricing is CAD $250 per sq. ft.; Signature is CAD $300 per sq. ft. These are planning rates, not a completed-construction price or firm quotation.',
  exclusions:'Site work, foundations, assembly, freight, taxes, permits, engineering, servicing and local completion are budgeted separately as applicable.',
  tiers:'Premium offers refined materials and finishes; Signature adds selected higher-touch materials and feature finishes.',
  customization:'You can explore available Premium and Signature finishes in each home’s Design Studio and bring your choices together in a Look Book. Layout or specification changes are reviewed with the team.',
  lookbook:'Your Look Book brings available design selections together for a project conversation. It records your design intentions; final scope and technical review come next.',
  'cmhc-terms':'CMHC Pre-Reviewed designs need property-specific adaptation and local approvals; they are reference designs, not permits.',
  site:'A property review is a useful first step for zoning, access, setbacks and servicing. The online Check My Property pathway covers supported BC jurisdictions; our team can discuss other locations.',
  timing:'We coordinate feasibility, design, approvals, manufacturing, delivery and construction around your project. Timing is established for the site and agreed scope.',
  builder:'If you already have a builder, we can review the housing system and agree how site work, assembly and finishing responsibilities fit together.',
  handoff:'Our team can help you turn your location, housing needs and site context into a personal project review.',
  company:'House Delivery is an Indigenous-owned Canadian housing company bringing coordinated housing delivery to individuals, organizations and communities.',
};
const segmenter=new Intl.Segmenter('en',{granularity:'sentence'});
function sentences(text:string){return [...segmenter.segment(text.replace(/\b(sq|ft)\.(?=[;,]|\s+[a-z])/g,'$1\uE000'))].map(s=>s.segment.trim().replaceAll('\uE000','.')).filter(Boolean)}
export function detailRequested(question:string){return /\b(in detail|more details?|detailed|full (spec\w*|information|details)|all (the )?(spec\w*|inclusion\w*|option\w*)|explain (more|fully)|tell me more|elaborate)\b/i.test(question)}
export function presentFact(fact:Fact,question=''):string{
  if(shortCopy[fact.id])return shortCopy[fact.id];
  if(fact.id==='home-salt-spring')return 'The Salt Spring Duplex brings two independent residences into one design, with 6,073 sq. ft. and eight bedrooms across both homes.';
  if(fact.kind==='home'){
    const specs=fact.text.match(/: ([\d,]+) sq\. ft\.; (\d+) bedrooms/);
    const description=fact.text.match(/(?:Precision light steel frame|Cold-formed light steel frame|Project-specific)\. (.*?)(?: Listed plan features:|$)/)?.[1];
    if(specs&&description)return `${fact.title} offers ${specs[2]} bedrooms across ${specs[1]} sq. ft. ${description}`;
  }
  if(fact.kind==='studio'){
    const options=fact.text.split('Available published selections: ')[1]?.split('. These are design')[0]?.split(';').map(s=>s.trim().replace(/\.$/,''))??[];
    const tokens=question.toLowerCase().match(/[a-z]{4,}/g)??[];
    const ranked=options.map(text=>({text,score:tokens.reduce((sum,t)=>sum+(text.toLowerCase().includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score);
    if(ranked.length)return `${fact.title} includes ${ranked.slice(0,3).map(o=>o.text).join('; ')}. You can explore the coordinated options in the Design Studio.`;
  }
  if(fact.kind==='catalog')return sentences(fact.text).slice(0,2).join(' ');
  if(fact.kind==='carriage')return sentences(fact.text).slice(0,1).join(' ');
  return sentences(fact.text).slice(0,1).join(' ');
}

export function conciseFacts(facts:Fact[],question:string){
  const result:Fact[]=[];let count=0;
  for(const f of facts){const text=presentFact(f,question),n=sentences(text).length;
    if(result.length&&count+n>4)continue;
    result.push({...f,text});count+=n;
  }
  return result;
}
