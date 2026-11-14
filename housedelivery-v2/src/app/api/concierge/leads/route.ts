import {evaluationAccess,evidence} from '@/lib/concierge/audited/evaluation';
import {sendInquiryEmail} from '@/lib/inquiry-email';
import {formatLead,handleLead} from '@/lib/concierge/lead';
import {anonymousKey,conciergeEnabled,createLimiter,issueToken,json} from '@/lib/concierge/security';
export const runtime='nodejs';export const maxDuration=15;
const tokens=createLimiter(8);
function ready(){return conciergeEnabled()&&Boolean(process.env.CONCIERGE_REQUEST_SECRET&&process.env.RESEND_API_KEY)}
export async function GET(request:Request){let evaluation;try{evaluation=evaluationAccess(request)}catch{return json({error:'Invalid evaluation access.'},403)}if(!ready())return json({error:'Please use our project-review form while this intake is unavailable.'},503);const secret=process.env.CONCIERGE_REQUEST_SECRET!;if(!tokens(anonymousKey(request,secret)+(evaluation?':'+evaluation.run+':'+evaluation.caseId:'')))return json({error:'Please wait before starting another inquiry.'},429);return json({token:issueToken(secret,'lead'),_evaluation:evidence(evaluation)})}
const mockAccepted=new Set<string>();
export async function POST(request:Request){
  let evaluation;try{evaluation=evaluationAccess(request)}catch{return json({error:'Invalid evaluation access.'},403)}
  if(!ready())return json({error:'Please use our project-review form while this intake is unavailable.'},503);
  let effects=0;
  const response=await handleLead(request,{secret:process.env.CONCIERGE_REQUEST_SECRET!,limiterKey:evaluation?evaluation.run+':'+evaluation.caseId:undefined,deliver:(id,lead)=>{
    if(evaluation){if(evaluation.fault==='lead_failure')return Promise.resolve(Response.json({error:'Synthetic transport rejection'},{status:502}));if(!mockAccepted.has(id)){mockAccepted.add(id);effects++}return Promise.resolve(Response.json({id:'mock-'+id}))}
    return sendInquiryEmail({apiKey:process.env.RESEND_API_KEY!,idempotencyKey:'ai-concierge-'+id,message:{from:process.env.INQUIRY_FROM_EMAIL?.trim()||'House Delivery Website <inquiries@housedelivery.ca>',to:['sales@housedelivery.ca'],reply_to:lead.email,subject:`${process.env.VERCEL_ENV==='preview'?'[PREVIEW] ':''}AI Concierge — ${lead.housingType} — ${lead.municipality}`,text:formatLead(id,lead)}})
  }});
  return evaluation?json({...await response.json(),_evaluation:evidence(evaluation,undefined,{leadSideEffects:effects})},response.status):response;
}
