// A housing preference is not a diagnosis or an accessibility specification.
export function storeyPreference(question:string):number|undefined{
 const single='(?:(?:single|one|1)[ -](?:level|storey|story)|rancher|ranch[ -]style)';
 if(new RegExp('\\b(?:not|don[’\x27]t (?:want|need)|do not (?:want|need)|not necessarily)\\s+(?:a\\s+|an\\s+)?'+single+'\\b','i').test(question))return;
 if(/^\s*(?:what is|what does|define|does (?:the |this |that )?\w+ (?:have|mean)|is (?:the |this |that )\w+)\b/i.test(question)&&!/\b(?:want|need|prefer|looking for|show me|find)\b/i.test(question))return;
 if(new RegExp('\\b'+single+'\\b|\\b(?:no|without|avoid(?:ing)?)\\s+(?:(?:interior|internal)\\s+)?stairs\\b','i').test(question))return 1;
 const multi=question.match(/\b(two|three|[1-9])[ -](?:storeys?|stories|story|levels?)\b/i);
 return multi?({two:2,three:3}[multi[1].toLowerCase()]??Number(multi[1])):undefined;
}
export function stairDifficulty(question:string){return /\bstairs?\b/i.test(question)&&/struggl|hard time|difficult|difficulty|trouble|cannot|can[’']t/i.test(question)&&!/(?:no|not|without|doesn[’']t have)\s+(?:any\s+)?(?:trouble|difficulty|a hard time)/i.test(question)}
