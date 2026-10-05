import { WINDOW_SEAT_CARD } from "./showcases/windowSeat";
import { fromRecording, type WebFootage } from "./footage";
import edmAtlasFootage from "./footage/edm-atlas.json";
import trivealFootage from "./footage/triveal.json";
import mainstreamHipsterFootage from "./footage/mainstream-hipster.json";
import boringCerealFootage from "./footage/saturday-boring-cereal.json";
import littleLexiconFootage from "./footage/little-lexicon.json";

const edmAtlas = fromRecording(edmAtlasFootage as WebFootage, "edmatlas.byebrianwong.com");
const triveal = fromRecording(trivealFootage as WebFootage, "triveal.byebrianwong.com");
const mainstreamHipster = fromRecording(mainstreamHipsterFootage as WebFootage, "mainstream-hipster.vercel.app");
const boringCereal = fromRecording(boringCerealFootage as WebFootage, "saturdayboringcereal.byebrianwong.com");
const littleLexicon = fromRecording(littleLexiconFootage as WebFootage, "little-lexicon.vercel.app");

// App data for the arcade. Every app is one card in the single booster pack.
// Set each app's `rarity` to control its foil treatment and fanfare.

export type Rarity = "common" | "rare" | "holo" | "legendary";

/**
 * A point in a card's footage where something happens. On a viewfinder card
 * the shutter fires here and `stars` rates the photo; on a tags card the
 * label changes to `name`, with `from` underneath.
 */
export interface LiveMoment {
  t: number;
  name: string;
  from?: string;
  pose?: string;
  stars?: number;
  total?: number;
}

/** Real footage of the app, played in the card's art window. */
export interface LiveMedia {
  video: string;
  poster: string;
  duration: number;
  /**
   * What's drawn over the footage. "viewfinder" is a camera (for a photo
   * game): corner brackets, a film counter, and a polaroid at each moment.
   * "tags" is a browser bar with the app's address and a label for each step.
   */
  style?: "viewfinder" | "tags";
  /** Shots on a roll of film; a viewfinder card counts down from here as it snaps. */
  film?: number;
  /** The address shown in a tags card's browser bar. */
  url?: string;
  moments: LiveMoment[];
}

/** A longer walkthrough of the real app for the full-screen view, in chapters. */
export interface AppReel {
  video: string;
  poster: string;
  duration: number;
  url: string;
  chapters: { t: number; title: string; text: string }[];
}

export interface AppCard {
  id: string;
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
  /** Gameplay footage for the art window. Cards without it show their icon. */
  live?: LiveMedia;
  /** Counts shown in the full-screen reel view, next to the blurb that explains them. */
  facts?: { label: string; value: string }[];
  /** What you actually do in the app, written like a trading-card attack. */
  move?: { name: string; text: string };
  /**
   * Two short lines under the move, each a symbol and a plain description.
   * Write words, not bare numbers: a card has no room to explain a number.
   */
  traits?: { icon: string; text: string }[];
  /** A walkthrough of the real app, shown full screen by the "reel" showcase. */
  reel?: AppReel;
  /** A full-screen view opened in place of the standard detail panel. */
  showcase?: "window-seat" | "reel";
}

export const APPS: AppCard[] = [
  {
    id: "wonder-lens",
    name: "Wonder Lens",
    tagline: "A 3D photo-safari ride",
    type: "3D Game",
    icon: "📷",
    year: 2026,
    accent: "#7fc7a4",
    hp: 160,
    rarity: "legendary",
    link: "https://wonderlens.byebrianwong.com",
    stats: { users: "—", rating: "—", platform: "Web · three.js" },
    blurb:
      "Ride through hand-built 3D worlds from Ghibli, Wes Anderson and Amélie, Pokémon Snap style. Look anywhere, zoom in, throw acorns, and photograph the moments that make each world come alive. Every model, texture and sound is made in code.",
    live: WINDOW_SEAT_CARD,
    move: { name: "SNAP", text: "Frame it, centre it, catch the moment." },
    traits: [
      { icon: "🎬", text: "Ghibli, Wes Anderson and Amélie worlds" },
      { icon: "⭐", text: "Every photo gets a star rating" },
    ],
    showcase: "window-seat",
  },
  {
    id: "mainstream-hipster",
    name: "Mainstream Hipster",
    tagline: "Mainstream or hipster?",
    type: "Party",
    icon: "📊",
    year: 2026,
    accent: "#ec4899",
    hp: 130,
    rarity: "legendary",
    link: "https://mainstream-hipster.vercel.app",
    stats: { users: "60K", rating: "4.8", platform: "Web" },
    blurb: "Rank everything from mainstream to hipster — scored on real Wikipedia, stream, and view-count data. How niche is your taste?",
    ...mainstreamHipster,
    facts: [
      { label: "DECKS", value: "12" },
      { label: "THINGS", value: "1,976" },
      { label: "SOURCES", value: "5" },
    ],
    move: { name: "RANK IT", text: "Drag from mainstream to hipster, then see the real data." },
    traits: [
      { icon: "🎞️", text: "Music, movies, TV, food and more" },
      { icon: "📈", text: "Scored on real popularity data" },
    ],
    showcase: "reel",
  },
  {
    id: "edm-atlas",
    name: "EDM Atlas",
    tagline: "Map the world of EDM",
    type: "Music",
    icon: "🗺️",
    year: 2026,
    accent: "#d946ef",
    hp: 95,
    rarity: "rare",
    link: "https://edmatlas.byebrianwong.com",
    stats: { users: "—", rating: "—", platform: "Web" },
    blurb: "Explore electronic dance music as a 3D star map. Every genre is a star, related genres link into constellations, and each one comes with what makes it sound that way, real tracks to hear, and a synthesized demo of its building blocks.",
    ...edmAtlas,
    facts: [
      { label: "GENRES", value: "31" },
      { label: "FAMILIES", value: "8" },
      { label: "SYNTHS", value: "31" },
    ],
    move: { name: "FLY TO", text: "Pick a genre and the camera flies to its star." },
    traits: [
      { icon: "✨", text: "Every genre is a star on a 3D map" },
      { icon: "🎹", text: "Hear a synth demo of each sound" },
    ],
    showcase: "reel",
  },
  {
    id: "triveal",
    name: "Triveal",
    tagline: "Countdown-clue trivia",
    type: "Trivia",
    icon: "🧠",
    year: 2026,
    accent: "#14b8a6",
    hp: 95,
    rarity: "rare",
    link: "https://triveal.byebrianwong.com",
    stats: { users: "—", rating: "—", platform: "Web" },
    blurb: "A daily trivia game of counting-down clues — guess early for glory, or hold out for the giveaway. The longer you wait, the less it's worth.",
    ...triveal,
    facts: [
      { label: "CLUES", value: "4" },
      { label: "TOP SCORE", value: "10" },
      { label: "MODES", value: "2" },
    ],
    move: { name: "GUESS EARLY", text: "Fewer clues, more points. Wrong guesses cost one." },
    traits: [
      { icon: "🔍", text: "Each clue is easier, and worth less" },
      { icon: "📅", text: "A new puzzle every day" },
    ],
    showcase: "reel",
  },
  {
    id: "saturday-boring-cereal",
    name: "Saturday Boring Cereal",
    tagline: "Healthy cereal, ranked",
    type: "Reviews",
    icon: "🥣",
    year: 2026,
    accent: "#eab308",
    hp: 70,
    rarity: "common",
    link: "https://saturdayboringcereal.byebrianwong.com",
    stats: { users: "—", rating: "—", platform: "Web" },
    blurb: "One reviewer walks the healthy-cereal aisle so you don't have to — every box tasted, weighed, and priced in cold, hard macros. The only aisle where boring is a brag.",
    ...boringCereal,
    facts: [
      { label: "BOXES", value: "25" },
      { label: "BRANDS", value: "16" },
      { label: "TOP SCORE", value: "8.5" },
    ],
    move: { name: "READ THE SIDE", text: "Every box re-weighed and scored out of ten." },
    traits: [
      { icon: "🥣", text: "Healthy cereals, tasted and ranked" },
      { icon: "📋", text: "Protein, sugar and fiber for each box" },
    ],
    showcase: "reel",
  },
  {
    id: "little-lexicon",
    name: "Little Lexicon",
    tagline: "Big words that stick",
    type: "Vocab",
    icon: "📖",
    year: 2026,
    accent: "#fb7185",
    hp: 100,
    rarity: "holo",
    link: "https://little-lexicon.vercel.app",
    stats: { users: "—", rating: "—", platform: "Web" },
    blurb: "Learn the big words — GRE and beyond. Spaced repetition brings each word back just before you forget it, seven game modes keep practice from going stale, and every word comes with example sentences and audio.",
    ...littleLexicon,
    facts: [
      { label: "WORDS", value: "317" },
      { label: "MODES", value: "7" },
      { label: "EXAMPLES", value: "2,451" },
    ],
    move: { name: "RECALL", text: "Each word comes back just before you'd forget it." },
    traits: [
      { icon: "🎮", text: "Quizzes, speed rounds and more" },
      { icon: "🔊", text: "Example sentences and audio" },
    ],
    showcase: "reel",
  },
  {
    id: "dodone",
    name: "Do Done",
    tagline: "AI-native to-do app",
    type: "Tasks",
    icon: "✅",
    year: 2025,
    accent: "#22d3ee",
    hp: 120,
    rarity: "holo",
    link: "https://dodone.byebrianwong.com",
    stats: { users: "70K", rating: "4.8", platform: "Web" },
    blurb: "A tasks and to-do app built for speed — AI-native and designed to work right inside Claude and Codex.",
    move: { name: "CHECK OFF", text: "Add a task, get it done, tick it off." },
    traits: [
      { icon: "🤖", text: "Works right inside Claude and Codex" },
      { icon: "⚡", text: "Built for speed" },
    ],
  },
  {
    id: "regibee",
    name: "Regibee",
    tagline: "Universal gift registry",
    type: "Registry",
    icon: "🐝",
    year: 2024,
    accent: "#f59e0b",
    hp: 150,
    rarity: "legendary",
    link: "https://regibee.com",
    stats: { users: "120K", rating: "4.9", platform: "Web" },
    blurb: "One registry for weddings, baby showers, housewarmings, and more — pull gifts from any store into a single list.",
    move: { name: "POLLINATE", text: "Pull gifts from any store into one list." },
    traits: [
      { icon: "💍", text: "Weddings, baby showers and more" },
      { icon: "🎁", text: "One registry for every occasion" },
    ],
  },
  {
    id: "tapsearch",
    name: "Tap Search",
    tagline: "Click to learn anything",
    type: "Extension",
    icon: "🔎",
    year: 2024,
    accent: "#3b82f6",
    hp: 90,
    rarity: "rare",
    link: "https://github.com/byebrianwong/tap-search",
    stats: { users: "35K", rating: "4.7", platform: "Chrome" },
    blurb: "A Chrome extension to instantly learn about any word or subject — click anywhere on a page, learn inline, or save it for later.",
    move: { name: "TAP", text: "Click any word on a page to learn about it." },
    traits: [
      { icon: "🧩", text: "A Chrome extension for any page" },
      { icon: "🔖", text: "Save anything to read later" },
    ],
  },
  {
    id: "second-guess",
    name: "Second Guess",
    tagline: "Be #2 to become #1",
    type: "Party",
    icon: "🥈",
    year: 2026,
    accent: "#8b5cf6",
    hp: 110,
    rarity: "holo",
    link: "https://secondguess.byebrianwong.com",
    stats: { users: "85K", rating: "4.9", platform: "Web" },
    blurb: "A real-time party game where being popular loses. Match the crowd's second-favorite answer — take silver to win gold.",
    move: { name: "TAKE SILVER", text: "Match the crowd's second-favorite answer." },
    traits: [
      { icon: "🎉", text: "A real-time party game" },
      { icon: "🥇", text: "The most popular answer loses" },
    ],
  },
];

export const RARITY: Record<Rarity, { label: string; gem: string; baseShine: number; rank: number }> = {
  common: { label: "COMMON", gem: "●", baseShine: 0, rank: 0 },
  rare: { label: "RARE", gem: "◆", baseShine: 0.12, rank: 1 },
  holo: { label: "HOLO", gem: "✦", baseShine: 0.3, rank: 2 },
  legendary: { label: "LEGENDARY", gem: "★", baseShine: 0.42, rank: 3 },
};

