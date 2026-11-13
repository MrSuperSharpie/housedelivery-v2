import { customHomePresentations, type CustomHomePresentation, type HomeStoryCopy, type HomeStoryTransition } from "@/data/custom-home-presentation";
import type { HomeModel } from "@/data/models";

export type HomeDetailSectionId = "overview" | "gallery" | "finishes-pricing" | "home-inclusions" | "plans" | "film";
export type HomeDetailSection = { id: HomeDetailSectionId; label: string };
export type ResolvedHomeImage = {
  id: string; src: string; alt: string; label: string; fit: "cover" | "contain"; objectPosition?: string;
};
export type ResolvedHomeScene = ResolvedHomeImage & {
  sceneId: string; title: string; body: string; phaseLabel: string; galleryIndex: number;
};
export type ResolvedHomeStory = {
  mode: "cinematic" | "editorial" | "compact";
  scenes: readonly ResolvedHomeScene[];
  transitions: readonly HomeStoryTransition[];
};
export type ResolvedHomePresentation = {
  slug: string;
  areaScope: "model" | "combined-residences";
  hero: CustomHomePresentation["hero"] & { primaryAction: { label: string; href: "#plans" | "#finishes-pricing"; kind: "plan" | "design" } };
  gallery: readonly ResolvedHomeImage[];
  story: ResolvedHomeStory;
  designImage?: ResolvedHomeImage;
  inquiryImage?: ResolvedHomeImage;
  fullGalleryId: string;
  sections: readonly HomeDetailSection[];
  reviewNotes: readonly string[];
};

export function homeImageId(src: string) {
  return decodeURIComponent(src.split("/").at(-1) ?? src);
}

export function customHomeSections({ hasDesignTool, hasVideo }: { hasDesignTool: boolean; hasVideo: boolean }): HomeDetailSection[] {
  const sections: HomeDetailSection[] = [
    { id: "overview", label: "Overview" },
    { id: "gallery", label: "Gallery" },
    { id: "finishes-pricing", label: "Finishes & Pricing" },
  ];
  if (hasDesignTool) sections.push({ id: "home-inclusions", label: "Look Book" });
  sections.push({ id: "plans", label: "Floor Plans" });
  if (hasVideo) sections.push({ id: "film", label: "Video" });
  return sections;
}

function resolveSceneCopy(copy: HomeStoryCopy, model: HomeModel) {
  if (copy.kind === "proposed") return copy.text;
  const approved = model.narrative.find(item => item.title === copy.narrativeTitle);
  return approved?.body.includes(copy.text) ? copy.text : undefined;
}

/** Pure resolver. Unknown models retain the caller's legacy presentation. */
export function resolveCustomHomePresentation(
  model: HomeModel,
  { hasDesignTool = true, definition }: { hasDesignTool?: boolean; definition?: CustomHomePresentation } = {},
): ResolvedHomePresentation | undefined {
  const config = definition ?? (Object.hasOwn(customHomePresentations, model.slug)
    ? (customHomePresentations as Record<string, CustomHomePresentation>)[model.slug]
    : undefined);
  if (!config) return undefined;

  const reviewNotes: string[] = [];
  // Source identity is authoritative; a filename containing "plan" can still
  // be an architectural room view. South Bay's plan is outside its images.
  const gallery = model.images.filter(src => src !== model.floorPlanImage).map(src => {
    const id = homeImageId(src);
    const metadata = config.gallery[id];
    return { id, src, label: metadata?.label ?? "Architectural view", alt: `${model.name}: ${metadata?.label ?? "architectural view"}`, fit: metadata?.fit ?? "cover", ...(metadata?.objectPosition ? { objectPosition: metadata.objectPosition } : {}) } satisfies ResolvedHomeImage;
  });
  const scenes: ResolvedHomeScene[] = [];
  const selected = new Set<string>();
  for (const scene of config.story.scenes) {
    const galleryIndex = gallery.findIndex(image => image.id === scene.imageId);
    const body = resolveSceneCopy(scene.copy, model);
    if (galleryIndex < 0 || body === undefined || selected.has(scene.imageId)) {
      reviewNotes.push(`Story scene ${scene.id} is unavailable; the complete source gallery is retained.`);
      continue;
    }
    selected.add(scene.imageId);
    scenes.push({ ...gallery[galleryIndex], sceneId: scene.id, title: scene.title, body, phaseLabel: scene.label, galleryIndex });
  }
  const validTiming = config.story.mode === "cinematic" && config.story.transitions.every((transition, index, all) => transition.from >= 0 && transition.to <= 1 && transition.from < transition.to && (index === 0 || transition.from > all[index - 1].to));
  const canPin = config.story.mode === "cinematic" && scenes.length === 3 && validTiming;
  const mode = canPin ? "cinematic" : config.story.mode === "compact" || scenes.length === 0 ? "compact" : "editorial";
  const shortName = model.name.replace(/^The\s+/, "").replace(/\s+House$/, "");
  const design = config.hero.action === "design" && hasDesignTool;
  return {
    slug: model.slug,
    areaScope: config.areaScope ?? "model",
    hero: { ...config.hero, primaryAction: { label: design ? `Explore ${shortName} design options` : config.hero.action === "both" ? "Explore both residences" : `Explore the ${shortName} plan`, href: design ? "#finishes-pricing" : "#plans", kind: design ? "design" : "plan" } },
    gallery,
    story: { mode, scenes, transitions: canPin && config.story.mode === "cinematic" ? config.story.transitions : [] },
    designImage: gallery.find(image => image.id === config.designImageId),
    inquiryImage: gallery.find(image => image.id === config.inquiryImageId),
    fullGalleryId: `${model.slug}-full-gallery`,
    sections: customHomeSections({ hasDesignTool, hasVideo: Boolean(model.video) }),
    reviewNotes,
  };
}
