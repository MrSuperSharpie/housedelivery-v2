"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

const navigationStages = [
  { number: "01", id: "your-land", title: "Your Land", thumbnail: "/images/journey/01-your-land.png" },
  { number: "02", id: "your-home", title: "Your Home", thumbnail: "/images/journey/02-choose-your-home.jpg" },
  { number: "03", id: "your-design", title: "Your Design", thumbnail: "/images/journey/03-make-it-yours.png" },
  { number: "04", id: "site-feasibility", title: "Site Feasibility", thumbnail: "/images/journey/04-site-feasibility.jpg" },
  { number: "05", id: "project-commitment", title: "Project Commitment", thumbnail: "/images/journey/05-project-commitment.png" },
  { number: "06", id: "permits-engineering", title: "Permits & Engineering", thumbnail: "/images/journey/06-permits-engineering-lgsf.jpg" },
  { number: "07", id: "site-manufacturing", title: "Site + Manufacturing", thumbnail: "/images/journey/07-site-manufacturing.png" },
  { number: "08", id: "delivery", title: "Delivery", thumbnail: "/images/journey/08-coordinated-project-package.webp" },
  { number: "09", id: "assembly", title: "Assembly", thumbnail: "/images/journey/09-home-takes-shape.png" },
  { number: "10", id: "finishing", title: "Finishing", thumbnail: "/images/journey/10-finishing.png" },
  { number: "11", id: "occupancy", title: "Occupancy", thumbnail: "/images/journey/11-welcome-home.jpeg" },
] as const;

export function JourneyStageNavigator() {
  const [activeStage, setActiveStage] = useState(navigationStages[0].id);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const currentStage = entries.find((entry) => entry.isIntersecting);
        if (currentStage) {
          setActiveStage(currentStage.target.id as typeof activeStage);
        }
      },
      { rootMargin: "-24% 0px -70% 0px", threshold: 0 },
    );

    navigationStages.forEach(({ id }) => {
      const stage = document.getElementById(id);
      if (stage) observer.observe(stage);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const activeItem = scroller?.querySelector<HTMLElement>(
      `[data-stage-id="${activeStage}"]`,
    );
    if (!scroller || !activeItem) return;

    const itemLeft = activeItem.offsetLeft;
    const itemRight = itemLeft + activeItem.offsetWidth;
    const visibleLeft = scroller.scrollLeft;
    const visibleRight = visibleLeft + scroller.clientWidth;

    if (itemLeft < visibleLeft || itemRight > visibleRight) {
      scroller.scrollTo({
        left: itemLeft - (scroller.clientWidth - activeItem.offsetWidth) / 2,
        behavior: "smooth",
      });
    }
  }, [activeStage]);

  return (
    <nav
      aria-label="House Delivery journey stages"
      className="border-y border-white/10 bg-[#0e1014]"
    >
      <div
        ref={scrollerRef}
        className="mx-auto flex max-w-[1600px] snap-x overflow-x-auto px-5 sm:px-8 lg:px-12 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]"
      >
        {navigationStages.map((stage) => {
          const isActive = activeStage === stage.id;

          return (
            <a
              key={stage.number}
              href={`#${stage.id}`}
              data-stage-id={stage.id}
              aria-current={isActive ? "step" : undefined}
              className="group relative flex min-w-[136px] snap-start flex-col border-r border-white/10 px-3 py-4 first:border-l sm:min-w-[160px] sm:px-4 sm:py-5"
            >
              <span
                className={cn(
                  "relative h-[62px] overflow-hidden border transition-[border-color,filter,opacity] duration-200 sm:h-[72px]",
                  isActive
                    ? "border-[#c8ad82]/70 opacity-100 saturate-100 brightness-100"
                    : "border-white/10 opacity-65 saturate-[0.7] brightness-[0.72] group-hover:opacity-85 group-hover:saturate-[0.9] group-hover:brightness-[0.9]",
                )}
              >
                <Image
                  src={stage.thumbnail}
                  alt=""
                  fill
                  sizes="(max-width: 639px) 110px, 128px"
                  className="object-cover"
                />
              </span>
              <span className="mt-3 flex flex-col gap-2">
                <span
                  className={cn(
                    "font-mono text-[9px] tracking-[0.18em] transition-colors",
                    isActive
                      ? "text-[#c8ad82]"
                      : "text-white/25 group-hover:text-white/55",
                  )}
                >
                  {stage.number}
                </span>
                <span
                  className={cn(
                    "text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors",
                    isActive
                      ? "text-white/88"
                      : "text-white/48 group-hover:text-white/75",
                  )}
                >
                  {stage.title}
                </span>
              </span>
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 bottom-0 h-px bg-[#c8ad82] sm:inset-x-4"
                />
              ) : null}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
