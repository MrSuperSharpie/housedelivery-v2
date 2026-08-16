import type { HomeConfiguratorDefinition } from "@/data/home-configurator";
import { solaceHomeConfigurator } from "@/data/solace-home-configurator";

const homeConfigurators: Readonly<Record<string, HomeConfiguratorDefinition>> = {
  solace: solaceHomeConfigurator,
};

export function getHomeConfiguratorDefinition(homeSlug: string) {
  return homeConfigurators[homeSlug];
}
