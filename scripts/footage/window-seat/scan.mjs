// Pass 1: run each full ride on the fake clock, log the photo score 10x a second.
import { launch, boot, DIRECTOR } from './harness.mjs';
import fs from 'node:fs';
const worlds = process.argv.slice(2).length ? process.argv.slice(2) : ['ghibli', 'anderson', 'amelie'];
for (const id of worlds) {
  const { browser, page } = await launch({ width: 640, height: 480 });
  await boot(page, id, 1);
  await page.evaluate(DIRECTOR);
  const log = [];
  const t0 = Date.now();
  for (let f = 0; f < 30 * 400; f++) {
    const row = await page.evaluate((f) => {
      window.__clock.step(1000 / 30);
      const g = window.__dbg.game;
      if (f % 3 !== 0) return { done: g.ride.finished };
      const caps = g.world.captions; let cap = '';
      for (const c of caps) if (g.ride.state.u >= c[0]) cap = c[1];
      return { f, t: +g.time.toFixed(3), s: +g.ride.state.s.toFixed(2), u: +g.ride.state.u.toFixed(4), cap, zoom: +g.rig.zoom01.toFixed(2), target: window.__dir.target?.name ?? null, ...window.__score(), done: g.ride.finished };
    }, f);
    if (row.f !== undefined) log.push(row);
    if (row.done) break;
  }
  const acts = await page.evaluate(() => window.__dir.acts);
  fs.writeFileSync(`scan-${id}.json`, JSON.stringify({ log, acts }));
  const best = [...log].sort((a, b) => b.total - a.total).slice(0, 5).map((r) => `${r.t}s ${r.primary?.name} ${r.stars}★ ${r.total}`);
  console.log(id, 'frames', log.length * 3, 'secs', ((Date.now() - t0) / 1000).toFixed(0), 'acts', acts.length, '| top:', best.join(' | '));
  await browser.close();
}
