// Pass 2: replay the ride with the same seed; save frames around each chosen moment.
import { launch, boot, DIRECTOR } from './harness.mjs';
import fs from 'node:fs';
const PRE = 5, POST = 2.5;
const all = JSON.parse(fs.readFileSync(new URL('./windows.json', import.meta.url)));
const worlds = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(all);
for (const id of worlds) {
  const peaks = [...all[id]].sort((a, b) => a - b);
  const wins = peaks.map((p) => [Math.max(0.2, p - PRE), p + POST]);
  const { browser, page } = await launch({ width: 960, height: 720 });
  await boot(page, id, 1.5);
  await page.evaluate(DIRECTOR);
  await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 960; c.height = 720; window.__out = c; });
  const meta = wins.map(() => []);
  const end = wins[wins.length - 1][1];
  const t0 = Date.now();
  for (let f = 0; ; f++) {
    const t = (f + 1) / 30;
    const wi = wins.findIndex(([a, b]) => t >= a && t < b);
    const res = await page.evaluate((grab) => {
      window.__clock.step(1000 / 30);
      const g = window.__dbg.game;
      if (!grab) return { t: g.time };
      const ctx = window.__out.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(g.o.renderer.canvas, 0, 0, 960, 720);
      return { t: g.time, s: g.ride.state.s, img: window.__out.toDataURL('image/jpeg', 0.92), target: window.__dir.target?.name ?? null, zoom: g.rig.zoom01, ...window.__score() };
    }, wi >= 0);
    if (wi >= 0) {
      const dir = `frames/${id}/${wi}`;
      fs.mkdirSync(dir, { recursive: true });
      const n = meta[wi].length;
      fs.writeFileSync(`${dir}/${String(n).padStart(4, '0')}.jpg`, Buffer.from(res.img.split(',')[1], 'base64'));
      delete res.img;
      meta[wi].push(res);
    }
    if (t > end) break;
  }
  fs.writeFileSync(`frames/${id}/meta.json`, JSON.stringify({ wins, peaks, meta }));
  console.log(id, 'done in', ((Date.now() - t0) / 1000).toFixed(0), 's', meta.map((m, i) => `w${i}@${peaks[i]}: ${m.length}f peak ${Math.max(...m.map((x) => x.total))} ${m.reduce((a, x) => (x.total > a.total ? x : a), m[0]).primary?.name}`).join(' | '));
  await browser.close();
}
