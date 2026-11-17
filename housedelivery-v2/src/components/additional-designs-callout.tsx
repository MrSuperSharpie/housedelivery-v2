import Link from "next/link";

import { CampaignInquiryLink } from "@/components/campaign-inquiry-link";
import styles from "./additional-designs-callout.module.css";

export function AdditionalDesignsCallout({ landing = false }: { landing?: boolean }) {
  const Heading = landing ? "h3" : "h2";
  const invitation = <>Explore More Designs <span aria-hidden="true">↗</span></>;

  return (
    <aside
      aria-labelledby="additional-designs-heading"
      data-additional-designs
      className={landing ? styles.landing : styles.homepage}
    >
      <div className={styles.row}>
        <div className={styles.copy}>
          <Heading id="additional-designs-heading" className={styles.heading}>
            Not seeing your home?
          </Heading>
          <p className={styles.description}>
            This collection is only the beginning. We have hundreds of additional designs available, and your own plans are welcome.
          </p>
        </div>
        {landing ? (
          <CampaignInquiryLink className={styles.action}>{invitation}</CampaignInquiryLink>
        ) : (
          <Link className={styles.action} href="/build-your-home/custom-homes#project-inquiry">
            {invitation}
          </Link>
        )}
      </div>
    </aside>
  );
}
