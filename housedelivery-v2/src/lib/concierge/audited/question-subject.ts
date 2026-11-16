// Match the requested decision, not incidental nouns in its starting point.
export function timingAsked(q:string){
 return /\b(?:how long|how soon|lead[ -]?time|timeline|timeframe|time frame|schedule|move[ -]?in|occupancy|when (?:can|could|would|will|do) (?:I|we))\b/i.test(q)&&!/\b(?:mortgage|loan|warranty|lasts?|lifespan|service life)\b/i.test(q);
}
export function designChangeAsked(q:string){
 return /\b(?:adjust|chang(?:e|es|ed|ing)|customiz\w*|modif\w*|reconfigur\w*)\b|\b(?:different|pick|choose|select)\b[^?;]{0,65}\b(?:floors?(?!\s+plans?\b)|flooring|windows?|finishes|cladding|layout)\b|\b(?:larger|bigger|wider|taller)\s+windows?\b|\b(?:\d+(?:\.\d+)?|ten)[ -]?(?:foot|feet|ft)[ -]+ceilings?\b|\b(?:bring|use|provide|supply)\b[^?;]{0,45}\barchitect(?:['’]s)?\s+(?:plans?|drawings?)\b/i.test(q);
}
export function permitDrawingsAsked(q:string){
 return /\b(?:stamped|permit|architectural)\b[^?;]{0,60}\b(?:plans?|drawings?|set|documents?)\b|\b(?:plans?|drawings?)\b[^?;]{0,45}\b(?:stamped|permit)\b/i.test(q);
}
export function manufacturingRangeAsked(q:string){
 return /\b(?:smallest|largest|minimum|maximum|min|max|limits?|range)\b/i.test(q)&&/\b(?:manufactur\w*|fabricat\w*|produc\w*)\b/i.test(q)&&/\b(?:footprint|dimensions?|size|width|length|height|area)\b/i.test(q);
}
export function coastalDurabilityAsked(q:string){
 return /\b(?:coastal|salt[ -]?air|marine|corrosion|rust|galvani[sz]\w*)\b/i.test(q)&&/\b(?:steel|framing|frame|wall|structure|metal|coating|fasteners?)\b/i.test(q);
}
