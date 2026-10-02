export type CulturalDesignImage = {
  src: string;
  alt: string;
};

export type HomeExteriorPresentation =
  | "contemporary"
  | "indigenous-inspired";

export type ResolvedHomeExteriorPresentation = {
  image: CulturalDesignImage;
  indigenousInspiredComingSoon: boolean;
};

export const coastalDesignDirectionLabel = "Indigenous Inspiration";

export const indigenousArtworkCostNotice =
  "Indigenous-inspired artwork, carvings, decorative panels, graphics, artist collaboration, fabrication and installation are additional-cost items and are not included in the standard home price. Final artwork, cultural direction, participating artists, scope, pricing and timeline will be developed with the Nation and confirmed separately during project review.";

export const indigenousIllustrativeNotice =
  "Exterior images are illustrative design references only and are not final Nation-specific artwork or approved cultural designs.";

export const coastalInfluenceNotice =
  `${indigenousArtworkCostNotice} ${indigenousIllustrativeNotice}`;

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
    alt: `Illustrative Indigenous-inspired exterior direction for ${homeName}.`,
  };
}

export function getCulturalDesignImage(homeId: string) {
  return culturalDesignImages[homeId];
}

export function getIndigenousInspiredExteriorImage(homeId: string) {
  return culturalDesignImages[homeId];
}

export function getHomeExteriorPresentationFromExpression(
  expression: string | string[] | undefined,
): HomeExteriorPresentation {
  const value = Array.isArray(expression) ? expression[0] : expression;

  return value === "indigenous" ? "indigenous-inspired" : "contemporary";
}

export function getHomeDetailHref(
  homeId: string,
  presentation: HomeExteriorPresentation,
) {
  const pathname = `/homes/${homeId}`;

  return presentation === "indigenous-inspired" &&
    getIndigenousInspiredExteriorImage(homeId)
    ? `${pathname}?expression=indigenous`
    : pathname;
}

export function resolveHomeExteriorPresentation(
  homeId: string,
  homeName: string,
  contemporaryExteriorImage: string,
  presentation: HomeExteriorPresentation,
): ResolvedHomeExteriorPresentation {
  const contemporaryImage = {
    src: contemporaryExteriorImage,
    alt: `${homeName} exterior`,
  };

  if (presentation === "contemporary") {
    return {
      image: contemporaryImage,
      indigenousInspiredComingSoon: false,
    };
  }

  const indigenousInspiredImage =
    getIndigenousInspiredExteriorImage(homeId);

  return indigenousInspiredImage
    ? {
        image: indigenousInspiredImage,
        indigenousInspiredComingSoon: false,
      }
    : {
        image: contemporaryImage,
        indigenousInspiredComingSoon: true,
      };
}
