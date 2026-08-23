export const culturalDesignAreas = [
  { id: "entry-arrival", label: "Entry / arrival" },
  {
    id: "exterior-accents-materials",
    label: "Exterior accents and materials",
  },
  { id: "gathering-spaces", label: "Gathering spaces" },
  { id: "interior-feature-elements", label: "Interior feature elements" },
  {
    id: "carving-artwork-opportunities",
    label: "Carving / artwork opportunities",
  },
  {
    id: "landscape-connection-place",
    label: "Landscape / connection to place",
  },
  {
    id: "local-artist-artisan-collaboration",
    label: "Local artist / artisan collaboration",
  },
] as const;

export type CulturalDesignAreaId = (typeof culturalDesignAreas)[number]["id"];

export type CulturalDesignDirection = {
  choice: "explore" | "contemporary";
  areas: readonly CulturalDesignAreaId[];
};

type CulturalDesignImage = {
  src: string;
  alt: string;
};

const culturalDesignImages: Readonly<Record<string, CulturalDesignImage>> = {
  aurora: createCulturalDesignImage("Aurora"),
  boreal: createCulturalDesignImage("Boreal"),
  canmore: createCulturalDesignImage("Canmore"),
  cascade: createCulturalDesignImage("Cascade"),
  cedarview: createCulturalDesignImage("Cedarview"),
  dalton: createCulturalDesignImage("Dalton"),
  langley: createCulturalDesignImage("Langley"),
  laurentian: createCulturalDesignImage("Laurentian"),
  maplewood: createCulturalDesignImage("Maplewood"),
  meridian: createCulturalDesignImage("Meridian"),
  solace: createCulturalDesignImage("Solace"),
  solstice: createCulturalDesignImage("Solstice"),
  southbay: createCulturalDesignImage("Southbay"),
  summit: createCulturalDesignImage("Summit"),
  timberline: createCulturalDesignImage("Timberline"),
};

function createCulturalDesignImage(homeName: string): CulturalDesignImage {
  return {
    src: `/images/first-nations-inspired/design-center/${homeName}-Coastal.png`,
    alt: `Illustrative cultural and place-based design inspiration for ${homeName}.`,
  };
}

export function getCulturalDesignImage(homeId: string) {
  return culturalDesignImages[homeId];
}

export function getCulturalDesignAreaLabel(areaId: CulturalDesignAreaId) {
  return culturalDesignAreas.find((area) => area.id === areaId)?.label;
}

export function isCulturalDesignAreaId(
  value: string,
): value is CulturalDesignAreaId {
  return culturalDesignAreas.some((area) => area.id === value);
}
