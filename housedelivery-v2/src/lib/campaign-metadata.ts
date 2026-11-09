import type { Metadata } from "next";
import { campaignPaths, type Campaign } from "@/lib/campaign-lead";
export function campaignMetadata(campaign: Campaign): Metadata {
  const laneway = campaign === "laneway-carriage-homes";
  const title = laneway ? "Laneway & Carriage Homes in BC | Free Preliminary Property Review" : "Custom Homes in British Columbia | Exceptional Design. Lasting Value.";
  const description = laneway ? "Explore laneway and carriage home models with House Delivery. Request a free preliminary review of your BC property and discuss supply and construction scope." : "Explore design-led custom home packages, steel or timber systems, and coordinated manufacturing with Canadian construction. Start a conversation with House Delivery.";
  return { title: { absolute: `${title} | House Delivery` }, description, alternates: { canonical: `https://www.housedelivery.ca${campaignPaths[campaign]}` }, robots: { index: process.env.VERCEL_ENV === "production", follow: process.env.VERCEL_ENV === "production" }, openGraph: { title, description, type: "website", locale: "en_CA", images: [laneway ? "/images/carriage-homes/The-Willow-Nook-1.jpg" : "/cedar-view-1a.png"] } };
}
