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
  { id: "mainstream-hipster", pack: "arcade", name: "Mainstream Hipster", tagline: "Mainstream or hipster?", type: "Party", icon: "📊", year: 2026, accent: "#ec4899", hp: 130, rarity: "legendary", link: "https://mainstream-hipster.vercel.app", stats: { users: "60K", rating: "4.8", platform: "Web" }, blurb: "Rank everything from mainstream to hipster — scored on real Wikipedia, stream, and view-count data. How niche is your taste?" },
  { id: "second-guess", pack: "arcade", name: "Second Guess", tagline: "Be #2 to become #1", type: "Party", icon: "🥈", year: 2026, accent: "#8b5cf6", hp: 110, rarity: "holo", link: "https://secondguess.byebrianwong.com", stats: { users: "85K", rating: "4.9", platform: "Web" }, blurb: "A real-time party game where being popular loses. Match the crowd's second-favorite answer — take silver to win gold." },
  { id: "piano-note", pack: "arcade", name: "Piano Note", tagline: "3D pitch-training game", type: "Music", icon: "🎹", year: 2026, accent: "#06b6d4", hp: 90, rarity: "rare", link: "https://github.com/byebrianwong/piano-note", stats: { users: "40K", rating: "4.7", platform: "Web" }, blurb: "A 3D interactive piano keyboard that trains your ear — play, listen, and sharpen your pitch one note at a time." },
  { id: "dont-say-it", pack: "arcade", name: "Don't Say It", tagline: "Taboo-style word game", type: "Party", icon: "🤐", year: 2026, accent: "#f97316", hp: 75, rarity: "common", link: "https://github.com/byebrianwong/dont-say-it-word-game", stats: { users: "28K", rating: "4.7", platform: "Web" }, blurb: "Get your team to guess the word — without saying any of the forbidden ones. A fast, frantic take on the classic party word game." },
  { id: "edm-atlas", pack: "arcade", name: "EDM Atlas", tagline: "Map the world of EDM", type: "Music", icon: "🗺️", year: 2026, accent: "#d946ef", hp: 95, rarity: "rare", link: "https://edmatlas.byebrianwong.com", stats: { users: "—", rating: "—", platform: "Web" }, blurb: "Explore electronic dance music as an interactive star map — genres, subgenres, and the artists that connect them, charted across the galaxy." },
  { id: "triveal", pack: "arcade", name: "Triveal", tagline: "Countdown-clue trivia", type: "Trivia", icon: "🧠", year: 2026, accent: "#14b8a6", hp: 95, rarity: "rare", link: "https://triveal.vercel.app", stats: { users: "—", rating: "—", platform: "Web" }, blurb: "A daily trivia game of counting-down clues — guess early for glory, or hold out for the giveaway. The longer you wait, the less it's worth." },
  { id: "saturday-boring-cereal", pack: "arcade", name: "Saturday Boring Cereal", tagline: "Healthy cereal, ranked", type: "Reviews", icon: "🥣", year: 2026, accent: "#eab308", hp: 70, rarity: "common", link: "https://saturdayboringcereal.byebrianwong.com", stats: { users: "—", rating: "—", platform: "Web" }, blurb: "One reviewer walks the healthy-cereal aisle so you don't have to — every box tasted, weighed, and priced in cold, hard macros. The only aisle where boring is a brag." },
];

export const RARITY: Record<Rarity, { label: string; gem: string; baseShine: number; rank: number }> = {
  common: { label: "COMMON", gem: "●", baseShine: 0, rank: 0 },
  rare: { label: "RARE", gem: "◆", baseShine: 0.12, rank: 1 },
  holo: { label: "HOLO", gem: "✦", baseShine: 0.3, rank: 2 },
  legendary: { label: "LEGENDARY", gem: "★", baseShine: 0.42, rank: 3 },
};

export const usersPct = (u: string) => Math.min(100, Math.round((parseFloat(u) / 320) * 100));
export const ratingPct = (r: string) => Math.round((parseFloat(r) / 5) * 100);
