"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import styles from "@/app/build-your-home/campaign.module.css";

export function CampaignInquiryLink({ children, className, model }: { children: ReactNode; className?: string; model?: string }) {
  function startInquiry(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (model) window.dispatchEvent(new CustomEvent("house-delivery:select-model", { detail: model }));
    // Keep the native anchor (including its no-JS fallback), then focus the
    // visitor's next required field without interrupting the anchor scroll.
    requestAnimationFrame(() => {
      const fields = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("#project-inquiry input, #project-inquiry select, #project-inquiry textarea"))
        .filter(field => !field.matches(":disabled") && field.getClientRects().length > 0);
      const next = fields.find(field => field.required && !field.value.trim()) ?? fields[0];
      next?.focus({ preventScroll: true });
    });
  }
  return <a href="#project-inquiry" className={className} onClick={startInquiry}>{children}</a>;
}

export function CampaignStickyInquiry({ label }: { label: string }) {
  const [awayFromForm, setAwayFromForm] = useState(false);
  useEffect(() => {
    const form = document.getElementById("project-inquiry");
    if (!form || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setAwayFromForm(!entry.isIntersecting), { rootMargin: "0px 0px -80px 0px" });
    observer.observe(form);
    return () => observer.disconnect();
  }, []);
  return awayFromForm ? <div className={styles.mobileCta}><CampaignInquiryLink className={`${styles.button} ${styles.lightButton}`}>{label}<span aria-hidden="true">↓</span></CampaignInquiryLink></div> : null;
}
