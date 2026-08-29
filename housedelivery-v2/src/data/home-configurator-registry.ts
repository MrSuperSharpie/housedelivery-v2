import { carriageHomes } from "@/data/carriage-homes";
import { catalogModels } from "@/data/catalog";
import { daltonHomeConfigurator } from "@/data/dalton-home-configurator";
import {
  getRequiredCategories,
  type HomeConfiguratorDefinition,
} from "@/data/home-configurator";
import type {
  HomeConfiguratorRegistration,
  HomeProductFamily,
} from "@/data/home-configurator-architecture";
import { laurentianHomeConfigurator } from "@/data/laurentian-home-configurator";
import { maplewoodHomeConfigurator } from "@/data/maplewood-home-configurator";
import { models } from "@/data/models";
import { profileHomeConfigurator } from "@/data/profile-home-configurator";
import { saturnaHomeConfigurator } from "@/data/saturna-home-configurator";
import { solaceHomeConfigurator } from "@/data/solace-home-configurator";
import { southBayHomeConfigurator } from "@/data/south-bay-home-configurator";
import { timberlineHomeConfigurator } from "@/data/timberline-home-configurator";

function registrationKey(productFamily: HomeProductFamily, homeId: string) {
  return `${productFamily}:${homeId}`;
}

const customHomeDefinitions: Readonly<
  Record<string, HomeConfiguratorDefinition>
> = {
  dalton: daltonHomeConfigurator,
  laurentian: laurentianHomeConfigurator,
  maplewood: maplewoodHomeConfigurator,
  profile: profileHomeConfigurator,
  saturna: saturnaHomeConfigurator,
  solace: solaceHomeConfigurator,
  "south-bay": southBayHomeConfigurator,
  timberline: timberlineHomeConfigurator,
};

const customHomeRegistrations: readonly HomeConfiguratorRegistration[] =
  models.map((model) => {
    const definition = customHomeDefinitions[model.slug];

    return {
      key: registrationKey("custom-home", model.slug),
      homeId: model.slug,
      homeName: definition?.homeName ?? model.name.replace(/^The\s+/, ""),
      route: `/homes/${model.slug}`,
      productFamily: "custom-home",
      migrationStatus: definition ? "canonical" : "awaiting-approved-content",
      activeChapterIds: definition
        ? getRequiredCategories(definition).map((category) => category.id)
        : [],
      definition,
    };
  });

const carriageHomeRegistrations: readonly HomeConfiguratorRegistration[] =
  carriageHomes.map((home) => ({
    key: registrationKey("laneway-carriage-home", home.slug),
    homeId: home.slug,
    homeName: home.name,
    route: `/homes/laneway-carriage/${home.slug}`,
    productFamily: "laneway-carriage-home",
    migrationStatus: "awaiting-approved-content",
    activeChapterIds: [],
  }));

const preApprovedHomeRegistrations: readonly HomeConfiguratorRegistration[] =
  catalogModels.map((home) => ({
    key: registrationKey("pre-approved-home", home.slug),
    homeId: home.slug,
    homeName: home.name,
    route: `/catalog/${home.slug}`,
    productFamily: "pre-approved-home",
    migrationStatus: "awaiting-approved-content",
    activeChapterIds: [],
  }));

export const homeConfiguratorRegistrations = [
  ...customHomeRegistrations,
  ...carriageHomeRegistrations,
  ...preApprovedHomeRegistrations,
] as const satisfies readonly HomeConfiguratorRegistration[];

const registrationsByKey = Object.fromEntries(
  homeConfiguratorRegistrations.map((registration) => [
    registration.key,
    registration,
  ]),
) as Readonly<Record<string, HomeConfiguratorRegistration>>;

export function getHomeConfiguratorRegistration(
  productFamily: HomeProductFamily,
  homeId: string,
) {
  return registrationsByKey[registrationKey(productFamily, homeId)];
}

export function getHomeConfiguratorRegistrationByRoute(route: string) {
  return homeConfiguratorRegistrations.find(
    (registration) => registration.route === route,
  );
}

export function getHomeConfiguratorRegistrationsByFamily(
  productFamily: HomeProductFamily,
) {
  return homeConfiguratorRegistrations.filter(
    (registration) => registration.productFamily === productFamily,
  );
}
