"""Capture synthetic preview responses for human evaluation. Never send real leads.

Adapter command reads one JSON object from stdin, writes one JSON object to stdout.
It must return answer, sourceIds, knowledgeVersion, session, and executionEvidence.
executionEvidence must attest an actual injected/restored failure when requested.
Expected answers are never sent to the adapter. Transport tests run separately.

Example: python evaluation/run_conversations.py --output /tmp/results.json \
  --adapter python /absolute/path/preview_adapter.py
"""
import argparse, datetime, json, pathlib, subprocess, uuid
P=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('--output',required=True)
p.add_argument('--kind',choices=['all','priority','conversation','security'],default='all')
p.add_argument('--repeat',type=int,default=1)
p.add_argument('--adapter',nargs='+',required=True)
a=p.parse_args()
if not 1 <= a.repeat <= 10:p.error('repeat must be 1 to 10')
q=json.loads((P/'evaluation/priority_50.json').read_text())
s=json.loads((P/'evaluation/conversation_tests.json').read_text())
cases=[]
if a.kind in ('all','priority'):
 for x in q['questions']:
  cases.append({'id':x['id'],'turns':[{'user':x['question'],'reference_answer':x['expected_answer'],'must':x['must_satisfy'],'source_ids':x['source_ids']}]})
if a.kind in ('all','conversation'):cases+=s['scenarios']
if a.kind in ('all','security'):
 for x in s['confidentiality_tests']:
  if x['execution_mode']=='http_contract':continue
  cases.append({'id':x['id'],'turns':[{'user':t,'reference_answer':x['expected_outcome'],'must_not':x['must_not']} for t in x['turns']]})
results=[]
for repetition in range(a.repeat):
 for case in cases:
  history=[];session={'evaluationId':str(uuid.uuid4())}
  rec={'caseId':case['id'],'repeat':repetition+1,'turns':[],'reviewStatus':'pending'}
  for idx,turn in enumerate(case['turns']):
   condition=turn.get('test_condition')
   payload={'caseId':case['id'],'turnIndex':idx+1,'question':turn['user'],'history':history,'session':session,'testCondition':condition,'syntheticEvaluation':True,'leadDelivery':'mock_only'}
   try:
    r=subprocess.run(a.adapter,input=json.dumps(payload),capture_output=True,text=True,timeout=60,check=True)
    actual=json.loads(r.stdout)
    if not isinstance(actual.get('answer'),str):raise ValueError('Missing answer')
    if actual.get('knowledgeVersion')!=q['knowledge_version']:raise ValueError('Wrong knowledge version')
    evidence=actual.get('executionEvidence',{})
    if condition and evidence.get('appliedCondition')!=condition:raise ValueError('Fault condition not executed')
    if evidence.get('leadDelivery')!='mock_only':raise ValueError('Mock-only test boundary not confirmed')
    session=actual.get('session',session)
    history.append({'user':turn['user'],'assistant':actual['answer']})
    rec['turns'].append({'input':turn['user'],'actual':actual,'reference':turn,'reviewStatus':'pending'})
   except Exception as exc:
    rec['turns'].append({'input':turn['user'],'error':type(exc).__name__,'reference':turn,'reviewStatus':'execution_error'})
    break
  results.append(rec)
out=pathlib.Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps({'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'execution':'captured_not_scored','knowledgeVersion':q['knowledge_version'],'transportTests':'T01-T08 require separate HTTP/dependency evidence; A14 not counted as executed here','results':results},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'capturedCases':len(results),'review':'pending','livePassClaim':False}))
