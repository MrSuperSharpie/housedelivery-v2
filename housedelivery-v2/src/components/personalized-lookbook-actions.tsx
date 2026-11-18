"use client";

import { ArrowDownToLine } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

import type { HomeConfiguration, HomeInclusionLevel } from "@/data/home-configurator";
import { lookBookRequestNotesLimit } from "@/data/personalized-lookbook";

type Props = {
  homeName: string;
  homeKey: string;
  tier: HomeInclusionLevel;
  collectionId: string;
  configuration: HomeConfiguration;
  canDownload: boolean;
};

export function PersonalizedLookBookActions({ homeName, homeKey, tier, collectionId, configuration, canDownload }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const activeRequest = useRef(false);

  async function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canDownload || activeRequest.current) return;
    const notes = new FormData(event.currentTarget).get("notes");
    activeRequest.current = true;
    setBusy(true);
    setMessage("Preparing your PDF…");
    try {
      const response = await fetch("/api/lookbooks/personalized-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeKey,
          tier, collectionId, configuration, notes,
        }),
      });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("application/pdf")) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Your PDF couldn’t be prepared. Please try again.");
      }
      const file = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = file;
      link.download = `House-Delivery-${configuration.homeId}-Look-Book.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(file), 30_000);
      setMessage("Your PDF download has started.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your PDF couldn’t be prepared. Please try again.");
    } finally {
      activeRequest.current = false;
      setBusy(false);
    }
  }

  return (
    <section id="home-look-book" tabIndex={-1} aria-labelledby="personalized-lookbook-heading" className="scroll-mt-24 bg-[#e7e3d8] px-5 py-16 text-[#111216] sm:px-8 lg:px-12 lg:py-24">
      <form onSubmit={download} className="mx-auto grid max-w-[1504px] gap-8 border-t border-black/20 pt-7 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/65">Your design brief</p>
          <h2 id="personalized-lookbook-heading" className="mt-4 text-4xl font-medium tracking-[-0.055em] sm:text-6xl">Your {homeName} Look Book.</h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-black/70">
            Download your home’s architecture, floor plan when available, and your selected finishes in one PDF.
          </p>
        </div>
        <div>
          <label htmlFor="lookbook-customization-notes" className="text-xs font-semibold uppercase tracking-[0.14em]">Customization requests (optional)</label>
          <textarea id="lookbook-customization-notes" name="notes" rows={4} maxLength={lookBookRequestNotesLimit} placeholder="Finishes or details you’d like to discuss" className="mt-3 block w-full resize-y border border-black/30 bg-white/45 p-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2" />
          <button type="submit" disabled={busy || !canDownload} className="mt-5 inline-flex min-h-14 items-center gap-4 bg-[#111216] px-6 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-45">
            {busy ? "Creating your PDF…" : "Create My Lookbook"} <ArrowDownToLine aria-hidden="true" className="size-4" />
          </button>
          <p role="status" className="mt-3 min-h-6 text-sm leading-6 text-black/75">
            {message || (!canDownload ? "Confirm each design chapter to create your Look Book." : "")}
          </p>
        </div>
      </form>
    </section>
  );
}
