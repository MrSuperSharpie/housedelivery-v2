import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SavedLookBook } from "@/components/saved-lookbook";
import { SiteHeader } from "@/components/site-header";
import { getHomeConfiguratorRegistration } from "@/data/home-configurators";
import { parseConfigurationId } from "@/lib/lookbook/domain";
import { getLookBookRepository } from "@/lib/lookbook/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved Look Book",
  description: "Return to a saved House Delivery home configuration.",
  robots: { index: false, follow: false },
};

export default async function SavedLookBookPage({
  params,
}: {
  params: Promise<{ configurationId: string }>;
}) {
  const { configurationId: rawConfigurationId } = await params;
  const configurationId = parseConfigurationId(rawConfigurationId);
  if (!configurationId) notFound();

  let record;
  try {
    record = await getLookBookRepository().findById(configurationId);
  } catch {
    // Do not expose storage details or distinguish unavailable records from
    // unknown bearer URLs.
    notFound();
  }
  if (!record) notFound();

  const registration = getHomeConfiguratorRegistration(
    record.homeFamily,
    record.homeSlug,
  );
  const definition = registration?.definition;
  if (
    !definition ||
    definition.configurationVersion !== record.configuratorVersion ||
    record.configuration.homeId !== definition.homeId
  ) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="bg-[#0b0c10] text-white">
        <div id="home-configurator">
          <SavedLookBook
            definition={definition}
            configuration={record.configuration}
            configurationId={record.id}
          />
        </div>
      </main>
    </>
  );
}
