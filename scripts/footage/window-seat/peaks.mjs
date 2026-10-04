import './harness.mjs'; // sets the working folder
import fs from 'node:fs';
for (const id of ['ghibli', 'anderson', 'amelie']) {
  const { log, acts } = JSON.parse(fs.readFileSync(`scan-${id}.json`));
  const by = new Map();
  for (const r of log) {
    if (!r.primary || r.stars < 2) continue;
    const k = r.primary.name;
    const b = by.get(k);
    if (!b || r.total > b.total) by.set(k, r);
  }
  console.log(`\n== ${id} (${log.length / 10}s)`);
  for (const r of [...by.values()].sort((a, b) => a.t - b.t)) console.log(`${r.t.toFixed(1).padStart(6)}s ${r.stars}★ ${String(r.total).padStart(5)} ${r.primary.name}${r.primary.pose ? ' · ' + r.primary.pose : ''} [${r.cap}] zoom ${r.zoom} size ${r.primary.size} ${r.bonuses.join(',')}`);
  console.log('acts:', acts.map((a) => `${a.t.toFixed(0)}s ${a.kind} ${a.who}`).join('; '));
}
