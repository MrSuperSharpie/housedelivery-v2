import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { HeadlineReveal } from "@/components/headline-reveal";
import { SiteHeader } from "@/components/site-header";
import {
  coastalLightCollection,
  type CoastalLightGroup,
} from "@/data/coastal-light";
import { inclusionCategories } from "@/data/inclusions";

export const metadata: Metadata = {
  title: "Solace Coastal Light Design Direction",
  description:
    "Explore Coastal Light, a coordinated visual direction for the Solace custom home by House Delivery Inc.",
  openGraph: {
    title: "Solace Coastal Light Design Direction",
    description:
      "A coordinated visual direction shaped by pale oak, warm whites, soft ivory stone and quiet West Coast character.",
    type: "website",
  },
};

const categoryById = new Map(
  inclusionCategories.map((category) => [category.id, category]),
);

function CollectionGroup({
  group,
  index,
}: {
  group: CoastalLightGroup;
  index: number;
}) {
  const imageFirst = index % 2 === 0;

  return (
    <section
      id={group.id}
      aria-labelledby={`${group.id}-heading`}
      className="scroll-mt-24 border-t border-white/12 px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-36"
    >
      <div className="mx-auto max-w-[1504px]">
        <article className="grid overflow-hidden border border-white/12 bg-[#0d0f13] lg:grid-cols-12">
          <div
            className={`relative aspect-[4/3] overflow-hidden border-b border-white/12 lg:col-span-7 lg:aspect-auto lg:min-h-[43rem] lg:border-b-0 ${
              imageFirst ? "lg:border-r" : "lg:order-2 lg:border-l"
            }`}
          >
            <Image
              src={group.image.src}
              alt={group.image.alt}
              fill
              quality={90}
              sizes="(max-width: 1023px) calc(100vw - 40px), 58vw"
              className="object-cover"
            />
          </div>

          <div className="flex min-h-[34rem] flex-col p-6 sm:p-9 lg:col-span-5 lg:min-h-[43rem] lg:p-10 xl:p-12">
            <div className="flex items-start justify-between gap-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/56">
                Visual coordination group
              </p>
              <span className="font-mono text-[9px] tracking-[0.18em] text-white/30">
                {group.number} / {String(coastalLightCollection.groups.length).padStart(2, "0")}
              </span>
            </div>

            <div className="mt-auto pt-16">
              <h2
                id={`${group.id}-heading`}
                className="text-[clamp(2.9rem,5.4vw,5.9rem)] font-medium leading-[0.88] tracking-[-0.067em] text-white/94"
              >
                {group.name}
              </h2>
              <p className="mt-7 max-w-xl text-base leading-8 text-white/58">
                {group.introduction}
              </p>

              <ul className="mt-9 grid gap-x-7 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {group.designIntent.map((item) => (
                  <li
                    key={item}
                    className="border-t border-white/10 py-3 text-xs leading-5 text-white/62"
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-9 border-t border-white/14 pt-6">
                <p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-white/38">
                  Coordinated categories
                </p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                  {group.categoryIds.map((categoryId) => {
                    const category = categoryById.get(categoryId);

                    if (!category) {
                      throw new Error(
                        `Unknown Coastal Light inclusion category: ${categoryId}`,
                      );
                    }

                    return (
                      <Link
                        key={categoryId}
                        href={`/inclusions#${categoryId}`}
                        className="text-xs leading-6 text-white/52 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white focus-visible:text-white"
                      >
                        {category.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default function CoastalLightPage() {
  return (
    <>
      <SiteHeader />
      <main className="overflow-hidden bg-[#0b0c10] text-white">
        <section className="relative min-h-[88svh] border-b border-white/12 pt-[76px]">
          <Image
            src={coastalLightCollection.heroImage.src}
            alt={coastalLightCollection.heroImage.alt}
            fill
            priority
            quality={90}
            sizes="100vw"
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/78"
          />

          <div className="relative mx-auto flex min-h-[calc(88svh-76px)] max-w-[1600px] flex-col justify-between px-5 pb-10 pt-7 sm:px-8 sm:pb-14 lg:px-12 lg:pb-16">
            <Link
              href="/homes/solace#design-collections"
              className="inline-flex w-fit items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
              Solace design directions
            </Link>

            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-20">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/72">
                  {coastalLightCollection.homeName} / Design Direction {coastalLightCollection.number}
                </p>
                <HeadlineReveal trigger="mount" className="mt-7">
                  <h1 className="max-w-6xl text-[clamp(4rem,10vw,10rem)] font-medium leading-[0.8] tracking-[-0.078em]">
                    Coastal
                    <br />
                    <span className="text-white/62">Light.</span>
                  </h1>
                </HeadlineReveal>
              </div>
              <p className="max-w-xl border-l border-white/28 pl-5 text-base leading-8 text-white/76 lg:justify-self-end lg:text-lg">
                {coastalLightCollection.introduction}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#ebe7dd] px-5 py-24 text-[#111216] sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
                  Visual language / Controlled choice
                </p>
                <h2 className="mt-7 max-w-3xl text-[clamp(3.2rem,6.8vw,7.2rem)] font-medium leading-[0.84] tracking-[-0.072em]">
                  One direction.
                  <br />
                  <span className="text-black/32">Choices made by category.</span>
                </h2>
              </div>

              <div className="lg:pt-16">
                <p className="max-w-2xl text-lg leading-8 text-black/68 sm:text-xl sm:leading-9">
                  {coastalLightCollection.coordinationStatement}
                </p>
                <div className="mt-10 grid border-l border-t border-black/14 sm:grid-cols-2 xl:grid-cols-3">
                  {coastalLightCollection.palette.map((material, index) => (
                    <div
                      key={material}
                      className="flex min-h-24 flex-col justify-between border-b border-r border-black/14 p-4"
                    >
                      <span className="font-mono text-[9px] text-black/28">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-5 text-xs font-medium uppercase tracking-[0.13em] text-black/66">
                        {material}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <nav
              aria-label="Coastal Light visual coordination groups"
              className="mt-20 border-t border-black/18 lg:mt-28"
            >
              {coastalLightCollection.groups.map((group) => (
                <Link
                  key={group.id}
                  href={`#${group.id}`}
                  className="group grid gap-4 border-b border-black/14 py-5 sm:grid-cols-[4rem_1fr_auto] sm:items-center"
                >
                  <span className="font-mono text-[9px] tracking-[0.16em] text-black/32">
                    {group.number}
                  </span>
                  <span className="text-xl font-medium tracking-[-0.035em] text-black/76 sm:text-2xl">
                    {group.name}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-black/36 transition-transform group-hover:translate-x-1 group-hover:text-black/70"
                    strokeWidth={1.5}
                  />
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <div aria-label="Coastal Light visual coordination groups">
          {coastalLightCollection.groups.map((group, index) => (
            <CollectionGroup key={group.id} group={group} index={index} />
          ))}
        </div>

        <section className="border-t border-white/12 px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/44">
                  From direction to delivery
                </p>
                <h2 className="mt-7 max-w-3xl text-[clamp(3rem,6.5vw,7rem)] font-medium leading-[0.86] tracking-[-0.07em]">
                  House Delivery
                  <br />
                  <span className="text-white/38">validates each choice.</span>
                </h2>
              </div>

              <div>
                <p className="max-w-2xl text-base leading-8 text-white/58 sm:text-lg">
                  Coastal Light establishes the design intent. You can then
                  mix Premium included selections and controlled Signature
                  upgrades by category. House Delivery later validates the
                  resulting configuration for the project.
                </p>

                <ol className="mt-10 grid border-l border-t border-white/12 sm:grid-cols-2">
                  {[
                    "Design intent",
                    "Controlled selection",
                    "Product + evidence mapping",
                    "Project-specific confirmation",
                  ].map((step, index) => (
                    <li
                      key={step}
                      className="flex min-h-32 flex-col justify-between border-b border-r border-white/12 p-5"
                    >
                      <span className="font-mono text-[9px] text-white/28">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-7 text-sm font-medium text-white/72">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/12 bg-[#111319] px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto grid max-w-[1504px] gap-12 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-24">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/44">
                Solace / Coastal Light
              </p>
              <h2 className="mt-7 max-w-5xl text-[clamp(3.4rem,7.2vw,7.8rem)] font-medium leading-[0.84] tracking-[-0.072em]">
                Carry this direction
                <br />
                <span className="text-white/38">into My Solace.</span>
              </h2>
            </div>
            <div className="max-w-sm border-l border-white/16 pl-6">
              <p className="text-sm leading-7 text-white/54">
                Return to Solace to configure the first controlled category.
                Your Design Direction and inclusion levels remain separate as
                My Solace grows.
              </p>
              <Link
                href="/homes/solace#solace-configurator"
                className="group mt-8 inline-flex min-h-12 items-center gap-8 bg-white px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#0b0c10] transition-colors hover:bg-white/84 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Configure My Solace
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
            </div>
          </div>
        </section>

        <div className="px-5 py-10 sm:px-8 lg:px-12">
          <p className="mx-auto max-w-[1504px] text-xs leading-6 text-white/42">
            Illustrative design visualization. Final products, finishes,
            availability, pricing and technical suitability are confirmed
            during project review and are subject to project-specific
            requirements.
          </p>
        </div>
      </main>
    </>
  );
}
