import { getHomeConfiguratorRegistration } from "@/data/home-configurator-registry";

export {
  getHomeConfiguratorRegistration,
  getHomeConfiguratorRegistrationByRoute,
  getHomeConfiguratorRegistrationsByFamily,
  homeConfiguratorRegistrations,
} from "@/data/home-configurator-registry";

export function getHomeConfiguratorDefinition(homeSlug: string) {
  return getHomeConfiguratorRegistration("custom-home", homeSlug)?.definition;
}
