import type { HomeConfiguratorDefinition } from "@/data/home-configurator";
import { customHomeConfigurators } from "@/data/custom-home-configurators";
import { saturnaHomeConfigurator } from "@/data/saturna-home-configurator";
import { solaceHomeConfigurator } from "@/data/solace-home-configurator";

const homeConfigurators: Readonly<Record<string, HomeConfiguratorDefinition>> = {
  ...customHomeConfigurators,
  saturna: saturnaHomeConfigurator,
  solace: solaceHomeConfigurator,
};

export function getHomeConfiguratorDefinition(homeSlug: string) {
  return homeConfigurators[homeSlug];
}
