// Snowballs for the winter village. Clicking anywhere that isn't an app's
// building throws one in from the bottom of the screen, and whatever it lands
// on reacts: villagers fall over, trees shake their snow off, lamps sputter
// out, the ice sends it skidding. This module throws and flies the balls and
// owns the little effects; the village says what each thing is and how it
// reacts (see `VillageScene.build`).

import * as THREE from "three";
import type { Actor, Ctx } from "./builders";
import { C, TAU, birdCanvas, clamp, flakeCanvas, noteCanvas, puffCanvas, rng, starCanvas, woofCanvas } from "./paper";

/** Something a snowball can land on. */
export interface Target {
  /** The ball landed: `at` is where, in world space, and `dir` is which way it was going (level, unit length). */
  hit(at: THREE.Vector3, dir: THREE.Vector3): void;
  /** Something that moves: the ball keeps aiming at it while it's in the air. */
  follow?: THREE.Object3D;
  /** A paper cutout: only the drawn part counts, not the clear margin around it. */
  cut?: boolean;
  /** Lies flat under everything (the snow, the ice), so it never stands in front of a building. */
  floor?: boolean;
}

/** Runs every frame until it returns false. */
type Fx = (dt: number) => boolean;
export type Spark = "puff" | "flake" | "star" | "note" | "woof";

/** Each kind of spark: its drawing, how many sprites to keep, and its width over its height. */
const SPARKS: Record<Spark, [() => HTMLCanvasElement, number, number]> = {
  puff: [puffCanvas, 70, 1], flake: [flakeCanvas, 40, 1], star: [starCanvas, 24, 1], note: [noteCanvas, 12, 0.75], woof: [woofCanvas, 2, 160 / 96],
};

const GRAVITY = 9.8;
const BALL_R = 0.2;
const shown = (o: THREE.Object3D | null) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };

export class Play {
  private fx: Fx[] = [];
  private targets: THREE.Object3D[] = [];
  /** Targets that can stand in front of a building: everything but the floor and the invisible boxes. */
  private solids: THREE.Object3D[] = [];
  private balls: THREE.Mesh[] = [];
  private flying = 0;
  private pools = new Map<Spark, { list: THREE.Sprite[]; i: number }>();
  private lumps: THREE.Mesh[] = [];
  private lumpN = 0;
  private busy = new WeakSet<object>();
  private alpha = new WeakMap<HTMLCanvasElement, Uint8ClampedArray>();
  private R = rng(77);

  constructor(private c: Ctx, private camera: THREE.Camera, private host: HTMLElement) {}

  /* ---------- what can be hit ---------- */

  /** Let snowballs land on these meshes. */
  on(objs: THREE.Object3D | THREE.Object3D[], t: Target) {
    for (const o of Array.isArray(objs) ? objs : [objs]) {
      o.userData.target = t; this.targets.push(o);
      if (!t.floor && o.visible) this.solids.push(o);
    }
  }

  /** Whether something stands in front of whatever the ray meets at `dist` (a tree in front of a building, say). */
  blocks(ray: THREE.Raycaster, dist: number) {
    const far = ray.far;
    ray.far = dist;
    const hits = ray.intersectObjects(this.solids, false);
    ray.far = far;
    return hits.some((h) => shown(h.object) && (!(h.object.userData.target as Target).cut || this.solid(h)));
  }

  /** An invisible box standing on `parent`'s origin, so something small or thin (a villager, a lamp) is easy to hit. */
  box(parent: THREE.Object3D, w: number, h: number, d = w) {
    const geo = this.c.k.geo(`hitbox${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0));
    const m = new THREE.Mesh(geo, this.c.k.memo("hitbox", () => new THREE.MeshBasicMaterial()));
    m.visible = false; m.userData.box = true; parent.add(m);
    return m;
  }

  /* ---------- throwing ---------- */

  /** Throw a snowball along a click's ray at the first thing it meets. */
  throw(ray: THREE.Raycaster) {
    const hit = this.pick(ray);
    if (!hit || this.flying >= 10) return;
    const t = hit.object.userData.target as Target, at = hit.point.clone();
    let to = () => at;
    if (t.follow) {
      const f = t.follow, off = at.clone().sub(f.getWorldPosition(new THREE.Vector3())), p = new THREE.Vector3();
      to = () => f.getWorldPosition(p).add(off);
    }
    // In from just below the bottom of the screen, on the side the click was.
    const side = clamp(at.clone().project(this.camera).x, -1, 1);
    const from = new THREE.Vector3(side * 0.9, -1.35, -4).applyMatrix4(this.camera.matrixWorld);
    const dist = from.distanceTo(at), lift = 1 + dist * 0.025;
    // The arc peaks two thirds of the way there: any earlier and, this close to the camera, it fills the top of the screen.
    this.fly(from, to, clamp(0.3 + dist * 0.011, 0.4, 0.85), (u) => lift * 6.75 * u * u * (1 - u), (p, dir) => t.hit(p, dir));
  }

  /** The nearest target under the ray, skipping hidden things and the clear margins of cutouts. */
  private pick(ray: THREE.Raycaster) {
    for (const h of ray.intersectObjects(this.targets, false)) {
      if (!(h.object.visible || h.object.userData.box) || !shown(h.object.parent)) continue;
      if ((h.object.userData.target as Target).cut && !this.solid(h)) continue;
      return h;
    }
    return null;
  }

  private solid(h: THREE.Intersection) {
    const map = ((h.object as THREE.Mesh).material as THREE.MeshStandardMaterial).map, cv = map?.image as HTMLCanvasElement | undefined;
    if (!cv?.getContext || !h.uv) return true;
    let a = this.alpha.get(cv);
    if (!a) { a = cv.getContext("2d")!.getImageData(0, 0, cv.width, cv.height).data; this.alpha.set(cv, a); }
    const x = Math.min(cv.width - 1, Math.floor(h.uv.x * cv.width)), y = Math.min(cv.height - 1, Math.floor((1 - h.uv.y) * cv.height));
    return a[(y * cv.width + x) * 4 + 3] > 127;
  }

  private ball() {
    let b = this.balls.find((m) => !m.visible);
    if (!b) {
      b = new THREE.Mesh(this.c.S.sph(BALL_R, 0.025, 3), this.c.k.paint(C.snow));
      b.castShadow = true; this.c.scene.add(b); this.balls.push(b);
    }
    b.visible = true; b.scale.setScalar(1);
    return b;
  }

  /** Fly a ball from `from` to wherever `to` says (asked every frame), raised by `arc(u)` along the way, then call `land`. */
  private fly(from: THREE.Vector3, to: () => THREE.Vector3, dur: number, arc: (u: number) => number, land: (at: THREE.Vector3, dir: THREE.Vector3) => void) {
    const b = this.ball();
    let t = 0;
    this.flying++;
    this.fx.push((dt) => {
      t += dt;
      const u = Math.min(1, t / dur), end = to();
      b.position.lerpVectors(from, end, u); b.position.y += arc(u);
      b.rotation.x -= dt * 9;
      if (u < 1) return true;
      b.visible = false; this.flying--;
      const dir = end.clone().sub(from).setY(0);
      land(end.clone(), dir.lengthSq() > 1e-6 ? dir.normalize() : new THREE.Vector3(0, 0, -1));
      return false;
    });
  }

  /** Someone throws one back: it flies at the screen and splats on the glass. */
  throwBack(from: THREE.Vector3) {
    const aim = new THREE.Vector3((this.R() - 0.5) * 0.9, this.R() * 0.4 - 0.1, -2.6), p = new THREE.Vector3();
    // This one's arc peaks early, while it's still far from the camera.
    this.fly(from, () => p.copy(aim).applyMatrix4(this.camera.matrixWorld), 0.75, (u) => 1.4 * 6.75 * u * (1 - u) * (1 - u), (at) => {
      at.project(this.camera);
      const r = this.host.getBoundingClientRect();
      this.screenSplat((at.x * 0.5 + 0.5) * r.width, (-at.y * 0.5 + 0.5) * r.height);
    });
  }

  private screenSplat(x: number, y: number) {
    if (this.host.querySelectorAll(".wv-splat").length >= 4) return;
    const el = document.createElement("div");
    el.className = "wv-splat";
    el.setAttribute("aria-hidden", "true");
    el.style.left = `${Math.round(x)}px`; el.style.top = `${Math.round(y)}px`;
    el.style.setProperty("--r", `${Math.round(this.R() * 360)}deg`);
    el.innerHTML = splatSvg(this.R);
    el.addEventListener("animationend", () => el.remove());
    this.host.appendChild(el);
  }

  /* ---------- effects ---------- */

  update(dt: number) {
    // Effects can start more effects; those run from this same frame.
    let j = 0;
    for (let i = 0; i < this.fx.length; i++) { const f = this.fx[i]; if (f(dt)) this.fx[j++] = f; }
    this.fx.length = j;
  }

  later(s: number, fn: () => void) {
    let t = 0;
    this.fx.push((dt) => { t += dt; if (t < s) return true; fn(); return false; });
  }

  /** A sprite from the pool for its kind. Reusing one ends whatever it was doing before. */
  private spark(kind: Spark, life: number, step: (s: THREE.Sprite, age: number, dt: number) => void) {
    let pool = this.pools.get(kind);
    if (!pool) {
      const [draw, n, aspect] = SPARKS[kind];
      const list = Array.from({ length: n }, () => {
        const s = this.c.k.sprite(draw(), 1);
        s.visible = false; s.userData.aspect = aspect; this.c.scene.add(s);
        return s;
      });
      pool = { list, i: 0 };
      this.pools.set(kind, pool);
    }
    const s = pool.list[pool.i++ % pool.list.length], me = {};
    s.userData.owner = me; s.visible = true; s.material.opacity = 1; s.material.rotation = 0;
    let age = 0;
    step(s, 0, 0);
    this.fx.push((dt) => {
      if (s.userData.owner !== me) return false;
      age += dt;
      if (age >= life) { s.visible = false; return false; }
      step(s, age, dt);
      return true;
    });
  }

  /** Sparks thrown out from a point. They fall with `grav` (negative rises, like smoke) and fade out. */
  burst(at: THREE.Vector3, kind: Spark, n: number, o: {
    speed?: number; up?: number; grav?: number; size?: [number, number]; life?: number; spread?: [number, number, number]; grow?: number; spin?: number;
  } = {}) {
    const { speed = 2, up = 2, grav = GRAVITY, size = [0.2, 0.35], life = 0.6, spread = [0, 0, 0], grow = 0, spin = 0 } = o, R = this.R;
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, sp = speed * (0.4 + R() * 0.6), L = life * (0.7 + R() * 0.3), w = (R() * 2 - 1) * spin;
      const p = at.clone().add(new THREE.Vector3((R() * 2 - 1) * spread[0], (R() * 2 - 1) * spread[1], (R() * 2 - 1) * spread[2]));
      const v = new THREE.Vector3(Math.cos(a) * sp, up * (0.5 + R() * 0.5), Math.sin(a) * sp);
      const sz = size[0] + R() * (size[1] - size[0]);
      this.spark(kind, L, (s, age, dt) => {
        v.y -= grav * dt; p.addScaledVector(v, dt); s.position.copy(p);
        const k = age / L, h = sz * (1 + grow * k);
        s.scale.set(h * s.userData.aspect, h, 1); s.material.opacity = 1 - k * k; s.material.rotation += w * dt;
      });
    }
  }

  /** A snowball bursting into chunks and flakes. */
  splat(at: THREE.Vector3, big = 1) {
    this.burst(at, "puff", 7, { speed: 2.2 * big, up: 2.6, grav: 10, size: [0.18 * big, 0.34 * big], life: 0.55 });
    this.burst(at, "flake", 8, { speed: 3 * big, up: 3, grav: 8, size: [0.1, 0.18], life: 0.7 });
  }

  /** What's left of a snowball on the ground: a little heap that sinks into the snow after a while. */
  lump(at: THREE.Vector3) {
    const i = this.lumpN++ % 12;
    let m = this.lumps[i];
    if (!m) {
      m = new THREE.Mesh(this.c.S.sph(0.26, 0.05, 5, true), this.c.k.paint(C.snow));
      m.castShadow = true; m.receiveShadow = true; this.c.scene.add(m); this.lumps[i] = m;
    }
    const me = {};
    m.userData.owner = me; m.visible = true; m.position.copy(at); m.rotation.y = this.R() * TAU;
    let t = 0;
    this.fx.push((dt) => {
      if (m.userData.owner !== me) return false;
      t += dt;
      const k = Math.min(1, t / 0.12), s = t < 7 ? 1 : Math.max(0, 1 - (t - 7) / 1.5), w = (0.7 + 0.3 * k) * s;
      m.scale.set(w, 0.55 * k * s + 0.001, w);
      if (t < 8.5) return true;
      m.visible = false;
      return false;
    });
  }

  /** A ball landing on the rink skids across the ice, bouncing off its edge, until it stops. `roll` hears where it is each frame. */
  slide(at: THREE.Vector3, dir: THREE.Vector3, rink: { x: number; z: number; rx: number; rz: number }, roll: (p: THREE.Vector3, v: THREE.Vector3) => void) {
    const b = this.ball(), v = dir.clone().multiplyScalar(4.6), n = new THREE.Vector3();
    b.position.copy(at).setY(at.y + BALL_R * 0.85);
    this.burst(at, "flake", 6, { speed: 1.6, up: 1.5, size: [0.1, 0.16], life: 0.5 });
    let t = 0, stop = 0;
    this.fx.push((dt) => {
      t += dt;
      if (!stop) {
        b.position.addScaledVector(v, dt); v.multiplyScalar(Math.exp(-0.85 * dt));
        const dx = b.position.x - rink.x, dz = b.position.z - rink.z;
        if ((dx / rink.rx) ** 2 + (dz / rink.rz) ** 2 > 0.85) {
          n.set(dx / rink.rx ** 2, 0, dz / rink.rz ** 2).normalize();
          const d = v.dot(n);
          if (d > 0) v.addScaledVector(n, -2 * d).multiplyScalar(0.7);
        }
        b.rotation.x += (v.z * dt) / BALL_R; b.rotation.z -= (v.x * dt) / BALL_R;
        roll(b.position, v);
        if (v.length() < 0.25 || t > 7) stop = t;
        return true;
      }
      const k = (t - stop) / 0.6;
      b.scale.setScalar(Math.max(0.001, 1 - k));
      if (k < 1) return true;
      b.visible = false;
      return false;
    });
  }

  /** Shake something about its foot (a tree, a snowman): a quick wobble that dies away. */
  wobble(o: THREE.Object3D, amp: number, freq = 13, decay = 4) {
    const me = {};
    o.userData.wobble = me;
    let t = 0;
    this.fx.push((dt) => {
      if (o.userData.wobble !== me) return false;
      t += dt;
      o.rotation.z = amp * Math.sin(t * freq) * Math.exp(-t * decay);
      if (t < 1.6) return true;
      o.rotation.z = 0;
      return false;
    });
  }

  /** Squash and stretch a building the way papier-mâché gives when something hits it. */
  squash(g: THREE.Object3D) {
    const me = {};
    g.userData.squash = me;
    let t = 0;
    this.fx.push((dt) => {
      if (g.userData.squash !== me) return false;
      t += dt;
      const k = Math.sin(t * 15) * Math.exp(-t * 5) * 0.08;
      g.scale.set(1 + k * 0.6, 1 - k, 1 + k * 0.6);
      if (t < 1.3) return true;
      g.scale.setScalar(1);
      return false;
    });
  }

  /** Pop something straight up, spinning, and drop it back where it was (the snowman's hat). */
  toss(o: THREE.Object3D, up = 0.9, turns = 2) {
    if (this.busy.has(o)) return;
    this.busy.add(o);
    const y0 = o.position.y, v0 = Math.sqrt(2 * GRAVITY * up), T = (2 * v0) / GRAVITY, spin = (this.R() < 0.5 ? -1 : 1) * turns * TAU;
    let t = 0;
    this.fx.push((dt) => {
      t = Math.min(T, t + dt);
      o.position.y = y0 + v0 * t - 0.5 * GRAVITY * t * t; o.rotation.z = (spin * t) / T;
      if (t < T) return true;
      o.position.y = y0; o.rotation.z = 0; this.busy.delete(o);
      return false;
    });
  }

  /** Knock a paper villager flat. They lie there seeing stars for a moment, then pop back up. */
  knock(a: Actor, dir: THREE.Vector3) {
    if (a.down) return;
    a.down = true;
    const r = a.root, side = dir.x > 0 ? -1 : 1, FALL = 1.42, head = new THREE.Vector3();
    let t = 0, landed = false;
    this.fx.push((dt) => {
      t += dt;
      let z: number;
      if (t < 0.2) z = FALL * (t / 0.2) ** 2;
      else if (t < 0.36) z = FALL - 0.14 * Math.sin((Math.PI * (t - 0.2)) / 0.16);
      else if (t < 1.4) z = FALL;
      else if (t < 1.65) { const u = (t - 1.4) / 0.25; z = FALL * (1 - u) - 0.25 * Math.sin(Math.PI * u); }
      else z = -0.2 * Math.sin((t - 1.65) * 14) * Math.exp(-(t - 1.65) * 6);
      r.rotation.z = side * z;
      if (!landed && t >= 0.2) {
        landed = true;
        r.updateWorldMatrix(true, false);
        this.burst(r.localToWorld(head.set(0, a.h * 0.5, 0)), "puff", 4, { speed: 1.2, up: 1.2, size: [0.16, 0.26], life: 0.5 });
      }
      if (t < 2.2) return true;
      r.rotation.z = 0; a.down = false;
      return false;
    });
    for (let i = 0; i < 3; i++) {
      this.spark("star", 1.3, (s, age) => {
        r.updateWorldMatrix(true, false); r.localToWorld(head.set(0, a.h * 0.85, 0));
        const an = age * 5 + (i * TAU) / 3, k = clamp((age - 0.3) * 6, 0, 1) * clamp((1.3 - age) * 5, 0, 1);
        s.position.set(head.x + Math.cos(an) * 0.32, head.y + 0.22 + Math.sin(an) * 0.08, head.z + Math.sin(an) * 0.32);
        s.scale.setScalar(0.22 * k + 0.001); s.material.opacity = k;
      });
    }
  }

  /** A lamp hit by a snowball sputters out, stays dark a few seconds, then flickers back on. */
  sputter(set: (on: boolean) => void) {
    if (this.busy.has(set)) return;
    this.busy.add(set);
    let t = 0;
    const flicker = (u: number) => Math.sin(u * 61) + Math.sin(u * 37) > 0;
    this.fx.push((dt) => {
      t += dt;
      if (t < 0.5) set(flicker(t));
      else if (t < 3.2) set(false);
      else if (t < 3.6) set(flicker(t));
      else { set(true); this.busy.delete(set); return false; }
      return true;
    });
  }

  /** A little red bird startled out of a tree, flapping off into the distance. */
  bird(from: THREE.Vector3) {
    const { k, scene } = this.c, frames = [k.label(birdCanvas(true)), k.label(birdCanvas(false))];
    const m = k.cutout(birdCanvas(true), 0.42, { center: true }), dir = this.R() < 0.5 ? -1 : 1;
    const v = new THREE.Vector3(dir * 2.6, 1.4, -1.6);
    m.scale.x = dir; m.position.copy(from); scene.add(m);
    let t = 0;
    this.fx.push((dt) => {
      t += dt;
      m.position.addScaledVector(v, dt); v.y += dt * 0.5;
      m.material = frames[Math.floor(t * 11) % 2];
      if (t < 4) return true;
      scene.remove(m);
      return false;
    });
  }

  /** The dog's bark, in a speech bubble that floats over it. */
  woof(dog: THREE.Object3D) {
    this.spark("woof", 1.4, (s, age) => {
      s.position.copy(dog.position); s.position.x += 0.4; s.position.y += 1.05 + age * 0.15;
      const k = Math.min(1, age * 9);
      s.scale.set(0.95 * k * s.userData.aspect + 0.001, 0.95 * k + 0.001, 1); s.material.opacity = clamp((1.4 - age) / 0.3, 0, 1);
    });
  }

  dispose() {
    this.host.querySelectorAll(".wv-splat").forEach((e) => e.remove());
    this.fx.length = 0;
  }
}

/** A snowball splat on the screen: a lumpy blob with a few droplets around it. */
function splatSvg(R: () => number) {
  // Long and short lobes take turns, so the edge looks thrown rather than round.
  const n = 14, c = 60, pts = Array.from({ length: n }, (_, i) => {
    const a = ((i + R() * 0.4) / n) * TAU, r = i % 2 ? 22 + R() * 10 : 33 + R() * 20;
    return [c + Math.cos(a) * r, c + Math.sin(a) * r];
  });
  // A smooth closed curve: from the midpoint of each edge to the next, bending through the point between them.
  const mid = (i: number) => { const p = pts[i % n], q = pts[(i + 1) % n]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
  let d = `M${mid(0).map((v) => v.toFixed(1)).join(" ")}`;
  for (let i = 1; i <= n; i++) d += `Q${pts[i % n].map((v) => v.toFixed(1)).join(" ")} ${mid(i).map((v) => v.toFixed(1)).join(" ")}`;
  const drops = Array.from({ length: 5 }, () => {
    const a = R() * TAU, r = 48 + R() * 9;
    return `<circle cx="${(c + Math.cos(a) * r).toFixed(1)}" cy="${(c + Math.sin(a) * r).toFixed(1)}" r="${(2.5 + R() * 4).toFixed(1)}"/>`;
  }).join("");
  return `<svg viewBox="0 0 120 120"><path d="${d}Z"/>${drops}</svg>`;
}
