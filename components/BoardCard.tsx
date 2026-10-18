"use client";

import { useEffect, useRef, type CSSProperties, type ReactElement } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  AppWindowIcon,
  BookOpenIcon,
  BrowserIcon,
  CheckSquareIcon,
  CircleIcon,
  ConfettiIcon,
  CubeIcon,
  DiamondIcon,
  GameControllerIcon,
  GiftIcon,
  GlobeIcon,
  HeartIcon,
  LightbulbIcon,
  LightningIcon,
  MusicNotesIcon,
  PuzzlePieceIcon,
  SparkleIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { APPS, RARITY, type AppCard, type Rarity } from "@/lib/apps";
import "./BoardCard.css";

/**
 * Four more card designs, after the first six (see CardVariants.tsx). These
 * aim for a modern board-game card: the art takes most of the card, there is
 * little text, and icons carry the details (type, platform, game or app, HP,
 * rarity).
 *
 * Each one also runs every app's footage through the same color treatment,
 * so a row of very different apps still reads as one set. Each design uses a
 * different treatment, to compare them; hovering a card shows the footage in
 * its real colors.
 */

export type BoardCardId = "tabletop" | "arena" | "euro" | "film";

export const BOARD_CARDS: { id: BoardCardId; name: string; note: string; backdrop: string }[] = [
  {
    id: "tabletop",
    name: "Tabletop",
    note: "Cream card stock and an arched art window, like Wingspan or Everdell. Footage is tinted in the app's own color.",
    backdrop: "#2f3b34",
  },
  {
    id: "arena",
    name: "Arena",
    note: "A digital card game, like Marvel Snap: full-bleed art, a type hexagon and an HP shield. All footage shares one cool blue grade; the app's color is only in the rim.",
    backdrop: "#14161f",
  },
  {
    id: "euro",
    name: "Euro",
    note: "Clean modern board game: a colored header, black-and-white footage, and a row of icon stats instead of text.",
    backdrop: "#e4e2dc",
  },
  {
    id: "film",
    name: "Film",
    note: "A photo card. All footage gets the same soft film grade (muted, warm, a little grain), keeping some of its color.",
    backdrop: "#d9d3c7",
  },
];

/* ---------------- icons ---------------- */

const TYPE_ICON: Record<string, Icon> = {
  "3D Game": CubeIcon,
  Party: ConfettiIcon,
  Music: MusicNotesIcon,
  Trivia: LightbulbIcon,
  Reviews: StarIcon,
  Vocab: BookOpenIcon,
  Tasks: CheckSquareIcon,
  Registry: GiftIcon,
  Extension: PuzzlePieceIcon,
};
const typeIcon = (app: AppCard) => TYPE_ICON[app.type] ?? AppWindowIcon;

const RARITY_ICON: Record<Rarity, Icon> = {
  common: CircleIcon,
  rare: DiamondIcon,
  holo: SparkleIcon,
  legendary: StarIcon,
};

/** Chrome for a browser extension, the web for everything else. */
function platform(app: AppCard): { icon: Icon; label: string } {
  return /chrome/i.test(app.stats.platform) ? { icon: BrowserIcon, label: "Chrome" } : { icon: GlobeIcon, label: "Web" };
}

function kind(app: AppCard): { icon: Icon; label: string } {
  return app.game ? { icon: GameControllerIcon, label: "Game" } : { icon: AppWindowIcon, label: "App" };
}

/* ---------------- helpers ---------------- */

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;
const pad = (n: number) => String(n).padStart(3, "0");

function setNumber(app: AppCard) {
  const i = APPS.findIndex((a) => a.id === app.id);
  return i < 0 ? null : `${pad(i + 1)}/${pad(APPS.length)}`;
}

/** Dark text on light accents, white text on dark ones. */
function inkOn(hex: string) {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return l > 0.36 ? "#16150f" : "#ffffff";
}

/**
 * The app's footage (or its icon when it has none), under the design's color
 * treatment. The treatment is a stack of blend layers over the video, so it
 * can fade out on hover to show the real colors.
 */
function Art({ app, playing, className }: { app: AppCard; playing: boolean; className: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [playing]);
  const TypeIcon = typeIcon(app);
  return (
    <div className={`bc-art ${className}`}>
      {app.live ? (
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
      ) : (
        <span className="bc-noart">
          <TypeIcon weight="duotone" />
        </span>
      )}
      <span className="bc-grade" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

type Props = { app: AppCard; playing: boolean };

/* ---------------- 1. Tabletop ---------------- */

function Tabletop({ app, playing }: Props) {
  const TypeIcon = typeIcon(app);
  const RarIcon = RARITY_ICON[app.rarity];
  const p = platform(app);
  const k = kind(app);
  return (
    <div className="tt-inner">
      <div className="tt-window">
        <Art app={app} playing={playing} className="tt-art" />
        <span className="tt-hp" title="HP">
          <HeartIcon weight="fill" />
          <b>{app.hp}</b>
        </span>
        <span className="tt-type" title={app.type}>
          <TypeIcon weight="fill" />
        </span>
      </div>
      <h3 className="tt-name">{app.name}</h3>
      {app.move && (
        <p className="tt-move">
          <LightningIcon weight="fill" />
          {app.move.text}
        </p>
      )}
      <ul className="tt-chips">
        <li>
          <p.icon weight="bold" />
          {p.label}
        </li>
        <li>
          <k.icon weight="bold" />
          {k.label}
        </li>
        <li>
          <TypeIcon weight="bold" />
          {app.type}
        </li>
      </ul>
      <footer className="tt-foot">
        <span>
          <RarIcon weight="fill" /> {setNumber(app)}
        </span>
        <span>{app.year}</span>
      </footer>
    </div>
  );
}

/* ---------------- 2. Arena ---------------- */

function Arena({ app, playing }: Props) {
  const TypeIcon = typeIcon(app);
  const RarIcon = RARITY_ICON[app.rarity];
  const p = platform(app);
  return (
    <>
      <Art app={app} playing={playing} className="ar-art" />
      <span className="ar-hex" title={app.type}>
        <TypeIcon weight="fill" />
      </span>
      <span className="ar-shield" title="HP">
        <b>{app.hp}</b>
        <small>HP</small>
      </span>
      <div className="ar-bottom">
        <span className="ar-rar">
          <RarIcon weight="fill" />
        </span>
        <h3 className="ar-name">{app.name}</h3>
        <p className="ar-line">{app.tagline}</p>
        <span className="ar-icons">
          <p.icon weight="bold" />
          {app.game ? <GameControllerIcon weight="bold" /> : <AppWindowIcon weight="bold" />}
        </span>
      </div>
    </>
  );
}

/* ---------------- 3. Euro ---------------- */

function Euro({ app, playing }: Props) {
  const TypeIcon = typeIcon(app);
  const RarIcon = RARITY_ICON[app.rarity];
  const p = platform(app);
  const k = kind(app);
  const stats: { icon: Icon; label: string }[] = [
    { icon: TypeIcon, label: app.type },
    { icon: p.icon, label: p.label },
    { icon: k.icon, label: k.label },
    { icon: RarIcon, label: RARITY[app.rarity].label.toLowerCase() },
  ];
  return (
    <>
      <header className="eu-head" style={{ color: inkOn(app.accent) }}>
        <h3 className="eu-name">{app.name}</h3>
        <span className="eu-hp">
          <HeartIcon weight="fill" />
          {app.hp}
        </span>
      </header>
      <Art app={app} playing={playing} className="eu-art" />
      <p className="eu-tag">{app.tagline}</p>
      <ul className="eu-stats">
        {stats.map((s) => (
          <li key={s.label}>
            <s.icon weight="duotone" />
            <span>{s.label}</span>
          </li>
        ))}
      </ul>
      <footer className="eu-foot">
        <span>{setNumber(app)}</span>
        <span>{app.year}</span>
      </footer>
    </>
  );
}

/* ---------------- 4. Film ---------------- */

function Film({ app, playing }: Props) {
  const TypeIcon = typeIcon(app);
  const RarIcon = RARITY_ICON[app.rarity];
  const p = platform(app);
  const k = kind(app);
  return (
    <>
      <div className="fm-photo">
        <Art app={app} playing={playing} className="fm-art" />
        <span className="fm-chip">
          <TypeIcon weight="fill" />
          {app.type}
        </span>
        <span className="fm-rar" title={RARITY[app.rarity].label}>
          <RarIcon weight="fill" />
        </span>
      </div>
      <div className="fm-row">
        <h3 className="fm-name">{app.name}</h3>
        <span className="fm-hp">
          <HeartIcon weight="fill" />
          {app.hp}
        </span>
      </div>
      <div className="fm-row fm-sub">
        <p className="fm-tag">{app.tagline}</p>
        <span className="fm-icons">
          <p.icon weight="regular" />
          <k.icon weight="regular" />
        </span>
      </div>
    </>
  );
}

const RENDER: Record<BoardCardId, (p: Props) => ReactElement> = {
  tabletop: Tabletop,
  arena: Arena,
  euro: Euro,
  film: Film,
};

/** One app drawn in one of the four board-game designs. */
export function BoardCard({ app, design, playing = false }: { app: AppCard; design: BoardCardId; playing?: boolean }) {
  const Body = RENDER[design];
  const cls = `bc bc-${design} r-${app.rarity}` + (app.name.length > 14 ? " is-long" : "");
  return (
    <article className={cls} data-app={app.id} style={cssVars({ "--accent": app.accent })}>
      <Body app={app} playing={playing} />
    </article>
  );
}
