"use client";
import { usePathname } from "next/navigation";
import { isCampaignPath } from "@/lib/campaign-lead";
export function CampaignFooterBoundary({ children }: { children: React.ReactNode }) {
  return isCampaignPath(usePathname()) ? null : children;
}
