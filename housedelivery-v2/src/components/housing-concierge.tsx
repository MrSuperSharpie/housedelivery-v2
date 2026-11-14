'use client';
import dynamic from 'next/dynamic';
import {useEffect,useRef,useState} from 'react';
import {MessageSquare} from 'lucide-react';
import {trackAnalyticsEvent} from '@/lib/analytics';
import styles from './housing-concierge.module.css';
const Panel=dynamic(()=>import('./housing-concierge-panel'),{ssr:false});
export function HousingConcierge(){
  const [open,setOpen]=useState(false),[positioned,setPositioned]=useState(false),[obstructed,setObstructed]=useState(false),[position,setPosition]=useState({right:true,bottom:20}),button=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(open)return;let frame=0;
    const place=()=>{frame=0;if(!button.current)return;const modal=[...document.querySelectorAll('[role="dialog"][aria-modal="true"],dialog[open]')].some(e=>!e.closest('[data-concierge]')&&e.getBoundingClientRect().width>0);setObstructed(modal);if(modal)return;const width=button.current.offsetWidth,height=button.current.offsetHeight;if(!width||!height)return;
      const visible=(r:DOMRect)=>r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;
      const visibility=new Map<Element,boolean>();
      const drawn=(element:Element):boolean=>{
        const cached=visibility.get(element);if(cached!==undefined)return cached;
        const s=getComputedStyle(element);
        const own=s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&!element.classList.contains('sr-only')&&s.clip!=='rect(0px, 0px, 0px, 0px)';
        const result=own&&(!element.parentElement||drawn(element.parentElement));visibility.set(element,result);return result;
      };
      const obstacles=[...document.querySelectorAll('a,button,input,textarea,select,aside,iframe')].filter(e=>e!==button.current&&!e.closest('[data-concierge]')&&drawn(e)).map(e=>e.getBoundingClientRect()).filter(visible);
      // Use actual text-line rectangles, not full-width heading boxes. Geometry
      // stays in the browser and is never sent to the model or analytics.
      const seen=new Set<Node>();
      for(const element of document.querySelectorAll('p,h1,h2,h3,h4,label,legend')){
        if(element.closest('[data-concierge]')||!drawn(element)||!visible(element.getBoundingClientRect()))continue;
        const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node:Node|null;
        while((node=walker.nextNode()))if(!seen.has(node)&&node.textContent?.trim()){
          seen.add(node);if(node.parentElement&&!drawn(node.parentElement))continue;const range=document.createRange();range.selectNodeContents(node);obstacles.push(...[...range.getClientRects()].filter(visible));
        }
      }
      const free=(x:number,y:number)=>!obstacles.some(r=>x<r.right+8&&x+width>r.left-8&&y<r.bottom+8&&y+height>r.top-8);
      const current=button.current.getBoundingClientRect();if(free(current.x,current.y)){setPositioned(true);return;}
      // Try real gap boundaries so a narrow free area is not missed by a
      // fixed vertical sampling interval (notably on compact planning forms).
      const candidates=[...new Set([innerHeight-height-20,84,...obstacles.flatMap(r=>[r.top-height-8,r.bottom+8])])].filter(y=>y>=84&&y+height<=innerHeight-20).sort((a,b)=>innerWidth<640?a-b:b-a);
      for(const y of candidates)for(const right of [true,false]){const x=right?innerWidth-width-20:20,bottom=innerHeight-height-y;if(free(x,y)){setPosition(p=>p.right===right&&p.bottom===bottom?p:{right,bottom});setPositioned(true);return}}
      setPositioned(false);
    };const schedule=()=>{if(!frame)frame=requestAnimationFrame(place)};schedule();void document.fonts.ready.then(schedule);const settled=setTimeout(schedule,1200);const resize=new ResizeObserver(schedule);resize.observe(document.body);if(button.current)resize.observe(button.current);window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});return()=>{cancelAnimationFrame(frame);clearTimeout(settled);observer.disconnect();resize.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule)};
  },[open]);
  return <div data-concierge data-clarity-mask="true"><button ref={button} hidden={obstructed} type="button" className={styles.launcher} style={{visibility:positioned?'visible':'hidden',right:position.right?20:'auto',left:position.right?'auto':20,bottom:`calc(${position.bottom}px + env(safe-area-inset-bottom, 0px))`}} aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setOpen(true);trackAnalyticsEvent('concierge_opened')}}><MessageSquare size={17} aria-hidden="true"/>Ask House Delivery</button>{open?<Panel onClose={()=>{setOpen(false);requestAnimationFrame(()=>button.current?.focus())}}/>:null}</div>;
}
