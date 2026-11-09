"use client";
import Image from "next/image";
import { LanewayHeroMedia } from "@/components/laneway-hero-media";
import { useEffect, useRef, useState } from "react";
import styles from "@/app/build-your-home/campaign.module.css";
export function CampaignHeroMedia({ laneway }: { laneway: boolean }) {
  return laneway ? <LanewayHeroMedia /> : <ExistingHeroMedia laneway={false} />;
}

function ExistingHeroMedia({ laneway }: { laneway: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { if (media.matches) video.current?.pause(); };
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return <><div className={styles.heroMedia}>
    <Image src={laneway ? "/images/carriage-homes/The-Willow-Nook-1.jpg" : "/Langley-3.avif"} alt={laneway ? "Willow Nook architectural rendering with timber detailing and a sheltered terrace" : "House Delivery interior design reference with natural light and garden views"} fill preload sizes="100vw" quality={95} />
    {!laneway ? <video ref={video} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" className={styles.heroVideo} data-playing={playing} onPlaying={() => setPlaying(true)} onError={() => setPlaying(false)}><source src="/videos/house-delivery-hero.mp4" type="video/mp4" /></video> : null}
  </div>{!laneway ? <button type="button" className={styles.videoControl} aria-label={paused ? "Play background video" : "Pause background video"} onClick={() => { if (video.current?.paused) { void video.current.play(); setPaused(false); } else { video.current?.pause(); setPaused(true); } }}>{paused ? "Play film" : "Pause film"}</button> : null}</>;
}
