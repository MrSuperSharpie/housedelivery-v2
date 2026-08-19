import { carriageHomes } from "@/data/carriage-homes";
import { catalogModels } from "@/data/catalog";
import { customHomeConfigurators } from "@/data/custom-home-configurators";
import {
  getRequiredCategories,
  type HomeConfiguratorDefinition,
} from "@/data/home-configurator";
import type {
  HomeConfiguratorRegistration,
  HomeProductFamily,
} from "@/data/home-configurator-architecture";
import { models } from "@/data/models";
import { saturnaHomeConfigurator } from "@/data/saturna-home-configurator";
import { solaceHomeConfigurator } from "@/data/solace-home-configurator";

function registrationKey(productFamily: HomeProductFamily, homeId: string) {
  return `${productFamily}:${homeId}`;
}

const customHomeDefinitions: Readonly<
  Record<string, HomeConfiguratorDefinition>
> = {
  ...customHomeConfigurators,
  saturna: saturnaHomeConfigurator,
  solace: solaceHomeConfigurator,
};

const customHomeRegistrations: readonly HomeConfiguratorRegistration[] =
  models.map((model) => {
    const definition = customHomeDefinitions[model.slug];

    if (!definition) {
      throw new Error(
        `Current Custom Home configurator is unavailable: ${model.slug}`,
      );
    }

    return {
      key: registrationKey("custom-home", model.slug),
      homeId: model.slug,
      homeName: definition.homeName,
      route: `/homes/${model.slug}`,
      productFamily: "custom-home",
      migrationStatus:
        model.slug === "saturna" || model.slug === "solace"
          ? "canonical"
          : "legacy-active",
      activeChapterIds: getRequiredCategories(definition).map(
        (category) => category.id,
      ),
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
