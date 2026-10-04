"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { RARITY, type AppCard } from "@/lib/apps";
import { Sound } from "@/lib/sound";
import {
  REELS_URL,
  SUBJECT_COUNT,
  WORLD_ORDER,
  chapterAt,
  sampleAt,
  type WindowSeatReels,
  type WorldId,
} from "@/lib/showcases/windowSeat";

const FILM = 24;

interface Photo {
  id: number;
  src: string;
  world: WorldId;
  name: string;
  from: string;
  pose: string;
  stars: number;
  total: number;
  bonuses: string[];
}

interface Reticle {
  tag: string;
  moment: string;
}

const stars = (n: number) => (
  <span className="stars" aria-label={`${n} of 4 stars`}>
    {"★".repeat(n)}
    <span className="dim">{"★".repeat(4 - n)}</span>
  </span>
);

/**
 * The full-screen view for the Window Seat card: the card's art window opens
 * up into the game's viewfinder.
 *
 * It plays a reel of real gameplay from one of the three worlds and works like
 * the game's camera. The reticle names whoever is under it and turns gold
 * during a special moment. Pressing the shutter (or Space) takes a photo of
 * the current frame and scores it with the points the game itself gave that
 * frame when the reel was recorded. A roll holds 24 shots, the same as a ride.
 */
export default function WindowSeatShowcase({
  app,
  origin,
  onClose,
}: {
  app: AppCard;
  /** Where the card's art window was on screen, so the viewfinder can grow out of it. */
  origin: DOMRect | null;
  onClose: () => void;
}) {
  const [reels, setReels] = useState<WindowSeatReels | null>(null);
  const [failed, setFailed] = useState(false);
  const [world, setWorld] = useState<WorldId>("ghibli");
  const [film, setFilm] = useState(FILM);
  const [album, setAlbum] = useState<Photo[]>([]);
  const [pop, setPop] = useState<Photo | null>(null);
  const [reticle, setReticle] = useState<Reticle>({ tag: "", moment: "" });
  const [caption, setCaption] = useState("");
  const [toast, setToast] = useState<{ n: number; text: string } | null>(null);
  const [flashN, setFlashN] = useState(0);
  const [filmShake, setFilmShake] = useState(0);

  const vf = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const photoId = useRef(0);
  const popTimer = useRef(0);
  const toastTimer = useRef(0);

  const reel = reels?.worlds[world];

  useEffect(() => {
    let live = true;
    fetch(REELS_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: WindowSeatReels) => live && setReels(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      clearTimeout(popTimer.current);
      clearTimeout(toastTimer.current);
    };
  }, []);

  /* The viewfinder grows out of the card's art window. */
  useLayoutEffect(() => {
    const el = vf.current;
    if (!el || !origin || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const sx = origin.width / r.width;
    const sy = origin.height / r.height;
    const dx = origin.left + origin.width / 2 - (r.left + r.width / 2);
    const dy = origin.top + origin.height / 2 - (r.top + r.height / 2);
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, borderRadius: "40px" },
        { transform: "none", borderRadius: "18px" },
      ],
      { duration: 560, easing: "cubic-bezier(.2,.9,.25,1)" },
    );
  }, [origin]);

  /* What's under the reticle, read from the reel's score timeline 10x a second. */
  useEffect(() => {
    if (!reel) return;
    const id = window.setInterval(() => {
      const v = video.current;
      if (!v) return;
      const t = v.currentTime;
      const s = sampleAt(reel, t);
      setReticle((prev) => {
        const next = s ? { tag: s[6], moment: s[7] } : { tag: "", moment: "" };
        return prev.tag === next.tag && prev.moment === next.moment ? prev : next;
      });
      setCaption(chapterAt(reel, t).caption);
      if (progress.current) progress.current.style.transform = `scaleX(${(t / (v.duration || reel.duration)).toFixed(4)})`;
    }, 100);
    return () => clearInterval(id);
  }, [reel]);

  const say = useCallback((text: string) => {
    clearTimeout(toastTimer.current);
    setToast((t) => ({ n: (t?.n ?? 0) + 1, text }));
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const snap = useCallback(() => {
    const v = video.current;
    if (!reel || !v) return;
    if (film <= 0) {
      setFilmShake((n) => n + 1);
      say("Out of film. Load a new roll to keep shooting.");
      Sound.blip();
      return;
    }
    Sound.shutter();
    setFlashN((n) => n + 1);
    let src = reel.poster;
    try {
      const c = document.createElement("canvas");
      c.width = 400;
      c.height = 300;
      c.getContext("2d")!.drawImage(v, 0, 0, 400, 300);
      src = c.toDataURL("image/jpeg", 0.85);
    } catch {
      /* keep the poster if the frame can't be read */
    }
    const s = sampleAt(reel, v.currentTime);
    const photo: Photo = s
      ? { id: ++photoId.current, src, world, name: s[0], from: s[1], pose: s[2], stars: s[3], total: s[4], bonuses: s[5] }
      : { id: ++photoId.current, src, world, name: "Scenery", from: "A quiet moment", pose: "", stars: 0, total: 0, bonuses: [] };
    const isNew = !!s && !album.some((p) => p.name === photo.name);
    setAlbum((a) => [photo, ...a]);
    setFilm((f) => f - 1);
    setPop(photo);
    clearTimeout(popTimer.current);
    popTimer.current = window.setTimeout(() => setPop(null), 2800);
    if (photo.stars >= 3) window.setTimeout(() => Sound.select(), 160);
    if (isNew) say(`New in your field guide: ${photo.name}`);
  }, [reel, film, world, album, say]);

  const switchWorld = (id: WorldId) => {
    if (id === world) return;
    Sound.flip();
    setWorld(id);
    setReticle({ tag: "", moment: "" });
  };

  const newRoll = () => {
    Sound.select();
    setFilm(FILM);
    setAlbum([]);
    setPop(null);
  };

  /* Space takes a photo, 1–3 change world. (Esc is handled by the arcade.) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) snap();
      }
      const n = ["Digit1", "Digit2", "Digit3"].indexOf(e.code);
      if (n >= 0) switchWorld(WORLD_ORDER[n]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // The album keeps the best shot of each subject, like the game's own album.
  const best = new Map<string, Photo>();
  for (const p of album) if (p.stars > 0 && (!best.get(p.name) || p.total > best.get(p.name)!.total)) best.set(p.name, p);
  const bestShots = [...best.values()].sort((a, b) => b.total - a.total);
  const score = bestShots.reduce((n, p) => n + p.total, 0);
  const rarity = RARITY[app.rarity];

  return (
    <div
      className="showcase"
      role="dialog"
      aria-modal="true"
      aria-label={`${app.name}: gameplay viewfinder`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button className="closex" onClick={onClose}>
        ESC ✕
      </button>
      <div className="sc-layout" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="sc-vf" ref={vf} data-moment={reticle.moment ? "true" : "false"}>
          {reel ? (
            <video
              key={world}
              ref={video}
              src={reel.video}
              poster={reel.poster}
              autoPlay
              muted
              loop
              playsInline
              onClick={snap}
            />
          ) : (
            <div className="sc-loading">{failed ? "The footage didn't load. Try again later." : "LOADING FILM…"}</div>
          )}

          <div className="sc-top">
            <div className="sc-where">
              <b>{reel?.title ?? "Window Seat"}</b>
              <span key={caption} className="sc-caption">
                {caption}
              </span>
            </div>
            <div key={filmShake} className={"sc-film" + (film <= 3 ? " low" : "") + (filmShake ? " shake" : "")}>
              <i /> {film}
              <span className="dim">/{FILM}</span>
            </div>
          </div>

          <div className="sc-reticle" aria-hidden="true">
            <span className="c tl" />
            <span className="c tr" />
            <span className="c bl" />
            <span className="c br" />
            <span className="dot" />
          </div>
          <div className={"sc-tag" + (reticle.tag ? " show" : "")} aria-live="polite">
            {reticle.tag}
            {reticle.moment && <span className="moment">{reticle.moment}</span>}
          </div>

          {toast && (
            <div key={`toast${toast.n}`} className="sc-toast">
              {toast.text}
            </div>
          )}
          {flashN > 0 && <span key={`flash${flashN}`} className="sc-flash" />}

          {pop && (
            <div key={`pop${pop.id}`} className="sc-pop">
              <img src={pop.src} alt={`Your photo: ${pop.name}`} />
              <div className="pp-body">
                <b>{pop.name}</b>
                <span className="pp-from">{pop.from}</span>
                {stars(pop.stars)}
                <span className="pp-pts">
                  {pop.total.toLocaleString()} <small>pts</small>
                </span>
                {(pop.pose ? [pop.pose, ...pop.bonuses.filter((b) => b !== pop.pose)] : pop.bonuses).slice(0, 3).map((b) => (
                  <span key={b} className="pp-bonus">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          {film <= 0 && !pop && (
            <div className="sc-end">
              <b>END OF THE ROLL</b>
              <span>
                {bestShots.length} subjects · {score.toLocaleString()} pts
              </span>
              <button className="sc-btn" onClick={newRoll}>
                ↺ NEW ROLL
              </button>
            </div>
          )}

          <div className="sc-bottom">
            <div className="sc-worlds" role="group" aria-label="World">
              {WORLD_ORDER.map((id, i) => {
                const w = reels?.worlds[id];
                return (
                  <button
                    key={id}
                    className={"sc-world" + (id === world ? " on" : "")}
                    style={{ "--wc": w?.accent ?? "#fff" } as React.CSSProperties}
                    aria-pressed={id === world}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      switchWorld(id);
                    }}
                  >
                    <kbd>{i + 1}</kbd>
                    {w ? w.title : "…"}
                  </button>
                );
              })}
            </div>
            <button
              className="sc-shutter"
              aria-label="Take a photo"
              onClick={(e) => {
                e.currentTarget.blur();
                snap();
              }}
            >
              <i />
            </button>
            <span className="sc-keys">
              <kbd>SPACE</kbd> or click to snap
            </span>
          </div>
          <span className="sc-progress">
            <span ref={progress} />
          </span>
        </div>

        <aside className="sc-side">
          <div className="sc-name">{app.name}</div>
          <span className="drar r-legend" style={{ background: "#fde047", color: "#0b1020" }}>
            {rarity.gem} {rarity.label}
          </span>
          <p className="sc-tagline">{app.tagline}</p>
          <p>{app.blurb}</p>
          <div className="sc-facts">
            <span>
              <b>3</b>WORLDS
            </span>
            <span>
              <b>{SUBJECT_COUNT}</b>SUBJECTS
            </span>
            <span>
              <b>{FILM}</b>SHOTS A ROLL
            </span>
          </div>

          <div className="sc-album">
            <div className="sc-album-head">
              <span>YOUR ALBUM</span>
              <b>{score.toLocaleString()} pts</b>
            </div>
            {bestShots.length ? (
              <div className="sc-thumbs">
                {bestShots.map((p) => (
                  <figure key={p.id} title={`${p.name}: ${p.total.toLocaleString()} pts`}>
                    <img src={p.src} alt={p.name} />
                    <figcaption>
                      {p.name}
                      <span>{"★".repeat(p.stars)}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="sc-empty">
                Wait for someone to step into the reticle, then snap. Gold corners mean a special moment: that&apos;s the
                4-star shot.
              </p>
            )}
            <div className="sc-guide">
              FIELD GUIDE{" "}
              <b>
                {best.size}/{SUBJECT_COUNT}
              </b>
            </div>
          </div>

          <a className="launch" href={app.link} target="_blank" rel="noopener noreferrer">
            ▶ VIEW ON GITHUB
          </a>
        </aside>
      </div>
    </div>
  );
}
