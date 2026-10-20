export type CatalogSpec = {
  label: string;
  value: string;
};

export type CatalogModel = {
  slug: string;
  number: string;
  code: string;
  name: string;
  catalogLabel: string;
  squareFootage: string;
  purpose: string;
  description: string;
  editorial: readonly string[];
  specs: readonly CatalogSpec[];
  image: string;
  imageAlt: string;
  downloadHref: string;
};

const cdn =
  "https://img1.wsimg.com/isteam/ip/f41876f7-372e-4d3e-b5b8-dde5308c52b2";

export const catalogModels: readonly CatalogModel[] = [
  {
    slug: "the-micro",
    number: "01",
    code: "ADU-01",
    name: "The Micro",
    catalogLabel: "The Micro (ADU-01)",
    squareFootage: "540",
    purpose: "Smart, Sustainable Living",
    description:
      "A compact, high-performance elder suite, rental, or starter home with an adaptable one-bedroom plan.",
    editorial: [
      "The Micro proves that small can feel generous. A single, efficient one-bedroom plan is organised around light, storage, and clear sightlines—so 540 square feet lives well beyond its footprint.",
      "Delivered as a pre-engineered light steel system, it arrives numbered and ready to assemble. That makes it an ideal elder suite, rental, or starter home—an accessory dwelling that adds real housing without adding complexity.",
    ],
    specs: [
      { label: "Total area", value: "540 sq ft" },
      { label: "Typology", value: "Accessory dwelling unit" },
      { label: "Configuration", value: "1 bedroom · 1 bath" },
      { label: "Component delivery", value: "Factory-built steel frame" },
      { label: "Structure", value: "Light steel frame system" },
      { label: "Site works", value: "Locally engineered" },
    ],
    image: `${cdn}/AUD%2001.png`,
    imageAlt: "Exterior rendering of Accessory Dwelling Unit 01, The Micro",
    downloadHref: "/pdfs/BC_ADU_01_Drawings.pdf",
  },
  {
    slug: "the-mini",
    number: "02",
    code: "ADU-02",
    name: "The Mini",
    catalogLabel: "The Mini (ADU-02)",
    squareFootage: "1,010",
    purpose: "Two-Bedroom Solution for Flexible Living",
    description:
      "A flexible two-bedroom home for families, elders, shared living, staff housing, or a standalone dwelling.",
    editorial: [
      "The Mini extends the accessory-dwelling idea into a full two-bedroom home. A considered plan separates private and shared space, giving families, elders, and shared households a place that feels complete rather than compact.",
      "Its flexibility is the point. The same certified design works as staff housing, an intergenerational suite, or a standalone dwelling—delivered as coordinated steel components ready for a site-specific foundation.",
    ],
    specs: [
      { label: "Total area", value: "1,010 sq ft" },
      { label: "Typology", value: "Accessory dwelling unit" },
      { label: "Configuration", value: "2 bedroom · 1 bath" },
      { label: "Component delivery", value: "Factory-built steel frame" },
      { label: "Structure", value: "Light steel frame system" },
      { label: "Site works", value: "Locally engineered" },
    ],
    image: `${cdn}/AUD%2002.png`,
    imageAlt: "Exterior rendering of Accessory Dwelling Unit 02, The Mini",
    downloadHref: "/pdfs/BC_ADU_02_Drawings.pdf",
  },
  {
    slug: "bc-duplex",
    number: "03",
    code: "BC-DUPLEX",
    name: "BC Duplex",
    catalogLabel: "BC Duplex",
    squareFootage: "2,927",
    purpose: "Two Homes, One Smart Footprint",
    description:
      "Two private, two-storey homes within one efficient footprint for families, staff, or intergenerational living.",
    editorial: [
      "The BC Duplex places two private two-storey homes within a single efficient footprint. Each residence keeps its own entry, privacy, and full-height living—while the shared structure makes better use of land and services.",
      "It is a measured answer to gentle density: two households, one considered building, and a repeatable steel system that shortens the path from approved design to a buildable, site-adapted project.",
    ],
    specs: [
      { label: "Total area", value: "2,927 sq ft" },
      { label: "Typology", value: "Two-unit duplex" },
      { label: "Configuration", value: "2 homes · two-storey" },
      { label: "Component delivery", value: "Factory-built steel frame" },
      { label: "Structure", value: "Light steel frame system" },
      { label: "Site works", value: "Locally engineered" },
    ],
    image: `${cdn}/Duplex.png`,
    imageAlt: "Exterior rendering of the BC Duplex",
    downloadHref: "/pdfs/BC_Duplex_Drawings.pdf",
  },
  {
    slug: "bc-fourplex-1",
    number: "04",
    code: "BC-FOURPLEX-01",
    name: "BC Fourplex 1",
    catalogLabel: "BC Fourplex 1",
    squareFootage: "4,027",
    purpose: "Four Homes. One Considered Footprint.",
    description:
      "A flexible four-home design for narrower sites, with one- to three-bedroom plans and optional adaptable units.",
    editorial: [
      "BC Fourplex 1 brings four homes to narrower sites without crowding them. A flexible mix of one- to three-bedroom plans lets a single building serve a range of households, with optional adaptable units for accessible living.",
      "The design balances private entries with efficient shared structure—delivering four residences from one coordinated steel package that reviewers and lenders can read as a consistent, proven type.",
    ],
    specs: [
      { label: "Total area", value: "4,027 sq ft" },
      { label: "Typology", value: "Four-unit multiplex" },
      { label: "Configuration", value: "4 homes · 1–3 bedroom" },
      { label: "Component delivery", value: "Factory-built steel frame" },
      { label: "Structure", value: "Light steel frame system" },
      { label: "Site works", value: "Locally engineered" },
    ],
    image: `${cdn}/FourPlex.png`,
    imageAlt: "Exterior rendering of BC Fourplex 1",
    downloadHref: "/pdfs/BC_Fourplex_01_Drawings.pdf",
  },
  {
    slug: "bc-fourplex-2",
    number: "05",
    code: "BC-FOURPLEX-02",
    name: "BC Fourplex 2",
    catalogLabel: "BC Fourplex 2",
    squareFootage: "5,985",
    purpose: "Density, Refined",
    description:
      "Four generous three-bedroom homes gathered within a composed three-storey form for efficient neighbourhood density.",
    editorial: [
      "BC Fourplex 2 refines density into architecture. Four generous three-bedroom homes are gathered within a composed three-storey form—family-sized residences that read as one confident building on the street.",
      "It is density without compromise: full homes for growing households, delivered through the same precise steel system that keeps quality high, waste low, and the delivery timeline predictable.",
    ],
    specs: [
      { label: "Total area", value: "5,985 sq ft" },
      { label: "Typology", value: "Four-unit multiplex" },
      { label: "Configuration", value: "4 homes · 3 bedroom" },
      { label: "Component delivery", value: "Factory-built steel frame" },
      { label: "Structure", value: "Three-storey steel frame" },
      { label: "Site works", value: "Locally engineered" },
    ],
    image: `${cdn}/render-hdc-bc-4_plex-01.jpg`,
    imageAlt: "Exterior rendering of BC Fourplex 2",
    downloadHref: "/pdfs/BC_Fourplex_02_Drawings.pdf",
  },
  {
    slug: "bc-rowhouse",
    number: "06",
    code: "BC-ROWHOUSE",
    name: "BC Rowhouse",
    catalogLabel: "BC Rowhouse",
    squareFootage: "2,718",
    purpose: "Connected Living for Modern Communities",
    description:
      "Attached multi-storey homes that combine private entries and flexible bedrooms with efficient community land use.",
    editorial: [
      "The BC Rowhouse is built for connected communities. Attached multi-storey homes each keep a private entry and flexible bedroom count, while the shared party-wall structure makes efficient use of land and infrastructure.",
      "It is a proven urban type, delivered as a repeatable steel system—so a terrace of homes can move from catalogue design to site-specific engineering and permitting with fewer unknowns.",
    ],
    specs: [
      { label: "Total area", value: "2,718 sq ft" },
      { label: "Typology", value: "Attached rowhouse" },
      { label: "Configuration", value: "Multi-unit · multi-storey" },
      { label: "Component delivery", value: "Factory-built steel frame" },
      { label: "Structure", value: "Light steel frame system" },
      { label: "Site works", value: "Locally engineered" },
    ],
    image: `${cdn}/Rowhouse2.png`,
    imageAlt: "Exterior rendering of the BC Rowhouse",
    downloadHref: "/pdfs/BC_Rowhouse_Drawings.pdf",
  },
  {
    slug: "sixplex-courtyard",
    number: "07",
    code: "BC-SIXPLEX",
    name: "Sixplex Courtyard",
    catalogLabel: "Sixplex Courtyard",
    squareFootage: "6,216",
    purpose: "Courtyard Living, Built for Connection",
    description:
      "Six efficient homes organized around a shared courtyard, balancing private living with a welcoming community space.",
    editorial: [
      "The Sixplex Courtyard organises six efficient homes around a shared central courtyard. Each residence stays private, while the courtyard gives the community a protected, welcoming heart.",
      "It is the catalogue's most communal type—six households on one considered footprint, delivered through a coordinated steel package designed for gentle, human-scaled density.",
    ],
    specs: [
      { label: "Total area", value: "6,216 sq ft" },
      { label: "Typology", value: "Six-unit courtyard" },
      { label: "Configuration", value: "6 homes · shared courtyard" },
      { label: "Component delivery", value: "Factory-built steel frame" },
      { label: "Structure", value: "Light steel frame system" },
      { label: "Site works", value: "Locally engineered" },
    ],
    image: `${cdn}/Six%20Plex.png`,
    imageAlt: "Exterior rendering of the Sixplex Courtyard",
    downloadHref: "/pdfs/BC_Sixplex Courtyard_Drawings.pdf",
  },
];
