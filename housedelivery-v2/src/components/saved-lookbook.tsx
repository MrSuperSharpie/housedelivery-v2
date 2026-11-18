"use client";

import { HomeLookBook } from "@/components/home-look-book";
import type { PersonalizedLookBookBrief } from "@/data/personalized-lookbook";
import { getSavedLookBookDefinition } from "@/data/saved-lookbook-definition";
import type {
  HomeConfiguration,
  HomeConfiguratorDefinition,
} from "@/data/home-configurator";

export function SavedLookBook({
  definition,
  configuration,
  configurationId,
  printMode = false,
  personalizedBrief,
}: {
  definition: HomeConfiguratorDefinition;
  configuration: HomeConfiguration;
  configurationId?: string;
  printMode?: boolean;
  personalizedBrief?: PersonalizedLookBookBrief;
}) {
  return (
    <HomeLookBook
      definition={getSavedLookBookDefinition(definition, configuration)}
      configuration={configuration}
      onCreateLookBook={() => undefined}
      onEditCategory={() => undefined}
      onPreviewOption={() => undefined}
      onSubmit={() => undefined}
      readOnly
      savedConfigurationId={configurationId}
      savedHasContact
      savedView={Boolean(configurationId)}
      personalizedBrief={personalizedBrief}
      directSourceImages
      printMode={printMode}
    />
  );
}
