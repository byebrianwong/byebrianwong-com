"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  PlayIcon,
  PuzzlePieceIcon,
  SparkleIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { APPS, RARITY, type AppCard, type Rarity } from "@/lib/apps";

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

/* ---------------- icons ---------------- */

/** One symbol per app type, shown on the type token and chip. Unknown types get a generic app window. */
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

/** "003/010": the card's place in the set. */
function setNumber(app: AppCard) {
  const i = APPS.findIndex((a) => a.id === app.id);
  const pad = (n: number) => String(n).padStart(3, "0");
  return i < 0 ? null : `${pad(i + 1)}/${pad(APPS.length)}`;
}

/* ---------------- art window ---------------- */

/**
 * The app's footage in the card's arched window, or its type symbol when it
 * has none. Every card's footage gets the same treatment (the `.grade`
 * layers): tinted in the app's own color, with whites pulled down and blacks
 * lifted, so white and dark interfaces sit together as one set. Hovering the
 * card fades it out to show the real colors.
 *
 * The video only loads and plays while `playing` and the card is on screen.
 */
function CardArt({ app, playing }: { app: AppCard; playing: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);

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
    if (active)
      v.play().catch(() => {
        /* autoplay refused (e.g. iOS low-power mode): the poster stays up */
      });
    else v.pause();
  }, [active]);

  const TypeIcon = typeIcon(app);
  return (
    <div className="art" ref={wrap}>
      {app.live ? (
        <video
          ref={video}
          src={app.live.video}
          poster={app.live.poster}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
        />
      ) : (
        <span className="noart" aria-hidden="true">
          <TypeIcon weight="duotone" />
        </span>
      )}
      <span className="grade" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

/* ---------------- faces ---------------- */

/**
 * The front of a card: a modern board-game card on cream stock. The app's
 * footage fills an arched window with an HP token and a type token on its
 * edge; under it are the name, the app's move in one line, and chips for
 * platform, game or app, and type. The rarity symbol and set number sit at
 * the bottom, and rare, holo and legendary cards get a foil border.
 *
 * `playing` lets the footage run; it should be on only while the card is face-up.
 */
export function CardFace({ app, playing = true }: { app: AppCard; playing?: boolean }) {
  const TypeIcon = typeIcon(app);
  const RarIcon = RARITY_ICON[app.rarity];
  const p = platform(app);
  const K = app.game ? GameControllerIcon : AppWindowIcon;
  return (
    <>
      <span className="foil" aria-hidden="true" />
      <div className="tt">
        <div className="window">
          <CardArt app={app} playing={playing} />
          {app.showcase && (
            <span className="hint">
              <PlayIcon weight="fill" /> Watch demo
            </span>
          )}
          <span className="hp" title="HP">
            <HeartIcon weight="fill" aria-hidden="true" />
            <b>{app.hp}</b>
            <span className="sr-only">HP</span>
          </span>
          <span className="type" title={app.type}>
            <TypeIcon weight="fill" aria-hidden="true" />
          </span>
        </div>
        <h3 className={"nm" + (app.name.length > 14 ? " long" : "")}>{app.name}</h3>
        <p className="mv">
          <LightningIcon weight="fill" aria-hidden="true" />
          {app.move?.text ?? app.tagline}
        </p>
        <ul className="chips">
          <li>
            <p.icon weight="bold" aria-hidden="true" />
            {p.label}
          </li>
          <li>
            <K weight="bold" aria-hidden="true" />
            {app.game ? "Game" : "App"}
          </li>
          <li>
            <TypeIcon weight="bold" aria-hidden="true" />
            {app.type}
          </li>
        </ul>
        <footer className="foot">
          <span title={RARITY[app.rarity].label.toLowerCase()}>
            <RarIcon weight="fill" aria-hidden="true" />
            <span className="sr-only">{RARITY[app.rarity].label}</span> {setNumber(app)}
          </span>
          <span>{app.year}</span>
        </footer>
      </div>
      <span className="glare" aria-hidden="true" />
    </>
  );
}

/** The back of every card, shown before it's flipped face-up. */
export function CardBack() {
  return (
    <div className="bk">
      <span className="bk-mark">
        <b>BW</b>
      </span>
      <span className="bk-wm">The App Arcade</span>
    </div>
  );
}

/* ---------------- self-contained card ---------------- */

/**
 * A single trading card — the `.card` shell plus its flip faces.
 * Presentational only: the live {@link Arcade} adds tilt/pointer handlers on top
 * of this same markup and CSS. Defaults to a revealed, face-up card so it
 * renders meaningfully on its own (Storybook, galleries, etc.).
 */
export function Card({
  app,
  revealed = true,
  playing = revealed,
}: {
  app: AppCard;
  /** Face-up (`true`) or showing the back (`false`). */
  revealed?: boolean;
  /** Whether the card's footage runs. Off, it shows the poster frame. */
  playing?: boolean;
}) {
  const cls = `card r-${app.rarity}` + (revealed ? " revealed" : "");
  return (
    <div
      className={cls}
      data-app={app.id}
      style={cssVars({ "--accent": app.accent, "--shine": RARITY[app.rarity].baseShine })}
    >
      <div className="float">
        <div className="tilt">
          <div className="flipper">
            <div className="face front">
              <CardFace app={app} playing={playing} />
            </div>
            <div className="face back-face">
              <CardBack />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
