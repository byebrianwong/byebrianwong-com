"use client";

import { forwardRef, useImperativeHandle, useRef, useState, type CSSProperties } from "react";
import { APPS, RARITY, type Rarity } from "@/lib/apps";
import { Sound } from "@/lib/sound";

/**
 * The sealed booster pack on the landing screen, built from CSS 3D faces.
 *
 * The pack is two boxes stacked on top of each other: a thin top strip (the
 * part you tear off) and the body that holds the cards. Each box has a front,
 * back, and two side faces, so it reads as a solid object when it turns. The
 * foil art is one gradient sized to the whole pack and offset on each face, so
 * it runs across the tear line without a visible join.
 *
 * Idle, the pack sways and follows the pointer. `rip()` plays the opening:
 * it charges up and shakes, a light seam runs along the tear line, the strip
 * flies off, and light pours out of the opening. The caller gets the pack's
 * centre at that moment, which is where the cards fly out from.
 */

export type BoosterState = "idle" | "charging" | "tearing" | "burst";

export interface BoosterHandle {
  /** Play the opening. `onBurst` fires with the pack's centre (viewport px) as the strip comes off. */
  rip(onBurst: (center: { x: number; y: number }) => void): void;
}

const TEETH = 22;
const CRIMP = 7; // px depth of the crimped teeth

/** A zigzag edge for the crimped ends, as a clip-path polygon. */
function zigzag(edge: "top" | "bottom") {
  const pts = Array.from({ length: TEETH * 2 + 1 }, (_, i) => {
    const x = ((i / (TEETH * 2)) * 100).toFixed(2) + "%";
    const peak = i % 2 === 1;
    return edge === "top" ? `${x} ${peak ? "0px" : `${CRIMP}px`}` : `${x} ${peak ? "100%" : `calc(100% - ${CRIMP}px)`}`;
  });
  return edge === "top"
    ? `polygon(${pts.join(", ")}, 100% 100%, 0 100%)`
    : `polygon(0 0, 100% 0, ${pts.reverse().join(", ")})`;
}
const ZIG_TOP = zigzag("top");
const ZIG_BOTTOM = zigzag("bottom");

const RARITY_ORDER: Rarity[] = ["legendary", "holo", "rare", "common"];
const COUNTS = RARITY_ORDER.map((r) => ({ r, n: APPS.filter((a) => a.rarity === r).length })).filter((c) => c.n > 0);

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

export const Booster = forwardRef<BoosterHandle, { onRip: () => void }>(function Booster({ onRip }, ref) {
  const [state, setState] = useState<BoosterState>("idle");
  const floatRef = useRef<HTMLSpanElement>(null);
  const bpRef = useRef<HTMLSpanElement>(null);
  const topRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const seamRef = useRef<HTMLSpanElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);

  useImperativeHandle(ref, () => ({
    rip(onBurst) {
      if (busy.current) return;
      busy.current = true;
      const float = floatRef.current!;
      const bp = bpRef.current!;
      // Take over from the idle sway at whatever angle it is at right now, so the pack doesn't snap.
      const from = getComputedStyle(float).transform;
      float.getAnimations().forEach((a) => a.cancel());
      bp.style.setProperty("--rx", "0deg");
      bp.style.setProperty("--ry", "0deg");

      setState("charging");
      Sound.charge();
      const shake = (x: number, r: number, s: number) => `translate(${x}px, -10px) rotate(${r}deg) scale(${s})`;
      const charge = float.animate(
        [
          { transform: from === "none" ? "none" : from },
          { transform: "translateY(-8px) scale(1.03)", offset: 0.3 },
          { transform: shake(-2, -1, 1.04), offset: 0.42 },
          { transform: shake(3, 1.2, 1.045), offset: 0.52 },
          { transform: shake(-4, -1.6, 1.05), offset: 0.61 },
          { transform: shake(5, 2, 1.055), offset: 0.69 },
          { transform: shake(-6, -2.4, 1.06), offset: 0.76 },
          { transform: shake(6, 2.6, 1.065), offset: 0.82 },
          { transform: shake(-7, -2.8, 1.07), offset: 0.88 },
          { transform: shake(7, 3, 1.075), offset: 0.94 },
          { transform: "translate(0, -10px) scale(1.08)" },
        ],
        { duration: 820, easing: "ease-in", fill: "forwards" },
      );

      charge.finished.then(() => {
        setState("tearing");
        Sound.rip();
        const seam = seamRef.current!.animate(
          [{ transform: "scaleX(0)", opacity: 1 }, { transform: "scaleX(1)", opacity: 1 }],
          { duration: 360, easing: "cubic-bezier(.55,0,.45,1)", fill: "forwards" },
        );
        seam.finished.then(() => {
          setState("burst");
          Sound.burst();
          // Cards leave from the opening, just under the tear line.
          const r = bodyRef.current!.getBoundingClientRect();
          onBurst({ x: r.left + r.width / 2, y: r.top + r.height * 0.06 });
          topRef.current!.animate(
            [
              { transform: "none", opacity: 1 },
              { transform: "translate3d(30px, -50px, 40px) rotateZ(8deg) rotateX(-18deg)", opacity: 1, offset: 0.2 },
              { transform: "translate3d(300px, -520px, 160px) rotateZ(64deg) rotateX(-80deg)", opacity: 0 },
            ],
            { duration: 950, easing: "cubic-bezier(.2,.6,.3,1)", fill: "forwards" },
          );
          seamRef.current!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
          lightRef.current!.animate(
            [
              { transform: "scaleY(0) scaleX(.6)", opacity: 0 },
              { transform: "scaleY(1) scaleX(1)", opacity: 1, offset: 0.25 },
              { transform: "scaleY(1.2) scaleX(1.3)", opacity: 0 },
            ],
            { duration: 1100, easing: "ease-out", fill: "forwards" },
          );
          // Once the cards are out, the empty wrapper drops away.
          bodyRef.current!.animate(
            [
              { transform: "none", opacity: 1 },
              { transform: "translateY(14px)", opacity: 1, offset: 0.25 },
              { transform: "translateY(110vh) rotateZ(12deg) rotateX(30deg)", opacity: 1 },
            ],
            { duration: 1000, delay: 220, easing: "cubic-bezier(.55,0,.85,.45)", fill: "forwards" },
          );
        });
      });
    },
  }));

  /* the pack turns to follow the pointer; foil and gloss move with it */
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (state !== "idle") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    const s = bpRef.current!.style;
    s.setProperty("--rx", `${(-py * 26).toFixed(2)}deg`);
    s.setProperty("--ry", `${(px * 34).toFixed(2)}deg`);
    s.setProperty("--mx", px.toFixed(3));
    s.setProperty("--my", py.toFixed(3));
  };
  const onLeave = () => {
    const s = bpRef.current?.style;
    if (!s || state !== "idle") return;
    s.setProperty("--rx", "0deg");
    s.setProperty("--ry", "0deg");
  };

  const sides = (
    <>
      <span className="bpf bpf-l" />
      <span className="bpf bpf-r" />
    </>
  );

  return (
    <div className="booster-stage" data-state={state}>
      <span className="bs-rays" aria-hidden="true" />
      <span className="bs-rays fast" aria-hidden="true" />
      <span className="bs-glow" aria-hidden="true" />
      <span className="bs-flash" aria-hidden="true" />

      <p className="bs-kicker">★ BRIAN WONG&apos;S APP ARCADE ★</p>

      <button
        className="booster"
        aria-label={`Rip open the booster pack: ${APPS.length} app cards inside`}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onMouseEnter={() => state === "idle" && Sound.blip()}
        onClick={() => state === "idle" && onRip()}
      >
        <span className="bp-shadow" aria-hidden="true" />
        <span className="bp-float" ref={floatRef}>
          <span className="bp" ref={bpRef}>
            {/* the strip that tears off */}
            <span className="bp-part bp-top" ref={topRef}>
              <span className="bpf bpf-front bp-foil" style={{ clipPath: ZIG_TOP }}>
                <span className="bp-crimp" />
                <span className="bp-tearhere">✂ TEAR HERE</span>
                <span className="bp-holo" />
              </span>
              <span className="bpf bpf-back bp-foil" style={{ clipPath: ZIG_TOP }}>
                <span className="bp-crimp" />
              </span>
              {sides}
            </span>

            {/* the body that holds the cards */}
            <span className="bp-part bp-body" ref={bodyRef}>
              <span className="bp-light" ref={lightRef} />
              <span className="bpf bpf-front bp-foil" style={{ clipPath: ZIG_BOTTOM }}>
                <span className="bp-logo">
                  <span className="l1">APP</span>
                  <span className="l2">ARCADE</span>
                </span>
                <span className="bp-orbit" aria-hidden="true">
                  <span className="bp-ring">
                    {APPS.map((a, i) => (
                      <span key={a.id} className="bp-orb" style={cssVars({ "--a": `${(360 / APPS.length) * i}deg` })}>
                        <i>{a.icon}</i>
                      </span>
                    ))}
                  </span>
                  <span className="bp-fan">
                    <span className="mini m1" />
                    <span className="mini m2" />
                    <span className="mini m3">★</span>
                  </span>
                </span>
                <span className="bp-sticker">
                  LEGENDARY
                  <br />
                  INSIDE!
                </span>
                <span className="bp-ribbon">{APPS.length} APP CARDS</span>
                <span className="bp-series">SERIES 2026 · 1 PACK</span>
                <span className="bp-crimp bottom" />
                <span className="bp-holo" />
                <span className="bp-gloss" />
              </span>
              <span className="bpf bpf-back bp-foil" style={{ clipPath: ZIG_BOTTOM }}>
                <span className="bp-backtitle">WHAT&apos;S INSIDE</span>
                <span className="bp-odds">
                  {COUNTS.map(({ r, n }) => (
                    <span key={r} className={`odd r-${r}`}>
                      <b>{RARITY[r].gem}</b> {n} {RARITY[r].label}
                    </span>
                  ))}
                </span>
                <span className="bp-barcode" />
                <span className="bp-url">byebrianwong.com</span>
                <span className="bp-crimp bottom" />
              </span>
              {sides}
            </span>

            <span className="bp-seam" ref={seamRef} />
          </span>
        </span>
      </button>

      <p className="bs-hint">
        <span className="pointer-fine">CLICK</span>
        <span className="pointer-coarse">TAP</span> THE PACK TO RIP IT OPEN
      </p>
    </div>
  );
});
