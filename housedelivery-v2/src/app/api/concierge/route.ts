import {planAnswer,hasGatewayAuthentication} from '@/lib/concierge/model';
import {parseChat,renderPlan,restrictedQuestion,restrictedReply} from '@/lib/concierge/knowledge';
import {anonymousKey,checkOrigin,ConciergeRequestError,conciergeEnabled,createLimiter,issueToken,json,readBody,verifyToken} from '@/lib/concierge/security';
export const runtime='nodejs';export const maxDuration=30;
const sessions=createLimiter(20),requests=createLimiter(30),turns=createLimiter(16);let inFlight=0;
function ready(){return conciergeEnabled()&&Boolean(process.env.CONCIERGE_REQUEST_SECRET&&process.env.AI_GATEWAY_MODEL&&hasGatewayAuthentication())}
export async function GET(request:Request){if(!ready())return json({available:false},503);const secret=process.env.CONCIERGE_REQUEST_SECRET!;if(!sessions(anonymousKey(request,secret)))return json({error:'Please wait before starting another conversation.'},429);return json({available:true,token:issueToken(secret,'chat')})}
export async function POST(request:Request){
  try{
    checkOrigin(request);if(!ready())return json({error:'The automated assistant is temporarily unavailable. Please request a personal project review.'},503);
    const secret=process.env.CONCIERGE_REQUEST_SECRET!,key=anonymousKey(request,secret);
    if(!requests(key))return json({error:'Please pause before asking another question, or request a personal project review.'},429);
    const body=await readBody(request),nonce=verifyToken(body.token,secret,'chat');
    if(!nonce||body.website)return json({error:'Please reopen the assistant to refresh this conversation.'},403);
    if(!turns(nonce))return json({error:'Please start a new conversation or share your project for a personal review.'},429);
    const input=parseChat(body);
    if(restrictedQuestion(input.question))return json({reply:restrictedReply});
    if(inFlight>=2)return json({error:'The assistant is helping other visitors. Please try again shortly.'},429);
    inFlight++;
    try{return json({reply:renderPlan(await planAnswer(input.question,input.history,input.sourcePath,request.signal))})}finally{inFlight--}
  }catch(error){if(error instanceof ConciergeRequestError)return json({error:error.message},error.status);if(error instanceof Error&&/Invalid|Please/.test(error.message))return json({error:'Please shorten your question or start a new conversation.'},400);
    // Never log prompt, response, contact details, provider bodies or secrets.
    console.error(JSON.stringify({event:'concierge_chat_unavailable'}));return json({error:'The automated assistant is temporarily unavailable. Your question was not sent to our sales team. Please request a personal project review.'},503)}
}
