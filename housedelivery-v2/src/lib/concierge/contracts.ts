// Public transport contract; no knowledge, credentials or server modules belong here.
export const conciergePrompts = [
  'Plan a multi-home development',
  'Housing for a First Nation or community',
  'Explore home designs and customization',
  'Understand costs, inclusions and delivery',
] as const;
export const followUps = {
  audience: 'Are you planning for yourself, a developer, a municipality, a First Nation, or another organization?',
  location: 'Which municipality and province or territory are you considering?',
  scale: 'Approximately how many homes are you considering, and what housing mix would help?',
  site: 'Do you have a site already, or are you exploring land and servicing options?',
  timeline: 'What timing or phasing are you working toward?',
  objective: 'What matters most for this project: housing mix, design, value, local participation, or another priority?',
  human: 'Would you like to share a short project brief for a personal review with House Delivery?',
  none: '',
} as const;
export type FollowUp = keyof typeof followUps;
export type Fact = { id: string; title: string; text: string; href: string; kind: string };
export type ChatTurn = { question: string; factIds: string[]; next: FollowUp };
export type ConciergeReply = {
  introduction: string; facts: Fact[]; question: string; next: FollowUp;
  disposition: 'answer' | 'clarify' | 'human';
};
export const audiences = ['Individual / family', 'Developer', 'Municipality', 'First Nation / Indigenous community', 'Non-profit / institution', 'Other organization'] as const;
export const housingTypes = ['Custom home', 'Laneway / carriage home', 'Duplex / multiplex', 'Multi-home development', 'Community housing program', 'Still exploring'] as const;
export const provinces = ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'] as const;
export const homeCounts = ['1', '2–10', '11–20', '21–50', '51–100', '101–500', '500+', 'Not yet known'] as const;
export const siteStatuses = ['Site owned / controlled', 'Acquisition or lease in progress', 'Exploring sites', 'Community / municipal land review', 'Not yet known'] as const;
export const timings = ['Within 6 months', '6–12 months', '12–24 months', 'More than 24 months', 'Phased program', 'Still exploring'] as const;
