'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {ArrowUpRight,Plus} from 'lucide-react';
import Link from 'next/link';
import {audiences,homeCounts,housingTypes,siteStatuses,timings} from '@/lib/concierge/contracts';
import {trackAnalyticsEvent} from '@/lib/analytics';
import styles from './housing-concierge.module.css';
const optionalChoices=[['housingType','Housing type',housingTypes],['homeCount','Approximate number of homes',homeCounts],['siteStatus','Land / site status',siteStatuses],['timeline','Project timing',timings]] as const;
export default function ConciergeLeadForm({sourcePath}:{sourcePath:string}){
  const [token,setToken]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reference,setReference]=useState('');
  useEffect(()=>{let active=true;fetch('/api/concierge/leads',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok||!d.token)throw Error(d.error||'This intake is temporarily unavailable.');if(active)setToken(d.token)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Please use our project-review form.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy||!token)return;const data=new FormData(event.currentTarget);setError('');setBusy(true);try{const r=await fetch('/api/concierge/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(data.entries()),consent:data.get('consent')==='on',sourcePath,token})}),d=await r.json();if(!r.ok||d.accepted!==true||!d.reference)throw Error(d.error||'We couldn’t confirm delivery. Please try again.');setReference(d.reference);trackAnalyticsEvent('concierge_lead_submitted',{source:'ai-concierge'})}catch(e){setError(e instanceof Error?e.message:'We couldn’t confirm delivery. Please try again.')}finally{setBusy(false)}}
  if(reference)return <div className={styles.leadBody} role="status"><p className={styles.eyebrow}>Project inquiry received</p><h3>Thank you. We&apos;ve received your inquiry.</h3><p>Our team will review your project details and be in touch.</p><p className={styles.reference}>Reference: {reference}</p><p>No marketing subscription was created.</p><Link href="/">Continue browsing House Delivery <ArrowUpRight size={14}/></Link></div>;
  return <form className={styles.leadBody} onSubmit={submit} data-clarity-mask="true"><p className={styles.eyebrow}>A personal project review</p><h3>Let&apos;s talk about your project.</h3><p>Tell us a little about what you&apos;re planning and our team will follow up personally.</p><p className={styles.leadPrivacy}>Your AI conversation is private and is not automatically attached to this inquiry.</p>
    <fieldset disabled={busy||loading||!token}><legend className={styles.srOnly}>Your inquiry</legend><div className={styles.fields}>
      <label>Full name<input name="fullName" autoComplete="name" maxLength={120} required/></label>
      <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required/></label>
      <label>I&apos;m planning as...<select name="audience" aria-label="I'm planning as..." required defaultValue=""><option value="" disabled>Select an option</option>{audiences.map(o=><option key={o}>{o}</option>)}</select></label>
      <label><span>Project location (optional)</span><input name="location" maxLength={240} placeholder="City, community or province"/></label>
      <label><span>Tell us about your project (optional)</span><textarea className={styles.projectDescription} name="objective" rows={3} maxLength={1200} placeholder="What are you hoping to build? Share whatever details you have."/></label>
    </div>
      <details className={styles.projectDetails}><summary><Plus size={15} strokeWidth={1.5} aria-hidden="true"/><span>Add project details (optional)</span></summary><div className={styles.fields}>
        <label>Organization name<input name="organization" maxLength={160} autoComplete="organization"/></label>
        {optionalChoices.map(([name,label,options])=><label key={name}>{label}<select name={name} aria-label={label} defaultValue=""><option value="">Not specified</option>{options.map(o=><option key={o}>{o}</option>)}</select></label>)}
        <label>Telephone number<input name="phone" type="tel" autoComplete="tel" maxLength={50}/></label>
      </div></details>
      <div className={styles.honeypot} aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
      <label className={styles.consent}><input type="checkbox" name="consent" required/><span>I give House Delivery permission to receive these project and contact details and contact me about this inquiry. This does not subscribe me to marketing.</span></label>
      <p className={styles.notice}>Delivery uses our existing email provider. Contact details are not sent to the AI. <a href="/privacy">Privacy &amp; Cookies</a></p>
      <button type="submit" className={styles.primaryButton}>{busy?'Sending your inquiry…':'Request a Project Conversation'}<ArrowUpRight size={16}/></button>
    </fieldset>
    {loading?<p role="status">Preparing secure intake…</p>:null}{error?<p role="alert" className={styles.error}>{error}</p>:null}<a className={styles.alternative} href="/plan-a-housing-project">Use the existing project-review form <ArrowUpRight size={14}/></a>
  </form>;
}
