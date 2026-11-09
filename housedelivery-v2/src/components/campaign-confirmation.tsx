"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { readCampaignReceipts } from "@/lib/campaign-browser";
import { campaignPaths } from "@/lib/campaign-lead";
import styles from "@/app/build-your-home/campaign.module.css";
const subscribe = () => () => {};
export function CampaignConfirmation() {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const receipt = ready ? readCampaignReceipts().at(-1) : undefined;
  return <main className={styles.thanks}><p className={styles.kicker}>House Delivery / Your next step</p><h1>{receipt ? "Thank you for sharing your plans." : "Every great home starts with a conversation."}</h1><p>{receipt ? "Your inquiry has been sent to our sales team. We’ll review your property, priorities and timing, then contact you personally to explore the next step." : "Use one of our project forms to tell us what you’re planning. A submission is confirmed here only after it has been accepted by our inquiry service."}</p>{receipt ? <p className={styles.reference}>Your inquiry reference: {receipt.reference}</p> : null}<p>Questions in the meantime? <a href="mailto:sales@housedelivery.ca">sales@housedelivery.ca</a></p><Link className={`${styles.button} ${styles.lightButton}`} href={receipt ? campaignPaths[receipt.campaign] : "/build-your-home"}>{receipt ? "Return to your project page" : "Explore House Delivery"}<span aria-hidden="true">↗</span></Link><Link className={styles.textLink} href="/privacy">Privacy &amp; Cookies</Link></main>;
}
