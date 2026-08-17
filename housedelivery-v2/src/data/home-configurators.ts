import type { HomeConfiguratorDefinition } from "@/data/home-configurator";
import { customHomeConfigurators } from "@/data/custom-home-configurators";
import { solaceHomeConfigurator } from "@/data/solace-home-configurator";

const homeConfigurators: Readonly<Record<string, HomeConfiguratorDefinition>> = {
  ...customHomeConfigurators,
  solace: solaceHomeConfigurator,
};

export function getHomeConfiguratorDefinition(homeSlug: string) {
  return homeConfigurators[homeSlug];
}
