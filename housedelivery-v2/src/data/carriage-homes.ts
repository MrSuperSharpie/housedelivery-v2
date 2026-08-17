export type CarriageHomeImage = {
  src: string;
  alt: string;
  label: string;
  fit?: "cover" | "contain";
};

export type CarriageHome = {
  slug: string;
  name: string;
  description: string;
  heroStatement: string;
  supportingCopy: string;
  themes: readonly string[];
  images: readonly CarriageHomeImage[];
};

const imageRoot = "/images/carriage-homes";

export const carriageHomes: readonly CarriageHome[] = [
  {
    slug: "willow-nook",
    name: "The Willow Nook",
    description:
      "A compact approximately 40.2 m² home with an efficient one-bedroom layout, central kitchen, living area, bathroom, and practical washing or preparation area.",
    heroStatement: "Everything needed. Nothing wasted.",
    supportingCopy:
      "A compact approximately 40.2 m² residence organized around clear daily routines. A private bedroom and living area sit on opposite sides of a central kitchen, with the bathroom and practical preparation space close at hand.",
    themes: [
      "Compact one-bedroom living",
      "Efficient separation of private and shared space",
      "Central kitchen",
      "Organized, functional daily use",
    ],
    images: [
      {
        src: `${imageRoot}/The-Willow-Nook-1.png`,
        alt: "The Willow Nook exterior in a landscaped garden setting",
        label: "Exterior perspective",
      },
      {
        src: `${imageRoot}/The-Willow-Nook-2.jpg`,
        alt: "The Willow Nook long-side exterior beside a terrace and pool",
        label: "Garden elevation",
      },
      {
        src: `${imageRoot}/The-Willow-Nook-3.jpg`,
        alt: "The Willow Nook exterior viewed across a landscaped garden path",
        label: "Site perspective",
      },
      {
        src: `${imageRoot}/The-Willow-Nook-4.jpg`,
        alt: "The Willow Nook living room interior",
        label: "Living interior",
      },
      {
        src: `${imageRoot}/The-Willow-Nook-5.jpg`,
        alt: "The Willow Nook kitchen interior with dining counter",
        label: "Kitchen study",
      },
      {
        src: `${imageRoot}/The-Willow-Nook-6.jpg`,
        alt: "The Willow Nook kitchen interior with island seating",
        label: "Kitchen perspective",
      },
      {
        src: `${imageRoot}/The-Willow-Nook-7.jpg`,
        alt: "The Willow Nook one-bedroom floor plan",
        label: "Floor plan",
        fit: "contain",
      },
    ],
  },
  {
    slug: "lantern-house",
    name: "The Lantern House",
    description:
      "A practical two-bedroom home with a generous shared living area, kitchen, centrally positioned bathroom, and clear separation between common and private spaces.",
    heroStatement: "Shared space. Private retreat.",
    supportingCopy:
      "A practical two-bedroom home with a generous living room, everyday kitchen, and private bedrooms arranged toward the rear. A centrally positioned bathroom creates an efficient balance between shared life and personal space.",
    themes: [
      "Two-bedroom layout",
      "Spacious shared living area",
      "Central bathroom",
      "Clear separation between common and private rooms",
    ],
    images: [
      {
        src: `${imageRoot}/The-Lantern-House-2.jpg`,
        alt: "The Lantern House exterior in a landscaped carriage-home setting",
        label: "Exterior perspective",
      },
      {
        src: `${imageRoot}/The-Lantern-House-1.jpg`,
        alt: "The Lantern House exterior viewed along a residential lane",
        label: "Arrival perspective",
      },
      {
        src: `${imageRoot}/The-Lantern-House-3.jpg`,
        alt: "Aerial view of multiple Lantern House residences",
        label: "Site study",
      },
      {
        src: `${imageRoot}/The-Lantern-House-4.jpg`,
        alt: "Elevated exterior view of The Lantern House",
        label: "Roof and garden study",
      },
      {
        src: `${imageRoot}/The-Lantern-House-5.jpg`,
        alt: "The Lantern House two-bedroom floor plan",
        label: "Floor plan",
        fit: "contain",
      },
    ],
  },
  {
    slug: "courtyard-cottage",
    name: "The Courtyard Cottage",
    description:
      "A flexible compact housing model designed around efficient daily living, adaptable room configurations, and practical use for backyard, cottage, carriage, and small residential settings.",
    heroStatement: "Small footprint. Flexible possibilities.",
    supportingCopy:
      "A compact housing model shaped around efficient daily living. Its adaptable arrangement can accommodate practical living, kitchen, bedroom, and bathroom spaces while responding to the requirements of the property and project.",
    themes: [
      "Adaptable compact layout",
      "Efficient use of space",
      "Flexible room configuration",
      "Site and project adaptation required",
    ],
    images: [
      {
        src: `${imageRoot}/The-Courtyard-Cottage-1.jpg`,
        alt: "The Courtyard Cottage exterior in a landscaped garden setting",
        label: "Exterior perspective",
      },
      {
        src: `${imageRoot}/The-Courtyard-Cottage-2.jpg`,
        alt: "Elevated view of The Courtyard Cottage and its garden",
        label: "Site perspective",
      },
      {
        src: `${imageRoot}/The-Courtyard-Cottage-3.jpg`,
        alt: "Front exterior view of The Courtyard Cottage",
        label: "Front elevation study",
      },
      {
        src: `${imageRoot}/The-Courtyard-Cottage-4.jpg`,
        alt: "Rear exterior view of The Courtyard Cottage",
        label: "Rear elevation study",
      },
      {
        src: `${imageRoot}/The-Courtyard-Cottage-5.jpg`,
        alt: "The Courtyard Cottage floor plan",
        label: "Floor plan",
        fit: "contain",
      },
    ],
  },
  {
    slug: "heritage-mews",
    name: "The Heritage Mews",
    description:
      "A compact one-bedroom home with a front deck, central living area, integrated kitchen, private bedroom, and ensuite bathroom.",
    heroStatement: "A quieter way to live.",
    supportingCopy:
      "A compact one-bedroom home with a welcoming front deck, central living area, integrated kitchen, and private ensuite bedroom. The layout places the essentials within a clear and comfortable footprint.",
    themes: [
      "One bedroom with ensuite",
      "Integrated kitchen and living space",
      "Transitional front deck",
      "Compact residential, guest, or backyard use",
    ],
    images: [
      {
        src: `${imageRoot}/Heritage-Mews-1.jpg`,
        alt: "The Heritage Mews exterior with an open front deck",
        label: "Exterior perspective",
      },
      {
        src: `${imageRoot}/Heritage-Mews-3.jpg`,
        alt: "Front exterior view of The Heritage Mews at dusk",
        label: "Arrival perspective",
      },
      {
        src: `${imageRoot}/Heritage-Mews-2.jpg`,
        alt: "Side exterior view of The Heritage Mews",
        label: "Side perspective",
      },
      {
        src: `${imageRoot}/Heritage-Mews-4.jpg`,
        alt: "Architectural elevation studies for The Heritage Mews",
        label: "Elevation study",
        fit: "contain",
      },
      {
        src: `${imageRoot}/Heritage-Mews-5.jpg`,
        alt: "The Heritage Mews one-bedroom floor plan",
        label: "Floor plan",
        fit: "contain",
      },
    ],
  },
  {
    slug: "limetree-house",
    name: "Limetree House",
    description:
      "A thoughtfully planned 60.1 m² home designed for compact family living. Limetree includes two bedrooms, a comfortable living area, kitchen, bathroom, and dedicated study space, balancing everyday practicality with an efficient use of space.",
    heroStatement: "Room for life to unfold.",
    supportingCopy:
      "A thoughtfully planned 60.1 m² home for compact family living. Two bedrooms, a comfortable living room, kitchen, bathroom, and dedicated study create a balanced home for approximately three to four occupants.",
    themes: [
      "Two bedrooms",
      "Dedicated study",
      "Approximately 54.74 m² internal area",
      "Efficient family living",
    ],
    images: [
      {
        src: `${imageRoot}/Limetree-1.jpeg`,
        alt: "Limetree House front exterior with a landscaped deck",
        label: "Exterior perspective",
      },
      {
        src: `${imageRoot}/Limetree-2.jpeg`,
        alt: "Limetree House side exterior in a garden setting",
        label: "Garden perspective",
      },
      {
        src: `${imageRoot}/Limetree-3.jpeg`,
        alt: "Limetree House kitchen, dining, and living interior",
        label: "Living interior",
      },
      {
        src: `${imageRoot}/Limetree-4.jpeg`,
        alt: "Limetree House living area with garden access",
        label: "Living perspective",
      },
      {
        src: `${imageRoot}/Limetree-5.jpeg`,
        alt: "Limetree House kitchen and dining interior",
        label: "Kitchen study",
      },
      {
        src: `${imageRoot}/Limetree-6.jpeg`,
        alt: "Limetree House two-bedroom floor plan with dedicated study",
        label: "Floor plan",
        fit: "contain",
      },
    ],
  },
  {
    slug: "moonlight-house",
    name: "Moonlight House",
    description:
      "A compact 57.2 m² two-bedroom home designed around comfort, privacy, and indoor-outdoor living. A welcoming front deck opens into an airy living area and kitchen, while each bedroom includes its own private bathroom.",
    heroStatement: "Privacy, gathered around light.",
    supportingCopy:
      "A compact approximately 57.2 m² home with two bedrooms, each with its own private bathroom. A two-metre front deck leads into an open living room and kitchen, creating an easy relationship between indoor comfort and outdoor space.",
    themes: [
      "Two bedrooms",
      "Two private bathrooms",
      "Open living room and kitchen",
      "Approximately two-metre front deck",
    ],
    images: [
      {
        src: `${imageRoot}/Moonlight-House-1.jpeg`,
        alt: "Moonlight House exterior with illuminated front deck at dusk",
        label: "Exterior perspective",
      },
      {
        src: `${imageRoot}/Moonlight-House-2.jpeg`,
        alt: "Moonlight House front exterior and covered deck at dusk",
        label: "Arrival perspective",
      },
      {
        src: `${imageRoot}/Moonlight-House-3.jpeg`,
        alt: "Moonlight House structural frame during factory production",
        label: "Factory study",
      },
      {
        src: `${imageRoot}/Moonlight-House-4.jpeg`,
        alt: "Moonlight House deck and exterior during factory production",
        label: "Assembly study",
      },
      {
        src: `${imageRoot}/Moonlight-House-5.jpeg`,
        alt: "Moonlight House two-bedroom floor plan with two private bathrooms",
        label: "Floor plan",
        fit: "contain",
      },
    ],
  },
];
