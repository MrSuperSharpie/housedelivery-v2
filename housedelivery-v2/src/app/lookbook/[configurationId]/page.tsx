import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlannerLocalLookBookFallback } from "@/components/planner-local-lookbook-fallback";
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

function localPlannerFallback(
  configurationId: string,
  storageReadFailed = false,
) {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#0b0c10] text-white">
        <PlannerLocalLookBookFallback
          configurationId={configurationId}
          storageReadFailed={storageReadFailed}
        />
      </main>
    </>
  );
}

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
    return localPlannerFallback(configurationId, true);
  }
  if (!record) return localPlannerFallback(configurationId);

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
        <SavedLookBook
          definition={definition}
          configuration={record.configuration}
          configurationId={record.id}
        />
      </main>
    </>
  );
}
