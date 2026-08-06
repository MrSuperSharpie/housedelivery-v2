import type { Metadata } from "next";

import { InclusionsLibrary } from "@/components/inclusions-library";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "House Delivery Inclusions Library",
  description:
    "Explore House Delivery’s preliminary Essential, Premium and Signature inclusion packages, beginning with a controlled flooring selection.",
  openGraph: {
    title: "House Delivery Inclusions Library",
    description:
      "Explore House Delivery’s preliminary Essential, Premium and Signature inclusion packages, beginning with a controlled flooring selection.",
    type: "website",
  },
};

export default function InclusionsPage() {
  return (
    <>
      <SiteHeader />
      <InclusionsLibrary />
    </>
  );
}
