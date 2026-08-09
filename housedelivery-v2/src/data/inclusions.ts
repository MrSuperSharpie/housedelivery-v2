export type PackageTier = "essential" | "premium" | "signature";

export type SelectionStatus = "Preliminary Selection" | "Technical Review";

export type InclusionCategoryId =
  | "flooring"
  | "kitchen-cabinetry"
  | "wardrobes"
  | "interior-doors"
  | "exterior-doors"
  | "windows-patio-doors"
  | "bathroom-systems"
  | "bathroom-vanities"
  | "plumbing-fixtures"
  | "tile-surfaces"
  | "countertops"
  | "wall-panels"
  | "lighting"
  | "appliances"
  | "window-coverings";

export type InclusionCategoryName =
  | "Flooring"
  | "Kitchen Cabinetry"
  | "Wardrobes"
  | "Interior Doors"
  | "Exterior Entry Doors"
  | "Windows & Patio Doors"
  | "Bathroom Systems"
  | "Bathroom Vanities"
  | "Plumbing Fixtures"
  | "Tile & Surfaces"
  | "Countertops"
  | "Interior Wall Panels"
  | "Lighting"
  | "Appliances"
  | "Roller Blinds / Window Coverings";

export type InclusionImage = {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
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
};

export type InclusionCategory = {
  id: InclusionCategoryId;
  number: string;
  name: InclusionCategoryName;
  shortName: string;
  eyebrow: string;
  description: string;
  packageContext?: string;
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
  {
    sku: "HD-KIT-001",
    name: "Modern Modular Cabinetry",
    packageTier: "essential",
    category: "Kitchen Cabinetry",
    customerDescription:
      "A clean, practical cabinetry system designed around repeatable layouts, efficient storage and a restrained contemporary finish. Modular configurations support both compact and larger kitchens while keeping the overall interior language simple and coordinated.",
    specifications: [
      "Modular cabinetry system",
      "Slab and simplified door-front options",
      "Adjustable interior storage",
      "Neutral and woodgrain finish options",
      "Integrated storage accessories available",
      "Final hardware and material specification subject to confirmation",
    ],
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
    gallery: [
      {
        src: "/images/inclusions/kitchen-cabinetry/products/hd-kit-001-01.webp",
        alt: "White slab-front cabinetry with stone-clad island panels and a dining extension.",
      },
    ],
  },
  {
    sku: "HD-KIT-003",
    name: "Refined Integrated Cabinetry",
    packageTier: "premium",
    category: "Kitchen Cabinetry",
    customerDescription:
      "A more refined cabinetry package combining warm material tones, cleaner detailing and expanded storage options. Designed to coordinate naturally with upgraded countertops, appliances and lighting while maintaining a disciplined, architectural appearance.",
    specifications: [
      "Modular cabinetry system",
      "Upgraded finish combinations",
      "Integrated storage configurations",
      "Slab and contemporary front styles",
      "Interior organizer options",
      "Final hardware and material specification subject to confirmation",
    ],
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
    gallery: [
      {
        src: "/images/inclusions/kitchen-cabinetry/products/hd-kit-003-01.webp",
        alt: "Dark slab-front cabinetry with woodgrain tall units, stone backsplash and a central island.",
      },
      {
        src: "/images/inclusions/kitchen-cabinetry/products/hd-kit-003-02.webp",
        alt: "Light gray cabinetry with illuminated display shelves, stone worktops and a window-side sink.",
      },
    ],
  },
  {
    sku: "HD-KIT-005",
    name: "Architectural Kitchen Cabinetry",
    packageTier: "signature",
    category: "Kitchen Cabinetry",
    customerDescription:
      "A higher-touch cabinetry expression with stronger material contrast, integrated detailing and a more bespoke visual character. Intended for kitchens where cabinetry becomes part of the architectural composition rather than simply a storage system.",
    specifications: [
      "Architectural cabinetry composition",
      "Layered material and finish options",
      "Integrated storage solutions",
      "Contemporary door-front configurations",
      "Coordinated island and full-height cabinetry options",
      "Final materials, hardware and configuration subject to project review",
    ],
    selectionStatus: preliminarySelection,
    sampleRequired: true,
    technicalReviewRequired: true,
    projectSpecificApprovalRequired: true,
    availability: projectAvailability,
    gallery: [
      {
        src: "/images/inclusions/kitchen-cabinetry/products/hd-kit-005-01.webp",
        alt: "Layered gray and woodgrain cabinetry with illuminated display cabinets and integrated appliances.",
      },
      {
        src: "/images/inclusions/kitchen-cabinetry/products/hd-kit-005-02.webp",
        alt: "Woodgrain and white cabinetry with illuminated glass storage and two contrasting islands.",
      },
      {
        src: "/images/inclusions/kitchen-cabinetry/products/hd-kit-005-03.webp",
        alt: "Dark full-height cabinetry with a dramatic stone backsplash and coordinated dining island.",
      },
    ],
  },
];

const wardrobeProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-WRD-001",
    name: "Light Integrated Wardrobe",
    packageTier: "essential",
    category: "Wardrobes",
    customerDescription:
      "A practical wardrobe direction organized around everyday hanging, shelving and drawer storage. Its light, restrained expression is intended to coordinate easily with the wider interior finish palette.",
    specifications: [
      "Balanced hanging, shelf and drawer arrangement",
      "Light neutral finish direction",
      "Modular storage planning",
      "Designed for broad interior coordination",
      "Final dimensions, materials and hardware to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/wardrobes/products/hd-wrd-001-01.webp",
        alt: "Reach-in wardrobe with light oak cabinets, hanging space and drawers.",
      },
      {
        src: "/images/inclusions/wardrobes/products/hd-wrd-001-02.webp",
        alt: "Small bedroom reach-in wardrobe with open shelving and drawers.",
      },
      {
        src: "/images/inclusions/wardrobes/products/hd-wrd-001-03.webp",
        alt: "Compact white wardrobe with mirrored doors and organized shelving.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-WRD-003",
    name: "Warm Architectural Wardrobe",
    packageTier: "premium",
    category: "Wardrobes",
    customerDescription:
      "A more integrated wardrobe expression with enclosed fronts, illuminated display areas and a warmer sense of depth. Intended to support upgraded bedrooms while maintaining a calm architectural character.",
    specifications: [
      "Integrated open and enclosed storage direction",
      "Layered neutral finish palette",
      "Display and hanging zones",
      "Coordinated lighting provision subject to review",
      "Final configuration, finishes and hardware to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/wardrobes/products/hd-wrd-003-01.webp",
        alt: "Natural wood bedroom wardrobe with panelled doors and coordinated drawers.",
      },
      {
        src: "/images/inclusions/wardrobes/products/hd-wrd-003-02.webp",
        alt: "Matte white walk-in wardrobe with illuminated open storage.",
      },
      {
        src: "/images/inclusions/wardrobes/products/hd-wrd-003-03.webp",
        alt: "Wall-to-wall matte grey wardrobe with concealed and open storage.",
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
    name: "Quiet Flush Interior Door",
    packageTier: "essential",
    category: "Interior Doors",
    customerDescription:
      "A quiet, minimal interior-door direction in a warm white or greige expression. It provides a restrained baseline that coordinates easily with flooring, trim and wall finishes.",
    specifications: [
      "Warm white or greige visual direction",
      "Minimal-profile appearance",
      "Quiet frame and trim coordination",
      "Designed for broad interior coordination",
      "Final material, configuration and performance specifications to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/interior-doors/products/hd-idr-001-01.webp",
        alt: "Greige panelled interior door coordinated with matching wall cabinetry.",
      },
      {
        src: "/images/inclusions/interior-doors/products/hd-idr-001-02.webp",
        alt: "Dark wood interior door in a bright minimal room.",
      },
      {
        src: "/images/inclusions/interior-doors/products/hd-idr-001-03.webp",
        alt: "Warm wood interior door in a softly lit living space.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-IDR-003",
    name: "Natural Wood Interior Door",
    packageTier: "premium",
    category: "Interior Doors",
    customerDescription:
      "A natural wood interior-door direction with restrained detailing and a warmer material presence. It adds depth while remaining calm enough to coordinate with upgraded interior finishes.",
    specifications: [
      "Light natural wood appearance",
      "Restrained panel detail direction",
      "Warm tonal coordination",
      "Coordinated frame and hardware approach",
      "Final material, configuration and performance specifications to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/interior-doors/products/hd-idr-003-01.webp",
        alt: "Dark flush interior door with restrained panel detailing.",
      },
      {
        src: "/images/inclusions/interior-doors/products/hd-idr-003-02.webp",
        alt: "White panelled interior door in a refined neutral room.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-IDR-005",
    name: "Dark Feature Interior Door",
    packageTier: "signature",
    category: "Interior Doors",
    customerDescription:
      "A darker feature-door direction intended to contribute more deliberately to the interior composition. The deeper tone and framed profile create a controlled architectural accent.",
    specifications: [
      "Dark feature finish direction",
      "Stronger framed profile",
      "Architectural focal-point expression",
      "Project-specific frame and hardware review",
      "Final material, configuration and performance specifications to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/interior-doors/products/hd-idr-005-01.webp",
        alt: "Minimal pivot door set into a pale architectural wall.",
      },
      {
        src: "/images/inclusions/interior-doors/products/hd-idr-005-02.webp",
        alt: "Dark stone-look feature door in a contemporary interior.",
      },
      {
        src: "/images/inclusions/interior-doors/products/hd-idr-005-03.webp",
        alt: "Full-height warm wood feature doors across an architectural wall.",
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

const bathroomSystemProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-BTH-001",
    name: "Coordinated Bathroom",
    packageTier: "essential",
    category: "Bathroom Systems",
    customerDescription:
      "A bright, warm-neutral bathroom direction with a simple vanity and clean shower composition. The coordinated room expression creates a practical baseline without implying one fixed fixture package.",
    specifications: [
      "Bright warm-neutral room palette",
      "Simple vanity and shower composition",
      "Clean coordinated fixture direction",
      "Restrained surface variation",
      "Final material, configuration and performance specifications to be confirmed",
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
    ],
  }),
  preliminaryProduct({
    sku: "HD-BTH-003",
    name: "Refined Bathroom",
    packageTier: "premium",
    category: "Bathroom Systems",
    customerDescription:
      "A refined bathroom direction with floating cabinetry, layered warm materials and stronger mirror and lighting coordination. It gives the room greater depth while retaining a calm residential character.",
    specifications: [
      "Floating double-vanity direction",
      "Layered wood and neutral surface palette",
      "Integrated mirror and lighting concept",
      "Coordinated bath and shower planning",
      "Final material, configuration and performance specifications to be confirmed",
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
    ],
  }),
  preliminaryProduct({
    sku: "HD-BTH-005",
    name: "Architectural Bathroom",
    packageTier: "signature",
    category: "Bathroom Systems",
    customerDescription:
      "An architectural bathroom direction organized around a sculptural bath, restrained feature surfaces and selective integrated lighting. The room is intended to feel composed as a complete interior rather than a collection of fixtures.",
    specifications: [
      "Sculptural bath and vanity composition",
      "Large-format feature-surface direction",
      "Dark coordinated fixture accents",
      "Integrated lighting and service review required",
      "Final material, configuration and performance specifications to be confirmed",
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
        src: "/images/inclusions/bathroom-vanities/products/hd-van-001-01.webp",
        alt: "Warm wood floating bathroom vanity with two illuminated mirrors.",
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
        src: "/images/inclusions/bathroom-vanities/products/hd-van-003-01.webp",
        alt: "Double bathroom vanity with arched illuminated mirrors and light stone-look wall panels.",
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
  }),
];

const plumbingFixtureProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-PLM-001",
    name: "Bright Metal Fixture Set",
    packageTier: "essential",
    category: "Plumbing Fixtures",
    customerDescription:
      "A bright-metal fixture direction selected as a clean, versatile baseline for everyday bathrooms. Its restrained appearance coordinates easily with light surfaces and neutral cabinetry.",
    specifications: [
      "Bright neutral-metal visual direction",
      "Minimal wall-mounted faucet appearance",
      "Clean basin and counter coordination",
      "Coordinated fixture-family approach",
      "Final fixture, finish and compatibility requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/plumbing-fixtures/products/hd-plm-001-01.webp",
        alt: "Minimal bright-metal wall-mounted faucet above a white basin.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-PLM-003",
    name: "Dark Metal Fixture Set",
    packageTier: "premium",
    category: "Plumbing Fixtures",
    customerDescription:
      "A dark-metal fixture direction that gives upgraded bathrooms a stronger graphic presence. The controlled finish is intended to remain consistent across the visible fixture family.",
    specifications: [
      "Dark metal visual direction",
      "Coordinated shower-fixture expression",
      "Stronger contrast with light surfaces",
      "Service and control coordination required",
      "Final fixture, finish and compatibility requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/plumbing-fixtures/products/hd-plm-003-01.webp",
        alt: "Dark shower fixture set with overhead and handheld fittings.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-PLM-005",
    name: "Warm Metal Fixture Set",
    packageTier: "signature",
    category: "Plumbing Fixtures",
    customerDescription:
      "A restrained warm-metal fixture direction for bathrooms where fittings contribute more deliberately to the material palette. The warmer tone is intended to coordinate across basin, bath and shower selections.",
    specifications: [
      "Warm brushed-metal visual direction",
      "Coordinated basin-fixture expression",
      "Stronger material presence",
      "Consistent finish-family planning",
      "Final fixture, finish and compatibility requirements to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/plumbing-fixtures/products/hd-plm-005-01.webp",
        alt: "Warm-metal faucet paired with a clear textured countertop basin.",
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
        src: "/images/inclusions/countertops/products/hd-ctr-001-01.webp",
        alt: "Aerial view of pale stone slabs arranged for selection and fabrication.",
      },
      {
        src: "/images/inclusions/countertops/products/hd-ctr-001-03.webp",
        alt: "Light stone surface with restrained warm movement in an interior application.",
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
        src: "/images/inclusions/countertops/products/hd-ctr-003-01.webp",
        alt: "Softly veined light stone slab shown for countertop direction.",
      },
      {
        src: "/images/inclusions/countertops/products/hd-ctr-003-02.webp",
        alt: "Warm light stone countertop across a residential kitchen island.",
      },
      {
        src: "/images/inclusions/countertops/products/hd-ctr-003-03.webp",
        alt: "Warm translucent stone countertop paired with dark wood cabinetry.",
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
        src: "/images/inclusions/countertops/products/hd-ctr-005-01.webp",
        alt: "Expressive pale stone slab with layered grey movement.",
      },
      {
        src: "/images/inclusions/countertops/products/hd-ctr-005-02.webp",
        alt: "Bright kitchen with a pale character stone countertop and integrated sink.",
      },
      {
        src: "/images/inclusions/countertops/products/hd-ctr-005-03.webp",
        alt: "Architectural kitchen with a character stone island and coordinated backsplash.",
      },
    ],
  }),
];

const wallPanelProducts: readonly InclusionProduct[] = [
  preliminaryProduct({
    sku: "HD-WAL-001",
    name: "Warm Flat Wall Panel",
    packageTier: "essential",
    category: "Interior Wall Panels",
    customerDescription:
      "A restrained light wall-panel direction that adds warmth and quiet order to entries, halls and selected living areas. Its lower-profile expression is intended to sit comfortably within a broad neutral palette.",
    specifications: [
      "Light warm panel-field direction",
      "Restrained rectangular rhythm",
      "Quiet lower-wall application shown",
      "Coordinated trim and wall colour planning",
      "Final profile, material and installation layout to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/wall-panels/products/hd-wal-001-01.webp",
        alt: "Dark painted wall paneling with a restrained rectangular rhythm in a hallway.",
      },
      {
        src: "/images/inclusions/wall-panels/products/hd-wal-001-02.webp",
        alt: "Pale hallway wall paneling with softly layered trim details.",
      },
      {
        src: "/images/inclusions/wall-panels/products/hd-wal-001-03.webp",
        alt: "White hallway wall paneling coordinated with dark flooring and doors.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-WAL-003",
    name: "Vertical Slat Wall Panel",
    packageTier: "premium",
    category: "Interior Wall Panels",
    customerDescription:
      "A warmer vertical panel direction with a measured rhythm and greater material presence. The repeated lines add controlled texture without overwhelming the surrounding architecture.",
    specifications: [
      "Warm wood visual direction",
      "Vertical repeating rhythm",
      "Controlled texture and shadow",
      "Selected wall application",
      "Final profile, material and site layout to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/wall-panels/products/hd-wal-003-01.webp",
        alt: "Warm vertical wood wall panels with integrated display details.",
      },
    ],
  }),
  preliminaryProduct({
    sku: "HD-WAL-005",
    name: "Architectural Feature Panel",
    packageTier: "signature",
    category: "Interior Wall Panels",
    customerDescription:
      "A deeper architectural panel direction intended to give selected rooms or circulation areas a deliberate sense of proportion, depth and shadow. The full-height composition makes the wall a more prominent interior element.",
    specifications: [
      "Full-height feature-panel composition",
      "Deeper tonal direction",
      "Stronger architectural rhythm and shadow",
      "Selected focal-wall application",
      "Final profile, material and installation layout to be confirmed",
    ],
    gallery: [
      {
        src: "/images/inclusions/wall-panels/products/hd-wal-005-01.webp",
        alt: "Layered full-height wall panels framing a refined bedroom composition.",
      },
      {
        src: "/images/inclusions/wall-panels/products/hd-wal-005-02.webp",
        alt: "Full-height warm wood wall panels across an architectural dining room.",
      },
      {
        src: "/images/inclusions/wall-panels/products/hd-wal-005-03.webp",
        alt: "Dark architectural wall panels with integrated doors and display lighting.",
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
    id: "bathroom-systems",
    number: "07",
    name: "Bathroom Systems",
    shortName: "Bathroom Systems",
    eyebrow: "Coordinated wet areas",
    description:
      "Coordinated bathroom components and finish packages designed to simplify product selection and project procurement.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/bathroom-systems/hero.webp",
      alt: "Bright bathroom with a glass shower, tub and double vanity.",
    },
    products: bathroomSystemProducts,
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
    id: "plumbing-fixtures",
    number: "09",
    name: "Plumbing Fixtures",
    shortName: "Plumbing Fixtures",
    eyebrow: "Fixture selections",
    description:
      "A controlled fixture selection pathway intended to coordinate bathrooms, kitchens and project-specific technical review.",
    packageContext: representedPackageContext,
    heroImage: {
      src: "/images/inclusions/plumbing-fixtures/hero.webp",
      alt: "Close view of a sculptural dark faucet and basin.",
    },
    products: plumbingFixtureProducts,
  },
  {
    id: "tile-surfaces",
    number: "10",
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
    number: "11",
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
    number: "12",
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
    number: "13",
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
    number: "14",
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
    number: "15",
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
