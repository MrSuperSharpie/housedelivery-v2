import type {State} from './state';
export type GuidanceStage='initial'|'accepted'|'acknowledged'|'location';
export type PendingQuestion={kind:'location';text:string};
export function financeRequested(q:string){return /\b(?:finance|financing|financial (?:guidance|advice|assistance)|mortgages?|lenders?|loans?|bank mortgage)\b/i.test(q);}
export function pendingLocation(text:string):PendingQuestion|undefined{return /(?:what|which).*(?:project location|municipality|city|province)|where.*(?:project|property|site)|what is your project location/i.test(text)?{kind:'location',text}:undefined;}
const accepted=/^(?:yes(?: please)?|sure|please(?: do| go ahead)?|go ahead|guidance|more (?:details|information)|tell me more|that would help)[.!\s]*$/i;
const offer=/(?:would|do) you like|shall I|can I (?:explain|provide|outline|help)|want (?:more|details|guidance|information)/i;
export function guidanceContinuation(q:string,s:State):GuidanceStage|null{
 if(!s.activeQuestion&&!s.lastQuestion)return null;
 if(accepted.test(q.trim())){
  if(offer.test(s.lastQuestion)||/guidance|more details|more information|tell me more|go ahead/i.test(q))return'accepted';
  if(s.pendingQuestion||pendingLocation(s.lastQuestion)||financeRequested(s.activeQuestion??''))return'acknowledged';
 }
 const pending=s.pendingQuestion??pendingLocation(s.lastQuestion);
 if(pending&&q.length<=80&&/^[\p{L}][\p{L}\p{M} .,'’-]*$/u.test(q.trim())&&!/^(?:yes|no|not|guidance|please|sure|unknown|unsure|what|which|where|why|how|can|could|would|show|tell)\b/i.test(q.trim()))return'location';
 return null;
}
export function offeredContext(s:State){if(offer.test(s.lastQuestion))return'\nInformation offered in the preceding question: '+s.lastQuestion;const pending=s.pendingQuestion??pendingLocation(s.lastQuestion);return pending?'\nPending project question: '+pending.text:'';}

// Financing facts and service availability are closed by approved evidence,
// including when a prior assistant offered an unverified lender/referral list.
export function inheritFinanceGuidance<T extends {question:string;policyIds?:string[];pricing?:string;guidanceStage?:GuidanceStage}>(requests:T[],question:string,stage?:GuidanceStage):T[]{
 if(!financeRequested(question))return requests;
 const related=requests.filter(r=>financeRequested(r.question));
 return requests.map(r=>(related.includes(r)||requests.length===1)?{...r,policyIds:['financing_information'],pricing:'none',guidanceStage:stage??r.guidanceStage??'initial'}:r);
}
