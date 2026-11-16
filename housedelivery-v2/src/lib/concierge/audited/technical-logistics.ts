// Public subject routing. A technical or customer quotation question does not
// itself request a supplier identity or a private manufacturer purchasing record.
export function technicalDocumentationAsked(q:string){return /\b(?:engineering|technical|specifications?|specs?|structural|test(?:ing)?|quality|certification)\b/i.test(q)&&/\b(?:documents?|documentation|sheets?|specifications?|specs?|reports?|records?|drawings?|evidence|verif\w*|review|access|available|get|see|receive|provide|release)\b/i.test(q)}
export function manufacturingQualityAsked(q:string){return /manufactur|factor|production|components?|systems?/i.test(q)&&/\bquality\b|quality assurance|quality control|verif\w*|test(?:ing)?|certif\w*|inspection\s+(?:records?|reports?|evidence|documentation)/i.test(q)}
export function structuralOptionsAsked(q:string){return /\b(?:steel|timber|wood|engineered|structural|framing|frame)\b/i.test(q)&&/\b(?:system|options?|choices?|choose|consider|suitable|must|only|required?|instead|alternative|available|availability|guaranteed|use|built|build|made|flexib\w*)\b/i.test(q)}
export function landedDeliveryAsked(q:string){return /\b(?:CBSA|customs|duties|duty|landed|port handling|port charges|importer of record|international freight|ocean freight|shipping insurance|Incoterms)\b/i.test(q)||/\bbroker(?:age|s)?\b/i.test(q)&&!/\b(?:mortgage|lender|loan|financing)\b/i.test(q)}

export function plantVisitAsked(q:string){return /\b(?:plant|factory|manufacturing facility)\b/i.test(q)&&(/\b(?:visits?|tours?)\b/i.test(q)||/\b(?:I|we|customer|buyer)\b[^?;]{0,70}\b(?:inspect|access)\b/i.test(q))}
// Defining commercial scopes is not an unverified claim that one system or
// supplier is cheaper/better. Actual relative benefits keep evidence limits.
export function landedScopeExplanation(q:string){
 return landedDeliveryAsked(q)&&/differen|distinguish|(?:what|which)[^?;]{0,60}(?:mean|cover|scope)|explain[^?;]{0,60}scope/i.test(q)&&!/cheaper|expensive|sav(?:e|ing)|faster|slower|better|superior|inferior|reliab|durab|competitor|local (?:builder|framer)|\d+(?:\.\d+)?\s*%|costs? (?:more|less)|price advantage/i.test(q)&&!(/\bsteel\b/i.test(q)&&/\b(?:timber|wood|lumber)\b/i.test(q));
}
