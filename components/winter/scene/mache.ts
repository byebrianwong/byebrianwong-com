// Papier-mâché for the winter village: lumpy, softened 3D shapes painted with
// newspaper-strip paper, and a "bake" that merges a building's many parts
// into one or two meshes so the village stays cheap to draw.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TAU, clamp, fbm, macheSheet, paperSheet } from "./paper";

/** Average the normals of vertices that share a position, so seams between faces shade smoothly. */
function smoothSeams(g: THREE.BufferGeometry) {
  const p = g.attributes.position, n = g.attributes.normal;
  const map = new Map<string, { x: number; y: number; z: number; idx: number[] }>();
  for (let i = 0; i < p.count; i++) {
    const k = `${Math.round(p.getX(i) * 1e3)},${Math.round(p.getY(i) * 1e3)},${Math.round(p.getZ(i) * 1e3)}`;
    let e = map.get(k);
    if (!e) { e = { x: 0, y: 0, z: 0, idx: [] }; map.set(k, e); }
    e.x += n.getX(i); e.y += n.getY(i); e.z += n.getZ(i); e.idx.push(i);
  }
  for (const e of map.values()) {
    const l = Math.hypot(e.x, e.y, e.z) || 1;
    for (const i of e.idx) n.setXYZ(i, e.x / l, e.y / l, e.z / l);
  }
}

/** Push every vertex in or out along its normal by smooth noise: the hand-pressed lumps of papier-mâché. */
export function lumpy(g: THREE.BufferGeometry, amp = 0.04, freq = 2.2, seed = 0) {
  g.computeVertexNormals(); smoothSeams(g);
  if (amp > 0) {
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = fbm(x * freq + seed * 1.7, y * freq - seed, z * freq + seed * 0.3) * amp;
      p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
    }
    g.computeVertexNormals(); smoothSeams(g);
  }
  return g;
}

/** A box with rounded edges and corners. */
function roundedBoxGeo(w: number, h: number, d: number, r: number, seg = 6) {
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position;
  const v = new THREE.Vector3(), q = new THREE.Vector3(), ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); q.set(clamp(v.x, -ix, ix), clamp(v.y, -iy, iy), clamp(v.z, -iz, iz));
    v.sub(q); const L = v.length(); if (L > 1e-6) v.multiplyScalar(r / L); q.add(v); p.setXYZ(i, q.x, q.y, q.z);
  }
  return g;
}

let canvasIds = 0;
const ids = new WeakMap<HTMLCanvasElement, number>();
const canvasId = (c: HTMLCanvasElement) => { let id = ids.get(c); if (!id) { id = ++canvasIds; ids.set(c, id); } return id; };

/**
 * One renderer's textures, materials and geometries, made once per key and
 * shared by everything that asks for the same thing. `dispose()` frees them all.
 */
export class Kit {
  private cache = new Map<string, unknown>();
  private aniso: number;
  constructor(renderer: THREE.WebGLRenderer) { this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy()); }

  memo<T>(key: string, make: () => T): T {
    if (!this.cache.has(key)) this.cache.set(key, make());
    return this.cache.get(key) as T;
  }

  tex(canvas: HTMLCanvasElement, { repeat = 1, linear = false, edge = false } = {}) {
    return this.memo(`t${canvasId(canvas)}|${repeat}|${linear}|${edge}`, () => {
      const t = new THREE.CanvasTexture(canvas), w = edge ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
      t.wrapS = t.wrapT = w; t.repeat.set(repeat, repeat);
      t.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = this.aniso;
      return t;
    });
  }

  /** Matte paint on paper. `mache` adds the newspaper strips; plain paper is for big smooth snow. */
  paint(color: string, { mache = true, repeat = 1, bump = 2 } = {}) {
    return this.memo(`p${color}|${mache}|${repeat}|${bump}`, () => {
      const src = mache ? macheSheet() : paperSheet();
      return new THREE.MeshStandardMaterial({
        color, roughness: 0.92, metalness: 0,
        map: this.tex(src, { repeat }), bumpMap: this.tex(src, { repeat, linear: true }), bumpScale: bump,
      });
    });
  }

  /** The material for baked meshes: papier-mâché tinted by each vertex's paint colour. */
  vc(gloss = false) {
    return this.memo(`vc${gloss}`, () => new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: gloss ? 0.35 : 0.92, metalness: gloss ? 0.1 : 0,
      map: this.tex(macheSheet()), bumpMap: this.tex(macheSheet(), { linear: true }), bumpScale: 2,
    }));
  }

  /** Something lit from inside: windows, lanterns, the lighthouse lamp. */
  glow(color: string, ei = 1.5) {
    return this.memo(`g${color}|${ei}`, () => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: ei, roughness: 0.5 }));
  }

  /** A paper cutout or label: the canvas's transparent parts are cut away. */
  label(canvas: HTMLCanvasElement) {
    return this.memo(`l${canvasId(canvas)}`, () => new THREE.MeshStandardMaterial({
      map: this.tex(canvas, { edge: true }), roughness: 0.95, alphaTest: 0.5, side: THREE.DoubleSide,
    }));
  }

  geo<T extends THREE.BufferGeometry>(key: string, make: () => T): T { return this.memo("G" + key, make); }

  /** A paper cutout standing on its bottom edge (or centred), facing +z. */
  cutout(canvas: HTMLCanvasElement, h: number, { foot = 0.035, w, center = false }: { foot?: number; w?: number; center?: boolean } = {}) {
    const W = w ?? (h * canvas.width) / canvas.height;
    const geo = this.geo(`pl${W.toFixed(3)}|${h}|${foot}|${center}`, () => {
      const g = new THREE.PlaneGeometry(W, h);
      if (!center) g.translate(0, h / 2 - h * foot, 0);
      return g;
    });
    const m = new THREE.Mesh(geo, this.label(canvas));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  /** A camera-facing sprite. Each gets its own material so it can fade on its own. */
  sprite(canvas: HTMLCanvasElement, opacity = 1, additive = false) {
    const m = new THREE.SpriteMaterial({
      map: this.tex(canvas, { edge: true }), transparent: true, depthWrite: false, opacity,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.memo(`sprite${this.cache.size}`, () => m);
    return new THREE.Sprite(m);
  }

  dispose() {
    for (const v of this.cache.values()) (v as { dispose?: () => void }).dispose?.();
    this.cache.clear();
  }
}

/** Lumpy primitives, cached per size so repeated parts share geometry. */
export function shapeLib(k: Kit) {
  return {
    rb: (w: number, h: number, d: number, r = 0.12, amp = 0.05, seed = 0, seg = 6) =>
      k.geo(`rb${w}|${h}|${d}|${r}|${amp}|${seed}|${seg}`, () => lumpy(roundedBoxGeo(w, h, d, r, seg), amp, 2.2, seed)),
    cyl: (rt: number, rb: number, h: number, seg = 24, amp = 0.05, seed = 0) =>
      k.geo(`cy${rt}|${rb}|${h}|${seg}|${amp}|${seed}`, () => lumpy(new THREE.CylinderGeometry(rt, rb, h, seg, Math.max(2, Math.round(h * 3))), amp, 2.5, seed)),
    sph: (r: number, amp = -1, seed = 0, half = false) =>
      k.geo(`sp${r}|${amp}|${seed}|${half}`, () => lumpy(new THREE.SphereGeometry(r, 26, half ? 10 : 18, 0, TAU, 0, half ? Math.PI / 2 : Math.PI), amp < 0 ? r * 0.14 : amp, 2.5, seed)),
    cone: (r: number, h: number, seg = 16, amp = 0.06, seed = 0) =>
      k.geo(`co${r}|${h}|${seg}|${amp}|${seed}`, () => lumpy(new THREE.ConeGeometry(r, h, seg, Math.max(2, Math.round(h * 2.5))), amp, 2.2, seed)),
    tor: (R: number, r: number, amp = 0.02, seed = 0) =>
      k.geo(`to${R}|${r}|${amp}|${seed}`, () => lumpy(new THREE.TorusGeometry(R, r, 10, Math.max(16, Math.round(R * 28))), amp, 3, seed)),
    plane: (w: number, h: number) => k.geo(`pg${w}|${h}`, () => new THREE.PlaneGeometry(w, h)),
    circle: (r: number) => k.geo(`ci${r}`, () => new THREE.CircleGeometry(r, 40)),
  };
}
export type Shapes = ReturnType<typeof shapeLib>;

export interface Place {
  x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number;
  s?: number; sx?: number; sy?: number; sz?: number; glow?: boolean;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

/** Collects painted parts and merges them into one vertex-coloured mesh, plus one mesh per glow colour. */
export class Bake {
  private paint: THREE.BufferGeometry[] = [];
  private glows = new Map<string, THREE.BufferGeometry[]>();
  constructor(private k: Kit) {}

  add(geo: THREE.BufferGeometry, color: string, o: Place = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (g.attributes.color) g.deleteAttribute("color");
    _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0); _q.setFromEuler(_e); _p.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
    const s = o.s ?? 1; _s.set(o.sx ?? s, o.sy ?? s, o.sz ?? s);
    g.applyMatrix4(_m.compose(_p, _q, _s));
    if (o.glow) {
      if (!this.glows.has(color)) this.glows.set(color, []);
      this.glows.get(color)!.push(g);
    } else {
      _c.set(color);
      const n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
      g.setAttribute("color", new THREE.BufferAttribute(a, 3));
      this.paint.push(g);
    }
    return this;
  }

  group({ cast = true, ei = 1.5, gloss = false } = {}) {
    const grp = new THREE.Group();
    if (this.paint.length) {
      const m = new THREE.Mesh(mergeGeometries(this.paint), this.k.vc(gloss));
      m.castShadow = cast; m.receiveShadow = true; grp.add(m);
    }
    for (const [c, list] of this.glows) grp.add(new THREE.Mesh(mergeGeometries(list), this.k.glow(c, ei)));
    this.paint.forEach((g) => g.dispose());
    this.glows.forEach((l) => l.forEach((g) => g.dispose()));
    return grp;
  }
}
