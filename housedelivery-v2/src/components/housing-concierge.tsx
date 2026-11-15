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
    <button ref={button} type="button" className={styles.launcher} hidden={open} aria-label="Housing Concierge" title="Housing Concierge" aria-haspopup="dialog" aria-expanded={open} aria-controls={loaded?'housing-concierge-panel':undefined} onClick={()=>{setLoaded(true);setOpen(v=>!v);if(!open)trackAnalyticsEvent('concierge_opened')}}>
      <span className={styles.launcherIcon}><MessageSquare size={18} strokeWidth={1.5} aria-hidden="true"/></span><span className={styles.launcherLabel}>Housing Concierge</span>
    </button>
    {loaded?<Panel open={open} onClose={close}/>:null}
  </div>;
}
