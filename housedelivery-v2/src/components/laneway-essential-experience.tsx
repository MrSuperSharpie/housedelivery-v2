"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  Maximize2,
  Pencil,
  Printer,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  createLookBookReference,
  formatLookBookPreparedDate,
  getLookBookCustomerName,
  getLookBookPersonalTitle,
  type LookBookPersonalization,
} from "@/data/home-look-book";
import type {
  LanewayEssentialDefinition,
  LanewayEssentialImage,
  LanewayEssentialLook,
} from "@/data/laneway-essential";

type LanewayEssentialExperienceProps = {
  definition: LanewayEssentialDefinition;
};

type ImagePreview = LanewayEssentialImage & {
  lookName: string;
};

function scrollToSection(id: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

function PreviewButton({
  image,
  lookName,
  onPreview,
  className,
  sizes,
  priority = false,
  children,
}: {
  image: LanewayEssentialImage;
  lookName: string;
  onPreview: (preview: ImagePreview) => void;
  className: string;
  sizes: string;
  priority?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onPreview({ ...image, lookName })}
      aria-label={`View ${lookName} ${image.label.toLowerCase()} image`}
      className={`group relative block w-full overflow-hidden bg-[#d8d3c8] text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white ${className}`}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        priority={priority}
        quality={90}
        sizes={sizes}
        className="object-cover transition-transform duration-700 group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      {children}
      <span className="look-book-screen-control absolute bottom-3 right-3 inline-flex items-center gap-2 bg-black/74 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-white">
        <Maximize2 className="size-3" aria-hidden="true" />
        View
      </span>
    </button>
  );
}

function ImageLightbox({
  preview,
  onClose,
}: {
  preview: ImagePreview | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!preview) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, preview]);

  if (!preview) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${preview.lookName}: ${preview.label}`}
      className="fixed inset-0 z-[100] grid bg-black/92 p-3 sm:p-7"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="relative m-auto h-full max-h-[900px] w-full max-w-[1320px] overflow-hidden bg-[#111216]">
        <Image
          src={preview.src}
          alt={preview.alt}
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-contain"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/88 via-black/32 to-transparent px-5 pb-5 pt-24 text-white sm:px-8 sm:pb-8">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/58">
            Essential / {preview.lookName}
          </p>
          <p className="mt-2 text-2xl font-medium tracking-[-0.035em]">
            {preview.label}
          </p>
        </div>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="absolute right-3 top-3 grid size-12 place-items-center bg-black/78 text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-5 sm:top-5"
          aria-label="Close image preview"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function LookCard({
  look,
  isSelected,
  onSelect,
  onPreview,
}: {
  look: LanewayEssentialLook;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: (preview: ImagePreview) => void;
}) {
  return (
    <article
      data-essential-look={look.id}
      data-selected={isSelected ? "true" : "false"}
      className={`border transition-colors ${
        isSelected
          ? "border-white bg-white text-[#111216]"
          : "border-white/16 bg-[#111216] text-white"
      }`}
    >
      <PreviewButton
        image={look.images.kitchenLiving}
        lookName={look.name}
        onPreview={onPreview}
        className="aspect-[4/3]"
        sizes="(max-width: 1023px) calc(100vw - 40px), 33vw"
      >
        {isSelected ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-2 bg-[#111216] px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.17em] text-white">
            <Check className="size-3" strokeWidth={1.8} aria-hidden="true" />
            Selected
          </span>
        ) : null}
      </PreviewButton>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p
              className={`text-[8px] font-semibold uppercase tracking-[0.2em] ${
                isSelected ? "text-black/46" : "text-white/38"
              }`}
            >
              Essential interior look
            </p>
            <h3 className="mt-3 text-[clamp(1.8rem,3vw,2.6rem)] font-medium leading-none tracking-[-0.05em]">
              {look.name}
            </h3>
          </div>
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-full border ${
              isSelected ? "border-black bg-black text-white" : "border-white/24"
            }`}
            aria-hidden="true"
          >
            {isSelected ? <Check className="size-4" /> : null}
          </span>
        </div>
        <p
          className={`mt-5 min-h-[84px] text-sm leading-7 ${
            isSelected ? "text-black/62" : "text-white/48"
          }`}
        >
          {look.description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <PreviewButton
            image={look.images.bedroomStorage}
            lookName={look.name}
            onPreview={onPreview}
            className="aspect-[4/3]"
            sizes="(max-width: 1023px) 50vw, 17vw"
          />
          <PreviewButton
            image={look.images.bathroom}
            lookName={look.name}
            onPreview={onPreview}
            className="aspect-[4/3]"
            sizes="(max-width: 1023px) 50vw, 17vw"
          />
        </div>

        <button
          type="button"
          onClick={onSelect}
          aria-pressed={isSelected}
          className={`mt-6 flex min-h-12 w-full items-center justify-between gap-4 px-4 text-left text-[9px] font-semibold uppercase tracking-[0.17em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
            isSelected
              ? "bg-[#111216] text-white focus-visible:outline-black"
              : "border border-white/20 text-white hover:bg-white hover:text-black focus-visible:outline-white"
          }`}
        >
          <span>{isSelected ? "Interior look selected" : `Choose ${look.name}`}</span>
          {isSelected ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <ArrowRight className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </article>
  );
}

function FolioPage({
  children,
  className = "bg-[#e7e3d8] text-[#111216]",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <section
      data-look-book-print-page
      aria-label={label}
      className={`laneway-look-book-page relative overflow-hidden ${className}`}
    >
      {children}
    </section>
  );
}

function FolioMark({ page, dark = false }: { page: string; dark?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between border-t pt-3 text-[7px] font-semibold uppercase tracking-[0.19em] ${
        dark ? "border-white/18 text-white/48" : "border-black/18 text-black/48"
      }`}
    >
      <span>House Delivery / Willow Nook</span>
      <span>{page} / 08</span>
    </div>
  );
}

function PersonalizationForm({
  definition,
  look,
  onCreate,
}: {
  definition: LanewayEssentialDefinition;
  look: LanewayEssentialLook;
  onCreate: (personalization: LookBookPersonalization) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedFirstName = firstName.trim();
    if (!normalizedFirstName) return;

    onCreate({
      customer: {
        firstName: normalizedFirstName,
        lastName: lastName.trim() || undefined,
      },
      preparedAt: new Date().toISOString(),
      reference: createLookBookReference(definition.homeSlug),
    });
  }

  return (
    <section
      id="home-look-book"
      tabIndex={-1}
      aria-labelledby="willow-look-book-heading"
      data-look-book-ready="true"
      data-look-book-personalized="false"
      className="scroll-mt-20 bg-[#e7e3d8] px-5 py-24 text-[#111216] outline-none sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-14 border-t border-black/18 pt-7 lg:grid-cols-[1.05fr_0.75fr] lg:items-end lg:gap-28">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
              My Willow Nook / Personalize your folio
            </p>
            <h2
              id="willow-look-book-heading"
              className="mt-7 max-w-5xl text-[clamp(3.8rem,8vw,8rem)] font-medium leading-[0.84] tracking-[-0.075em] text-black/88"
            >
              Create My
              <br />
              <span className="text-black/48">Willow Nook Look Book.</span>
            </h2>
            <p className="mt-9 max-w-2xl text-base leading-8 text-black/60">
              Add your name to create a personalized editorial record of the
              Willow Nook and your {look.name} interior direction. No contact
              details are required.
            </p>
          </div>
          <form
            data-look-book-personalization-form
            onSubmit={handleSubmit}
            className="border border-black/16 bg-[#ded9cd] p-6 sm:p-9"
          >
            <div className="grid gap-7">
              <label className="form-field">
                <span>First name / Required</span>
                <input
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
                />
              </label>
              <label className="form-field">
                <span>Last name / Optional</span>
                <input
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                />
              </label>
            </div>
            <button
              type="submit"
              className="group mt-9 flex min-h-14 w-full items-center justify-between gap-7 bg-[#111216] px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white hover:bg-black/76 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
            >
              <span>Create My Look Book</span>
              <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function LanewayLookBook({
  definition,
  look,
  personalization,
  onEditName,
  onEditLook,
  onPreview,
}: {
  definition: LanewayEssentialDefinition;
  look: LanewayEssentialLook;
  personalization: LookBookPersonalization;
  onEditName: () => void;
  onEditLook: () => void;
  onPreview: (preview: ImagePreview) => void;
}) {
  const customerName = getLookBookCustomerName(personalization.customer);
  const title = getLookBookPersonalTitle(
    personalization.customer,
    definition.homeName.replace(/^The /, ""),
  );
  const preparedDate = formatLookBookPreparedDate(personalization.preparedAt);

  return (
    <section
      id="home-look-book"
      tabIndex={-1}
      data-look-book-ready="true"
      data-look-book-personalized="true"
      data-look-book-page-count="8"
      className="laneway-look-book scroll-mt-20 bg-[#d8d3c8] text-[#111216] outline-none"
      aria-label={`${title} personalized Look Book`}
    >
      <div className="look-book-screen-control sticky top-16 z-30 border-y border-black/12 bg-[#e7e3d8]/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1504px] flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.19em] text-black/42">
              Personalized Look Book / 8 pages
            </p>
            <p className="mt-1 text-sm font-medium">{title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEditLook}
              className="inline-flex min-h-11 items-center gap-2 border border-black/18 px-4 text-[8px] font-semibold uppercase tracking-[0.16em] hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <Pencil className="size-3" aria-hidden="true" />
              Edit look
            </button>
            <button
              type="button"
              onClick={onEditName}
              className="inline-flex min-h-11 items-center gap-2 border border-black/18 px-4 text-[8px] font-semibold uppercase tracking-[0.16em] hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <Pencil className="size-3" aria-hidden="true" />
              Edit name
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center gap-2 bg-[#111216] px-4 text-[8px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-black/76 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <Printer className="size-3" aria-hidden="true" />
              Save as PDF
            </button>
          </div>
        </div>
      </div>

      <FolioPage label="Look Book cover" className="bg-[#111216] text-white">
        <Image
          src={definition.exteriorImage.src}
          alt={definition.exteriorImage.alt}
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/88" />
        <div className="look-book-page-inner relative z-10 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-8 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/64">
            <span>House Delivery</span>
            <span>Laneway Essential / Personalized folio</span>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/62">
              Prepared for {customerName}
            </p>
            <h2 className="mt-6 max-w-5xl text-[clamp(4rem,9vw,9.5rem)] font-medium leading-[0.82] tracking-[-0.075em]">
              {title}
            </h2>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/22 pt-4 text-[8px] uppercase tracking-[0.18em] text-white/56">
              <span>{look.name}</span>
              <span>Essential package</span>
              <span>{preparedDate}</span>
              <span>{personalization.reference}</span>
            </div>
          </div>
        </div>
      </FolioPage>

      <FolioPage label="The Willow Nook home and reference plan">
        <div className="look-book-page-inner flex flex-col justify-between">
          <div>
            <div className="grid gap-8 border-t border-black/20 pt-4 md:grid-cols-[0.72fr_1.28fr]">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-black/48">
                  02 / The home
                </p>
                <h3 className="mt-5 text-[clamp(3rem,6vw,6.5rem)] font-medium leading-[0.86] tracking-[-0.065em]">
                  Everything needed.
                  <br />
                  <span className="text-black/40">Nothing wasted.</span>
                </h3>
              </div>
              <div className="md:pt-14">
                <p className="max-w-xl text-base leading-8 text-black/62">
                  {definition.homeDescription}
                </p>
                <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-black/18 pt-4 text-[8px] uppercase tracking-[0.16em] text-black/52">
                  <div>
                    <dt>Residence</dt>
                    <dd className="mt-2 text-xs font-medium normal-case tracking-normal text-black/82">
                      {definition.homeName}
                    </dd>
                  </div>
                  <div>
                    <dt>Reference program</dt>
                    <dd className="mt-2 text-xs font-medium normal-case tracking-normal text-black/82">
                      {definition.areaLabel}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="mt-10 grid gap-3 md:grid-cols-[1.18fr_0.82fr]">
              <div className="relative aspect-[1.45/1] overflow-hidden bg-[#cfc9bc]">
                <Image
                  src={definition.arrivalImage.src}
                  alt={definition.arrivalImage.alt}
                  fill
                  quality={90}
                  sizes="70vw"
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[1.45/1] overflow-hidden bg-white">
                <Image
                  src={definition.floorPlanImage.src}
                  alt={definition.floorPlanImage.alt}
                  fill
                  quality={90}
                  sizes="40vw"
                  className="object-contain p-4"
                />
              </div>
            </div>
            <p className="mt-4 max-w-5xl text-[8px] leading-4 text-black/48">
              {definition.referencePlanNotice}
            </p>
          </div>
          <FolioMark page="02" />
        </div>
      </FolioPage>

      <FolioPage label="Selected interior direction" className="bg-[#d7d0c2] text-[#111216]">
        <div className="look-book-page-inner flex flex-col justify-between">
          <div className="grid min-h-[680px] gap-8 md:grid-cols-[0.78fr_1.22fr] md:items-stretch">
            <div className="flex flex-col justify-between border-t border-black/18 pt-4">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-black/48">
                  03 / Interior direction
                </p>
                <h3 className="mt-6 text-[clamp(3.4rem,7vw,7rem)] font-medium leading-[0.84] tracking-[-0.07em]">
                  {look.name}
                </h3>
                <p className="mt-8 max-w-md text-base leading-8 text-black/62">
                  {look.description}
                </p>
              </div>
              <div className="mb-10">
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-black/42">
                  Directional character
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {look.character.map((item) => (
                    <span
                      key={item}
                      className="border border-black/18 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.16em]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <PreviewButton
              image={look.images.kitchenLiving}
              lookName={look.name}
              onPreview={onPreview}
              className="min-h-[540px] md:min-h-0"
              sizes="70vw"
            />
          </div>
          <FolioMark page="03" />
        </div>
      </FolioPage>

      <FolioPage label="Kitchen and living hero" className="bg-[#111216] text-white">
        <div className="absolute inset-0">
          <Image
            src={look.images.kitchenLiving.src}
            alt={look.images.kitchenLiving.alt}
            fill
            quality={90}
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-transparent to-black/12" />
        </div>
        <div className="look-book-page-inner relative z-10 flex flex-col justify-between">
          <div className="flex justify-between gap-6 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/62">
            <span>04 / Kitchen + living</span>
            <span>{look.name} / Essential</span>
          </div>
          <div>
            <h3 className="max-w-4xl text-[clamp(3.7rem,8vw,8.2rem)] font-medium leading-[0.84] tracking-[-0.07em]">
              The centre of
              <br />
              everyday life.
            </h3>
            <p className="mt-7 max-w-xl text-sm leading-7 text-white/68">
              The selected look coordinates the compact kitchen and living room
              as one continuous interior direction.
            </p>
            <div className="mt-8">
              <FolioMark page="04" dark />
            </div>
          </div>
        </div>
      </FolioPage>

      <FolioPage label="Private spaces">
        <div className="look-book-page-inner flex flex-col justify-between">
          <div>
            <div className="grid gap-8 border-t border-black/18 pt-4 md:grid-cols-2 md:items-end">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-black/48">
                  05 / Private spaces
                </p>
                <h3 className="mt-5 text-[clamp(3.2rem,6vw,6.5rem)] font-medium leading-[0.86] tracking-[-0.065em]">
                  Quiet utility,
                  <br />
                  <span className="text-black/40">carried through.</span>
                </h3>
              </div>
              <p className="max-w-lg text-sm leading-7 text-black/58 md:justify-self-end">
                Bedroom storage and bathroom finishes continue the same
                coordinated aesthetic. These supporting views describe one
                look, not additional selection decisions.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-[1.25fr_0.75fr] md:items-start">
              <PreviewButton
                image={look.images.bedroomStorage}
                lookName={look.name}
                onPreview={onPreview}
                className="aspect-[4/3]"
                sizes="70vw"
              />
              <div className="md:pt-20">
                <PreviewButton
                  image={look.images.bathroom}
                  lookName={look.name}
                  onPreview={onPreview}
                  className="aspect-[4/3]"
                  sizes="40vw"
                />
                <p className="mt-5 border-t border-black/18 pt-4 text-xs leading-6 text-black/54">
                  Integrated storage, warm light, and a restrained material
                  family make the small footprint feel calm and resolved.
                </p>
              </div>
            </div>
          </div>
          <FolioMark page="05" />
        </div>
      </FolioPage>

      <FolioPage label="Representative palette" className="bg-[#d7d0c2] text-[#111216]">
        <div className="look-book-page-inner flex flex-col justify-between">
          <div>
            <div className="grid gap-8 border-t border-black/18 pt-4 md:grid-cols-[0.72fr_1.28fr] md:items-end">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-black/48">
                  06 / Palette
                </p>
                <h3 className="mt-5 text-[clamp(3.2rem,6vw,6.4rem)] font-medium leading-[0.86] tracking-[-0.065em]">
                  Material rhythm.
                </h3>
              </div>
              <p className="max-w-xl text-sm leading-7 text-black/58 md:justify-self-end">
                A visual palette drawn only from your selected imagery. Crops
                and colours are representative of the design direction, not
                physical samples or final product specifications.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
              {look.palette.map((colour, index) => (
                <div key={colour}>
                  <div
                    className="aspect-square border border-black/10"
                    style={{ backgroundColor: colour }}
                  />
                  <p className="mt-3 text-[7px] font-semibold uppercase tracking-[0.17em] text-black/44">
                    Tone {String(index + 1).padStart(2, "0")}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-10 grid grid-cols-3 gap-3">
              {Object.values(look.images).map((image) => (
                <div key={image.src}>
                  <div className="relative aspect-[1.3/1] overflow-hidden bg-[#c7c0b2]">
                    <Image
                      src={image.src}
                      alt=""
                      fill
                      quality={90}
                      sizes="33vw"
                      className="scale-150 object-cover"
                    />
                  </div>
                  <p className="mt-3 text-[7px] font-semibold uppercase tracking-[0.17em] text-black/44">
                    {image.label} / Representative crop
                  </p>
                </div>
              ))}
            </div>
          </div>
          <FolioMark page="06" />
        </div>
      </FolioPage>

      <FolioPage label="Property review pathway">
        <div className="look-book-page-inner flex flex-col justify-between">
          <div>
            <div className="grid gap-10 border-t border-black/18 pt-4 md:grid-cols-[0.82fr_1.18fr]">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-black/48">
                  07 / Property review
                </p>
                <h3 className="mt-5 text-[clamp(3.4rem,7vw,7.2rem)] font-medium leading-[0.84] tracking-[-0.07em]">
                  From reference
                  <br />
                  <span className="text-black/40">to real property.</span>
                </h3>
              </div>
              <div className="md:pt-16">
                <p className="max-w-xl text-base leading-8 text-black/60">
                  Willow Nook begins as a reference home. A preliminary review
                  helps establish whether the idea merits deeper,
                  project-specific work.
                </p>
              </div>
            </div>
            <div className="mt-16 grid gap-0 border-y border-black/18 md:grid-cols-3">
              {definition.propertyReviewSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="border-b border-black/18 py-7 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
                >
                  <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-black/42">
                    Step {String(index + 1).padStart(2, "0")}
                  </p>
                  <h4 className="mt-5 text-2xl font-medium tracking-[-0.04em]">
                    {step.title}
                  </h4>
                  <p className="mt-4 text-xs leading-6 text-black/56">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-12 border-l-2 border-black/24 pl-5">
              <p className="text-[8px] font-semibold uppercase tracking-[0.19em] text-black/46">
                Preliminary only
              </p>
              <p className="mt-3 max-w-4xl text-xs leading-6 text-black/54">
                This Look Book records a design preference. It is not a zoning,
                feasibility, engineering, permitting, pricing, product, or
                construction approval.
              </p>
            </div>
          </div>
          <FolioMark page="07" />
        </div>
      </FolioPage>

      <FolioPage label="Finale and property review call to action" className="bg-[#111216] text-white">
        <Image
          src={definition.exteriorImage.src}
          alt=""
          fill
          quality={90}
          sizes="100vw"
          className="object-cover opacity-38"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/58 to-black/28" />
        <div className="look-book-page-inner relative z-10 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-8 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/58">
            <span>08 / Next conversation</span>
            <span>{personalization.reference}</span>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/58">
              {look.name} / Essential package
            </p>
            <h3 className="mt-7 max-w-6xl text-[clamp(3.8rem,8.5vw,8.8rem)] font-medium leading-[0.83] tracking-[-0.072em]">
              Could Willow Nook
              <br />
              work on my property?
            </h3>
            <p className="mt-8 max-w-xl text-sm leading-7 text-white/66">
              Begin with a preliminary conversation about your municipality,
              approximate location, intended use, and timing. Project-specific
              review is required before any determination can be made.
            </p>
            <Link
              href="/#reserve"
              className="look-book-screen-control group mt-9 inline-flex min-h-14 items-center gap-12 bg-white px-6 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#111216] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Check Willow Nook for My Property
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <div className="mt-12">
              <FolioMark page="08" dark />
            </div>
          </div>
        </div>
      </FolioPage>
    </section>
  );
}

export function LanewayEssentialExperience({
  definition,
}: LanewayEssentialExperienceProps) {
  const [selectedLookId, setSelectedLookId] = useState(definition.looks[0].id);
  const [confirmedLookId, setConfirmedLookId] = useState<string | null>(null);
  const [personalization, setPersonalization] =
    useState<LookBookPersonalization | null>(null);
  const [preview, setPreview] = useState<ImagePreview | null>(null);

  const selectedLook =
    definition.looks.find((look) => look.id === selectedLookId) ??
    definition.looks[0];
  const confirmedLook = definition.looks.find(
    (look) => look.id === confirmedLookId,
  );

  function chooseLook(lookId: string) {
    setSelectedLookId(lookId);
    if (lookId !== confirmedLookId) {
      setConfirmedLookId(null);
      setPersonalization(null);
    }
  }

  function confirmLook() {
    setConfirmedLookId(selectedLook.id);
    setPersonalization(null);
    scrollToSection("my-willow-nook");
  }

  function createLookBook(nextPersonalization: LookBookPersonalization) {
    setPersonalization(nextPersonalization);
    scrollToSection("home-look-book");
  }

  return (
    <section id="laneway-essential-experience">
      <section
        id="willow-nook-essential"
        aria-labelledby="willow-essential-heading"
        className="scroll-mt-20 border-y border-white/12 bg-[#101115] px-5 py-24 text-white sm:px-8 sm:py-28 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-12 border-t border-white/16 pt-7 lg:grid-cols-[0.76fr_1.24fr] lg:gap-24">
            <div>
              <p className="eyebrow">Willow Nook / Essential Package Included</p>
              <h2
                id="willow-essential-heading"
                className="mt-7 max-w-3xl text-[clamp(3.2rem,6vw,6.8rem)] font-medium leading-[0.87] tracking-[-0.068em]"
              >
                One complete interior.
                <br />
                <span className="text-white/40">Three considered looks.</span>
              </h2>
            </div>
            <div className="lg:pt-20">
              <p className="max-w-2xl text-lg leading-8 text-white/64">
                The Willow Nook includes one coordinated Essential interior
                package. Choose the visual direction that feels most like home;
                the kitchen, living room, bedroom storage, and bathroom remain
                part of that single coordinated look.
              </p>
              <a
                href="#choose-willow-interior-look"
                className="group mt-8 inline-flex min-h-13 items-center gap-12 bg-white px-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#111216] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Choose My Interior Look
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="choose-willow-interior-look"
        aria-labelledby="choose-willow-heading"
        className="scroll-mt-20 bg-[#0b0c10] px-5 py-24 text-white sm:px-8 sm:py-28 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-8 border-t border-white/14 pt-7 md:grid-cols-2 md:items-end">
            <div>
              <p className="eyebrow">One decision / Essential interior look</p>
              <h2
                id="choose-willow-heading"
                className="mt-6 max-w-3xl text-[clamp(3rem,6vw,6.5rem)] font-medium leading-[0.87] tracking-[-0.068em]"
              >
                Choose the feeling.
                <br />
                <span className="text-white/40">We carry it through.</span>
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-7 text-white/48 md:justify-self-end">
              Select one direction below. The two supporting images show how
              that same look continues into the bedroom, storage, and bathroom;
              they are not separate choices.
            </p>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {definition.looks.map((look) => (
              <LookCard
                key={look.id}
                look={look}
                isSelected={look.id === selectedLook.id}
                onSelect={() => chooseLook(look.id)}
                onPreview={setPreview}
              />
            ))}
          </div>

          <div className="mt-10 grid gap-6 border-t border-white/14 pt-7 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.19em] text-white/38">
                Current selection / Essential
              </p>
              <p className="mt-2 text-xl font-medium tracking-[-0.035em]">
                {selectedLook.name}
              </p>
            </div>
            <button
              type="button"
              onClick={confirmLook}
              className="group flex min-h-14 items-center justify-between gap-14 bg-white px-6 text-left text-[9px] font-semibold uppercase tracking-[0.18em] text-[#111216] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Confirm My Interior Look
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {confirmedLook ? (
        <section
          id="my-willow-nook"
          aria-labelledby="my-willow-nook-heading"
          className="scroll-mt-20 bg-[#e7e3d8] px-5 py-24 text-[#111216] sm:px-8 sm:py-28 lg:px-12 lg:py-36"
        >
          <div className="mx-auto max-w-[1504px]">
            <div className="flex flex-wrap items-end justify-between gap-8 border-t border-black/18 pt-7">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/48">
                  Confirmed / My Willow Nook
                </p>
                <h2
                  id="my-willow-nook-heading"
                  className="mt-6 text-[clamp(3.5rem,7vw,7.5rem)] font-medium leading-[0.84] tracking-[-0.07em]"
                >
                  Home, coordinated.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => scrollToSection("choose-willow-interior-look")}
                className="inline-flex min-h-11 items-center gap-3 border border-black/20 px-4 text-[8px] font-semibold uppercase tracking-[0.17em] hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <Pencil className="size-3" aria-hidden="true" />
                Edit interior look
              </button>
            </div>

            <div className="mt-12 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="relative min-h-[330px] overflow-hidden bg-[#cfc9bc] sm:min-h-[500px]">
                <Image
                  src={definition.exteriorImage.src}
                  alt={definition.exteriorImage.alt}
                  fill
                  quality={90}
                  sizes="(max-width: 1023px) 100vw, 42vw"
                  className="object-cover"
                />
                <span className="absolute left-4 top-4 bg-black/78 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.17em] text-white">
                  {definition.homeName}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1.3fr_0.7fr]">
                <PreviewButton
                  image={confirmedLook.images.kitchenLiving}
                  lookName={confirmedLook.name}
                  onPreview={setPreview}
                  className="min-h-[330px] sm:min-h-[500px]"
                  sizes="(max-width: 639px) 100vw, 45vw"
                />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                  <PreviewButton
                    image={confirmedLook.images.bedroomStorage}
                    lookName={confirmedLook.name}
                    onPreview={setPreview}
                    className="aspect-[4/3] sm:aspect-auto sm:min-h-0"
                    sizes="25vw"
                  />
                  <PreviewButton
                    image={confirmedLook.images.bathroom}
                    lookName={confirmedLook.name}
                    onPreview={setPreview}
                    className="aspect-[4/3] sm:aspect-auto sm:min-h-0"
                    sizes="25vw"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-8 border-t border-black/18 pt-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.19em] text-black/42">
                  Package / {definition.packageLabel}
                </p>
                <h3 className="mt-3 text-3xl font-medium tracking-[-0.045em]">
                  {confirmedLook.name}
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-black/56">
                  Your selection records one coordinated interior direction for
                  Willow Nook. Final products and specifications are confirmed
                  through the project process.
                </p>
              </div>
              <button
                type="button"
                onClick={() => scrollToSection("home-look-book")}
                className="group flex min-h-14 items-center justify-between gap-14 bg-[#111216] px-6 text-left text-[9px] font-semibold uppercase tracking-[0.18em] text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
              >
                <BookOpen className="size-4" aria-hidden="true" />
                Create My Willow Nook Look Book
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {confirmedLook ? (
        personalization ? (
          <LanewayLookBook
            definition={definition}
            look={confirmedLook}
            personalization={personalization}
            onEditName={() => setPersonalization(null)}
            onEditLook={() => scrollToSection("choose-willow-interior-look")}
            onPreview={setPreview}
          />
        ) : (
          <PersonalizationForm
            definition={definition}
            look={confirmedLook}
            onCreate={createLookBook}
          />
        )
      ) : null}

      <ImageLightbox preview={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
