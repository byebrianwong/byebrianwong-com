// Footage of web apps, recorded by scripts/footage/web/record.mjs.
//
// Each app's JSON holds two takes: `card`, a short loop for the card's art
// window, and `reel`, a longer walkthrough of the real interface for the
// full-screen view. Each take lists the steps the recording script marked
// (what it clicked or typed, and when), which become the card's labels and
// the reel's chapters.

import type { AppReel, LiveMedia } from "../apps";

interface Take {
  video: string;
  poster: string;
  duration: number;
  marks: { t: number; label: string; sub: string }[];
}

export interface WebFootage {
  card: Take;
  reel: Take;
}

/** Turn a recording into the card's live art and the full-screen reel. */
export function fromRecording(rec: WebFootage, url: string): { live: LiveMedia; reel: AppReel } {
  return {
    live: {
      video: rec.card.video,
      poster: rec.card.poster,
      duration: rec.card.duration,
      style: "tags",
      url,
      moments: rec.card.marks.map((m) => ({ t: m.t, name: m.label, from: m.sub })),
    },
    reel: {
      video: rec.reel.video,
      poster: rec.reel.poster,
      duration: rec.reel.duration,
      url,
      chapters: rec.reel.marks.map((m) => ({ t: m.t, title: m.label, text: m.sub })),
    },
  };
}
