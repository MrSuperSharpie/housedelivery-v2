export type PackageTier = "essential" | "premium" | "signature";

export type SelectionStatus = "Preliminary Selection" | "Technical Review";

export type InclusionCategoryId =
  | "flooring"
  | "kitchen-cabinetry"
  | "wardrobes"
  | "interior-doors"
  | "exterior-doors"
  | "windows-patio-doors"
  | "kitchen-bath-fixtures"
  | "bathroom-vanities"
  | "tile-surfaces"
  | "countertops"
  | "wall-panels"
  | "lighting"
  | "appliances"
  | "window-coverings"
  | "garage-doors-operators";

export type InclusionCategoryName =
  | "Flooring"
  | "Kitchen Cabinetry"
  | "Wardrobes"
  | "Interior Doors"
  | "Exterior Entry Doors"
  | "Windows & Patio Doors"
  | "Kitchen & Bath Fixtures"
  | "Bathroom Vanities"
  | "Tile & Surfaces"
  | "Countertops"
  | "Interior Wall Panels"
  | "Lighting"
  | "Appliances"
  | "Roller Blinds / Window Coverings"
  | "Garage Doors & Operators";

export type InclusionImage = {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
};

export type InclusionProductChoice = {
  name: string;
  customerDescription: string;
  image: InclusionImage;
};

export type InclusionPackage = {
  id: PackageTier;
  number: string;
  name: "Essential" | "Premium" | "Signature";
  positioning: string;
  description: string;
};

export type InclusionProduct = {
  sku: `HD-${string}`;
  name: string;
  packageTier: PackageTier;
  category: InclusionCategoryName;
  customerDescription: string;
  specificationsHeading?: string;
  specifications: readonly string[];
  selectionStatus: SelectionStatus;
  sampleRequired: boolean;
  technicalReviewRequired: boolean;
  projectSpecificApprovalRequired: boolean;
  availability: string;
  image?: InclusionImage;
  gallery?: readonly InclusionImage[];
  choices?: readonly InclusionProductChoice[];
};

export type InclusionCategory = {
  id: InclusionCategoryId;
  number: string;
  name: InclusionCategoryName;
  shortName: string;
  eyebrow: string;
  description: string;
  packageContext?: string;
  legacyIds?: readonly string[];
  heroImage?: InclusionImage;
  products: readonly InclusionProduct[];
};

export const inclusionPackages: readonly InclusionPackage[] = [
  {
    id: "essential",
    number: "01",
    name: "Essential",
    positioning: "Coordinated baseline",
    description:
      "A durable, coordinated baseline designed for repeatability, responsible purchasing and straightforward project delivery.",
  },
  {
    id: "premium",
    number: "02",
    name: "Premium",
    positioning: "Controlled refinement",
    description:
      "Controlled upgrades in material, finish and detailing for projects seeking greater design refinement.",
  },
  {
    id: "signature",
    number: "03",
    name: "Signature",
    positioning: "Selective distinction",
    description:
      "Selective higher-touch materials and feature finishes for projects where distinction is an intentional priority.",
  },
];

const preliminarySelection: SelectionStatus = "Preliminary Selection";
const projectAvailability =
  "Final availability is subject to project confirmation.";
const preliminaryCharacteristics = "Preliminary characteristics";

type PreliminaryProductInput = Omit<
  InclusionProduct,
  | "specificationsHeading"
  | "selectionStatus"
  | "sampleRequired"
  | "technicalReviewRequired"
  | "projectSpecificApprovalRequired"
  | "availability"
>;

function preliminaryProduct(
  product: PreliminaryProductInput,
): InclusionProduct {
  return {
    ...product,
    specificationsHeading: preliminaryCharacteristics,
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
  };
}

export const inclusionProducts: readonly InclusionProduct[] = [
  {
    sku: "HD-FLR-001",
    name: "Light Natural Flooring",
    packageTier: "essential",
    category: "Flooring",
    customerDescription:
      "A light, natural flooring direction selected to keep interiors bright, warm and easy to coordinate across open-plan spaces. Its restrained tone creates a versatile foundation for cabinetry, stone and other interior finishes.",
    specificationsHeading: "Preliminary characteristics",
    specifications: [
      "Light natural wood appearance",
      "Straight-plank visual direction",
      "Warm neutral palette",
      "Designed for broad interior coordination",
      "Final construction and thickness to be confirmed",
    ],
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
    gallery: [
      {
        src: "/images/inclusions/flooring/products/hd-flr-001-01.webp",
        alt: "Warm wood-look plank flooring in an open-plan living room and kitchen.",
      },
      {
        src: "/images/inclusions/flooring/products/hd-flr-001-02.webp",
        alt: "Pale wood-look plank flooring in a bright living room with a home workspace.",
      },
      {
        src: "/images/inclusions/flooring/products/hd-flr-001-03.webp",
        alt: "Natural wood-look plank flooring across a bedroom and adjoining sitting area.",
      },
    ],
  },
  {
    sku: "HD-FLR-003",
    name: "Warm Natural Flooring",
    packageTier: "premium",
    category: "Flooring",
    customerDescription:
      "A warmer flooring expression with greater tonal depth and character. Designed to complement upgraded cabinetry, stone and interior finishes while maintaining a calm, contemporary residential feel.",
    specificationsHeading: "Preliminary characteristics",
    specifications: [
      "Warm natural wood appearance",
      "Straight-plank visual direction",
      "Increased tonal variation and character",
      "Coordinated with upgraded interior finishes",
      "Final material, construction and thickness to be confirmed",
    ],
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
    gallery: [
      {
        src: "/images/inclusions/flooring/products/hd-flr-003-01.webp",
        alt: "Warm wood-look plank flooring in a light living room with leather armchairs.",
      },
      {
        src: "/images/inclusions/flooring/products/hd-flr-003-02.webp",
        alt: "Medium-tone wood-look plank flooring in a dark-walled living and dining room.",
      },
    ],
  },
  {
    sku: "HD-FLR-005",
    name: "Character Wood Flooring",
    packageTier: "signature",
    category: "Flooring",
    customerDescription:
      "A more expressive flooring direction with stronger grain, warmth and material presence. Intended for homes where the floor contributes more deliberately to the overall architectural character.",
    specificationsHeading: "Preliminary characteristics",
    specifications: [
      "Natural wood-inspired appearance",
      "Stronger grain and tonal character",
      "Plank-format visual direction",
      "Intended as a more prominent interior finish",
      "Final material, finish and construction to be confirmed",
    ],
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
    gallery: [
      {
        src: "/images/inclusions/flooring/products/hd-flr-005-01.webp",
        alt: "Natural wood flooring beside a stone fireplace and wood coffee table.",
      },
      {
        src: "/images/inclusions/flooring/products/hd-flr-005-02.webp",
        alt: "Wide natural wood planks in a bright open kitchen and stair hall.",
      },
      {
        src: "/images/inclusions/flooring/products/hd-flr-005-03.webp",
        alt: "Rich wood plank flooring in a large white kitchen with a central island.",
      },
    ],
  },
];

const kitchenCabinetryProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-KIT-001",
    name: "Light Oak Studio",
    packageTier: "essential",
    category: "Kitchen Cabinetry",
    customerDescription:
      "Clean flat-panel cabinetry in white and light oak tones, coordinated with open display shelving for a warm contemporary kitchen.",
    specifications: [],
    choices: [
      {
        name: "Light Oak Studio",
        customerDescription:
          "Clean flat-panel cabinetry in white and light oak tones, coordinated with open display shelving for a warm contemporary kitchen.",
        image: {
          src: "/images/inclusions/kitchen-cabinetry/products/hd-kitchen-cabinetry-essential-01-light-oak-studio.jpg",
          alt: "Light Oak Studio kitchen cabinetry composition",
        },
      },
      {
        name: "Coastal Blue",
        customerDescription:
          "White flat-panel base cabinetry with blue overhead fronts, light wood accents and open shelving for a crisp modern composition.",
        image: {
          src: "/images/inclusions/kitchen-cabinetry/products/hd-kitchen-cabinetry-essential-02-coastal-blue.jpg",
          alt: "Coastal Blue kitchen cabinetry composition",
        },
      },
      {
        name: "Natural Oak Loft",
        customerDescription:
          "Pale oak cabinetry, quiet neutral storage walls and an island with open display space for a calm, architectural look.",
        image: {
          src: "/images/inclusions/kitchen-cabinetry/products/hd-kitchen-cabinetry-essential-03-natural-oak-loft.jpg",
          alt: "Natural Oak Loft kitchen cabinetry composition",
        },
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-KIT-003",
    name: "Soft Ivory Classic",
    packageTier: "premium",
    category: "Kitchen Cabinetry",
    customerDescription:
      "Soft ivory framed cabinetry with arched glazed displays and refined decorative detailing for a light transitional kitchen.",
    specifications: [],
    choices: [
      {
        name: "Soft Ivory Classic",
        customerDescription:
          "Soft ivory framed cabinetry with arched glazed displays and refined decorative detailing for a light transitional kitchen.",
        image: {
          src: "/images/inclusions/kitchen-cabinetry/products/hd-kitchen-cabinetry-premium-01-soft-ivory-classic.jpg",
          alt: "Soft Ivory Classic kitchen cabinetry composition",
        },
      },
      {
        name: "Sage Arch",
        customerDescription:
          "A balanced composition of soft neutral cabinetry, muted sage feature fronts, arched glazing and a coordinated island.",
        image: {
          src: "/images/inclusions/kitchen-cabinetry/products/hd-kitchen-cabinetry-premium-02-sage-arch.jpg",
          alt: "Sage Arch kitchen cabinetry composition",
        },
      },
      {
        name: "Heritage Walnut",
        customerDescription:
          "Deep walnut-toned framed cabinetry with glazed display elements and layered traditional detailing.",
        image: {
          src: "/images/inclusions/kitchen-cabinetry/products/hd-kitchen-cabinetry-premium-03-heritage-walnut.jpg",
          alt: "Heritage Walnut kitchen cabinetry composition",
        },
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-KIT-005",
    name: "Smoked Oak Atelier",
    packageTier: "signature",
    category: "Kitchen Cabinetry",
    customerDescription:
      "A full-height dark and smoked-oak cabinetry composition with open display shelving and a dramatic stone-look feature surface.",
    specifications: [],
    choices: [
      {
        name: "Smoked Oak Atelier",
        customerDescription:
          "A full-height dark and smoked-oak cabinetry composition with open display shelving and a dramatic stone-look feature surface.",
        image: {
          src: "/images/inclusions/kitchen-cabinetry/products/hd-kitchen-cabinetry-signature-01-smoked-oak-atelier.jpg",
          alt: "Smoked Oak Atelier kitchen cabinetry composition",
        },
      },
      {
        name: "Luminous Oak Gallery",
        customerDescription:
          "Pale oak cabinetry with glass-front display storage, warm feature lighting and a coordinated central island.",
        image: {
          src: "/images/inclusions/kitchen-cabinetry/products/hd-kitchen-cabinetry-signature-02-luminous-oak-gallery.jpg",
          alt: "Luminous Oak Gallery kitchen cabinetry composition",
        },
      },
      {
        name: "Walnut Social Kitchen",
        customerDescription:
          "A large-format walnut cabinetry wall with full-height storage, an open preparation niche and an integrated dining zone.",
        image: {
          src: "/images/inclusions/kitchen-cabinetry/products/hd-kitchen-cabinetry-signature-03-walnut-social-kitchen.png",
          alt: "Walnut Social Kitchen kitchen cabinetry composition",
          fit: "contain",
        },
      },
    ],
  }),
];

const wardrobeProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-WRD-001",
    name: "Seamless White Suite",
    packageTier: "essential",
    category: "Wardrobes",
    customerDescription:
      "A full-height white wardrobe composition with flush fronts and concealed storage for a calm, integrated bedroom.",
    specifications: [],
    choices: [
      {
        name: "Seamless White Suite",
        customerDescription:
          "A full-height white wardrobe composition with flush fronts and concealed storage for a calm, integrated bedroom.",
        image: {
          src: "/images/inclusions/wardrobes/products/hd-wardrobe-essential-01-seamless-white-suite.jpg",
          alt: "Seamless White Suite full-height fitted wardrobe in a bright bedroom",
        },
      },
      {
        name: "Gallery White",
        customerDescription:
          "A clean white wardrobe composition with open display shelving, dark accents and a central glass-fronted storage tower.",
        image: {
          src: "/images/inclusions/wardrobes/products/hd-wardrobe-essential-02-gallery-white.jpg",
          alt: "Gallery White wardrobe with display shelving and central glass-fronted storage",
        },
      },
      {
        name: "Open Frame Studio",
        customerDescription:
          "An open wardrobe system with warm wood tones, illuminated rails, shelving and dedicated accessory storage.",
        image: {
          src: "/images/inclusions/wardrobes/products/hd-wardrobe-essential-03-open-frame-studio.jpg",
          alt: "Open Frame Studio wardrobe with rails, shelving and accessory storage",
        },
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-WRD-003",
    name: "Ivory Framed Suite",
    packageTier: "premium",
    category: "Wardrobes",
    customerDescription:
      "A full-height ivory wardrobe with framed doors, integrated drawers, display niches and softly lit glass-fronted sections.",
    specifications: [],
    choices: [
      {
        name: "Ivory Framed Suite",
        customerDescription:
          "A full-height ivory wardrobe with framed doors, integrated drawers, display niches and softly lit glass-fronted sections.",
        image: {
          src: "/images/inclusions/wardrobes/products/hd-wardrobe-premium-01-ivory-framed-suite.jpg",
          alt: "Ivory Framed Suite wardrobe with drawers, display niches and glass-fronted sections",
        },
      },
      {
        name: "Reeded Glass Gallery",
        customerDescription:
          "A refined pale wardrobe composition combining framed doors, reeded-glass display sections and integrated bedside storage.",
        image: {
          src: "/images/inclusions/wardrobes/products/hd-wardrobe-premium-02-reeded-glass-gallery.jpg",
          alt: "Reeded Glass Gallery pale wardrobe with framed doors and integrated bedside storage",
        },
      },
      {
        name: "Heritage Walnut",
        customerDescription:
          "A deep walnut-toned wardrobe wall with traditional panel detailing, illuminated display storage and an integrated bedroom composition.",
        image: {
          src: "/images/inclusions/wardrobes/products/hd-wardrobe-premium-03-heritage-walnut.jpg",
          alt: "Heritage Walnut traditional wardrobe wall with illuminated display storage",
        },
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-WRD-005",
    name: "Gallery Wardrobe System",
    packageTier: "signature",
    category: "Wardrobes",
    customerDescription:
      "A higher-touch dressing-room direction where storage becomes part of the room’s architectural composition. Layered cabinetry, display zones and a central planning element create a more deliberate interior experience.",
    specifications: [
      "Room-scale wardrobe planning direction",
      "Layered hanging, display and drawer zones",
      "Feature lighting provision subject to review",
      "Stronger material and finish presence",
      "Final layout, materials and detailing to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/wardrobes/products/hd-wrd-005-01.webp",
        alt: "Dark walk-in dressing room with illuminated custom storage and a central island.",
      },
      {
        src: "/images/inclusions/wardrobes/products/hd-wrd-005-02.webp",
        alt: "Contemporary wardrobe with black tinted glass doors and integrated lighting.",
      },
      {
        src: "/images/inclusions/wardrobes/products/hd-wrd-005-03.webp",
        alt: "Dark walnut walk-in wardrobe with glazed doors and a central storage island.",
      },
    ],
  }),
];

const interiorDoorProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-IDR-001",
    name: "Linear White",
    packageTier: "essential",
    category: "Interior Doors",
    customerDescription:
      "A crisp white interior door with restrained linear detailing for a clean contemporary finish.",
    specifications: [],
    choices: [
      {
        name: "Linear White",
        customerDescription:
          "A crisp white interior door with restrained linear detailing for a clean contemporary finish.",
        image: {
          src: "/images/inclusions/interior-doors/products/hd-interior-door-essential-01-linear-white.jpg",
          alt: "Linear White contemporary interior door",
        },
      },
      {
        name: "Quiet Frame",
        customerDescription:
          "A white interior door with a slim inset frame and understated profile for calm modern spaces.",
        image: {
          src: "/images/inclusions/interior-doors/products/hd-interior-door-essential-02-quiet-frame.jpg",
          alt: "Quiet Frame white interior door with slim inset detail",
        },
      },
      {
        name: "Offset Line",
        customerDescription:
          "A white interior door with asymmetric linear detailing that adds subtle architectural character.",
        image: {
          src: "/images/inclusions/interior-doors/products/hd-interior-door-essential-03-offset-line.jpg",
          alt: "Offset Line white interior door with asymmetric detailing",
        },
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-IDR-003",
    name: "Soft Panel",
    packageTier: "premium",
    category: "Interior Doors",
    customerDescription:
      "A softly profiled white interior door with a refined perimeter detail and understated transitional character.",
    specifications: [],
    choices: [
      {
        name: "Soft Panel",
        customerDescription:
          "A softly profiled white interior door with a refined perimeter detail and understated transitional character.",
        image: {
          src: "/images/inclusions/interior-doors/products/hd-interior-door-premium-01-soft-panel.jpg",
          alt: "Soft Panel white transitional interior door",
        },
      },
      {
        name: "Natural Oak Line",
        customerDescription:
          "A warm oak-look interior door with vertical grain and slim linear accents for a tailored contemporary appearance.",
        image: {
          src: "/images/inclusions/interior-doors/products/hd-interior-door-premium-02-natural-oak-line.jpg",
          alt: "Natural Oak Line contemporary interior door",
        },
      },
      {
        name: "Reeded Oak",
        customerDescription:
          "A warm wood-look interior door with fine vertical texture and a composed architectural profile.",
        image: {
          src: "/images/inclusions/interior-doors/products/hd-interior-door-premium-03-reeded-oak.jpg",
          alt: "Reeded Oak interior door with vertical texture",
        },
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-IDR-005",
    name: "Classic White Panel",
    packageTier: "signature",
    category: "Interior Doors",
    customerDescription:
      "A painted white interior door with layered raised-panel detailing for a confident traditional statement.",
    specifications: [],
    choices: [
      {
        name: "Classic White Panel",
        customerDescription:
          "A painted white interior door with layered raised-panel detailing for a confident traditional statement.",
        image: {
          src: "/images/inclusions/interior-doors/products/hd-interior-door-signature-01-classic-white-panel.jpg",
          alt: "Classic White Panel traditional interior door",
        },
      },
      {
        name: "Heritage Arch",
        customerDescription:
          "A painted interior door with an arched glazed-look centre panel and layered lower-panel detailing.",
        image: {
          src: "/images/inclusions/interior-doors/products/hd-interior-door-signature-02-heritage-arch.jpg",
          alt: "Heritage Arch interior door with arched centre panel",
        },
      },
      {
        name: "Gallery Taupe",
        customerDescription:
          "A warm taupe interior door with sculpted panel detailing for a quiet, elevated architectural finish.",
        image: {
          src: "/images/inclusions/interior-doors/products/hd-interior-door-signature-03-gallery-taupe.jpg",
          alt: "Gallery Taupe interior door with sculpted panel detailing",
        },
      },
    ],
  }),
];

const exteriorDoorProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-EDR-001",
    name: "Warm Minimal Entry Door",
    packageTier: "essential",
    category: "Exterior Entry Doors",
    customerDescription:
      "A warm, minimal entry-door direction with a quiet slab-like expression and natural accent. It creates an approachable arrival while coordinating broadly with House Delivery exterior palettes.",
    specifications: [
      "Warm natural visual direction",
      "Minimal entry composition",
      "Restrained exterior detailing",
      "Project-specific threshold and hardware review",
      "Final material, configuration and performance specifications to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/exterior-doors/products/hd-edr-001-01.webp",
        alt: "Warm wood entry door framed by pale siding and clipped greenery.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-EDR-003",
    name: "Architectural Entry Door",
    packageTier: "premium",
    category: "Exterior Entry Doors",
    customerDescription:
      "A refined panelled-entry direction with a stronger architectural frame and coordinated sidelights. Designed to give the home a composed, contemporary arrival.",
    specifications: [
      "Panelled entry-door appearance",
      "Coordinated sidelight direction",
      "Dark neutral exterior palette",
      "Hardware and access requirements subject to review",
      "Final construction, glazing and performance requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/exterior-doors/products/hd-edr-003-01.webp",
        alt: "Ornate dark double entry doors framed by pale stone and traditional wall lights.",
      },
      {
        src: "/images/inclusions/exterior-doors/products/hd-edr-003-02.webp",
        alt: "Dark glazed entry door with geometric detailing in a brick facade.",
      },
      {
        src: "/images/inclusions/exterior-doors/products/hd-edr-003-03.webp",
        alt: "Minimal dark entry door with horizontal glazed accents.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-EDR-005",
    name: "Statement Entry Door",
    packageTier: "signature",
    category: "Exterior Entry Doors",
    customerDescription:
      "A more expressive entry-door direction where pattern, glazing and hardware contribute deliberately to the home’s exterior character.",
    specifications: [
      "Decorative double-door expression",
      "Feature glazing and panel detail direction",
      "Stronger arrival and facade presence",
      "Project-specific hardware and access review",
      "Final construction, finish and performance requirements to be confirmed",
    ],
  }),
];

const windowProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-WIN-001",
    name: "Slim-Framed Window Direction",
    packageTier: "essential",
    category: "Windows & Patio Doors",
    customerDescription:
      "A clean window direction intended to support daylight, straightforward operation and broad coordination with House Delivery exterior palettes.",
    specifications: [
      "Simple horizontal window composition",
      "Dark neutral frame direction",
      "Straightforward opening configuration",
      "Project-specific opening and screen review",
      "Final frame, glazing and performance requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/windows-patio-doors/products/hd-win-001-01.webp",
        alt: "Dark-framed sliding window overlooking a planted courtyard.",
      },
      {
        src: "/images/inclusions/windows-patio-doors/products/hd-win-001-02.webp",
        alt: "Dark-framed corner windows opening toward a landscaped garden.",
      },
      {
        src: "/images/inclusions/windows-patio-doors/products/hd-win-001-03.webp",
        alt: "Wide dark-framed sliding doors connecting a bright interior to a terrace.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-WIN-003",
    name: "Expanded Glazing Direction",
    packageTier: "premium",
    category: "Windows & Patio Doors",
    customerDescription:
      "A larger glazed-opening direction that brings more daylight and a stronger visual connection to exterior spaces while retaining a disciplined frame expression.",
    specifications: [
      "Expanded multi-panel glazing direction",
      "Larger daylight opening concept",
      "Coordinated frame finish",
      "Operation and screen requirements subject to review",
      "Final configuration, glazing and performance requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/windows-patio-doors/products/hd-win-003-01.webp",
        alt: "Slim-framed multi-panel glazed doors opening to a bright terrace.",
      },
      {
        src: "/images/inclusions/windows-patio-doors/products/hd-win-003-02.webp",
        alt: "Dark-framed windows opened toward a garden from a bright living room.",
      },
      {
        src: "/images/inclusions/windows-patio-doors/products/hd-win-003-03.webp",
        alt: "Multi-panel glazed doors opening to a sheltered patio.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-WIN-005",
    name: "Large-Opening Glazing Direction",
    packageTier: "signature",
    category: "Windows & Patio Doors",
    customerDescription:
      "A broad patio-door direction intended to make the exterior connection a more prominent part of the home’s architecture and everyday living experience.",
    specifications: [
      "Wide multi-panel patio-door expression",
      "Slim dark-frame visual direction",
      "Strong indoor-outdoor connection",
      "Threshold and operation subject to project review",
      "Final system, glazing and performance requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/windows-patio-doors/products/hd-win-005-01.webp",
        alt: "Wide dark-framed patio doors opening to a landscaped terrace.",
      },
      {
        src: "/images/inclusions/windows-patio-doors/products/hd-win-005-02.webp",
        alt: "Full-height glazed folding doors opening an interior to a stone terrace.",
      },
      {
        src: "/images/inclusions/windows-patio-doors/products/hd-win-005-03.webp",
        alt: "Bright kitchen with large patio doors and architectural skylights.",
      },
    ],
  }),
];

const kitchenBathFixtureProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-PLM-001",
    name: "Bright Metal Fixture Package",
    packageTier: "essential",
    category: "Kitchen & Bath Fixtures",
    customerDescription:
      "A bright-metal finished-fixture direction selected as a clean, versatile baseline across kitchens and bathrooms. Its restrained appearance coordinates easily with light surfaces and neutral cabinetry while exact components respond to the selected home and project configuration.",
    specifications: [
      "Bright neutral-metal visual direction",
      "Coordinated kitchen sink and kitchen faucet direction",
      "Bathroom basin, faucet and toilet direction",
      "Shower fittings, enclosure, bathtub, finished drains and accessories included where applicable",
      "Final fixture, finish and compatibility requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/bathroom-systems/products/hd-bth-001-01.webp",
        alt: "Bright contemporary bathroom with pale surfaces, a freestanding bath and double vanity.",
      },
      {
        src: "/images/inclusions/bathroom-systems/products/hd-bth-001-02.webp",
        alt: "Compact grey bathroom with a simple basin, mirrored cabinet and toilet.",
      },
      {
        src: "/images/inclusions/plumbing-fixtures/products/hd-plm-001-01.webp",
        alt: "Minimal bright-metal wall-mounted faucet above a white basin.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-PLM-003",
    name: "Dark Metal Fixture Package",
    packageTier: "premium",
    category: "Kitchen & Bath Fixtures",
    customerDescription:
      "A dark-metal finished-fixture direction that gives kitchens and bathrooms a stronger graphic presence. The controlled finish is intended to remain consistent across the visible fixture family while exact components respond to the selected home and project configuration.",
    specifications: [
      "Dark metal visual direction",
      "Coordinated kitchen sink and kitchen faucet direction",
      "Bathroom basin, faucet and toilet direction",
      "Enclosure, bathtub, finished drains and accessories included where applicable",
      "Final fixture, finish and compatibility requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/bathroom-systems/products/hd-bth-003-02.webp",
        alt: "Warm wood bathroom with a double vanity, freestanding bath and integrated mirror lighting.",
      },
      {
        src: "/images/inclusions/bathroom-systems/products/hd-bth-003-03.webp",
        alt: "Bright coordinated bathroom with a floating vanity, freestanding bath and glazed shower.",
      },
      {
        src: "/images/inclusions/plumbing-fixtures/products/hd-plm-003-01.webp",
        alt: "Dark shower fixture set with overhead and handheld fittings.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-PLM-005",
    name: "Warm Metal Fixture Package",
    packageTier: "signature",
    category: "Kitchen & Bath Fixtures",
    customerDescription:
      "A restrained warm-metal finished-fixture direction for kitchens and bathrooms where fittings contribute more deliberately to the material palette. The warmer tone is intended to coordinate across the visible fixture family while exact components respond to the selected home and project configuration.",
    specifications: [
      "Warm brushed-metal visual direction",
      "Coordinated kitchen sink and kitchen faucet direction",
      "Bathroom basin, faucet and toilet direction",
      "Enclosure, bathtub, finished drains and accessories included where applicable",
      "Final fixture, finish and compatibility requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/bathroom-systems/products/hd-bth-005-01.webp",
        alt: "Layered resort bathroom with warm timber, stone surfaces and a sculptural basin.",
      },
      {
        src: "/images/inclusions/bathroom-systems/products/hd-bth-005-02.webp",
        alt: "Open resort bathroom with a sculptural stone bath, timber detailing and warm metal fixtures.",
      },
      {
        src: "/images/inclusions/plumbing-fixtures/products/hd-plm-005-01.webp",
        alt: "Warm-metal faucet paired with a clear textured countertop basin.",
      },
    ],
  }),
];

const bathroomVanityProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-VAN-001",
    name: "Compact Floating Vanity",
    packageTier: "essential",
    category: "Bathroom Vanities",
    customerDescription:
      "A wall-mounted vanity direction with practical storage and a light visual footprint. Designed to coordinate broadly with neutral bathroom finishes and everyday layouts.",
    specifications: [
      "Wall-mounted vanity appearance",
      "Warm neutral cabinet direction",
      "Integrated storage provision",
      "Coordinated mirror and basin planning",
      "Final dimensions, materials and plumbing coordination to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/bathroom-vanities/products/hd-bathroom-vanity-essential-01.png",
        alt: "Essential bathroom vanity option 1",
      },
      {
        src: "/images/inclusions/bathroom-vanities/products/hd-bathroom-vanity-essential-02.png",
        alt: "Essential bathroom vanity option 2",
      },
      {
        src: "/images/inclusions/bathroom-vanities/products/hd-bathroom-vanity-essential-03.png",
        alt: "Essential bathroom vanity option 3",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-VAN-003",
    name: "Warm Integrated Vanity",
    packageTier: "premium",
    category: "Bathroom Vanities",
    customerDescription:
      "A more refined double-vanity direction with balanced storage, paired mirrors and a stronger material presence for primary and shared bathrooms.",
    specifications: [
      "Double-vanity planning direction",
      "Paired illuminated mirror concept",
      "Warm cabinet and light surface palette",
      "Expanded drawer and countertop provision",
      "Final dimensions, materials and plumbing coordination to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/bathroom-vanities/products/hd-bathroom-vanity-premium-01.png",
        alt: "Premium bathroom vanity option 1",
      },
      {
        src: "/images/inclusions/bathroom-vanities/products/hd-bathroom-vanity-premium-02.png",
        alt: "Premium bathroom vanity option 2",
      },
      {
        src: "/images/inclusions/bathroom-vanities/products/hd-bathroom-vanity-premium-03.png",
        alt: "Premium bathroom vanity option 3",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-VAN-005",
    name: "Feature Double Vanity",
    packageTier: "signature",
    category: "Bathroom Vanities",
    customerDescription:
      "A room-scale vanity direction where cabinetry, mirrors and surrounding storage are composed as an integrated bathroom feature.",
    specifications: [
      "Integrated vanity and storage composition",
      "Layered light neutral finish direction",
      "Expanded mirror and counter planning",
      "Coordinated lighting provision subject to review",
      "Final layout, materials and plumbing coordination to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/bathroom-vanities/products/hd-bathroom-vanity-signature-01.jpg",
        alt: "Signature bathroom vanity option 1",
      },
      {
        src: "/images/inclusions/bathroom-vanities/products/hd-bathroom-vanity-signature-02.jpg",
        alt: "Signature bathroom vanity option 2",
      },
      {
        src: "/images/inclusions/bathroom-vanities/products/hd-bathroom-vanity-signature-03.webp",
        alt: "Signature bathroom vanity option 3",
      },
    ],
  }),
];

const tileSurfaceProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-TIL-001",
    name: "Warm Quiet Surface",
    packageTier: "essential",
    category: "Tile & Surfaces",
    customerDescription:
      "A warm, quiet stone-look surface direction intended to keep interiors calm and easy to coordinate. The soft taupe palette provides a versatile baseline for cabinetry and metal finishes.",
    specifications: [
      "Warm taupe stone-look appearance",
      "Quiet matte visual direction",
      "Subtle tonal variation",
      "Broad interior coordination",
      "Final material, dimensions and application to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/tile-surfaces/products/hd-til-001-01.webp",
        alt: "Large pale porcelain-look floor tiles in a contemporary living room.",
      },
      {
        src: "/images/inclusions/tile-surfaces/products/hd-til-001-02.webp",
        alt: "Warm wood-look floor tiles across a bright residential entry.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-TIL-003",
    name: "Textured Neutral Surface",
    packageTier: "premium",
    category: "Tile & Surfaces",
    customerDescription:
      "A pale neutral surface direction with subtle texture and softly varied character. It adds depth to upgraded interiors while remaining restrained enough for broad coordination.",
    specifications: [
      "Warm ivory and pale greige palette",
      "Subtle textured visual character",
      "Large-format room expression",
      "Coordinated wall and floor direction",
      "Final material, format and application to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/tile-surfaces/products/hd-til-003-01.webp",
        alt: "Warm neutral stone-look surfaces across a refined kitchen and dining room.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-TIL-005",
    name: "Feature Stone-Look Surface",
    packageTier: "signature",
    category: "Tile & Surfaces",
    customerDescription:
      "A stronger stone-look surface direction with pronounced texture and shadow. Intended for selected feature applications where the surface contributes deliberately to the architectural composition.",
    specifications: [
      "Textured stone-look appearance",
      "Stronger depth and shadow variation",
      "Feature-surface visual direction",
      "Intended for selected feature applications",
      "Final material, format and application to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/tile-surfaces/products/hd-til-005-01.webp",
        alt: "Dark marble-look floor tiles with expressive pale veining.",
      },
      {
        src: "/images/inclusions/tile-surfaces/products/hd-til-005-02.webp",
        alt: "Handmade-look green feature tiles with subtle tonal variation.",
      },
    ],
  }),
];

const countertopProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-CTR-001",
    name: "Quiet Light Surface",
    packageTier: "essential",
    category: "Countertops",
    customerDescription:
      "A light countertop direction selected to keep kitchens bright and easy to coordinate with neutral cabinetry, metalwork and surrounding finishes.",
    specifications: [
      "Light stone-inspired appearance",
      "Subtle movement and tonal variation",
      "Coordinated counter and island direction",
      "Edge and backsplash approach subject to review",
      "Final material, finish and fabrication requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/countertops/products/hd-countertops-essential-01.jpg",
        alt: "Warm-toned quartz countertop in a compact modern kitchen",
      },
      {
        src: "/images/inclusions/countertops/products/hd-countertops-essential-02.jpg",
        alt: "Warm-toned quartz countertop shown from a second kitchen angle",
      },
      {
        src: "/images/inclusions/countertops/products/hd-countertops-essential-03.jpg",
        alt: "Grey quartz countertop in a wood-finish kitchen",
      },
      {
        src: "/images/inclusions/countertops/products/hd-countertops-essential-04.jpg",
        alt: "Light grey quartz countertop in a compact kitchen",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-CTR-003",
    name: "Soft Vein Surface",
    packageTier: "premium",
    category: "Countertops",
    customerDescription:
      "A warmer countertop direction with greater variation and visual depth. Intended to complement upgraded cabinetry and create a more layered kitchen composition.",
    specifications: [
      "Warm stone-inspired appearance",
      "Increased pattern and tonal movement",
      "Expanded island surface direction",
      "Coordinated backsplash concept",
      "Final material, finish and fabrication requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/countertops/products/hd-countertops-premium-01.jpg",
        alt: "White quartz island countertop in a classic kitchen",
      },
      {
        src: "/images/inclusions/countertops/products/hd-countertops-premium-02.jpg",
        alt: "Veined white quartz island countertop in a traditional kitchen",
      },
      {
        src: "/images/inclusions/countertops/products/hd-countertops-premium-03.jpg",
        alt: "Close view of a veined white quartz countertop and sink",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-CTR-005",
    name: "Character Vein Surface",
    packageTier: "signature",
    category: "Countertops",
    customerDescription:
      "A more expressive countertop direction where stronger veining and material presence make the work surface a deliberate part of the architectural palette.",
    specifications: [
      "Expressive stone-inspired appearance",
      "Stronger veining and visual movement",
      "Feature island and counter application concept",
      "Bookmatching or slab layout subject to review",
      "Final material, finish and fabrication requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/countertops/products/hd-countertops-signature-01.jpg",
        alt: "Veined white quartz island countertop in a dark contemporary kitchen",
      },
      {
        src: "/images/inclusions/countertops/products/hd-countertops-signature-02.jpg",
        alt: "Veined white quartz island countertop shown from a second angle",
      },
      {
        src: "/images/inclusions/countertops/products/hd-countertops-signature-03.jpg",
        alt: "White quartz countertops wrapping a contemporary kitchen",
      },
    ],
  }),
];

const wallPanelProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-WAL-001",
    name: "Light Oak Linear",
    packageTier: "essential",
    category: "Interior Wall Panels",
    customerDescription:
      "A clean light-oak and white wall-panel composition with integrated display and media storage.",
    specifications: [],
    choices: [
      {
        name: "Light Oak Linear",
        customerDescription:
          "A clean light-oak and white wall-panel composition with integrated display and media storage.",
        image: {
          src: "/images/inclusions/wall-panels/products/hd-interior-wall-panel-essential-01-modern-series.jpg",
          alt: "Light Oak Linear interior wall-panel design",
        },
      },
      {
        name: "Graphite Ribbon",
        customerDescription:
          "A modern composition of dark linear woodgrain, light cabinetry and a restrained colour accent.",
        image: {
          src: "/images/inclusions/wall-panels/products/hd-interior-wall-panel-essential-02-moss-series.png",
          alt: "Graphite Ribbon interior wall-panel design",
        },
      },
      {
        name: "Warm Oak Calm",
        customerDescription:
          "Warm vertical woodgrain panels that create a calm, continuous bedroom backdrop.",
        image: {
          src: "/images/inclusions/wall-panels/products/hd-interior-wall-panel-essential-03-quiet-home-series.png",
          alt: "Warm Oak Calm interior wall-panel design",
        },
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-WAL-003",
    name: "Soft Arch",
    packageTier: "premium",
    category: "Interior Wall Panels",
    customerDescription:
      "A soft-toned panel composition with arched detailing and integrated shelving.",
    specifications: [],
    choices: [
      {
        name: "Soft Arch",
        customerDescription:
          "A soft-toned panel composition with arched detailing and integrated shelving.",
        image: {
          src: "/images/inclusions/wall-panels/products/hd-interior-wall-panel-premium-01-antei-series.jpg",
          alt: "Soft Arch interior wall-panel design",
        },
      },
      {
        name: "Sage Classic",
        customerDescription:
          "A refined painted-panel composition with moulding, glazed display elements and built-in storage.",
        image: {
          src: "/images/inclusions/wall-panels/products/hd-interior-wall-panel-premium-02-libo-series.jpg",
          alt: "Sage Classic interior wall-panel design",
        },
      },
      {
        name: "Walnut Heritage",
        customerDescription:
          "Rich walnut-style wall panels with traditional detailing and integrated media cabinetry.",
        image: {
          src: "/images/inclusions/wall-panels/products/hd-interior-wall-panel-premium-03-downton-series.png",
          alt: "Walnut Heritage interior wall-panel design",
        },
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-WAL-005",
    name: "Stone Gallery",
    packageTier: "signature",
    category: "Interior Wall Panels",
    customerDescription:
      "A layered veneer-style composition with dark display towers and a stone-look media feature.",
    specifications: [],
    choices: [
      {
        name: "Stone Gallery",
        customerDescription:
          "A layered veneer-style composition with dark display towers and a stone-look media feature.",
        image: {
          src: "/images/inclusions/wall-panels/products/hd-interior-wall-panel-signature-01-mulan-series.png",
          alt: "Stone Gallery interior wall-panel design",
        },
      },
      {
        name: "Architectural Walnut",
        customerDescription:
          "An architectural veneer-style wall system with full-height storage, integrated shelving and warm accent lighting.",
        image: {
          src: "/images/inclusions/wall-panels/products/hd-interior-wall-panel-signature-02-cloud-series.png",
          alt: "Architectural Walnut interior wall-panel design",
          fit: "contain",
        },
      },
      {
        name: "Grand Walnut",
        customerDescription:
          "A large-format natural-wood statement wall with coordinated storage and architectural lighting.",
        image: {
          src: "/images/inclusions/wall-panels/products/hd-interior-wall-panel-signature-03-classic-series.png",
          alt: "Grand Walnut interior wall-panel design",
          fit: "contain",
        },
      },
    ],
  }),
];

const lightingProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-LGT-001",
    name: "Quiet Lighting Direction",
    packageTier: "essential",
    category: "Lighting",
    customerDescription:
      "A quiet lighting direction that keeps ceilings and living areas visually uncluttered. Soft ambient light supports the room without competing with the wider interior palette.",
    specifications: [
      "Simple ambient-light expression",
      "Uncluttered ceiling direction",
      "Soft illumination across living areas",
      "Location and controls subject to project review",
      "Final fixture and electrical coordination to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/lighting/products/hd-lgt-001-01.webp",
        alt: "Quiet white living room with soft daylight and a restrained feature floor light.",
      },
      {
        src: "/images/inclusions/lighting/products/hd-lgt-001-02.webp",
        alt: "Neutral lounge with restrained ceiling lighting and soft ambient illumination.",
      },
      {
        src: "/images/inclusions/lighting/products/hd-lgt-001-03.webp",
        alt: "Contemporary residence showing a quiet exterior lighting direction.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-LGT-003",
    name: "Layered Lighting Direction",
    packageTier: "premium",
    category: "Lighting",
    customerDescription:
      "A layered lighting direction combining ambient and accent effects to support furniture, surfaces and circulation. The added depth gives upgraded interiors a more composed evening character.",
    specifications: [
      "Ambient and accent-lighting concept",
      "Selective wall and floor illumination",
      "Lighting coordinated with materials and furniture",
      "Locations and controls subject to project review",
      "Final fixture and electrical coordination to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/lighting/products/hd-lgt-003-01.webp",
        alt: "Architectural residence with restrained facade and pathway lighting.",
      },
      {
        src: "/images/inclusions/lighting/products/hd-lgt-003-02.webp",
        alt: "Modern residence framed by soft landscape and architectural lighting.",
      },
      {
        src: "/images/inclusions/lighting/products/hd-lgt-003-03.webp",
        alt: "Refined living room with layered ceiling and sculptural feature lighting.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-LGT-005",
    name: "Architectural Lighting Direction",
    packageTier: "signature",
    category: "Lighting",
    customerDescription:
      "An architectural lighting direction using integrated and feature illumination selectively to shape the room. Stronger linear and suspended elements create a deliberate focal composition.",
    specifications: [
      "Integrated linear-lighting direction",
      "Selective suspended feature elements",
      "Layered architectural illumination",
      "Locations, controls and support subject to review",
      "Final fixture and electrical coordination to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/lighting/products/hd-lgt-005-01.webp",
        alt: "Architectural lounge with integrated wall lighting and sculptural feature fixtures.",
      },
      {
        src: "/images/inclusions/lighting/products/hd-lgt-005-02.webp",
        alt: "Layered hospitality interior with decorative pendants and wall lighting.",
      },
      {
        src: "/images/inclusions/lighting/products/hd-lgt-005-03.webp",
        alt: "Dramatic lounge with integrated vertical lighting and refined table lamps.",
      },
    ],
  }),
];

const applianceProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-APP-001",
    name: "Coordinated Appliance Direction",
    packageTier: "essential",
    category: "Appliances",
    customerDescription:
      "A coordinated appliance direction organized around core cooking, cooling and cleaning needs within a practical kitchen layout. Final appliance manufacturer, model, electrical requirements, configuration and availability are project-specific.",
    specifications: [
      "Core kitchen appliance planning direction",
      "Integrated and freestanding appearance options",
      "Neutral metallic and dark finish palette",
      "Cabinet and service coordination required",
      "Final models, dimensions and utility requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/appliances/products/hd-app-001-01.webp",
        alt: "Bright white kitchen with coordinated wall oven, cooktop and refrigeration.",
      },
      {
        src: "/images/inclusions/appliances/products/hd-app-001-02.webp",
        alt: "Light wood kitchen with a restrained integrated appliance direction.",
      },
      {
        src: "/images/inclusions/appliances/products/hd-app-001-03.webp",
        alt: "Grey and white kitchen with coordinated cooking and cooling appliances.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-APP-003",
    name: "Integrated Appliance Direction",
    packageTier: "premium",
    category: "Appliances",
    customerDescription:
      "A more integrated appliance direction designed to align key equipment with upgraded cabinetry, storage and work-surface planning. Final appliance manufacturer, model, electrical requirements, configuration and availability are project-specific.",
    specifications: [
      "Expanded cooking and cooling package direction",
      "Integrated cabinetry coordination",
      "Layered metallic and dark finish palette",
      "Ventilation and service planning required",
      "Final models, dimensions and utility requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/appliances/products/hd-app-003-01.webp",
        alt: "White and walnut kitchen with coordinated built-in appliances.",
      },
      {
        src: "/images/inclusions/appliances/products/hd-app-003-02.webp",
        alt: "Soft beige kitchen with integrated cooking appliances and a broad island.",
      },
      {
        src: "/images/inclusions/appliances/products/hd-app-003-03.webp",
        alt: "Dark kitchen with integrated wall ovens, cooking surface and refrigeration.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-APP-005",
    name: "Architectural Appliance Integration",
    packageTier: "signature",
    category: "Appliances",
    customerDescription:
      "A higher-touch appliance direction where equipment is composed deliberately within full-height cabinetry and the wider architectural kitchen concept. Final appliance manufacturer, model, electrical requirements, configuration and availability are project-specific.",
    specifications: [
      "Architecturally integrated appliance direction",
      "Full-height cabinet coordination",
      "Expanded cooking and refrigeration planning",
      "Dedicated ventilation and utility review required",
      "Final models, dimensions and installation requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/appliances/products/hd-app-005-01.webp",
        alt: "Architectural glass-fronted kitchen with fully integrated appliance planning.",
      },
      {
        src: "/images/inclusions/appliances/products/hd-app-005-02.webp",
        alt: "Dark open-plan kitchen with integrated appliances and a sculptural island.",
      },
      {
        src: "/images/inclusions/appliances/products/hd-app-005-03.webp",
        alt: "Full-height architectural kitchen with concealed appliances and an oversized island.",
      },
    ],
  }),
];

const windowCoveringProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-WCV-001",
    name: "Warm Neutral Roller",
    packageTier: "essential",
    category: "Roller Blinds / Window Coverings",
    customerDescription:
      "A warm-neutral roller direction intended to give everyday rooms a quiet, coordinated window treatment. Its restrained tone supports privacy and light control without dominating the interior.",
    specifications: [
      "Warm neutral roller appearance",
      "Quiet textile visual direction",
      "Coordinated window-by-window planning",
      "Manual or powered operation subject to review",
      "Final fabric, opacity, dimensions and controls to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/window-coverings/products/hd-wcv-001-01.webp",
        alt: "Warm neutral roller shades across the windows of a contemporary living room.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-WCV-003",
    name: "Soft Light-Filtering Roller",
    packageTier: "premium",
    category: "Roller Blinds / Window Coverings",
    customerDescription:
      "A soft light-filtering roller direction that maintains daylight while giving bedrooms and living areas a more finished, integrated appearance. Its pale neutral expression keeps the room calm and bright.",
    specifications: [
      "Pale light-filtering roller appearance",
      "Soft neutral textile direction",
      "Daylight and privacy coordination",
      "Manual or powered operation subject to review",
      "Final fabric, opacity, dimensions and controls to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/window-coverings/products/hd-wcv-003-01.webp",
        alt: "Soft white light-filtering roller shades in a bright neutral bedroom.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-WCV-005",
    name: "Textured Roller",
    packageTier: "signature",
    category: "Roller Blinds / Window Coverings",
    customerDescription:
      "A textured roller direction with greater textile character and a warmer residential presence. It is intended for rooms where the window treatment contributes more deliberately to the material palette.",
    specifications: [
      "Textured roller appearance",
      "Warmer textile character",
      "Stronger material presence",
      "Manual or powered operation subject to review",
      "Final fabric, opacity, dimensions and controls to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/window-coverings/products/hd-wcv-005-01.webp",
        alt: "Textured gray roller shades across full-height dining-room windows.",
      },
    ],
  }),
];

const representedPackageContext =
  "Essential, Premium and Signature selections are represented in this category.";

export const inclusionCategories: readonly InclusionCategory[] = [
  {
    id: "flooring",
    number: "01",
    name: "Flooring",
    shortName: "Flooring",
    eyebrow: "Surface systems",
    description:
      "Three coordinated preliminary selections demonstrate how the package structure will work as the wider inclusions library is developed.",
    packageContext:
      "Essential, Premium and Signature selections are represented in this category.",
    heroImage: {
      src: "/images/inclusions/flooring/hero.webp",
      alt: "Light wide-plank wood flooring in a bright contemporary interior with an open-riser staircase.",
    },
    products: inclusionProducts,
  },
  {
    id: "kitchen-cabinetry",
    number: "02",
    name: "Kitchen Cabinetry",
    shortName: "Kitchen Cabinetry",
    eyebrow: "Kitchen systems",
    description:
      "Coordinated cabinetry systems designed to support repeatable layouts, durable finishes and controlled upgrade pathways across House Delivery projects.",
    packageContext:
      "Essential, Premium and Signature selections are represented in this category.",
    heroImage: {
      src: "/images/inclusions/kitchen-cabinetry/hero.webp",
      alt: "Wood cabinetry in a bright kitchen with a central island.",
    },
    products: kitchenCabinetryProducts,
  },
  {
    id: "wardrobes",
    number: "03",
    name: "Wardrobes",
    shortName: "Wardrobes",
    eyebrow: "Interior storage",
    description:
      "Wardrobe systems organized to support practical storage planning and a consistent interior finish language across House Delivery homes.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/wardrobes/hero.webp",
      alt: "Open fitted wardrobe with shelves, drawers and hanging rails.",
    },
    products: wardrobeProducts,
  },
  {
    id: "interior-doors",
    number: "04",
    name: "Interior Doors",
    shortName: "Interior Doors",
    eyebrow: "Interior openings",
    description:
      "A coordinated range of interior door styles intended to align with flooring, cabinetry and the overall House Delivery finish language.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/interior-doors/hero.webp",
      alt: "Contemporary interior with black-framed glazed doors, clerestory windows and an open-riser staircase.",
    },
    products: interiorDoorProducts,
  },
  {
    id: "exterior-doors",
    number: "05",
    name: "Exterior Entry Doors",
    shortName: "Exterior Doors",
    eyebrow: "Arrival and entry",
    description:
      "Exterior entry door pathways organized around architectural coordination, project character and project-specific technical confirmation.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/exterior-doors/hero.webp",
      alt: "Open contemporary pivot entry door framed by glazing and light brickwork.",
    },
    products: exteriorDoorProducts,
  },
  {
    id: "windows-patio-doors",
    number: "06",
    name: "Windows & Patio Doors",
    shortName: "Windows & Patio Doors",
    eyebrow: "Exterior openings",
    description:
      "Window and exterior opening systems selected for design coordination, daylight, performance review and project-specific technical confirmation.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/windows-patio-doors/hero.webp",
      alt: "Open glazed patio doors connecting a home to a timber deck.",
    },
    products: windowProducts,
  },
  {
    id: "kitchen-bath-fixtures",
    number: "07",
    name: "Kitchen & Bath Fixtures",
    shortName: "Kitchen & Bath Fixtures",
    eyebrow: "Coordinated fixtures",
    description:
      "Coordinated finished-fixture packages for kitchens and bathrooms, including sinks, faucets and related bath components where applicable to the selected home and project configuration.",
    packageContext: representedPackageContext,
    legacyIds: ["bathroom-systems", "plumbing-fixtures"],
    heroImage: {
      src: "/images/inclusions/bathroom-systems/hero.webp",
      alt: "Bright bathroom with a glass shower, tub and double vanity.",
    },
    products: kitchenBathFixtureProducts,
  },
  {
    id: "bathroom-vanities",
    number: "08",
    name: "Bathroom Vanities",
    shortName: "Bathroom Vanities",
    eyebrow: "Vanity systems",
    description:
      "Vanity selections coordinated with bathroom layouts, storage priorities and the wider House Delivery finish language.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/bathroom-vanities/hero.webp",
      alt: "Wood bathroom vanity with a stone vessel sink, mirrored cabinet and dark wall-mounted faucet.",
    },
    products: bathroomVanityProducts,
  },
  {
    id: "tile-surfaces",
    number: "09",
    name: "Tile & Surfaces",
    shortName: "Tile & Surfaces",
    eyebrow: "Applied finishes",
    description:
      "Curated surface directions intended to coordinate wet areas, feature zones and durable finish transitions throughout the home.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/tile-surfaces/hero.webp",
      alt: "Stone-look wall surfaces surrounding a dark shower system.",
    },
    products: tileSurfaceProducts,
  },
  {
    id: "countertops",
    number: "10",
    name: "Countertops",
    shortName: "Countertops",
    eyebrow: "Work surfaces",
    description:
      "Countertop selections organized to coordinate kitchen and vanity applications through a controlled finish pathway.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/countertops/hero.webp",
      alt: "Light stone kitchen countertops with a matching full-height backsplash.",
    },
    products: countertopProducts,
  },
  {
    id: "wall-panels",
    number: "11",
    name: "Interior Wall Panels",
    shortName: "Wall Panels",
    eyebrow: "Interior surfaces",
    description:
      "Interior wall-panel directions developed for selected feature areas and coordinated with the broader material palette.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/wall-panels/hero.webp",
      alt: "Dark geometric wood wall panels behind a light sofa and built-in shelving.",
    },
    products: wallPanelProducts,
  },
  {
    id: "lighting",
    number: "12",
    name: "Lighting",
    shortName: "Lighting",
    eyebrow: "Lighting systems",
    description:
      "Coordinated lighting pathways intended to support everyday use, architectural emphasis and a consistent interior atmosphere.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/lighting/hero.webp",
      alt: "Woven pendant lights in a bright contemporary living room.",
    },
    products: lightingProducts,
  },
  {
    id: "appliances",
    number: "13",
    name: "Appliances",
    shortName: "Appliances",
    eyebrow: "Appliance packages",
    description:
      "Appliance packages organized for coordinated kitchen planning, project review and a clear selection process.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/appliances/hero.webp",
      alt: "Built-in stainless steel cooking appliances within wood cabinetry.",
    },
    products: applianceProducts,
  },
  {
    id: "window-coverings",
    number: "14",
    name: "Roller Blinds / Window Coverings",
    shortName: "Window Coverings",
    eyebrow: "Interior shading",
    description:
      "Window-covering pathways intended to coordinate privacy, daylight control and the interior finish direction of each project.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/window-coverings/hero.webp",
      alt: "Light roller blind partially lowered over a dark-framed window.",
    },
    products: windowCoveringProducts,
  },
  {
    id: "garage-doors-operators",
    number: "15",
    name: "Garage Doors & Operators",
    shortName: "Garage Doors & Operators",
    eyebrow: "Garage access systems",
    description:
      "Garage-door and operator selections are in development. Exact systems, finishes, controls and electrically operated equipment will require project-specific technical review before confirmation.",
    products: [],
  },
];

export function getInclusionPackage(tier: PackageTier): InclusionPackage {
  const inclusionPackage = inclusionPackages.find(
    (candidate) => candidate.id === tier,
  );

  if (!inclusionPackage) {
    throw new Error(`Unknown inclusion package: ${tier}`);
  }

  return inclusionPackage;
}
