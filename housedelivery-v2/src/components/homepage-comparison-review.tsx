"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/cn";

const versions = [
  {
    id: "current",
    label: "Current Version",
    href: "/",
    description: "Approved homepage at the current production route.",
  },
  {
    id: "proposed",
    label: "Proposed Value Positioning",
    href: "/proposed-home",
    description:
      "Protected duplicate prepared for the next positioning review.",
  },
] as const;

type VersionId = (typeof versions)[number]["id"];

export function HomepageComparisonReview() {
  const [activeVersion, setActiveVersion] = useState<VersionId>("current");
  const activeOption = versions.find(
    (version) => version.id === activeVersion,
  )!;

  return (
    <section className="mt-14" aria-label="Homepage versions">
      <div className="grid border border-white/12 md:grid-cols-2">
        {versions.map((version, index) => {
          const isActive = version.id === activeVersion;

          return (
            <article
              key={version.id}
              className={cn(
                "flex min-h-52 flex-col justify-between p-6 sm:p-8",
                index > 0
                  ? "border-t border-white/12 md:border-l md:border-t-0"
                  : "",
                isActive ? "bg-white/[0.06]" : "bg-white/[0.02]",
              )}
            >
              <button
                type="button"
                onClick={() => setActiveVersion(version.id)}
                aria-pressed={isActive}
                className="text-left"
              >
                <span className="eyebrow">
                  {isActive ? "Selected preview" : "Select preview"}
                </span>
                <span className="mt-5 block text-2xl font-medium tracking-[-0.04em] sm:text-3xl">
                  {version.label}
                </span>
                <span className="mt-3 block max-w-md text-sm leading-6 text-white/50">
                  {version.description}
                </span>
              </button>

              <Link
                href={version.href}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex w-fit items-center gap-3 border-b border-white/35 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 transition-colors hover:border-white hover:text-white"
              >
                Open in new tab
                <ExternalLink size={14} strokeWidth={1.4} aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>

      <div className="mt-8 border border-white/12 bg-black">
        <div className="flex flex-col gap-5 border-b border-white/12 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="eyebrow">Active preview</p>
            <p className="mt-2 text-lg font-medium tracking-[-0.025em]">
              {activeOption.label}
            </p>
          </div>
          <Link
            href={activeOption.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-3 border border-white/25 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75 transition-colors hover:border-white hover:text-white"
          >
            Open full page
            <ExternalLink size={14} strokeWidth={1.4} aria-hidden="true" />
          </Link>
        </div>

        <div className="relative h-[72vh] min-h-[640px] max-h-[920px] overflow-hidden bg-[#0b0c10]">
          {versions.map((version) => {
            const isActive = version.id === activeVersion;

            return (
              <iframe
                key={version.id}
                src={version.href}
                title={`${version.label} homepage preview`}
                loading="lazy"
                aria-hidden={!isActive}
                tabIndex={isActive ? 0 : -1}
                className={cn(
                  "absolute inset-0 h-full w-full border-0 bg-[#0b0c10]",
                  isActive
                    ? "visible opacity-100"
                    : "pointer-events-none invisible opacity-0",
                )}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
