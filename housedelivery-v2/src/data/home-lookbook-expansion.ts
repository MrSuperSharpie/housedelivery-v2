import type { HomeInclusionOption } from "@/data/home-configurator";
import assets from "@/data/home-lookbook-assets.json";

export function expandHomeLookBookOptions(
  homeId: string,
  categoryId: string,
  title: string,
  materialRole: string,
  originals: readonly HomeInclusionOption[],
): HomeInclusionOption[] {
  return [
    ...originals.map((option) =>
      homeId === "profile" && categoryId === "primary-wardrobe" && option.optionNumber === "3"
        // Retain the exact legacy option for saved records, outside new galleries.
        ? { ...option, legacyOnly: true }
        : option,
    ),
    ...assets.filter((asset) => asset.homeId === homeId && asset.categoryId === categoryId).map((asset) => ({
      id: asset.id,
      level: asset.level as "premium" | "signature",
      optionNumber: asset.optionNumber,
      name: asset.name,
      editorial: {
        descriptors: [asset.name],
        storyFragments: [asset.name.toLowerCase()],
        materialRole,
      },
      image: {
        src: asset.src,
        alt: `${asset.level === "premium" ? "Premium" : "Signature"} ${asset.optionNumber} — ${asset.name}, ${title.toLowerCase()} design board for ${homeId === "south-bay" ? "South Bay" : homeId.charAt(0).toUpperCase() + homeId.slice(1)} House.`,
        fit: "contain" as const,
        role: "design-board" as const,
        quality: 100 as const,
      },
    })),
  ];
}
