export const conciergeTimeZone='America/Vancouver';
export function referenceClock(now=Date.now()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:conciergeTimeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(name:string)=>parts.find(p=>p.type===name)!.value;
 return{utc:new Date(now).toISOString(),timeZone:conciergeTimeZone,localDate:part('year')+'-'+part('month')+'-'+part('day'),year:Number(part('year'))};
}
export function relativeTiming(question:string,now=Date.now()):string|undefined{
 const clock=referenceClock(now),match=question.match(/\b(next year|this year|next month|this month|tomorrow|today)\b/i);
 if(!match)return undefined;
 const term=match[1].toLowerCase();
 if(term==='next year'||term==='this year')return String(clock.year+(term==='next year'?1:0));
 const local=new Date(clock.localDate+'T12:00:00Z');
 if(term==='next month'){local.setUTCMonth(local.getUTCMonth()+1,1);return local.toISOString().slice(0,7);}
 if(term==='this month')return clock.localDate.slice(0,7);
 if(term==='tomorrow')local.setUTCDate(local.getUTCDate()+1);
 return local.toISOString().slice(0,10);
}

// A date in a market/price question is not the visitor's project schedule.
// Keep relative-date resolution separate from deciding what the date describes.
export function projectTimingContext(question:string,lastQuestion=''):string|undefined{
 const time=/\b(?:next year|this year|next month|this month|tomorrow|today|20\d{2}|next (?:spring|summer|autumn|fall|winter)|soon)\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d/i;
 const bare=question.trim().replace(/[.!?]+$/,'');
 if(time.test(bare)&&/^(?:(?:next|this) (?:year|month|spring|summer|autumn|fall|winter)|tomorrow|today|20\d{2})$/i.test(bare)&&/when|timing|timeline|start|completion|occupancy/i.test(lastQuestion))return bare;
 for(const clause of question.split(/\s*(?:[;?!]|\bbut\b|\band\b)\s*|\.(?=\s+[A-Z])/)){
  if(!time.test(clause))continue;
  const goal=/\b(?:target(?:ing| date)?|timeline|schedule|planned (?:start|completion)|desired occupancy)\b/i.test(clause);
  const visitor=/\b(?:I|we|our|my)\b/i.test(clause);
  const action=/\b(?:plan(?:ning)?|want|need|hope|aim|intend|expect|start|begin|finish|complete|build|building|move|occupy)\b/i.test(clause);
  const housing=/\b(?:homes?|housing|units?|project|program|phase|construction|build|building|start|begin|finish|complete|completion|occupancy|move|occupy)\b/i.test(clause);
  const market=/\b(?:price|prices|pricing|cost|costs|rates?|cheaper|expensive|market)\b/i.test(clause);
  const explicitStage=/\b(?:start|begin|finish|complete|completion|occupancy|move|occupy)\b/i.test(clause);
  if(goal||visitor&&action&&housing&&(!market||explicitStage))return clause;
 }
 return undefined;
}
