import {hasGatewayAuthentication} from '@/lib/concierge/gateway';
import {answerQuestion} from '@/lib/concierge/audited/compose';
import {parseRequest,sessionCookie,cookieMatches} from '@/lib/concierge/audited/request';
import {readState,signState} from '@/lib/concierge/audited/state';
import {evaluationAccess,evidence,type Evaluation} from '@/lib/concierge/audited/evaluation';
import {knowledgeVersion} from '@/lib/concierge/audited/registry';
import {anonymousKey,checkOrigin,ConciergeRequestError,conciergeEnabled,createLimiter,issueToken,json,readBody,verifyToken} from '@/lib/concierge/security';
import type {InferenceContext} from '@/lib/concierge/audited/llm';
export const runtime='nodejs';export const maxDuration=60;
const sessions=createLimiter(20),requests=createLimiter(30),turns=createLimiter(16);let inFlight=0;
function ready(){return conciergeEnabled()&&Boolean(process.env.CONCIERGE_REQUEST_SECRET&&process.env.AI_GATEWAY_MODEL&&hasGatewayAuthentication())}
export async function GET(request:Request){
  if(!ready())return json({available:false,error:'The assistant is temporarily unavailable. Please try again or talk with our team.'},503);
  let evaluation:Evaluation|null;try{evaluation=evaluationAccess(request)}catch{return json({error:'Invalid evaluation access.'},403)}
  const secret=process.env.CONCIERGE_REQUEST_SECRET!,key=anonymousKey(request,secret)+(evaluation?':'+evaluation.run+':'+evaluation.caseId:'');
  if(!sessions(key))return json({error:'Please wait before starting another conversation.'},429);
  const token=issueToken(secret,'chat'),nonce=verifyToken(token,secret,'chat')!,response=json({available:true,token,sessionState:signState(readState(undefined,nonce,secret),secret),knowledgeVersion,_evaluation:evidence(evaluation)});
  response.headers.append('Set-Cookie',`hd_concierge_session=${sessionCookie(nonce,secret)}; Path=/api/concierge; HttpOnly; SameSite=Strict; Max-Age=3600${new URL(request.url).protocol==='https:'?'; Secure':''}`);return response;
}
export async function POST(request:Request){
  let evaluation:Evaluation|null=null;const ctx:InferenceContext={calls:0,completed:0};
  const reply=(body:object,status=200)=>json({...body,_evaluation:evidence(evaluation,ctx)},status);
  try{
    try{evaluation=evaluationAccess(request)}catch{return reply({error:'Invalid evaluation access.'},403)}
    checkOrigin(request);if(!ready())return reply({error:'The assistant is temporarily unavailable. Please try again or talk with our team.'},503);
    const secret=process.env.CONCIERGE_REQUEST_SECRET!,key=anonymousKey(request,secret)+(evaluation?':'+evaluation.run+':'+evaluation.caseId:'');
    if(!requests(key)||evaluation?.fault==='rate')return reply({error:'Please pause before asking another question.'},429);
    const body=await readBody(request),input=parseRequest(body),nonce=verifyToken(body.token,secret,'chat');
    if(!nonce||body.website||!cookieMatches(request,nonce,secret))return reply({error:'Please start a new conversation to refresh its verification.'},403);
    let state;try{state=readState(input.sessionState,nonce,secret)}catch{return reply({error:'Please start a new conversation to refresh its verification.'},403)}
    if(!turns(nonce))return reply({error:'Please start a new conversation or request a personal review.'},429);
    if(inFlight>=2||evaluation?.fault==='busy')return reply({error:'The assistant is helping other visitors. Please try again shortly.'},429);
    inFlight++;
    try{ctx.signal=AbortSignal.any([request.signal,AbortSignal.timeout(40_000)]);ctx.contexts=evaluation?[]:undefined;ctx.fault=evaluation?.fault==='timeout'?'timeout':evaluation?.fault==='invalid'?'invalid':undefined;
      const result=await answerQuestion(input.question,state,ctx);
      return reply({reply:result.reply,sessionState:signState(result.state,secret),knowledgeVersion,sourceIds:result.sourceIds,responseMode:result.mode});
    }finally{inFlight--}
  }catch(error){if(error instanceof ConciergeRequestError)return reply({error:error.message},error.status);console.error(JSON.stringify({event:'concierge_request_failed'}));return reply({error:'I couldn’t connect just now. Your question is still here; please try again.'},503)}
}
