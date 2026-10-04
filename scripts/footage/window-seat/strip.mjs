import { FFMPEG } from './harness.mjs';
// Every Nth frame of the given clips, in rows, to check what the camera actually sees.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const [id, every, ...wins] = process.argv.slice(2);
const files = [];
const { meta } = JSON.parse(fs.readFileSync(`frames/${id}/meta.json`));
for (const w of wins) for (let i = 0; i < meta[w].length; i += Number(every)) {
  files.push(`frames/${id}/${w}/${String(i).padStart(4, '0')}.jpg`);
  const m = meta[w][i];
  console.log(w, i, (i / 30).toFixed(1) + 's', m.primary?.name ?? '-', m.primary?.pose ?? '', m.stars + '★', m.total, '| tag', m.tag?.name ?? '-');
}
const cols = Math.ceil(files.length / wins.length);
const args = ['-y', '-hide_banner', '-loglevel', 'error'];
files.forEach((f) => args.push('-i', f));
if (files.length === 1) args.push('-vf', 'scale=240:180', `strip-${id}.jpg`);
else args.push('-filter_complex', `${files.map((_, i) => `[${i}:v]scale=240:180[v${i}]`).join(';')};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * 240}_${Math.floor(i / cols) * 180}`).join('|')}:fill=black`, `strip-${id}.jpg`);
execFileSync(FFMPEG, args);
