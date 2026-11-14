import {createHmac,timingSafeEqual} from 'node:crypto';
import {historicalId,knowledge} from './registry';
import {followUps,type ChatTurn} from '../contracts';
import {ConciergeRequestError} from '../security';
export function redact(text:string){return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[contact detail removed]').replace(/(?:\+?\d[\d ()-]{7,}\d)/g,'[contact detail removed]')}
export function parseRequest(input:Record<string,unknown>){
  if(Object.keys(input).some(k=>!['token','question','history','sourcePath','website','sessionState'].includes(k)))throw new ConciergeRequestError('Please check your request.');
  if(typeof input.question!=='string'||!input.question.trim()||input.question.length>1200||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input.question))throw new ConciergeRequestError('Please keep your question to 1,200 characters.');
  if(!Array.isArray(input.history)||input.history.length>12)throw new ConciergeRequestError('Please start a new conversation.');
  const history:ChatTurn[]=input.history.map(t=>{
    if(!t||typeof t!=='object'||Object.keys(t).some(k=>!['question','factIds','next'].includes(k))||typeof t.question!=='string'||t.question.length>1200||!Array.isArray(t.factIds)||t.factIds.length>4||!t.factIds.every((id:unknown)=>typeof id==='string'&&historicalId(id))||!Object.hasOwn(followUps,t.next))throw new ConciergeRequestError('Please start a new conversation.');
    return{question:redact(t.question),factIds:t.factIds.map(historicalId),next:t.next};
  });
  const paths=new Set([...knowledge.models.map(m=>new URL(m.url).pathname),...Object.values(knowledge.routing).map(u=>new URL(u).pathname),'/']);
  return{question:redact(input.question.trim()),history,sourcePath:typeof input.sourcePath==='string'&&paths.has(input.sourcePath)?input.sourcePath:'/',sessionState:input.sessionState};
}
export function sessionCookie(nonce:string,secret:string){return nonce+'.'+createHmac('sha256',secret).update('hd-session-cookie:'+nonce).digest('hex')}
export function cookieMatches(request:Request,nonce:string,secret:string){const raw=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('hd_concierge_session='))?.slice('hd_concierge_session='.length);if(!raw||!/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(raw))return false;const expected=sessionCookie(nonce,secret);return raw.length===expected.length&&timingSafeEqual(Buffer.from(raw),Buffer.from(expected))}
