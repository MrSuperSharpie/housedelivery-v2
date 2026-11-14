// Public transport contract; no knowledge, credentials or server modules belong here.
export const conciergeJourneys = [
  {id:'home', label:'Build My Home', description:'Find a design that fits your life.', prompt:'I’m exploring a home for myself or my family. Help me find a starting point.'},
  {id:'adu', label:'ADU / Laneway Home', description:'Explore more possibilities for your property.', prompt:'I’m exploring an ADU, laneway or carriage home. Where should I start?'},
  {id:'development', label:'Multi-Home Development', description:'Plan housing for a site or community.', prompt:'I’m exploring a multi-home housing project. Help me work through the first steps.'},
  {id:'anything', label:'Ask Anything', description:'Costs, customization, delivery and more.', prompt:''},
] as const;
export const conciergePrompts = conciergeJourneys.map(j=>j.label);
export const followUps = {
  audience: 'Are you planning for yourself, a developer, a municipality, a First Nation, or another organization?',
  location: 'Which municipality and province or territory are you considering?',
  scale: 'Approximately how many homes are you considering, and what housing mix would help?',
  site: 'Do you have a site already, or are you exploring land and servicing options?',
  timeline: 'What timing are you hoping to work toward?',
  objective: 'What matters most for this project: housing mix, design, value, local participation, or another priority?',
  bedrooms: 'How many bedrooms would feel right for you?',
  size: 'What approximate home size are you looking for?',
  design: 'What would you most like your home to offer: shared living space, private rooms, or a stronger outdoor connection?',
  property: 'Which municipality is the property in?',
  human: 'Would you like to share a short project brief for a personal review with House Delivery?',
  none: '',
} as const;
export type FollowUp = keyof typeof followUps;
export type Fact = { id: string; title: string; text: string; href: string; kind: string };
export type ChatTurn = { question: string; factIds: string[]; next: FollowUp };
export type ConciergeReply = {
  introduction: string; facts: Fact[]; question: string; next: FollowUp;
  disposition: 'answer' | 'clarify' | 'human'; detailed?: boolean;
  answerSegments?:{text:string;evidenceRefs:string[]}[];
  modelCards?:Fact[];
  nextAction?:'none'|'browse_designs'|'studio'|'lookbook'|'property_review'|'consultation'|'summary';
  actionHref?:string;
  proposedSummary?:string;showSummary?:boolean;
  knowledgeVersion?:string;
};
export const audiences = ['Individual / family', 'Developer', 'Municipality', 'First Nation / Indigenous community', 'Non-profit / institution', 'Other organization'] as const;
export const housingTypes = ['Custom home', 'Laneway / carriage home', 'Duplex / multiplex', 'Multi-home development', 'Community housing program', 'Still exploring'] as const;
export const provinces = ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'] as const;
export const homeCounts = ['1', '2–10', '11–20', '21–50', '51–100', '101–500', '500+', 'Not yet known'] as const;
export const siteStatuses = ['Site owned / controlled', 'Acquisition or lease in progress', 'Exploring sites', 'Community / municipal land review', 'Not yet known'] as const;
export const timings = ['Within 6 months', '6–12 months', '12–24 months', 'More than 24 months', 'Phased program', 'Still exploring'] as const;
