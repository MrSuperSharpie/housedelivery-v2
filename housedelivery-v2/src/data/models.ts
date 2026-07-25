export type HomeModel = {
  slug: string;
  name: string;
  locationLabel: string;
  squareFeet: number;
  storeys: number;
  bedrooms: number;
  bathrooms: number | null;
  garageSpaces: number | null;
  footprint: string | null;
  levels: {
    main: number | null;
    upper: number | null;
  };
  structure: string;
  planCallouts: readonly string[];
  video?: {
    title: string;
    embedUrl: string;
  };
  summary: string;
  description: string;
  narrative: readonly {
    title: string;
    body: string;
  }[];
  sourceUrl: string;
  heroImage: string;
  floorPlanImage: string;
  images: readonly string[];
};

const cdn =
  "https://img1.wsimg.com/isteam/ip/f41876f7-372e-4d3e-b5b8-dde5308c52b2";

/**
 * Registry crawled from each model's dedicated HouseDelivery.ca detail page,
 * the main model catalogue, and model-specific imagery used on the homepage.
 * Visually identical alternate uploads are represented once at the highest
 * available resolution. GoDaddy's /:/rs= thumbnail transforms are omitted so
 * the original uploaded assets reach the editorial gallery without downscaling.
 */
export const models = [
  {
    slug: "langley",
    name: "The Langley",
    locationLabel: "Country estate",
    squareFeet: 6810,
    storeys: 2,
    bedrooms: 5,
    bathrooms: null,
    garageSpaces: null,
    footprint: "124 × 63 ft",
    levels: { main: null, upper: null },
    structure: "Precision light steel frame",
    planCallouts: [
      "Double-height entry",
      "Open kitchen + family zone",
      "Five-bedroom private wing",
      "Covered terrace + pool deck",
    ],
    video: {
      title: "Langley House Walk Through",
      embedUrl:
        "https://www.youtube-nocookie.com/embed/c6yE1Jp_xNk?rel=0&modestbranding=1",
    },
    summary:
      "A grand family estate with a double-height entry, expansive glazing, private retreats, and an effortless indoor-outdoor connection.",
    description:
      "The Langley House blends timeless sophistication with the relaxed ease of country estate living. Designed for families who value space, light, and seamless indoor-outdoor flow, this 6,810 sq. ft. residence pairs a soaring double-height entry with expansive family spaces, private retreats, and a covered terrace opening onto the pool deck.",
    narrative: [
      {
        title: "An arrival shaped by light",
        body:
          "A soaring double-storey foyer opens into the home’s generous family volume, where full-height glazing draws daylight deep into the plan. The scale feels composed rather than imposing—equally at ease with quiet mornings, large gatherings, and every rhythm in between.",
      },
      {
        title: "A private horizon",
        body:
          "Upstairs, the primary suite becomes a world of its own: a private balcony, dual dressing rooms, and a spa-like ensuite with double vanities and a freestanding bath. Four further bedrooms sit apart with built-in storage and abundant natural light, while a second lounge and theatre give family life room to unfold.",
      },
      {
        title: "Space for considered work",
        body:
          "The study is conceived as a calm architectural retreat. A long integrated desk creates two generous workstations, while restrained tones and soft daylight keep the room focused, uncluttered, and adaptable—from home office to creative studio.",
      },
      {
        title: "The landscape, invited in",
        body:
          "Beyond the glazing, stone columns frame a sheltered terrace and sunlit pool deck. Interior and exterior become one continuous setting for dining, conversation, and unhurried weekends—a country-estate experience designed to remain compelling through every Canadian season.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/langley-house",
    heroImage: `${cdn}/Ardenvale-House1.jpeg`,
    floorPlanImage: `${cdn}/Ardenvale-House2.jpeg`,
    images: [
      `${cdn}/Ardenvale-House1.jpeg`,
      `${cdn}/Ardenvale-House3.jpeg`,
      `${cdn}/Ardenvale-House7.jpeg`,
      `${cdn}/Ardenvale-House6.jpeg`,
      `${cdn}/Ardenvale-House5.jpeg`,
      `${cdn}/Ardenvale-House4.jpeg`,
      `${cdn}/Ardenvale-House8.jpeg`,
      `${cdn}/Ardenvale-House2.jpeg`,
    ],
  },
  {
    slug: "solace",
    name: "Solace",
    locationLabel: "Modern retreat",
    squareFeet: 5405,
    storeys: 2,
    bedrooms: 5,
    bathrooms: 6,
    garageSpaces: null,
    footprint: "80.1 × 43.3 ft",
    levels: { main: 2813, upper: 2592 },
    structure: "Precision light steel frame",
    planCallouts: [
      "Three living rooms",
      "Open kitchen + dining",
      "Five private bedrooms",
      "Six bathrooms",
    ],
    summary:
      "A high-efficiency contemporary residence defined by open, light-filled rooms, five private bedrooms, and refined family living.",
    description:
      "Solace is an expansive contemporary residence where precision engineering recedes behind an atmosphere of ease. Across 5,405 sq. ft., open volumes, enduring finishes, and a light steel structure create a home that feels elegant, efficient, and entirely composed for modern family life.",
    narrative: [
      {
        title: "Living, in several registers",
        body:
          "Three distinct living rooms allow the house to shift naturally between intimate family time and formal entertaining. Each has its own sense of enclosure and occasion, yet all are connected by natural light, warm materiality, and a quiet architectural continuity.",
      },
      {
        title: "A continuous social heart",
        body:
          "The open interior moves effortlessly from arrival to dining and kitchen. Warm timber floors temper crisp architectural lines, while glass balustrades preserve long views through the house—an elegant framework for everyday rituals and larger celebrations alike.",
      },
      {
        title: "Five rooms of retreat",
        body:
          "Five generous bedrooms are treated as individual sanctuaries rather than secondary spaces. The primary suite is oriented toward panoramic views, balancing privacy, tailored detailing, and a serene sense of separation from the home’s social core.",
      },
      {
        title: "Ritual, refined",
        body:
          "Six bathrooms bring spa-like calm to the practical cadence of family life. Clean-lined fixtures, considered lighting, and quietly luxurious surfaces turn the beginning and end of each day into something measured and restorative.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/solace-house",
    heroImage: `${cdn}/Tallinn-House1.jpeg`,
    floorPlanImage: `${cdn}/Tallinn-House2.jpeg`,
    images: [
      `${cdn}/Tallinn-House1.jpeg`,
      `${cdn}/Tallinn-House7.jpeg`,
      `${cdn}/Tallinn-House3.jpeg`,
      `${cdn}/Tallinn-House5.jpeg`,
      `${cdn}/Tallinn-House6.jpeg`,
      `${cdn}/Tallinn-House8%20(1).jpeg`,
      `${cdn}/Tallinn-House4.jpeg`,
      `${cdn}/Tallinn-House2.jpeg`,
    ],
  },
  {
    slug: "timberline",
    name: "The Timberline",
    locationLabel: "Alpine modern",
    squareFeet: 4524,
    storeys: 2,
    bedrooms: 4,
    bathrooms: 2,
    garageSpaces: 2,
    footprint: "59.8 × 45.2 ft",
    levels: { main: 2156, upper: 2368 },
    structure: "Precision light steel frame",
    planCallouts: [
      "Central kitchen",
      "Four living areas",
      "Four bedrooms",
      "Two-car garage",
    ],
    summary:
      "An expansive two-storey villa pairing strong architectural lines with warm materials, generous living zones, and quiet private rooms.",
    description:
      "The Timberline is a 4,524 sq. ft. study in alpine modernity—generous in scale, disciplined in form, and warmed by tactile materials. Its two-storey composition gives family life room to expand without sacrificing intimacy or architectural clarity.",
    narrative: [
      {
        title: "The kitchen as a destination",
        body:
          "Sleek lines, warm textures, and purposeful lighting shape a kitchen designed for both performance and presence. Integrated appliances and intelligent storage keep the architecture calm, whether the room is hosting a slow breakfast or a late dinner with friends.",
      },
      {
        title: "Private rooms, quietly resolved",
        body:
          "Four light-filled bedrooms become personal sanctuaries through restrained lines, soft material transitions, and just enough indulgence. Each offers a clear place to withdraw, reset, and wake to the changing mountain light.",
      },
      {
        title: "A softer expression of luxury",
        body:
          "Two spa-inspired bathrooms pair precise fixtures with elegant surfaces and diffuse illumination. The effect is deliberately effortless: refined enough to feel special, calm enough to belong to the everyday.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/timberline-house",
    heroImage: `${cdn}/CedarStone1.jpeg`,
    floorPlanImage: `${cdn}/Cedarstone-House2.jpeg`,
    images: [
      `${cdn}/CedarStone1.jpeg`,
      `${cdn}/CedarStone2-91cde53.jpeg`,
      `${cdn}/CedarStone5-327dfa4.jpeg`,
      `${cdn}/CedarStone4-0cfb7d5.jpeg`,
      `${cdn}/CedarStone3-b421131.jpeg`,
      `${cdn}/Cedarstone-House2.jpeg`,
    ],
  },
  {
    slug: "profile",
    name: "The Profile",
    locationLabel: "Modern urban villa",
    squareFeet: 4151,
    storeys: 2,
    bedrooms: 5,
    bathrooms: 3,
    garageSpaces: 2,
    footprint: null,
    levels: { main: 2321, upper: 1830 },
    structure: "Precision light steel frame",
    planCallouts: [
      "Open kitchen + social hub",
      "Garden + pool outlook",
      "Five private bedrooms",
      "Two-car garage",
    ],
    summary:
      "A sculptural modern residence pairing an expansive social floor with garden and pool views, five private bedrooms, and a serene upper retreat.",
    description:
      "The Profile House brings 4,151 sq. ft. of streamlined modern living into sharp architectural focus. An expansive ground-floor social hub gathers the kitchen, dining, and living spaces around long views of the landscaped garden and pool, while the upper level offers a peaceful retreat with five spacious bedrooms and a composed luxury primary suite.",
    narrative: [
      {
        title: "Life gathered at ground level",
        body:
          "The 2,321 sq. ft. ground floor is conceived as one generous social landscape. Kitchen, dining, and living move together with clarity, opening the daily rhythm of the home toward the garden, the pool, and a horizon of natural light.",
      },
      {
        title: "Private space, held above",
        body:
          "Away from the energy below, the upper level becomes a quieter architectural register. Five bedrooms are shaped around privacy, generous proportions, and soft daylight—creating room for family life to expand without losing its sense of calm.",
      },
      {
        title: "A suite with its own atmosphere",
        body:
          "The primary suite is treated as a true retreat: spacious, refined, and deliberately removed from the home’s social core. Restrained materials and carefully framed light give the room a composed sense of luxury that feels effortless rather than ornamental.",
      },
      {
        title: "Precision beneath the profile",
        body:
          "Behind the crisp façade, a light steel frame gives the architecture its strength, accuracy, and enduring performance. The result is a house defined as much by what cannot be seen as by its confident exterior silhouette.",
      },
    ],
    sourceUrl: "/homes/profile",
    heroImage: "/ProfileHouse-1.jpeg",
    floorPlanImage: "/ProfileHouse-8.jpeg",
    images: [
      "/ProfileHouse-1.jpeg",
      "/ProfileHouse-2.jpeg",
      "/ProfileHouse-3.jpeg",
      "/ProfileHouse-4.jpeg",
      "/ProfileHouse-5.jpeg",
      "/ProfileHouse-6.jpeg",
      "/ProfileHouse-7.jpeg",
      "/ProfileHouse-8.jpeg",
    ],
  },
  {
    slug: "laurentian",
    name: "The Laurentian",
    locationLabel: "Light luxury villa",
    squareFeet: 4022,
    storeys: 2,
    bedrooms: 4,
    bathrooms: 4,
    garageSpaces: 2,
    footprint: null,
    levels: { main: 2395, upper: 1627 },
    structure: "Precision light steel frame",
    planCallouts: [
      "Main-level suite + study",
      "Open kitchen + dining",
      "Upper family lounge",
      "Three upper bedrooms",
    ],
    summary:
      "A poised modern villa with a main-level suite, open entertaining spaces, upper family lounge, and a calm, exacting material palette.",
    description:
      "The Laurentian distils 4,022 sq. ft. of living into a poised two-storey composition. Expansive but never excessive, it brings architectural clarity, premium materiality, and intelligent planning together in a home defined by effortless movement and enduring elegance.",
    narrative: [
      {
        title: "A main level without compromise",
        body:
          "The open kitchen, dining, and living rooms form one luminous social sequence. Alongside them, a private bedroom suite and adjacent study create a graceful option for guests or main-level living, while the double garage connects directly into the daily flow of the house.",
      },
      {
        title: "Luxury that lives quietly",
        body:
          "High ceilings and finely judged materials give the interiors presence without spectacle. Integrated technology works in the background, allowing proportion, daylight, and texture to define rooms that look resolved and feel instinctive to inhabit.",
      },
      {
        title: "Privacy above the social plane",
        body:
          "The upper floor gathers three bedrooms, three bathrooms, and a secondary lounge into a private family realm. Expansive glazing and balconies bring sky and distant views into the morning routine, while the lounge offers space for conversation, creative work, or a quiet evening apart.",
      },
      {
        title: "Architecture made personal",
        body:
          "The Laurentian’s disciplined structure is designed to support thoughtful adaptation. Layout, finish, and site response can be tuned to the way its owners live, preserving the clarity of the original idea while making the final home distinctly their own.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/the-laurentian-house",
    heroImage: `${cdn}/Belgium%201.jpg`,
    floorPlanImage: `${cdn}/Belgium%20Footprint.jpg`,
    images: [
      `${cdn}/Belgium%201.jpg`,
      `${cdn}/Belgium%204.jpg`,
      `${cdn}/Belgium%203.jpg`,
      `${cdn}/Belgium%206.jpg`,
      `${cdn}/Belgium%205.jpg`,
      `${cdn}/Belgium%202.jpg`,
      `${cdn}/Belgium%20Living%20Room.jpg`,
      `${cdn}/Belgium%20Footprint.jpg`,
    ],
  },
  {
    slug: "dalton",
    name: "The Dalton",
    locationLabel: "Family villa",
    squareFeet: 3937,
    storeys: 2,
    bedrooms: 5,
    bathrooms: 3,
    garageSpaces: 2,
    footprint: "61 × 42 ft",
    levels: { main: 1910, upper: 2027 },
    structure: "Precision light steel frame",
    planCallouts: [
      "Open social core",
      "Ground-level alfresco",
      "Five upper bedrooms",
      "Two-car garage",
    ],
    summary:
      "A generous family residence balancing connection and privacy through seamless social rooms, five bedrooms, and an alfresco-focused ground floor.",
    description:
      "The Dalton is modern family living drawn with unusual composure. Across 3,937 sq. ft., light, generous proportions, and intelligent zoning create a residence that can hold the energy of a full household while preserving moments of genuine retreat.",
    narrative: [
      {
        title: "Grounded in connection",
        body:
          "The ground floor opens with a refined living room before moving naturally through kitchen, dining, and lounge. Broad sliding doors extend this social sequence to the alfresco terrace, turning everyday meals and summer evenings into one continuous indoor-outdoor experience.",
      },
      {
        title: "Together, with room to breathe",
        body:
          "The open plan is calibrated for a larger family: sightlines remain generous and movement feels effortless, yet subtle shifts in scale create quieter pockets for reading, conversation, or a moment away from the centre of activity.",
      },
      {
        title: "Five individual sanctuaries",
        body:
          "Upstairs, five bedrooms are arranged with an intuitive sense of privacy. The primary suite pairs elegant proportions with a spa-inspired ensuite, while the remaining rooms flex between family, guests, and creative work without feeling secondary.",
      },
      {
        title: "Warmth held by precision",
        body:
          "Tactile materials soften the exactness of the architecture, giving the house a character that is both contemporary and lasting. The Dalton is designed not simply to make an impression, but to gather years of family life with grace.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/dalton-home",
    heroImage: `${cdn}/Kunming1.jpeg`,
    floorPlanImage: `${cdn}/Kunming2.jpeg`,
    images: [
      `${cdn}/Kunming1.jpeg`,
      `${cdn}/Dalton%201.jpeg`,
      `${cdn}/Kunming5.jpeg`,
      `${cdn}/Kunming4.jpeg`,
      `${cdn}/Kunming3.jpeg`,
      `${cdn}/Kunming7.jpeg`,
      `${cdn}/Kunming8.jpeg`,
      `${cdn}/Kunming2.jpeg`,
    ],
  },
  {
    slug: "south-bay",
    name: "The South Bay",
    locationLabel: "Coastal contemporary",
    squareFeet: 3878,
    storeys: 2,
    bedrooms: 5,
    bathrooms: 4,
    garageSpaces: 2,
    footprint: null,
    levels: { main: 2259, upper: 1619 },
    structure: "Precision light steel frame",
    planCallouts: [
      "Two living rooms",
      "Central kitchen",
      "Five bedrooms",
      "Dual garages",
    ],
    summary:
      "A sophisticated two-storey home with five bedrooms, dual living rooms, and an open architectural language made for relaxed entertaining.",
    description:
      "The South Bay is a confident modern residence shaped around openness, elegance, and ease. Its 3,878 sq. ft. plan gives contemporary family life a sophisticated setting, pairing clean architectural lines with generous rooms designed to work beautifully every day.",
    narrative: [
      {
        title: "A house made for gathering",
        body:
          "Two expansive living rooms offer distinct settings for conversation, celebration, and retreat, while the fully appointed kitchen anchors them as the home’s natural centre. Five bedrooms provide equal generosity for family and guests without diminishing the openness of the shared spaces.",
      },
      {
        title: "Performance beneath the polish",
        body:
          "Four considered bathrooms, dual garages, and meaningful storage bring order to the practical side of the plan. Behind the refined finishes, precision light steel framing supports durability, energy performance, and a long architectural life with less demand for maintenance.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/the-south-bay-house",
    heroImage: `/SouthBay-1.jpeg`,
    floorPlanImage: `/SouthBay-8.jpeg`,
    images: [
      `/SouthBay-1.jpeg`,
      `/SouthBay-2.jpeg`,
      `/SouthBay-3.jpeg`,
      `/SouthBay-4.jpeg`,
      `/SouthBay-5.jpeg`,
      `/SouthBay-6.jpeg`,
      `/SouthBay-7.jpeg`,
    ],
  },
  {
    slug: "boreal",
    name: "The Boreal",
    locationLabel: "Northern modern",
    squareFeet: 3788,
    storeys: 2,
    bedrooms: 4,
    bathrooms: 4,
    garageSpaces: 2,
    footprint: null,
    levels: { main: null, upper: null },
    structure: "Precision light steel frame",
    planCallouts: [
      "Four living areas",
      "Chef-oriented kitchen",
      "Four bedroom suites",
      "Two-car garage",
    ],
    summary:
      "A resilient steel-frame residence with four distinct living areas, a chef-oriented kitchen, and a bright, composed two-storey plan.",
    description:
      "The Boreal is a 3,788 sq. ft. expression of northern modernism—architecturally refined, structurally resilient, and generous enough to move between lively gatherings and complete privacy. Four bedrooms, four living areas, and a chef-oriented kitchen give the plan uncommon range.",
    narrative: [
      {
        title: "Strength, made invisible",
        body:
          "Precision light steel framing gives the Boreal its calm structural confidence. Engineered for demanding wind, snow, and seismic conditions, the system protects the openness of the architecture without allowing performance to dominate the experience of home.",
      },
      {
        title: "Light across every threshold",
        body:
          "Inside, open living volumes dissolve into quieter private rooms. Expansive windows bring daylight deep into the plan, while the sequence of four living areas lets entertaining, family life, and solitary retreat coexist without friction.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/boreal-house",
    heroImage: `${cdn}/Bern-House1.jpeg`,
    floorPlanImage: `${cdn}/Bern-House2.jpeg`,
    images: [
      `${cdn}/Bern-House1.jpeg`,
      `${cdn}/Bern-House6.jpeg`,
      `${cdn}/Bern-House4.jpeg`,
      `${cdn}/Bern-House7.jpeg`,
      `${cdn}/Bern-House2.jpeg`,
    ],
  },
  {
    slug: "canmore",
    name: "Canmore",
    locationLabel: "Mountain modern",
    squareFeet: 3516,
    storeys: 2,
    bedrooms: 4,
    bathrooms: 3,
    garageSpaces: 2,
    footprint: "59 × 59 ft",
    levels: { main: null, upper: null },
    structure: "Precision light steel frame",
    planCallouts: [
      "Island kitchen",
      "Main-level bedroom + study",
      "Three upper bedrooms",
      "Covered porches + balcony",
    ],
    summary:
      "Balanced proportions, sheltered entries, and warm cladding give this open-plan family home an assured presence in rural or urban settings.",
    description:
      "Canmore brings contemporary architecture into quiet alignment with its surroundings. Balanced proportions, broad glazing, and warm, durable materials give the 3,516 sq. ft. home a grounded presence—equally convincing on a neighbourhood street or against a more remote landscape.",
    narrative: [
      {
        title: "A confident first impression",
        body:
          "Horizontal rooflines, paired columns, and sheltered entries give the frontage a sense of permanence without heaviness. Warm cladding softens the composition, while generous windows create a welcoming transparency and keep the detailing deliberately low-maintenance.",
      },
      {
        title: "The kitchen as social landscape",
        body:
          "A generous working island sits at the centre of clear sightlines between kitchen, dining, and living. Full-height cabinetry, integrated storage, broad preparation surfaces, and precise task lighting create a room that performs beautifully while remaining open to conversation and daily life.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/canmore-house",
    heroImage: `${cdn}/Czech-House1.jpeg`,
    floorPlanImage: `${cdn}/Czech-House2%20(1).jpeg`,
    images: [
      `${cdn}/Czech-House1.jpeg`,
      `${cdn}/Czech-House3-f4de673.jpeg`,
      `${cdn}/Czech-House4.jpeg`,
      `${cdn}/Czech-House5.jpeg`,
      `${cdn}/Czech-House6.jpeg`,
      `${cdn}/Czech-House2%20(1).jpeg`,
    ],
  },
  {
    slug: "saturna",
    name: "The Saturna",
    locationLabel: "Streamlined luxury",
    squareFeet: 3469,
    storeys: 2,
    bedrooms: 5,
    bathrooms: 3,
    garageSpaces: 2,
    footprint: null,
    levels: { main: null, upper: null },
    structure: "Precision light steel frame",
    planCallouts: [
      "Three distinct living areas",
      "Ground-floor alfresco room",
      "Private guest suite",
      "Upper primary wing",
    ],
    summary:
      "A streamlined two-storey residence with three living areas, a generous alfresco room, a private guest suite, and an elevated primary wing.",
    description:
      "The Saturna House distils 3,469 sq. ft. of modern living into a confident two-storey composition. Its generous ground floor moves from formal lounge to open family spaces and alfresco living, while a private guest suite and an upper primary wing with a his-and-hers ensuite bring flexibility and quiet luxury to the plan.",
    narrative: [
      {
        title: "Three ways to come together",
        body:
          "Formal lounge, open family room, and upper retreat give the home three distinct social atmospheres. Each supports a different pace—from larger gatherings to quiet evenings—while a consistent palette keeps the architecture composed from room to room.",
      },
      {
        title: "The alfresco room, made essential",
        body:
          "The ground floor opens beyond its glazing to a generous sheltered terrace. Interior and exterior living become one continuous sequence, giving everyday meals and long summer evenings the ease of a room without walls.",
      },
      {
        title: "Hospitality with privacy",
        body:
          "A dedicated guest suite sits comfortably within the main level without becoming part of its social current. The arrangement supports visiting family, multigenerational living, or a private work retreat with equal grace.",
      },
      {
        title: "A wing apart",
        body:
          "Upstairs, the primary suite becomes a private architectural destination. A generous bedroom and his-and-hers ensuite establish a calm morning ritual, separated from the energy of the shared spaces below.",
      },
    ],
    sourceUrl: "/homes/saturna",
    heroImage: "/SaturnaHouse-1.jpeg",
    floorPlanImage: "/SaturnaHouse-13.jpeg",
    images: [
      "/SaturnaHouse-1.jpeg",
      "/SaturnaHouse-2.jpeg",
      "/SaturnaHouse-3.jpeg",
      "/SaturnaHouse-4.jpeg",
      "/SaturnaHouse-5.jpeg",
      "/SaturnaHouse-6.jpeg",
      "/SaturnaHouse-7.jpeg",
      "/SaturnaHouse-8.jpeg",
      "/SaturnaHouse-9.jpeg",
      "/SaturnaHouse-10.jpeg",
      "/SaturnaHouse-11.jpeg",
      "/SaturnaHouse-12.jpeg",
      "/SaturnaHouse-13.jpeg",
    ],
  },
  {
    slug: "cascade",
    name: "The Cascade",
    locationLabel: "Contemporary",
    squareFeet: 3466,
    storeys: 2,
    bedrooms: 4,
    bathrooms: 3,
    garageSpaces: 2,
    footprint: "50 × 40 ft",
    levels: { main: 1790, upper: 1676 },
    structure: "Precision light steel frame",
    planCallouts: [
      "Two living areas",
      "Open kitchen",
      "Four bedrooms",
      "311 sq. ft. outdoor deck",
    ],
    summary:
      "An airy two-storey design with expansive social zones, serene upper quarters, and a broad outdoor deck designed around daily connection.",
    description:
      "The Cascade turns 3,466 sq. ft. into a fluid study of openness and retreat. Two generous living rooms, a precise modern kitchen, and four bedrooms are arranged across a light steel frame with a sense of balance that makes everyday life feel elevated but never overworked.",
    narrative: [
      {
        title: "An open heart",
        body:
          "The principal living rooms are composed as an airy social landscape, generous enough for celebration yet calm enough for an unhurried morning. At its centre, the kitchen balances sculptural clarity with everyday performance, keeping cooking and conversation in the same effortless frame.",
      },
      {
        title: "Retreat above, horizon beyond",
        body:
          "Upstairs, bedrooms and spa-like bathrooms form a quiet private realm, washed in natural light through broad windows. Outside, a 311 sq. ft. deck extends the home toward the landscape—an outdoor room for dining, gathering, or simply taking in the stillness around it.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/cascade-house",
    heroImage: `${cdn}/replicate-prediction-gymkctvv45rg80csnkwvexaq5.png`,
    floorPlanImage: `${cdn}/tilburgvilla-prefab-house-prefab-home-797f90f.jpeg`,
    images: [
      `${cdn}/replicate-prediction-gymkctvv45rg80csnkwvexaq5.png`,
      `${cdn}/tilburgvilla-prefab-house-prefab-home-70e78ca.jpeg`,
      `${cdn}/tilburgvilla-prefab-house-prefab-home-11e6668.jpeg`,
      `${cdn}/tilburgvilla-prefab-house-prefab-home-4526c1a.jpeg`,
      `${cdn}/tilburgvilla-prefab-house-prefab-home-ed356dc.jpeg`,
      `${cdn}/tilburgvilla-prefab-house-prefab-home-797f90f.jpeg`,
    ],
  },
  {
    slug: "maplewood",
    name: "The Maplewood",
    locationLabel: "Urban family",
    squareFeet: 3422,
    storeys: 2,
    bedrooms: 5,
    bathrooms: 4,
    garageSpaces: 2,
    footprint: "62.7 × 33.4 ft",
    levels: { main: 1857, upper: 1566 },
    structure: "Precision light steel frame",
    planCallouts: [
      "Open living + dining",
      "Ground-floor guest room",
      "Five bedrooms total",
      "Double garage",
    ],
    summary:
      "A highly considered five-bedroom plan that turns a narrower footprint into open, naturally lit rooms with exceptional everyday flow.",
    description:
      "The Maplewood transforms a disciplined 3,422 sq. ft. footprint into a home of unexpected generosity. Every square foot is considered, allowing open, light-filled rooms and five bedrooms to support a family as it changes—without surrendering architectural refinement.",
    narrative: [
      {
        title: "A main floor that works beautifully",
        body:
          "Living and dining flow into a modern kitchen as one generous daily setting. A separate laundry, double garage, and ground-floor guest room are integrated without interrupting that openness, giving the plan practical depth and genuine flexibility.",
      },
      {
        title: "Daylight as a material",
        body:
          "Expansive windows draw natural light through the house, brightening circulation and extending the apparent width of each room. The result is an atmosphere that feels airy and composed from morning through evening.",
      },
      {
        title: "Generosity on a narrower lot",
        body:
          "The Maplewood is particularly at home on constrained or unusual sites. Its intelligent proportions preserve privacy and spatial flow, turning a narrower footprint into a sequence of rooms that never feels compromised.",
      },
      {
        title: "Practicality, precisely detailed",
        body:
          "Storage, circulation, and adaptable rooms are treated with the same care as the visible finishes. That discipline gives the home its lasting character: sophisticated to look at, intuitive to live in, and ready to evolve over time.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/maplewood-house",
    heroImage: `${cdn}/Geneva.jpg`,
    floorPlanImage: `${cdn}/Geneva2.jpeg`,
    images: [
      `${cdn}/Geneva.jpg`,
      `${cdn}/Geneva3.jpeg`,
      `${cdn}/Geneva4.jpeg`,
      `${cdn}/Geneva6.jpeg`,
      `${cdn}/Geneva7.jpeg`,
      `${cdn}/Geneva5.jpeg`,
      `${cdn}/Geneva2.jpeg`,
    ],
  },
  {
    slug: "cedarview",
    name: "The Cedarview",
    locationLabel: "West Coast modern",
    squareFeet: 3337,
    storeys: 2,
    bedrooms: 4,
    bathrooms: 3,
    garageSpaces: 2,
    footprint: "56.4 × 43.6 ft",
    levels: { main: 1800, upper: 1539 },
    structure: "Cold-formed light steel frame",
    planCallouts: [
      "Two living areas",
      "Chef-oriented kitchen",
      "Four bedrooms",
      "Two-car garage",
    ],
    summary:
      "A contemporary steel-frame home with full-height glazing, two generous living areas, and a material envelope tuned for Canadian conditions.",
    description:
      "The Cedarview is a 3,337 sq. ft. contemporary residence where structural precision meets a distinctly warm way of living. Two generous living rooms, four bedrooms, and full-height glazing are held within an envelope tuned for comfort, quiet, and Canadian conditions.",
    narrative: [
      {
        title: "Four rooms of stillness",
        body:
          "Each bedroom is designed as a genuine retreat, with the primary suite adding a private ensuite and walk-in wardrobe. Thoughtful insulation and careful room placement soften sound and temperature, creating privacy that can be felt as much as seen.",
      },
      {
        title: "Living in full light",
        body:
          "Full-height windows bring daylight into the open social spaces and hold long views across the interior. The layout remains generous without waste, giving gatherings room to expand while keeping the everyday relationship between kitchen and living beautifully direct.",
      },
      {
        title: "A refined performance envelope",
        body:
          "Water-conscious fixtures and quietly detailed bathrooms sit within a robust cold-formed steel structure. Durable cladding, metal roofing, layered insulation, double glazing, quartz surfaces, and moisture-resistant finishes work together to make longevity feel luxurious rather than technical.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/cedarview-house",
    heroImage: `${cdn}/Harmony-house1.jpeg`,
    floorPlanImage: `${cdn}/Harmony-house2.jpeg`,
    images: [
      `${cdn}/Harmony-house1.jpeg`,
      `${cdn}/Harmony-house6%20(1).jpeg`,
      `${cdn}/Harmony-house5%20(1).jpeg`,
      `${cdn}/Harmony-house3.jpeg`,
      `${cdn}/Harmony-house4%20(1).jpeg`,
      `${cdn}/Harmony-house2.jpeg`,
    ],
  },
  {
    slug: "summit",
    name: "The Summit",
    locationLabel: "Compact luxury",
    squareFeet: 2670,
    storeys: 2,
    bedrooms: 4,
    bathrooms: 4,
    garageSpaces: 2,
    footprint: "55.4 × 35.1 ft",
    levels: { main: 1831, upper: 839 },
    structure: "Precision light steel frame",
    planCallouts: [
      "Two ground-floor lounges",
      "Kitchen + terrace connection",
      "Four bedroom suites",
      "Two-car garage",
    ],
    summary:
      "A compact luxury plan with two lounges, four private bedroom suites, and a seamless relationship between interior living and the terrace.",
    description:
      "The Summit compresses the pleasures of a much larger villa into 2,670 exceptionally resolved square feet. Striking contemporary form, two living rooms, and four ensuite bedrooms create a home that feels open and intimate in equal measure.",
    narrative: [
      {
        title: "Grounded in effortless flow",
        body:
          "Two inviting lounges, dining, and a refined kitchen move naturally toward a sunlit terrace, allowing interior comfort and outdoor life to share one continuous plane. Two ground-floor bedroom suites add privacy and flexibility without stepping away from the home’s social warmth.",
      },
      {
        title: "A kitchen with presence",
        body:
          "Crisp cabinetry, dark timber flooring, and a generous central island give the chef’s kitchen a graphic clarity. It is designed as both working space and gathering place—a bright, exacting room where preparation, conversation, and creativity meet.",
      },
      {
        title: "Calm, elevated",
        body:
          "Upstairs, two further bedrooms each have a private ensuite. Natural light, restrained finishes, and thoughtful separation create a quiet upper retreat where every element feels purposeful and nothing competes for attention.",
      },
      {
        title: "Built beyond the first impression",
        body:
          "The elegance of the plan is supported by precision light steel framing engineered for strength, energy performance, and longevity. That unseen discipline gives the Summit its lasting value: architecture designed to remain beautiful because it is built to endure.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/summit-house",
    heroImage: `${cdn}/New%20House%20Image.png`,
    floorPlanImage: `${cdn}/Killrar-Villa2.jpeg`,
    images: [
      `${cdn}/New%20House%20Image.png`,
      `${cdn}/Killrar-Villa6.jpeg`,
      `${cdn}/Killrar-Villa3.jpeg`,
      `${cdn}/Killrar-Villa4.jpeg`,
      `${cdn}/Killrar-Villa5.jpeg`,
      `${cdn}/Killrar-Villa7.jpeg`,
      `${cdn}/Killrar-Villa2.jpeg`,
    ],
  },
  {
    slug: "aurora",
    name: "The Aurora",
    locationLabel: "Light-filled villa",
    squareFeet: 2486,
    storeys: 2,
    bedrooms: 4,
    bathrooms: 3,
    garageSpaces: null,
    footprint: "36.1 × 34.4 ft",
    levels: { main: null, upper: null },
    structure: "Precision light steel frame",
    planCallouts: [
      "Open social level",
      "Main-floor suite",
      "Three upper bedrooms",
      "Private upper retreat",
    ],
    summary:
      "A light-filled modern villa that separates social space from quiet retreats while maintaining a compact, highly efficient footprint.",
    description:
      "The Aurora is a light-filled two-storey villa that makes 2,486 sq. ft. feel remarkably expansive. Its compact footprint is organized with intuitive clarity, balancing open social rooms below with serene private retreats above.",
    narrative: [
      {
        title: "Two levels, two atmospheres",
        body:
          "The main floor is animated by connection—kitchen, dining, and living flowing together beneath broad expanses of glass. Upstairs, the tempo softens into bedrooms and flexible private space, giving the house a natural rhythm between social energy and quiet restoration.",
      },
      {
        title: "Openness with composure",
        body:
          "Floor-to-ceiling windows and sliding doors pull daylight through the open plan and extend views beyond its compact dimensions. High-performance glazing and a steel-framed core keep the interior calm, comfortable, and acoustically composed through changing seasons.",
      },
      {
        title: "Flexibility behind a crisp façade",
        body:
          "A self-contained main-floor suite supports guests, multigenerational living, or a private work retreat, while the upper bedrooms remain distinctly separate. Layered insulation and noise-reducing assemblies give the clean architectural expression a resilient, quietly protective core.",
      },
    ],
    sourceUrl: "https://housedelivery.ca/aurora-house",
    heroImage: `${cdn}/Capri.jpg`,
    floorPlanImage: `${cdn}/DPBL-25-48-1.jpg`,
    images: [
      `${cdn}/Capri.jpg`,
      `${cdn}/DPBL-25-48-2.jpg`,
      `${cdn}/Capri2.jpg`,
      `${cdn}/Capri3.jpg`,
      `${cdn}/Capri4.jpg`,
      `${cdn}/DPBL-25-48-6.jpg`,
      `${cdn}/DPBL-25-48-1.jpg`,
    ],
  },
] as const satisfies readonly HomeModel[];

export const squareFootageBounds = {
  min: Math.min(...models.map((model) => model.squareFeet)),
  max: Math.max(...models.map((model) => model.squareFeet)),
} as const;
