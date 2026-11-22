"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APPS } from "@/lib/apps";
import { parseHash, routeToHash } from "@/lib/arcadeRoute";
import { WinterMusic, musicWanted, setMusicWanted } from "./music";
import MusicButton from "./MusicButton";
import type { VillageScene } from "./scene/village";
import { ABOUT_ID, SPOTS, spotById } from "./spots";
import WinterCard from "./WinterCard";

/**
 * The winter village style of the site: a papier-mâché village seen from far
 * above, where every app is a building and the log cabin is About.
 *
 * The 3D scene (./scene) only draws; this component owns everything you read:
 * the title, the hover tag, the cards, and a keyboard directory of every
 * building (hidden until it gets focus; shown outright if the browser can't
 * draw WebGL). An open card gets its own URL, `#/card/<app>` or `#/about`, the
 * same card links the arcade uses, so back closes it and a link can be shared.
 *
 * Quiet carols play in the background (./music). Browsers keep a page silent
 * until the visitor first clicks or presses a key, so the music fades in on
 * that first gesture, unless the visitor turned it off on an earlier visit.
 */

type Status = "loading" | "ready" | "failed";

const hashFor = (id: string) => (id === ABOUT_ID ? "#/about" : routeToHash({ view: "inspect", appId: id }));
const idFromHash = (hash: string): string | null => {
  if (hash === "#/about") return ABOUT_ID;
  const r = parseHash(hash);
  return r.view === "inspect" ? r.appId : null;
};

/** The signs are lettered on canvases, so their fonts must be ready before the village is drawn. */
const fontsReady = () =>
  Promise.race([
    Promise.all(['400 40px "Caveat Brush"', '800 40px "Bricolage Grotesque"', '600 20px "Inter Tight"'].map((f) => document.fonts.load(f))).catch(() => undefined),
    new Promise((r) => setTimeout(r, 2500)),
  ]);

export default function WinterVillage() {
  const host = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const scene = useRef<VillageScene | null>(null);
  const pushed = useRef(false);
  const [status, setStatus] = useState<Status>("loading");
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const music = useRef<WinterMusic | null>(null);
  const [playing, setPlaying] = useState(false);

  const openSpot = useCallback((id: string) => {
    const hash = hashFor(id);
    if (window.location.hash !== hash) {
      window.history.pushState(window.history.state, "", window.location.pathname + window.location.search + hash);
      pushed.current = true;
    }
    setOpen(id);
  }, []);

  const close = useCallback(() => {
    // If we added the card's history entry, step back off it (popstate then closes the card),
    // so the back button doesn't have to chew through it later. Otherwise drop the hash in place.
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
      return;
    }
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    setOpen(null);
  }, []);

  // The URL decides which card is open: on load, and on back/forward.
  useEffect(() => {
    const sync = () => {
      const id = idFromHash(window.location.hash);
      setOpen(id && spotById(id) ? id : null);
      if (!id) pushed.current = false;
    };
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  // Build the 3D village once fonts are ready; three.js loads only on this page.
  const events = useRef({ onHover: setHover, onOpen: openSpot, onInteract: () => setTouched(true) });
  useEffect(() => {
    let alive = true;
    let made: VillageScene | null = null;
    (async () => {
      try {
        const [{ VillageScene }] = await Promise.all([import("./scene/village"), fontsReady()]);
        if (!alive || !host.current || !tag.current) return;
        const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        made = new VillageScene(host.current, tag.current, {
          onHover: (id) => events.current.onHover(id),
          onOpen: (id) => events.current.onOpen(id),
          onInteract: () => events.current.onInteract(),
        }, reduced);
        scene.current = made;
        setStatus("ready");
      } catch (err) {
        console.error("The winter village could not start:", err);
        if (alive) setStatus("failed");
      }
    })();
    return () => {
      alive = false;
      made?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.setInteractive(!open);
  }, [open, status]);

  // Start the music on the first click, tap or key press (pointerup, not pointerdown: on a
  // touch screen only the lift counts as a gesture that may start sound).
  useEffect(() => {
    const m = new WinterMusic();
    music.current = m;
    const first = (e: Event) => {
      if ((e.target as Element | null)?.closest?.(".wv-music")) return; // the button decides for itself
      window.removeEventListener("pointerup", first, true);
      window.removeEventListener("keydown", first, true);
      if (musicWanted()) {
        m.start();
        setPlaying(m.isPlaying);
      }
    };
    window.addEventListener("pointerup", first, true);
    window.addEventListener("keydown", first, true);
    return () => {
      window.removeEventListener("pointerup", first, true);
      window.removeEventListener("keydown", first, true);
      m.dispose();
      music.current = null;
    };
  }, []);

  const toggleMusic = () => {
    const m = music.current;
    if (!m) return;
    if (m.isPlaying) m.stop();
    else m.start();
    setMusicWanted(m.isPlaying);
    setPlaying(m.isPlaying);
  };

  const lit = spotById(hover);

  return (
    <main className="wv" data-status={status}>
      <div ref={host} className="wv-stage" />

      <header className="wv-title">
        <p className="wv-eyebrow">Brian Wong</p>
        <h1>Winter Village</h1>
        <p>Every building here is an app or game I made. Look around, then step inside.</p>
      </header>

      {status === "loading" && <div className="wv-loading">Folding the village&hellip;</div>}

      <p className={"wv-hint" + (touched || open || status !== "ready" ? " gone" : "")} aria-hidden="true">
        <span className="pointer-fine">Move your mouse to look around. Click a building to step inside.</span>
        <span className="pointer-coarse">Drag to look around. Tap a building to step inside.</span>
      </p>

      <div
        ref={tag}
        className="wv-tag"
        hidden={!lit || !!open}
        aria-hidden="true"
        style={lit ? ({ "--acc": lit.accent } as React.CSSProperties) : undefined}
      >
        {lit && (
          <>
            <b>{lit.name}</b>
            <span>{lit.tagline}</span>
            <em>
              <span className="pointer-fine">Click</span>
              <span className="pointer-coarse">Tap</span> to step inside
            </em>
          </>
        )}
      </div>

      <nav className={"wv-dir" + (status === "failed" ? " shown" : "")} aria-label="Places in the village">
        <h2>{status === "failed" ? "This browser can't draw the village, so here's everything in it" : "Everything in the village"}</h2>
        <ul>
          {SPOTS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onFocus={() => scene.current?.focus(s.id)}
                onBlur={() => scene.current?.focus(null)}
                onClick={() => openSpot(s.id)}
              >
                {s.name}
                <span>{s.tagline}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <MusicButton playing={playing} onToggle={toggleMusic} />

      {open && <WinterCard key={open} target={open === ABOUT_ID ? "about" : APPS.find((a) => a.id === open)!} onClose={close} />}
    </main>
  );
}
