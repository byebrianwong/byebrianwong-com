// Paper for the winter village: canvas-drawn textures and cut-paper figures.
//
// Everything here draws into 2D canvases. The figures (people, trees, the
// snowman) are drawn flat, then `paperize` cuts them out with a white margin
// and presses paper grain into them, the way a hand-cut paper figure looks.
// The canvases are cached at module level and shared by every mount of the
// scene; each renderer makes its own textures from them.

export const TAU = Math.PI * 2;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** A seeded random number generator (mulberry32), so the village looks the same every visit. */
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n3 = (x: number, y: number, z: number) =>
  Math.sin(x * 1.7 + y * 3.1 + z * 0.3) * Math.sin(y * 2.3 + z * 1.3 + x * 0.5) * Math.sin(z * 2.9 + x * 0.7 + y * 0.9);
/** Cheap smooth noise for lumps and snow drifts. Roughly -0.5..0.5. */
export const fbm = (x: number, y: number, z: number) =>
  n3(x, y, z) * 0.6 + n3(x * 2.1 + 5.2, y * 2.1 + 1.3, z * 2.1 + 3.7) * 0.3 + n3(x * 4.3 + 1, y * 4.3 + 7, z * 4.3 + 2) * 0.12;

const hexRGB = (hex: string) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
/** Mix two hex colours: t = 0 is `a`, t = 1 is `b`. */
export const mix = (a: string, b: string, t: number) => {
  const A = hexRGB(a), B = hexRGB(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

export const C = {
  snow: "#f6f5f2", paper: "#fbf8f1", cream: "#efe3cf", ink: "#2a2230", wood: "#a8744b", woodD: "#6b4a33",
  red: "#c8463d", green: "#2f6b55", navy: "#34507a", plum: "#7a4466", mustard: "#e0a73b", sky: "#5a8fb0",
  brick: "#8c4a3c", slate: "#3e3a3f", glow: "#ffc35e", icicle: "#e4eef4", log: "#8a5a3b", logD: "#74492f",
};

export interface Outfit { coat: string; hat: string; scarf: string; pants: string; mitt: string; skin: string; hair: string }
export const OUTFITS: Outfit[] = [
  { coat: "#c8463d", hat: "#2f6b55", scarf: "#f2c14e", pants: "#2d3446", mitt: "#2f6b55", skin: "#f1c7a5", hair: "#4a2e22" },
  { coat: "#2f6b55", hat: "#c8463d", scarf: "#fbf6ea", pants: "#3a3340", mitt: "#c8463d", skin: "#c68a62", hair: "#2a1c16" },
  { coat: "#34507a", hat: "#f2c14e", scarf: "#c8463d", pants: "#2d2a33", mitt: "#f2c14e", skin: "#8d5a3b", hair: "#1f1612" },
  { coat: "#e0a73b", hat: "#34507a", scarf: "#2f6b55", pants: "#3b3346", mitt: "#34507a", skin: "#f3d2b6", hair: "#a0602e" },
  { coat: "#7a4466", hat: "#fbf6ea", scarf: "#e98aa0", pants: "#2d3446", mitt: "#fbf6ea", skin: "#e0ad87", hair: "#3b2418" },
  { coat: "#5a8fb0", hat: "#c8463d", scarf: "#fbf6ea", pants: "#33303b", mitt: "#c8463d", skin: "#f1c7a5", hair: "#d9a95c" },
];

type G = CanvasRenderingContext2D;

export const mk = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};
const ctx2d = (c: HTMLCanvasElement) => c.getContext("2d")!;
const circ = (g: G, x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };
const rr = (g: G, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const seg = (g: G, a: number, b: number, c: number, d: number) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
/** A soft drop shadow under the next shapes, like a layer of paper sitting on another. */
const SH = (g: G, a = 0.26, b = 3, y = 1.5) => { g.shadowColor = `rgba(28,22,48,${a})`; g.shadowBlur = b; g.shadowOffsetY = y; g.shadowOffsetX = 0; };
const NOSH = (g: G) => { g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetY = 0; };

/* ---------------- paper grain ---------------- */

/** A tiling sheet of paper: grain and fibres, plus torn newspaper strips for papier-mâché. */
function paperCanvas(size: number, strips: boolean, seed: number) {
  const R = rng(seed), c = mk(size, size), g = ctx2d(c);
  const img = g.createImageData(size, size), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (236 + R() * 19) | 0;
    d[i] = v; d[i + 1] = v; d[i + 2] = v - 1; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // Draw each mark nine times, offset by a tile, so the sheet repeats without seams.
  const wrap = (fn: () => void) => {
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { g.save(); g.translate(ox, oy); fn(); g.restore(); }
  };
  if (strips) {
    for (let i = 0; i < 46; i++) {
      const x = R() * size, y = R() * size, a = R() * Math.PI, w = size * (0.06 + R() * 0.07), h = size * (0.2 + R() * 0.3);
      const dark = R() < 0.5, al = dark ? 0.018 + R() * 0.028 : 0.1 + R() * 0.12, pts: [number, number][] = [], n = 7;
      for (let s = 0; s <= n; s++) pts.push([-w / 2 + (R() - 0.5) * 3, -h / 2 + (h * s) / n]);
      for (let s = n; s >= 0; s--) pts.push([w / 2 + (R() - 0.5) * 3, -h / 2 + (h * s) / n]);
      wrap(() => {
        g.translate(x, y); g.rotate(a); g.beginPath();
        pts.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
        g.closePath();
        g.fillStyle = dark ? `rgba(60,48,36,${al})` : `rgba(255,255,255,${al})`; g.fill();
        g.strokeStyle = `rgba(60,48,36,${al * 0.9})`; g.lineWidth = 1; g.stroke();
      });
    }
  }
  for (let i = 0; i < 650; i++) {
    const x = R() * size, y = R() * size, a = R() * TAU, l = 2 + R() * 9, b = (R() - 0.5) * 4, al = 0.04 + R() * 0.05;
    wrap(() => {
      g.strokeStyle = `rgba(70,60,50,${al})`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + (Math.cos(a) * l) / 2 - Math.sin(a) * b, y + (Math.sin(a) * l) / 2 + Math.cos(a) * b, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    });
  }
  return c;
}

const CANVAS = new Map<string, HTMLCanvasElement>();
/** Draw a canvas once per key and reuse it. */
export const cached = (key: string, fn: () => HTMLCanvasElement) => {
  let c = CANVAS.get(key);
  if (!c) { c = fn(); CANVAS.set(key, c); }
  return c;
};

/** Plain drawing paper. */
export const paperSheet = () => cached("paper", () => paperCanvas(256, false, 3));
/** Papier-mâché: paper with torn newspaper strips pasted over it. */
export const macheSheet = () => cached("mache", () => paperCanvas(512, true, 9));

/** Cuts out whatever was drawn with a white margin around it, then presses paper grain into it. */
export function paperize(src: HTMLCanvasElement, { border = 5, fill = "#fbf8f1", grain = true } = {}) {
  const w = src.width, h = src.height, c = mk(w, h), g = ctx2d(c);
  if (border > 0) {
    for (const r of [border, border * 0.55]) for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; g.drawImage(src, Math.cos(a) * r, Math.sin(a) * r); }
    g.globalCompositeOperation = "source-in"; g.fillStyle = fill; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over";
  }
  g.drawImage(src, 0, 0);
  if (grain) {
    const keep = mk(w, h); ctx2d(keep).drawImage(c, 0, 0);
    g.globalCompositeOperation = "multiply"; g.fillStyle = g.createPattern(paperSheet(), "repeat")!; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "destination-in"; g.drawImage(keep, 0, 0); g.globalCompositeOperation = "source-over";
  }
  return c;
}
const cut = (w: number, h: number, draw: (g: G, w: number, h: number) => void, opts?: Parameters<typeof paperize>[1]) => {
  const t = mk(w, h);
  draw(ctx2d(t), w, h);
  return paperize(t, opts);
};

/* ---------------- people ---------------- */

export type Pose = "stand" | "walk" | "skate" | "push" | "carol" | "throw" | "wave" | "spin";
type Line = [number, number, number, number];

function drawPerson(g: G, o: Outfit & { pose: Pose; skates?: boolean; medal?: string | null }) {
  const P = o.pose;
  g.lineCap = "round"; g.lineJoin = "round";
  const legs: Record<Pose, Line[]> = {
    stand: [[54, 150, 52, 198], [66, 150, 68, 198]], walk: [[55, 150, 44, 198], [65, 150, 77, 198]],
    skate: [[56, 150, 50, 198], [64, 150, 94, 184]], push: [[54, 150, 38, 198], [66, 150, 62, 198]],
    carol: [[54, 150, 53, 198], [66, 150, 67, 198]], throw: [[55, 150, 45, 198], [65, 150, 75, 198]],
    wave: [[54, 150, 52, 198], [66, 150, 68, 198]], spin: [[56, 150, 58, 198], [64, 150, 84, 172]],
  };
  const arms: Record<Pose, Line[]> = {
    stand: [[48, 92, 42, 136], [72, 92, 78, 136]], walk: [[48, 92, 33, 130], [72, 92, 88, 128]],
    skate: [[48, 92, 14, 110], [72, 92, 106, 98]], push: [[52, 94, 100, 116], [68, 94, 104, 124]],
    carol: [[50, 94, 86, 112], [70, 94, 92, 106]], throw: [[48, 92, 40, 136], [72, 92, 92, 48]],
    wave: [[48, 92, 42, 136], [72, 92, 98, 56]], spin: [[48, 92, 36, 44], [72, 92, 84, 44]],
  };
  const L = legs[P], A = arms[P];
  const lean = ({ skate: 0.16, push: 0.3, walk: 0.04 } as Partial<Record<Pose, number>>)[P] ?? 0;
  SH(g);
  g.strokeStyle = o.pants; g.lineWidth = 13; L.forEach((l) => seg(g, ...l));
  L.forEach((l, i) => {
    const back = (P === "skate" || P === "spin") && i === 1, a = back ? -0.55 : 0;
    g.fillStyle = "#3b2b25"; g.beginPath(); g.ellipse(l[2] + 4, l[3] + 2, 10, 6, a, 0, TAU); g.fill();
    if (o.skates) {
      g.strokeStyle = "#a9b5c4"; g.lineWidth = 3;
      const cx = l[2] + 4 - Math.sin(a) * 8, cy = l[3] + 2 + Math.cos(a) * 8;
      seg(g, cx - 12 * Math.cos(a), cy - 12 * Math.sin(a), cx + 13 * Math.cos(a), cy + 13 * Math.sin(a));
    }
  });
  g.save(); g.translate(60, 150); g.rotate(lean); g.translate(-60, -150);
  g.strokeStyle = mix(o.coat, "#000000", 0.16); g.lineWidth = 12; seg(g, ...A[0]);
  g.fillStyle = o.mitt; circ(g, A[0][2], A[0][3], 6.5); g.fill();
  g.fillStyle = o.coat; g.beginPath(); g.moveTo(45, 84); g.quadraticCurveTo(60, 76, 75, 84); g.lineTo(85, 156); g.quadraticCurveTo(60, 163, 35, 156); g.closePath(); g.fill();
  NOSH(g); g.fillStyle = "rgba(255,255,255,.9)"; rr(g, 35, 150, 50, 9, 4.5); g.fill();
  g.fillStyle = "rgba(30,20,30,.35)"; [104, 120, 136].forEach((y) => { circ(g, 63, y, 2.2); g.fill(); });
  SH(g);
  if (o.medal) {
    g.strokeStyle = "#3b5bb5"; g.lineWidth = 3; seg(g, 52, 84, 62, 108); seg(g, 70, 84, 62, 108);
    g.fillStyle = o.medal; circ(g, 62, 112, 7); g.fill();
  }
  g.fillStyle = o.scarf; rr(g, 44, 74, 34, 12, 6); g.fill();
  g.save(); g.translate(50, 80); g.rotate(P === "skate" || P === "spin" ? 1.25 : 0.14); rr(g, -5, 0, 10, 30, 4); g.fill(); g.restore();
  g.strokeStyle = o.coat; g.lineWidth = 12; seg(g, ...A[1]);
  g.fillStyle = o.mitt; circ(g, A[1][2], A[1][3], 6.5); g.fill();
  if (P === "carol") {
    g.fillStyle = "#9b2f36"; g.save(); g.translate(92, 108); g.rotate(-0.3); rr(g, -10, -12, 20, 24, 2); g.fill();
    g.fillStyle = "#fbf6ea"; g.fillRect(-1, -10, 2, 20); g.restore();
  }
  g.fillStyle = o.hair; circ(g, 50, 60, 15); g.fill();
  g.fillStyle = o.skin; circ(g, 60, 56, 19); g.fill();
  NOSH(g);
  g.fillStyle = "#2a2230"; circ(g, 69, 54, 2.3); g.fill();
  g.fillStyle = "rgba(232,110,110,.45)"; circ(g, 66, 63, 4.5); g.fill();
  g.fillStyle = mix(o.skin, "#a0522d", 0.25); circ(g, 78, 58, 3); g.fill();
  if (P === "carol") { g.fillStyle = "#5b2430"; circ(g, 73, 67, 3.2); g.fill(); }
  SH(g, 0.2, 2, 1);
  g.fillStyle = o.hat; g.beginPath(); g.arc(60, 51, 20.5, Math.PI, 0); g.closePath(); g.fill();
  g.fillStyle = "#fbf6ea"; rr(g, 38, 45, 44, 10, 5); g.fill();
  circ(g, 60, 29, 8); g.fill();
  g.restore(); NOSH(g);
}
export const personCanvas = (o: Outfit, pose: Pose, skates = false, medal: string | null = null) =>
  cached("person" + JSON.stringify([o, pose, skates, medal]), () => cut(120, 220, (g) => drawPerson(g, { ...o, pose, skates, medal }), { border: 5 }));

function drawSledKid(g: G, o: Outfit) {
  g.lineCap = "round"; g.lineJoin = "round"; SH(g);
  g.strokeStyle = "#5b3a29"; g.lineWidth = 5; g.beginPath(); g.moveTo(18, 112); g.lineTo(140, 112); g.quadraticCurveTo(160, 112, 156, 94); g.stroke();
  seg(g, 40, 112, 40, 100); seg(g, 116, 112, 116, 100);
  g.fillStyle = "#c8463d"; rr(g, 16, 86, 132, 18, 6); g.fill();
  g.strokeStyle = o.pants; g.lineWidth = 12; seg(g, 72, 82, 118, 80);
  g.fillStyle = "#3b2b25"; g.beginPath(); g.ellipse(122, 78, 9, 6, -0.3, 0, TAU); g.fill();
  g.fillStyle = o.coat; g.beginPath(); g.ellipse(64, 64, 22, 26, -0.2, 0, TAU); g.fill();
  g.strokeStyle = o.coat; g.lineWidth = 11; seg(g, 58, 50, 40, 20); seg(g, 72, 50, 86, 18);
  g.fillStyle = o.mitt; circ(g, 40, 20, 6); g.fill(); circ(g, 86, 18, 6); g.fill();
  g.fillStyle = o.scarf; rr(g, 46, 36, 34, 11, 5); g.fill();
  g.fillStyle = o.skin; circ(g, 64, 26, 15); g.fill();
  NOSH(g); g.fillStyle = "#2a2230"; circ(g, 71, 24, 2); g.fill(); g.fillStyle = "#5b2430"; circ(g, 72, 32, 2.6); g.fill();
  SH(g, 0.2, 2, 1); g.fillStyle = o.hat; g.beginPath(); g.arc(64, 22, 16, Math.PI, 0); g.closePath(); g.fill();
  g.fillStyle = "#fbf6ea"; rr(g, 46, 17, 36, 8, 4); g.fill(); circ(g, 64, 5, 6); g.fill();
  NOSH(g);
}
export const sledCanvas = (o: Outfit) => cached("sled" + JSON.stringify(o), () => cut(170, 130, (g) => drawSledKid(g, o), { border: 5 }));

function drawSnowman(g: G) {
  SH(g, 0.22, 4, 2);
  const ball = (x: number, y: number, r: number) => {
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.2, x, y, r);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#d9e2ef"); g.fillStyle = gr; circ(g, x, y, r); g.fill();
  };
  ball(65, 162, 38); ball(65, 104, 29); ball(65, 60, 21);
  NOSH(g); g.strokeStyle = "#6b4a33"; g.lineWidth = 4; g.lineCap = "round";
  seg(g, 40, 100, 12, 76); seg(g, 22, 84, 14, 92); seg(g, 90, 100, 118, 80); seg(g, 108, 86, 116, 94);
  g.fillStyle = "#2a2230"; [[58, 56], [72, 56], [65, 96], [65, 110]].forEach(([x, y]) => { circ(g, x, y, 2.8); g.fill(); });
  g.fillStyle = "#ef8a2c"; g.beginPath(); g.moveTo(66, 61); g.lineTo(92, 65); g.lineTo(66, 67); g.closePath(); g.fill();
  SH(g, 0.2, 2, 1); g.fillStyle = "#c8463d"; rr(g, 42, 76, 46, 10, 5); g.fill(); rr(g, 72, 78, 10, 26, 4); g.fill();
  g.fillStyle = "#2a2230"; rr(g, 49, 18, 32, 24, 2); g.fill(); rr(g, 40, 38, 50, 6, 3); g.fill();
  g.fillStyle = "#2f6b55"; g.fillRect(49, 32, 32, 5); NOSH(g);
}
export const snowmanCanvas = () => cached("snowman", () => cut(130, 210, drawSnowman, { border: 5 }));

function drawDog(g: G) {
  g.lineCap = "round"; SH(g);
  g.strokeStyle = "#7a5235"; g.lineWidth = 7; seg(g, 34, 50, 26, 72); seg(g, 44, 52, 44, 74); seg(g, 70, 52, 72, 74); seg(g, 78, 50, 86, 72);
  g.lineWidth = 6; g.beginPath(); g.moveTo(26, 42); g.quadraticCurveTo(10, 36, 14, 20); g.stroke();
  g.fillStyle = "#9b6a43"; g.beginPath(); g.ellipse(56, 44, 32, 15, 0, 0, TAU); g.fill();
  g.fillStyle = "#c8463d"; rr(g, 78, 30, 8, 18, 3); g.fill();
  g.fillStyle = "#9b6a43"; circ(g, 92, 30, 14); g.fill(); g.beginPath(); g.ellipse(104, 34, 9, 7, 0, 0, TAU); g.fill();
  NOSH(g); g.fillStyle = "#5a3a24"; g.beginPath(); g.ellipse(86, 26, 6, 11, 0.5, 0, TAU); g.fill();
  g.fillStyle = "#2a2230"; circ(g, 97, 26, 2.2); g.fill(); circ(g, 112, 32, 3); g.fill();
}
export const dogCanvas = () => cached("dog", () => cut(126, 86, drawDog, { border: 4 }));

/* ---------------- trees ---------------- */

interface TreeStyle { c1: string; c2: string; seed: number; big?: boolean; tiers?: [number, number, number][] }

function drawTree(g: G, o: TreeStyle, W: number, H: number) {
  const R = rng(o.seed), cx = W / 2;
  g.lineJoin = "round"; SH(g, 0.25, 4, 2);
  g.fillStyle = "#6b4a33"; rr(g, cx - 8, H - 46, 16, 36, 3); g.fill();
  const tiers = o.tiers ?? [[H - 34, H * 0.55, W * 0.9], [H * 0.7, H * 0.33, W * 0.72], [H * 0.5, 12, W * 0.5]];
  tiers.forEach(([base, apex, w], ti) => {
    const n = 5, tips: number[] = [];
    g.beginPath(); g.moveTo(cx, apex); g.lineTo(cx + w / 2, base);
    for (let i = n - 1; i >= 0; i--) {
      const x0 = cx - w / 2 + (w * (i + 1)) / n, x1 = cx - w / 2 + (w * i) / n;
      g.quadraticCurveTo((x0 + x1) / 2, base + 9 + R() * 5, x1, base); tips.push((x0 + x1) / 2);
    }
    g.closePath(); g.fillStyle = ti % 2 ? o.c2 : o.c1; g.fill();
    g.save(); g.clip(); NOSH(g); g.fillStyle = "rgba(10,30,25,.22)";
    g.beginPath(); g.moveTo(cx + 2, apex); g.lineTo(cx + w, base + 20); g.lineTo(cx + w, apex); g.fill(); g.restore();
    SH(g, 0.18, 2, 1); g.fillStyle = "#fbfcff";
    tips.forEach((x) => { circ(g, x, base + 2, (w / n) * 0.28); g.fill(); });
    g.beginPath(); g.moveTo(cx, apex - 2); g.lineTo(cx + w * 0.17, apex + (base - apex) * 0.32);
    g.quadraticCurveTo(cx, apex + (base - apex) * 0.42, cx - w * 0.17, apex + (base - apex) * 0.32); g.closePath(); g.fill();
    SH(g, 0.25, 4, 2);
  });
  NOSH(g);
  if (o.big) {
    const cols = ["#c8463d", "#e8b04a", "#5a8fb0", "#fbf6ea", "#7a4466"];
    for (let i = 0; i < 34; i++) {
      const t = R(), y = lerp(40, H - 60, t), half = lerp(W * 0.12, W * 0.4, t) * 0.85, x = cx + (R() * 2 - 1) * half;
      SH(g, 0.25, 2, 1); g.fillStyle = cols[i % cols.length]; circ(g, x, y, 5 + R() * 3); g.fill();
    }
    NOSH(g); g.fillStyle = "#f2c14e"; g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 9 : 22, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(cx + Math.cos(a) * r, 26 + Math.sin(a) * r); }
    g.closePath(); g.fill();
  }
}
const TREE_STYLES: TreeStyle[] = [
  { c1: "#2f6b55", c2: "#24574a", seed: 1 }, { c1: "#3f7d5c", c2: "#2f6b4c", seed: 2 },
  { c1: "#4b6f4f", c2: "#3c5d40", seed: 3 }, { c1: "#2a5d5a", c2: "#214c49", seed: 4 },
];
export const TREE_VARIANTS = TREE_STYLES.length;
export const treeCanvas = (i: number) => cached("tree" + i, () => cut(160, 260, (g, w, h) => drawTree(g, TREE_STYLES[i], w, h), { border: 5 }));
export const bigTreeCanvas = () =>
  cached("bigtree", () =>
    cut(300, 520, (g, w, h) => drawTree(g, {
      c1: "#2f6b55", c2: "#265e4a", seed: 7, big: true,
      tiers: [[h - 34, h * 0.62, w * 0.94], [h * 0.78, h * 0.44, w * 0.8], [h * 0.6, h * 0.27, w * 0.62], [h * 0.43, h * 0.12, w * 0.45], [h * 0.25, 30, w * 0.3]],
    }, w, h), { border: 6 }));

/* ---------------- small things ---------------- */

export const puffCanvas = () => cached("puff", () => cut(96, 96, (g) => {
  g.fillStyle = "#f4f2f6"; circ(g, 34, 54, 22); g.fill(); circ(g, 56, 44, 26); g.fill(); circ(g, 62, 62, 18); g.fill();
}, { border: 3 }));

export const flakeCanvas = () => cached("flake", () => {
  const c = mk(32, 32), g = ctx2d(c), gr = g.createRadialGradient(16, 16, 2, 16, 16, 15);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.6, "rgba(255,255,255,.95)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; circ(g, 16, 16, 15); g.fill();
  return c;
});

export const glowCanvas = () => cached("glow", () => {
  const c = mk(64, 64), g = ctx2d(c), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,214,140,.9)"); gr.addColorStop(0.35, "rgba(255,190,110,.35)"); gr.addColorStop(1, "rgba(255,180,100,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return c;
});

export const noteCanvas = () => cached("note", () => cut(60, 80, (g) => {
  g.fillStyle = "#2a2230"; g.beginPath(); g.ellipse(22, 62, 11, 8, -0.4, 0, TAU); g.fill(); g.fillRect(30, 12, 4, 50);
  g.beginPath(); g.moveTo(30, 12); g.quadraticCurveTo(50, 20, 46, 40); g.lineTo(42, 38); g.quadraticCurveTo(44, 26, 34, 22); g.fill();
}, { border: 4 }));

export const starCanvas = () => cached("star", () => cut(80, 80, (g) => {
  SH(g); g.fillStyle = "#ffd86b"; g.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 13 : 32, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(40 + Math.cos(a) * r, 42 + Math.sin(a) * r); }
  g.closePath(); g.fill();
}, { border: 4 }));

/** The rink: pale ice criss-crossed with skate marks. */
export const iceCanvas = () => cached("ice", () => {
  const c = mk(512, 512), g = ctx2d(c), R = rng(11);
  const gr = g.createRadialGradient(240, 220, 30, 256, 256, 300); gr.addColorStop(0, "#dcedf3"); gr.addColorStop(1, "#a9cfdf");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(255,255,255,.55)"; g.lineCap = "round";
  for (let i = 0; i < 46; i++) {
    g.lineWidth = 0.8 + R() * 1.6; g.beginPath();
    g.ellipse(256 + (R() - 0.5) * 80, 256 + (R() - 0.5) * 80, 60 + R() * 180, 40 + R() * 150, R() * TAU, R() * TAU, R() * TAU + 1 + R() * 2);
    g.stroke();
  }
  return paperize(c, { border: 0 });
});

const HAND = '"Caveat Brush", "Marker Felt", "Comic Sans MS", cursive';
const DISPLAY = '"Bricolage Grotesque", system-ui, sans-serif';

/** A hand-lettered wooden-post sign. Long names wrap onto two lines. */
export const signCanvas = (text: string, accent: string) => cached("sign" + text + accent, () => cut(420, 150, (g, w, h) => {
  SH(g, 0.3, 5, 2); g.fillStyle = "#fbf6ea"; rr(g, 12, 12, w - 24, h - 24, 14); g.fill(); NOSH(g);
  g.lineWidth = 7; g.strokeStyle = accent; rr(g, 22, 22, w - 44, h - 44, 10); g.stroke();
  g.fillStyle = "#2a2230"; g.textAlign = "center"; g.textBaseline = "middle";
  const font = (s: number) => `${s}px ${HAND}`;
  let fs = 66; g.font = font(fs);
  if (g.measureText(text).width > w - 80) {
    const words = text.split(" "), half = Math.ceil(words.length / 2), lines = [words.slice(0, half).join(" "), words.slice(half).join(" ")];
    fs = 52; g.font = font(fs);
    while (Math.max(...lines.map((l) => g.measureText(l).width)) > w - 80 && fs > 24) { fs -= 2; g.font = font(fs); }
    g.fillText(lines[0], w / 2, h / 2 - fs * 0.45 + 3); g.fillText(lines[1], w / 2, h / 2 + fs * 0.5 + 3);
  } else {
    while (g.measureText(text).width > w - 80) { fs -= 2; g.font = font(fs); }
    g.fillText(text, w / 2, h / 2 + 4);
  }
}, { border: 6 }));

/* ---------------- pictures pasted on the app buildings ---------------- */

export const cerealLabelCanvas = (accent: string) => cached("cereal" + accent, () => cut(256, 300, (g, w) => {
  g.fillStyle = accent; g.fillRect(0, 0, w, 300); g.fillStyle = "#fbf6ea"; rr(g, 18, 18, w - 36, 70, 10); g.fill();
  g.fillStyle = "#2a2230"; g.font = `800 44px ${DISPLAY}`; g.textAlign = "center"; g.fillText("BORING", w / 2, 68);
  g.fillStyle = "#fbf6ea"; g.beginPath(); g.ellipse(w / 2, 210, 88, 40, 0, 0, Math.PI); g.fill(); g.fillStyle = "#d7a15b";
  for (let i = 0; i < 16; i++) { circ(g, w / 2 - 70 + (i % 8) * 20, 200 - (i > 7 ? 10 : 0), 9); g.fill(); }
  g.fillStyle = "#2a2230"; g.font = `600 22px "Inter Tight", system-ui, sans-serif`; g.fillText("100% CEREAL", w / 2, 120);
}, { border: 0 }));

export const numberCanvas = (n: string) => cached("num" + n, () => cut(120, 140, (g) => {
  g.fillStyle = n === "2" ? "#e4e7ee" : "#fbf6ea"; g.font = `800 120px ${DISPLAY}`; g.textAlign = "center"; g.fillText(n, 60, 118);
}, { border: 0 }));

/** Triveal's clock counts clues down: 4, 3, 2, 1. */
export const clockCanvas = () => cached("clock", () => cut(200, 200, (g) => {
  g.fillStyle = "#fbf6ea"; circ(g, 100, 100, 96); g.fill(); g.fillStyle = "#2a2230"; g.font = `700 34px ${DISPLAY}`;
  g.textAlign = "center"; g.textBaseline = "middle";
  ["4", "3", "2", "1"].forEach((n, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 2; g.fillText(n, 100 + Math.cos(a) * 68, 100 + Math.sin(a) * 68); });
}, { border: 0 }));

export const todoCanvas = () => cached("todo", () => cut(220, 260, (g) => {
  g.fillStyle = "#fbf6ea"; rr(g, 6, 6, 208, 248, 8); g.fill();
  [80, 140, 200].forEach((y, i) => {
    g.strokeStyle = "#c7d3e0"; g.lineWidth = 2; g.beginPath(); g.moveTo(20, y + 22); g.lineTo(200, y + 22); g.stroke();
    g.strokeStyle = "#2a2230"; g.lineWidth = 4; g.strokeRect(24, y - 14, 28, 28);
    if (i < 2) { g.strokeStyle = "#3fae6a"; g.lineWidth = 7; g.beginPath(); g.moveTo(28, y); g.lineTo(38, y + 10); g.lineTo(58, y - 18); g.stroke(); }
    g.fillStyle = "#9aa6b6"; g.fillRect(66, y - 6, 110 - i * 20, 12);
  });
  g.fillStyle = "#2a2230"; g.font = `400 40px ${HAND}`; g.textAlign = "center"; g.fillText("to do", 110, 46);
}, { border: 0 }));

export const vinylCanvas = (accent: string) => cached("vinyl" + accent, () => cut(256, 256, (g) => {
  g.fillStyle = "#1f1b24"; circ(g, 128, 128, 126); g.fill(); g.strokeStyle = "rgba(255,255,255,.12)";
  for (let r = 50; r < 122; r += 7) { g.lineWidth = 1.5; circ(g, 128, 128, r); g.stroke(); }
  g.fillStyle = accent; circ(g, 128, 128, 44); g.fill(); g.fillStyle = "#fbf6ea"; circ(g, 128, 128, 7); g.fill();
}, { border: 0 }));

export const rulerCanvas = () => cached("ruler", () => cut(60, 480, (g) => {
  g.fillStyle = "#fbf6ea"; g.fillRect(0, 0, 60, 480); g.strokeStyle = "#2a2230";
  for (let i = 0; i <= 40; i++) {
    g.lineWidth = i % 5 ? 2 : 3; g.beginPath(); g.moveTo(0, 470 - i * 11.5); g.lineTo(i % 5 ? 18 : 32, 470 - i * 11.5); g.stroke();
  }
}, { border: 0 }));
