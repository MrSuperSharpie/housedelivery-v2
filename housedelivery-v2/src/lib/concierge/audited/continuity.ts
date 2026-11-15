import type {State} from './state';
// Short readiness/crew updates add to the active decision. They do not ask for
// a new design shortlist merely because size was supplied in the earlier turn.
export function continuesQuestion(question:string,state:State){
 if(!state.activeQuestion||!state.activeRequests?.length)return false;
 return /^(?:(?:our |the )?site (?:is |already )?(?:ready|prepared|serviced)|(?:our |the |my )?(?:builder|contractor) (?:is |has |will |can )|we (?:already )?have (?:a |an )?(?:experienced )?(?:builder|contractor)|(?:so |and )?(?:would|does|will|could) that\b)/i.test(question.trim())&&question.length<=300;
}
export function questionForAnswer(question:string,state:State){return continuesQuestion(question,state)?state.activeQuestion+'\nProject updates: '+[...(state.activeUpdates??[]),question].join(' '):question;}
export function systemComparisonAsked(question:string){return /steel/i.test(question)&&/timber|wood|lumber|stick[ -]?buil[dt]|traditional fram/i.test(question)&&/compar|versus|\bvs\b|differ|cost|pric|cheap|expensive|spend|premium|sav|fast|speed|time|advantage/i.test(question);}

export function refersToSelectedHome(question:string){
 // In "what does it cost to deliver a kit", it is a dummy subject, not the
 // previously discussed design. A later "ship it" or "that home" still refers.
 const referential=question.replace(/\bit\b(?=\s+(?:cost|take)\b[^?]{0,35}\b(?:deliver|ship|transport)\b)/gi,'');
 return /\b(?:home we discussed|that home|that design|the model|the home|my home|our home|chosen home|selected home|it|its|those priorities)\b/i.test(referential);
}
