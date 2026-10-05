import type { CSSProperties } from "react";
import { RARITY, type AppCard } from "@/lib/apps";
import { LiveArt } from "./LiveArt";

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

/**
 * The front-face contents of a card: name, HP, art, type/rarity badges, and
 * a text box at the bottom.
 *
 * Apps with footage (`app.live`) play it in the art window. The text box
 * reads like a trading-card attack: an energy symbol with the app's icon, the
 * `move`, then each of the app's `traits` as a symbol and a short line. An
 * app with neither shows its tagline instead. `playing` lets the footage run;
 * it should be on only while the card is face-up.
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
      {app.move || app.traits ? (
        <div className="statbox movebox">
          {app.move && (
            <div className="atk">
              <span className="cost" aria-hidden="true">
                {app.icon}
              </span>
              <p className="mv">
                <b>{app.move.name}</b> {app.move.text}
              </p>
            </div>
          )}
          {app.traits && (
            <ul className="traits">
              {app.traits.map((t) => (
                <li key={t.text}>
                  <i aria-hidden="true">{t.icon}</i>
                  {t.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="statbox">
          <p className="tgl">{app.tagline}</p>
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
