import type { models } from "@/data/models";

export type CustomHomeSlug = (typeof models)[number]["slug"];
export type HomeGalleryMetadata = { label: string; fit?: "cover" | "contain"; objectPosition?: string };
export type HomeStoryCopy = { kind: "proposed"; text: string; basis: string } | { kind: "approved-excerpt"; narrativeTitle: string; text: string };
export type HomeStoryScene = { id: string; imageId: string; label: string; title: string; copy: HomeStoryCopy };
export type HomeStoryTransition = { from: number; to: number };
export type HomeStoryPresentation =
  | { mode: "cinematic"; scenes: readonly [HomeStoryScene, HomeStoryScene, HomeStoryScene]; transitions: readonly [HomeStoryTransition, HomeStoryTransition] }
  | { mode: "editorial"; scenes: readonly HomeStoryScene[] }
  | { mode: "compact"; scenes: readonly HomeStoryScene[] };
export type CustomHomePresentation = {
  areaScope?: "model" | "combined-residences";
  hero: { valueLine: string; action: "plan" | "design" | "both"; fit?: "cover" | "contain"; objectPosition?: string };
  gallery: Readonly<Record<string, HomeGalleryMetadata>>;
  designImageId?: string;
  inquiryImageId?: string;
  story: HomeStoryPresentation;
};

/** Presentation only. Model facts, approved paragraphs, assets and prices remain authoritative in their existing sources.
 * Image IDs and labels were reviewed in the baseline contact sheets. All new hero/story copy is proposed for Preview review.
 */
export const customHomePresentations = {
  "langley": {
    "hero": {
      "valueLine": "A 6,810 sq. ft. country estate with five bedrooms, generous family spaces and a covered terrace.",
      "action": "design",
      "fit": "cover"
    },
    "gallery": {
      "Ardenvale-House1.jpeg": {
        "label": "Front elevation"
      },
      "Ardenvale-House3.jpeg": {
        "label": "Exterior perspective"
      },
      "Ardenvale-House7.jpeg": {
        "label": "Kitchen and dining volume"
      },
      "Ardenvale-House6.jpeg": {
        "label": "Bedroom view"
      },
      "Ardenvale-House5.jpeg": {
        "label": "Bedroom and dressing area"
      },
      "Ardenvale-House4.jpeg": {
        "label": "Terrace and pool connection"
      },
      "Ardenvale-House8.jpeg": {
        "label": "Study"
      }
    },
    "designImageId": "Ardenvale-House7.jpeg",
    "inquiryImageId": "Ardenvale-House4.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "Ardenvale-House1.jpeg",
          "label": "The arrival",
          "title": "An arrival shaped by light",
          "copy": {
            "kind": "proposed",
            "text": "A double-height entry and expansive glazing establish the scale of the country estate.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "experience",
          "imageId": "Ardenvale-House7.jpeg",
          "label": "The experience",
          "title": "Space, light, and seamless indoor-outdoor flow",
          "copy": {
            "kind": "proposed",
            "text": "Kitchen, dining and family spaces share a generous, light-filled volume.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "lifestyle",
          "imageId": "Ardenvale-House4.jpeg",
          "label": "The lifestyle",
          "title": "The landscape, invited in",
          "copy": {
            "kind": "proposed",
            "text": "The covered terrace opens onto the pool deck, continuing the home beyond its glazing.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "salt-spring": {
    "areaScope": "combined-residences",
    "hero": {
      "valueLine": "Two independent residences, with individual interiors and one coordinated architectural form.",
      "action": "both",
      "fit": "contain"
    },
    "gallery": {
      "salt-spring-hero.jpg": {
        "label": "Paired exterior"
      },
      "salt-spring-living-room.jpg": {
        "label": "Open living and dining"
      },
      "salt-spring-kitchen.jpg": {
        "label": "Kitchen"
      },
      "salt-spring-bathroom.jpg": {
        "label": "Bathroom"
      },
      "salt-spring-bedroom.jpg": {
        "label": "Bedroom"
      },
      "salt-spring-outdoor-living.jpg": {
        "label": "Outdoor living"
      }
    },
    "designImageId": "salt-spring-living-room.jpg",
    "inquiryImageId": "salt-spring-living-room.jpg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "paired-form",
          "imageId": "salt-spring-hero.jpg",
          "label": "The architecture",
          "title": "Independent living, thoughtfully paired",
          "copy": {
            "kind": "proposed",
            "text": "Two independent residences have their own entrances, garages and private interiors within one coordinated form.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "individual-interiors",
          "imageId": "salt-spring-living-room.jpg",
          "label": "The interiors",
          "title": "Individual choices, one coordinated design",
          "copy": {
            "kind": "proposed",
            "text": "Each residence has six independent interior chapters, with shared exterior and glazing selections.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "private-spaces",
          "imageId": "salt-spring-bedroom.jpg",
          "label": "The private spaces",
          "title": "Privacy and function above",
          "copy": {
            "kind": "approved-excerpt",
            "narrativeTitle": "Privacy and function above",
            "text": "The upper level provides the more private areas of each residence, with generous bedrooms, bathrooms and comfortable family spaces arranged to support privacy and functionality."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "solace": {
    "hero": {
      "valueLine": "Five bedrooms and three living rooms, with space to gather and room to retreat.",
      "action": "design",
      "fit": "cover"
    },
    "gallery": {
      "solace-1a.png": {
        "label": "Front elevation"
      },
      "Tallinn-House7.jpeg": {
        "label": "Dining and living volume"
      },
      "Tallinn-House3.jpeg": {
        "label": "Kitchen"
      },
      "Tallinn-House5.jpeg": {
        "label": "Living room and terrace"
      },
      "Tallinn-House6.jpeg": {
        "label": "Bathroom"
      },
      "Tallinn-House8 (1).jpeg": {
        "label": "Entry and stair"
      },
      "Tallinn-House4.jpeg": {
        "label": "Bedroom"
      }
    },
    "designImageId": "Tallinn-House7.jpeg",
    "inquiryImageId": "Tallinn-House5.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "solace-1a.png",
          "label": "The arrival",
          "title": "A composed contemporary form",
          "copy": {
            "kind": "proposed",
            "text": "A contemporary exterior introduces a 5,405 sq. ft. residence with five bedrooms.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "social-heart",
          "imageId": "Tallinn-House7.jpeg",
          "label": "The experience",
          "title": "A continuous social heart",
          "copy": {
            "kind": "proposed",
            "text": "Open dining and living spaces connect through daylight, timber tones and long interior views.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "living-registers",
          "imageId": "Tallinn-House5.jpeg",
          "label": "The living spaces",
          "title": "Living, in several registers",
          "copy": {
            "kind": "proposed",
            "text": "Three distinct living rooms create different settings for gathering and retreat.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "timberline": {
    "hero": {
      "valueLine": "Four living areas and four bedrooms in a 4,524 sq. ft. alpine modern home.",
      "action": "plan",
      "fit": "cover"
    },
    "gallery": {
      "CedarStone1.jpeg": {
        "label": "Front elevation"
      },
      "CedarStone2-91cde53.jpeg": {
        "label": "Living room"
      },
      "CedarStone5-327dfa4.jpeg": {
        "label": "Kitchen"
      },
      "CedarStone4-0cfb7d5.jpeg": {
        "label": "Bedroom"
      },
      "CedarStone3-b421131.jpeg": {
        "label": "Bathroom"
      }
    },
    "designImageId": "CedarStone2-91cde53.jpeg",
    "inquiryImageId": "CedarStone5-327dfa4.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "CedarStone1.jpeg",
          "label": "The architecture",
          "title": "Generous in scale, disciplined in form",
          "copy": {
            "kind": "proposed",
            "text": "Four bedrooms and four living areas are arranged across a 4,524 sq. ft. plan.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "kitchen",
          "imageId": "CedarStone5-327dfa4.jpeg",
          "label": "The interior",
          "title": "The kitchen as a destination",
          "copy": {
            "kind": "proposed",
            "text": "A central kitchen brings the daily living spaces together.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "private-rooms",
          "imageId": "CedarStone4-0cfb7d5.jpeg",
          "label": "The private rooms",
          "title": "Private rooms, quietly resolved",
          "copy": {
            "kind": "approved-excerpt",
            "narrativeTitle": "Private rooms, quietly resolved",
            "text": "Four light-filled bedrooms become personal sanctuaries through restrained lines, soft material transitions, and just enough indulgence."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "profile": {
    "hero": {
      "valueLine": "A generous social floor below, five private bedrooms above.",
      "action": "design",
      "fit": "cover"
    },
    "gallery": {
      "ProfileHouse-1.jpeg": {
        "label": "Front elevation"
      },
      "ProfileHouse-2.jpeg": {
        "label": "Open social floor"
      },
      "ProfileHouse-3.jpeg": {
        "label": "Upper landing and interior"
      },
      "ProfileHouse-4.jpeg": {
        "label": "Living and dining"
      },
      "ProfileHouse-5.jpeg": {
        "label": "Structural reference detail"
      },
      "ProfileHouse-6.jpeg": {
        "label": "Structural reference interior"
      },
      "ProfileHouse-7.jpeg": {
        "label": "Structural reference perspective"
      }
    },
    "designImageId": "ProfileHouse-4.jpeg",
    "inquiryImageId": "ProfileHouse-3.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "ProfileHouse-1.jpeg",
          "label": "The arrival",
          "title": "A sculptural modern profile",
          "copy": {
            "kind": "proposed",
            "text": "The exterior introduces a 4,151 sq. ft. plan with a generous social floor below.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "social-floor",
          "imageId": "ProfileHouse-2.jpeg",
          "label": "The social floor",
          "title": "Life gathered at ground level",
          "copy": {
            "kind": "proposed",
            "text": "Kitchen, dining and living spaces open toward the garden and pool outlook.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "upper-retreat",
          "imageId": "ProfileHouse-3.jpeg",
          "label": "The upper level",
          "title": "Private space, held above",
          "copy": {
            "kind": "proposed",
            "text": "Five bedrooms occupy the upper level, separate from the social spaces below.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "laurentian": {
    "hero": {
      "valueLine": "A main-level suite and study, with three bedrooms and a family lounge above.",
      "action": "plan",
      "fit": "cover"
    },
    "gallery": {
      "Belgium 1.jpg": {
        "label": "Front elevation"
      },
      "Belgium 4.jpg": {
        "label": "Living and dining"
      },
      "Belgium 3.jpg": {
        "label": "Sheltered terrace"
      },
      "Belgium 6.jpg": {
        "label": "Kitchen and outdoor connection"
      },
      "Belgium 5.jpg": {
        "label": "Kitchen"
      },
      "Belgium 2.jpg": {
        "label": "Bedroom"
      },
      "Belgium Living Room.jpg": {
        "label": "Living room perspective"
      }
    },
    "designImageId": "Belgium 4.jpg",
    "inquiryImageId": "Belgium 3.jpg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "Belgium 1.jpg",
          "label": "The arrival",
          "title": "A poised two-storey composition",
          "copy": {
            "kind": "proposed",
            "text": "A main-level suite and study complement the open social rooms.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "social-sequence",
          "imageId": "Belgium 4.jpg",
          "label": "The experience",
          "title": "A main level without compromise",
          "copy": {
            "kind": "proposed",
            "text": "Kitchen, dining and living form one connected social sequence.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "terrace",
          "imageId": "Belgium 3.jpg",
          "label": "The outdoor connection",
          "title": "Room to move beyond the glazing",
          "copy": {
            "kind": "proposed",
            "text": "The sheltered terrace continues the relationship between dining and outdoor space.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "dalton": {
    "hero": {
      "valueLine": "Five bedrooms above, with connected family spaces opening to the alfresco terrace below.",
      "action": "plan",
      "fit": "cover"
    },
    "gallery": {
      "dalton-1a.png": {
        "label": "Front elevation"
      },
      "Dalton 1.jpeg": {
        "label": "Exterior reference"
      },
      "Kunming5.jpeg": {
        "label": "Living and terrace connection"
      },
      "Kunming4.jpeg": {
        "label": "Kitchen and dining"
      },
      "Kunming3.jpeg": {
        "label": "Alfresco terrace"
      },
      "Kunming7.jpeg": {
        "label": "Bedroom"
      },
      "Kunming8.jpeg": {
        "label": "Bathroom"
      }
    },
    "designImageId": "Kunming5.jpeg",
    "inquiryImageId": "Kunming3.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "dalton-1a.png",
          "label": "The arrival",
          "title": "Connection and privacy",
          "copy": {
            "kind": "proposed",
            "text": "A two-storey composition separates five upper bedrooms from the social rooms below.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "social-core",
          "imageId": "Kunming4.jpeg",
          "label": "The experience",
          "title": "Grounded in connection",
          "copy": {
            "kind": "proposed",
            "text": "Kitchen, dining and lounge spaces form the connected ground-floor social core.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "alfresco",
          "imageId": "Kunming3.jpeg",
          "label": "The lifestyle",
          "title": "The alfresco connection",
          "copy": {
            "kind": "proposed",
            "text": "The ground floor opens to an alfresco terrace beside the living spaces.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "south-bay": {
    "hero": {
      "valueLine": "Five bedrooms and two living rooms in a relaxed contemporary plan.",
      "action": "design",
      "fit": "cover"
    },
    "gallery": {
      "SouthBay-1.jpeg": {
        "label": "Front elevation"
      },
      "SouthBay-2.jpeg": {
        "label": "Living room and kitchen"
      },
      "SouthBay-3.jpeg": {
        "label": "Kitchen island"
      },
      "SouthBay-4.jpeg": {
        "label": "Kitchen perspective"
      },
      "SouthBay-5.jpeg": {
        "label": "Stair and living connection"
      },
      "SouthBay-6.jpeg": {
        "label": "Dining area"
      },
      "SouthBay-7.jpeg": {
        "label": "Exterior perspective"
      }
    },
    "designImageId": "SouthBay-2.jpeg",
    "inquiryImageId": "SouthBay-2.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "SouthBay-1.jpeg",
          "label": "The architecture",
          "title": "An open architectural language",
          "copy": {
            "kind": "proposed",
            "text": "The 3,878 sq. ft. plan includes five bedrooms and two living rooms.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "gathering",
          "imageId": "SouthBay-2.jpeg",
          "label": "The interior",
          "title": "A house made for gathering",
          "copy": {
            "kind": "proposed",
            "text": "An open living room connects directly to the central kitchen.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "dining",
          "imageId": "SouthBay-6.jpeg",
          "label": "The daily details",
          "title": "A dining nook in daylight",
          "copy": {
            "kind": "proposed",
            "text": "Glazing brings daylight to the dining nook beside the kitchen.",
            "basis": "New expansion copy: visually reviewed existing approved architectural image; no new technical or commercial claim."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "boreal": {
    "hero": {
      "valueLine": "Four living areas give family life room to gather, work and retreat.",
      "action": "plan",
      "fit": "cover"
    },
    "gallery": {
      "Bern-House1.jpeg": {
        "label": "Front elevation"
      },
      "Bern-House6.jpeg": {
        "label": "Kitchen"
      },
      "Bern-House4.jpeg": {
        "label": "Living and outdoor connection"
      },
      "Bern-House7.jpeg": {
        "label": "Sheltered terrace"
      }
    },
    "designImageId": "Bern-House6.jpeg",
    "inquiryImageId": "Bern-House7.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "Bern-House1.jpeg",
          "label": "The architecture",
          "title": "Strength, made invisible",
          "copy": {
            "kind": "approved-excerpt",
            "narrativeTitle": "Strength, made invisible",
            "text": "Precision light steel framing gives the Boreal its calm structural confidence."
          }
        },
        {
          "id": "living",
          "imageId": "Bern-House4.jpeg",
          "label": "The living spaces",
          "title": "Light across every threshold",
          "copy": {
            "kind": "proposed",
            "text": "Four living areas give the plan different settings for gathering, work and retreat.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "terrace",
          "imageId": "Bern-House7.jpeg",
          "label": "The outdoor connection",
          "title": "Living beyond the glazing",
          "copy": {
            "kind": "proposed",
            "text": "The sheltered terrace continues the relationship between the shared rooms and outdoor space.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "keats": {
    "hero": {
      "valueLine": "Three living areas and four bedrooms, with a generous main level for daily life.",
      "action": "plan",
      "fit": "contain"
    },
    "gallery": {
      "keats-hero.jpeg": {
        "label": "Front elevation"
      },
      "keats-exterior-02.jpeg": {
        "label": "Exterior detail"
      },
      "keats-kitchen-dining.jpeg": {
        "label": "Kitchen and dining"
      },
      "keats-living-room.jpeg": {
        "label": "Interior by the glazing"
      },
      "keats-primary-bathroom.jpeg": {
        "label": "Bathroom"
      },
      "keats-bathroom-02.jpeg": {
        "label": "Interior detail"
      },
      "keats-outdoor-living.jpeg": {
        "label": "Outdoor living"
      }
    },
    "designImageId": "keats-kitchen-dining.jpeg",
    "inquiryImageId": "keats-outdoor-living.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "keats-hero.jpeg",
          "label": "The architecture",
          "title": "Space for daily life",
          "copy": {
            "kind": "proposed",
            "text": "A substantial two-storey plan brings together three living areas and four bedrooms.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "daily-spaces",
          "imageId": "keats-kitchen-dining.jpeg",
          "label": "The interior",
          "title": "Generous spaces for daily life",
          "copy": {
            "kind": "proposed",
            "text": "The main level brings kitchen, dining and living spaces into a connected daily setting.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "outdoor",
          "imageId": "keats-outdoor-living.jpeg",
          "label": "The outdoor connection",
          "title": "A sheltered extension",
          "copy": {
            "kind": "proposed",
            "text": "Outdoor living opens directly from the glazed interior.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "canmore": {
    "hero": {
      "valueLine": "A main-level bedroom and study, with three bedrooms above and sheltered outdoor spaces.",
      "action": "plan",
      "fit": "cover"
    },
    "gallery": {
      "Czech-House1.jpeg": {
        "label": "Front elevation"
      },
      "Czech-House3-f4de673.jpeg": {
        "label": "Entry detail"
      },
      "Czech-House4.jpeg": {
        "label": "Rear elevation"
      },
      "Czech-House5.jpeg": {
        "label": "Kitchen and dining"
      },
      "Czech-House6.jpeg": {
        "label": "Kitchen reference view"
      }
    },
    "designImageId": "Czech-House5.jpeg",
    "inquiryImageId": "Czech-House5.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "Czech-House1.jpeg",
          "label": "The architecture",
          "title": "A confident first impression",
          "copy": {
            "kind": "proposed",
            "text": "Sheltered entries and a main-level bedroom and study support the two-storey plan.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "entry-detail",
          "imageId": "Czech-House3-f4de673.jpeg",
          "label": "The arrival details",
          "title": "Sheltered arrivals",
          "copy": {
            "kind": "approved-excerpt",
            "narrativeTitle": "A confident first impression",
            "text": "Horizontal rooflines, paired columns, and sheltered entries give the frontage a sense of permanence without heaviness."
          }
        },
        {
          "id": "kitchen",
          "imageId": "Czech-House5.jpeg",
          "label": "The interior",
          "title": "The kitchen as social landscape",
          "copy": {
            "kind": "proposed",
            "text": "The working island sits within clear views between kitchen, dining and living.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "saturna": {
    "hero": {
      "valueLine": "A private guest suite, three living areas and an upper primary retreat.",
      "action": "plan",
      "fit": "contain"
    },
    "gallery": {
      "SaturnaHouse-1.jpeg": {
        "label": "Front elevation"
      },
      "SaturnaHouse-2.jpeg": {
        "label": "Entry approach"
      },
      "SaturnaHouse-3.jpeg": {
        "label": "Stair detail"
      },
      "SaturnaHouse-4.jpeg": {
        "label": "Sheltered terrace"
      },
      "SaturnaHouse-5.jpeg": {
        "label": "Bedroom view"
      },
      "SaturnaHouse-6.jpeg": {
        "label": "Living room"
      },
      "SaturnaHouse-7.jpeg": {
        "label": "Living and dining perspective"
      },
      "SaturnaHouse-8.jpeg": {
        "label": "Bathroom"
      },
      "SaturnaHouse-9.jpeg": {
        "label": "Bedroom perspective"
      },
      "SaturnaHouse-10.jpeg": {
        "label": "Kitchen and living"
      },
      "SaturnaHouse-11.jpeg": {
        "label": "Kitchen"
      },
      "SaturnaHouse-12.jpeg": {
        "label": "Upper lounge"
      }
    },
    "designImageId": "SaturnaHouse-6.jpeg",
    "inquiryImageId": "SaturnaHouse-4.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "SaturnaHouse-1.jpeg",
          "label": "The arrival",
          "title": "A confident two-storey composition",
          "copy": {
            "kind": "proposed",
            "text": "A private guest suite and an upper primary retreat sit alongside three living areas.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "gathering",
          "imageId": "SaturnaHouse-7.jpeg",
          "label": "The experience",
          "title": "Three ways to come together",
          "copy": {
            "kind": "proposed",
            "text": "Lounge, family room and upper retreat provide distinct social settings.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "alfresco",
          "imageId": "SaturnaHouse-4.jpeg",
          "label": "The lifestyle",
          "title": "The alfresco room, made essential",
          "copy": {
            "kind": "proposed",
            "text": "The ground floor opens to a sheltered terrace beyond the glazing.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "cascade": {
    "hero": {
      "valueLine": "Two living areas and a 311 sq. ft. deck extend a four-bedroom family plan.",
      "action": "design",
      "fit": "cover"
    },
    "gallery": {
      "replicate-prediction-gymkctvv45rg80csnkwvexaq5.png": {
        "label": "Front elevation"
      },
      "tilburgvilla-prefab-house-prefab-home-70e78ca.jpeg": {
        "label": "Covered deck"
      },
      "tilburgvilla-prefab-house-prefab-home-11e6668.jpeg": {
        "label": "Kitchen and living"
      },
      "tilburgvilla-prefab-house-prefab-home-4526c1a.jpeg": {
        "label": "Kitchen perspective"
      },
      "tilburgvilla-prefab-house-prefab-home-ed356dc.jpeg": {
        "label": "Bedroom"
      }
    },
    "designImageId": "tilburgvilla-prefab-house-prefab-home-11e6668.jpeg",
    "inquiryImageId": "tilburgvilla-prefab-house-prefab-home-70e78ca.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "replicate-prediction-gymkctvv45rg80csnkwvexaq5.png",
          "label": "The architecture",
          "title": "Openness and retreat",
          "copy": {
            "kind": "proposed",
            "text": "Two living areas and four bedrooms are arranged across the 3,466 sq. ft. plan.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "living",
          "imageId": "tilburgvilla-prefab-house-prefab-home-11e6668.jpeg",
          "label": "The interior",
          "title": "An open heart",
          "copy": {
            "kind": "approved-excerpt",
            "narrativeTitle": "An open heart",
            "text": "The principal living rooms are composed as an airy social landscape, generous enough for celebration yet calm enough for an unhurried morning."
          }
        },
        {
          "id": "deck",
          "imageId": "tilburgvilla-prefab-house-prefab-home-70e78ca.jpeg",
          "label": "The outdoor connection",
          "title": "A room beyond the interior",
          "copy": {
            "kind": "proposed",
            "text": "The 311 sq. ft. deck extends the family plan outdoors.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "maplewood": {
    "hero": {
      "valueLine": "Five bedrooms, including a ground-floor guest room, in a carefully arranged family plan.",
      "action": "plan",
      "fit": "cover"
    },
    "gallery": {
      "maplewood-1a.jpg": {
        "label": "Front elevation"
      },
      "Geneva3.jpeg": {
        "label": "Outdoor living"
      },
      "Geneva4.jpeg": {
        "label": "Living room"
      },
      "Geneva6.jpeg": {
        "label": "Kitchen"
      },
      "Geneva7.jpeg": {
        "label": "Bedroom"
      },
      "Geneva5.jpeg": {
        "label": "Lounge"
      }
    },
    "designImageId": "Geneva3.jpeg",
    "inquiryImageId": "Geneva3.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "maplewood-1a.jpg",
          "label": "The architecture",
          "title": "A carefully arranged family plan",
          "copy": {
            "kind": "proposed",
            "text": "Five bedrooms include a ground-floor guest room.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "living",
          "imageId": "Geneva4.jpeg",
          "label": "The interior",
          "title": "A main floor that works beautifully",
          "copy": {
            "kind": "proposed",
            "text": "Living and dining flow toward the kitchen in a connected daily setting.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "outdoor",
          "imageId": "Geneva3.jpeg",
          "label": "The outdoor connection",
          "title": "Daylight as a material",
          "copy": {
            "kind": "proposed",
            "text": "Glazing connects the shared rooms with outdoor living.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "cedarview": {
    "hero": {
      "valueLine": "Full-height glazing and two living areas define a four-bedroom contemporary home.",
      "action": "design",
      "fit": "cover"
    },
    "gallery": {
      "cedar-view-1a.png": {
        "label": "Exterior and glazing"
      },
      "Harmony-house6 (1).jpeg": {
        "label": "Living and dining"
      },
      "Harmony-house5 (1).jpeg": {
        "label": "Bedroom"
      },
      "Harmony-house3.jpeg": {
        "label": "Indoor-outdoor connection"
      },
      "Harmony-house4 (1).jpeg": {
        "label": "Bathroom"
      }
    },
    "designImageId": "Harmony-house6 (1).jpeg",
    "inquiryImageId": "Harmony-house3.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "cedar-view-1a.png",
          "label": "The architecture",
          "title": "Living in full light",
          "copy": {
            "kind": "proposed",
            "text": "Full-height glazing defines the four-bedroom, two-living-area plan.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "social-spaces",
          "imageId": "Harmony-house6 (1).jpeg",
          "label": "The interior",
          "title": "Connected social spaces",
          "copy": {
            "kind": "proposed",
            "text": "Daylight and long interior views connect living, dining and kitchen.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "outdoor",
          "imageId": "Harmony-house3.jpeg",
          "label": "The outdoor connection",
          "title": "Beyond the glazing",
          "copy": {
            "kind": "proposed",
            "text": "The living spaces open toward the outdoor setting.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "mayne": {
    "hero": {
      "valueLine": "Open kitchen, dining and living spaces connect directly to a private deck.",
      "action": "design",
      "fit": "cover"
    },
    "gallery": {
      "mayne-hero.jpg": {
        "label": "Exterior and outdoor connection"
      },
      "mayne-exterior-02.jpg": {
        "label": "Exterior perspective"
      },
      "mayne-bathroom.jpg": {
        "label": "Bathroom"
      },
      "mayne-kitchen.jpg": {
        "label": "Kitchen"
      },
      "mayne-bedroom.jpg": {
        "label": "Bedroom"
      },
      "mayne-living-room.jpg": {
        "label": "Living room"
      }
    },
    "designImageId": "mayne-kitchen.jpg",
    "inquiryImageId": "mayne-living-room.jpg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "mayne-hero.jpg",
          "label": "The architecture",
          "title": "An easy flow to the outdoors",
          "copy": {
            "kind": "proposed",
            "text": "Open living connects to a private deck within the contemporary two-storey plan.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "kitchen",
          "imageId": "mayne-kitchen.jpg",
          "label": "The interior",
          "title": "Kitchen, dining and daily life",
          "copy": {
            "kind": "proposed",
            "text": "The main level brings the shared rooms together around natural light.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "living",
          "imageId": "mayne-living-room.jpg",
          "label": "The living spaces",
          "title": "Open living, in full light",
          "copy": {
            "kind": "proposed",
            "text": "Generous glazing carries daylight through the living room.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "summit": {
    "hero": {
      "valueLine": "Four bedroom suites and two lounges, arranged across 2,670 sq. ft.",
      "action": "plan",
      "fit": "cover"
    },
    "gallery": {
      "New House Image.png": {
        "label": "Front elevation"
      },
      "Killrar-Villa6.jpeg": {
        "label": "Living room"
      },
      "Killrar-Villa3.jpeg": {
        "label": "Terrace"
      },
      "Killrar-Villa4.jpeg": {
        "label": "Kitchen"
      },
      "Killrar-Villa5.jpeg": {
        "label": "Dining and living connection"
      },
      "Killrar-Villa7.jpeg": {
        "label": "Kitchen and dining"
      }
    },
    "designImageId": "Killrar-Villa6.jpeg",
    "inquiryImageId": "Killrar-Villa3.jpeg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "New House Image.png",
          "label": "The architecture",
          "title": "Four suites, two lounges",
          "copy": {
            "kind": "proposed",
            "text": "Four bedroom suites and two living rooms are arranged across 2,670 sq. ft.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "living",
          "imageId": "Killrar-Villa6.jpeg",
          "label": "The interior",
          "title": "Grounded in effortless flow",
          "copy": {
            "kind": "proposed",
            "text": "The shared rooms move naturally between living, dining and kitchen.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "terrace",
          "imageId": "Killrar-Villa3.jpeg",
          "label": "The outdoor connection",
          "title": "A continuous living plane",
          "copy": {
            "kind": "proposed",
            "text": "The terrace continues the relationship between interior comfort and outdoor life.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  },
  "aurora": {
    "hero": {
      "valueLine": "A main-floor suite and three bedrooms above, within a 2,486 sq. ft. villa.",
      "action": "plan",
      "fit": "cover"
    },
    "gallery": {
      "Capri.jpg": {
        "label": "Front elevation"
      },
      "DPBL-25-48-2.jpg": {
        "label": "Entry detail"
      },
      "Capri2.jpg": {
        "label": "Bedroom"
      },
      "Capri3.jpg": {
        "label": "Living room"
      },
      "Capri4.jpg": {
        "label": "Interior work area"
      },
      "DPBL-25-48-6.jpg": {
        "label": "Exterior perspective"
      }
    },
    "designImageId": "Capri3.jpg",
    "inquiryImageId": "Capri3.jpg",
    "story": {
      "mode": "cinematic",
      "scenes": [
        {
          "id": "arrival",
          "imageId": "Capri.jpg",
          "label": "The architecture",
          "title": "Two levels, two atmospheres",
          "copy": {
            "kind": "proposed",
            "text": "A main-floor suite sits below three upper bedrooms in the 2,486 sq. ft. plan.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "living",
          "imageId": "Capri3.jpg",
          "label": "The interior",
          "title": "Openness with composure",
          "copy": {
            "kind": "proposed",
            "text": "Broad glazing brings daylight into the connected social rooms.",
            "basis": "Existing model summary, plan callouts and visually reviewed approved imagery."
          }
        },
        {
          "id": "bedroom",
          "imageId": "Capri2.jpg",
          "label": "The private spaces",
          "title": "Room to retreat",
          "copy": {
            "kind": "proposed",
            "text": "Layered wall finishes and soft lighting frame the bedroom.",
            "basis": "New expansion copy: visually reviewed existing approved architectural image; no new technical or commercial claim."
          }
        }
      ],
      "transitions": [
        {
          "from": 0.23,
          "to": 0.36
        },
        {
          "from": 0.6,
          "to": 0.73
        }
      ]
    }
  }
} as const satisfies Record<CustomHomeSlug, CustomHomePresentation>;
