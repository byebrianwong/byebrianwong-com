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
  // ---- THE UTILITY BELT ----
  { id: "regibee", pack: "toolkit", name: "Regibee", tagline: "Universal gift registry", type: "Registry", icon: "🐝", year: 2024, accent: "#f59e0b", hp: 150, rarity: "legendary", link: "https://regibee.com", stats: { users: "120K", rating: "4.9", platform: "Web" }, blurb: "One registry for weddings, baby showers, housewarmings, and more — pull gifts from any store into a single list." },
  { id: "dodone", pack: "toolkit", name: "Do Done", tagline: "AI-native to-do app", type: "Tasks", icon: "✅", year: 2025, accent: "#22d3ee", hp: 120, rarity: "holo", link: "https://dodone.byebrianwong.com", stats: { users: "70K", rating: "4.8", platform: "Web" }, blurb: "A tasks and to-do app built for speed — AI-native and designed to work right inside Claude and Codex." },
  { id: "tapsearch", pack: "toolkit", name: "Tap Search", tagline: "Click to learn anything", type: "Extension", icon: "🔎", year: 2024, accent: "#3b82f6", hp: 90, rarity: "rare", link: "https://github.com/byebrianwong/tap-search", stats: { users: "35K", rating: "4.7", platform: "Chrome" }, blurb: "A Chrome extension to instantly learn about any word or subject — click anywhere on a page, learn inline, or save it for later." },
  { id: "byebrianwong", pack: "toolkit", name: "byebrianwong.com", tagline: "This very portfolio", type: "Portfolio", icon: "🃏", year: 2025, accent: "#a78bfa", hp: 100, rarity: "rare", link: "https://github.com/byebrianwong/byebrianwong-com", stats: { users: "45K", rating: "5.0", platform: "Web" }, blurb: "The App Arcade — an interactive booster-pack portfolio. Rip open a pack and collect the app cards. You're looking at it." },
  { id: "petjournal", pack: "toolkit", name: "Pet Journal", tagline: "Shared pet care log", type: "Mobile", icon: "🐾", year: 2024, accent: "#34d399", hp: 80, rarity: "common", link: "https://github.com/byebrianwong/pet-journal", stats: { users: "18K", rating: "4.8", platform: "iOS · Android" }, blurb: "A React Native + Expo app for tracking a pet's life across multiple caregivers — feedings, meds, and milestones on one shared timeline." },
  { id: "pantry", pack: "toolkit", name: "Pantry App", tagline: "Kitchen inventory tracker", type: "Utility", icon: "🥫", year: 2025, accent: "#fb7185", hp: 70, rarity: "common", link: "#", stats: { users: "—", rating: "—", platform: "In dev" }, blurb: "Keep tabs on what's in your pantry — track staples, watch expiry dates, and know what to restock. Currently in private development." },

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
