"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveMedia, LiveMoment } from "@/lib/apps";

/**
 * A card's art window playing real footage of the app, with a viewfinder
 * drawn on top: corner brackets, a centre dot, and a film counter.
 *
 * Each footage file comes with the moments a player would photograph (see
 * `LiveMedia.moments`). When playback crosses one, the card "takes the
 * photo": a white flash, the film counter ticks down, and a small polaroid of
 * that exact frame slides in with the subject's name and stars.
 *
 * The video only loads and plays while the card is face-up and on screen.
 */
export function LiveArt({ media, playing }: { media: LiveMedia; playing: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [film, setFilm] = useState(media.film);
  const [shot, setShot] = useState<{ n: number; m: LiveMoment; src: string } | null>(null);
  const shots = useRef(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const active = playing && inView;

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (!active) {
      v.pause();
      return;
    }
    v.play().catch(() => {
      /* autoplay refused (e.g. iOS low-power mode): the poster stays up */
    });

    let raf = 0;
    let last = v.currentTime;
    const tick = () => {
      const t = v.currentTime;
      if (t + 0.5 < last) setFilm(media.film); // looped: a fresh roll
      for (const m of media.moments) if (last < m.t && t >= m.t) snap(m);
      last = t;
      raf = requestAnimationFrame(tick);
    };
    const snap = (m: LiveMoment) => {
      let src = media.poster;
      try {
        const c = document.createElement("canvas");
        c.width = 160;
        c.height = 120;
        c.getContext("2d")!.drawImage(v, 0, 0, 160, 120);
        src = c.toDataURL("image/jpeg", 0.8);
      } catch {
        /* a frame that can't be read leaves the poster in the polaroid */
      }
      shots.current += 1;
      setShot({ n: shots.current, m, src });
      setFilm((f) => Math.max(0, f - 1));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, media]);

  return (
    <div className="live" ref={wrap}>
      <video
        ref={video}
        src={media.video}
        poster={media.poster}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
      />
      <span className="vf-corner tl" />
      <span className="vf-corner tr" />
      <span className="vf-corner bl" />
      <span className="vf-corner br" />
      <span className="vf-dot" />
      <span className="vf-film" aria-hidden="true">
        <i />
        {film}
      </span>
      {shot && <span key={`f${shot.n}`} className="vf-flash" />}
      {shot && (
        <span key={`p${shot.n}`} className="vf-shot" aria-hidden="true">
          <img src={shot.src} alt="" />
          <b>{shot.m.name}</b>
          <em>{"★".repeat(shot.m.stars)}</em>
        </span>
      )}
    </div>
  );
}
