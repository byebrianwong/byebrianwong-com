"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { APPS, RARITY, type AppCard } from "@/lib/apps";
import "./CardVariants.css";

/**
 * Six alternative designs for the app card, for comparing side by side in
 * Storybook. Each keeps the parts of the current card that make it a
 * trading card (name and HP, an art window with the app's real footage, a
 * move, two traits, a rarity mark, a set number) and drops the rest.
 *
 * They are self-contained: none of them uses the live card's CSS, and nothing
 * in the arcade renders them yet.
 */

export type CardVariantId = "stock" | "sports" | "field" | "night" | "riso" | "handheld";

export const CARD_VARIANTS: { id: CardVariantId; name: string; note: string; backdrop: string }[] = [
  {
    id: "stock",
    name: "Card Stock",
    note: "A printed trading card: cream border, metal frame around the art, a set number in the corner. Foil only in the art frame.",
    backdrop: "#2b2a33",
  },
  {
    id: "sports",
    name: "Sports Card",
    note: "Late-80s baseball card: a big photo, the name on a dark plate, a year badge, and one signature move.",
    backdrop: "#1f3b2d",
  },
  {
    id: "field",
    name: "Field Guide",
    note: "Editorial and quiet: a serif name, a short tagline, numbered traits, and the details set in mono.",
    backdrop: "#e7e3da",
  },
  {
    id: "night",
    name: "Night Mode",
    note: "A dark product card. The footage fills the top and fades into the card, and the name sits on it.",
    backdrop: "#1a1b20",
  },
  {
    id: "riso",
    name: "Riso Print",
    note: "Two-ink risograph print on paper: blue plus the app's color, slightly out of register, footage in duotone.",
    backdrop: "#cfc8b8",
  },
  {
    id: "handheld",
    name: "Handheld",
    note: "A handheld game console: the footage on a screen behind a bezel, an HP bar, and the move in a dialog box.",
    backdrop: "#3d4a6b",
  },
];

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

const pad = (n: number) => String(n).padStart(3, "0");
const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** "003/010" for an app in the set, or nothing for one that isn't (e.g. a playground app). */
function setNumber(app: AppCard) {
  const i = APPS.findIndex((a) => a.id === app.id);
  return i < 0 ? null : `${pad(i + 1)}/${pad(APPS.length)}`;
}

/** The address an app lives at, without the protocol. */
function host(app: AppCard) {
  return app.live?.url ?? app.link.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** The app's footage in the art window, or its icon when it has none. Plays only while `playing`. */
function Footage({ app, playing }: { app: AppCard; playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [playing]);
  if (!app.live) return <span className="cv-icon">{app.icon}</span>;
  return (
    <video
      ref={ref}
      src={app.live.video}
      poster={app.live.poster}
      muted
      loop
      playsInline
      preload={playing ? "auto" : "none"}
      aria-hidden="true"
    />
  );
}

type Props = { app: AppCard; playing: boolean };

/* ---------------- 1. Card Stock ---------------- */

function Stock({ app, playing }: Props) {
  const r = RARITY[app.rarity];
  const num = setNumber(app);
  return (
    <div className="st-inner">
      <header className="st-top">
        <h3 className="st-name">{app.name}</h3>
        <span className="st-hp">
          <small>HP</small>
          {app.hp}
        </span>
      </header>
      <div className="st-frame">
        <div className="st-art">
          <Footage app={app} playing={playing} />
        </div>
      </div>
      <p className="st-line">
        {app.type} · {app.stats.platform} · {app.year}
      </p>
      {app.move && (
        <div className="st-move">
          <b>{app.move.name}</b>
          <p>{app.move.text}</p>
        </div>
      )}
      {app.traits && (
        <ul className="st-traits">
          {app.traits.map((t) => (
            <li key={t.text}>{t.text}</li>
          ))}
        </ul>
      )}
      <footer className="st-foot">
        <span>
          <i aria-label={r.label.toLowerCase()}>{r.gem}</i> {num}
        </span>
        <span>© {app.year} byebrianwong</span>
      </footer>
    </div>
  );
}

/* ---------------- 2. Sports Card ---------------- */

function Sports({ app, playing }: Props) {
  const r = RARITY[app.rarity];
  return (
    <>
      <div className="sp-photo">
        <Footage app={app} playing={playing} />
        <span className="sp-badge">
          <b>&apos;{String(app.year).slice(2)}</b>
          <small>{r.label}</small>
        </span>
      </div>
      <div className="sp-plate">
        <span className="sp-type">{app.type}</span>
        <h3 className="sp-name">{app.name}</h3>
      </div>
      <div className="sp-stats">
        <div className="sp-hp">
          <small>HP</small>
          <b>{app.hp}</b>
        </div>
        {app.move && (
          <div className="sp-move">
            <small>Signature move</small>
            <b>{app.move.name}</b>
            <span>{app.move.text}</span>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- 3. Field Guide ---------------- */

function Field({ app, playing }: Props) {
  const r = RARITY[app.rarity];
  const num = setNumber(app);
  return (
    <>
      <header className="fg-meta">
        {num && <span>No. {num.split("/")[0]}</span>}
        <span>{app.type}</span>
        <span className="fg-rar">
          {r.gem} {r.label.toLowerCase()}
        </span>
      </header>
      <h3 className="fg-name">{app.name}</h3>
      <p className="fg-tag">{app.tagline}</p>
      <div className="fg-art">
        <Footage app={app} playing={playing} />
      </div>
      {app.move && (
        <p className="fg-move">
          <b>{sentence(app.move.name)}.</b> {app.move.text}
        </p>
      )}
      {app.traits && (
        <ol className="fg-traits">
          {app.traits.map((t, i) => (
            <li key={t.text}>
              <i>{String(i + 1).padStart(2, "0")}</i>
              {t.text}
            </li>
          ))}
        </ol>
      )}
      <footer className="fg-foot">
        <span>HP {app.hp}</span>
        <span>{host(app)}</span>
      </footer>
    </>
  );
}

/* ---------------- 4. Night Mode ---------------- */

function Night({ app, playing }: Props) {
  const r = RARITY[app.rarity];
  return (
    <>
      <div className="nt-media">
        <Footage app={app} playing={playing} />
        <span className="nt-hp">HP {app.hp}</span>
        <div className="nt-title">
          <span className="nt-type">{app.type}</span>
          <h3 className="nt-name">{app.name}</h3>
        </div>
      </div>
      <div className="nt-body">
        {app.move && (
          <p className="nt-move">
            <b>{app.move.name}</b>
            {app.move.text}
          </p>
        )}
        {app.traits && (
          <ul className="nt-traits">
            {app.traits.map((t) => (
              <li key={t.text}>{t.text}</li>
            ))}
          </ul>
        )}
        <footer className="nt-foot">
          <span className="nt-rar">
            {r.gem} {r.label.toLowerCase()}
          </span>
          <span>{host(app)} ↗</span>
        </footer>
      </div>
    </>
  );
}

/* ---------------- 5. Riso Print ---------------- */

function Riso({ app, playing }: Props) {
  const r = RARITY[app.rarity];
  const num = setNumber(app);
  return (
    <>
      <header className="rs-head">
        <span>{num ? `№ ${num}` : app.type}</span>
        <span className="rs-hp">
          <b>{app.hp}</b>
          <small>HP</small>
        </span>
      </header>
      <h3 className="rs-name">{app.name}</h3>
      <div className="rs-art">
        <div className="rs-ink">
          <Footage app={app} playing={playing} />
          <span className="rs-paper" />
          <span className="rs-dots" />
        </div>
      </div>
      {app.move && (
        <p className="rs-move">
          <b>{app.move.name}</b> {app.move.text}
        </p>
      )}
      {app.traits && (
        <ul className="rs-traits">
          {app.traits.map((t) => (
            <li key={t.text}>{t.text}</li>
          ))}
        </ul>
      )}
      <footer className="rs-foot">
        <span>{app.type}</span>
        <span>
          {r.gem} {r.label}
        </span>
      </footer>
    </>
  );
}

/* ---------------- 6. Handheld ---------------- */

const HP_MAX = 200;

function Handheld({ app, playing }: Props) {
  const r = RARITY[app.rarity];
  return (
    <>
      <header className="hh-top">
        <h3 className="hh-name">{app.name}</h3>
        <span className="hh-rar">
          {r.gem} {r.label}
        </span>
      </header>
      <div className="hh-bezel">
        <span className="hh-label">
          <i className="hh-led" />
          Live footage
        </span>
        <div className="hh-screen">
          <Footage app={app} playing={playing} />
        </div>
      </div>
      <div className="hh-hp">
        <small>HP</small>
        <span className="hh-bar">
          <i style={{ width: `${Math.min(100, (app.hp / HP_MAX) * 100)}%` }} />
        </span>
        <b>
          {app.hp}/{HP_MAX}
        </b>
      </div>
      {app.move && (
        <div className="hh-dialog">
          <p>
            <b>
              {app.name} used {app.move.name}!
            </b>
          </p>
          <p>{app.move.text}</p>
        </div>
      )}
      {app.traits && (
        <ul className="hh-menu">
          {app.traits.map((t) => (
            <li key={t.text}>{t.text}</li>
          ))}
        </ul>
      )}
    </>
  );
}

const RENDER: Record<CardVariantId, (p: Props) => React.ReactElement> = {
  stock: Stock,
  sports: Sports,
  field: Field,
  night: Night,
  riso: Riso,
  handheld: Handheld,
};

/**
 * One app drawn in one of the six alternative designs. `playing` runs the
 * footage; off, the card shows its poster frame (stable for snapshots).
 */
export function CardVariant({
  app,
  variant,
  playing = false,
}: {
  app: AppCard;
  variant: CardVariantId;
  playing?: boolean;
}) {
  const Body = RENDER[variant];
  const cls = `cv cv-${variant} r-${app.rarity}` + (app.name.length > 14 ? " is-long" : "");
  return (
    <article className={cls} data-app={app.id} style={cssVars({ "--accent": app.accent })}>
      <Body app={app} playing={playing} />
    </article>
  );
}
