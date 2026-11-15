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
