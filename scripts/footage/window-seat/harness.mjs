// Shared harness: serve the built game from disk, fake the clock, boot a world,
// and swap the game's idle camera for a scripted photographer.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// The game's production build, made from a clone with the hook from README.md added.
const DIST = process.env.WONDER_LENS_DIST;
if (!DIST || !fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('Set WONDER_LENS_DIST to the dist/ folder of a wonder-lens build (see README.md).');
  process.exit(1);
}
const ORIGIN = 'http://wonder.local';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

// Virtual clock: rAF and performance.now only advance when the script says so.
const CLOCK = `
(() => {
  let seed = 1234567;
  Math.random = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let now = 0; let manual = false; let id = 0; const q = new Map();
  const realRaf = window.requestAnimationFrame.bind(window);
  const realNow = performance.now.bind(performance);
  const t0 = realNow();
  performance.now = () => manual ? now : (now = realNow() - t0);
  window.requestAnimationFrame = (cb) => { const i = ++id; q.set(i, cb); return i; };
  window.cancelAnimationFrame = (i) => q.delete(i);
  const flush = () => { const cbs = [...q.values()]; q.clear(); for (const cb of cbs) { try { cb(now); } catch (e) { console.error(e); } } };
  const pump = () => { if (!manual) { now = realNow() - t0; flush(); } realRaf(pump); };
  realRaf(pump);
  window.__clock = {
    manual(on) { manual = on; },
    step(ms) { now += ms; flush(); },
  };
})();
`;

export async function launch({ width = 1024, height = 768 } = {}) {
  const browser = await chromium.launch({
    channel: 'chromium',
    headless: true,
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.route(`${ORIGIN}/**`, async (route) => {
    let p = new URL(route.request().url()).pathname;
    if (p === '/') p = '/index.html';
    const file = path.join(DIST, p);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: 'nf' });
    route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] ?? 'application/octet-stream', body: fs.readFileSync(file) });
  });
  await page.addInitScript(CLOCK);
  await page.goto(`${ORIGIN}/?sound=0`);
  return { browser, page };
}

/** Boot a world on the fake clock (so two runs match), then hand back control with the loop paused. */
export async function boot(page, worldId, pixelRatio = 1.5) {
  await page.waitForFunction(() => !!window.__wl);
  await page.evaluate((id) => { window.__clock.manual(true); window.__wl.start(id); }, worldId);
  for (let i = 0; i < 4000; i++) {
    const running = await page.evaluate(() => { window.__clock.step(16); return !!(window.__dbg && window.__dbg.game && window.__dbg.game.running); });
    if (running) break;
    await new Promise((r) => setTimeout(r, 5));
  }
  await page.evaluate((pr) => {
    const g = window.__dbg.game;
    const r = g.o.renderer;
    r.govern = () => {};            // keep full resolution even though the fake clock looks slow
    r.maxPixelRatio = pr; r.pixelRatio = pr; r.resize();
    g.o.input.requestLock = () => {};
    document.querySelectorAll('.loading, .hud').forEach((e) => (e.style.display = 'none'));
  }, pixelRatio);
}

/** Replace the game's idle camera with a photographer that aims, zooms, and gets characters to react. */
export const DIRECTOR = `
(() => {
  const g = window.__dbg.game;
  const V = g.tmp.constructor;
  const Q = g.world.cameraAnchor.quaternion.constructor;
  const v = new V(), loc = new V(), q = new Q();
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const st = { target: null, aimedFor: 0, lastAct: -10, acts: [], shotOf: new Map() };
  window.__dir = st;
  const dir = new V();
  // the game's scorer ignores the vehicle's own walls; skip anyone hidden behind them
  const behindVehicle = (s, d) => {
    dir.copy(v).sub(g.rig.camera.position).normalize();
    g.ray.set(g.rig.camera.position, dir);
    g.ray.near = 0.25; g.ray.far = Math.max(0.3, d - s.radius * 0.5);
    const hits = g.ray.intersectObject(g.ride.vehicle, true);
    return hits.some((h) => { const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material; return h.object.visible && !(m && m.transparent && m.opacity < 0.6); });
  };
  g.autoCamera = function (dt) {
    const cam = this.rig.camera, rig = this.rig;
    let best = null, bestScore = 0;
    for (const s of this.world.subjects) {
      if (!s.active) continue;
      s.center(v);
      const d = v.distanceTo(cam.position);
      if (d > Math.min(s.maxDistance * 0.7, 140) || d < 8) continue;
      if (behindVehicle(s, d)) { s.center(v); continue; }
      s.center(v);
      let sc = (s.base / 1000) * (1 - d / 170) * (s.pose !== 'idle' ? 1.6 : 1);
      if (s === st.target) sc *= 1.8;
      const seen = st.shotOf.get(s.id) || 0;
      if (s !== st.target && seen > 2.5) sc *= 0.35;   // move on to someone new
      if (sc > bestScore) { bestScore = sc; best = s; }
    }
    if (best !== st.target) { st.target = best; st.aimedFor = 0; }
    let yawT, pitchT;
    if (best) {
      best.center(v);
      this.world.cameraAnchor.getWorldQuaternion(q).invert();
      loc.copy(v).sub(cam.position).applyQuaternion(q);
      yawT = Math.atan2(-loc.x, -loc.z);
      pitchT = Math.atan2(loc.y, Math.hypot(loc.x, loc.z));
    } else {
      yawT = Math.sin(this.time * 0.13) * 0.5;
      pitchT = 0.05 + Math.sin(this.time * 0.09) * 0.05;
    }
    yawT = clamp(yawT, -rig.yawLimit, rig.yawLimit);
    pitchT = clamp(pitchT, rig.pitchMin, rig.pitchMax);
    const k = 1 - Math.exp(-dt * 2.6);
    rig.yawT += (yawT - rig.yawT) * k;
    rig.pitchT += (pitchT - rig.pitchT) * k;
    const err = Math.hypot(yawT - rig.yaw, pitchT - rig.pitch);
    st.aimedFor = best && err < 0.1 ? st.aimedFor + dt : 0;
    let fovT = rig.fovBase;
    if (best && st.aimedFor > 0.35) {
      const d = best.center(v).distanceTo(cam.position);
      const want = 2 * Math.atan(best.radius / (0.42 * d)) * 180 / Math.PI;
      fovT = clamp(want, rig.fovBase / 3.2, rig.fovBase);
      st.shotOf.set(best.id, (st.shotOf.get(best.id) || 0) + dt);
    }
    rig.fovT += (fovT - rig.fovT) * (1 - Math.exp(-dt * 1.9));
    if (best && st.aimedFor > 0.7 && this.time - st.lastAct > 3.2) {
      if (best.reactsToItems && best.itemReady && this.throwCd <= 0) { this.throwItem(); st.lastAct = this.time; st.acts.push({ t: this.time, kind: 'throw', who: best.name }); }
      else if (best.reactsToCall && this.callCd <= 0) { this.call(); st.lastAct = this.time; st.acts.push({ t: this.time, kind: 'call', who: best.name }); }
    }
  };
  /** The game's own photo score for the current frame, without taking a photo. */
  window.__score = () => {
    const r = window.__wl.scorePhoto(g.rig.camera, g.world.subjects, g.world.occluders, { symmetryBonus: g.o.def.id === 'anderson' }, g.ride.state.u, g.time, '');
    const p = r.primary;
    const tag = g.scanReticle().tagged;
    return {
      total: r.total, stars: r.stars, bonuses: r.bonuses,
      primary: p ? { name: p.subject.name, from: p.subject.from, pose: p.poseLabel || '', size: +p.size.toFixed(3) } : null,
      others: r.shots.filter((x) => x !== p).map((x) => x.subject.name),
      tag: tag ? { name: tag.name, from: tag.from, moment: tag.pose !== 'idle' ? (tag.poseLabel || '') : '' } : null,
    };
  };
})();
`;

/** Where frames, scan logs and other working files go. */
export const WORK = process.env.FOOTAGE_WORK || path.join(os.tmpdir(), 'window-seat-footage');
fs.mkdirSync(WORK, { recursive: true });
process.chdir(WORK);

/** ffmpeg with libx264: $FFMPEG, or `ffmpeg` on the PATH. */
export const FFMPEG = process.env.FFMPEG || 'ffmpeg';
