export type CulturalDesignImage = {
  src: string;
  alt: string;
};

const culturalDesignImages: Readonly<Record<string, CulturalDesignImage>> = {
  aurora: createCulturalDesignImage("Aurora"),
  boreal: createCulturalDesignImage("Boreal"),
  canmore: createCulturalDesignImage("Canmore"),
  cascade: createCulturalDesignImage("Cascade"),
  cedarview: createCulturalDesignImage("Cedarview"),
  langley: createCulturalDesignImage("Langley"),
  laurentian: createCulturalDesignImage("Laurentian"),
  maplewood: createCulturalDesignImage("Maplewood"),
  meridian: createCulturalDesignImage("Meridian"),
  solace: createCulturalDesignImage("Solace"),
  solstice: createCulturalDesignImage("Solstice"),
  "south-bay": createCulturalDesignImage("Southbay"),
  summit: createCulturalDesignImage("Summit"),
  timberline: createCulturalDesignImage("Timberline"),
};

function createCulturalDesignImage(homeName: string): CulturalDesignImage {
  return {
    src: `/images/first-nations-inspired/design-center/${homeName}-Coastal.png`,
    alt: `Illustrative Coastal exterior inspiration for ${homeName}.`,
  };
}

export function getCulturalDesignImage(homeId: string) {
  return culturalDesignImages[homeId];
}
