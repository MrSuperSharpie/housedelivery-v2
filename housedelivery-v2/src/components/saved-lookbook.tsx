"use client";

import { HomeLookBook } from "@/components/home-look-book";
import type {
  HomeConfiguration,
  HomeConfiguratorDefinition,
} from "@/data/home-configurator";

export function SavedLookBook({
  definition,
  configuration,
  configurationId,
}: {
  definition: HomeConfiguratorDefinition;
  configuration: HomeConfiguration;
  configurationId: string;
}) {
  return (
    <HomeLookBook
      definition={definition}
      configuration={configuration}
      onCreateLookBook={() => undefined}
      onEditCategory={() => undefined}
      onPreviewOption={() => undefined}
      onSubmit={() => undefined}
      readOnly
      savedConfigurationId={configurationId}
      savedHasContact
      savedView
    />
  );
}
