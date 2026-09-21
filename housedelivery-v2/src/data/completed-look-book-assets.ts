import assets from "@/data/completed-look-book-assets.json";
import type { HomeInclusionLevel, HomeInclusionOption } from "@/data/home-configurator";

export type CompletedLookBookHome = keyof typeof assets;

type CompletedLookBookAsset = {
  level: string;
  optionNumber: string;
  name: string;
  path: string;
};

// Explicit paths allow nested and flat source collections to coexist. Names and
// tiers come from the completed boards, never from another home's packages.
// Source filenames, hashes and the Saturna corrections are recorded in
// docs/audit/look-book-assets-2026-09-15.csv.
export function getCompletedLookBookOptions(
  home: CompletedLookBookHome,
  categoryId: string,
  categoryTitle: string,
  materialRole: string,
): readonly HomeInclusionOption[] {
  const categories: Record<string, readonly CompletedLookBookAsset[]> = assets[home];
  const categoryAssets = categories[categoryId];
  if (!categoryAssets?.length) {
    throw new Error(`Missing completed Look Book assets: ${home}/${categoryId}`);
  }

  const homeName = home.split("-").map((word) =>
    word.charAt(0).toUpperCase() + word.slice(1),
  ).join(" ");

  return categoryAssets.map((asset) => {
    if (asset.level !== "premium" && asset.level !== "signature") {
      throw new Error(`Invalid Look Book tier: ${home}/${asset.path}`);
    }
    const level: HomeInclusionLevel = asset.level;
    const levelLabel = level === "premium" ? "Premium" : "Signature";

    return {
      id: `${categoryId}-${level}-${asset.optionNumber}`,
      level,
      optionNumber: asset.optionNumber,
      name: asset.name,
      editorial: {
        descriptors: [asset.name, levelLabel, "Composed"],
        storyFragments: [asset.name.toLowerCase(), `${level} finish detailing`],
        materialRole,
      },
      image: {
        // Next's public-file matcher expects reserved filename characters such
        // as '&' to be encoded, while directory separators remain intact.
        src: `/images/homes/${home}/visual-guide/${asset.path.split("/").map(encodeURIComponent).join("/")}`,
        alt: `${levelLabel} ${asset.optionNumber} — ${asset.name}, ${categoryTitle.toLowerCase()} design board for ${homeName} House.`,
        fit: "contain",
        role: "design-board",
        quality: 100,
      },
    };
  });
}
