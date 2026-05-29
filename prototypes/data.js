// Shared placeholder data for all prototypes.
// Two booster packs: 'toolkit' (serious / useful) and 'arcade' (fun / games).
// `rarity`: common | rare | holo | legendary  — drives foil/border treatment and
// the pack-open reveal order (rarest card flips last, with a fanfare).
// Swap these for Brian's real apps later — set each app's `pack` to sort it.
window.PACKS = [
  { id: 'toolkit', name: 'The Toolkit', tagline: 'Serious & useful', icon: '🛠️', a: '#22d3ee', b: '#3b82f6' },
  { id: 'arcade',  name: 'The Arcade',  tagline: 'Fun & games',      icon: '🎮', a: '#fb923c', b: '#f43f5e' },
];

window.APPS = [
  // ---- THE TOOLKIT ----
  { id: 'forge', pack: 'toolkit', name: 'Forge', tagline: 'Snippet manager',     type: 'Dev',     icon: '⚙️', year: 2022, accent: '#34d399', hp: 150, rarity: 'legendary', link: '#', stats: { users: '200K', rating: '4.9', platform: 'macOS' },        blurb: 'A blazing-fast home for snippets, with search that reads your mind.' },
  { id: 'tempo', pack: 'toolkit', name: 'Tempo', tagline: 'Habit tracker',       type: 'Focus',   icon: '⏳', year: 2023, accent: '#22d3ee', hp: 90,  rarity: 'holo',      link: '#', stats: { users: '80K',  rating: '4.7', platform: 'iOS · Android' }, blurb: 'Streaks that feel good. A calm, rhythmic take on building habits.' },
  { id: 'atlas', pack: 'toolkit', name: 'Atlas', tagline: 'Personal finance',    type: 'Finance', icon: '📊', year: 2025, accent: '#3b82f6', hp: 100, rarity: 'rare',      link: '#', stats: { users: '50K',  rating: '4.8', platform: 'Web' },          blurb: 'Net worth, cash flow, and spending — mapped onto one calm canvas.' },
  { id: 'echo',  pack: 'toolkit', name: 'Echo',  tagline: 'Voice transcription', type: 'AI',      icon: '🎙️', year: 2025, accent: '#f472b6', hp: 70,  rarity: 'common',    link: '#', stats: { users: '30K',  rating: '4.6', platform: 'iOS' },          blurb: 'Whisper-fast transcription with speaker labels and instant summaries.' },

  // ---- THE ARCADE ----
  { id: 'comet',  pack: 'arcade', name: 'Comet',   tagline: 'Endless arcade runner', type: 'Game', icon: '☄️', year: 2023, accent: '#38bdf8', hp: 95,  rarity: 'legendary', link: '#', stats: { users: '320K', rating: '4.8', platform: 'iOS · Android' }, blurb: 'A neon endless runner. Dodge, dash, and chain combos across the cosmos.' },
  { id: 'lumina', pack: 'arcade', name: 'Lumina', tagline: 'AI photo playground',  type: 'Creative', icon: '✨', year: 2024, accent: '#a78bfa', hp: 120, rarity: 'holo',    link: '#', stats: { users: '120K', rating: '4.8', platform: 'iOS' },          blurb: 'On-device generative editing. Relight, reimagine, and retouch in a tap.' },
  { id: 'critter',pack: 'arcade', name: 'Critter', tagline: 'Pocket pet sim',      type: 'Game',    icon: '🐾', year: 2024, accent: '#fb923c', hp: 110, rarity: 'rare',     link: '#', stats: { users: '140K', rating: '4.9', platform: 'iOS · Android' }, blurb: 'Raise, feed, and battle pocket critters that evolve while you live your life.' },
  { id: 'doodle', pack: 'arcade', name: 'Doodle',  tagline: 'Drawing toy',         type: 'Creative', icon: '🎨', year: 2022, accent: '#f59e0b', hp: 80,  rarity: 'common',  link: '#', stats: { users: '75K',  rating: '4.7', platform: 'iPadOS' },       blurb: 'An infinite canvas of brushes, stickers, and physics-y paint that just feels good.' },
];

window.RARITY = {
  common:    { label: 'COMMON',    gem: '●',  baseShine: 0,    rank: 0 },
  rare:      { label: 'RARE',      gem: '◆',  baseShine: 0.12, rank: 1 },
  holo:      { label: 'HOLO',      gem: '✦',  baseShine: 0.30, rank: 2 },
  legendary: { label: 'LEGENDARY', gem: '★',  baseShine: 0.42, rank: 3 },
};

window.TYPE_COLORS = {
  AI:       { a: '#a78bfa', b: '#7c3aed' },
  Focus:    { a: '#22d3ee', b: '#0891b2' },
  Travel:   { a: '#fbbf24', b: '#d97706' },
  Dev:      { a: '#5eead4', b: '#0d9488' },
  Health:   { a: '#fb7185', b: '#e11d48' },
  Finance:  { a: '#60a5fa', b: '#2563eb' },
  Creative: { a: '#c4b5fd', b: '#8b5cf6' },
  Game:     { a: '#fdba74', b: '#f97316' },
};

// Tiny shared helper: a celebratory particle burst from the center of `host`.
// `n` controls intensity (default 22). Particles are gold stars by default.
window.burst = function (host, colors, n) {
  n = n || 22;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const dist = 120 + Math.random() * 240;
    p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
    p.style.setProperty('--c', colors[i % colors.length]);
    p.style.setProperty('--s', `${6 + Math.random() * 12}px`);
    p.style.setProperty('--r', `${Math.random() * 360}deg`);
    p.style.animationDelay = `${Math.random() * 0.08}s`;
    host.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
};
