"use client";

import { useEffect, useId, useRef } from "react";
import AboutBio from "@/components/AboutBio";
import type { AppCard } from "@/lib/apps";

/**
 * The paper card that opens when you step into a building in the winter
 * village. For an app: its walkthrough footage pinned up like a photo, what it
 * is, and a PLAY or LAUNCH button. For the cabin: Brian's bio.
 *
 * It's a modal dialog: focus moves to Close when it opens, Tab stays inside,
 * and Escape, Close or a click outside the card closes it. Focus goes back to
 * wherever it was before.
 */
export default function WinterCard({ target, onClose }: { target: AppCard | "about"; onClose: () => void }) {
  const app = target === "about" ? null : target;
  const accent = app?.accent ?? "#c8463d";
  const titleId = useId();
  const card = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCloseRef.current(); return; }
      if (e.key !== "Tab" || !card.current) return;
      const f = card.current.querySelectorAll<HTMLElement>("a[href], button, video[controls]");
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (before && document.contains(before)) before.focus();
    };
  }, []);

  return (
    <div className="wv-panel" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={card}
        className="wv-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ "--acc": accent } as React.CSSProperties}
      >
        <div className="wv-card-inner">
          <button ref={closeBtn} type="button" className="wv-close" onClick={onClose}>
            Close <span aria-hidden="true">✕</span>
          </button>
          {app ? <AppBody app={app} titleId={titleId} /> : <AboutBody titleId={titleId} />}
        </div>
      </div>
    </div>
  );
}

function AppBody({ app, titleId }: { app: AppCard; titleId: string }) {
  const footage = app.reel ?? app.live;
  const video = useRef<HTMLVideoElement>(null);
  const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (reduced) video.current?.pause();
  }, [reduced]);

  return (
    <div className={"wv-card-grid" + (footage ? "" : " no-photo")}>
      {footage && (
        <figure className="wv-photo">
          <video
            ref={video}
            src={footage.video}
            poster={footage.poster}
            muted
            loop
            playsInline
            autoPlay={!reduced}
            controls={reduced}
            preload="metadata"
            aria-label={`A recording of ${app.name} in use`}
          />
          <figcaption>{app.reel?.url ?? app.live?.url ?? new URL(app.link, "https://x.invalid").host}</figcaption>
        </figure>
      )}
      <div className="wv-card-text">
        <p className="wv-kick">
          {app.type}
          {app.game && !/game/i.test(app.type) ? " game" : ""} · {app.year}
        </p>
        <h2 id={titleId}>{app.name}</h2>
        <p className="wv-tagline">{app.tagline}</p>
        <p className="wv-blurb">{app.blurb}</p>
        {app.facts && app.facts.length > 0 && (
          <ul className="wv-facts" aria-label="By the numbers">
            {app.facts.map((f) => (
              <li key={f.label}>
                <b>{f.value}</b> {f.label.toLowerCase()}
              </li>
            ))}
          </ul>
        )}
        <Go app={app} />
      </div>
    </div>
  );
}

/** Opens the real app in a new tab. Games say PLAY; everything else says LAUNCH. */
function Go({ app }: { app: AppCard }) {
  if (app.link === "#") {
    return (
      <span className="wv-go soon" aria-disabled="true">
        <b>COMING SOON</b>
      </span>
    );
  }
  const url = new URL(app.link);
  const where = url.host + (url.pathname === "/" ? "" : url.pathname);
  return (
    <a
      className="wv-go"
      href={app.link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${app.game ? "Play" : "Launch"} ${app.name} (opens in a new tab)`}
    >
      <b>{app.game ? "PLAY" : "LAUNCH"}</b>
      <span>{where} ↗</span>
    </a>
  );
}

function AboutBody({ titleId }: { titleId: string }) {
  return (
    <div className="wv-about">
      <div className="wv-avatar" aria-hidden="true">
        👋
      </div>
      <p className="wv-kick">The log cabin by the rink</p>
      <h2 id={titleId}>Hi, I&apos;m Brian</h2>
      <div className="wv-bio">
        <AboutBio />
      </div>
      <a className="wv-go" href="https://github.com/byebrianwong" target="_blank" rel="noopener noreferrer" aria-label="Brian on GitHub (opens in a new tab)">
        <b>GITHUB</b>
        <span>github.com/byebrianwong ↗</span>
      </a>
    </div>
  );
}
