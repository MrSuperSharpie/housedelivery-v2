import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {conciergeEnabled,createLimiter} from '../security';
import type {InferenceContext} from './llm';
import {getContext,getVercelOidcTokenSync} from '@vercel/oidc';
export type Evaluation={run:string;caseId:string;expires:number;fault:'none'|'timeout'|'invalid'|'busy'|'rate'|'lead_failure'|'restore'};
const runLimit=createLimiter(600,2*3600_000);
export function evaluationAccess(request:Request):Evaluation|null{
  const raw=request.headers.get('x-hd-concierge-evaluation');if(!raw)return null;
  const secret=process.env.CONCIERGE_EVALUATION_SECRET;
  if(!conciergeEnabled()||process.env.VERCEL_ENV!=='preview'||process.env.CONCIERGE_EVALUATION_ENABLED!=='true'||!secret)throw Error('Invalid evaluation access');
  const [payload,signature,extra]=raw.split('.');if(extra||raw.length>1000||!/^[a-f0-9]{64}$/.test(signature??''))throw Error('Invalid evaluation access');
  const expected=createHmac('sha256',secret).update('hd-evaluation:'+payload).digest('hex');if(!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw Error('Invalid evaluation access');
  const v=JSON.parse(Buffer.from(payload,'base64url').toString()) as Evaluation;
  if(Object.keys(v).some(k=>!['run','caseId','expires','fault'].includes(k))||!/^[a-zA-Z0-9_-]{1,80}$/.test(v.run)||!/^[a-zA-Z0-9_-]{1,80}$/.test(v.caseId)||v.expires<Date.now()||v.expires>Date.now()+2*3600_000||!['none','timeout','invalid','busy','rate','lead_failure','restore'].includes(v.fault)||!runLimit(v.run))throw Error('Invalid evaluation access');
  return v;
}
export function evidence(evaluation:Evaluation|null,ctx?:InferenceContext,extra:Record<string,unknown>={}){
  if(!evaluation)return undefined;
  let expires:number|null=null;try{const token=getVercelOidcTokenSync();expires=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).exp??null}catch{}
  return {evaluationId:evaluation.run,caseId:evaluation.caseId,modelCalls:ctx?.calls??0,completedModelCalls:ctx?.completed??0,failures:ctx?.failures??[],rejections:ctx?.rejections??[],retrieval:ctx?.retrieval??null,runtimeAuthentication:{requestOidcPresent:Boolean(getContext().headers?.['x-vercel-oidc-token']),environmentOidcPresent:Boolean(process.env.VERCEL_OIDC_TOKEN),gatewayKeyPresent:Boolean(process.env.AI_GATEWAY_API_KEY),secondsUntilOidcExpiry:expires?Math.round(expires-Date.now()/1000):null},providerTimeoutInjected:ctx?.timeoutInjected===true,appliedCondition:evaluation.fault==='timeout'&&ctx?.timeoutInjected?'force_inference_timeout':evaluation.fault==='restore'&&(ctx?.completed??0)>0?'restore_inference':null,leadDelivery:'mock_only',contextHashes:(ctx?.contexts??[]).map(s=>createHash('sha256').update(s).digest('hex')),privateCanaryInContext:(ctx?.contexts??[]).some(s=>s.includes(process.env.CONCIERGE_TEST_PRIVATE_CANARY??'PRIVATE_CANARY_NOT_CONFIGURED')),leadSideEffects:0,...extra};
}
