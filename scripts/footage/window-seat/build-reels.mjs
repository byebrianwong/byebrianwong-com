// Cut the captured frames into reels for the site, with a score timeline per reel.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { FFMPEG } from './harness.mjs';

const OUT = new URL('../../../public/cards/window-seat', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const TMP = 'tmp-seg';
fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP);

const worlds = {
  ghibli: { title: 'The Sea Train', subtitle: 'Studio Ghibli', accent: '#7fc7a4' },
  anderson: { title: 'The Zubrowka Express', subtitle: 'Wes Anderson', accent: '#f2a8bc' },
  amelie: { title: 'Montmartre by Moped', subtitle: 'Amélie', accent: '#e0563c' },
};
const data = {}, scans = {};
for (const id of Object.keys(worlds)) {
  data[id] = JSON.parse(fs.readFileSync(`frames/${id}/meta.json`));
  scans[id] = JSON.parse(fs.readFileSync(`scan-${id}.json`)).log;
}
const capAt = (id, t) => { let c = ''; for (const r of scans[id]) { if (r.t > t + 0.05) break; c = r.cap; } return c; };
const peakOf = (m) => m.reduce((bi, x, k) => (x.total > m[bi].total ? k : bi), 0);

/** One segment: frames [a, b) of a window, with a fade in and out. */
function seg(id, w, len, lead) {
  const m = data[id].meta[w];
  const pk = peakOf(m);
  let a = Math.max(0, pk - lead);
  let b = Math.min(m.length, a + len);
  a = Math.max(0, b - len);
  return { id, w, a, b, pk };
}

function encode(name, segs, size, crf) {
  const parts = [];
  segs.forEach((s, i) => {
    const n = s.b - s.a;
    const out = `${TMP}/${name}-${i}.mp4`;
    execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '30', '-start_number', String(s.a),
      '-i', `frames/${s.id}/${s.w}/%04d.jpg`, '-frames:v', String(n),
      '-vf', `scale=${size},fade=t=in:st=0:d=0.17,fade=t=out:st=${((n - 5) / 30).toFixed(3)}:d=0.17,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-g', '60', '-an', out]);
    parts.push(out);
  });
  fs.writeFileSync(`${TMP}/${name}.txt`, parts.map((p) => `file '${path.resolve(p)}'`).join('\n'));
  execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${TMP}/${name}.txt`, '-c', 'copy', '-movflags', '+faststart', `${OUT}/${name}.mp4`]);
  // poster = first frame
  const s0 = segs[0];
  execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-i', `frames/${s0.id}/${s0.w}/${String(s0.a).padStart(4, '0')}.jpg`, '-vf', `scale=${size}`, '-q:v', '4', `${OUT}/${name}.jpg`]);
  const kb = (fs.statSync(`${OUT}/${name}.mp4`).size / 1024).toFixed(0);
  console.log(name, segs.map((s) => `${s.id}/${s.w}[${s.a},${s.b})`).join(' '), `${kb} KB`);
}

/** Timeline at 10 Hz plus one "moment" per segment (its best-scoring frame). */
function timeline(segs) {
  const frames = [], moments = [], chapters = [];
  let base = 0;
  for (const s of segs) {
    const m = data[s.id].meta[s.w];
    chapters.push({ t: +(base / 30).toFixed(2), world: s.id, caption: capAt(s.id, m[s.a].t) });
    for (let i = s.a; i < s.b; i += 3) {
      const x = m[i];
      frames.push(x.primary ? [x.primary.name, x.primary.from, x.primary.pose, x.stars, x.total, x.bonuses.slice(0, 3), x.tag ? x.tag.name : '', x.tag ? x.tag.moment : ''] : 0);
    }
    const p = m[s.pk];
    moments.push({ t: +((base + s.pk - s.a) / 30).toFixed(2), name: p.primary.name, from: p.primary.from, pose: p.primary.pose, stars: p.stars, total: p.total });
    base += s.b - s.a;
  }
  return { duration: +(base / 30).toFixed(2), hz: 10, frames, moments, chapters };
}

const reels = {};
const plan = {
  ghibli: [['ghibli', 0], ['ghibli', 2], ['ghibli', 3], ['ghibli', 4]],
  anderson: [['anderson', 1], ['anderson', 2], ['anderson', 3], ['anderson', 4], ['anderson', 5]],
  amelie: [['amelie', 1], ['amelie', 2], ['amelie', 3], ['amelie', 4], ['amelie', 5]],
};
for (const [id, list] of Object.entries(plan)) {
  const segs = list.map(([wid, w]) => seg(wid, w, 135, 95));
  encode(`reel-${id}`, segs, '800:600', 27);
  reels[id] = { ...worlds[id], video: `/cards/window-seat/reel-${id}.mp4`, poster: `/cards/window-seat/reel-${id}.jpg`, ...timeline(segs) };
}
// the card's own short loop: one quick moment per world
const cardSegs = [seg('ghibli', 2, 100, 70), seg('amelie', 2, 100, 70), seg('anderson', 1, 100, 70), seg('ghibli', 0, 100, 70)];
encode('card', cardSegs, '480:360', 28);
const card = { video: '/cards/window-seat/card.mp4', poster: '/cards/window-seat/card.jpg', ...timeline(cardSegs) };
delete card.frames;
fs.writeFileSync(`${OUT}/reels.json`, JSON.stringify({ worlds: reels }));
fs.writeFileSync('card-timeline.json', JSON.stringify(card, null, 1));
console.log('reels.json', (fs.statSync(`${OUT}/reels.json`).size / 1024).toFixed(0), 'KB');
console.log(JSON.stringify(card.moments), JSON.stringify(card.chapters));
