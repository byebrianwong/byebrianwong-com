// Footage and photo scores for the Window Seat card.
//
// The video files in public/cards/window-seat/ are real gameplay. They were
// recorded by running the game (github.com/byebrianwong/wonder-lens) in a
// headless browser on a fixed clock, with a scripted camera that aims at
// characters, zooms in, and throws items or calls to make them react. While
// recording, the game's own photo scorer rated every frame, so the names,
// stars and points below (and in reels.json) are what the game would award a
// photo taken at that moment.

import type { LiveMedia } from "../apps";

/** The card's short loop: one scored moment from each world. */
export const WINDOW_SEAT_CARD: LiveMedia = {
  video: "/cards/window-seat/card.mp4",
  poster: "/cards/window-seat/card.jpg",
  duration: 13.33,
  film: 24,
  moments: [
    { t: 2.33, name: "Totoro", from: "My Neighbor Totoro", pose: "The big roar", stars: 4, total: 6226 },
    { t: 5.67, name: "The crème brûlée", from: "Amélie", pose: "Crack!", stars: 4, total: 2062 },
    { t: 9, name: "M. Gustave & Zero", from: "The Grand Budapest Hotel", pose: "Take the box", stars: 4, total: 3951 },
    { t: 12.33, name: "Kiki", from: "Kiki's Delivery Service", pose: "Wobbling broom", stars: 4, total: 2020 },
  ],
};

export type WorldId = "ghibli" | "anderson" | "amelie";

/**
 * One frame sample of a reel's score timeline (10 per second), or 0 when
 * nothing scoreable is in view. Kept as a tuple because reels.json holds
 * hundreds of them:
 * [subject, film it's from, special moment, stars 0–4, points, bonuses,
 *  name under the reticle, moment under the reticle]
 */
export type ScoreSample =
  | [string, string, string, number, number, string[], string, string]
  | 0;

export interface WorldReel {
  title: string;
  subtitle: string;
  accent: string;
  video: string;
  poster: string;
  duration: number;
  hz: number;
  frames: ScoreSample[];
  /** The best-scoring frame of each clip in the reel. */
  moments: { t: number; name: string; from: string; pose: string; stars: number; total: number }[];
  /** Where each clip starts, with the game's caption for that stretch of the ride. */
  chapters: { t: number; world: WorldId; caption: string }[];
}

export interface WindowSeatReels {
  worlds: Record<WorldId, WorldReel>;
}

export const REELS_URL = "/cards/window-seat/reels.json";
export const WORLD_ORDER: WorldId[] = ["ghibli", "anderson", "amelie"];

/** Characters across the three worlds (21 + 35 + 32), counted from the game's subject lists. */
export const SUBJECT_COUNT = 88;

/** The score sample for a point in a reel, looking one sample either side if that one is empty. */
export function sampleAt(reel: WorldReel, t: number): ScoreSample {
  const i = Math.max(0, Math.min(reel.frames.length - 1, Math.floor(t * reel.hz)));
  return reel.frames[i] || reel.frames[i - 1] || reel.frames[i + 1] || 0;
}

/** The game's caption for the stretch of the ride playing at time t. */
export function chapterAt(reel: WorldReel, t: number) {
  let c = reel.chapters[0];
  for (const ch of reel.chapters) if (ch.t <= t + 0.01) c = ch;
  return c;
}
