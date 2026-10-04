# Web app footage

`record.mjs` records a web app for its card. Each app gets two takes:

- `card`: a short loop for the card's art window, at 4:3. It can hide the
  app's own panels (with `css`) so the main thing fills the small window.
- `reel`: a longer walkthrough of the full interface, shown when the card is
  opened full screen.

Each step the plan marks (`mark('CLUE 2', '8 points')`) is saved with its time.
On the card it becomes the label for that step; in the reel it becomes a
chapter.

## Run it

```bash
node scripts/footage/web/record.mjs <app> [card|reel]
```

You need Google Chrome installed (the script uses it in headless mode) and an
`ffmpeg` with libx264: set `FFMPEG`, or have `ffmpeg` on the PATH.
`npx ffmpeg-static` prints the path of a static build. Frames go to a temp
folder (or `FOOTAGE_WORK`).

Output:

- `public/cards/<app>/card.mp4`, `reel.mp4`, and a `.jpg` poster for each
- `lib/footage/<app>.json`: each take's length and marked steps, which
  `lib/apps.ts` imports

## How it works

It opens the live site in a clean headless Chrome, so nothing from your own
browser (logins, Spotify state) gets into the footage. Chrome's screencast sends
a frame each time the page repaints, stamped with when it painted. The frames
are then laid out on a 30 fps timeline by those stamps, so the video plays at
real speed.

## Adding an app

Copy a plan in `plans/`. A plan has the app's `url` and, for each take, a
`viewport`, an output `size`, optional `css` and `prepare`, and `steps(page,
mark)`, which drives the page with Playwright. Then add the app's footage in
`lib/apps.ts` with `fromRecording()` and set `showcase: "reel"`.

Notes for the existing plans:

- **Triveal** plays the daily puzzle, so the plan holds that day's answer
  (No. 126, 2026-10-04: Tower Bridge). For a new day, give up in a throwaway
  session to learn the answer. Playing the daily only reads from Triveal's
  server.
- **EDM Atlas** opens genres through the search button, because the "/"
  shortcut is ignored while a genre panel is open.
