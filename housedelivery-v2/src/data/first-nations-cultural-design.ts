export type CulturalDesignImage = {
  src: string;
  alt: string;
};

export const coastalDesignDirectionLabel =
  "Contemporary + Indigenous Inspiration";

export const coastalInfluenceNotice =
  "Cultural and place-based influence and artistry are identified for project review. Final scope, artist collaboration, product integration, additional cost and timeline are to be confirmed separately.";

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
    alt: `Illustrative Indigenous exterior inspiration for ${homeName}.`,
  };
}

export function getCulturalDesignImage(homeId: string) {
  return culturalDesignImages[homeId];
}
