import type { Metadata } from "next";
import { CampaignConfirmation } from "@/components/campaign-confirmation";
import styles from "../campaign.module.css";
export const metadata: Metadata = { title: "Your Project Inquiry | House Delivery", robots: { index: false, follow: false } };
export default function ThankYouPage() { return <div className={styles.page}><CampaignConfirmation /></div>; }
