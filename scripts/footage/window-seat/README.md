# Window Seat footage

These scripts record the gameplay shown on the Window Seat card and in its
full-screen view. They run the real game
([byebrianwong/wonder-lens](https://github.com/byebrianwong/wonder-lens)) in a
headless Chromium, so the footage is the game itself, not a mock-up.

The output goes to `public/cards/window-seat/`:

- `card.mp4` / `card.jpg`: the 13-second loop on the card, one moment per world.
- `reel-<world>.mp4` / `.jpg`: one reel per world for the full-screen view.
- `reels.json`: a score timeline for each reel (10 samples a second), so a photo
  taken at any point gets the score the game gave that frame.

## How it works

1. **Fixed clock.** The page's `requestAnimationFrame` and `performance.now` are
   replaced, and `Math.random` is seeded. Every frame advances exactly 1/30 s, so
   the video is smooth however slow rendering is, and two runs of the same ride
   produce the same frames.
2. **Scripted photographer.** The game turns the camera towards characters on its
   own after a few idle seconds. The scripts replace that with a sharper version:
   it picks the best character in view, turns to it, zooms until it fills about
   40% of the frame, and throws an item or calls so the character reacts (that is
   what triggers the special moments). It skips characters hidden behind the
   vehicle; see the note below.
3. **Scoring.** For each frame, the game's own `scorePhoto` rates what is in view
   (subject, stars, points, bonuses). Nothing is made up on the site side.

## Setup

1. Clone wonder-lens somewhere outside this repo and add this hook to the end of
   its `src/main.ts`. It exposes the scorer and a way to start a world without
   clicking through the menu. Don't commit it to the game.

   ```ts
   import { scorePhoto } from './game/Photo';
   (window as any).__wl = {
     scorePhoto,
     worlds: WORLDS.map((w) => ({ id: w.id, title: w.title, subtitle: w.subtitle, accent: w.accent })),
     start(id: string) {
       selected = WORLDS.find((w) => w.id === id) ?? WORLDS[0];
       relax = true;
       startRide(selected);
     },
   };
   ```

2. Build it: `npm ci && npx vite build`.
3. You need an `ffmpeg` with libx264. `npx ffmpeg-static` prints the path of a
   static build if you don't have one installed.
4. Set these when running the scripts:
   - `WONDER_LENS_DIST`: the game's `dist/` folder (required)
   - `FFMPEG`: path to ffmpeg (default: `ffmpeg` on the PATH)
   - `FOOTAGE_WORK`: where frames and logs go (default: a folder in the system
     temp dir; a full capture is about 700 MB of JPEGs)

## Steps

Run from the repo root, for example
`WONDER_LENS_DIST=~/code/wonder-lens/dist node scripts/footage/window-seat/scan.mjs`.

1. `scan.mjs [world…]`: plays each whole ride (about 20 s per world) and logs the
   score 10 times a second.
2. `peaks.mjs`: lists each world's best moment per character, with the game time.
3. `peek.mjs <world> <seconds…>`: saves one small frame at each time into a
   contact sheet, to judge candidates by eye. **Do this before picking.** The
   scorer sometimes rates a shot highly when the character can't actually be
   seen (see below).
4. Put the chosen times in `windows.json`.
5. `capture.mjs [world…]`: replays the rides and saves 1440×1080 frames (scaled
   to 960×720) from 5 s before to 2.5 s after each chosen time.
6. `strip.mjs <world> <every-n-frames> <clip…>`: a contact sheet along clips, to
   check them.
7. `build-reels.mjs`: cuts the clips into the reels and the card loop, and writes
   `reels.json`. The clip order for each reel and for the card is at the bottom of
   the file. If the card loop changes, copy the new `moments` it prints into
   `lib/showcases/windowSeat.ts`.

## Things the scorer gets wrong

Found while picking shots (checked 2026-10-03):

- **The vehicle's own walls don't block the view.** In the Zubrowka Express, the
  camera could turn round to face the inside of the train car, and the game still
  scored characters behind the wall as 4-star shots. The photographer now
  raycasts against the vehicle and skips anyone behind it. The game has the same
  gap for a real player.
- **Underwater characters count.** The jaguar shark scores as "Surfacing" for a
  few seconds before it breaks the surface.

The Ghibli and Amélie footage was recorded before the vehicle check was added,
so a re-run may pick slightly different moments for those worlds.
