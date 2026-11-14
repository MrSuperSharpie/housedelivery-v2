"""Artifact and deterministic behavior checks. Does NOT run or certify the chatbot."""
import copy, datetime, json, pathlib, re, sys
from urllib.parse import urlsplit
from decimal import Decimal
from reference_matching import shortlist, to_sqft, illustrative_total
import jsonschema

P=pathlib.Path(__file__).resolve().parents[1]
load=lambda f:json.loads((P/f).read_text())
k=load('public/knowledge.json'); q=load('evaluation/priority_50.json')
t=load('evaluation/conversation_tests.json'); sec=load('evaluation/transport_security_tests.json')
ledger=load('maintainer/review_ledger.json');schema=load('public/knowledge.schema.json')
groups=[]
def check(name,fn):
 fn();groups.append({'group':name,'result':'pass'})
def require(ok,msg):
 if not ok:raise AssertionError(msg)
def structural():
 jsonschema.Draft202012Validator.check_schema(schema)
 jsonschema.Draft202012Validator(schema).validate(k)
 for key in ('models','facts','sources'):
  ids=[x['id'] for x in k[key]];require(len(ids)==len(set(ids)),'duplicate '+key)
check('Closed JSON schema and unique registry IDs',structural)

S={s['id'] for s in k['sources']};M={m['id']:m for m in k['models']};F={f['id'] for f in k['facts']}
def refs():
 def walk(x):
  if isinstance(x,dict):
   for name,value in x.items():
    if name in ('source_ids','drawing_source_ids'):require(set(value)<=S,'unknown source reference')
    if name=='field_sources':
     for ids in value.values():require(set(ids)<=S,'unknown field source')
    walk(value)
  elif isinstance(x,list):
   for a in x:walk(a)
 walk(k);walk(q);walk(t);walk(ledger)
 for x in k['design_studios']:require(x['model_id'] in M,'unknown Studio model')
 for x in q['questions']:require(set(x['model_ids'])<=M.keys(),'unknown QA model')
check('All fact, model, Studio and evaluation source references resolve',refs)

def counts():
 require(len(M)==31 and len(F)==31 and len(k['design_studios'])==18,'catalogue completeness')
 require(len(q['questions'])==50 and len({a['id'] for a in q['questions']})==50,'priority set')
 require(len({a['category'] for a in q['questions']})==10,'category coverage')
 require(len(ledger['questions'])==150,'original audit coverage')
 require(len(t['scenarios'])==25 and sum(len(s['turns']) for s in t['scenarios'])==75,'conversation coverage')
 require(len(t['confidentiality_tests'])==15 and len(sec['fixtures'])==8,'security coverage')
 for x in [q,t,sec,ledger]:require(x['knowledge_version']==k['knowledge_version'],'version mismatch')
check('31 models, 50 priority answers, 150 audited references, 25 conversations and security coverage',counts)

def no_raw():
 for m in M.values():
  require(isinstance(m['features'],list) and all(isinstance(f,str) and len(f)<180 for f in m['features']),'raw feature body')
  require(not any(re.search(r'https?://|!\[|<script|<iframe',f,re.I) for f in m['features']),'embedded feature asset')
 for s in k['sources']:
  if s['url']:
   u=urlsplit(s['url']);require(u.scheme=='https' and u.hostname in ('www.housedelivery.ca','housedelivery.ca','assets.cmhc-schl.gc.ca'),'unapproved source host')
 for m in M.values():
  for key in ('url','floor_plan_url'):
   if m.get(key):require(urlsplit(m[key]).hostname in ('www.housedelivery.ca','housedelivery.ca'),'unapproved model link')
check('No raw page bodies or asset URLs in model features; source/link host allowlist',no_raw)

models=k['models']
ids=lambda r:[x['id'] for x in r['matches']]
def sizes():
 require(ids(shortlist(models,bedrooms=4,target_sqft=2500))==['home-aurora','home-summit'],'approximate 2500')
 require(ids(shortlist(models,bedrooms=4,target_sqft=2500,max_sqft=2500))==['home-aurora'],'hard maximum')
 require(ids(shortlist(models,bedrooms=4,target_sqft=3500))==['home-canmore','home-cascade'],'4 bed 3500')
 require(ids(shortlist(models,bedrooms=5,target_sqft=3500))==['home-saturna','home-maplewood'],'5 bed 3500')
 require(ids(shortlist(models,bedrooms=5,target_sqft=4000))==['home-dalton','home-south-bay'],'5 bed 4000')
 require(ids(shortlist(models,bedrooms=4,minimum_bedrooms=True,target_sqft=3500))==['home-canmore','home-saturna'],'at least four is not exactly four')
 require(ids(shortlist(models,bedrooms=4,min_sqft=3150,max_sqft=3400))==['home-cedarview'],'hard area range')
 r=shortlist(models,bedrooms=5,target_sqft=2500)
 require(not r['matches'] and r['outside_target_alternatives'][0]['id']=='home-maplewood','out-of-range false match')
 require(not ids(shortlist(models,bedrooms=3,target_sqft=1800)),'invented 1800 detached match')
 require('home-salt-spring' not in ids(shortlist(models,bedrooms=8,target_sqft=6000)),'duplex treated as single home')
check('Bedroom corrections, hard/approximate limits and no false detached match',sizes)

def compact():
 require(ids(shortlist(models,family='compact',bedrooms=2,target_sqft=600))==['carriage-moonlight-house','carriage-limetree-house'],'compact matching')
 require(ids(shortlist(models,family='compact',bedrooms=2,target_sqft=600,bathrooms_min=2))==['carriage-moonlight-house'],'bathroom priority')
 require(ids(shortlist(models,family='compact',bedrooms=1,storeys=1))==['catalog-the-micro'],'single-storey evidence')
 require(ids(shortlist(models,family='compact',bedrooms=2,area_basis='internal',max_sqft=600))==['carriage-limetree-house'],'internal basis')
 require(not ids(shortlist(models,family='compact',bedrooms=2,area_basis='published',max_sqft=600)),'internal vs model conflation')
 require('carriage-lantern-house' not in ids(shortlist(models,family='compact',bedrooms=2,max_sqft=10000,limit=20)),'unknown area matched')
check('Compact/ADU cross-family search, bathrooms, unknown fields and internal area basis',compact)

def development():
 require(ids(shortlist(models,family='cmhc_catalogue',units=4,bedrooms_per_unit=3))==['catalog-bc-fourplex-2'],'per-unit matching')
 require('catalog-bc-duplex' not in ids(shortlist(models,family='cmhc_catalogue',units=2,storeys=2,bedrooms_per_unit=3,target_sqft=2927)),'conflicting Duplex storeys')
 require(not ids(shortlist(models,family='cmhc_catalogue',units=6,target_sqft=6200)),'conflicting Sixplex area')
 require(ids(shortlist(models,family='cmhc_catalogue',units=6))==['catalog-sixplex-courtyard'],'sixplex discussion overblocked')
 require(M['home-salt-spring']['bedrooms_basis']=='combined_building','combined bedroom basis')
check('Development unit schedules and field-specific conflict containment',development)

def pricing():
 require(illustrative_total(2486,250)==Decimal('621500'),'Premium arithmetic')
 require(illustrative_total(2486,300)==Decimal('745800'),'Signature arithmetic')
 require(abs(to_sqft(230,'m²')-2475.6994)<0.001,'metric conversion')
 require(round(to_sqft(573.9,'m2'))==6177,'sixplex conversion')
 require(round(to_sqft(54.74,'m2'))==589,'internal conversion')
 require(all(m['price_rule']=='PR-QUOTE' for m in models if m['id']!='home-salt-spring'),'rate scope leak')
 require(next(r for r in k['price_rules'] if r['id']=='PR-SALT-DISPLAY')['allows_mixed_tier_total'] is False,'mixed tier quote')
check('Exact arithmetic and restricted pricing applicability',pricing)

def bad_inputs():
 for value in [0,-2,float('inf'),float('nan')]:
  try:to_sqft(value,'sf')
  except ValueError:pass
  else:raise AssertionError('invalid input accepted')
 for mutation in ['extra_top','extra_nested','negative_area']:
  v=copy.deepcopy(k)
  if mutation=='extra_top':v['admin']=True
  elif mutation=='extra_nested':v['models'][0]['private_quote']='synthetic_canary'
  else:v['models'][0]['area_sqft']=-1
  require(not jsonschema.Draft202012Validator(schema).is_valid(v),'schema accepts '+mutation)
check('Reject invalid measurements and unknown schema fields',bad_inputs)

def expectations():
 by={s['id']:s for s in t['scenarios']}
 require(not by['C16']['turns'][2]['reference_answer'].startswith('No.'),'wrong cultural response')
 require(not by['C22']['turns'][2]['reference_answer'].startswith('No.'),'wrong exclusion response')
 require(len(set(x['reference_answer'] for x in by['C21']['turns']))==3,'repetitive warranty response')
 require(by['C24']['turns'][1]['test_condition']=='force_inference_timeout','missing fault condition')
 require(t['confidentiality_tests'][13]['execution_mode']=='http_contract','fake API test')
 require(all(x['source_ids'] for x in q['questions']),'missing priority evidence')
 require('not_run' in sec['execution_status'] and 'not_run' in t['execution_status'],'invented live pass')
check('Known context defects corrected and unexecuted tests labelled honestly',expectations)

result={'knowledge_version':k['knowledge_version'],'executed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'validation_kind':'artifact_and_deterministic_reference_checks','result':'pass','groups':groups,'live_concierge_execution':'not_performed','security_transport_execution':'not_performed','human_editorial_review':'150 original answers, 75 reference turns and 15 security cases reviewed; this is not a live-model score','limitations':'Schema, reference-function and content checks do not certify live grounding, provider availability, privacy configuration or submission behavior.'}
(P/'maintainer/validation_report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'result':'pass','check_groups':len(groups),'live_test_status':'not_performed'}))
