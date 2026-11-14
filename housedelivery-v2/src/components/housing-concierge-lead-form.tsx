'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {audiences,homeCounts,housingTypes,provinces,siteStatuses,timings} from '@/lib/concierge/contracts';
import {trackAnalyticsEvent} from '@/lib/analytics';
import styles from './housing-concierge.module.css';
const choices=[['audience','I’m planning as',audiences],['province','Province / territory',provinces],['housingType','Housing type',housingTypes],['homeCount','Approximate number of homes',homeCounts],['siteStatus','Land / site status',siteStatuses],['timeline','Timing',timings]] as const;
export default function ConciergeLeadForm({sourcePath,proposedSummary=''}:{sourcePath:string;proposedSummary?:string}){
  const [token,setToken]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reference,setReference]=useState('');
  useEffect(()=>{let active=true;fetch('/api/concierge/leads',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok||!d.token)throw Error(d.error||'This intake is temporarily unavailable.');if(active)setToken(d.token)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Please use our project-review form.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy||!token)return;const data=new FormData(event.currentTarget);setError('');setBusy(true);try{const r=await fetch('/api/concierge/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(data.entries()),consent:data.get('consent')==='on',sourcePath,token})}),d=await r.json();if(!r.ok||d.accepted!==true||!d.reference)throw Error(d.error||'We couldn’t confirm delivery. Please try again.');setReference(d.reference);trackAnalyticsEvent('concierge_lead_submitted',{source:'ai-concierge'})}catch(e){setError(e instanceof Error?e.message:'We couldn’t confirm delivery. Please try again.')}finally{setBusy(false)}}
  if(reference)return <div className={styles.leadBody} role="status"><p className={styles.eyebrow}>Project inquiry received</p><h3>Thank you.<br/>Let’s start a conversation.</h3><p>Your reviewed project details were delivered to House Delivery for personal follow-up.</p><p className={styles.reference}>Reference: {reference}</p><p>No marketing subscription was created.</p><a href="/plan-a-housing-project">Explore project planning <ArrowUpRight size={14}/></a></div>;
  return <form className={styles.leadBody} onSubmit={submit} data-clarity-mask="true"><p className={styles.eyebrow}>A personal project review</p><h3>Tell us what<br/>you have in mind.</h3><p>Review exactly what you’d like to share. This form goes to the House Delivery team, separately from the AI. Your chat transcript is not attached.</p>
    <fieldset disabled={busy||loading||!token}><legend>Your project</legend><div className={styles.fields}>
      <label>Organization <span>(optional)</span><input name="organization" maxLength={160} autoComplete="organization"/></label>
      {choices.map(([name,label,options])=><label key={name}>{label}<select name={name} aria-label={label} required defaultValue=""><option value="" disabled>Select an option</option>{options.map(o=><option key={o}>{o}</option>)}</select></label>)}
      <label>Municipality / community<input name="municipality" maxLength={120} autoComplete="address-level2" required/></label>
      <label>Review your project summary<textarea name="objective" rows={5} maxLength={1200} required defaultValue={proposedSummary.slice(0,1200)} placeholder="Housing needs, site context and what you’d like help with."/></label>
    </div></fieldset>
    <fieldset disabled={busy||loading||!token}><legend>Your contact details</legend><div className={styles.fields}><label>Full name<input name="fullName" autoComplete="name" maxLength={120} required/></label><label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required/></label><label>Telephone <span>(optional)</span><input name="phone" type="tel" autoComplete="tel" maxLength={50}/></label></div>
      <div className={styles.honeypot} aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
      <label className={styles.consent}><input type="checkbox" name="consent" required/><span>I give House Delivery permission to receive these project and contact details and contact me about this inquiry. This does not subscribe me to marketing.</span></label>
      <p className={styles.notice}>Delivery uses our existing email provider. Contact details are not sent to the AI. <a href="/privacy">Privacy &amp; Cookies</a></p>
      <button type="submit" className={styles.primaryButton}>{busy?'Sending your project…':'Send for personal review'}<ArrowUpRight size={16}/></button>
    </fieldset>
    {loading?<p role="status">Preparing secure intake…</p>:null}{error?<p role="alert" className={styles.error}>{error}</p>:null}<a className={styles.alternative} href="/plan-a-housing-project">Use the existing project-review form <ArrowUpRight size={14}/></a>
  </form>;
}
