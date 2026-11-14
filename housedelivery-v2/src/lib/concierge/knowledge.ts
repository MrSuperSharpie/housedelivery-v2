import snapshot from '@/data/concierge/approved-knowledge.json';
import { followUps, type ChatTurn, type ConciergeReply, type Fact, type FollowUp } from './contracts';
import {conciseFacts,detailRequested} from './presentation';

// This static, reviewed public snapshot is the ONLY application knowledge source.
// No file reader, database client, private registry, URL fetcher or model tools.
export const knowledgeVersion = snapshot.version;
export const approvedFacts: readonly Fact[] = snapshot.facts;
const index = new Map(approvedFacts.map(f => [f.id, f]));
export type AnswerPlan = { facts: string[]; next: FollowUp; disposition: ConciergeReply['disposition'] };
const words = (s: string) => s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
const stop = new Set(['the','and','for','with','what','which','can','you','our','about','have','house','delivery','this','that','are','how','would']);

export function retrieveFacts(turns: ChatTurn[], question: string) {
  const tokens = [...new Set(words([...turns.map(t => t.question), question].join(' ')).filter(w => !stop.has(w)))];
  const ranked = approvedFacts.map(f => ({ f, score: tokens.reduce((n, w) => n + (f.title.toLowerCase().includes(w) ? 5 : 0) + (f.text.toLowerCase().includes(w) ? 1 : 0), 0) })).sort((a,b) => b.score-a.score);
  // Always give the planner the complete design collection and key scope facts.
  const fixed = approvedFacts.filter(f => ['home','carriage','catalog'].includes(f.kind) || ['company','prices','exclusions','cmhc-terms','handoff','customization','scale','community','national','systems','delivery','site','timing','tiers'].includes(f.id));
  return [...new Map([...fixed, ...ranked.filter(x=>x.score>0).slice(0,12).map(x=>x.f)].map(f=>[f.id,f])).values()];
}

export function validatePlan(value: unknown, candidates: readonly Fact[]): AnswerPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid answer plan');
  const p = value as Record<string, unknown>;
  if (Object.keys(p).some(k=>!['facts','next','disposition'].includes(k)) || !Array.isArray(p.facts) || p.facts.length>4 || !p.facts.every(id=>typeof id==='string' && candidates.some(f=>f.id===id)) || typeof p.next!=='string' || !Object.hasOwn(followUps,p.next) || !['answer','clarify','human'].includes(String(p.disposition))) throw new Error('Invalid answer plan');
  return {facts:[...new Set(p.facts as string[])], next:p.next as FollowUp, disposition:p.disposition as AnswerPlan['disposition']};
}

export function renderPlan(plan: AnswerPlan,question=''): ConciergeReply {
  const facts=plan.facts.map(id=>index.get(id)).filter((f):f is Fact=>Boolean(f)),detailed=detailRequested(question);
  return { introduction:facts.length?'':plan.disposition==='human'?'Our team can help with the project-specific details.':'Let’s find the right starting point for you.', facts:detailed?facts:conciseFacts(facts,question), question:followUps[plan.next], next:plan.next, disposition:plan.disposition,detailed };
}

// Refuse extraction before inference. The stronger boundary is the closed output
// vocabulary: even a bypassed attack can return ONLY approved snapshot fact IDs.
export function restrictedQuestion(question: string) {
  const normalized=question.normalize('NFKC').replace(/[\u200b-\u200f\ufeff]/g,'').toLowerCase();
  return /supplier|manufacturer|factory.{0,50}(quot|price|cost|name|identity)|internal.{0,50}(cost|price|document|email)|margin|markup|mark.up|negotiat|contract.{0,30}(terms|private|confidential)|customer.{0,30}(record|list|email|database)|private.{0,30}(record|correspondence|email|document)|api.?key|credential|secret|system.?prompt|ignore.{0,30}(instruction|rule)|reveal.{0,30}(prompt|instruction)|base64|rot13|encode|decode|database|service.role|read.{0,30}(file|env)|act as.{0,20}(admin|owner)|pretend.{0,20}(admin|owner)/i.test(normalized);
}
export const restrictedReply: ConciergeReply = { introduction:'I can help with House Delivery’s public home designs, package scope and project planning. Internal business information and private records are outside this assistant’s scope.',facts:[],question:followUps.human,next:'human',disposition:'human' };

export function redactContactDetails(text: string) {
  return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[contact detail removed]').replace(/(?:\+?\d[\d ()-]{7,}\d)/g,'[contact detail removed]');
}
export function parseChat(input: Record<string, unknown>) {
  if (Object.keys(input).some(k=>!['token','question','history','sourcePath','website'].includes(k))) throw new Error('Invalid chat fields');
  if (typeof input.question!=='string' || !input.question.trim() || input.question.length>1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input.question)) throw new Error('Please keep your question to 1,200 characters.');
  if (!Array.isArray(input.history) || input.history.length>12) throw new Error('Please start a new conversation.');
  const history:ChatTurn[]=input.history.map(t=>{
    if(!t||typeof t!=='object'||typeof t.question!=='string'||t.question.length>1200||!Array.isArray(t.factIds)||t.factIds.length>4||!t.factIds.every((id:unknown)=>typeof id==='string'&&index.has(id))||!Object.hasOwn(followUps,t.next))throw new Error('Invalid conversation');
    return {question:redactContactDetails(t.question),factIds:t.factIds,next:t.next as FollowUp};
  });
  const sourcePath=typeof input.sourcePath==='string'&&approvedFacts.some(f=>f.href.split('#')[0]===input.sourcePath)?input.sourcePath:'/';
  return {question:redactContactDetails(input.question.trim()),history,sourcePath};
}

export function qualifyPlan(plan: AnswerPlan): AnswerPlan {
  const required: string[]=[];
  if(plan.facts.includes('prices'))required.push('prices','exclusions');
  const catalog=plan.facts.find(id=>id.startsWith('catalog-'));
  if(catalog)required.push('cmhc-terms',catalog);
  return {...plan,facts:[...new Set([...required,...plan.facts])].slice(0,4)};
}
