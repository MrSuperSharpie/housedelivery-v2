import { CampaignLanding } from "@/components/campaign-landing";
import { campaignMetadata } from "@/lib/campaign-metadata";
export const metadata = campaignMetadata("custom-homes");
export default function CustomHomesPage() { return <CampaignLanding campaign="custom-homes" />; }
