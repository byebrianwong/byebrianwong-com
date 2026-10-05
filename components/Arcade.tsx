"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { APPS, RARITY, type AppCard } from "@/lib/apps";
import {
  PACK_ROUTE,
  parentRoute,
  parseHash,
  routeToHash,
  sameRoute,
  type ArcadeRoute,
} from "@/lib/arcadeRoute";
import { Sound } from "@/lib/sound";
import { Booster, type BoosterHandle } from "./Booster";
import { CardFace } from "./Card";
import ReelShowcase from "./ReelShowcase";
import WindowSeatShowcase from "./WindowSeatShowcase";

/**
 * pack:    the sealed booster, the only thing on screen
 * ripping: the opening plays; once the strip is off, the cards fly out of the
 *          pack into the grid while the empty wrapper falls away
 * cards:   the grid of every app card
 */
type Phase = "pack" | "ripping" | "cards";

/**
 * Key our history entries are stamped under in `history.state`. The screen
 * itself lives in the URL hash; what we keep here is how deep into the arcade
 * an entry sits. That tells the in-app back control whether there's an entry of
 * ours behind it to pop (normal browsing) or whether this is where the tab
 * landed — a reload or a shared link, where `history.back()` would leave the
 * site and we step up in place instead.
 */
const HISTORY_KEY = "arcade";

type ArcadeHistoryState = { depth: number };

const readDepth = (): number => {
  const state = window.history.state as Record<string, unknown> | null;
  const entry = state?.[HISTORY_KEY] as ArcadeHistoryState | undefined;
  return typeof entry?.depth === "number" ? entry.depth : 0;
};

const cssVars = (vars: Record<string, string | number>) => vars as React.CSSProperties;

const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const RAR_COLOR: Record<string, string> = {
  common: "#94a3b8",
  rare: "#e2e8f0",
  holo: "#67e8f9",
  legendary: "#fde047",
};

const ALL_IDS = () => new Set(APPS.map((a) => a.id));

/* imperative confetti/star burst from the center of `host` */
function burst(host: HTMLElement, colors: string[], n = 22) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    p.className = "particle";
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const dist = 120 + Math.random() * 240;
    p.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
    p.style.setProperty("--dy", `${Math.sin(ang) * dist}px`);
    p.style.setProperty("--c", colors[i % colors.length]);
    p.style.setProperty("--s", `${6 + Math.random() * 12}px`);
    p.style.setProperty("--r", `${Math.random() * 360}deg`);
    p.style.animationDelay = `${Math.random() * 0.08}s`;
    host.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

/** A burst of particles at a fixed point on screen. */
function burstAt(x: number, y: number, colors: string[], n: number) {
  const fx = document.createElement("div");
  fx.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:95;pointer-events:none;`;
  document.body.appendChild(fx);
  burst(fx, colors, n);
  setTimeout(() => fx.remove(), 1300);
}

/* ---------------- main component ---------------- */

export default function Arcade() {
  const [phase, setPhase] = useState<Phase>("pack");
  const [dealing, setDealing] = useState(false);
  const [packKey, setPackKey] = useState(0);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [popId, setPopId] = useState<string | null>(null);
  const [inspectApp, setInspectApp] = useState<AppCard | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [showGyro, setShowGyro] = useState(false);
  const [banner, setBanner] = useState<{ variant: "leg" | "holo"; text: string } | null>(null);
  const [bannerN, setBannerN] = useState(0);

  const boosterRef = useRef<BoosterHandle>(null);
  const timeouts = useRef<number[]>([]);
  const flights = useRef<Animation[]>([]);
  const packCenter = useRef({ x: 0, y: 0 });
  const ripId = useRef(0);
  const origin = useRef<DOMRect | null>(null);

  const clearTimers = useCallback(() => {
    timeouts.current.forEach((t) => clearTimeout(t));
    timeouts.current = [];
    flights.current.forEach((a) => a.cancel());
    flights.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  /* ---------------- history / back-button wiring ----------------
     `routeRef` mirrors the entry currently in the address bar. Forward moves
     animate themselves and then record where they landed; back/forward moves
     come in through `popstate` and are applied instantly by `showRoute`. */
  const routeRef = useRef<ArcadeRoute>(PACK_ROUTE);
  const depthRef = useRef(0);

  /** Point the URL at `route`, either as a new history entry or in place. */
  const writeHistory = useCallback((route: ArcadeRoute, mode: "push" | "replace") => {
    // Re-entering the screen we're already on (a double-tap, say) shouldn't
    // stack an identical entry that back would have to chew through.
    const push = mode === "push" && !sameRoute(route, routeRef.current);
    const depth = push ? depthRef.current + 1 : depthRef.current;
    const { pathname, search } = window.location;
    const url = pathname + search + routeToHash(route);
    const state = { ...window.history.state, [HISTORY_KEY]: { depth } };

    if (push) window.history.pushState(state, "", url);
    else window.history.replaceState(state, "", url);

    routeRef.current = route;
    depthRef.current = depth;
  }, []);

  /** Rebuild the arcade at `route` with no transition — how back/forward and a
      reload land on a screen, versus the animated path a click takes. */
  const showRoute = useCallback(
    (route: ArcadeRoute) => {
      clearTimers();
      ripId.current += 1; // an opening still in flight is abandoned
      setPopId(null);
      setBanner(null);
      setDealing(false);

      if (route.view === "pack") {
        setPhase("pack");
        setPackKey((k) => k + 1); // a fresh, sealed pack
        setRevealed(new Set());
        setInspectApp(null);
        return;
      }

      // Cards you've already torn open stay face-up — replaying the deal every
      // time you press back would be a slog.
      setPhase("cards");
      setRevealed(ALL_IDS());
      if (route.view === "inspect") origin.current = null;
      setInspectApp(route.view === "inspect" ? APPS.find((a) => a.id === route.appId) ?? null : null);
    },
    [clearTimers]
  );

  /** Record a screen the user just navigated into (it animates itself). */
  const goTo = useCallback(
    (route: ArcadeRoute) => writeHistory(route, "push"),
    [writeHistory]
  );

  /** In-app back controls defer to real history so the two stay in step. */
  const goBack = useCallback(() => {
    if (depthRef.current > 0) {
      window.history.back();
      return;
    }
    // Nothing of ours behind this entry (deep link or reload): step up a level
    // in place rather than throwing the visitor off the site.
    const up = parentRoute(routeRef.current);
    writeHistory(up, "replace");
    showRoute(up);
  }, [showRoute, writeHistory]);

  /* Adopt whatever the URL says on mount — a shared link, a reload, or coming
     back from /about — and stamp this entry so `goBack` knows where it stands. */
  useEffect(() => {
    const route = parseHash(window.location.hash);
    depthRef.current = readDepth();
    routeRef.current = route;
    writeHistory(route, "replace");
    if (route.view !== "pack") showRoute(route);
  }, [showRoute, writeHistory]);

  useEffect(() => {
    const onPop = () => {
      // The hash is the source of truth: it's validated by `parseHash`, so a
      // hand-edited or stale URL can't push us into an impossible screen.
      const route = parseHash(window.location.hash);
      depthRef.current = readDepth();
      routeRef.current = route;
      showRoute(route);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [showRoute]);

  const fanfare = useCallback((app: AppCard) => {
    const isLeg = app.rarity === "legendary";
    setPopId(app.id);
    timeouts.current.push(window.setTimeout(() => setPopId(null), 600));
    const el = document.querySelector<HTMLElement>(`.cards .card[data-app="${app.id}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      burstAt(
        r.left + r.width / 2,
        r.top + r.height / 2,
        isLeg ? ["#fde047", "#fbbf24", "#fff", "#f59e0b"] : ["#67e8f9", "#a78bfa", "#f472b6", "#fff"],
        34
      );
    }
    setBanner({ variant: isLeg ? "leg" : "holo", text: isLeg ? "★ LEGENDARY! ★" : "✦ HOLO ✦" });
    setBannerN((n) => n + 1);
    Sound.rare();
  }, []);

  /* ---- rip the pack ---- */
  const rip = () => {
    if (phase !== "pack") return;
    clearTimers();
    Sound.select();
    // Claim the entry up front so back during the opening returns to the pack.
    goTo({ view: "cards" });
    window.scrollTo(0, 0);

    if (reducedMotion()) {
      setRevealed(ALL_IDS());
      setPhase("cards");
      return;
    }

    setPhase("ripping");
    const id = ++ripId.current;
    boosterRef.current?.rip((center) => {
      if (id !== ripId.current) return;
      packCenter.current = center;
      burstAt(center.x, center.y, ["#ffd23f", "#f472b6", "#67e8f9", "#fff", "#a78bfa"], 30);
      setDealing(true);
    });
  };

  /* ---- deal: every card flies out of the pack to its slot, flipping as it lands ----
     Runs before paint, so no card is ever seen sitting in its slot first. */
  useLayoutEffect(() => {
    if (!dealing) return;
    const { x, y } = packCenter.current;
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".cards > .card"));
    const firstBig = APPS.find((a) => RARITY[a.rarity].rank >= 2);
    let last = 0;
    cards.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      const spin = (i % 2 ? 1 : -1) * (14 + ((i * 37) % 22));
      const fan = (i - (cards.length - 1) / 2) * 14; // spread them sideways as they rise
      const delay = 40 + i * 55;
      flights.current.push(
        el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0, easing: "cubic-bezier(.2,.8,.4,1)" },
            { transform: `translate(${dx + fan * 0.4}px, ${dy - 70}px) scale(.42) rotate(${spin * 0.2}deg)`, opacity: 1, offset: 0.14, easing: "cubic-bezier(.2,.8,.4,1)" },
            { transform: `translate(${dx * 0.9 + fan}px, ${dy * 0.9 - 200}px) scale(.62) rotate(${spin * 0.5}deg)`, opacity: 1, offset: 0.34, easing: "cubic-bezier(.35,0,.15,1)" },
            { transform: "none", opacity: 1 },
          ],
          { duration: 1050, delay, fill: "backwards" }
        )
      );
      const app = APPS.find((a) => a.id === el.dataset.app);
      const landAt = delay + 800;
      last = Math.max(last, landAt);
      timeouts.current.push(
        window.setTimeout(() => {
          if (!app) return;
          setRevealed((prev) => new Set(prev).add(app.id));
          Sound.flip();
          if (app.id === firstBig?.id) fanfare(app);
        }, landAt)
      );
    });
    timeouts.current.push(
      window.setTimeout(() => {
        setDealing(false);
        setPhase("cards");
      }, last + 500)
    );
  }, [dealing, fanfare]);

  /* Closing the inspect view is a back step: it has its own history entry, so
     Esc and the backdrop pop it rather than editing state behind history's back. */
  const closeInspect = useCallback(() => {
    if (!inspectApp) return;
    Sound.blip();
    goBack();
  }, [inspectApp, goBack]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeInspect();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeInspect]);

  /* gyro availability (touch + sensor) */
  useEffect(() => {
    if (typeof window !== "undefined" && "DeviceOrientationEvent" in window && "ontouchstart" in window) {
      setShowGyro(true);
    }
  }, []);

  const reseal = () => {
    Sound.blip();
    goBack();
  };

  const openInspect = (app: AppCard, cardEl: HTMLElement) => {
    Sound.select();
    origin.current = cardEl.querySelector(".art")?.getBoundingClientRect() ?? null;
    setInspectApp(app);
    goTo({ view: "inspect", appId: app.id });
  };

  /* ---- tilt handlers ---- */
  const tiltCard = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    if (!card.classList.contains("revealed")) return;
    const r = card.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    const px = fx - 0.5;
    const py = fy - 0.5;
    const s = card.style;
    s.setProperty("--mx", px.toFixed(3));
    s.setProperty("--my", py.toFixed(3));
    s.setProperty("--ry", `${px * 22}deg`);
    s.setProperty("--rx", `${-py * 22}deg`);
    s.setProperty("--lift", "22px");
    s.setProperty("--hx", `${(fx * 100).toFixed(1)}%`);
    s.setProperty("--hy", `${(fy * 100).toFixed(1)}%`);
  };

  const enterCard = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    if (!card.classList.contains("revealed")) return;
    card.style.setProperty("--shine", "0.9");
    card.style.setProperty("--glare", "0.75");
    const now = Date.now();
    const last = Number(card.dataset.lasthover || 0);
    if (now - last > 600) {
      Sound.hover();
      card.dataset.lasthover = String(now);
    }
  };

  const leaveCard = (e: React.PointerEvent<HTMLDivElement>, baseShine: number) => {
    const s = e.currentTarget.style;
    s.setProperty("--rx", "0deg");
    s.setProperty("--ry", "0deg");
    s.setProperty("--lift", "0px");
    s.setProperty("--shine", String(baseShine));
    s.setProperty("--glare", "0");
  };

  const inspectTilt = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = e.currentTarget.querySelector<HTMLElement>(".card");
    if (!card) return;
    const b = card.getBoundingClientRect();
    const fx = (e.clientX - b.left) / b.width;
    const fy = (e.clientY - b.top) / b.height;
    card.style.setProperty("--ry", `${(fx - 0.5) * 18}deg`);
    card.style.setProperty("--rx", `${-(fy - 0.5) * 18}deg`);
    card.style.setProperty("--hx", `${(fx * 100).toFixed(1)}%`);
    card.style.setProperty("--hy", `${(fy * 100).toFixed(1)}%`);
    card.style.setProperty("--shine", "0.9");
    card.style.setProperty("--glare", "0.7");
    card.style.setProperty("--lift", "14px");
  };

  const inspectLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = e.currentTarget.querySelector<HTMLElement>(".card");
    if (!card || !inspectApp) return;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--lift", "0px");
    card.style.setProperty("--shine", String(RARITY[inspectApp.rarity].baseShine));
    card.style.setProperty("--glare", "0");
  };

  /* gyro */
  const enableGyro = async () => {
    try {
      const DOE = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">;
      };
      if (typeof DOE.requestPermission === "function") {
        const res = await DOE.requestPermission();
        if (res !== "granted") return;
      }
      window.addEventListener("deviceorientation", (ev: DeviceOrientationEvent) => {
        if (ev.gamma == null || ev.beta == null) return;
        const gx = Math.max(-1, Math.min(1, ev.gamma / 28));
        const gy = Math.max(-1, Math.min(1, (ev.beta - 40) / 28));
        document.querySelectorAll<HTMLElement>(".cards .card.revealed").forEach((card) => {
          card.style.setProperty("--ry", `${gx * 16}deg`);
          card.style.setProperty("--rx", `${-gy * 16}deg`);
          card.style.setProperty("--mx", gx.toFixed(2));
          card.style.setProperty("--my", gy.toFixed(2));
          card.style.setProperty("--hx", `${50 + gx * 45}%`);
          card.style.setProperty("--hy", `${50 + gy * 45}%`);
          card.style.setProperty("--shine", "0.55");
        });
      });
      Sound.blip();
    } catch {
      /* ignore */
    }
  };

  const showcase = inspectApp?.showcase ? inspectApp : null;
  const plainInspect = inspectApp && !inspectApp.showcase ? inspectApp : null;
  const legendaryCount = APPS.filter((a) => a.rarity === "legendary").length;

  return (
    <>
      <button className="sound" title="Toggle sound" onClick={() => setSoundOn(Sound.toggle())}>
        {soundOn ? "🔊" : "🔇"}
      </button>
      {showGyro && phase === "cards" && (
        <button className="gyro-btn" style={{ display: "block" }} onClick={enableGyro}>
          📱 TILT FX
        </button>
      )}

      <div className="stage" data-phase={phase} data-dealing={dealing}>
        <h1 className="sr-only">Brian Wong — The App Arcade</h1>

        {/* THE PACK */}
        {phase !== "cards" && <Booster key={packKey} ref={boosterRef} onRip={rip} />}

        {/* THE CARDS */}
        <section className="reveal" aria-label="Brian's apps">
          <div className="reveal-head">
            <p className="kicker">YOUR PULL</p>
            <div className="pt">
              {APPS.length} APP CARDS
            </div>
            <div className="ps">
              {legendaryCount} legendary · tap any card for a closer look
            </div>
            <button className="back" onClick={reseal}>
              ↺ RESEAL THE PACK
            </button>
          </div>
          <div className="cards">
            {APPS.map((app, i) => {
              const baseShine = RARITY[app.rarity].baseShine;
              const isUp = revealed.has(app.id);
              const cls =
                `card r-${app.rarity}` +
                (app.live ? " has-live" : "") +
                (isUp ? " revealed seen" : "") +
                (popId === app.id ? " pop" : "");
              return (
                <div
                  key={app.id}
                  className={cls}
                  data-app={app.id}
                  style={cssVars({ "--accent": app.accent, "--i": i, "--shine": baseShine })}
                  onPointerMove={tiltCard}
                  onPointerEnter={enterCard}
                  onPointerLeave={(e) => leaveCard(e, baseShine)}
                  onClick={(e) => {
                    if (isUp) openInspect(app, e.currentTarget);
                  }}
                >
                  <div className="float">
                    <div className="tilt">
                      <div className="flipper">
                        <div className="face front">
                          <CardFace app={app} playing={isUp && !inspectApp} />
                        </div>
                        <div className="face back-face">
                          <span className="bhalf" />
                          <span className="bstar">★</span>
                          <span className="bwm">BYEBRIANWONG · ARCADE</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* fanfare banner */}
      {banner && (
        <div
          key={bannerN}
          className={"banner show" + (banner.variant === "holo" ? " holo" : "")}
          onAnimationEnd={() => setBanner(null)}
        >
          <span className="l1">{banner.text}</span>
        </div>
      )}

      {/* a full-screen view built for this app */}
      {showcase?.showcase === "window-seat" && (
        <WindowSeatShowcase app={showcase} origin={origin.current} onClose={closeInspect} />
      )}
      {showcase?.showcase === "reel" && showcase.reel && (
        <ReelShowcase app={showcase} origin={origin.current} onClose={closeInspect} />
      )}

      {/* standard inspect modal */}
      <div
        className={"inspect" + (plainInspect ? " on" : "")}
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("closex"))
            closeInspect();
        }}
      >
        <div className="closex">ESC ✕</div>
        {plainInspect && (
          <>
            <div className="big" onPointerMove={inspectTilt} onPointerLeave={inspectLeave}>
              <div
                className={`card r-${plainInspect.rarity} revealed`}
                style={cssVars({
                  "--accent": plainInspect.accent,
                  "--shine": RARITY[plainInspect.rarity].baseShine,
                })}
              >
                <div className="float" style={{ animation: "none" }}>
                  <div className="tilt">
                    <div className="flipper" style={{ transform: "rotateY(0deg)" }}>
                      <div className="face front">
                        <CardFace app={plainInspect} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="detail">
              <div className={"dh" + (plainInspect.name.length > 11 ? " long" : "")}>{plainInspect.name}</div>
              <span
                className="drar"
                style={{ background: RAR_COLOR[plainInspect.rarity], color: "#0b1020" }}
              >
                {RARITY[plainInspect.rarity].gem} {RARITY[plainInspect.rarity].label}
              </span>
              <p>{plainInspect.blurb}</p>
              <div className="row">
                <span>Type</span>
                <b>{plainInspect.type.toUpperCase()}</b>
              </div>
              <div className="row">
                <span>Reach</span>
                <b>{plainInspect.stats.users} USERS</b>
              </div>
              <div className="row">
                <span>Rating</span>
                <b>★ {plainInspect.stats.rating}</b>
              </div>
              <div className="row">
                <span>Platform</span>
                <b>{plainInspect.stats.platform.toUpperCase()}</b>
              </div>
              <div className="row">
                <span>Launched</span>
                <b>{plainInspect.year}</b>
              </div>
              <a
                className={"launch" + (plainInspect.link === "#" ? " soon" : "")}
                href={plainInspect.link}
                target={plainInspect.link === "#" ? undefined : "_blank"}
                rel={plainInspect.link === "#" ? undefined : "noopener noreferrer"}
                onClick={(e) => {
                  if (plainInspect.link === "#") e.preventDefault();
                }}
              >
                {plainInspect.link === "#"
                  ? "🔒 COMING SOON"
                  : `▶ LAUNCH ${plainInspect.name.toUpperCase()}`}
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}
