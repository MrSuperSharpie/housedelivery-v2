import {landedDeliveryAsked,technicalDocumentationAsked,manufacturingQualityAsked,structuralOptionsAsked} from './technical-logistics';
import type {Intent} from './intent';
import {privateRequest,privateManufacturingLocation,manufacturingIdentityCondition} from './commercial';
import {knowledge} from './registry';

export type RequestPart=NonNullable<Intent['requests']>[number];
export function parts(intent:Intent):RequestPart[]{return intent.requests??[]}
export function topics(intent:Intent){return [...new Set(parts(intent).length?parts(intent).map(p=>p.topic):[intent.topic])]}
// This boundary runs before inference. A conversational claim never enables a
// private lookup. Only a remaining public clause can enter the ordinary engine.
export function publicQuestion(question:string,manufacturingContext=false){
  const privateFacility=privateManufacturingLocation(question,manufacturingContext),identityCondition=manufacturingIdentityCondition(question,manufacturingContext),restricted=privateFacility||privateRequest(question)||identityCondition;
  if(!restricted)return{question,restricted:false,publicOrigin:false,privateFacility:false,identityCondition:false};
  if(/\.env\b|api.?key|system.?prompt|system message|hidden|source ledger|source archive|maintainer|original files|previous customer|previous chats|ignore|override|base64|rot13|private.*(?:record|email|correspondence)/i.test(question))return{question:'',restricted:true,publicOrigin:false,privateFacility,identityCondition};
  // Split independent requests, not noun lists such as appliances or fixtures.
  const clauses=question.split(/[?;]|(?<=[.!])\s+(?=[A-Z])|(?:[,—–]\s*|\s+)\b(?:and|or|also|but)\s+(?=(?:can|could|would|will|may|do|does|is|are|what|which|who|where|how|I|we|my|our|tell|show|please)\b)/i).map(s=>s.trim()).filter(Boolean);
  const originClause=(s:string)=>!landedDeliveryAsked(s)&&!/\b(?:freight|shipping|import costs?|import charges?)\b/i.test(s)&&(/\b(?:origin|overseas|import(?:ed|s|ing)?)\b|(?:made|manufactur\w*)[^?]{0,35}(?:Canada|Canadian|domestic|international)|\b(?:components?|frames?|kits?|steel|timber)\b[^?]{0,35}\b(?:Canadian|domestic)\b|\bwhere\b.*\b(?:components?|frames?|kits?)\b.*\b(?:made|manufactur\w*|from)\b/i.test(s));
  const publicClauses=clauses.filter(s=>!privateRequest(s)&&!manufacturingIdentityCondition(s,manufacturingContext)&&!privateManufacturingLocation(s,manufacturingContext||/\b(?:they|them|their|it|just|only|then)\b/i.test(s))&&!(/\b(?:they|them|their)\b/i.test(s)&&/charge|buying|invoice|margin|markup|cost percentage/i.test(s))&&/^(?:can|could|would|will|may|do|does|is|are|what|which|who|where|how|I|we|my|our|tell|show|please)\b/i.test(s));
  const safe=publicClauses.filter(s=>!originClause(s));
  // A public subject can share a clause with a protected identity request.
  // Project only that subject, never the private names/records, into inference.
  const explicitDocuments=technicalDocumentationAsked(question)&&/\b(?:documents?|documentation|specifications?|specs?|sheets?|reports?|drawings?|records?)\b/i.test(question);
  const publicQuality=!privateFacility&&manufacturingQualityAsked(question)&&/\bquality\b|\bQA\b|\bQC\b/i.test(question);
  if((explicitDocuments||publicQuality)&&!safe.some(s=>technicalDocumentationAsked(s)||manufacturingQualityAsked(s)))safe.push(publicQuality?'What project engineering documentation and manufacturing quality verification can be reviewed?':'What project engineering documentation can be reviewed?');
  if(landedDeliveryAsked(question)&&!safe.some(landedDeliveryAsked))safe.push('What does the landed and delivered kit quotation cover, including customs and Canadian delivery responsibilities?');
  if(structuralOptionsAsked(question)&&/\b(?:systems?|options?|alternatives?|must|only|instead)\b/i.test(question)&&!safe.some(structuralOptionsAsked))safe.push('Which structural systems can be considered for the selected project?');
  const publicOrigin=clauses.some(originClause);
  return{question:safe.join('; ').slice(0,1200),restricted:true,publicOrigin,privateFacility,identityCondition};
}
export const identityConditionNotice='I understand that knowing the manufacturer’s identity is a condition of proceeding for you. We keep manufacturing partner identities and commercial relationships confidential, so I can’t meet that disclosure request or ask you to proceed without it.';
export const confidentialityNotice='We keep manufacturing partner identities and private commercial information confidential; we do not confirm or deny relationships with named companies.';
export const chatLimits={id:'CHAT-LIMITS',data:{text:'This text assistant can explain public housing information and prepare a visitor-reviewed project brief. It cannot issue binding quotations, enter contracts, confirm production capacity, submit permits, verify code certification, or confirm an unlisted product capability. A project team must confirm project-specific scope and capabilities. Unknown availability is not evidence that a product or service is unavailable. Unrecorded access arrangements and the availability or release of project-specific documentation require team confirmation. Manufacturing identities and private factory records remain confidential; this does not establish that all technical documentation is confidential or unavailable.'},sourceIds:[] as string[]};
export function cmhcRelevant(intent:Intent,question:string,modelIds:string[]){
  return /\bCMHC\b|pre.reviewed|catalogue|catalog/i.test(question)||modelIds.some(id=>knowledge.models.some(m=>m.id===id&&m.family==='cmhc_catalogue'))&&intent.modelContext==='follow_up';
}
export function ordinarySynthesis(intent:Intent,question:string){
  if(['arithmetic','summary'].includes(intent.topic))return false;
  // Keep deterministic commercial arithmetic, unresolved published conflicts,
  // explicit guarantees and actual action outcomes. Ordinary explanations use
  // the same grounded LLM regardless of the wording or number of requests.
  return !/blended|mixed[ -]tier|per residence|per side|both sources?|which one.*trust|(?:page|drawing).*discrepancy|did you send|have you sent|share only|tell the team|can you save|save it|save that|reserve.*confirm|\b25 years\b|\$99|new approved rate|catalog.*(?:always|default)/i.test(question);
}

export function planningReferences(tiers:string[]){
  if(tiers.length>2||new Set(tiers).size!==tiers.length||tiers.some(t=>!['Premium','Signature'].includes(t)))throw Error('Invalid public rate reference');
  const rule=knowledge.price_rules.find(r=>r.id==='PR-SALT-DISPLAY')!;
  return tiers.length?'Home-package planning references — '+tiers.map(t=>`${t}: ${rule.currency} $${t==='Premium'?rule.premium_rate_per_sqft:rule.signature_rate_per_sqft} per square foot`).join('; ')+'. ':'';
}

export const facilityLocationNotice='Factory addresses, cities, provinces and other identifying manufacturing-partner details are confidential. I can’t confirm the location of a private facility.';
export const certificationReviewGuidance='For certification due diligence, our team can discuss the applicable technical documentation for your selected system. This chat cannot verify ISO certifications or confirm a factory’s certification status.';
