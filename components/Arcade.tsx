"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  APPS,
  PACKS,
  RARITY,
  ratingPct,
  usersPct,
  type AppCard,
  type Pack,
} from "@/lib/apps";
import { Sound } from "@/lib/sound";

type Phase = "title" | "select" | "opening" | "reveal";

/* ---------------- small presentational helpers ---------------- */

function Segs({ pct }: { pct: number }) {
  const N = 12;
  const lit = Math.round((pct / 100) * N);
  return (
    <span className="segs">
      {Array.from({ length: N }, (_, k) => (
        <span key={k} className={"seg" + (k < lit ? " on" : "")} />
      ))}
    </span>
  );
}

function CardFace({ app }: { app: AppCard }) {
  const r = RARITY[app.rarity];
  return (
    <>
      <div className="frametop">
        <span className="nm">{app.name}</span>
        <span className="hp">
          <small>HP</small> {app.hp}
        </span>
      </div>
      <div className="art">
        <div className="layer l-glow" />
        <span className="ring" />
        <div className="layer l-icon">{app.icon}</div>
        <div className="halftone" />
        <div className="shine" />
        <div className="glare" />
      </div>
      <div className="badges">
        <span className="typebadge">{app.type.toUpperCase()}</span>
        <span className="gem">
          {r.gem} {r.label}
        </span>
      </div>
      <span className="fire">🔥 ON FIRE</span>
      <div className="statbox">
        <p className="tgl">{app.tagline}</p>
        <div className="statrow">
          <span className="lbl">REACH</span>
          <Segs pct={usersPct(app.stats.users)} />
        </div>
        <div className="statrow">
          <span className="lbl">★ {app.stats.rating}</span>
          <Segs pct={ratingPct(app.stats.rating)} />
        </div>
      </div>
    </>
  );
}

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

  /* title -> select */
  const start = useCallback(() => {
    setPhase((p) => {
      if (p !== "title") return p;
      Sound.coin();
      return "select";
    });
  }, []);

  const closeInspect = useCallback(() => {
    setInspectApp((cur) => {
      if (cur) Sound.blip();
      return null;
    });
  }, []);

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
    timeouts.current.push(window.setTimeout(() => revealStart(p), 980));
  };

  /* ---- reveal sequence (deal-in, then flip rarest-last) ---- */
  const revealStart = (p: Pack) => {
    const apps = APPS.filter((a) => a.pack === p.id).sort(
      (x, y) => RARITY[x.rarity].rank - RARITY[y.rarity].rank
    );
    setRevealApps(apps);
    setRevealed(new Set());
    setPhase("reveal");
    setPacksOpened((n) => n + 1);
    openerRef.current?.classList.remove("rip");

    apps.forEach((app, idx) => {
      const last = idx === apps.length - 1;
      timeouts.current.push(
        window.setTimeout(() => {
          setRevealed((prev) => new Set(prev).add(app.id));
          Sound.flip();
          setSeen((prev) => new Set(prev).add(app.id));
          if (last && RARITY[app.rarity].rank >= 2) fanfare(app);
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
    clearTimers();
    Sound.blip();
    setPhase("select");
    setRevealApps([]);
    setRevealed(new Set());
  };

  const openInspect = (app: AppCard) => {
    Sound.select();
    setInspectApp(app);
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

  const subLabel = (id: Pack["id"]) => (id === "toolkit" ? "SERIOUS BUSINESS" : "FUN ZONE");

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
            BYE
            <br />
            BRIAN
            <br />
            WONG
          </div>
          <div className="sub">★ THE APP ARCADE ★</div>
          <div className="press blink">▸ INSERT COIN ◂</div>
          <div className="hint2">click anywhere or press any key to start</div>
        </section>

        <header>
          <p className="kicker">INSERT COIN</p>
          <h1>
            RIP A <span className="pop">BOOSTER</span> PACK
          </h1>
          <p className="lede">
            Pick a pack, tear it open, and watch the cards flip — rarest last. Hover for holo foil
            &amp; fire; click a card to inspect it.
          </p>
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
          <p className="footer-note">
            Hover: tilt · holo foil · fire&nbsp;&nbsp;|&nbsp;&nbsp;Click a card to inspect &amp; launch
          </p>
        </section>

        {/* OPENER */}
        <div className="opener" ref={openerRef}>
          <div className="flash" />
          <div className="pk" ref={pkRef}>
            <div className="half top" />
            <div className="half bot">
              <span className="pemoji" />
            </div>
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
              <div className="dh">{inspectApp.name}</div>
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
                className="launch"
                href={inspectApp.link}
                onClick={(e) => {
                  if (inspectApp.link === "#") e.preventDefault();
                }}
              >
                ▶ LAUNCH {inspectApp.name.toUpperCase()}
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}
