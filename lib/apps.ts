// App + pack data for the arcade. Swap these for real apps anytime —
// set each app's `pack` and `rarity` to control sorting and foil treatment.

export type PackId = "toolkit" | "arcade";
export type Rarity = "common" | "rare" | "holo" | "legendary";

export interface AppCard {
  id: string;
  pack: PackId;
  name: string;
  tagline: string;
  type: string;
  icon: string;
  year: number;
  accent: string;
  hp: number;
  rarity: Rarity;
  link: string;
  stats: { users: string; rating: string; platform: string };
  blurb: string;
}

export interface Pack {
  id: PackId;
  name: string;
  tagline: string;
  icon: string;
  a: string;
  b: string;
}

export const PACKS: Pack[] = [
  { id: "toolkit", name: "The Utility Belt", tagline: "Serious & useful", icon: "🛠️", a: "#22d3ee", b: "#3b82f6" },
  { id: "arcade", name: "The Arcade", tagline: "Fun & games", icon: "🎮", a: "#fb923c", b: "#f43f5e" },
];

export const APPS: AppCard[] = [
  // ---- THE TOOLKIT ----
  { id: "forge", pack: "toolkit", name: "Forge", tagline: "Snippet manager", type: "Dev", icon: "⚙️", year: 2022, accent: "#34d399", hp: 150, rarity: "legendary", link: "#", stats: { users: "200K", rating: "4.9", platform: "macOS" }, blurb: "A blazing-fast home for snippets, with search that reads your mind." },
  { id: "tempo", pack: "toolkit", name: "Tempo", tagline: "Habit tracker", type: "Focus", icon: "⏳", year: 2023, accent: "#22d3ee", hp: 90, rarity: "holo", link: "#", stats: { users: "80K", rating: "4.7", platform: "iOS · Android" }, blurb: "Streaks that feel good. A calm, rhythmic take on building habits." },
  { id: "atlas", pack: "toolkit", name: "Atlas", tagline: "Personal finance", type: "Finance", icon: "📊", year: 2025, accent: "#3b82f6", hp: 100, rarity: "rare", link: "#", stats: { users: "50K", rating: "4.8", platform: "Web" }, blurb: "Net worth, cash flow, and spending — mapped onto one calm canvas." },
  { id: "echo", pack: "toolkit", name: "Echo", tagline: "Voice transcription", type: "AI", icon: "🎙️", year: 2025, accent: "#f472b6", hp: 70, rarity: "common", link: "#", stats: { users: "30K", rating: "4.6", platform: "iOS" }, blurb: "Whisper-fast transcription with speaker labels and instant summaries." },

  // ---- THE ARCADE ----
  { id: "comet", pack: "arcade", name: "Comet", tagline: "Endless arcade runner", type: "Game", icon: "☄️", year: 2023, accent: "#38bdf8", hp: 95, rarity: "legendary", link: "#", stats: { users: "320K", rating: "4.8", platform: "iOS · Android" }, blurb: "A neon endless runner. Dodge, dash, and chain combos across the cosmos." },
  { id: "lumina", pack: "arcade", name: "Lumina", tagline: "AI photo playground", type: "Creative", icon: "✨", year: 2024, accent: "#a78bfa", hp: 120, rarity: "holo", link: "#", stats: { users: "120K", rating: "4.8", platform: "iOS" }, blurb: "On-device generative editing. Relight, reimagine, and retouch in a tap." },
  { id: "critter", pack: "arcade", name: "Critter", tagline: "Pocket pet sim", type: "Game", icon: "🐾", year: 2024, accent: "#fb923c", hp: 110, rarity: "rare", link: "#", stats: { users: "140K", rating: "4.9", platform: "iOS · Android" }, blurb: "Raise, feed, and battle pocket critters that evolve while you live your life." },
  { id: "doodle", pack: "arcade", name: "Doodle", tagline: "Drawing toy", type: "Creative", icon: "🎨", year: 2022, accent: "#f59e0b", hp: 80, rarity: "common", link: "#", stats: { users: "75K", rating: "4.7", platform: "iPadOS" }, blurb: "An infinite canvas of brushes, stickers, and physics-y paint that just feels good." },
];

export const RARITY: Record<Rarity, { label: string; gem: string; baseShine: number; rank: number }> = {
  common: { label: "COMMON", gem: "●", baseShine: 0, rank: 0 },
  rare: { label: "RARE", gem: "◆", baseShine: 0.12, rank: 1 },
  holo: { label: "HOLO", gem: "✦", baseShine: 0.3, rank: 2 },
  legendary: { label: "LEGENDARY", gem: "★", baseShine: 0.42, rank: 3 },
};

export const usersPct = (u: string) => Math.min(100, Math.round((parseFloat(u) / 320) * 100));
export const ratingPct = (r: string) => Math.round((parseFloat(r) / 5) * 100);
