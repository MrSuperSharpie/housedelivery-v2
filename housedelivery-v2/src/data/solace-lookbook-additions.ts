import type { HomeInclusionOption } from "@/data/home-configurator";
import assets from "@/data/solace-lookbook-assets.json";

// Additive choices: production option IDs and version-4 saved LookBooks retain
// their original meaning. New source PNG artwork stays outside deployed assets.
export function getAdditionalSolaceLookBookOptions(
  categoryId: string,
  title: string,
  materialRole: string,
): HomeInclusionOption[] {
  return assets.filter((asset) => asset.categoryId === categoryId).map((asset) => ({
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
      alt: `${asset.level === "premium" ? "Premium" : "Signature"} ${asset.optionNumber} — ${asset.name}, ${title.toLowerCase()} design board for Solace House.`,
      fit: "contain",
      role: "design-board",
      quality: 100,
    },
  }));
}
