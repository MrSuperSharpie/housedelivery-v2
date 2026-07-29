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
  images: readonly CarriageHomeImage[];
};

const imageRoot = "/images/carriage-homes";

export const carriageHomes: readonly CarriageHome[] = [
  {
    slug: "willow-nook",
    name: "The Willow Nook",
    description:
      "A compact approximately 40.2 m² home with an efficient one-bedroom layout, central kitchen, living area, bathroom, and practical washing or preparation area.",
    images: [
      {
        src: `${imageRoot}/The-Willow-Nook-1.jpg`,
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
];
