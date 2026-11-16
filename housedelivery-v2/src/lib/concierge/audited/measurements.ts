// Measurement subjects come from the visitor's words, never catalogue guesses.
export function areaSubject(before:string,after:string):'site'|'home'{
 const site='(?:lot|site|parcel|property|land)',home='(?:home|house|dwelling|floor[ -]?area|living[ -]?area|footprint)';
 const suffix=after.match(new RegExp('^\\s*\\.?\\s*(?:of\\s+)?('+site+'|'+home+')\\b','i'))?.[1];
 if(suffix)return new RegExp('^'+site+'$','i').test(suffix)?'site':'home';
 const clause=before.split(/[;!?]|\.(?:\s|$)|\bbut\b/i).at(-1)??'';
 const subjects=[...clause.matchAll(new RegExp('\\b('+site+'|'+home+')\\b','gi'))];
 const nearest=subjects.at(-1)?.[1];
 return nearest&&new RegExp('^'+site+'$','i').test(nearest)?'site':'home';
}
const words:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8};
export function bedroomRequirement(question:string){
 const n='(?:one|two|three|four|five|six|seven|eight|[1-9])',bed='(?:bedrooms?|beds?|br)',value=(s:string)=>words[s.toLowerCase()]??Number(s);
 const alternatives=question.match(new RegExp('\\b(?:between\\s+)?('+n+')(?:[ -]?'+bed+')?\\s*(or|and|/|to|–|-)\\s*(?:a\\s+|an\\s+)?('+n+')[ -]?'+bed+'\\b','i'));
 if(alternatives){const a=value(alternatives[1]),b=value(alternatives[3]),range=/to|–|-/.test(alternatives[2])||/between/i.test(alternatives[0]);return{choices:[...new Set(range?Array.from({length:Math.abs(b-a)+1},(_,i)=>Math.min(a,b)+i):[a,b])].sort((a,b)=>a-b),minimum:false,start:alternatives.index!,end:alternatives.index!+alternatives[0].length};}
 const single=[...question.matchAll(new RegExp('\\b('+n+')[ -]?'+bed+'\\b','gi'))].at(-1);
 return single?{choices:[value(single[1])],minimum:/at least|minimum|or more/i.test(question),start:single.index!,end:single.index!+single[0].length}:null;
}

// Preference-only replies answer an intake question; stale scope labels must
// not turn them into package-inclusions requests. Additional requests remain.
export function bedroomStatement(question:string){
 const bed=bedroomRequirement(question);if(!bed)return false;
 const rest=question.slice(0,bed.start)+' '+question.slice(bed.end);
 return rest.replace(/\b(?:I|we|want|need|would|like|am|are|looking|for|a|an|the|home|homes|house|houses|family|detached|at|least|minimum|min|or|more|please|actually|instead)\b/gi,'').replace(/[\s.,!?‘’'"]+/g,'')==='';
}
export function propertyStatement(question:string){
 return /\b(?:I|we)\s+(?:have|own|bought|purchased|control|acquired)\b|\b(?:my|our)\s+(?:lot|property|site|parcel)\b/i.test(question)&&!/\?|\b(?:how|what|which|why|can|could|would|tell|show|help|find|recommend|suggest|compare|please|price|cost|quote|zoning|approval|permit|factory|manufacturer|customs)\b/i.test(question)&&!bedroomRequirement(question);
}
