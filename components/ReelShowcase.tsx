"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RARITY, type AppCard } from "@/lib/apps";
import { Sound } from "@/lib/sound";

/**
 * The full-screen view for an app with a recorded walkthrough (`app.reel`).
 *
 * The card's art window grows into a browser window playing the walkthrough
 * of the real app. Beside it, the walkthrough's chapters (each step the
 * recording script took) follow along as it plays; clicking one jumps there.
 */
export default function ReelShowcase({
  app,
  origin,
  onClose,
}: {
  app: AppCard;
  /** Where the card's art window was on screen, so the browser window can grow out of it. */
  origin: DOMRect | null;
  onClose: () => void;
}) {
  const reel = app.reel!;
  const win = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [chapter, setChapter] = useState(0);
  const [paused, setPaused] = useState(false);

  /* The window grows out of the card's art window. */
  useLayoutEffect(() => {
    const el = win.current;
    if (!el || !origin || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.animate(
      [
        {
          transform: `translate(${origin.left + origin.width / 2 - (r.left + r.width / 2)}px, ${
            origin.top + origin.height / 2 - (r.top + r.height / 2)
          }px) scale(${origin.width / r.width}, ${origin.height / r.height})`,
          borderRadius: "40px",
        },
        { transform: "none", borderRadius: "14px" },
      ],
      { duration: 560, easing: "cubic-bezier(.2,.9,.25,1)" },
    );
  }, [origin]);

  /* Follow the playhead: which chapter we're in, and the progress bar. */
  useEffect(() => {
    const id = window.setInterval(() => {
      const v = video.current;
      if (!v) return;
      const t = v.currentTime;
      let c = 0;
      reel.chapters.forEach((ch, i) => {
        if (ch.t <= t + 0.05) c = i;
      });
      setChapter(c);
      if (bar.current) bar.current.style.transform = `scaleX(${(t / (v.duration || reel.duration)).toFixed(4)})`;
    }, 100);
    return () => clearInterval(id);
  }, [reel]);

  const jump = (i: number) => {
    const v = video.current;
    if (!v) return;
    Sound.blip();
    v.currentTime = Math.max(0, reel.chapters[i].t - 0.15);
    setChapter(i);
    if (v.paused) v.play().catch(() => {});
  };

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  /* Space pauses and plays. (Esc is handled by the arcade.) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const rarity = RARITY[app.rarity];

  return (
    <div
      className="showcase reel-showcase"
      role="dialog"
      aria-modal="true"
      aria-label={`${app.name}: a walkthrough of the app`}
      style={{ "--accent": app.accent } as React.CSSProperties}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button className="closex" onClick={onClose}>
        ESC ✕
      </button>
      <div className="sc-layout" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="rs-window" ref={win}>
          <div className="rs-bar" aria-hidden="true">
            <i />
            <i />
            <i />
            <span className="rs-url">{reel.url}</span>
          </div>
          <div className="rs-screen">
            <video
              ref={video}
              src={reel.video}
              poster={reel.poster}
              autoPlay
              muted
              loop
              playsInline
              onClick={toggle}
              onPlay={() => setPaused(false)}
              onPause={() => setPaused(true)}
            />
            {paused && <span className="rs-paused">❚❚ PAUSED</span>}
            <span key={chapter} className="rs-caption">
              <b>{reel.chapters[chapter]?.title}</b>
              {reel.chapters[chapter]?.text}
            </span>
          </div>
          <span className="sc-progress">
            <span ref={bar} />
          </span>
        </div>

        <aside className="sc-side">
          <div className="sc-name">{app.name}</div>
          <span className="drar" style={{ background: "#e2e8f0", color: "#0b1020" }}>
            {rarity.gem} {rarity.label}
          </span>
          <p className="sc-tagline">{app.tagline}</p>
          <p>{app.blurb}</p>
          {app.facts && (
            <div className="sc-facts">
              {app.facts.map((f) => (
                <span key={f.label}>
                  <b>{f.value}</b>
                  {f.label}
                </span>
              ))}
            </div>
          )}

          <ol className="rs-chapters" aria-label="Walkthrough">
            {reel.chapters.map((ch, i) => (
              <li key={ch.t}>
                <button className={i === chapter ? "on" : ""} aria-current={i === chapter} onClick={() => jump(i)}>
                  <span className="n">{i + 1}</span>
                  <span className="tx">
                    <b>{ch.title}</b>
                    {ch.text}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <a className="launch" href={app.link} target="_blank" rel="noopener noreferrer">
            ▶ LAUNCH {app.name.toUpperCase()}
          </a>
        </aside>
      </div>
    </div>
  );
}
