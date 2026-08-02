"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  APPS,
  PACKS,
  RARITY,
  type AppCard,
  type Pack,
} from "@/lib/apps";
import {
  TITLE_ROUTE,
  parentRoute,
  parseHash,
  routeToHash,
  sameRoute,
  type ArcadeRoute,
} from "@/lib/arcadeRoute";
import { Sound } from "@/lib/sound";
import { CardFace } from "./Card";
import { CoinInsert } from "./CoinInsert";

type Phase = "title" | "select" | "opening" | "reveal";

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

const RAR_COLOR: Record<string, string> = {
  common: "#94a3b8",
  rare: "#e2e8f0",
  holo: "#67e8f9",
  legendary: "#fde047",
};

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

/* ---------------- main component ---------------- */

export default function Arcade() {
  const [phase, setPhase] = useState<Phase>("title");
  const [coin, setCoin] = useState(false);
  const [pack, setPack] = useState<Pack | null>(null);
  const [revealApps, setRevealApps] = useState<AppCard[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [popId, setPopId] = useState<string | null>(null);
  const [packsOpened, setPacksOpened] = useState(0);
  const [inspectApp, setInspectApp] = useState<AppCard | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [showGyro, setShowGyro] = useState(false);
  const [banner, setBanner] = useState<{ variant: "leg" | "holo"; text: string } | null>(null);
  const [bannerN, setBannerN] = useState(0);

  const openerRef = useRef<HTMLDivElement>(null);
  const pkRef = useRef<HTMLDivElement>(null);
  const timeouts = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timeouts.current.forEach((t) => clearTimeout(t));
    timeouts.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  /* ---------------- history / back-button wiring ----------------
     `routeRef` mirrors the entry currently in the address bar. Forward moves
     animate themselves and then record where they landed; back/forward moves
     come in through `popstate` and are applied instantly by `showRoute`. */
  const routeRef = useRef<ArcadeRoute>(TITLE_ROUTE);
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
      setCoin(false);
      setPopId(null);
      setBanner(null);
      // The rip is mid-flight if we left during "opening"; wind it back.
      openerRef.current?.classList.remove("rip");
      pkRef.current?.classList.remove("shake");

      if (route.view === "title" || route.view === "select") {
        setPhase(route.view);
        setPack(null);
        setRevealApps([]);
        setRevealed(new Set());
        setInspectApp(null);
        return;
      }

      const p = PACKS.find((x) => x.id === route.packId);
      if (!p) return;
      const apps = APPS.filter((a) => a.pack === p.id);

      setPack(p);
      setRevealApps(apps);
      // Cards you've already torn open stay face-up — replaying the deal every
      // time you press back would be a slog.
      setRevealed(new Set(apps.map((a) => a.id)));
      setSeen((prev) => {
        const next = new Set(prev);
        apps.forEach((a) => next.add(a.id));
        return next;
      });
      // Landing here cold (reload / shared link) still counts as a pack opened.
      setPacksOpened((n) => Math.max(n, 1));
      setPhase("reveal");
      setInspectApp(
        route.view === "inspect" ? apps.find((a) => a.id === route.appId) ?? null : null
      );
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
    if (route.view !== "title") showRoute(route);
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

  /* title -> (coin insert) -> select */
  const start = useCallback(() => {
    setCoin((already) => {
      if (already) return true; // animation already running
      Sound.coin();
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      timeouts.current.push(
        window.setTimeout(() => {
          setPhase("select");
          setCoin(false);
          goTo({ view: "select" });
        }, reduce ? 140 : 1000)
      );
      return true;
    });
  }, [goTo]);

  /* Closing the inspect modal is a back step: it has its own history entry, so
     Esc and the backdrop pop it rather than editing state behind history's back. */
  const closeInspect = useCallback(() => {
    if (!inspectApp) return;
    Sound.blip();
    goBack();
  }, [inspectApp, goBack]);

  /* keyboard: any key starts; Esc closes inspect */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "title") {
        start();
        return;
      }
      if (e.key === "Escape") closeInspect();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, start, closeInspect]);

  /* gyro availability (touch + sensor) */
  useEffect(() => {
    if (typeof window !== "undefined" && "DeviceOrientationEvent" in window && "ontouchstart" in window) {
      setShowGyro(true);
    }
  }, []);

  /* ---- open a pack ---- */
  const openPack = (p: Pack) => {
    clearTimers();
    Sound.select();
    // Claim the entry up front so back during the ~1s rip returns to the packs.
    goTo({ view: "reveal", packId: p.id });
    setPack(p);
    setPhase("opening");
    const opener = openerRef.current;
    const pk = pkRef.current;
    if (opener) {
      opener.style.setProperty("--pa", p.a);
      opener.style.setProperty("--pb", p.b);
      opener.classList.remove("rip");
    }
    if (pk) {
      const emoji = pk.querySelector(".pemoji");
      if (emoji) emoji.textContent = p.icon;
      void pk.offsetWidth; // reflow so the shake re-triggers
      pk.classList.add("shake");
    }
    timeouts.current.push(
      window.setTimeout(() => {
        pk?.classList.remove("shake");
        opener?.classList.add("rip");
        Sound.rip();
        if (opener) burst(opener, ["#ffd23f", p.a, p.b, "#fff", "#ef4444"], 26);
      }, 260)
    );
    timeouts.current.push(window.setTimeout(() => revealStart(p), 1120));
  };

  /* ---- reveal sequence (deal-in, then flip left-to-right in source order) ---- */
  const revealStart = (p: Pack) => {
    const apps = APPS.filter((a) => a.pack === p.id);
    setRevealApps(apps);
    setRevealed(new Set());
    setPhase("reveal");
    setPacksOpened((n) => n + 1);
    openerRef.current?.classList.remove("rip");

    // celebrate the rarest card in the pack (holo+) whenever it flips
    const rarest = apps.reduce((a, b) => (RARITY[b.rarity].rank > RARITY[a.rarity].rank ? b : a), apps[0]);

    apps.forEach((app, idx) => {
      timeouts.current.push(
        window.setTimeout(() => {
          setRevealed((prev) => new Set(prev).add(app.id));
          Sound.flip();
          setSeen((prev) => new Set(prev).add(app.id));
          if (app.id === rarest.id && RARITY[app.rarity].rank >= 2) fanfare(app);
        }, 700 + idx * 340)
      );
    });
  };

  const fanfare = (app: AppCard) => {
    const isLeg = app.rarity === "legendary";
    setPopId(app.id);
    timeouts.current.push(window.setTimeout(() => setPopId(null), 600));

    const el = document.querySelector<HTMLElement>(`.card[data-app="${app.id}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const fx = document.createElement("div");
      fx.style.cssText = `position:fixed;left:${rect.left + rect.width / 2}px;top:${
        rect.top + rect.height / 2
      }px;z-index:95;pointer-events:none;`;
      document.body.appendChild(fx);
      burst(
        fx,
        isLeg ? ["#fde047", "#fbbf24", "#fff", "#f59e0b"] : ["#67e8f9", "#a78bfa", "#f472b6", "#fff"],
        34
      );
      setTimeout(() => fx.remove(), 1300);
    }
    setBanner({ variant: isLeg ? "leg" : "holo", text: isLeg ? "★ LEGENDARY! ★" : "✦ HOLO ✦" });
    setBannerN((n) => n + 1);
    Sound.rare();
  };

  const back = () => {
    Sound.blip();
    goBack();
  };

  const openInspect = (app: AppCard) => {
    Sound.select();
    setInspectApp(app);
    goTo({ view: "inspect", packId: app.pack, appId: app.id });
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
    const last = Number(card.dataset.lastfire || 0);
    if (now - last > 600) {
      Sound.fire();
      card.dataset.lastfire = String(now);
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

  /* pack foil tilt */
  const tiltPack = (e: React.PointerEvent<HTMLButtonElement>) => {
    const foil = e.currentTarget.querySelector<HTMLElement>(".foil");
    if (!foil) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    foil.style.setProperty("--mx", px.toFixed(3));
    foil.style.setProperty("--my", py.toFixed(3));
    foil.style.setProperty("--ry", `${px * 14}deg`);
    foil.style.setProperty("--rx", `${-py * 14}deg`);
  };
  const leavePack = (e: React.PointerEvent<HTMLButtonElement>) => {
    const foil = e.currentTarget.querySelector<HTMLElement>(".foil");
    foil?.style.setProperty("--rx", "0deg");
    foil?.style.setProperty("--ry", "0deg");
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

  const subLabel = (id: Pack["id"]) => (id === "toolkit" ? "TOOL TIME" : "GAME TIME");

  return (
    <>
      <button className="sound" title="Toggle sound" onClick={() => setSoundOn(Sound.toggle())}>
        {soundOn ? "🔊" : "🔇"}
      </button>
      <div className="hud" data-show={phase === "select" || phase === "reveal"}>
        <span>
          PACKS <span className="v">{packsOpened}</span>
        </span>
        <span>
          CARDS <span className="v">{seen.size}</span>/{APPS.length}
        </span>
      </div>
      {showGyro && (
        <button className="gyro-btn" style={{ display: "block" }} onClick={enableGyro}>
          📱 TILT FX
        </button>
      )}

      <div className="stage" data-phase={phase}>
        {/* TITLE */}
        <section className="title" onClick={start}>
          <div className="logo">
            BRIAN
            <br />
            WONG&apos;S
          </div>
          <div className="sub">★ ARCADE EMPORIUM ★</div>
          <div className={"press" + (coin ? "" : " blink")}>▸ INSERT COIN ◂</div>
          {coin && <CoinInsert />}
        </section>

        <header>
          <p className="kicker">INSERT COIN</p>
          <h1>
            RIP A <span className="pop">BOOSTER</span> PACK
          </h1>
        </header>

        {/* PACK SELECT */}
        <section className="select">
          <div className="packs">
            {PACKS.map((p) => {
              const count = APPS.filter((a) => a.pack === p.id).length;
              return (
                <button
                  key={p.id}
                  className="pack"
                  style={cssVars({ "--pa": p.a, "--pb": p.b })}
                  onPointerMove={tiltPack}
                  onPointerLeave={leavePack}
                  onMouseEnter={() => Sound.blip()}
                  onClick={() => openPack(p)}
                >
                  <div className="foil">
                    <div className="tape">FOIL PACK</div>
                    <span className="pemoji">{p.icon}</span>
                    <div className="pname">{p.name}</div>
                    <div className="psub">{subLabel(p.id)}</div>
                    <div className="pcount">{count} cards inside</div>
                    <div className="pill">TEAR OPEN ►</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* REVEAL */}
        <section className="reveal">
          <div className="reveal-head">
            <div className="pt">{pack ? pack.name.toUpperCase() : ""}</div>
            <div className="ps">
              {pack ? `${subLabel(pack.id)} · ${revealApps.length} CARDS` : ""}
            </div>
          </div>
          <button className="back" onClick={back}>
            ◄ OPEN THE OTHER PACK
          </button>
          <div className="cards">
            {revealApps.map((app, i) => {
              const baseShine = RARITY[app.rarity].baseShine;
              const cls =
                `card r-${app.rarity}` +
                (revealed.has(app.id) ? " revealed" : "") +
                (seen.has(app.id) ? " seen" : "") +
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
                  onClick={() => {
                    if (revealed.has(app.id)) openInspect(app);
                  }}
                >
                  <div className="float">
                    <div className="tilt">
                      <div className="flipper">
                        <div className="face front">
                          <CardFace app={app} />
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

        {/* OPENER */}
        <div className="opener" ref={openerRef}>
          <div className="flash" />
          <div className="pk" ref={pkRef}>
            <div className="pk-cards" aria-hidden="true">
              <span className="pcard c1" />
              <span className="pcard c2" />
              <span className="pcard c3" />
            </div>
            <div className="half bot">
              <span className="pemoji" />
            </div>
            <div className="half top" />
          </div>
        </div>
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

      {/* inspect modal */}
      <div
        className={"inspect" + (inspectApp ? " on" : "")}
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("closex"))
            closeInspect();
        }}
      >
        <div className="closex">ESC ✕</div>
        {inspectApp && (
          <>
            <div className="big" onPointerMove={inspectTilt} onPointerLeave={inspectLeave}>
              <div
                className={`card r-${inspectApp.rarity} revealed`}
                style={cssVars({
                  "--accent": inspectApp.accent,
                  "--shine": RARITY[inspectApp.rarity].baseShine,
                })}
              >
                <div className="float" style={{ animation: "none" }}>
                  <div className="tilt">
                    <div className="flipper" style={{ transform: "rotateY(0deg)" }}>
                      <div className="face front">
                        <CardFace app={inspectApp} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="detail">
              <div className={"dh" + (inspectApp.name.length > 11 ? " long" : "")}>{inspectApp.name}</div>
              <span
                className="drar"
                style={{ background: RAR_COLOR[inspectApp.rarity], color: "#0b1020" }}
              >
                {RARITY[inspectApp.rarity].gem} {RARITY[inspectApp.rarity].label}
              </span>
              <p>{inspectApp.blurb}</p>
              <div className="row">
                <span>Type</span>
                <b>{inspectApp.type.toUpperCase()}</b>
              </div>
              <div className="row">
                <span>Reach</span>
                <b>{inspectApp.stats.users} USERS</b>
              </div>
              <div className="row">
                <span>Rating</span>
                <b>★ {inspectApp.stats.rating}</b>
              </div>
              <div className="row">
                <span>Platform</span>
                <b>{inspectApp.stats.platform.toUpperCase()}</b>
              </div>
              <div className="row">
                <span>Launched</span>
                <b>{inspectApp.year}</b>
              </div>
              <a
                className={"launch" + (inspectApp.link === "#" ? " soon" : "")}
                href={inspectApp.link}
                target={inspectApp.link === "#" ? undefined : "_blank"}
                rel={inspectApp.link === "#" ? undefined : "noopener noreferrer"}
                onClick={(e) => {
                  if (inspectApp.link === "#") e.preventDefault();
                }}
              >
                {inspectApp.link === "#"
                  ? "🔒 COMING SOON"
                  : `▶ LAUNCH ${inspectApp.name.toUpperCase()}`}
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}
