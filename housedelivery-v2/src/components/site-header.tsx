"use client";

import { ArrowLeft, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { readPlannerHomeViewReturnHref } from "@/lib/planner-design-session";
import { usePlannerHomeViewContext } from "@/lib/use-planner-home-view-context";

const links = [
  { label: "Homes", href: "/#models" },
  { label: "Inclusions", href: "/inclusions" },
  { label: "How it works", href: "/how-it-works" },
  { label: "First Nations", href: "/first-nations-inspired" },
  { label: "CMHC", href: "/#cmhc" },
  { label: "Why House Delivery Inc.", href: "/#certainty" },
] as const;

export function SiteHeader({
  showProjectReviewAction = true,
}: {
  showProjectReviewAction?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [plannerReturnHref, setPlannerReturnHref] = useState<string>();
  const plannerHomeContext = usePlannerHomeViewContext();

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (active) {
        setPlannerReturnHref(
          readPlannerHomeViewReturnHref(window.location.search),
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0b0c10]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="group flex items-center"
        >
          <Image
            src="/images/brand/house-delivery-logo-gold.png"
            alt="House Delivery Inc."
            width={1774}
            height={887}
            sizes="(max-width: 639px) 96px, (max-width: 1279px) 128px, 140px"
            quality={100}
            unoptimized={true}
            className="h-12 w-auto object-contain sm:h-16 xl:h-[70px]"
          />
        </Link>

        <nav className="hidden items-center gap-7 xl:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-white/60 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 xl:flex">
          <a
            href="mailto:hello@housedelivery.ca"
            className="text-xs text-white/60 transition-colors hover:text-white"
          >
            hello@housedelivery.ca
          </a>
          {showProjectReviewAction ? (
            <Link
              href="/plan-a-housing-project"
              className="border border-white bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0b0c10] transition-colors hover:bg-transparent hover:text-white"
            >
              Plan a housing project
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          className="grid size-11 place-items-center xl:hidden"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav
        id="mobile-navigation"
        className={cn(
          "overflow-hidden border-t border-white/10 bg-[#0b0c10] transition-[max-height,opacity] duration-300 xl:hidden",
          isOpen
            ? "visible max-h-[32rem] opacity-100"
            : "invisible max-h-0 opacity-0",
        )}
        aria-label="Mobile"
        aria-hidden={!isOpen}
      >
        <div className="space-y-1 px-5 py-5 sm:px-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block border-b border-white/10 py-4 text-sm text-white/75"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {showProjectReviewAction ? (
            <Link
              href="/plan-a-housing-project"
              className="mt-5 block bg-white px-5 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#0b0c10]"
              onClick={() => setIsOpen(false)}
            >
              Plan a housing project
            </Link>
          ) : null}
        </div>
      </nav>

      {plannerHomeContext || plannerReturnHref ? (
        <div className="absolute inset-x-0 top-full border-b border-black/14 bg-[#e7e3d8] text-[#111216] shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-5 py-3 sm:px-8 md:flex-row md:items-center md:justify-between md:gap-8 lg:px-12">
            {plannerHomeContext ? (
              <div data-planner-home-context className="flex flex-wrap items-center gap-x-7 gap-y-1">
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-black/42">Inside My Project</p>
                  <p className="mt-1 text-sm font-medium tracking-[-0.02em]">{plannerHomeContext.projectName}</p>
                </div>
                <p className="text-xs text-black/58">{plannerHomeContext.totalHomes} homes total</p>
                <p className="text-xs font-medium">{plannerHomeContext.homeName} × {plannerHomeContext.homeQuantity}</p>
              </div>
            ) : null}
            <Link
              href={plannerHomeContext?.returnHref ?? plannerReturnHref!}
              className="inline-flex min-h-10 shrink-0 items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.17em] text-black/72 transition-colors hover:text-black"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Return to My Project
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
