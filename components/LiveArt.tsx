"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveMedia, LiveMoment } from "@/lib/apps";

/**
 * A card's art window playing real footage of the app, with a simple overlay
 * drawn on top. The footage comes with the moments where something happens
 * (see `LiveMedia.moments`), and the overlay reacts to them:
 *
 * - "viewfinder" (a photo game): corner brackets, a centre dot and a film
 *   counter. At each moment the card "takes the photo": a white flash, the
 *   counter ticks down, and a small polaroid of that exact frame slides in.
 * - "tags" (a web app): a thin browser bar with the app's address, and a label
 *   naming the current step that changes at each moment.
 *
 * The video only loads and plays while the card is face-up and on screen.
 */
export function LiveArt({ media, playing }: { media: LiveMedia; playing: boolean }) {
  const style = media.style ?? "viewfinder";
  const film0 = media.film ?? 0;
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [film, setFilm] = useState(film0);
  const [shot, setShot] = useState<{ n: number; m: LiveMoment; src: string } | null>(null);
  const [step, setStep] = useState(0);
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
      if (style === "tags") {
        let i = 0;
        media.moments.forEach((m, k) => {
          if (m.t <= t + 0.05) i = k;
        });
        setStep(i);
      } else {
        if (t + 0.5 < last) setFilm(film0); // looped: a fresh roll
        for (const m of media.moments) if (last < m.t && t >= m.t) snap(m);
      }
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
  }, [active, media, style, film0]);

  const tag = media.moments[step];

  return (
    <div className={`live live-${style}`} ref={wrap}>
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
      {style === "viewfinder" ? (
        <>
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
              <em>{"★".repeat(shot.m.stars ?? 0)}</em>
            </span>
          )}
        </>
      ) : (
        <>
          <span className="lt-bar" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>{media.url}</span>
          </span>
          {tag && (
            <span key={`t${step}`} className="lt-tag" aria-hidden="true">
              <b>{tag.name}</b>
              {tag.from && <em>{tag.from}</em>}
            </span>
          )}
        </>
      )}
    </div>
  );
}
