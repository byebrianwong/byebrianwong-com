// What the winter village is made of: houses, paper people, props, and one
// themed building per app. Every builder works in its own local space: it
// stands on y = 0, faces +z (towards the camera), and the village places it.

import * as THREE from "three";
import type { AppCard } from "@/lib/apps";
import { Bake, type Kit, type Shapes } from "./mache";
import {
  C, OUTFITS, TAU, clockCanvas, cerealLabelCanvas, dogCanvas, mix, numberCanvas, personCanvas,
  rulerCanvas, signCanvas, snowmanCanvas, starCanvas, todoCanvas, vinylCanvas, type Pose,
} from "./paper";

/** Something that moves every frame. `t` is seconds since the village opened (frozen for reduced motion). */
export type Mover = (t: number, dt: number) => void;

export interface Ctx {
  k: Kit;
  S: Shapes;
  scene: THREE.Scene;
  movers: Mover[];
  /** Height of the snow at (x, z). */
  gh: (x: number, z: number) => number;
}

/** A building and where its hover tag and sign go. */
export interface Built {
  g: THREE.Group;
  /** Height above the ground for the hover tag. */
  top: number;
  /** Where the name sign stands, relative to the building, or null for no sign. */
  sign: [number, number] | null;
  /** Chimney tops, relative to the building, for smoke. */
  smoke?: THREE.Vector3[];
}

/* ---------------- houses ---------------- */

export interface HouseOpts {
  w?: number; d?: number; h?: number; wall?: string; roof?: string; seed?: number;
  chimney?: boolean; door?: boolean; logs?: boolean;
}

/** A snowy cottage: lumpy walls, a gabled roof under a blanket of snow, icicles, lit windows, a wreath on the door. */
export function house(c: Ctx, o: HouseOpts): Built {
  const { k, S } = c;
  const { w = 3, d = 2.6, h = 2.2, wall = C.red, roof = C.slate, seed = 0, chimney = true, door = true, logs = false } = o;
  const b = new Bake(k);
  if (logs) {
    // A log cabin: a dark core with round logs stacked along the front and sides.
    b.add(S.rb(w - 0.1, h, d - 0.1, 0.1, 0.02, seed), C.logD, { y: h / 2 });
    const n = Math.round(h / 0.34);
    for (let i = 0; i < n; i++) {
      const y = 0.17 + i * (h / n), col = i % 2 ? C.log : C.logD;
      b.add(S.cyl(0.17, 0.17, w + 0.3, 10, 0.02, i), col, { y, z: d / 2 - 0.08, rz: Math.PI / 2 });
      b.add(S.cyl(0.17, 0.17, d + 0.3, 10, 0.02, i + 9), col, { x: w / 2 - 0.08, y: y + 0.08, rx: Math.PI / 2 });
      b.add(S.cyl(0.17, 0.17, d + 0.3, 10, 0.02, i + 19), col, { x: -w / 2 + 0.08, y: y + 0.08, rx: Math.PI / 2 });
    }
  } else {
    b.add(S.rb(w, h, d, 0.16, 0.05, seed), wall, { y: h / 2 });
  }
  const pitch = 0.62, tp = Math.tan(pitch), yr = h + (d / 2) * tp, slab = (d / 2 + 0.32) / Math.cos(pitch), th = 0.2;
  const tri = new THREE.Shape();
  tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, (d / 2) * tp); tri.closePath();
  b.add(k.geo(`gab${d}|${w}`, () => {
    const g = new THREE.ExtrudeGeometry(tri, { depth: w - 0.12, bevelEnabled: false });
    g.rotateY(Math.PI / 2); g.translate(-(w - 0.12) / 2, 0, 0);
    return g;
  }), logs ? C.log : wall, { y: h });
  for (const s of [1, -1]) {
    const dY = -Math.sin(pitch), dZ = s * Math.cos(pitch), nY = Math.cos(pitch), nZ = s * Math.sin(pitch);
    const cY = yr + dY * (slab / 2) + nY * (th / 2), cZ = dZ * (slab / 2) + nZ * (th / 2);
    b.add(S.rb(w + 0.5, th, slab, 0.08, 0.04, seed + s), roof, { y: cY, z: cZ, rx: s * pitch });
    const st = 0.2, off = th / 2 + st / 2 - 0.03;
    b.add(S.rb(w + 0.58, st, slab + 0.06, 0.1, 0.08, seed + s * 3), C.snow, { y: cY + nY * off, z: cZ + nZ * off, rx: s * pitch });
    if (s === 1) {
      const eY = yr + dY * slab - 0.02, eZ = dZ * slab;
      for (let i = 0; i < 6; i++) b.add(S.cone(0.05, 0.24 + (i % 3) * 0.06, 6, 0), C.icicle, { x: -w / 2 + 0.25 + (i * (w - 0.5)) / 5, y: eY - 0.15, z: eZ - 0.05, rx: Math.PI });
    }
  }
  b.add(S.rb(w + 0.6, 0.24, 0.36, 0.1, 0.06, seed + 9), C.snow, { y: yr + th + 0.02 });
  const fz = d / 2 + (logs ? 0.1 : 0);
  const win = (x: number, y: number, z: number, ry = 0) => {
    const nx = Math.sin(ry), nz = Math.cos(ry);
    b.add(S.rb(0.66, 0.76, 0.1, 0.04, 0.01), C.paper, { x, y, z, ry });
    b.add(S.rb(0.5, 0.6, 0.1, 0.03, 0), C.glow, { x: x + nx * 0.025, y, z: z + nz * 0.025, ry, glow: true });
    b.add(S.rb(0.06, 0.6, 0.1, 0.02, 0), C.paper, { x: x + nx * 0.05, y, z: z + nz * 0.05, ry });
    b.add(S.rb(0.5, 0.06, 0.1, 0.02, 0), C.paper, { x: x + nx * 0.05, y, z: z + nz * 0.05, ry });
  };
  const dx = w > 3.1 ? w * 0.14 : w * 0.22;
  if (door) {
    b.add(S.rb(0.66, 1.12, 0.14, 0.08, 0.02), mix(logs ? C.log : wall, "#2a1a12", 0.55), { x: dx, y: 0.56, z: fz });
    b.add(S.tor(0.15, 0.055, 0.01), C.green, { x: dx, y: 0.84, z: fz + 0.1 });
    b.add(S.sph(0.05, 0), C.red, { x: dx, y: 0.72, z: fz + 0.14 });
    b.add(S.rb(0.9, 0.14, 0.5, 0.06, 0.05), C.snow, { x: dx, y: 0.05, z: fz + 0.25 });
  }
  win(door ? -w * 0.25 : 0, h * 0.52 + 0.1, fz);
  if (w > 3.1 && door) win(w * 0.38, h * 0.52 + 0.1, fz);
  if (h > 2.8) { win(-w * 0.25, h * 0.82, fz); win(dx, h * 0.82, fz); }
  win(w / 2 + (logs ? 0.12 : 0), h * 0.52 + 0.1, 0, Math.PI / 2);
  const smoke: THREE.Vector3[] = [];
  if (chimney) {
    const cx = w * 0.27, cz = -d * 0.18, base = yr - Math.abs(cz) * tp;
    b.add(S.rb(0.42, 1.1, 0.42, 0.06, 0.03), C.brick, { x: cx, y: base + 0.3, z: cz });
    b.add(S.rb(0.52, 0.16, 0.52, 0.07, 0.05), C.snow, { x: cx, y: base + 0.88, z: cz });
    smoke.push(new THREE.Vector3(cx, base + 1.1, cz));
  }
  return { g: b.group(), top: yr + 0.6, sign: [-w / 2 - 0.5, d / 2 + 0.8], smoke };
}

/* ---------------- paper people ---------------- */

export interface Actor {
  root: THREE.Group;
  /** Face left or right by flipping the cutout, like a paper puppet. */
  face(dx: number): void;
  pose(kind: "walk" | "skate" | "sway" | "hop", ph: number): void;
}

export function actor(c: Ctx, o: { outfit: number; pose: Pose; kid?: boolean; skates?: boolean; medal?: string; scale?: number }): Actor {
  const out = OUTFITS[o.outfit % OUTFITS.length];
  const h = (o.kid ? 1.12 : 1.6) * (o.scale ?? 1);
  const m = c.k.cutout(personCanvas(out, o.pose, !!o.skates, o.medal ?? null), h, { foot: 0.04 });
  const root = new THREE.Group();
  root.add(m);
  return {
    root,
    face(dx) { if (Math.abs(dx) > 1e-3) m.scale.x = dx > 0 ? 1 : -1; },
    pose(kind, ph) {
      if (kind === "walk") { m.position.y = Math.abs(Math.sin(ph)) * 0.07; m.rotation.z = Math.sin(ph) * 0.05; }
      else if (kind === "skate") { m.position.y = 0; m.rotation.z = Math.sin(ph * 0.5) * 0.06; }
      else if (kind === "sway") { m.rotation.z = Math.sin(ph) * 0.08; m.position.y = Math.max(0, Math.sin(ph * 2)) * 0.03; }
      else { m.position.y = Math.max(0, Math.sin(ph)) * 0.18; }
    },
  };
}

export const snowman = (c: Ctx) => c.k.cutout(snowmanCanvas(), 1.7, { foot: 0.03 });

export function dog(c: Ctx) {
  const m = c.k.cutout(dogCanvas(), 0.55, { foot: 0.05 });
  const root = new THREE.Group();
  root.add(m);
  return {
    root,
    face(dx: number) { if (Math.abs(dx) > 1e-3) m.scale.x = dx > 0 ? 1 : -1; },
    bob(ph: number) { m.position.y = Math.abs(Math.sin(ph)) * 0.08; },
  };
}

/* ---------------- signs ---------------- */

/** A hand-lettered name sign on a wooden post. */
export function sign(c: Ctx, name: string, accent: string, w = 2.3) {
  const m = c.k.cutout(signCanvas(name, accent), (w * 150) / 420, { w, foot: 0 });
  const g = new THREE.Group();
  m.position.y = 0.55; g.add(m);
  const post = new THREE.Mesh(c.S.cyl(0.05, 0.06, 0.6, 6, 0), c.k.paint(C.woodD));
  post.position.y = 0.3; post.castShadow = true; g.add(post);
  return g;
}

/** A flat picture pasted onto a building. */
function picture(c: Ctx, canvas: HTMLCanvasElement, w: number, h: number) {
  const m = new THREE.Mesh(c.S.plane(w, h), c.k.label(canvas));
  m.receiveShadow = true;
  return m;
}

/* ---------------- one building per app ---------------- */

type Builder = (c: Ctx, a: AppCard) => Built;

export const BUILDERS: Record<string, Builder> = {
  /** A camera you could walk into. */
  "wonder-lens"(c, a) {
    const { S, k } = c, b = new Bake(k);
    b.add(S.rb(3.2, 2.1, 2.2, 0.35, 0.06, 1), a.accent, { y: 1.05 }); b.add(S.rb(3.3, 0.3, 2.3, 0.14, 0.08, 2), C.snow, { y: 2.18 });
    b.add(S.cyl(0.85, 0.95, 0.75, 28, 0.03), "#2b2f3a", { y: 1.05, z: 1.4, rx: Math.PI / 2 }); b.add(S.tor(0.8, 0.09, 0.01), "#d8d2c4", { y: 1.05, z: 1.78 });
    b.add(S.cyl(0.62, 0.62, 0.1, 28, 0), "#9fd4ff", { y: 1.05, z: 1.76, rx: Math.PI / 2, glow: true });
    b.add(S.rb(0.95, 0.52, 0.6, 0.12, 0.03), C.paper, { x: -0.85, y: 2.5 }); b.add(S.rb(0.72, 0.34, 0.1, 0.06, 0), "#fff4d6", { x: -0.85, y: 2.5, z: 0.3, glow: true });
    b.add(S.cyl(0.22, 0.22, 0.24, 16, 0.01), C.red, { x: 1, y: 2.42, z: 0.2 }); b.add(S.rb(0.6, 0.9, 0.12, 0.08, 0.01), C.woodD, { x: 1.15, y: 0.45, z: 1.12 });
    b.add(S.rb(0.5, 0.36, 0.1, 0.05, 0), C.glow, { x: -1.15, y: 1.5, z: 1.12, glow: true });
    return { g: b.group(), top: 2.9, sign: [-1.9, 1.9] };
  },
  /** A shop shaped like a cereal box, with a giant spoon leaning on it. */
  "saturday-boring-cereal"(c, a) {
    const { S, k } = c, b = new Bake(k);
    b.add(S.rb(2.4, 3.9, 1.3, 0.1, 0.05, 3), a.accent, { y: 1.95 }); b.add(S.rb(2.5, 0.25, 1.4, 0.1, 0.08, 4), C.snow, { y: 3.95 });
    b.add(S.rb(1.2, 0.1, 0.55, 0.03, 0.02), mix(a.accent, "#000000", 0.15), { x: -0.55, y: 4.05, z: 0.3, rx: 0.5 });
    b.add(S.rb(0.7, 1.1, 0.12, 0.08, 0.01), C.woodD, { x: -0.62, y: 0.55, z: 0.66 });
    b.add(S.cyl(0.08, 0.08, 3, 8, 0.01), "#c9ccd3", { x: 1.55, y: 1.45, z: 0.35, rz: 0.32 });
    b.add(S.sph(0.42, 0.03), "#c9ccd3", { x: 1.05, y: 2.9, z: 0.35, sx: 0.7, sy: 0.4, sz: 1, rz: 0.32 });
    const g = b.group();
    const label = picture(c, cerealLabelCanvas(a.accent), 1.9, 2.2);
    label.position.set(0.15, 2.25, 0.67); g.add(label);
    return { g, top: 4.2, sign: [-1.7, 1.4] };
  },
  /** A beehive gift shop with a bow on top and a bee doing laps. */
  regibee(c, a) {
    const { S, k } = c, b = new Bake(k);
    for (let i = 0; i < 5; i++) b.add(S.tor(1.42 - i * 0.24, 0.34, 0.03, i), i % 2 ? mix(a.accent, "#000000", 0.12) : a.accent, { y: 0.34 + i * 0.5, rx: Math.PI / 2 });
    b.add(S.sph(0.5, 0.03), a.accent, { y: 2.75 }); b.add(S.sph(0.42, 0.05, 5, true), C.snow, { y: 2.88 });
    b.add(S.rb(0.7, 1, 0.3, 0.3, 0.01), "#5a3a22", { y: 0.5, z: 1.4 });
    b.add(S.tor(0.24, 0.07, 0.01), C.red, { x: -0.25, y: 3.45, rz: 0.7 }); b.add(S.tor(0.24, 0.07, 0.01), C.red, { x: 0.25, y: 3.45, rz: -0.7 }); b.add(S.sph(0.1, 0), C.red, { y: 3.35 });
    b.add(S.rb(0.42, 0.3, 0.1, 0.05, 0), C.glow, { x: 0.75, y: 1.4, z: 1.05, ry: 0.6, glow: true });
    const g = b.group();
    const bee = new Bake(k);
    bee.add(S.sph(0.17, 0), "#f2c14e", { sx: 1.3 }); bee.add(S.tor(0.15, 0.035, 0), C.ink, { ry: Math.PI / 2 });
    bee.add(S.sph(0.12, 0), "#ffffff", { y: 0.17, x: -0.05, sx: 0.6, sz: 1.2 }); bee.add(S.sph(0.12, 0), "#ffffff", { y: 0.17, x: 0.1, sx: 0.6, sz: 1.2 });
    const bg = bee.group(); g.add(bg);
    c.movers.push((t) => { const an = t * 1.6; bg.position.set(Math.cos(an) * 1.9, 2.4 + Math.sin(t * 3) * 0.25, Math.sin(an) * 1.9); bg.rotation.y = -an; });
    return { g, top: 3.7, sign: [-1.9, 1.7] };
  },
  /** An observatory with a telescope and stars hanging over it. */
  "edm-atlas"(c, a) {
    const { S, k } = c, b = new Bake(k);
    b.add(S.cyl(1.5, 1.6, 1.9, 30, 0.04), C.cream, { y: 0.95 }); b.add(S.tor(1.52, 0.09, 0.01), C.ink, { y: 1.9, rx: Math.PI / 2 });
    b.add(S.sph(1.55, 0.05, 6, true), a.accent, { y: 1.9 }); b.add(S.rb(0.5, 1.6, 0.5, 0.1, 0), "#2a2230", { y: 2.75, z: 0.85, rx: -0.62 });
    b.add(S.cyl(0.22, 0.3, 2.2, 16, 0.01), "#d8d2c4", { y: 3.1, z: 0.75, rx: -0.95 });
    b.add(S.rb(0.7, 1.1, 0.12, 0.08, 0.01), C.woodD, { y: 0.55, z: 1.55 });
    b.add(S.rb(0.42, 0.5, 0.1, 0.05, 0), C.glow, { x: -1.05, y: 1.1, z: 1.12, ry: -0.75, glow: true });
    b.add(S.rb(0.42, 0.5, 0.1, 0.05, 0), C.glow, { x: 1.05, y: 1.1, z: 1.12, ry: 0.75, glow: true });
    const g = b.group();
    const spots: [number, number][] = [[-1.4, 4.3], [-0.4, 4.9], [0.9, 4.5], [1.6, 3.8], [0.1, 5.5]];
    const stars = spots.map(([x, y], i) => {
      const s = c.k.cutout(starCanvas(), 0.55 + (i % 2) * 0.2, { center: true });
      s.position.set(x, y, 0); s.castShadow = false; g.add(s);
      return s;
    });
    c.movers.push((t) => stars.forEach((s, i) => { s.position.y = spots[i][1] + Math.sin(t * 1.5 + i) * 0.15; s.rotation.z = Math.sin(t + i) * 0.3; }));
    return { g, top: 4.2, sign: [-2, 1.8] };
  },
  /** A library made of giant stacked books, with an open book for a roof. */
  "little-lexicon"(c, a) {
    const { S, k } = c, b = new Bake(k);
    const books: [number, number, number, string, number][] = [[3.2, 0.8, 2.3, a.accent, 0.06], [3, 0.7, 2.1, C.navy, -0.08], [2.8, 0.9, 2.0, C.mustard, 0.05], [2.6, 0.6, 1.9, C.green, -0.06]];
    let y = 0;
    books.forEach(([w, h, d, col, ry], i) => {
      b.add(S.rb(w, h, d, 0.07, 0.02, i), col, { y: y + h / 2, ry });
      b.add(S.rb(w - 0.25, h * 0.7, 0.12, 0.03, 0.01), "#fbf6ea", { x: 0.08 * Math.cos(ry), y: y + h / 2, z: d / 2 - 0.02, ry });
      if (i === 1 || i === 2) b.add(S.rb(0.45, h * 0.45, 0.1, 0.04, 0), C.glow, { x: -0.7, y: y + h / 2, z: d / 2 + 0.05, ry, glow: true });
      y += h;
    });
    b.add(S.rb(0.6, 0.62, 0.2, 0.25, 0.01), "#5a3a22", { x: 0.9, y: 0.32, z: 1.15 });
    b.add(S.rb(1.3, 0.1, 1.5, 0.03, 0.01), "#fbf6ea", { x: -0.6, y: y + 0.3, rz: 0.38 }); b.add(S.rb(1.3, 0.1, 1.5, 0.03, 0.01), "#fbf6ea", { x: 0.6, y: y + 0.3, rz: -0.38 });
    b.add(S.rb(1.36, 0.06, 1.56, 0.03, 0), a.accent, { x: -0.62, y: y + 0.23, rz: 0.38 }); b.add(S.rb(1.36, 0.06, 1.56, 0.03, 0), a.accent, { x: 0.62, y: y + 0.23, rz: -0.38 });
    b.add(S.rb(2.7, 0.18, 2, 0.08, 0.06), C.snow, { y: y + 0.02 });
    return { g: b.group(), top: y + 0.9, sign: [-1.9, 1.7] };
  },
  /** A winners' podium. Someone proudly stands on the #2 spot. */
  "second-guess"(c, a) {
    const { S, k } = c, b = new Bake(k);
    const blocks: [number, number, string][] = [[0, 2.1, a.accent], [-1.45, 1.55, mix(a.accent, "#1a1030", 0.25)], [1.45, 1.05, mix(a.accent, "#ffffff", 0.25)]];
    blocks.forEach(([x, h, col], i) => {
      b.add(S.rb(1.4, h, 1.4, 0.1, 0.03, i), col, { x, y: h / 2 }); b.add(S.rb(1.48, 0.18, 1.48, 0.08, 0.06, i + 5), C.snow, { x, y: h + 0.05 });
    });
    const g = b.group();
    ([["1", 0, 1.15], ["2", -1.45, 0.85], ["3", 1.45, 0.58]] as const).forEach(([n, x, y]) => {
      const p = picture(c, numberCanvas(n), 0.7, 0.82); p.position.set(x, y, 0.71); g.add(p);
    });
    const p = actor(c, { outfit: 4, pose: "wave", medal: "#cfd5df" });
    p.root.position.set(-1.45, 1.6, 0); g.add(p.root);
    c.movers.push((t) => p.pose("hop", t * 3));
    return { g, top: 3.1, sign: [1.9, 1.9] };
  },
  /** A clock tower whose clock counts down 4, 3, 2, 1. */
  triveal(c, a) {
    const { S, k } = c, b = new Bake(k);
    b.add(S.rb(1.7, 4.4, 1.7, 0.12, 0.04, 1), a.accent, { y: 2.2 }); b.add(S.rb(1.95, 0.3, 1.95, 0.1, 0.02), C.paper, { y: 4.45 });
    b.add(S.cone(1.45, 1.9, 4, 0.03), "#3b3340", { y: 5.55, ry: Math.PI / 4 }); b.add(S.cone(0.75, 1, 4, 0.04, 3), C.snow, { y: 6.06, ry: Math.PI / 4 });
    b.add(S.cyl(0.72, 0.72, 0.14, 30, 0), C.paper, { y: 3.35, z: 0.86, rx: Math.PI / 2 });
    b.add(S.rb(0.7, 1.1, 0.12, 0.08, 0.01), C.woodD, { y: 0.55, z: 0.86 }); b.add(S.rb(0.4, 0.55, 0.1, 0.04, 0), C.glow, { y: 1.95, z: 0.86, glow: true });
    const g = b.group();
    const face = picture(c, clockCanvas(), 1.36, 1.36); face.position.set(0, 3.35, 0.94); g.add(face);
    const hand = new THREE.Group(); hand.position.set(0, 3.35, 0.97);
    const hm = new THREE.Mesh(S.rb(0.07, 0.55, 0.03, 0.02, 0), k.paint(C.ink)); hm.position.y = 0.24; hand.add(hm); g.add(hand);
    c.movers.push((t) => { hand.rotation.z = (t * 1.2) % TAU; });
    return { g, top: 6.4, sign: [-1.6, 1.4] };
  },
  /** A cottage with a giant tick on the roof and a to-do list out front. */
  dodone(c, a) {
    const built = house(c, { w: 3.2, d: 2.6, h: 2.3, wall: a.accent, roof: C.slate, seed: 21, chimney: false });
    const { S, k } = c, b = new Bake(k);
    b.add(S.rb(0.1, 1.8, 0.1, 0.03, 0), C.woodD, { x: 1.9, y: 0.9, z: 1.7 }); b.add(S.rb(0.1, 1.8, 0.1, 0.03, 0), C.woodD, { x: 3.2, y: 0.9, z: 1.5 });
    const tick = new THREE.Shape();
    tick.moveTo(-0.6, 0.1); tick.lineTo(-0.25, -0.3); tick.lineTo(0.6, 0.55); tick.lineTo(0.45, 0.7); tick.lineTo(-0.25, 0); tick.lineTo(-0.45, 0.25); tick.closePath();
    b.add(k.geo("tick", () => new THREE.ExtrudeGeometry(tick, { depth: 0.16, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 })), "#3fae6a", { y: 3.6, z: -0.1 });
    built.g.add(b.group());
    const board = picture(c, todoCanvas(), 1.3, 1.55); board.position.set(2.55, 1.35, 1.66); board.rotation.y = -0.15; built.g.add(board);
    return { g: built.g, top: 4.3, sign: [-2.1, 1.9] };
  },
  /** A record shop with a record spinning on the roof. */
  "mainstream-hipster"(c, a) {
    const built = house(c, { w: 3.4, d: 2.6, h: 2.4, wall: a.accent, roof: "#3a2f3a", seed: 25, chimney: false });
    const { S, k } = c;
    const post = new THREE.Mesh(S.cyl(0.07, 0.07, 1, 6, 0), k.paint(C.ink)); post.position.set(0, 3.8, 0.1); built.g.add(post);
    const disc = new THREE.Group(); disc.position.set(0, 5.2, 0.1);
    const vinyl = new THREE.Mesh(S.circle(1.2), k.label(vinylCanvas(a.accent))); vinyl.castShadow = true; disc.add(vinyl); built.g.add(disc);
    c.movers.push((t) => { disc.rotation.z = -t * 1.6; });
    return { g: built.g, top: 6.5, sign: [-2.2, 1.9] };
  },
  /** A lighthouse whose lamp is a turning magnifying glass. */
  tapsearch(c, a) {
    const { S, k } = c, b = new Bake(k);
    for (let i = 0; i < 5; i++) { const r0 = 1 - i * 0.07, r1 = 1 - (i + 1) * 0.07; b.add(S.cyl(r1, r0, 0.9, 24, 0.02, i), i % 2 ? a.accent : C.paper, { y: 0.45 + i * 0.9 }); }
    b.add(S.cyl(0.98, 0.98, 0.18, 24, 0.01), C.ink, { y: 4.6 }); b.add(S.tor(0.9, 0.04, 0), C.ink, { y: 4.95, rx: Math.PI / 2 });
    b.add(S.cyl(0.55, 0.55, 0.8, 20, 0), "#fff1c2", { y: 5.05, glow: true }); b.add(S.cone(0.75, 0.75, 20, 0.02), C.ink, { y: 5.8 }); b.add(S.cone(0.45, 0.45, 16, 0.03, 2), C.snow, { y: 6.0 });
    b.add(S.rb(0.6, 1, 0.12, 0.08, 0.01), C.woodD, { y: 0.5, z: 0.98 }); b.add(S.rb(0.3, 0.4, 0.1, 0.04, 0), C.glow, { y: 2.3, z: 0.87, glow: true });
    ([[-1.2, 0.3, 0.5], [1.1, 0.2, 0.8], [-0.5, 0.2, 1.3]] as const).forEach(([x, y, z], i) => b.add(S.sph(0.4, 0.08, i + 3), "#e8eaf0", { x, y, z, sy: 0.6 }));
    const g = b.group({ ei: 1.8 });
    const mag = new THREE.Group(); mag.position.y = 5.05; g.add(mag);
    const mb = new Bake(k); mb.add(S.tor(0.42, 0.08, 0), C.ink, { x: 1.25 }); mb.add(S.cyl(0.07, 0.07, 0.8, 8, 0), C.ink, { x: 0.55, rz: Math.PI / 2 });
    mag.add(mb.group());
    const glass = new THREE.Mesh(S.cyl(0.38, 0.38, 0.04, 24, 0), k.memo("magGlass", () => new THREE.MeshStandardMaterial({ color: "#bfe0ff", emissive: "#bfe0ff", emissiveIntensity: 0.6, transparent: true, opacity: 0.65 })));
    glass.position.x = 1.25; glass.rotation.z = Math.PI / 2; mag.add(glass);
    c.movers.push((t) => { mag.rotation.y = t * 0.9; });
    return { g, top: 6.5, sign: [0, 2] };
  },
  /** A nursery with a growth-chart ruler, a marker that keeps growing, and baby blocks. */
  "little-one-percentile"(c, a) {
    const built = house(c, { w: 3, d: 2.6, h: 2.2, wall: "#f6d7c3", roof: a.accent, seed: 31 });
    const { S, k } = c, b = new Bake(k);
    b.add(S.rb(0.5, 4.2, 0.16, 0.05, 0.01), C.paper, { x: 2.05, y: 2.1, z: 0.7 });
    ([[a.accent, 1.0, 2.0, 0.28], ["#5a8fb0", 1.62, 2.1, 0.28], ["#e0a73b", 1.3, 2.05, 0.82]] as const).forEach(([col, x, z, y], i) => b.add(S.rb(0.55, 0.55, 0.55, 0.08, 0.01, i), col, { x, y, z, ry: i * 0.3 }));
    built.g.add(b.group());
    const ruler = picture(c, rulerCanvas(), 0.44, 4.05); ruler.position.set(2.05, 2.1, 0.79); built.g.add(ruler);
    const arrow = new THREE.Mesh(S.cone(0.16, 0.3, 3, 0), k.paint(a.accent)); arrow.rotation.z = Math.PI / 2; arrow.position.set(2.48, 2, 0.8); arrow.castShadow = true; built.g.add(arrow);
    c.movers.push((t) => { arrow.position.y = 1.2 + (Math.sin(t * 0.8) * 0.5 + 0.5) * 2.4; });
    return { g: built.g, top: 4.6, sign: [-0.4, 2.3], smoke: built.smoke };
  },
};

/** An app with no building of its own yet gets a cottage painted in its colour. */
export const fallbackBuilding: Builder = (c, a) => house(c, { wall: a.accent, roof: C.slate, seed: a.id.length * 7 });

/** Brian's log cabin, where the About card lives, with Brian waving outside. */
export function cabin(c: Ctx): Built {
  const built = house(c, { w: 3.6, d: 2.8, h: 2.3, roof: "#5a3a2a", seed: 51, logs: true });
  const brian = actor(c, { outfit: 0, pose: "wave" });
  brian.root.position.set(2.5, 0, 1.6); built.g.add(brian.root);
  c.movers.push((t) => brian.pose("hop", Math.max(0, Math.sin(t * 0.7)) > 0.6 ? t * 6 : 0));
  return { ...built, sign: [-2.4, 2] };
}
