// Record a web app for its card: a short loop for the art window, and a longer
// reel for the full-screen view. Each app has a plan in ./plans/<app>.mjs that
// says what to click and type; see README.md.
//
//   node scripts/footage/web/record.mjs <app> [take…]
//
// Frames come from Chrome's screencast, which sends a frame each time the page
// repaints, stamped with the time it was painted. The frames are then laid out
// on a 30 fps timeline by those stamps, so the video plays at real speed even
// when frames arrive unevenly.

import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [app, ...only] = process.argv.slice(2);
if (!app) {
  console.error('usage: node scripts/footage/web/record.mjs <app> [take…]');
  process.exit(1);
}
const plan = (await import(`./plans/${app}.mjs`)).default;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const OUT = new URL(`../../../public/cards/${app}/`, import.meta.url).pathname;
const WORK = path.join(process.env.FOOTAGE_WORK || os.tmpdir(), `footage-${app}`);
fs.mkdirSync(OUT, { recursive: true });

const takes = Object.entries(plan.takes).filter(([name]) => !only.length || only.includes(name));
const summary = {};

for (const [name, take] of takes) {
  const dir = path.join(WORK, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  // Playwright's own headless Chromium, not installed Chrome: Chrome's
  // headless screencast leaves off the bottom 87 px of the viewport, so a
  // 960x720 page came out as 960x633 frames, cropped and then stretched to 4:3.
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
  const ctx = await browser.newContext({ viewport: take.viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await take.setup?.(page);
  await page.goto(plan.url, { waitUntil: 'networkidle' });
  if (take.css) await page.addStyleTag({ content: take.css });
  await take.prepare?.(page);

  // start capturing
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ ts: metadata.timestamp, file, size: [metadata.deviceWidth, metadata.deviceHeight] });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg', quality: 92, maxWidth: take.viewport.width, maxHeight: take.viewport.height, everyNthFrame: 1,
  });
  const marks = [];
  const mark = (label, sub = '') => marks.push({ wall: Date.now() / 1000, label, sub });
  await page.waitForTimeout(300);
  await take.steps(page, mark);
  const end = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await browser.close();

  // a frame smaller than the viewport would be cropped, then stretched to fit
  const [w, h] = frames[0].size;
  if (w !== take.viewport.width || h !== take.viewport.height) {
    throw new Error(`${app}/${name}: frames are ${w}x${h}, but the viewport is ${take.viewport.width}x${take.viewport.height}`);
  }

  // lay the frames out on the timeline by their paint times
  const t0 = frames[0].ts;
  const list = frames.map((f, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].ts : end;
    return `file '${f.file}'\nduration ${Math.max(0.001, next - f.ts).toFixed(4)}`;
  });
  list.push(`file '${frames[frames.length - 1].file}'`);
  fs.writeFileSync(path.join(dir, 'list.txt'), list.join('\n'));
  const duration = end - t0;
  const fade = take.fade ?? 0.25;
  execFileSync(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'),
    '-vf', `fps=30,scale=${take.size}:flags=lanczos,fade=t=in:st=0:d=${fade},fade=t=out:st=${(duration - fade).toFixed(3)}:d=${fade},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(take.crf ?? 27), '-g', '60', '-an', '-movflags', '+faststart',
    path.join(OUT, `${name}.mp4`),
  ]);
  execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-i', frames[0].file, '-vf', `scale=${take.size}:flags=lanczos`, '-q:v', '4', path.join(OUT, `${name}.jpg`)]);

  const timeline = {
    video: `/cards/${app}/${name}.mp4`,
    poster: `/cards/${app}/${name}.jpg`,
    duration: +duration.toFixed(2),
    marks: marks.map((m) => ({ t: +(m.wall - t0).toFixed(2), label: m.label, sub: m.sub })),
  };
  summary[name] = timeline;
  const kb = (fs.statSync(path.join(OUT, `${name}.mp4`)).size / 1024).toFixed(0);
  console.log(`${app}/${name}: ${frames.length} frames over ${duration.toFixed(1)} s, ${kb} KB`);
}

// keep the timelines for every take of this app in one file the site imports
const file = new URL(`../../../lib/footage/${app}.json`, import.meta.url).pathname;
fs.mkdirSync(path.dirname(file), { recursive: true });
const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
fs.writeFileSync(file, JSON.stringify({ ...prev, ...summary }, null, 2) + '\n');
console.log('timelines →', path.relative(process.cwd(), file));
