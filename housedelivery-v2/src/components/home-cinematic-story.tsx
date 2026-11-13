"use client";

import {
  motion, useMotionValueEvent, useScroll, useSpring, useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowDown, Maximize2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useSyncExternalStore } from "react";

import type { GalleryImage } from "@/components/home-editorial-gallery";
import type { HomeModel } from "@/data/models";

// Short screens, touch-sized layouts and reduced motion use the same content
// in normal document flow. No wheel/touch interception or scroll snapping.
const stageQuery = "(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)";
function subscribeStage(callback: () => void) {
  const query = window.matchMedia(stageQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function hasStage() { return window.matchMedia(stageQuery).matches; }
function serverStage() { return false; }
const spring = { type: "spring", stiffness: 280, damping: 28 } as const;
const labels = ["The arrival", "The experience", "The lifestyle"];

type Chapter = { image: GalleryImage; title: string; body: string; galleryIndex: number };
type Enlarge = (index: number, trigger: HTMLButtonElement) => void;

function StoryChapter({ chapter, index, progress, sticky, onOpenImage }: {
  chapter: Chapter; index: number; progress: MotionValue<number>; sticky: boolean; onOpenImage: Enlarge;
}) {
  const range = index === 0 ? [0, 0.23, 0.36, 1] : index === 1 ? [0, 0.23, 0.36, 0.60, 0.73, 1] : [0, 0.60, 0.73, 1];
  const opacity = useTransform(progress, range, index === 1 ? [0, 0, 1, 1, 0, 0] : index === 0 ? [1, 1, 0, 0] : [0, 0, 1, 1]);
  const start = index === 0 ? 0 : index === 1 ? 0.27 : 0.64;
  const end = index === 0 ? 0.34 : index === 1 ? 0.70 : 1;
  const scale = useTransform(progress, [start, end], [1.045, 1]);
  const copyY = useTransform(progress, [start, start + 0.12, end], [index === 0 ? 0 : 24, 0, -16]);
  const titleMask = useTransform(progress, [start, start + 0.12], [index === 0 ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)", "inset(0 0 0% 0)"]);
  return (
    <motion.article className="langley-cinematic-chapter" data-cinematic-chapter={index + 1} style={sticky ? { opacity } : undefined}>
      <div className="langley-cinematic-image">
        <motion.div className="absolute inset-0" style={sticky ? { scale } : undefined}>
          <Image src={chapter.image.src} alt={chapter.image.alt} fill quality={95} sizes="(max-width: 1023px) 134vw, (max-width: 1599px) calc(100vw - 96px), 1504px" loading="lazy" className="object-cover" />
        </motion.div>
        <button type="button" className="langley-sequence-enlarge" aria-haspopup="dialog" aria-label={"Enlarge " + labels[index].toLowerCase() + " image"} onClick={(event) => onOpenImage(chapter.galleryIndex, event.currentTarget)}><Maximize2 size={15} aria-hidden="true" /><span>View larger</span></button>
      </div>
      <motion.div className="langley-cinematic-copy" style={sticky ? { y: copyY } : undefined}>
        <p className="langley-cinematic-eyebrow">{String(index + 1).padStart(2, "0")} <span /> {labels[index]}</p>
        <h3><motion.span style={sticky ? { clipPath: titleMask } : undefined}>{chapter.title}</motion.span></h3>
        <p className="langley-cinematic-description">{chapter.body}</p>
      </motion.div>
    </motion.article>
  );
}

export function HomeCinematicStory({ images, narrative = [], summary, onOpenImage }: {
  images: readonly GalleryImage[]; narrative: HomeModel["narrative"]; summary: string; onOpenImage: Enlarge;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sticky = useSyncExternalStore(subscribeStage, hasStage, serverStage);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 146px", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 150, damping: 35, mass: 0.6, restDelta: 0.0001 });
  useMotionValueEvent(progress, "change", (value) => {
    const next = value < 0.30 ? 0 : value < 0.665 ? 1 : 2;
    if (activeRef.current !== next) {
      activeRef.current = next;
      setActive(next);
    }
  });

  if (images.length < 6 || !narrative[0] || !narrative[3]) return null;
  const chapters: Chapter[] = [
    { image: images[0], title: narrative[0].title, body: summary, galleryIndex: 0 },
    { image: images[2], title: "Space, light, and seamless indoor-outdoor flow", body: narrative[0].body, galleryIndex: 2 },
    { image: images[5], title: narrative[3].title, body: narrative[3].body, galleryIndex: 5 },
  ];
  return (
    <div ref={ref} data-home-cinematic-story data-cinematic-mode={sticky ? "sticky" : "sequence"} data-cinematic-active={active + 1} className="langley-cinematic-story" aria-label="The Langley architectural story">
      <div className="langley-cinematic-stage">
        <div className="langley-cinematic-stage-top" aria-hidden="true">
          <span>The Langley <span className="text-white/35">/ Three perspectives</span></span>
          <ol>{labels.map((label, index) => <li key={label} data-active={active === index}><span>0{index + 1}</span> {label.replace("The ", "")}{active === index ? <motion.i layoutId="langley-story-marker" transition={spring} /> : null}</li>)}</ol>
        </div>
        {chapters.map((chapter, index) => <StoryChapter key={chapter.image.src} chapter={chapter} index={index} progress={progress} sticky={sticky} onOpenImage={onOpenImage} />)}
        <div className="langley-cinematic-grid" aria-hidden="true" />
        <div className="langley-cinematic-controls">
          <motion.a href="#langley-full-gallery" whileHover={{ y: -2 }} whileTap={{ y: 0 }} transition={spring}>All architectural views <ArrowDown size={14} aria-hidden="true" /></motion.a>
          <motion.button type="button" data-cinematic-enlarge aria-haspopup="dialog" aria-label={"Enlarge " + labels[active].toLowerCase() + " image"} onClick={(event) => onOpenImage(chapters[active].galleryIndex, event.currentTarget)} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={spring}><Maximize2 size={15} aria-hidden="true" /> View larger</motion.button>
        </div>
        <motion.div className="langley-cinematic-progress" aria-hidden="true" style={sticky ? { scaleX: progress } : undefined} />
      </div>
    </div>
  );
}
