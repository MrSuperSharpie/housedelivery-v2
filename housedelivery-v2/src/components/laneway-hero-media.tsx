"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "@/app/build-your-home/campaign.module.css";

const mediaRoot = "/media/laneway/";
const desktopPoster = `${mediaRoot}willow-nook-laneway-poster.webp`;
const mobilePoster = `${mediaRoot}willow-nook-laneway-poster-mobile.webp`;
type Connection = EventTarget & { saveData?: boolean };

export function LanewayHeroMedia() {
  const video = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const viewport = window.matchMedia("(max-width: 700px)");
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    let active = true;
    const sync = () => {
      if (!active) return;
      setMobile(viewport.matches);
      if (motion.matches || connection?.saveData) {
        video.current?.pause();
        setSource(null);
        setPlaying(false);
      } else {
        setSource(`${mediaRoot}willow-nook-laneway-opening-trim.mp4`);
      }
    };
    queueMicrotask(sync);
    motion.addEventListener("change", sync);
    viewport.addEventListener("change", sync);
    connection?.addEventListener("change", sync);
    return () => {
      active = false;
      motion.removeEventListener("change", sync);
      viewport.removeEventListener("change", sync);
      connection?.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!source || !element || paused || failed) return;
    let active = true;
    void element.play().catch(() => { if (active) setPaused(true); });
    return () => { active = false; };
  }, [source, paused, failed]);

  return <>
    <div className={`${styles.heroMedia} ${styles.lanewayMedia}`}>
      <picture>
        <source media="(max-width: 700px)" srcSet={mobilePoster} />
        <Image
          src={desktopPoster}
          alt="Willow Nook exterior concept with warm architectural lighting, a landscaped garden and an outdoor terrace"
          fill unoptimized loading="eager" fetchPriority="high" sizes="100vw"
        />
      </picture>
      {source && !failed ? <video
        key={source}
        ref={video}
        src={source}
        poster={mobile ? mobilePoster : desktopPoster}
        autoPlay={!paused} muted loop playsInline preload="metadata"
        aria-hidden="true" tabIndex={-1}
        className={styles.heroVideo} data-playing={playing}
        onPlaying={() => { setPlaying(true); setPaused(false); }}
        onPause={() => setPaused(true)}
        onError={() => { setFailed(true); setPlaying(false); }}
      /> : null}
    </div>
    {source && !failed ? <button
      type="button"
      className={`${styles.videoControl} ${styles.lanewayVideoControl}`}
      aria-label={paused ? "Play background video" : "Pause background video"}
      onClick={() => {
        const element = video.current;
        if (!element) return;
        if (element.paused) void element.play().catch(() => setPaused(true));
        else element.pause();
      }}
    >{paused ? "Play film" : "Pause film"}</button> : null}
  </>;
}
