import {createHmac, randomUUID, timingSafeEqual} from 'node:crypto';
export class ConciergeRequestError extends Error { constructor(message:string, public status=400){super(message)} }
export function conciergeEnabled(){return process.env.CONCIERGE_ENABLED==='true' && process.env.VERCEL_ENV!=='production'}
export function json(body:object,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
export function checkOrigin(request:Request){
  let origin:URL;try{origin=new URL(request.headers.get('origin')??'')}catch{throw new ConciergeRequestError('Please use the House Delivery website.',403)}
  const host=request.headers.get('host')??new URL(request.url).host;
  const protocolAllowed=origin.protocol==='https:'||(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname));
  if(origin.host!==host||!protocolAllowed||request.headers.get('sec-fetch-site')==='cross-site')throw new ConciergeRequestError('Please use the House Delivery website.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ConciergeRequestError('Please send JSON.',415);
}
export async function readBody(request:Request,maximum=20_000):Promise<Record<string,unknown>>{
  if(!request.body||Number(request.headers.get('content-length')??0)>maximum)throw new ConciergeRequestError('This request is too large.',413);
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximum){await reader.cancel();throw new ConciergeRequestError('This request is too large.',413)}chunks.push(value)}}finally{reader.releaseLock()}
  let value:unknown;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw new ConciergeRequestError('Please check your request.')}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new ConciergeRequestError('Please check your request.');return value as Record<string,unknown>;
}
export function issueToken(secret:string,purpose:'chat'|'lead',now=Date.now()){const value=`${purpose}.${now}.${randomUUID()}`;return value+'.'+createHmac('sha256',secret).update('hd-concierge:v1:'+value).digest('hex')}
export function verifyToken(token:unknown,secret:string,purpose:'chat'|'lead',now=Date.now()){
  if(typeof token!=='string'||token.length>200)return null;const [p,time,nonce,sig,extra]=token.split('.');if(extra||p!==purpose||!/^\d{13}$/.test(time??'')||!/^[a-f0-9-]{36}$/.test(nonce??'')||!/^[a-f0-9]{64}$/.test(sig??''))return null;
  if(now-Number(time)<(purpose==='lead'?500:0)||now-Number(time)>60*60_000)return null;const expected=createHmac('sha256',secret).update('hd-concierge:v1:'+`${p}.${time}.${nonce}`).digest('hex');return timingSafeEqual(Buffer.from(sig),Buffer.from(expected))?nonce:null;
}
export function createLimiter(maximum:number,windowMs=15*60_000){const entries=new Map<string,{count:number;until:number}>();return(key:string,now=Date.now())=>{for(const [k,v]of entries)if(v.until<=now)entries.delete(k);const e=entries.get(key);if(e&&e.count>=maximum)return false;if(e)e.count++;else{if(entries.size>=2000)return false;entries.set(key,{count:1,until:now+windowMs})}return true}}
export function anonymousKey(request:Request,secret:string){const ip=(request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'local').split(',')[0].trim();return createHmac('sha256',secret).update('hd-concierge-rate:'+ip).digest('hex')}
