// The winter village: a papier-mâché diorama seen from far above, with paper
// villagers skating, sledding and carolling, and one themed building per app.
//
// Moving the mouse pans the camera across the village (dragging on touch), and
// the scroll wheel zooms in and out a little (pinching on touch, + and - keys).
// Hovering a building highlights it and reports it through `onHover`, so the
// page can show its tag; clicking reports `onOpen`. Clicking anywhere else
// throws a snowball (./play), and whatever it lands on reacts. The page owns
// everything that is text (tags, cards); this class only draws.

import * as THREE from "three";
import { ABOUT_ID, VILLAGE_APPS } from "../spots";
import { Bake, Kit, lumpy, shapeLib } from "./mache";
import { Play } from "./play";
import {
  BUILDERS, SIGN_W, actor, cabin, dog, fallbackBuilding, house, sign, snowman, type Actor, type Built, type Ctx, type Mover,
} from "./builders";
import {
  C, OUTFITS, TAU, TREE_VARIANTS, bigTreeCanvas, clamp, fbm, flakeCanvas, glowCanvas, iceCanvas, lerp, noteCanvas,
  puffCanvas, rng, sledCanvas, smooth, treeCanvas,
} from "./paper";

export interface VillageEvents {
  /** The building under the pointer (or focused from the keyboard) changed. */
  onHover(id: string | null): void;
  /** A building was clicked or tapped. */
  onOpen(id: string): void;
  /** The visitor moved the pointer or dragged for the first time. */
  onInteract(): void;
}

/* ---------------- layout ---------------- */

const POND = { x: 0, z: 3, rx: 6.5, rz: 4 };
const HILL = { x: 21, z: -13, r: 4.5, h: 4 };

/** [x, z, turn] for each app's building. */
const APP_SPOTS: Record<string, [number, number, number]> = {
  regibee: [-12.5, -7, 0.2], "saturday-boring-cereal": [-6.6, -8.6, 0.1], "wonder-lens": [-1, -9, 0],
  "edm-atlas": [4.6, -8.7, -0.05], "mainstream-hipster": [10.5, -7.4, -0.2],
  "second-guess": [-15.2, 1.2, 0.5], "little-one-percentile": [-15.2, 7.8, 0.6], dodone: [14.6, 0.2, -0.55], "little-lexicon": [14.8, 7.8, -0.6],
  // The back row sits in the gaps of the front row: the camera only slides, so whatever hides a building keeps hiding it.
  triveal: [-3.8, -16, 0.05],
};
/** Where an app added later (with no spot above) goes, in order. */
const SPARE_SPOTS: [number, number, number][] = [[0, -23, 0], [-21, -6, 0.5], [21, -4, -0.5], [-22, 5, 0.6], [22, 4, -0.6], [-16, -22, 0.1], [16, -22, -0.1]];
const CABIN_SPOT: [number, number, number] = [0, 13.5, 0];
const BIG_TREE = { x: 9, z: 3.8 };

type HouseSpot = [number, number, number, number, number, number, string, string];
/** Ordinary cottages: [x, z, turn, width, depth, height, wall, roof]. */
const HOUSES: HouseSpot[] = [
  [-12.5, -15.5, 0.1, 3, 2.6, 2.6, C.cream, C.slate], [13, -15, -0.2, 3, 2.6, 2.3, C.red, "#4a3b3a"],
  [-18.5, 13.5, 0.4, 3, 2.6, 2.2, C.green, C.slate], [18.5, 13.5, -0.4, 3, 2.6, 2.4, C.navy, "#4a3b3a"],
  [-8, -23, 0.05, 3.2, 2.6, 3.2, C.mustard, C.slate], [8, -23.5, -0.05, 3, 2.6, 2.4, C.plum, "#4a3b3a"],
];

/** The camera hangs back and above; panning moves it this far from its start. */
const CAM = { target: new THREE.Vector3(0, 0, -3.5), off: new THREE.Vector3(0, 21, 24), rx: 15, up: 9, down: 11 };
/**
 * On a small screen the camera comes no farther back than keeps one village unit this many pixels tall,
 * so a phone sees a smaller piece of the village rather than a tiny one.
 */
const MIN_PX = 27;
/** Name signs grow on small screens until they're about this many pixels wide, close to their size on a laptop. */
const SIGN_PX = 110;
/** How far the visitor can zoom, as a multiple of the camera's distance: under 1 is closer, over 1 is farther back. */
const ZOOM = { min: 0.7, max: 1.3, key: 1.12 };
const FOG = { near: 60, far: 125 };

/* ---------------- the scene ---------------- */

interface Hoverable { id: string; group: THREE.Group; top: number; baseY: number; l: number }
type Keep = { x: number; z: number; r: number } | { ell: true; x: number; z: number; rx: number; rz: number };

export class VillageScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
  private k: Kit;
  private c: Ctx;
  private play: Play;
  /** The skaters, so a ball skidding across the ice can bowl them over. */
  private skating: Actor[] = [];
  private movers: Mover[] = [];
  private hoverables: Hoverable[] = [];
  private hits: THREE.Object3D[] = [];
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2(9, 9);
  private pan = { x: 0, y: 0, tx: 0, ty: 0 };
  private focusPoint = { x: 0, z: 0 };
  /** Moves the camera back on tall, narrow screens and closer on small ones (set on resize). */
  private fit = 1;
  /** How many village units tall the screen shows at the middle of the view, at the default distance. */
  private span = 1;
  /** Every name sign, so they can grow on small screens. */
  private signs: THREE.Object3D[] = [];
  /** The visitor's zoom, eased toward its target like the pan. */
  private zoom = { v: 1, t: 1 };
  private w = 1;
  private h = 1;
  private pointerIn = false;
  private drag: { x: number; y: number; moved: number } | null = null;
  /** Fingers on the screen, so two of them can pinch. */
  private touches = new Map<number, { x: number; y: number }>();
  private pinch = 0;
  private dragMoved = 0;
  private hovered: Hoverable | null = null;
  private focused: Hoverable | null = null;
  private reported: string | null = null;
  private interactive = true;
  private held = 0;
  private ratio = 1;
  private slowFrames = 0;
  private touched = false;
  private raf = 0;
  private last = 0;
  private start = performance.now();
  private resizeObs: ResizeObserver;
  private tmp = new THREE.Vector3();

  constructor(private host: HTMLElement, private tag: HTMLElement, private ev: VillageEvents, private reducedMotion = false) {
    // Throws if WebGL isn't available; the page catches it and shows the directory instead.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    const r = this.renderer;
    this.ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    r.setPixelRatio(this.ratio);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.NeutralToneMapping;
    r.domElement.className = "wv-canvas";
    host.appendChild(r.domElement);

    this.k = new Kit(r);
    const groundH = (x: number, z: number) => {
      let h = fbm(x * 0.06 + 3, 0.5, z * 0.06 - 2) * 1.4;
      h *= smooth(14, 28, Math.hypot(x * 0.85, z * 1.1));
      h += HILL.h * Math.exp(-((x - HILL.x) ** 2 + (z - HILL.z) ** 2) / (2 * HILL.r * HILL.r));
      return h;
    };
    this.c = { k: this.k, S: shapeLib(this.k), scene: this.scene, movers: this.movers, gh: groundH };
    this.play = new Play(this.c, this.camera, host);
    this.build();

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.resize();
    this.bindInput();
    this.updateCamera(1);
    this.raf = requestAnimationFrame(this.frame);
  }

  /* ---------- public ---------- */

  /** Highlight a building from the keyboard directory and pan to it (null to let go). */
  focus(id: string | null) {
    this.focused = this.hoverables.find((h) => h.id === id) ?? null;
    if (this.focused) {
      const p = this.focused.group.position;
      this.pan.tx = clamp((p.x - CAM.target.x) / CAM.rx, -1, 1);
      const dz = p.z - CAM.target.z;
      this.pan.ty = clamp(dz < 0 ? dz / CAM.up : dz / CAM.down, -1, 1);
    }
  }

  /** Off while a card is open: no hovering, the camera stays put, and the village holds its last frame. */
  setInteractive(on: boolean) {
    this.interactive = on;
    this.held = 0;
    if (!on) { this.hovered = null; this.focused = null; this.ndc.set(9, 9); }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.unbindInput();
    this.play.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.k.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  /* ---------- input ---------- */

  private toNdc(e: PointerEvent | MouseEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    return { nx: ((e.clientX - r.left) / r.width) * 2 - 1, ny: ((e.clientY - r.top) / r.height) * 2 - 1, r };
  }
  private interacted() { if (!this.touched) { this.touched = true; this.ev.onInteract(); } }
  /** Zoom by a factor: under 1 moves closer. */
  private zoomBy(f: number) { this.zoom.t = clamp(this.zoom.t * f, ZOOM.min, ZOOM.max); }
  private spread() {
    const [a, b] = [...this.touches.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private onMove = (e: PointerEvent) => {
    const { nx, ny, r } = this.toNdc(e);
    this.ndc.set(nx, -ny); this.pointerIn = true;
    if (!this.interactive) return;
    if (e.pointerType === "mouse") {
      // The mouse's spot on screen is where the camera heads: move right to see more to the right.
      this.pan.tx = clamp(nx * 1.15, -1, 1); this.pan.ty = clamp(ny * 1.15, -1, 1);
      this.interacted();
      return;
    }
    if (!this.touches.has(e.pointerId)) return;
    this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.touches.size >= 2) {
      // Fingers spreading apart zoom in.
      const d = this.spread();
      if (this.pinch && d) this.zoomBy(this.pinch / d);
      this.pinch = d;
      this.interacted();
    } else if (this.drag) {
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX; this.drag.y = e.clientY; this.drag.moved += Math.abs(dx) + Math.abs(dy);
      // The snow follows the finger: turn the pixels dragged into village units, then into the pan's range.
      // Going up the screen covers more ground than going across, since the camera looks down at a slant.
      const unit = r.height / (this.span * this.fit * this.zoom.v);
      const across = dx / unit, back = dy / (unit * Math.sin(Math.atan2(CAM.off.y, CAM.off.z)));
      this.pan.tx = clamp(this.pan.tx - across / CAM.rx, -1, 1);
      this.pan.ty = clamp(this.pan.ty - back / (this.pan.ty < 0 ? CAM.up : CAM.down), -1, 1);
      this.interacted();
    }
  };
  private onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.renderer.domElement.setPointerCapture?.(e.pointerId);
    if (this.touches.size === 1) this.drag = { x: e.clientX, y: e.clientY, moved: 0 };
    else if (this.touches.size === 2) {
      this.pinch = this.spread();
      if (this.drag) this.drag.moved = Infinity; // a pinch is never a tap
    }
  };
  private onUp = (e: PointerEvent) => {
    this.touches.delete(e.pointerId);
    if (this.touches.size === 1 && this.drag) {
      // Back to one finger after a pinch: keep panning from where that finger is now.
      const [t] = this.touches.values();
      this.drag.x = t.x; this.drag.y = t.y;
    }
    if (this.touches.size > 0) return;
    this.pinch = 0;
    this.dragMoved = this.drag?.moved ?? 0; this.drag = null;
  };
  private onWheel = (e: WheelEvent) => {
    // Ctrl + wheel (and a trackpad pinch, which arrives the same way) is left to the browser's own page zoom.
    if (!this.interactive || e.ctrlKey) return;
    e.preventDefault();
    // Some mice scroll in lines or pages rather than pixels.
    const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.h : 1);
    this.zoomBy(Math.exp(clamp(px, -200, 200) * 0.0012));
    this.interacted();
  };
  private onLeave = (e: PointerEvent) => { if (e.pointerType === "mouse") { this.pointerIn = false; this.ndc.set(9, 9); } };
  private onClick = (e: MouseEvent) => {
    if (!this.interactive || this.dragMoved > 12) { this.dragMoved = 0; return; }
    const { nx, ny } = this.toNdc(e);
    this.ray.setFromCamera(new THREE.Vector2(nx, -ny), this.camera);
    // A mouse's hover is where it is now. A finger's is wherever the last drag ended, so a tap ignores it.
    const h = this.building() ?? ((e as PointerEvent).pointerType === "mouse" ? this.hovered : null);
    if (h) this.ev.onOpen(h.id);
    else if (!this.reducedMotion) this.play.throw(this.ray);
  };

  /** The building under `this.ray`, unless something (a tree, a cottage) stands in front of it. */
  private building() {
    const hit = this.ray.intersectObjects(this.hits, false)[0];
    if (!hit || this.play.blocks(this.ray, hit.distance)) return null;
    return hit.object.userData.hov as Hoverable;
  }
  private onKey = (e: KeyboardEvent) => {
    if (!this.interactive || e.altKey || e.metaKey || e.ctrlKey) return;
    const t = e.target as HTMLElement | null;
    if (t && t !== document.body && t !== this.renderer.domElement) return;
    const step = 0.18;
    if (e.key === "ArrowLeft") this.pan.tx = clamp(this.pan.tx - step, -1, 1);
    else if (e.key === "ArrowRight") this.pan.tx = clamp(this.pan.tx + step, -1, 1);
    else if (e.key === "ArrowUp") this.pan.ty = clamp(this.pan.ty - step, -1, 1);
    else if (e.key === "ArrowDown") this.pan.ty = clamp(this.pan.ty + step, -1, 1);
    else if (e.key === "+" || e.key === "=") this.zoomBy(1 / ZOOM.key);
    else if (e.key === "-" || e.key === "_") this.zoomBy(ZOOM.key);
    else return;
    e.preventDefault(); this.interacted();
  };

  private bindInput() {
    const el = this.renderer.domElement;
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointercancel", this.onUp);
    el.addEventListener("pointerleave", this.onLeave);
    el.addEventListener("click", this.onClick);
    el.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKey);
  }
  private unbindInput() {
    const el = this.renderer.domElement;
    el.removeEventListener("pointermove", this.onMove);
    el.removeEventListener("pointerdown", this.onDown);
    el.removeEventListener("pointerup", this.onUp);
    el.removeEventListener("pointercancel", this.onUp);
    el.removeEventListener("pointerleave", this.onLeave);
    el.removeEventListener("click", this.onClick);
    el.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKey);
  }

  /* ---------- per frame ---------- */

  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.span = 2 * CAM.off.length() * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    // A tall, narrow screen sees a thin slice; pull back so it still sees a good piece of the village,
    // but on a small screen not so far that everything turns to specks.
    const wide = clamp(1.3 / this.camera.aspect, 1, 2.2), near = h / (this.span * MIN_PX);
    this.fit = clamp(Math.min(wide, near), 0.75, 2.2);
    // Where the signs would still come out small, they grow so their names can be read.
    const px = h / (this.span * this.fit);
    const s = clamp(SIGN_PX / (SIGN_W * px), 1, 1.6);
    for (const sg of this.signs) sg.scale.setScalar(s);
    this.camera.updateProjectionMatrix();
  }

  private updateCamera(dt: number) {
    const P = this.pan, e = Math.min(1, dt * 3.2);
    P.x += (P.tx - P.x) * e; P.y += (P.ty - P.y) * e;
    const Z = this.zoom;
    Z.v += (Z.t - Z.v) * Math.min(1, dt * 8);
    const tx = CAM.target.x + P.x * CAM.rx, tz = CAM.target.z + (P.y < 0 ? P.y * CAM.up : P.y * CAM.down);
    const d = this.fit * Z.v;
    this.camera.position.set(tx + CAM.off.x * d, CAM.off.y * d, tz + CAM.off.z * d);
    this.camera.lookAt(tx, 0, tz);
    // The fog moves with the camera, so stepping back doesn't wash the village out.
    const fog = this.scene.fog as THREE.Fog;
    fog.near = FOG.near * d; fog.far = FOG.far * d;
    this.focusPoint = { x: tx, z: tz };
  }

  private updateHover(dt: number) {
    if (this.interactive && this.pointerIn) {
      this.ray.setFromCamera(this.ndc, this.camera);
      this.hovered = this.building();
    }
    const lit = this.hovered ?? this.focused;
    const id = lit?.id ?? null;
    if (id !== this.reported) {
      this.reported = id;
      this.renderer.domElement.style.cursor = this.hovered ? "pointer" : "";
      this.ev.onHover(id);
    }
    for (const e of this.hoverables) {
      e.l += ((e === lit ? 1 : 0) - e.l) * Math.min(1, dt * 9);
      e.group.position.y = e.baseY + e.l * 0.4;
      e.group.scale.setScalar(1 + e.l * 0.07);
    }
    if (lit) {
      lit.group.getWorldPosition(this.tmp); this.tmp.y += lit.top * lit.group.scale.y + 0.3; this.tmp.project(this.camera);
      const x = (this.tmp.x * 0.5 + 0.5) * this.w, y = (-this.tmp.y * 0.5 + 0.5) * this.h;
      this.tag.style.transform = `translate(${clamp(x, 100, this.w - 100)}px, ${Math.max(96, y)}px) translate(-50%, -100%)`;
    }
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const ms = now - (this.last || now), dt = Math.min(0.05, ms / 1000);
    this.last = now;
    // A card covers the village: draw a couple more frames to settle, then hold still and leave the GPU to the card.
    if (!this.interactive && ++this.held > 2) return;
    this.updateCamera(dt);
    if (!this.reducedMotion) { const t = (now - this.start) / 1000; for (const m of this.movers) m(t, dt); }
    this.play.update(dt);
    this.updateHover(dt);
    this.adapt(ms);
    this.renderer.render(this.scene, this.camera);
  };

  /** On a device that can't keep up (under ~20 fps for a while), draw fewer pixels, down to half resolution. */
  private adapt(ms: number) {
    this.slowFrames = ms > 50 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
    if (this.slowFrames < 20 || this.ratio <= 0.5) return;
    this.slowFrames = 0;
    this.ratio = Math.max(0.5, this.ratio - 0.25);
    this.renderer.setPixelRatio(this.ratio);
    this.renderer.setSize(this.w, this.h, false);
  }

  /* ---------- building the village ---------- */

  private build() {
    const { scene, c } = this;
    scene.background = new THREE.Color("#c7cde6");
    scene.fog = new THREE.Fog("#c7cde6", FOG.near, FOG.far);
    scene.add(new THREE.HemisphereLight("#e2e6ff", "#efe4da", 1.85));
    const sun = new THREE.DirectionalLight("#ffe1c4", 2.1);
    sun.position.set(-18, 30, 18); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -46, right: 46, top: 40, bottom: -40, near: 1, far: 130 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
    scene.add(sun, sun.target);

    // The snow: a big sheet with gentle drifts, flat around the village and a sledding hill in one corner.
    const geo = new THREE.PlaneGeometry(170, 130, 170, 130); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, c.gh(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, this.k.paint(C.snow, { mache: false, repeat: 28, bump: 1 }));
    ground.receiveShadow = true; scene.add(ground);
    this.play.on(ground, { floor: true, hit: (at) => { this.play.splat(at); this.play.lump(at); } });

    this.pond();
    const keep: Keep[] = [
      { ell: true, x: POND.x, z: POND.z, rx: POND.rx + 1.8, rz: POND.rz + 1.6 },
      { x: HILL.x, z: HILL.z, r: 7 }, { x: BIG_TREE.x, z: BIG_TREE.z, r: 2.6 },
      { x: -9.8, z: 3, r: 2.2 }, { x: -9, z: 10.6, r: 3.6 }, { x: 9.2, z: 11.2, r: 3.4 },
    ];

    // One building per app, with its name on a sign out front.
    let spare = 0;
    for (const app of VILLAGE_APPS) {
      const spot = APP_SPOTS[app.id] ?? SPARE_SPOTS[spare++ % SPARE_SPOTS.length];
      const built = (BUILDERS[app.id] ?? fallbackBuilding)(c, app);
      this.place(built, app.id, spot, app.name, app.accent);
      keep.push({ x: spot[0], z: spot[1], r: 3.8 });
    }
    this.place(cabin(c), ABOUT_ID, CABIN_SPOT, "About Brian", C.red);
    keep.push({ x: CABIN_SPOT[0], z: CABIN_SPOT[1], r: 4.2 });

    HOUSES.forEach(([x, z, ry, w, d, h, wall, roof], i) => {
      const built = house(c, { w, d, h, wall, roof, seed: i * 3 + 40 });
      this.place(built, null, [x, z, ry]);
      keep.push({ x, z, r: 3.3 });
      // Hit a cottage and it gives like papier-mâché, snow slides off the front of its roof, and the chimney coughs.
      const g = built.g, parts: THREE.Object3D[] = [], chimney = built.smoke?.[0]?.clone().applyMatrix4(g.matrixWorld);
      g.traverse((o) => { if ((o as THREE.Mesh).isMesh) parts.push(o); });
      this.play.on(parts, {
        hit: (at) => {
          this.play.splat(at); this.play.squash(g);
          for (let j = 0; j < 5; j++) this.play.burst(g.localToWorld(new THREE.Vector3(lerp(-w / 2, w / 2, 0.1 + j * 0.2), h - 0.1, d / 2 + 0.45)), "puff", 1, { speed: 0.3, up: 0.6, grav: 7, size: [0.26, 0.4], life: 0.9 });
          if (chimney) this.play.burst(chimney, "puff", 3, { speed: 0.35, up: 1.6, grav: -1.2, size: [0.4, 0.6], life: 1.6, grow: 1.4 });
        },
      });
    });

    // The big tree shakes and throws off a shower of paper stars.
    const tree = c.k.cutout(bigTreeCanvas(), 7.2, { foot: 0.02 });
    tree.position.set(BIG_TREE.x, c.gh(BIG_TREE.x, BIG_TREE.z), BIG_TREE.z); scene.add(tree);
    this.play.on(tree, {
      cut: true,
      hit: (at) => {
        this.play.splat(at); this.play.wobble(tree, 0.06, 9, 3);
        this.play.burst(tree.position.clone().setY(tree.position.y + 6.7), "star", 12, { speed: 3, up: 4.5, grav: 5, size: [0.3, 0.5], life: 1.7, spin: 4 });
      },
    });

    const paths: [number, number, number, number][] = [[-11, -4, 6.4, -4.2], [-3.2, 9.6, 4.2, 9.8], [-19, -2, -18.2, 9.5], [18.6, -4, 18.8, 7]];
    for (const [ax, az, bx, bz] of paths) for (let i = 0; i <= 6; i++) keep.push({ x: lerp(ax, bx, i / 6), z: lerp(az, bz, i / 6), r: 1.4 });
    this.trees(keep);

    ([[-8.5, -3.4], [6.8, -2.2], [-8.5, 8.4], [8.5, 8.4], [-3, 11.2], [3, 11.2]] as const).forEach(([x, z]) => this.lamp(x, z));

    this.skaters();
    const w1 = this.walker(paths[0], 1, 1, 0.3);
    this.walker(paths[1], 3, 0.8, 0.9);
    this.walker(paths[2], 5, 0.7, 0.2);
    this.walker(paths[3], 2, 0.9, 1.4, true);
    this.dogFollow(w1);
    this.sledders();
    this.snowballFight([7, 11.6], [11.5, 10.4]);
    this.carolers(-10.6, 3);
    this.snowmanScene(-11, 10);
    this.snowfall();
  }

  /** Put a building in the village; with an `id` it can be hovered and opened. */
  private place(built: Built, id: string | null, [x, z, ry]: [number, number, number], label?: string, accent?: string) {
    const { g, top } = built;
    g.position.set(x, this.baseY(x, z, 1.4), z); g.rotation.y = ry; this.scene.add(g);
    if (label && accent && built.sign) {
      const s = sign(this.c, label, accent);
      s.position.set(built.sign[0], 0, built.sign[1]); s.rotation.y = -ry * 0.6; g.add(s);
      this.signs.push(s);
    }
    g.updateMatrixWorld(true);
    (built.smoke ?? []).forEach((pt) => this.smoke(pt.clone().applyMatrix4(g.matrixWorld)));
    if (id) {
      const e: Hoverable = { id, group: g, top, baseY: g.position.y, l: 0 };
      this.hoverables.push(e);
      g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.userData.hov = e; this.hits.push(o); } });
    }
  }

  /** The lowest snow under a footprint, so buildings on a slope sink in rather than float. */
  private baseY(x: number, z: number, r: number) {
    let m = this.c.gh(x, z);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; m = Math.min(m, this.c.gh(x + Math.cos(a) * r, z + Math.sin(a) * r)); }
    return m - 0.04;
  }

  private pond() {
    const ice = new THREE.Mesh(
      new THREE.CircleGeometry(1, 72).rotateX(-Math.PI / 2),
      this.k.memo("ice", () => new THREE.MeshStandardMaterial({ map: this.k.tex(iceCanvas(), { edge: true }), roughness: 0.3, metalness: 0 })),
    );
    ice.scale.set(POND.rx, 1, POND.rz); ice.position.set(POND.x, 0.05, POND.z); ice.receiveShadow = true; this.scene.add(ice);
    // A snowball on the ice skids, and bowls over any skater in its way.
    this.play.on(ice, {
      floor: true,
      hit: (at, dir) => this.play.slide(at, dir, POND, (p, v) => {
        for (const a of this.skating) if (!a.down && Math.hypot(a.root.position.x - p.x, a.root.position.z - p.z) < 0.45) this.play.knock(a, v);
      }),
    });
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 64; i++) { const a = (i / 64) * TAU; pts.push(new THREE.Vector3(POND.x + Math.cos(a) * (POND.rx + 0.15), 0.06, POND.z + Math.sin(a) * (POND.rz + 0.15))); }
    const rim = new THREE.Mesh(lumpy(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.3, 8, true), 0.1, 1.6, 3), this.k.paint(C.snow));
    rim.castShadow = true; rim.receiveShadow = true; this.scene.add(rim);
    this.play.on(rim, { floor: true, hit: (at) => this.play.splat(at) });
  }

  /** Cutout pines everywhere there's room, thicker towards the edges of the village. */
  private trees(keep: Keep[]) {
    const R = rng(17);
    const clear = (x: number, z: number) => keep.every((k) => ("ell" in k ? ((x - k.x) / k.rx) ** 2 + ((z - k.z) / k.rz) ** 2 > 1 : Math.hypot(x - k.x, z - k.z) > k.r));
    let placed = 0;
    for (let a = 0; a < 6000 && placed < 170; a++) {
      const x = lerp(-50, 50, R()), z = lerp(-44, 26, R());
      const chance = 0.08 + 0.92 * smooth(10, 21, Math.hypot(x, z * 1.15));
      if (R() > chance || !clear(x, z)) continue;
      const s = 0.75 + R() * 0.7, v = Math.floor(R() * TREE_VARIANTS);
      const m = this.k.cutout(treeCanvas(v), 2.9 * s, { foot: 0.04 }), h = 2.9 * s;
      m.position.set(x, this.c.gh(x, z) - 0.05, z); this.scene.add(m);
      // Hit a tree and it shakes the snow off its branches. Now and then a bird flies out.
      this.play.on(m, {
        cut: true,
        hit: (at) => {
          this.play.splat(at, 0.8); this.play.wobble(m, 0.2);
          this.play.burst(new THREE.Vector3(x, m.position.y + h * 0.55, z + 0.1), "puff", 7, { spread: [h * 0.22, h * 0.25, 0.1], speed: 0.3, up: 0.3, grav: 6, size: [0.22, 0.38], life: 1 });
          if (Math.random() < 0.35) this.play.bird(new THREE.Vector3(x, m.position.y + h * 0.8, z + 0.15));
        },
      });
      placed++;
    }
  }

  private lamp(x: number, z: number) {
    const { S, k } = this.c, y = this.c.gh(x, z), b = new Bake(k);
    b.add(S.cyl(0.06, 0.09, 2.2, 8, 0.01), "#2e2a33", { y: 1.1 }); b.add(S.rb(0.36, 0.1, 0.36, 0.03, 0), "#2e2a33", { y: 2.22 });
    b.add(S.rb(0.28, 0.36, 0.28, 0.05, 0), "#ffd27a", { y: 2.45, glow: true }); b.add(S.cone(0.26, 0.24, 4, 0), "#2e2a33", { y: 2.75, ry: Math.PI / 4 });
    b.add(S.rb(0.3, 0.08, 0.3, 0.04, 0.02), C.snow, { y: 2.88 });
    const g = b.group({ ei: 2 }); g.position.set(x, y, z); this.scene.add(g);
    const s = k.sprite(glowCanvas(), 0.9, true); s.scale.setScalar(2.4); s.position.set(x, y + 2.45, z); this.scene.add(s);
    // A snowball puts the lamp out for a moment.
    const lit = k.glow("#ffd27a", 2), bulb = g.children.find((o) => (o as THREE.Mesh).material === lit) as THREE.Mesh | undefined;
    const dark = k.memo("lampOut", () => { const m = lit.clone(); m.emissiveIntensity = 0.05; m.color.set("#8f8778"); return m; });
    const set = (on: boolean) => { if (bulb) bulb.material = on ? lit : dark; s.visible = on; };
    this.play.on(this.play.box(g, 0.8, 3.1), { hit: (at) => { this.play.splat(at, 0.8); this.play.sputter(set); } });
  }

  private smoke(pos: THREE.Vector3) {
    const puffs = Array.from({ length: 5 }, () => { const s = this.k.sprite(puffCanvas(), 0.8); this.scene.add(s); return s; });
    const ph = (pos.x * 0.37 + pos.z * 0.11) % 1;
    this.movers.push((t) => puffs.forEach((s, i) => {
      const a = (t * 0.22 + ph + i / puffs.length) % 1;
      s.position.set(pos.x + Math.sin(a * 4 + i) * 0.25 * a + a * 0.8, pos.y + a * 3.2, pos.z - a * 0.6);
      s.scale.setScalar(0.35 + a * 1.1); s.material.opacity = (1 - a) * 0.85 * smooth(0, 0.12, a);
    }));
    // A still frame (reduced motion) still shows a little smoke.
    puffs.forEach((s, i) => { const a = i / puffs.length; s.position.set(pos.x + a * 0.8, pos.y + a * 3.2, pos.z - a * 0.6); s.scale.setScalar(0.35 + a * 1.1); s.material.opacity = (1 - a) * 0.7; });
  }

  private snowfall() {
    const n = 2600, box = [34, 15, 26], pos = new Float32Array(n * 3), sp = new Float32Array(n), R = rng(23);
    for (let i = 0; i < n; i++) { pos[i * 3] = (R() * 2 - 1) * box[0]; pos[i * 3 + 1] = R() * box[1]; pos[i * 3 + 2] = (R() * 2 - 1) * box[2] + CAM.target.z; sp[i] = 0.7 + R() * 0.8; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = this.k.memo("flakes", () => new THREE.PointsMaterial({ size: 0.24, map: this.k.tex(flakeCanvas(), { edge: true }), transparent: true, depthWrite: false, fog: false }));
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; this.scene.add(pts);
    this.movers.push((t, dt) => {
      const f = this.focusPoint, a = g.attributes.position.array as Float32Array;
      for (let i = 0; i < n; i++) {
        const j = i * 3;
        a[j + 1] -= sp[i] * dt * 1.1; a[j] += Math.sin(t * 0.8 + i) * dt * 0.25;
        if (a[j + 1] < 0) a[j + 1] += box[1];
        if (a[j] < f.x - box[0]) a[j] += box[0] * 2; else if (a[j] > f.x + box[0]) a[j] -= box[0] * 2;
        if (a[j + 2] < f.z - box[2]) a[j + 2] += box[2] * 2; else if (a[j + 2] > f.z + box[2]) a[j + 2] -= box[2] * 2;
      }
      g.attributes.position.needsUpdate = true;
    });
  }

  /* ---------- villagers ---------- */

  private add(a: Actor) { this.scene.add(a.root); return a; }

  /**
   * Move someone with `at(t)` on a clock of their own, which stops while any of `who` is knocked
   * over, so they carry on from where they fell instead of jumping ahead.
   */
  private live(who: Actor[], at: (t: number) => void) {
    let t = 0;
    at(0);
    this.movers.push((_, dt) => { if (who.some((a) => a.down)) return; t += dt; at(t); });
  }

  /** Let a snowball knock this person over. */
  private knockable(a: Actor) {
    this.play.on(this.play.box(a.root, a.h * 0.55, a.h), {
      follow: a.root,
      hit: (at, dir) => { this.play.splat(at, 0.7); this.play.knock(a, dir); },
    });
  }

  private skaters() {
    const R = rng(31);
    for (let i = 0; i < 6; i++) {
      const a = this.add(actor(this.c, { outfit: i, pose: "skate", skates: true, kid: i === 4 }));
      const k = 0.32 + R() * 0.52, sp = (0.24 + R() * 0.18) * (i % 2 ? -1 : 1), ph0 = R() * TAU;
      this.live([a], (t) => {
        const th = ph0 + sp * t;
        a.root.position.set(POND.x + POND.rx * k * Math.cos(th), 0.06, POND.z + POND.rz * k * Math.sin(th));
        a.face(-Math.sin(th) * sp); a.pose("skate", t * 3 + i);
      });
      this.knockable(a); this.skating.push(a);
    }
    const spin = this.add(actor(this.c, { outfit: 4, pose: "spin", skates: true }));
    spin.root.position.set(POND.x - POND.rx * 0.1, 0.06, POND.z + POND.rz * 0.05);
    this.live([spin], (t) => { spin.root.rotation.y = t * 3.4; });
    this.knockable(spin); this.skating.push(spin);
  }

  private walker([ax, az, bx, bz]: [number, number, number, number], outfit: number, speed: number, ph: number, kid = false) {
    const a = this.add(actor(this.c, { outfit, pose: "walk", kid }));
    const len = Math.hypot(bx - ax, bz - az);
    this.live([a], (t) => {
      const u = (t * speed / len + ph) % 2, s = u < 1 ? u : 2 - u, dir = u < 1 ? 1 : -1;
      const x = lerp(ax, bx, s), z = lerp(az, bz, s);
      a.root.position.set(x, this.c.gh(x, z), z); a.face((bx - ax) * dir); a.pose("walk", t * 7 + ph * 3);
    });
    this.knockable(a);
    return a;
  }

  /** A dog trotting circles around its owner. A snowball sets it barking and doing laps. */
  private dogFollow(owner: Actor) {
    const d = dog(this.c); this.scene.add(d.root);
    let ang = 0, wide = 1, zoom = 0;
    const at = (t: number, dt: number) => {
      zoom = Math.max(0, zoom - dt);
      ang += dt * (zoom > 0 ? 8 : 2.6); wide += ((zoom > 0 ? 2 : 1) - wide) * Math.min(1, dt * 4);
      const o = owner.root.position, x = o.x + Math.cos(ang) * 1.1 * wide, z = o.z + Math.sin(ang) * 0.7 * wide;
      d.root.position.set(x, this.c.gh(x, z), z); d.face(-Math.sin(ang)); d.bob(t * (zoom > 0 ? 24 : 14));
    };
    at(0, 0); this.movers.push(at);
    this.play.on(this.play.box(d.root, 0.75, 0.6), {
      follow: d.root,
      hit: (p) => { this.play.splat(p, 0.6); zoom = 2.6; this.play.woof(d.root); },
    });
  }

  /** Kids sledding down the hill, then trudging back up. */
  private sledders() {
    ([[0, Math.PI * 0.75, 0], [5, Math.PI * 0.95, 4]] as const).forEach(([outfit, ang, ph]) => {
      const top = [HILL.x + Math.cos(ang) * 0.5, HILL.z + Math.sin(ang) * 0.5], bot = [HILL.x + Math.cos(ang) * 8, HILL.z + Math.sin(ang) * 8];
      const ride = this.c.k.cutout(sledCanvas(OUTFITS[outfit]), 0.95, { foot: 0.05 });
      ride.scale.x = bot[0] > top[0] ? 1 : -1;
      const back = this.add(actor(this.c, { outfit, pose: "walk", kid: true }));
      this.scene.add(ride);
      const T = 8;
      this.live([back], (t) => {
        const s = (t + ph) % T;
        if (s < 2.6) {
          const u = (s / 2.6) ** 2, x = lerp(top[0], bot[0], u), z = lerp(top[1], bot[1], u);
          ride.visible = true; back.root.visible = false; ride.position.set(x, this.c.gh(x, z) + 0.02, z);
        } else {
          const u = 1 - (s - 2.6) / (T - 2.6), x = lerp(top[0], bot[0], u), z = lerp(top[1], bot[1], u);
          ride.visible = false; back.root.visible = true; back.root.position.set(x, this.c.gh(x, z), z);
          back.face(top[0] - bot[0]); back.pose("walk", t * 6);
        }
      });
      this.knockable(back);
    });
  }

  /** Two kids in a snowball fight. Hit one and they throw one back, at you. */
  private snowballFight(A: [number, number], B: [number, number]) {
    const a = this.add(actor(this.c, { outfit: 2, pose: "throw", kid: true })), b = this.add(actor(this.c, { outfit: 5, pose: "throw", kid: true }));
    a.root.position.set(A[0], this.c.gh(...A), A[1]); b.root.position.set(B[0], this.c.gh(...B), B[1]);
    a.face(B[0] - A[0]); b.face(A[0] - B[0]);
    const ball = new THREE.Mesh(this.c.S.sph(0.12, 0.01), this.k.paint(C.snow)); ball.castShadow = true; this.scene.add(ball);
    const at = (t: number) => {
      const cyc = (t / 1.5) % 2, u = cyc % 1, fwd = cyc < 1, P = fwd ? A : B, Q = fwd ? B : A;
      ball.position.set(lerp(P[0], Q[0], u), 0.85 + Math.sin(u * Math.PI) * 1.6, lerp(P[1], Q[1], u));
      a.pose("hop", t * 5); b.pose("hop", t * 5 + 1.5);
    };
    at(0.4); this.movers.push(at);
    for (const k of [a, b]) {
      this.play.on(this.play.box(k.root, k.h * 0.55, k.h), {
        hit: (p) => {
          this.play.splat(p, 0.7); this.play.wobble(k.root, 0.35, 16, 5);
          this.play.later(0.45, () => this.play.throwBack(k.root.position.clone().setY(k.root.position.y + k.h * 0.8)));
        },
      });
    }
  }

  /** Carolers. A snowball makes them hop and hit a high note. */
  private carolers(x: number, z: number) {
    const y = this.c.gh(x, z);
    const list = [0, 3, 1].map((o, i) => {
      const a = this.add(actor(this.c, { outfit: o, pose: "carol", kid: i === 1 }));
      a.root.position.set(x + i * 0.85, y, z + (i % 2) * 0.25); a.face(1);
      return a;
    });
    const notes = [0, 1, 2, 3].map(() => { const s = this.k.sprite(noteCanvas(), 1); s.scale.set(0.3, 0.4, 1); this.scene.add(s); return s; });
    let cheer = 0;
    const at = (t: number, dt = 0) => {
      cheer = Math.max(0, cheer - dt);
      list.forEach((a, i) => (cheer > 0 ? a.pose("hop", t * 10 + i * 1.3) : a.pose("sway", t * 2.4 + i)));
      notes.forEach((s, i) => {
        const a = (t * 0.35 + i / 4) % 1;
        s.position.set(x + 1.6 + Math.sin(a * 6 + i) * 0.4, y + 1.8 + a * 2.2, z + 0.2); s.material.opacity = Math.sin(a * Math.PI);
      });
    };
    at(0.6); this.movers.push(at);
    const spot = new THREE.Group(); spot.position.set(x + 0.85, y, z + 0.12); this.scene.add(spot);
    this.play.on(this.play.box(spot, 2.7, 1.7, 1), {
      hit: (p) => {
        this.play.splat(p, 0.7); cheer = 1.3;
        this.play.burst(new THREE.Vector3(x + 0.85, y + 1.7, z + 0.2), "note", 8, { speed: 1.4, up: 3.2, grav: 2.5, size: [0.3, 0.42], life: 1.5, spin: 1.5 });
      },
    });
  }

  /** A finished snowman, and a kid rolling the next one's bottom ball. A snowball knocks the snowman's hat off. */
  private snowmanScene(x: number, z: number) {
    const sm = snowman(this.c); sm.g.position.set(x, this.c.gh(x, z), z); this.scene.add(sm.g);
    this.play.on(this.play.box(sm.g, 1, 1.75), {
      hit: (p) => { this.play.splat(p); this.play.wobble(sm.body, 0.1, 14, 5); this.play.toss(sm.hat); },
    });
    const a = this.add(actor(this.c, { outfit: 3, pose: "push", kid: true }));
    const ball = new THREE.Mesh(this.c.S.sph(0.42, 0.04, 8), this.k.paint(C.snow)); ball.castShadow = true; ball.receiveShadow = true; this.scene.add(ball);
    const A = [x + 1.6, z + 1.2], B = [x + 5, z + 2.2], len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    this.live([a], (t) => {
      const u = ((t * 0.45) / len) % 2, s = u < 1 ? u : 2 - u, dir = u < 1 ? 1 : -1;
      const bx = lerp(A[0], B[0], s), bz = lerp(A[1], B[1], s), dx = ((B[0] - A[0]) / len) * dir, dz = ((B[1] - A[1]) / len) * dir;
      ball.position.set(bx, this.c.gh(bx, bz) + 0.4, bz); ball.rotation.z = -(s * len) / 0.42;
      const px = bx - dx * 0.75, pz = bz - dz * 0.75;
      a.root.position.set(px, this.c.gh(px, pz), pz); a.face(dx);
    });
    this.knockable(a);
  }
}
