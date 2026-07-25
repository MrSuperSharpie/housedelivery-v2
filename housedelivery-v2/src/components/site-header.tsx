"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/cn";

const links = [
  { label: "Homes", href: "/#models" },
  { label: "How it works", href: "/#timeline" },
  { label: "First Nations", href: "/first-nations-inspired" },
  { label: "CMHC", href: "/#cmhc" },
  { label: "Why House Delivery Inc.", href: "/#certainty" },
] as const;

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0b0c10]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="group flex items-center"
        >
          <Image
            src="/House Delivery Blk.png"
            alt="House Delivery Inc."
            width={675}
            height={313}
            quality={100}
            unoptimized={true}
            className="h-12 w-auto object-contain brightness-0 invert"
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
          <a
            href="#reserve"
            className="border border-white bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0b0c10] transition-colors hover:bg-transparent hover:text-white"
          >
            Begin project review
          </a>
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
          <a
            href="#reserve"
            className="mt-5 block bg-white px-5 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#0b0c10]"
            onClick={() => setIsOpen(false)}
          >
            Begin project review
          </a>
        </div>
      </nav>
    </header>
  );
}
