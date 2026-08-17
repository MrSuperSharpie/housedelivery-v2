import Image from "next/image";
import type { ReactNode } from "react";

import type {
  CarriageHome,
  CarriageHomeImage,
} from "@/data/carriage-homes";

type CarriageHomePrintFolioProps = {
  floorPlan: CarriageHomeImage;
  model: CarriageHome;
  modelCount: number;
  modelNumber: number;
};

type PrintPageProps = {
  children: ReactNode;
  dark?: boolean;
  label: string;
  page: number;
  totalPages: number;
};

function pairImages(images: readonly CarriageHomeImage[]) {
  const pairs: CarriageHomeImage[][] = [];

  for (let index = 0; index < images.length; index += 2) {
    pairs.push(images.slice(index, index + 2));
  }

  return pairs;
}

function PrintPage({
  children,
  dark = false,
  label,
  page,
  totalPages,
}: PrintPageProps) {
  return (
    <article
      aria-label={label}
      data-home-folio-print-page
      className={`home-folio-print-page ${dark ? "home-folio-print-page-dark" : ""}`}
    >
      <div className="home-folio-print-page-inner">
        <div className="home-folio-print-page-content">{children}</div>
        <footer className="home-folio-print-footer">
          <span>House Delivery / Laneway &amp; Carriage</span>
          <span>
            {String(page).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
          </span>
        </footer>
      </div>
    </article>
  );
}

export function CarriageHomePrintFolio({
  floorPlan,
  model,
  modelCount,
  modelNumber,
}: CarriageHomePrintFolioProps) {
  const galleryImages = model.images.filter(
    (image) => image.src !== floorPlan.src,
  );
  const galleryPages = pairImages(galleryImages);
  const totalPages = galleryPages.length + 4;
  const introductionImage = galleryImages[1] ?? galleryImages[0];
  const planPage = galleryPages.length + 3;

  return (
    <section
      aria-label={`${model.name} printable home folio`}
      className="carriage-print-folio"
      data-carriage-print-folio
      data-home-folio-page-count={totalPages}
    >
      <PrintPage
        dark
        label={`${model.name} folio cover`}
        page={1}
        totalPages={totalPages}
      >
        <div className="home-folio-print-kicker">
          <span>House Delivery</span>
          <span>
            Residence {String(modelNumber).padStart(2, "0")} /{" "}
            {String(modelCount).padStart(2, "0")}
          </span>
        </div>
        <div className="home-folio-print-media home-folio-print-cover-media">
          <Image
            src={model.images[0].src}
            alt={model.images[0].alt}
            fill
            loading="eager"
            quality={90}
            sizes="178mm"
            className="object-contain"
          />
        </div>
        <div className="home-folio-print-title-block">
          <p>Laneway / Carriage home</p>
          <h1>{model.name}</h1>
          <div>
            <p>{model.heroStatement}</p>
            <p>{model.description}</p>
          </div>
        </div>
      </PrintPage>

      <PrintPage
        label={`${model.name} architecture introduction`}
        page={2}
        totalPages={totalPages}
      >
        <header className="home-folio-print-heading home-folio-print-block">
          <p>02 / The home</p>
          <div>
            <h2>{model.heroStatement}</h2>
            <p>{model.supportingCopy}</p>
          </div>
        </header>
        <figure className="home-folio-print-block">
          <div className="home-folio-print-media home-folio-print-introduction-media">
            <Image
              src={introductionImage.src}
              alt={introductionImage.alt}
              fill
              loading="eager"
              quality={90}
              sizes="178mm"
              className="object-contain"
            />
          </div>
          <figcaption>{introductionImage.label}</figcaption>
        </figure>
      </PrintPage>

      {galleryPages.map((images, galleryPageIndex) => {
        const page = galleryPageIndex + 3;

        return (
          <PrintPage
            key={images.map((image) => image.src).join("-")}
            label={`${model.name} image study ${galleryPageIndex + 1}`}
            page={page}
            totalPages={totalPages}
          >
            <header className="home-folio-print-heading home-folio-print-block">
              <p>{String(page).padStart(2, "0")} / Image study</p>
              <div>
                <h2>A closer study of daily space.</h2>
                <p>
                  Exterior, interior, and assembly views are presented at their
                  useful scale, with room for the architecture to be read clearly.
                </p>
              </div>
            </header>
            <div className="home-folio-print-gallery">
              {images.map((image, imageIndex) => {
                const absoluteIndex = galleryPageIndex * 2 + imageIndex;

                return (
                  <figure key={image.src} className="home-folio-print-block">
                    <div className="home-folio-print-media home-folio-print-gallery-media">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        loading="eager"
                        quality={90}
                        sizes="178mm"
                        className="object-contain"
                      />
                    </div>
                    <figcaption>
                      <span>{image.label}</span>
                      <span>{model.themes[absoluteIndex % model.themes.length]}</span>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </PrintPage>
        );
      })}

      <PrintPage
        label={`${model.name} reference floor plan`}
        page={planPage}
        totalPages={totalPages}
      >
        <header className="home-folio-print-heading home-folio-print-block">
          <p>{String(planPage).padStart(2, "0")} / Plan and technical study</p>
          <div>
            <h2>Designed to flow. Engineered to endure.</h2>
            <p>
              The reference plan establishes room relationships and circulation.
              Foundation, structure, envelope, and services are adapted to the
              selected site and local authority requirements.
            </p>
          </div>
        </header>
        <figure className="home-folio-print-plan home-folio-print-block">
          <div className="home-folio-print-plan-label">
            {model.name} / Reference floor plan
          </div>
          <div className="home-folio-print-media home-folio-print-plan-media">
            <Image
              src={floorPlan.src}
              alt={floorPlan.alt}
              fill
              loading="eager"
              quality={90}
              sizes="178mm"
              className="object-contain"
            />
          </div>
        </figure>
        <p className="home-folio-print-notice home-folio-print-block">
          Reference design only. Property fit, zoning, setbacks, servicing,
          access, structure, engineering, code compliance, permits, pricing, and
          final specifications require project-specific review and may change.
        </p>
      </PrintPage>

      <PrintPage
        dark
        label={`${model.name} project review pathway`}
        page={totalPages}
        totalPages={totalPages}
      >
        <div className="home-folio-print-kicker">
          <span>Next conversation</span>
          <span>{model.name}</span>
        </div>
        <div className="home-folio-print-finale">
          <p>Project-specific planning</p>
          <h2>Begin your project review.</h2>
          <p>
            Start with a project review. We’ll map property fit, local
            requirements, site adaptation, and a realistic delivery sequence for
            the {model.name}.
          </p>
          <div>
            {model.themes.map((theme, index) => (
              <p key={theme}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {theme}
              </p>
            ))}
          </div>
        </div>
      </PrintPage>
    </section>
  );
}
