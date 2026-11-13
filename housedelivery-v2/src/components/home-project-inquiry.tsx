"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { trackAnalyticsEvent } from "@/lib/analytics";
import { readModelProjectReturn } from "@/lib/model-inquiry";

type Props = { modelSlug: string; modelName: string; inquiryHref: string; image?: { src: string; alt: string } };

export function HomeProjectInquiry({ modelSlug, modelName, inquiryHref, image }: Props) {
  const [projectReturn, setProjectReturn] = useState<string>();
  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => { if (active) setProjectReturn(readModelProjectReturn(window.location.search, `custom:${modelSlug}`)); });
    return () => { active = false; };
  }, [modelSlug]);
  const shortName = modelName.replace(/^The\s+/, "").replace(/\s+House$/, "");
  return <section id="reserve" data-home-project-inquiry className="home-pilot-inquiry relative isolate scroll-mt-40 overflow-hidden border-y border-white/20 px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    {image ? <><Image src={image.src} alt="" fill quality={100} unoptimized loading="lazy" sizes="100vw" className="-z-20 object-cover object-center" /><div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b0c10]/95 via-[#0b0c10]/90 to-[#0b0c10]/65" /></> : null}
    <div className="mx-auto max-w-[1504px]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d5c29f]">Your model. Your housing project.</p>
      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_0.65fr] lg:items-end">
        <h2 className="max-w-5xl text-[clamp(3.2rem,7vw,7.5rem)] font-medium leading-[0.94] tracking-[-0.06em]">{projectReturn ? "Continue your" : `Discuss ${shortName}`}<br /><span className="text-[#d5c29f]">{projectReturn ? "housing project." : "for your project."}</span></h2>
        <div className="max-w-xl border-l border-white/30 pl-6">
          <p className="text-sm leading-7 text-white/80">{projectReturn ? "Return to your existing project with your planning context and selections intact." : "Bring your preferred model, location and project priorities to a national project review. You can change your model selection in the inquiry form."}</p>
          <Link href={projectReturn ?? inquiryHref} data-model-inquiry-primary onClick={() => trackAnalyticsEvent("model_cta_click", { model_slug: modelSlug, action: projectReturn ? "project_return" : "inquiry" })} className="mt-7 flex min-h-14 items-center justify-between gap-6 px-5 py-4 text-[10px] font-semibold uppercase leading-5 tracking-[0.1em] text-[#0b0c10] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{projectReturn ? "Return to My Project" : `Discuss ${shortName} for your project`}<ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
      <div className="mt-14 grid gap-5 border-t border-white/30 pt-7 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-12">
        <Link href="/plan-a-housing-project" data-multi-home-planning onClick={() => trackAnalyticsEvent("model_cta_click", { model_slug: modelSlug, action: "multi_home" })} className="inline-flex min-h-11 items-center gap-6 border-b border-[#d5c29f] !bg-transparent text-base font-medium !text-[#e7e3d8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Planning several homes? <ArrowUpRight size={16} aria-hidden="true" /></Link>
        <p className="max-w-2xl text-sm leading-7 text-white/80">Developers, municipalities, Indigenous communities and other project teams can plan a coordinated housing program through our existing project planning tools.</p>
      </div>
    </div>
  </section>;
}
