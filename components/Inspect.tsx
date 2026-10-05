"use client";

import { RARITY, type AppCard } from "@/lib/apps";
import { CardFace } from "./Card";
import LaunchButton from "./LaunchButton";

const RAR_COLOR: Record<string, string> = {
  common: "#94a3b8",
  rare: "#e2e8f0",
  holo: "#67e8f9",
  legendary: "#fde047",
};

/**
 * The standard detail screen, for a card without a full-screen view of its
 * own. The card is shown large on the left and tilts under the pointer. On the
 * right are its name, rarity, the PLAY or LAUNCH button, the blurb and its
 * stats. The backdrop stays in the page so it can fade in; it shows only while
 * `app` is set. Clicking the backdrop or ESC ✕ calls `onClose`.
 */
export default function Inspect({ app, onClose }: { app: AppCard | null; onClose: () => void }) {
  const tilt = (e: React.PointerEvent<HTMLDivElement>) => {
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

  const untilt = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = e.currentTarget.querySelector<HTMLElement>(".card");
    if (!card || !app) return;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--lift", "0px");
    card.style.setProperty("--shine", String(RARITY[app.rarity].baseShine));
    card.style.setProperty("--glare", "0");
  };

  return (
    <div
      className={"inspect" + (app ? " on" : "")}
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("closex")) onClose();
      }}
    >
      <div className="closex">ESC ✕</div>
      {app && (
        <>
          <div className="big" onPointerMove={tilt} onPointerLeave={untilt}>
            <div
              className={`card r-${app.rarity} revealed`}
              style={{ "--accent": app.accent, "--shine": RARITY[app.rarity].baseShine } as React.CSSProperties}
            >
              <div className="float" style={{ animation: "none" }}>
                <div className="tilt">
                  <div className="flipper" style={{ transform: "rotateY(0deg)" }}>
                    <div className="face front">
                      <CardFace app={app} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="detail">
            <div className={"dh" + (app.name.length > 11 ? " long" : "")}>{app.name}</div>
            <span className="drar" style={{ background: RAR_COLOR[app.rarity], color: "#0b1020" }}>
              {RARITY[app.rarity].gem} {RARITY[app.rarity].label}
            </span>
            <LaunchButton app={app} />
            <p>{app.blurb}</p>
            <div className="row">
              <span>Type</span>
              <b>{app.type.toUpperCase()}</b>
            </div>
            <div className="row">
              <span>Reach</span>
              <b>{app.stats.users} USERS</b>
            </div>
            <div className="row">
              <span>Rating</span>
              <b>★ {app.stats.rating}</b>
            </div>
            <div className="row">
              <span>Platform</span>
              <b>{app.stats.platform.toUpperCase()}</b>
            </div>
            <div className="row">
              <span>Launched</span>
              <b>{app.year}</b>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
