import type {Evidence} from './evidence';
export type PolicyClaim={claim:string;entailed:boolean;support:{evidenceId:string;quote:string}[]};
// Evidence IDs alone are not proof. Accept only passages actually present in
// approved assertions/qualifications, never titles, user text or writing guidance.
function passages(value:unknown):string[]{
  if(typeof value==='string')return[value];
  if(Array.isArray(value))return value.flatMap(passages);
  if(value&&typeof value==='object')return Object.entries(value).filter(([key])=>['text','facts','qualifiers','limits'].includes(key)).flatMap(([,v])=>passages(v));
  return[];
}
const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
export function policyEvidenceValid(claims:PolicyClaim[],evidence:Evidence[]){
  return claims.every(c=>c.entailed&&c.claim.trim()&&c.support.length>0&&c.support.every(s=>{
    const source=evidence.find(e=>e.id===s.evidenceId),quote=normalize(s.quote);
    return quote.length>0&&Boolean(source)&&passages(source!.data).some(text=>normalize(text).includes(quote));
  }));
}
