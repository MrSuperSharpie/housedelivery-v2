// Adapter for the audited package harness. Expected answers are never read.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHmac,randomUUID} from 'node:crypto';
import path from 'node:path';
const dir=process.env.HD_CONCIERGE_EVALUATION_DIR;
if(!dir)throw Error('Evaluation directory is required');
const config=JSON.parse(await readFile(path.join(dir,'config.json'),'utf8'));
if(!/^https:\/\/housedelivery-v2-[a-z0-9]+-edavis-animalmarkets-projects\.vercel\.app$/.test(config.base))throw Error('Only the isolated Preview is allowed');
const secret=await readFile(path.join(dir,'CONCIERGE_EVALUATION_SECRET'),'utf8'),access=await readFile(path.join(dir,'preview-access'),'utf8');
let input='';for await(const chunk of process.stdin)input+=chunk;const p=JSON.parse(input);
if(p.syntheticEvaluation!==true||p.leadDelivery!=='mock_only')throw Error('Synthetic mock-only evaluation required');
const ref=p.session?.sessionRef??randomUUID();if(!/^[a-f0-9-]{36}$/.test(ref))throw Error('Invalid local session reference');
await mkdir(path.join(dir,'sessions'),{mode:0o700,recursive:true});const file=path.join(dir,'sessions',ref+'.json');
let session;try{session=JSON.parse(await readFile(file,'utf8'))}catch{session={history:[]}}
const fault=p.testCondition==='force_inference_timeout'?'timeout':p.testCondition==='restore_inference'?'restore':'none';
const claim={run:config.run,caseId:String(p.caseId).replace(/[^a-zA-Z0-9_-]/g,'_')+'-'+ref.slice(0,8),expires:Date.now()+90*60_000,fault};const payload=Buffer.from(JSON.stringify(claim)).toString('base64url');
const headers={'x-vercel-protection-bypass':access,'x-hd-concierge-evaluation':payload+'.'+createHmac('sha256',secret).update('hd-evaluation:'+payload).digest('hex')};
if(!session.token){const r=await fetch(config.base+'/api/concierge',{headers,signal:AbortSignal.timeout(45000)}),d=await r.json();if(!r.ok||!d.token)throw Error('Preview initialization failed: '+r.status);session={token:d.token,sessionState:d.sessionState,cookie:r.headers.get('set-cookie')?.split(';')[0],history:[]};}
const r=await fetch(config.base+'/api/concierge',{method:'POST',headers:{...headers,Origin:config.base,'Content-Type':'application/json',Cookie:session.cookie},body:JSON.stringify({token:session.token,sessionState:session.sessionState,question:p.question,history:session.history.slice(-4),sourcePath:'/'}),signal:AbortSignal.timeout(50000)}),d=await r.json();
if(!r.ok||!d.reply)throw Error('Preview conversation failed: '+r.status);
session.sessionState=d.sessionState;session.history.push({question:p.question,factIds:d.reply.facts.map(f=>f.id),next:d.reply.next});await writeFile(file,JSON.stringify(session),{mode:0o600});
const answer=[d.reply.introduction,...(d.reply.answerSegments??[]).map(s=>s.text),...(d.reply.modelCards??[]).map(c=>c.text),d.reply.nextAction==='summary'?d.reply.proposedSummary:'',d.reply.question].filter(Boolean).join('\n\n');
console.log(JSON.stringify({answer,sourceIds:d.sourceIds??[],knowledgeVersion:d.knowledgeVersion,links:d.reply.facts.map(f=>({label:f.title,href:f.href})),selectedModelIds:d.reply.modelCards?.map(m=>m.id)??[],responseMode:d.responseMode,session:{evaluationId:p.session?.evaluationId??ref,sessionRef:ref},executionEvidence:{...d._evaluation,leadDelivery:'mock_only'}}));
