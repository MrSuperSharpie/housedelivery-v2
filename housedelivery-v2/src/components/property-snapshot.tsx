"use client";

import { ArrowRight, Check, Search } from "lucide-react";
import Link from "next/link";

import type { PublicPropertySnapshot } from "@/lib/property-review/types";

type PropertySnapshotProps = {
  snapshot: PublicPropertySnapshot;
  onClose: () => void;
  onCheckAnother: () => void;
  onReviewCta: () => void;
};

const statusStyles = {
  green: "bg-[#315d46] text-white",
  yellow: "bg-[#a67d2f] text-white",
  red: "bg-[#7b3c34] text-white",
} as const;

export function PropertySnapshot({
  snapshot,
  onClose,
  onCheckAnother,
  onReviewCta,
}: PropertySnapshotProps) {
  const facts = [
    ["Zoning", snapshot.zoning || "Additional review required"],
    ["Property type", snapshot.propertyType],
    ["Approximate lot size", snapshot.approximateLotSize || "Additional review required"],
    ["Opportunity", snapshot.opportunity],
  ];

  return (
    <div className="py-5 sm:py-7">
      <div
        className={`inline-flex min-h-9 items-center gap-2 px-3 text-[9px] font-semibold uppercase tracking-[0.17em] ${statusStyles[snapshot.status]}`}
      >
        {snapshot.status === "green" ? (
          <Check aria-hidden="true" className="size-3.5" />
        ) : (
          <Search aria-hidden="true" className="size-3.5" />
        )}
        {snapshot.statusLabel}
      </div>

      <p className="mt-8 text-[9px] font-semibold uppercase tracking-[0.19em] text-black/42">
        House Delivery / Your Property Snapshot
      </p>
      <h3
        id="property-fit-check-title"
        className="mt-4 max-w-xl text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[0.9] tracking-[-0.065em]"
      >
        {snapshot.headline}
      </h3>
      <p className="mt-5 text-sm leading-7 text-black/58">
        {snapshot.address}
        <br />
        {snapshot.municipality}
      </p>

      <div className="mt-8 grid border-l border-t border-black/14 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="min-h-28 border-b border-r border-black/14 p-5"
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/38">
              {label}
            </p>
            <p className="mt-3 text-sm font-medium leading-6 text-black/78">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 border-y border-black/14 py-6">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/38">
          {snapshot.status === "green"
            ? "What this could mean"
            : "What happens next"}
        </p>
        <p className="mt-4 max-w-xl text-sm leading-7 text-black/58">
          {snapshot.message}
        </p>
        {snapshot.status === "green" ? (
          <p className="mt-4 max-w-xl text-sm leading-7 text-black/58">
            We’re reviewing which House Delivery homes may be the strongest fit
            for your property.
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {snapshot.status === "green" ? (
          <>
            <Link
              href="/#reserve"
              onClick={onReviewCta}
              className="group inline-flex min-h-14 flex-1 items-center justify-between bg-[#0b0c10] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
            >
              Book my property review
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/#carriage-homes-grid"
              onClick={onClose}
              className="inline-flex min-h-14 items-center justify-center border border-black/25 px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black"
            >
              Explore the homes
            </Link>
          </>
        ) : snapshot.status === "red" ? (
          <button
            type="button"
            onClick={onCheckAnother}
            className="group inline-flex min-h-14 w-full items-center justify-between bg-[#0b0c10] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
          >
            Check another property
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform group-hover:translate-x-1"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-14 w-full items-center justify-center bg-[#0b0c10] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
          >
            Close
          </button>
        )}
      </div>

      <p className="mt-6 text-[10px] leading-5 text-black/42">
        Preliminary review only. This is not a zoning determination, permit
        approval, survey, engineering opinion, or guarantee. Final feasibility
        depends on municipal review and site-specific conditions.
      </p>
    </div>
  );
}
