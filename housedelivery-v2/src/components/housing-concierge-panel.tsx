"use client";
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowUpRight,ArrowUp,X,RotateCcw,ArrowLeft} from 'lucide-react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {conciergeJourneys,type ChatTurn,type ConciergeReply} from '@/lib/concierge/contracts';
import {trackAnalyticsEvent} from '@/lib/analytics';
import ConciergeLeadForm from './housing-concierge-lead-form';
import styles from './housing-concierge.module.css';
type Message={question:string;reply?:ConciergeReply};
export default function HousingConciergePanel({open,onClose}:{open:boolean;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),end=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null),abort=useRef<AbortController|null>(null);
  const [messages,setMessages]=useState<Message[]>([]),[draft,setDraft]=useState(''),[token,setToken]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[lead,setLead]=useState(false),[journey,setJourney]=useState('');
  const pathname=usePathname();
  async function connect(){setLoading(true);setError('');try{const r=await fetch('/api/concierge',{cache:'no-store'}),d=await r.json();if(!r.ok||!d.available||!d.token)throw Error(d.error||'The assistant is temporarily unavailable. Please try connecting again.');setToken(d.token)}catch(e){setError(e instanceof Error?e.message:'Please try connecting again.')}finally{setLoading(false)}}
  function start(){setMessages([]);setDraft('');setJourney('');setToken('');trackAnalyticsEvent('concierge_new_conversation');void connect()}
  useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.show();else if(!open)dialog.current?.close()},[open]);
  useEffect(()=>{if(!open)return;const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();onClose()}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[open,onClose]);
  useEffect(()=>{const controller=new AbortController();fetch('/api/concierge',{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok||!d.available||!d.token)throw Error(d.error||'The assistant is temporarily unavailable. Please try connecting again.');setToken(d.token)}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Please try connecting again.')}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>{controller.abort();abort.current?.abort()}},[]);
  useEffect(()=>{if(!open)return;if(messages.length||busy||error)end.current?.scrollIntoView({block:'nearest',behavior:'instant'});else end.current?.parentElement?.scrollTo({top:0})},[messages,busy,error,open]);
  async function send(question:string){
    if(busy||!token||!question.trim())return;setError('');setDraft('');
    const history:ChatTurn[]=messages.filter((m):m is Message&{reply:ConciergeReply}=>Boolean(m.reply)).slice(-12).map(m=>({question:m.question,factIds:m.reply.facts.map(f=>f.id),next:m.reply.next}));
    setMessages(m=>[...m,{question}]);setBusy(true);const controller=new AbortController();abort.current=controller;
    try{const r=await fetch('/api/concierge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,question,history,sourcePath:pathname}),signal:controller.signal}),d=await r.json();if(!r.ok||!d.reply){if(r.status===403)setToken('');throw Error(d.error||'I couldn’t connect just now. Please try again.')}setMessages(m=>m.map((item,i)=>i===m.length-1?{...item,reply:d.reply}:item))}
    catch(e){if(!controller.signal.aborted){setError(e instanceof Error?e.message:'Please try again.');setDraft(question)}}
    finally{if(!controller.signal.aborted){setBusy(false);if(open)input.current?.focus({preventScroll:true})}}
  }
  function submit(e:FormEvent){e.preventDefault();void send(draft)}
  return <dialog ref={dialog} id="housing-concierge-panel" className={styles.dialog} aria-modal="false" aria-labelledby="concierge-title" data-clarity-mask="true">
    <div className={styles.panel}>
      <header className={styles.header}><div><p className={styles.eyebrow}>House Delivery</p><h2 id="concierge-title">Your Housing Concierge</h2><p>AI guidance. A human team when you need one.</p></div><button type="button" aria-label="Close House Delivery concierge" onClick={onClose} className={styles.iconButton}><X size={20}/></button></header>
      {lead?<><div className={styles.backRow}><button type="button" onClick={()=>setLead(false)}><ArrowLeft size={15}/>Back to conversation</button></div><ConciergeLeadForm sourcePath={pathname}/></>:<>
        <div className={styles.conversation} role="log" aria-label="Conversation with House Delivery" aria-live="polite" aria-relevant="additions text">
          {!messages.length?<div className={styles.welcome}><h3>What do you have in mind?</h3><p>A home of your own, space for family, or housing for a community — let’s find your next step.</p></div>:null}
          {!messages.length&&token?<div className={styles.suggestions} aria-label="Choose your housing journey">{conciergeJourneys.map(j=><button key={j.id} type="button" aria-pressed={journey===j.id} disabled={loading||busy} onClick={()=>{setJourney(j.id);if(j.prompt)void send(j.prompt);else input.current?.focus()}}><span><strong>{j.label}</strong><small>{j.description}</small></span><ArrowUpRight size={15} aria-hidden="true"/></button>)}</div>:null}
          {messages.map((m,i)=><div key={i} className={styles.exchange}><p className={styles.visitor}><span className={styles.srOnly}>You: </span>{m.question}</p>{m.reply?<div className={styles.answer} data-concierge-answer>
            {m.reply.introduction?<p>{m.reply.introduction}</p>:null}
            {m.reply.facts.map(f=><div key={f.id} className={m.reply?.detailed?styles.fact:styles.responseText}>{m.reply?.detailed?<h4>{f.title}</h4>:null}<p>{f.text}</p></div>)}
            {m.reply.facts.length?<div className={styles.sourceLinks}>{[...new Map(m.reply.facts.map(f=>[f.href,f])).values()].slice(0,3).map(f=><Link key={f.href} href={f.href} prefetch={false}>{f.title}<ArrowUpRight size={12} aria-hidden="true"/></Link>)}</div>:null}
            {m.reply.question?<p className={styles.followUp}>{m.reply.question}</p>:null}
            {m.reply.next==='human'?<button className={styles.consultation} type="button" onClick={()=>setLead(true)}>Talk with our team<ArrowUpRight size={14}/></button>:null}
          </div>:null}</div>)}
          {loading?<p role="status" className={styles.status}>Connecting…</p>:null}{busy?<p role="status" className={styles.status}>Thinking through your question…</p>:null}
          {error?<div className={styles.error} role="alert"><p>{error}</p>{!token?<button type="button" disabled={loading} onClick={()=>void connect()}>Try connecting again</button>:null}<a href="/plan-a-housing-project">Talk with our team <ArrowUpRight size={13}/></a></div>:null}<div ref={end}/>
        </div>
        <footer className={styles.footer}>
          <form onSubmit={submit} className={styles.composer}><label htmlFor="concierge-question" className={styles.srOnly}>Your housing question</label><textarea ref={input} id="concierge-question" rows={2} maxLength={1200} placeholder={journey==='anything'?'What would you like to know?':'Tell me what you’re planning…'} value={draft} onChange={e=>setDraft(e.target.value)} disabled={loading||!token} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(!busy)void send(draft)}}}/><button type="submit" aria-label="Send question" disabled={busy||loading||!token||!draft.trim()}><ArrowUp size={19}/></button></form>
          <div className={styles.footerActions}><button type="button" onClick={()=>setLead(true)}>Talk with our team <ArrowUpRight size={14}/></button><button type="button" className={styles.iconButton} aria-label="Start a new conversation" disabled={busy||loading} onClick={start}><RotateCcw size={15}/></button></div>
          <p className={styles.notice}>AI guidance from approved House Delivery information. Keep personal and confidential details out of chat. <a href="/privacy">Privacy</a></p>
        </footer>
      </>}
    </div>
  </dialog>;
}
