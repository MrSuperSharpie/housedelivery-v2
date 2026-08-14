export type HomeDesignCollectionTierId = "premium" | "signature";

export type HomeDesignCollectionImage = {
  src: string;
  alt: string;
};

export type HomeDesignCollection = {
  id: string;
  number: string;
  name: string;
  description: string;
  designCues: readonly string[];
  image?: HomeDesignCollectionImage;
};

export type HomeDesignCollectionTier = {
  id: HomeDesignCollectionTierId;
  number: string;
  name: "Premium" | "Signature";
  description: string;
  collections: readonly HomeDesignCollection[];
};

export type HomeDesignCollectionsExperience = {
  homeSlug: string;
  homeName: string;
  introduction: string;
  tiers: readonly HomeDesignCollectionTier[];
};

const solaceDesignCollections: HomeDesignCollectionsExperience = {
  homeSlug: "solace",
  homeName: "Solace",
  introduction:
    "Solace is offered through two levels of finish — Premium and Signature. Each begins with a coordinated whole-home design direction, bringing cabinetry, flooring, stone, bathrooms, fixtures, doors and other inclusions together as one considered interior.",
  tiers: [
    {
      id: "premium",
      number: "01",
      name: "Premium",
      description:
        "Three refined, coordinated design directions with elevated materials and a controlled contemporary character.",
      collections: [
        {
          id: "premium-coastal-light",
          number: "01",
          name: "Coastal Light",
          description:
            "A bright, composed interior built around pale natural woods, warm whites and softly textured stone.",
          image: {
            src: "/images/solace/design-collections/premium-coastal-light.png",
            alt: "Bright coastal kitchen and living interior with pale oak cabinetry and warm white stone",
          },
          designCues: [
            "Pale oak",
            "Warm white",
            "Soft ivory stone",
            "Light greige surfaces",
            "Restrained matte-black accents",
            "Bright natural light",
            "Quiet West Coast character",
          ],
        },
        {
          id: "premium-warm-natural",
          number: "02",
          name: "Warm Natural",
          description:
            "A warmer interpretation of contemporary West Coast living with natural wood, creamy stone and quieter tonal depth.",
          image: {
            src: "/images/solace/design-collections/premium-warm-natural.png",
            alt: "Warm coastal kitchen and living interior with natural oak and creamy stone",
          },
          designCues: [
            "Natural oak",
            "Soft walnut tones",
            "Creamy taupe",
            "Warm off-white stone",
            "Soft greige surfaces",
            "Deep bronze / satin-black accents",
            "Grounded Pacific Northwest warmth",
          ],
        },
        {
          id: "premium-pacific-contrast",
          number: "03",
          name: "Pacific Contrast",
          description:
            "A stronger architectural palette balancing darker natural woods with stone, charcoal and disciplined contrast.",
          image: {
            src: "/images/solace/design-collections/premium-pacific-contrast.png",
            alt: "Sunset coastal kitchen and living interior with deep wood cabinetry and charcoal accents",
          },
          designCues: [
            "Smoked or deeper oak",
            "Warm charcoal",
            "Taupe cabinetry",
            "Crisp light stone",
            "Medium greige surfaces",
            "Blackened metal accents",
            "Controlled architectural contrast",
          ],
        },
      ],
    },
    {
      id: "signature",
      number: "02",
      name: "Signature",
      description:
        "Three more architectural design directions with greater material expression, detailing and integration.",
      collections: [
        {
          id: "signature-refined-west-coast",
          number: "01",
          name: "Refined West Coast",
          description:
            "A highly resolved West Coast interior where pale oak, creamy stone and tailored detailing create understated sophistication.",
          image: {
            src: "/images/solace/design-collections/signature-refined-west-coast.png",
            alt: "Refined coastal kitchen and living interior with pale oak and tailored stone detailing",
          },
          designCues: [
            "Rift-cut pale oak",
            "Creamy limestone character",
            "Tailored cabinetry",
            "Soft putty neutrals",
            "Integrated lighting",
            "Brushed bronze",
            "Quiet luxury",
          ],
        },
        {
          id: "signature-sculpted-natural-luxury",
          number: "02",
          name: "Sculpted Natural Luxury",
          description:
            "A richer material experience combining walnut, sculpted stone and carefully controlled architectural detailing.",
          image: {
            src: "/images/solace/design-collections/signature-sculpted-natural-luxury.png",
            alt: "Open-plan coastal kitchen with rich walnut cabinetry and a sculpted stone island",
          },
          designCues: [
            "Rich walnut",
            "Expressive natural stone",
            "Selective fluted / ribbed detailing",
            "Spa-like slab surfaces",
            "Warm brushed bronze",
            "Tactile natural materials",
          ],
        },
        {
          id: "signature-architectural-calm",
          number: "03",
          name: "Architectural Calm",
          description:
            "The most restrained Solace expression — quiet, architectural and deliberately minimal.",
          image: {
            src: "/images/solace/design-collections/signature-architectural-calm.png",
            alt: "Minimal coastal kitchen and living interior with pale oak and uninterrupted stone surfaces",
          },
          designCues: [
            "Pale oak",
            "Soft putty cabinetry",
            "Monolithic stone",
            "Minimal hardware",
            "Shadow-line detailing",
            "Large uninterrupted surfaces",
            "Gallery-like restraint",
          ],
        },
      ],
    },
  ],
};

const homeDesignCollectionsBySlug: Readonly<
  Record<string, HomeDesignCollectionsExperience>
> = {
  solace: solaceDesignCollections,
};

export function getHomeDesignCollections(
  homeSlug: string,
): HomeDesignCollectionsExperience | undefined {
  return homeDesignCollectionsBySlug[homeSlug];
}
