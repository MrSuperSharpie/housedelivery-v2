"use client";
import dynamic from 'next/dynamic';
import {useRef,useState} from 'react';
import {MessageSquare} from 'lucide-react';
import {trackAnalyticsEvent} from '@/lib/analytics';
import styles from './housing-concierge.module.css';
const Panel=dynamic(()=>import('./housing-concierge-panel'),{ssr:false});
export function HousingConcierge(){
  const [open,setOpen]=useState(false),[loaded,setLoaded]=useState(false),button=useRef<HTMLButtonElement>(null);
  function close(){setOpen(false);requestAnimationFrame(()=>button.current?.focus())}
  return <div data-concierge data-clarity-mask="true">
    <button ref={button} type="button" className={styles.launcher} aria-haspopup="dialog" aria-expanded={open} aria-controls={loaded?'housing-concierge-panel':undefined} onClick={()=>{setLoaded(true);setOpen(v=>!v);if(!open)trackAnalyticsEvent('concierge_opened')}}>
      <MessageSquare size={17} aria-hidden="true"/>Ask House Delivery
    </button>
    {loaded?<Panel open={open} onClose={close}/>:null}
  </div>;
}
