import {sendInquiryEmail} from '@/lib/inquiry-email';
import {formatLead,handleLead} from '@/lib/concierge/lead';
import {anonymousKey,conciergeEnabled,createLimiter,issueToken,json} from '@/lib/concierge/security';
export const runtime='nodejs';export const maxDuration=15;
const tokens=createLimiter(8);
function ready(){return conciergeEnabled()&&Boolean(process.env.CONCIERGE_REQUEST_SECRET&&process.env.RESEND_API_KEY)}
export async function GET(request:Request){if(!ready())return json({error:'Please use our project-review form while this intake is unavailable.'},503);const secret=process.env.CONCIERGE_REQUEST_SECRET!;if(!tokens(anonymousKey(request,secret)))return json({error:'Please wait before starting another inquiry.'},429);return json({token:issueToken(secret,'lead')})}
export async function POST(request:Request){if(!ready())return json({error:'Please use our project-review form while this intake is unavailable.'},503);return handleLead(request,{secret:process.env.CONCIERGE_REQUEST_SECRET!,deliver:(id,lead)=>sendInquiryEmail({apiKey:process.env.RESEND_API_KEY!,idempotencyKey:'ai-concierge-'+id,message:{from:process.env.INQUIRY_FROM_EMAIL?.trim()||'House Delivery Website <inquiries@housedelivery.ca>',to:['sales@housedelivery.ca'],reply_to:lead.email,subject:`${process.env.VERCEL_ENV==='preview'?'[PREVIEW] ':''}AI Concierge — ${lead.housingType} — ${lead.municipality}`,text:formatLead(id,lead)}})})}
