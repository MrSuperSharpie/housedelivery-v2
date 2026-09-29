"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

import { carriageHomes } from "@/data/carriage-homes";
import { trackAnalyticsEvent } from "@/lib/analytics";

const revealViewport = { once: true, margin: "-100px" } as const;
const luxuryEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function CarriageHomeShowcase() {
  const shouldReduceMotion = useReducedMotion();
  const [fitCheckOpen, setFitCheckOpen] = useState(false);
  const [fitCheckSubmitted, setFitCheckSubmitted] = useState(false);
  const [fitCheckSubmitting, setFitCheckSubmitting] = useState(false);
  const [fitCheckError, setFitCheckError] = useState("");
  const fitCheckInFlight = useRef(false);

  async function handleFitCheckSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fitCheckInFlight.current) return;

    fitCheckInFlight.current = true;
    setFitCheckSubmitting(true);
    setFitCheckError("");

    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const considering = String(formData.get("considering") ?? "").trim();
    const ownership = String(formData.get("ownership") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          location: address,
          notes: `Property Potential Review — Considering: ${considering} — Property status: ${ownership}`,
          company,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result || result.accepted !== true) {
        throw new Error("Property fit check delivery failed.");
      }

      setFitCheckSubmitted(true);
      trackAnalyticsEvent("quote_form_submitted", {
        form_name: "property_fit_check",
      });
    } catch {
      setFitCheckError(
        "We couldn’t send your property details right now. Please try again shortly.",
      );
    } finally {
      fitCheckInFlight.current = false;
      setFitCheckSubmitting(false);
    }
  }

  function openFitCheck() {
    setFitCheckOpen(true);
    setFitCheckSubmitted(false);
    setFitCheckError("");
    trackAnalyticsEvent("quote_cta_click", {
      form_name: "property_fit_check",
    });
  }

  return (
    <section
      id="carriage-homes"
      aria-labelledby="carriage-homes-heading"
      className="scroll-mt-20 bg-[#0B0C10] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
    >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-12 border-t border-white/10 pt-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20">
            <div>
              <p className="eyebrow">
                Laneway &amp; Carriage Homes / 06 residences
              </p>
              <p className="mt-8 max-w-md text-sm leading-7 text-white/46">
                Compact, self-contained homes designed for laneways, backyards,
                garden settings, and carriage-house locations.
              </p>
            </div>
            <div>
              <div className="mb-[clamp(-1.25rem,-1vw,-0.4rem)] overflow-hidden pb-[clamp(0.4rem,1vw,1.25rem)]">
                <motion.div
                  initial={
                    shouldReduceMotion ? false : { opacity: 0, y: 40 }
                  }
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={revealViewport}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 1,
                    ease: luxuryEase,
                  }}
                  className="mb-[clamp(-1.25rem,-1vw,-0.4rem)] transform-gpu pb-[clamp(0.4rem,1vw,1.25rem)] will-change-[transform,opacity]"
                >
                  <h2
                    id="carriage-homes-heading"
                    className="max-w-5xl text-[clamp(3rem,6vw,6.8rem)] font-medium leading-[0.9] tracking-[-0.065em]"
                  >
                    More home from
                    <br />
                    <span className="text-white/38">
                      the land you already have.
                    </span>
                  </h2>
                </motion.div>
              </div>
              <p className="mt-8 max-w-3xl text-base leading-7 text-white/58 lg:text-lg lg:leading-8">
                These flexible homes can support multigenerational living,
                aging parents, adult children, long-term rental housing, guest
                accommodation, or independent family living.
              </p>
            </div>
          </div>

          <div className="mt-16 overflow-hidden border border-white/10 bg-[#d9d1c3] text-[#0b0c10] lg:grid lg:grid-cols-[1.02fr_0.98fr]">
            <div className="relative min-h-[360px] sm:min-h-[460px] lg:min-h-[680px]">
              <Image
                src="/images/inclusions/kitchen-cabinetry/products/hd-kitchen-cabinetry-signature-02-luminous-oak-gallery.jpg"
                alt="Warm contemporary House Delivery kitchen interior with light oak cabinetry, integrated lighting and central island"
                fill
                quality={95}
                sizes="(max-width: 1023px) 100vw, 52vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent px-6 pb-6 pt-20 text-white sm:px-8 sm:pb-8">
                <p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-white/72">
                  House Delivery / Interior possibilities
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-12 xl:p-14">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/42">
                  Free Property Potential Review
                </p>
                <h3 className="mt-6 max-w-2xl text-[clamp(2.7rem,4.8vw,5.5rem)] font-medium leading-[0.9] tracking-[-0.065em]">
                  What could your
                  <br />
                  <span className="text-black/35">property become?</span>
                </h3>
                <p className="mt-7 max-w-xl text-base leading-7 text-black/62">
                  Before you choose a home, understand what your property may
                  support. We’ll complete a preliminary review and identify the
                  housing options worth exploring.
                </p>

                <div className="mt-9 border-t border-black/16 pt-7">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/38">
                    Your review considers
                  </p>
                  <div className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {[
                      "Property and lot characteristics",
                      "Local zoning and basic planning requirements",
                      "Laneway, carriage, backyard-home or garden-suite potential",
                      "House Delivery models worth considering",
                      "Obvious site constraints or questions requiring further review",
                    ].map((item) => (
                      <div key={item} className="flex gap-3 text-sm leading-6 text-black/62">
                        <span aria-hidden="true" className="mt-[11px] h-px w-4 shrink-0 bg-black/30" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <div className="grid gap-0 border-y border-black/16">
                  {[
                    ["01", "Send us the property", "Address and what you are considering."],
                    ["02", "We review the opportunity", "Property context, local requirements and possible home options."],
                    ["03", "See what may work", "A preliminary Property Potential Review and recommended next step."],
                  ].map(([number, title, body]) => (
                    <div key={number} className="grid grid-cols-[2.4rem_1fr] gap-4 border-b border-black/12 py-5 last:border-b-0">
                      <span className="pt-0.5 text-[9px] font-semibold tracking-[0.18em] text-black/32">
                        {number}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-black/82">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-black/48">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={openFitCheck}
                  className="group mt-8 inline-flex min-h-16 w-full items-center justify-between bg-[#0b0c10] px-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-white transition-colors hover:bg-[#24252a]"
                >
                  Get my free property potential review
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>

          <div
            id="carriage-homes-grid"
            className="mt-16 grid gap-8 md:grid-cols-2 md:gap-12 lg:mt-24"
          >
            {carriageHomes.map((model, index) => {
              const mainImage = model.images[0];

              return (
                <motion.article
                  key={model.slug}
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: 28, scale: 0.99 }
                  }
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={revealViewport}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 1,
                    delay: shouldReduceMotion ? 0 : index * 0.08,
                    ease: luxuryEase,
                  }}
                  className="group relative flex min-h-[620px] flex-col overflow-hidden border border-white/10 bg-[#0B0C10] p-7 transition-colors duration-500 hover:border-white/25 focus-within:border-white/25 sm:p-8"
                >
                  <Link
                    href={`/homes/laneway-carriage/${model.slug}`}
                    aria-label={`View details for ${model.name}`}
                    className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
                  >
                    <span className="sr-only">View {model.name} details</span>
                  </Link>

                  <div className="relative -mx-7 -mt-7 aspect-[16/10] overflow-hidden border-b border-white/10 bg-[#13151a] sm:-mx-8 sm:-mt-8">
                    <Image
                      src={mainImage.src}
                      alt={mainImage.alt}
                      fill
                      quality={95}
                      sizes="(max-width: 767px) 100vw, (max-width: 1535px) 50vw, 728px"
                      style={{ imageRendering: "auto" }}
                      className="object-cover brightness-90 transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.04] group-hover:brightness-100 group-focus-within:scale-[1.04] group-focus-within:brightness-100"
                    />
                    <span className="absolute right-5 top-5 grid size-11 place-items-center rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-black group-focus-within:bg-white group-focus-within:text-black">
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </span>
                  </div>

                  <div className="mt-7 flex items-start justify-between gap-8">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/34">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <span className="text-right text-[9px] font-semibold uppercase tracking-[0.2em] text-white/28">
                      Laneway / Carriage
                    </span>
                  </div>

                  <div className="mt-auto pt-20">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                      Compact living
                    </p>
                    <h3 className="mt-5 max-w-lg text-[clamp(2.3rem,4vw,4.25rem)] font-medium leading-[0.92] tracking-[-0.06em] text-white/90">
                      {model.name}
                    </h3>
                    <p className="mt-6 max-w-xl text-sm leading-7 text-white/48">
                      {model.description}
                    </p>

                    <span
                      className="mt-10 inline-flex items-center gap-5 border-b border-white/28 pb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/62 transition-colors hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    >
                      View residence
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </span>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <div className="mt-12 grid gap-6 border-t border-white/10 pt-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <p className="eyebrow">Planning note</p>
            <p className="max-w-3xl text-sm leading-7 text-white/42">
              Each home must be adapted to the property, local zoning,
              setbacks, servicing, access, climate conditions, and applicable
              building-code requirements.
            </p>
          </div>
        </div>

        {fitCheckOpen ? (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/72 px-4 py-8 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setFitCheckOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="property-fit-check-title"
              className="relative max-h-full w-full max-w-2xl overflow-y-auto bg-[#e8e6df] p-6 text-[#0b0c10] shadow-2xl sm:p-9"
            >
              <button
                type="button"
                onClick={() => setFitCheckOpen(false)}
                className="absolute right-4 top-4 grid size-10 place-items-center border border-black/15 transition-colors hover:bg-black hover:text-white"
                aria-label="Close property fit check"
              >
                <X size={17} />
              </button>

              {fitCheckSubmitted ? (
                <div className="py-10 sm:py-14">
                  <div className="grid size-12 place-items-center rounded-full bg-[#0b0c10] text-white">
                    <Check size={18} />
                  </div>
                  <p className="mt-10 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">
                    Property Potential Review
                  </p>
                  <h3
                    id="property-fit-check-title"
                    className="mt-4 text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[0.9] tracking-[-0.065em]"
                  >
                    Your property review has started.
                  </h3>
                  <p className="mt-6 max-w-xl text-sm leading-7 text-black/58">
                    We’ll take an initial look at the property, applicable local
                    requirements and the House Delivery homes that may be worth
                    considering.
                  </p>
                  <div className="mt-8 border-y border-black/14 py-6">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/38">
                      Your preliminary review will identify
                    </p>
                    <ul className="mt-4 space-y-2 text-sm leading-6 text-black/58">
                      <li>Potential housing opportunities</li>
                      <li>Obvious constraints or questions to investigate</li>
                      <li>House Delivery options worth exploring</li>
                      <li>A recommended next step</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFitCheckOpen(false)}
                    className="mt-10 border border-black bg-black px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">
                    Free Property Potential Review
                  </p>
                  <h3
                    id="property-fit-check-title"
                    className="mt-4 pr-12 text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[0.9] tracking-[-0.065em]"
                  >
                    Let’s start with your property.
                  </h3>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-black/56">
                    Tell us where the property is and what you are considering.
                    We’ll use this information to prepare your preliminary
                    Property Potential Review.
                  </p>

                  <form onSubmit={handleFitCheckSubmit} className="mt-9 grid gap-x-5 gap-y-7 sm:grid-cols-2">
                    <label className="form-field sm:col-span-2">
                      <span>Property address</span>
                      <input
                        name="address"
                        autoComplete="street-address"
                        placeholder="Street address, city, province"
                        required
                      />
                    </label>

                    <label className="form-field sm:col-span-2">
                      <span>What are you considering?</span>
                      <select name="considering" defaultValue="" required>
                        <option value="" disabled>Select one</option>
                        <option>Laneway / backyard home</option>
                        <option>Carriage home</option>
                        <option>Garden suite / ADU</option>
                        <option>Another type of home</option>
                        <option>Not sure yet</option>
                      </select>
                    </label>

                    <label className="form-field sm:col-span-2">
                      <span>Do you own this property?</span>
                      <select name="ownership" defaultValue="" required>
                        <option value="" disabled>Select one</option>
                        <option>Yes — I own it</option>
                        <option>Under contract</option>
                        <option>No — I’m currently looking</option>
                      </select>
                    </label>

                    <label className="form-field">
                      <span>First name</span>
                      <input name="firstName" autoComplete="given-name" required />
                    </label>
                    <label className="form-field">
                      <span>Last name</span>
                      <input name="lastName" autoComplete="family-name" required />
                    </label>
                    <label className="form-field">
                      <span>Email</span>
                      <input type="email" name="email" autoComplete="email" required />
                    </label>
                    <label className="form-field">
                      <span>Phone</span>
                      <input type="tel" name="phone" autoComplete="tel" required />
                    </label>

                    <label className="hidden" aria-hidden="true">
                      <span>Company</span>
                      <input name="company" tabIndex={-1} autoComplete="off" />
                    </label>

                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        disabled={fitCheckSubmitting}
                        aria-busy={fitCheckSubmitting}
                        className="group flex w-full items-center justify-between bg-[#0b0c10] px-6 py-5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#20232a] disabled:cursor-wait disabled:opacity-70"
                      >
                        {fitCheckSubmitting ? "Sending…" : "Start my property review"}
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                      </button>
                      {fitCheckError ? (
                        <p role="alert" className="mt-4 text-xs leading-5 text-black/60">
                          {fitCheckError}
                        </p>
                      ) : null}
                      <p className="mt-4 text-[10px] leading-5 text-black/42">
                        Preliminary review only. It is not a permit, zoning determination, survey, engineering opinion, or guarantee of approval. Final feasibility depends on municipal review and site-specific conditions.
                      </p>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        ) : null}
    </section>
  );
}
