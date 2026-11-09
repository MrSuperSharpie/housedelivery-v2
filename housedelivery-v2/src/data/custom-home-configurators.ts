import type {
  HomeConfiguratorDefinition,
  HomeInclusionCategory,
  HomeInclusionOption,
} from "@/data/home-configurator";
import type { LookBookSection } from "@/data/home-look-book";
import { models, type HomeModel } from "@/data/models";
import { legacyCustomHomeConfiguratorTemplate } from "@/data/solace-home-configurator";

type CustomHomeActivationPacket = {
  slug: Exclude<HomeModel["slug"], "solace">;
  designLanguage: string;
};

const activationPackets = [
  {
    slug: "langley",
    designLanguage:
      "country estate — luminous stone, warm oak, tailored neutrals and composed scale",
  },
  {
    slug: "timberline",
    designLanguage:
      "alpine modern — warm timber, honed stone, graphite metal and wool textures",
  },
  {
    slug: "profile",
    designLanguage:
      "sculptural urban villa — limestone, dark oak, glass and disciplined monochrome",
  },
  {
    slug: "laurentian",
    designLanguage:
      "light luxury — pale oak, quiet limestone, warm white and brushed champagne metal",
  },
  {
    slug: "dalton",
    designLanguage:
      "warm family villa — durable oak, tactile stone and soft performance textiles",
  },
  {
    slug: "south-bay",
    designLanguage:
      "coastal contemporary — washed oak, soft limestone, mineral grey-blue and relaxed tailoring",
  },
  {
    slug: "boreal",
    designLanguage:
      "northern modern — robust oak, graphite steel, mineral stone, wool and warm light",
  },
  {
    slug: "canmore",
    designLanguage:
      "mountain modern — timber, slate, bronze and textured neutral fabrics",
  },
  {
    slug: "saturna",
    designLanguage:
      "streamlined island modern — light oak, charcoal, salt-grey stone and restrained bronze",
  },
  {
    slug: "cascade",
    designLanguage:
      "airy contemporary — pale timber, clear glass, soft stone and warm white",
  },
  {
    slug: "maplewood",
    designLanguage:
      "urban light — pale oak, warm white, graphite accents and space-efficient built-ins",
  },
  {
    slug: "cedarview",
    designLanguage:
      "West Coast modern — cedar tones, basalt-grey stone, wool and clear glazing",
  },
  {
    slug: "summit",
    designLanguage:
      "compact luxury — tailored neutrals, dark timber, light quartz and precise black accents",
  },
  {
    slug: "aurora",
    designLanguage:
      "light-filled villa — pale oak, warm white, soft grey and minimal dark accents",
  },
] as const satisfies readonly CustomHomeActivationPacket[];

function getCustomerHomeName(model: HomeModel) {
  return model.name.replace(/^The\s+/, "");
}

function getResidenceLabel(model: HomeModel) {
  return model.name.startsWith("The ") ? model.name : `${model.name} House`;
}

function replaceSolaceReference(value: string, homeName: string) {
  return value.replaceAll("Solace", homeName);
}

function personalizeOption(
  option: HomeInclusionOption,
  homeName: string,
): HomeInclusionOption {
  return {
    ...option,
    description: option.description
      ? replaceSolaceReference(option.description, homeName)
      : undefined,
    image: {
      ...option.image,
      alt: replaceSolaceReference(option.image.alt, homeName),
    },
  };
}

function personalizeCategory(
  category: HomeInclusionCategory,
  homeName: string,
): HomeInclusionCategory {
  if (category.kind === "standard" || category.kind === "room-look") {
    return {
      ...category,
      description: replaceSolaceReference(category.description, homeName),
      options: category.options.map((option) =>
        personalizeOption(option, homeName),
      ),
    };
  }

  if (category.kind === "flooring") {
    return {
      ...category,
      description: replaceSolaceReference(category.description, homeName),
      zones: category.zones.map((zone) => ({
        ...zone,
        description: replaceSolaceReference(zone.description, homeName),
        options: zone.options.map((option) =>
          personalizeOption(option, homeName),
        ),
      })),
    };
  }

  return {
    ...category,
    description: replaceSolaceReference(category.description, homeName),
  };
}

function personalizeLookBookSection(
  section: LookBookSection,
  homeName: string,
  designLanguage: string,
): LookBookSection {
  if (section.id === "design-story") {
    return {
      ...section,
      title: `The ${homeName} You Created`,
      introduction: `A personal design language shaped around ${designLanguage}, assembled from the materials, light and architectural details you selected.`,
    };
  }

  return {
    ...section,
    title: replaceSolaceReference(section.title, homeName),
    introduction: replaceSolaceReference(section.introduction, homeName),
  };
}

function createCustomHomeConfigurator(
  model: HomeModel,
  packet: CustomHomeActivationPacket,
): HomeConfiguratorDefinition {
  const homeName = getCustomerHomeName(model);
  const residenceLabel = getResidenceLabel(model);
  const introductionImage =
    model.images.find(
      (image) => image !== model.heroImage && image !== model.floorPlanImage,
    ) ?? model.heroImage;

  return {
    configurationVersion: legacyCustomHomeConfiguratorTemplate.configurationVersion,
    homeId: model.slug,
    homeName,
    residenceLabel,
    architecturalImages: [
      {
        src: model.heroImage,
        alt: `${residenceLabel} exterior architecture.`,
      },
      {
        src: introductionImage,
        alt: `${residenceLabel} architectural study.`,
      },
    ],
    disclaimer: legacyCustomHomeConfiguratorTemplate.disclaimer,
    categories: legacyCustomHomeConfiguratorTemplate.categories.map((category) =>
      personalizeCategory(category, homeName),
    ),
    lookBook: {
      ...legacyCustomHomeConfiguratorTemplate.lookBook,
      home: {
        id: model.slug,
        name: homeName,
        residenceLabel,
        areaLabel: `${model.squareFeet.toLocaleString()} sq. ft.`,
        description: `${model.description} The design language is ${packet.designLanguage}.`,
        heroImage: {
          src: model.heroImage,
          alt: `${residenceLabel} exterior architecture.`,
        },
        introductionImage: {
          src: introductionImage,
          alt: `${residenceLabel} architectural study.`,
        },
        metadata: [
          {
            label: "Area",
            value: `${model.squareFeet.toLocaleString()} sq. ft.`,
          },
          { label: "Storeys", value: String(model.storeys) },
          { label: "Bedrooms", value: String(model.bedrooms) },
          {
            label: "Bathrooms",
            value:
              model.bathrooms === null
                ? "Plan-specific"
                : String(model.bathrooms),
          },
        ],
      },
      sections: legacyCustomHomeConfiguratorTemplate.lookBook.sections.map((section) =>
        personalizeLookBookSection(
          section,
          homeName,
          packet.designLanguage,
        ),
      ),
    },
  };
}

export const customHomeConfigurators = Object.fromEntries(
  activationPackets.map((packet) => {
    const model = models.find((candidate) => candidate.slug === packet.slug);

    if (!model) {
      throw new Error(`Custom Home activation data is unavailable: ${packet.slug}`);
    }

    return [model.slug, createCustomHomeConfigurator(model, packet)];
  }),
) as Readonly<Record<string, HomeConfiguratorDefinition>>;
