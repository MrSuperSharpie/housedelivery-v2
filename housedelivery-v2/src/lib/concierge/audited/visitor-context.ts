import type {State} from './state';

// Visitor reports are conversation grounding, never company/product evidence.
// Keep their words rather than deriving bedrooms, occupations or feasibility.
const household=/\b(?:wife|husband|spouse|partner|kids?|children|child|sons?|daughters?|parents?|mother|father|siblings?|adults?|occupants?|Elders?|household|family|families|multigenerational|couple)\b/i;
export function householdReport(question:string){
 return question.split(/(?<=[.!?])\s+/).filter(line=>household.test(line)&&/\b(?:my|our|we|us|I|for|with)\b/i.test(line)&&!/^\s*(?:can|do|does|will|would|which|what|how|is|are)\b/i.test(line)).join(' ').trim().slice(0,360);
}
export function householdUpdate(question:string){
 return Boolean(householdReport(question))&&!/[?]|\b(?:price|cost|rate|includ\w*|exclud\w*|permit\w*|zon\w*|code|manufactur\w*|factor\w*|freight|deliver\w*|warrant\w*|document\w*|specification\w*|guarantee|certif\w*|how|what|which|can you|do you)\b/i.test(question);
}
export function visitorEvidence(state:State,currentMessage?:string){
 return{id:'V:requirements',data:{kind:'visitor_report',...(currentMessage?{currentMessage}:{}),reports:Object.fromEntries(Object.entries(state.values).map(([key,slot])=>[key,slot?.value]))},sourceIds:[] as string[]};
}

export function hasHouseholdDetail(state:State){
 const text=String(state.values.householdNeeds?.value??'');
 return /\b(?:wife|husband|spouse|partner|kids?|children|child|sons?|daughters?|parents?|mother|father|siblings?|adults?|occupants?|Elders?|multigenerational|couple|privacy|guests?|mobility|gathering)\b/i.test(text)||/\b(?:family|household) of (?:\d+|two|three|four|five|six)\b/i.test(text);
}
