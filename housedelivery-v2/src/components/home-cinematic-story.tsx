"use client";

import { motion, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowDown, Maximize2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type RefObject } from "react";

import type { ResolvedHomeScene, ResolvedHomeStory } from "@/lib/custom-home-presentation";

type Enlarge = (index: number, trigger: HTMLButtonElement) => void;
type StoryProps = {
  modelName: string; modelSlug: string; story: ResolvedHomeStory; fullGalleryId: string; onOpenImage: Enlarge;
  imageQuality: number; unoptimized: boolean; imageSizes: { full: string; pair: string }; imageLoading?: "eager" | "lazy";
};
const stageQuery = "(min-width: 1024px) and (min-height: 700px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
function subscribeStage(callback: () => void) {
  const query = window.matchMedia(stageQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function hasStage() { return window.matchMedia(stageQuery).matches; }
function serverStage() { return false; }
const spring = { type: "spring", stiffness: 280, damping: 28 } as const;

function ChapterCopy({ scene, index }: { scene: ResolvedHomeScene; index: number }) {
  return <><p className="home-story-eyebrow">{String(index + 1).padStart(2, "0")} <span /> {scene.phaseLabel}</p><h3><span>{scene.title}</span></h3><p className="home-story-description">{scene.body}</p></>;
}

function StoryImage({ scene, props, pinned = false }: { scene: ResolvedHomeScene; props: StoryProps; pinned?: boolean }) {
  return <Image src={scene.src} alt={pinned ? "" : scene.alt} fill quality={props.imageQuality} unoptimized={props.unoptimized} sizes={pinned || props.story.mode === "cinematic" ? props.imageSizes.full : props.imageSizes.pair} loading={props.imageLoading ?? "lazy"} className={scene.fit === "contain" ? "object-contain" : "object-cover"} style={scene.objectPosition ? { objectPosition: scene.objectPosition } : undefined} />;
}

function FlowStory({ props }: { props: StoryProps }) {
  return <div className="home-story-flow" data-story-flow={props.story.mode}>
    {props.story.scenes.map((scene, index) => <article key={scene.sceneId} className="home-story-chapter" data-cinematic-chapter={scene.sceneId}>
      <div className="home-story-image">
        <StoryImage scene={scene} props={props} />
        <button type="button" className="home-sequence-enlarge" aria-haspopup="dialog" aria-label={`Enlarge ${props.modelName}: ${scene.phaseLabel}`} data-home-story-image={scene.sceneId} onClick={event => props.onOpenImage(scene.galleryIndex, event.currentTarget)}><Maximize2 size={15} aria-hidden="true" /><span>View larger</span></button>
      </div>
      <div className="home-story-copy"><ChapterCopy scene={scene} index={index} /></div>
    </article>)}
  </div>;
}

function PinnedChapter({ props, scene, index, progress }: { props: StoryProps; scene: ResolvedHomeScene; index: number; progress: MotionValue<number> }) {
  const previous = props.story.transitions[index - 1];
  const next = props.story.transitions[index];
  const range = previous && next ? [0, previous.from, previous.to, next.from, next.to, 1] : next ? [0, next.from, next.to, 1] : previous ? [0, previous.from, previous.to, 1] : [0, 1];
  const values = previous && next ? [0, 0, 1, 1, 0, 0] : next ? [1, 1, 0, 0] : previous ? [0, 0, 1, 1] : [1, 1];
  const opacity = useTransform(progress, range, values);
  const start = previous ? previous.from + 0.04 : 0;
  const end = next ? next.to - 0.03 : 1;
  const scale = useTransform(progress, [start, end], [1.045, 1]);
  const copyY = useTransform(progress, [start, start + 0.12, end], [previous ? 24 : 0, 0, -16]);
  const titleMask = useTransform(progress, [start, start + 0.12], [previous ? "inset(0 0 100% 0)" : "inset(0 0 0% 0)", "inset(0 0 0% 0)"]);
  // Independent copy timing preserves the approved Langley pause between chapters.
  const copyRange = previous && next ? [0, previous.to - 0.04, previous.to + 0.06, next.from - 0.04, next.from + 0.03, 1] : next ? [0, next.from - 0.04, next.from + 0.03, 1] : previous ? [0, previous.to - 0.04, previous.to + 0.06, 1] : [0, 1];
  const copyOpacity = useTransform(progress, copyRange, values);
  return <motion.article className="home-story-chapter" data-cinematic-chapter={scene.sceneId} aria-hidden="true" style={{ opacity }}>
    <div className="home-story-image"><motion.div className="absolute inset-0" style={{ scale }}><StoryImage scene={scene} props={props} pinned /></motion.div></div>
    <motion.div className="home-story-copy" style={{ y: copyY, opacity: copyOpacity }}><p className="home-story-eyebrow">{String(index + 1).padStart(2, "0")} <span /> {scene.phaseLabel}</p><h3><motion.span style={{ clipPath: titleMask }}>{scene.title}</motion.span></h3><p className="home-story-description">{scene.body}</p></motion.div>
  </motion.article>;
}

function PinnedStory({ props, target }: { props: StoryProps; target: RefObject<HTMLDivElement | null> }) {
  const instance = useId();
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const { scrollYProgress } = useScroll({ target, offset: ["start 146px", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 150, damping: 35, mass: 0.6, restDelta: 0.0001 });
  useMotionValueEvent(progress, "change", value => {
    const next = props.story.transitions.filter(window => value >= (window.from + window.to) / 2).length;
    if (activeRef.current !== next) { activeRef.current = next; setActive(next); }
  });
  const scene = props.story.scenes[active];
  return <>
    {/* Complete linear reading equivalent; the overlapping visual layers are decorative. */}
    <ol className="sr-only" aria-label={`${props.modelName} architectural chapters`}>{props.story.scenes.map(item => <li key={item.sceneId}><h3>{item.title}</h3><p>{item.body}</p></li>)}</ol>
    <div className="home-story-stage" data-cinematic-active={scene.sceneId}>
      <div className="home-story-stage-top" aria-hidden="true"><span>{props.modelName} <span className="text-white/65">/ {props.story.scenes.length} perspectives</span></span><ol>{props.story.scenes.map((item, index) => <li key={item.sceneId} data-active={active === index}><span>{String(index + 1).padStart(2, "0")}</span> {item.phaseLabel.replace(/^The /, "")}{active === index ? <motion.i layoutId={`${props.modelSlug}-${instance}-story-marker`} transition={spring} /> : null}</li>)}</ol></div>
      {props.story.scenes.map((item, index) => <PinnedChapter key={item.sceneId} props={props} scene={item} index={index} progress={progress} />)}
      <div className="home-story-grid" aria-hidden="true" />
      <div className="home-story-controls"><motion.a href={`#${props.fullGalleryId}`} whileHover={{ y: -2 }} whileTap={{ y: 0 }} transition={spring}>All architectural views <ArrowDown size={14} aria-hidden="true" /></motion.a><motion.button type="button" data-cinematic-enlarge aria-haspopup="dialog" aria-label={`Enlarge ${props.modelName}: ${scene.phaseLabel}`} onClick={event => props.onOpenImage(scene.galleryIndex, event.currentTarget)} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={spring}><Maximize2 size={15} aria-hidden="true" /> View larger</motion.button></div>
      <motion.div className="home-story-progress" aria-hidden="true" style={{ scaleX: progress }} />
    </div>
  </>;
}

export function HomeCinematicStory(props: StoryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const eligible = useSyncExternalStore(subscribeStage, hasStage, serverStage) && props.story.mode === "cinematic";
  const [fits, setFits] = useState(false);
  useEffect(() => {
    const element = probe.current;
    if (!eligible || !element || typeof ResizeObserver === "undefined") return;
    let live = true;
    const measure = () => {
      if (!live) return;
      const available = window.innerHeight - 162 - 190;
      const tallest = Math.max(...Array.from(element.children, child => child.getBoundingClientRect().height));
      setFits(tallest <= available);
    };
    const observer = new ResizeObserver(measure);
    Array.from(element.children).forEach(child => observer.observe(child));
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure, { passive: true });
    void document.fonts.ready.then(measure);
    return () => { live = false; observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("resize", measure); };
  }, [eligible, props.story.scenes]);
  if (!props.story.scenes.length) return null;
  const pinned = eligible && fits;
  return <div ref={ref} data-home-cinematic-story data-home-story-mode={props.story.mode} data-cinematic-mode={pinned ? "sticky" : "sequence"} className="home-story-story" aria-label={`${props.modelName} architectural story`}>
    {eligible ? <div ref={probe} className="home-story-probe" aria-hidden="true" inert>{props.story.scenes.map((scene, index) => <div key={scene.sceneId} className="home-story-copy home-story-probe-copy"><ChapterCopy scene={scene} index={index} /></div>)}</div> : null}
    {pinned ? <PinnedStory props={props} target={ref} /> : <FlowStory props={props} />}
  </div>;
}
