"use client";

import { useEffect, useId, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { HomeDetailSection } from "@/lib/custom-home-presentation";

export function HomeDetailNavigation({ homeName, hasVideo, sections, modelSlug = "custom-home" }: { homeName: string; hasVideo: boolean; sections?: readonly HomeDetailSection[]; modelSlug?: string }) {
  const instance = useId();
  const [active, setActive] = useState("overview");
  const reducedMotion = useReducedMotion();
  const links = sections?.map(section => [section.id, section.label]) ?? [
    ["overview", "Overview"],
    ["gallery", "Gallery"],
    ["finishes-pricing", "Finishes & Pricing"],
    ["plans", "Floor Plans"],
    ...(hasVideo ? [["film", "Video"]] : []),
  ];
  useEffect(() => {
    const ids = sections?.map(section => section.id) ?? ["overview", "gallery", "finishes-pricing", "plans", ...(hasVideo ? ["film"] : [])];
    const observer = new IntersectionObserver((entries) => {
      const entry = entries.find((item) => item.isIntersecting);
      if (entry) setActive(entry.target.id);
    }, { rootMargin: "-150px 0px -55% 0px", threshold: 0 });
    ids.forEach((id) => { const section = document.getElementById(id); if (section) observer.observe(section); });
    return () => observer.disconnect();
  }, [hasVideo, sections]);
  return (
    <nav aria-label={homeName + " sections"} data-home-detail-navigation className="home-pilot-navigation">
      <div className="mx-auto flex max-w-[1504px] items-center gap-12">
        <span className="hidden shrink-0 text-sm font-medium tracking-[-0.02em] text-[#d5c29f] lg:block">{homeName}</span>
        <div className="flex min-w-0 flex-1 gap-7 overflow-x-auto overscroll-x-contain sm:gap-10">
          {links.map(([id, label]) => (
            <motion.a tabIndex={0} key={id} href={"#" + id} onClick={() => setActive(id)} aria-current={active === id ? "location" : undefined} whileHover={reducedMotion ? undefined : { color: "#fff" }} className={cn("relative flex min-h-16 shrink-0 items-center border-b-2 border-transparent text-[9px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-5px] focus-visible:outline-white sm:text-[10px]", active === id ? "text-[#d5c29f]" : "text-white/65 hover:text-white")}>{label}{active === id ? <motion.span aria-hidden="true" layoutId={`${modelSlug}-${instance}-model-navigation`} transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 32 }} className="absolute -bottom-0.5 inset-x-0 h-0.5 bg-[#d5c29f]" /> : null}</motion.a>
          ))}
        </div>
        <a href="#reserve" className="hidden min-h-11 shrink-0 items-center gap-5 border border-white/25 px-5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white sm:inline-flex">Project inquiry <ArrowUpRight size={14} aria-hidden="true" /></a>
      </div>
    </nav>
  );
}
