import type {State} from './state';
// Classify the decision being asked now, not the existence of saved shopping
// preferences. A search for designs remains distinct from site entitlement.
export function propertyDecision(question:string,state?:State):'design_fit'|'buildable_size'|'regulatory'|null{
 const site=/\b(?:lot|site|parcel|property|land|plot)\b/i.test(question)||Boolean(state&&state.values.siteArea?.value);
 if(/\bzoning\b|\bsetbacks?\b|\b(?:FSR|FAR)\b|floor[ -](?:space|area) ratio|site coverage|building envelope|permitted (?:density|height|floor area)|buildable (?:area|size)|allowable (?:area|size|density)/i.test(question))return'regulatory';
 if(site&&/[?]|\b(?:how|what|can|could|would|will|does)\b/i.test(question)&&/how (?:big|large|much)|what (?:size|floor area|building area)|maximum.*(?:home|house|build)|(?:home|house).*maximum/i.test(question)&&/build|allow|permi|home|house/i.test(question))return'buildable_size';
 if(site&&(/(?:would|will|could|does|can|is)\b[^?]{0,100}\b(?:fit|work|suitable|feasible|allowed|permitted|buildable)\b/i.test(question)||/\b(?:fit|feasib|suitab)\w*\b[^?]{0,80}\b(?:lot|site|property|land|plot)\b/i.test(question)||/\benough\b[^?]{0,40}\b(?:land|space|room|lot)\b|\b(?:can|could)\b[^?]{0,40}\b(?:build|place|accommodate)\b[^?]{0,70}\b(?:it|this|that|here|there|on)\b/i.test(question))&&!catalogueSearch(question))return'design_fit';
 return null;
}
export function catalogueSearch(question:string){return /\b(?:recommend|suggest|find|browse|show|explore|compare)\b[^?]{0,100}\b(?:homes?|houses?|designs?|models?)\b|\b(?:which|what)\s+(?:(?:family|published|architectural|custom)\s+)?(?:homes|houses|designs|models)\b/i.test(question)}
// There is no site-specific zoning/approval evidence in this chat. An asserted
// fit/permission is not made safe by appending a review caveat afterwards.
export function unsupportedSiteClaim(text:string){
 for(const clause of text.split(/[.!?;]|\bbut\b/i)){
  const site=/\b(?:lots?|sites?|parcels?|properties|property|land|plots?|zoning)\b/i.test(clause);
  if(!site)continue;
  const claim=clause.match(/\b(?:fits?|suits?|works?)\s+(?:(?:well|comfortably|easily)\s+)?(?:on|within|for|into)\b|\b(?:is|are|will be)\s+(?:a\s+)?(?:good\s+)?(?:fit|suitable|allowed|permitted|approved)\b|\b(?:you|we|they)\s+(?:can|may)\s+build\s+(?:up to\s+)?\d/i);
  if(!claim)continue;
  const before=clause.slice(0,claim.index);
  if(!/\b(?:not|cannot|can't|can’t|whether|if|what|how|unconfirmed|unknown)\b/i.test(before))return true;
 }
 return false;
}
