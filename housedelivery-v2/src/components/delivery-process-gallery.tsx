"use client";

import { ArrowDown, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";

import { cn } from "@/lib/cn";

const chapters = [
  {
    title: "Architectural design",
    label: "Set the direction.",
    description: "Choose the homes, housing mix and design direction around the land, the people and the project.",
    image: "/images/journey/02-choose-your-home.jpg",
    alt: "Contemporary architectural home from the House Delivery design library",
    caption: "Home selection / Design direction",
  },
  {
    title: "Engineering + systems",
    label: "Resolve the details.",
    description: "Site-specific architecture, engineering, system selection and approvals are coordinated for the actual project and jurisdiction.",
    image: "/images/journey/06-permits-engineering-lgsf.jpg",
    alt: "Light-gauge steel residential structure illustrating engineering and system selection",
    caption: "Site-specific design / Technical coordination",
  },
  {
    title: "Manufacturing + quality",
    label: "Coordinate the workstreams.",
    description: "Factory production and quality coordination advance alongside site preparation, with the sequence shaped by approvals and project readiness.",
    image: "/images/journey/07-site-manufacturing.png",
    alt: "Illustration of site preparation and factory manufacturing progressing in parallel",
    caption: "Manufacturing / Parallel site preparation",
  },
  {
    title: "Procurement + logistics",
    label: "Bring the package together.",
    description: "The agreed supply package, procurement, freight and delivery sequence are coordinated around the project and its local assembly requirements.",
    image: "/images/how-it-works/house-delivery-process.png",
    alt: "Panoramic illustration of the coordinated House Delivery process",
    caption: "Agreed supply package / Delivery coordination",
    contain: true,
  },
  {
    title: "Canadian construction",
    label: "Complete the home.",
    description: "Local teams assemble the homes, coordinate finishing and complete the required inspections before handover. The general contractor remains responsible for local site execution, trades and construction management.",
    image: "/images/journey/09-home-takes-shape.png",
    alt: "Contemporary home illustrating the finishing and handover stage",
    caption: "Local assembly / Completion / Handover",
  },
] as const;

export function DeliveryProcessGallery() {
  const [activeChapter, setActiveChapter] = useState(0);
  const id = useId();
  const chapter = chapters[activeChapter];
  const panelId = "delivery-story-" + id;

  return (
    <div data-delivery-process-gallery className="mt-12 lg:mt-16">
      <div className="grid overflow-hidden border border-white/15 bg-[#15171b] lg:grid-cols-[1.15fr_0.85fr]">
        <figure id={panelId} role="region" aria-label="Selected delivery stage" className="relative min-w-0">
          <div className="relative aspect-[4/3] overflow-hidden bg-[#22252a] lg:aspect-auto lg:h-full lg:min-h-[620px]">
            <Image
              key={chapter.image}
              src={chapter.image}
              alt={chapter.alt}
              fill
              quality={95}
              sizes="(max-width: 1023px) 100vw, (max-width: 1599px) 57vw, 860px"
              className={cn(
                "delivery-image-enter",
                "contain" in chapter && chapter.contain ? "object-contain" : "object-cover",
              )}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0c10]/90 via-transparent to-black/10" />
            <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-9 lg:p-10">
              <p className="mb-4 text-[9px] uppercase tracking-[0.2em] text-[#d5c29f]">
                0{activeChapter + 1} / 05 · {chapter.caption}
              </p>
              <p className="max-w-xl text-[clamp(2rem,3.8vw,4rem)] font-medium leading-[0.96] tracking-[-0.055em] text-white">
                {chapter.label}
              </p>
            </figcaption>
          </div>
        </figure>

        <div className="flex flex-col p-5 sm:p-8 lg:p-9">
          <p className="mb-5 flex items-center justify-between border-b border-white/15 pb-5 text-[9px] uppercase tracking-[0.2em] text-white/55">
            An integrated delivery approach
            <span className="text-[#c9b48f]">01—05</span>
          </p>
          <ol aria-label="Explore the delivery approach" className="flex flex-1 flex-col">
            {chapters.map((item, index) => (
              <li key={item.title} className="border-b border-white/15 last:border-b-0">
                <button
                  type="button"
                  aria-pressed={activeChapter === index}
                  aria-controls={panelId}
                  onClick={() => setActiveChapter(index)}
                  className={cn(
                    "group flex min-h-20 w-full items-center gap-4 py-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#d5c29f] sm:gap-5",
                    activeChapter === index ? "text-[#d5c29f]" : "text-white/65 hover:text-white",
                  )}
                >
                  <span className="self-start pt-1 font-mono text-[10px] tracking-[0.1em] opacity-65">0{index + 1}</span>
                  <span className="flex-1 text-[clamp(1.2rem,1.8vw,1.8rem)] font-medium leading-tight tracking-[-0.035em]">{item.title}</span>
                  <ArrowUpRight size={17} aria-hidden="true" className={cn("shrink-0 transition-transform motion-reduce:transform-none", activeChapter === index ? "rotate-45" : "group-hover:-translate-y-0.5")} />
                </button>
                {activeChapter === index ? (
                  <p className="pb-6 pl-8 text-sm leading-7 text-white/70 sm:pl-10" aria-live="polite">{item.description}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-xl text-[11px] leading-6 text-white/55">
          Illustrative imagery. Scope and sequence depend on site conditions,
          approvals, procurement and local construction requirements.
        </p>
        <details className="group min-w-0 sm:max-w-[55%]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/75 focus-visible:outline-2 focus-visible:outline-white">
            View the complete process illustration
            <ArrowDown size={14} aria-hidden="true" className="transition-transform group-open:rotate-180" />
          </summary>
          <figure className="mt-4">
            <div className="overflow-x-auto overscroll-x-contain bg-black" tabIndex={0} role="region" aria-label="Panoramic House Delivery process. Scroll horizontally to view all five stages.">
              <Image
                src="/images/how-it-works/house-delivery-process.png"
                alt="House Delivery process from site preparation and digital home coordination through factory production, structural assembly and completed home."
                width={2172}
                height={724}
                quality={100}
                unoptimized
                sizes="(max-width: 639px) 960px, 800px"
                className="h-auto w-full min-w-[800px]"
              />
            </div>
            <figcaption className="mt-3 text-xs leading-5 text-white/55">
              Illustrative project sequence. Timing varies by design,
              approvals, site conditions, production and logistics.
            </figcaption>
          </figure>
        </details>
      </div>
    </div>
  );
}
