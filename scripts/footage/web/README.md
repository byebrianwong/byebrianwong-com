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

You need Playwright's headless Chromium (`npx playwright install
chromium-headless-shell`) and an `ffmpeg` with libx264: set `FFMPEG`, or have
`ffmpeg` on the PATH. `npx ffmpeg-static` prints the path of a static build.
Frames go to a temp folder (or `FOOTAGE_WORK`).

Don't switch it to installed Chrome (`channel: 'chrome'`). Chrome's headless
screencast leaves off the bottom 87 px of the viewport, so the footage loses the
bottom of the page. The script now stops with an error if the frames come out
smaller than the viewport. The EDM Atlas and Triveal footage was recorded with
Chrome before this was found, so it is missing that strip.

Output:

- `public/cards/<app>/card.mp4`, `reel.mp4`, and a `.jpg` poster for each
- `lib/footage/<app>.json`: each take's length and marked steps, which
  `lib/apps.ts` imports

## How it works

It opens the live site in a clean headless browser, so nothing from your own
browser (logins, Spotify state) gets into the footage. The screencast sends
a frame each time the page repaints, stamped with when it painted. The frames
are then laid out on a 30 fps timeline by those stamps, so the video plays at
real speed.

## Adding an app

Copy a plan in `plans/`. A plan has the app's `url` and, for each take, a
`viewport`, an output `size`, and `steps(page, mark)`, which drives the page
with Playwright. Optional hooks run before recording starts: `setup(page)`
before the page opens (for `page.route` and `page.addInitScript`), then `css`,
then `prepare(page)`. Then add the app's footage in `lib/apps.ts` with
`fromRecording()` and set `showcase: "reel"`.

Headless Chromium draws no mouse pointer, so clicks and drags seem to happen
on their own. `pointer.mjs` draws one: call `showPointer` in `setup`, and use
`clickOn` to move to an element and click it the way a person would.

Notes for the existing plans:

- **Triveal** plays the daily puzzle, so the plan holds that day's answer
  (No. 126, 2026-10-04: Tower Bridge). For a new day, give up in a throwaway
  session to learn the answer. Playing the daily only reads from Triveal's
  server.
- **EDM Atlas** opens genres through the search button, because the "/"
  shortcut is ignored while a genre panel is open.
- **Mainstream Hipster** serves a saved round (four TV shows) in place of a
  random one, and seeds the shuffle, so the cards always start in the same
  order. The plan drags two shows into the wrong order on purpose, so the
  reveal has something to reorder.
- **Saturday Boring Cereal** uses system fonts (Impact, Arial Narrow), so record
  it on a Mac. On Linux the fallback fonts change the look.
- **Little Lexicon** knows the right meaning for the first dozen words a new
  visitor sees. If its word list changes, the plan stops at the first word it
  doesn't know; add that word's first definition from `words.json`.
