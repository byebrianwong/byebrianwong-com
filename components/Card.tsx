import type { CSSProperties } from "react";
import { RARITY, ratingPct, usersPct, type AppCard } from "@/lib/apps";
import { LiveArt } from "./LiveArt";

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

/* ---------------- small presentational helpers ---------------- */

/** Twelve-segment meter used for the REACH and rating rows on a card. */
export function Segs({ pct }: { pct: number }) {
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

/**
 * The front-face contents of a card: name, HP, art, type/rarity badges, stats.
 *
 * Apps with footage (`app.live`) get a bigger art window that plays it, and
 * apps with a `move` or `facts` show those in place of the generic stat bars,
 * so the card says something true about that particular app. `playing` lets
 * the footage run; it should be on only while the card is face-up.
 */
export function CardFace({ app, playing = true }: { app: AppCard; playing?: boolean }) {
  const r = RARITY[app.rarity];
  return (
    <>
      <div className="frametop">
        <span className={"nm" + (app.name.length > 11 ? " long" : "")}>{app.name}</span>
        <span className="hp">
          <small>HP</small> {app.hp}
        </span>
      </div>
      <div className={"art" + (app.live ? " is-live" : "")}>
        {app.live ? (
          <LiveArt media={app.live} playing={playing} />
        ) : (
          <>
            <div className="layer l-glow" />
            <span className="ring" />
            <div className="layer l-icon">{app.icon}</div>
            <div className="halftone" />
          </>
        )}
        <div className="shine" />
        <div className="glare" />
      </div>
      <div className="badges">
        <span className="typebadge">{app.type.toUpperCase()}</span>
        <span className="gem">
          {r.gem} {r.label}
        </span>
      </div>
      {app.showcase && <span className="hint">▶ WATCH DEMO</span>}
      {app.move || app.facts ? (
        <div className="statbox movebox">
          {app.move && (
            <p className="mv">
              <b>{app.move.name}</b> {app.move.text}
            </p>
          )}
          {app.facts && (
            <div className="facts">
              {app.facts.map((f) => (
                <span key={f.label}>
                  <b>{f.value}</b>
                  {f.label}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
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
      )}
    </>
  );
}

/* ---------------- self-contained card ---------------- */

/**
 * A single holographic trading card — the `.card` shell plus its flip faces.
 * Presentational only: the live {@link Arcade} adds tilt/pointer handlers on top
 * of this same markup and CSS. Defaults to a revealed, face-up card so it
 * renders meaningfully on its own (Storybook, galleries, etc.).
 */
export function Card({
  app,
  revealed = true,
  seen = true,
  playing = revealed,
}: {
  app: AppCard;
  /** Face-up (`true`) or showing the foil back (`false`). */
  revealed?: boolean;
  /** Whether stat segments use the accent color (the "collected" treatment). */
  seen?: boolean;
  /** Whether a live card's footage runs. Off, it shows the poster frame. */
  playing?: boolean;
}) {
  const cls =
    `card r-${app.rarity}` + (app.live ? " has-live" : "") + (revealed ? " revealed" : "") + (seen ? " seen" : "");
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
              <span className="bhalf" />
              <span className="bstar">★</span>
              <span className="bwm">BYEBRIANWONG · ARCADE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
