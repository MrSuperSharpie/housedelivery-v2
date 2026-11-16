// Measurement subjects come from the visitor's words, never catalogue guesses.
export function areaSubject(before:string,after:string):'site'|'home'{
 const site='(?:lot|site|parcel|property|land)',home='(?:home|house|dwelling|floor[ -]?area|living[ -]?area|footprint)';
 const suffix=after.match(new RegExp('^\\s*(?:of\\s+)?('+site+'|'+home+')\\b','i'))?.[1];
 if(suffix)return new RegExp('^'+site+'$','i').test(suffix)?'site':'home';
 const clause=before.split(/[;!?]|\.(?:\s|$)|\bbut\b/i).at(-1)??'';
 const subjects=[...clause.matchAll(new RegExp('\\b('+site+'|'+home+')\\b','gi'))];
 const nearest=subjects.at(-1)?.[1];
 return nearest&&new RegExp('^'+site+'$','i').test(nearest)?'site':'home';
}
const words:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8};
export function bedroomRequirement(question:string){
 const n='(?:one|two|three|four|five|six|seven|eight|[1-9])',bed='(?:bedrooms?|beds?|br)',value=(s:string)=>words[s.toLowerCase()]??Number(s);
 const alternatives=question.match(new RegExp('\\b(?:between\\s+)?('+n+')(?:[ -]?'+bed+')?\\s*(or|and|/|to|–|-)\\s*('+n+')[ -]?'+bed+'\\b','i'));
 if(alternatives){const a=value(alternatives[1]),b=value(alternatives[3]),range=/to|–|-/.test(alternatives[2])||/between/i.test(alternatives[0]);return{choices:[...new Set(range?Array.from({length:Math.abs(b-a)+1},(_,i)=>Math.min(a,b)+i):[a,b])].sort((a,b)=>a-b),minimum:false};}
 const single=[...question.matchAll(new RegExp('\\b('+n+')[ -]?'+bed+'\\b','gi'))].at(-1);
 return single?{choices:[value(single[1])],minimum:/at least|minimum|or more/i.test(question)}:null;
}
