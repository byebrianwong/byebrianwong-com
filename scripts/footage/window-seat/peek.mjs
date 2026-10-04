// Grab one small frame at each listed time, to judge candidate moments by eye.
import { launch, boot, DIRECTOR, FFMPEG } from './harness.mjs';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const [id, ...ts] = process.argv.slice(2);
const times = ts.map(Number).sort((a, b) => a - b);
const { browser, page } = await launch({ width: 640, height: 480 });
await boot(page, id, 1);
await page.evaluate(DIRECTOR);
fs.mkdirSync('peek', { recursive: true });
const out = [];
let k = 0;
for (let f = 0; k < times.length; f++) {
  const t = (f + 1) / 30;
  const grab = t >= times[k];
  const r = await page.evaluate((grab) => {
    window.__clock.step(1000 / 30);
    if (!grab) return null;
    const s = window.__score();
    return { img: window.__dbg.game.o.renderer.canvas.toDataURL('image/jpeg', 0.8), name: s.primary?.name, stars: s.stars };
  }, grab);
  if (r) { const p = `peek/${id}-${k}.jpg`; fs.writeFileSync(p, Buffer.from(r.img.split(',')[1], 'base64')); out.push(p); console.log(k, times[k], r.name, r.stars); k++; }
}
await browser.close();
const args = ['-y', '-hide_banner', '-loglevel', 'error'];
out.forEach((f) => args.push('-i', f));
const cols = 4;
if (out.length === 1) args.push('-vf', 'scale=320:240', `peek-${id}.jpg`);
else args.push('-filter_complex', `${out.map((_, i) => `[${i}:v]scale=320:240[v${i}]`).join(';')};${out.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${out.length}:layout=${out.map((_, i) => `${(i % cols) * 320}_${Math.floor(i / cols) * 240}`).join('|')}:fill=black`, `peek-${id}.jpg`);
execFileSync(FFMPEG, args);
