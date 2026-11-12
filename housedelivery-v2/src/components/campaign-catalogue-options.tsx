import Image from "next/image";
import Link from "next/link";

import { CampaignInquiryLink } from "@/components/campaign-inquiry-link";
import { catalogModels } from "@/data/catalog";
import {
  cmhcCatalogueDesignNames,
  cmhcCatalogueSourceNotice,
  cmhcCatalogueTermsHref,
} from "@/data/cmhc-catalogue";
import styles from "@/app/build-your-home/campaign.module.css";

const options = [
  {
    slug: "the-micro",
    storeys: "Single-storey design",
    description:
      "A thoughtfully planned home offering comfortable independent living in a compact footprint. Ideal for family accommodation, backyard living or rental opportunities.",
  },
  {
    slug: "the-mini",
    storeys: "Two-storey design",
    description:
      "A flexible two-bedroom home providing additional space for family living, multigenerational households or rental accommodation.",
  },
] as const;

export function CampaignCatalogueOptions() {
  return (
    <section
      className={`${styles.container} ${styles.section}`}
      aria-labelledby="catalogue-options-heading"
    >
      <p className={styles.kicker}>CMHC / Pre-reviewed catalogue designs</p>
      <div className={styles.sectionIntro}>
        <h2 id="catalogue-options-heading">
          More possibilities<br /> <span>for your property</span>
        </h2>
        <p>
          Explore additional designs from CMHC&apos;s Housing Design Catalogue,
          offering flexible options for backyard living, family accommodation
          and rental housing.
        </p>
      </div>
      <div className={styles.models}>
        {options.map((option) => {
          const model = catalogModels.find((item) => item.slug === option.slug);
          const configuration = model?.specs.find(
            (spec) => spec.label === "Configuration",
          );
          if (!model || !configuration) {
            throw new Error(`Missing BC catalogue design ${option.slug}`);
          }

          return (
            <article key={model.slug} className={styles.model}>
              <figure>
                <div className={styles.modelImage}>
                  <Image
                    src={model.image}
                    alt={model.imageAlt}
                    fill
                    sizes="(min-width: 1000px) 46vw, 100vw"
                    quality={95}
                  />
                </div>
                <figcaption>CMHC Housing Design Catalogue / British Columbia</figcaption>
              </figure>
              <p className={styles.kicker}>Pre-reviewed catalogue design / BC</p>
              <h3>{model.name} | {model.code}</h3>
              <p className="mb-5">
                {model.squareFootage} sq. ft.<br />
                {configuration.value.replace(" · ", " | ")}<br />
                {option.storeys}
              </p>
              <p>{option.description}</p>
              <CampaignInquiryLink
                className={styles.textLink}
                model={`${model.name} | ${model.code}`}
              >
                Discuss This Design<span aria-hidden="true">↓</span>
              </CampaignInquiryLink>
              <Link className={styles.secondaryLink} href={`/catalog/${model.slug}`}>
                View Model Details <span aria-hidden="true">↗</span>
              </Link>
            </article>
          );
        })}
      </div>
      <p className={styles.note}>
        Catalogue designs provide a starting point. Property suitability, local
        zoning, site-specific engineering and municipal approvals must be reviewed
        before construction.
        <Link className={styles.secondaryLink} href={cmhcCatalogueTermsHref}>
          CMHC Terms &amp; Conditions <span aria-hidden="true">↗</span>
        </Link>
        <br />
        {cmhcCatalogueSourceNotice(
          options.map((option) => cmhcCatalogueDesignNames[option.slug]),
        )}
      </p>
    </section>
  );
}
