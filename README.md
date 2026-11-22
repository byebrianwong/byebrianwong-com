# byebrianwong.com

Brian's portfolio: a bit about him, and every app and game he's built. The site
comes in more than one style. Each style is its own page that shows the same
things in a different world. The Winter Village is the home page (`/`). The
palette button in the nav switches styles; a visitor who picks the arcade
there is remembered (in their browser's localStorage), and `/` sends them to
it on later visits. Only picking from the menu counts, not landing on a
style's page from a link.

## Winter Village (`/`)

A papier-mâché winter village seen from far above. Buildings, hills and the ice
rink are lumpy papier-mâché shapes with real 3D light and shadow (three.js);
the villagers and trees are flat paper cutouts standing in the scene. People
skate on the rink, sled down a hill, throw snowballs and sing carols, and
smoke rises from the chimneys. Moving the mouse pans the camera across the
village (dragging on touch screens, arrow keys on a keyboard).

Every app has a building that hints at what it does: a camera kiosk for Wonder
Lens, a cereal-box shop, a beehive gift shop for Regibee, an observatory for
EDM Atlas, a library of stacked books, a podium with someone proudly on the #2
spot, a clock tower, a record shop, a lighthouse with a magnifying-glass lamp,
and a nursery with a growth chart. The log cabin by the rink is About.
Hovering a building tags it with its name; clicking opens a paper card with
the app's footage, what it is, and a PLAY or LAUNCH button. An open card has
its own URL (`/#/card/<app>`, `/#/about`), the same card links the arcade
uses. Keyboard and screen reader visitors get a list of every building that
appears when it gets focus; browsers without WebGL see that list instead of
the village.

Clicking anywhere that isn't an app's building throws a snowball, and what it
lands on reacts:

- Snow: the ball bursts and leaves a little heap that sinks back in after a few seconds.
- Ice: the ball skids across the rink, bounces off the edge, and knocks over any skater it runs into.
- Villagers (skaters, walkers, kids going back up the sledding hill, the kid
  rolling a snowball): they fall over, see stars, and get back up where they left off.
- The two kids in the snowball fight: they throw one back, and it splats on the screen.
- Carolers: they hop and send up a burst of notes.
- The dog: it barks and runs fast laps around its owner.
- The snowman: its hat pops off, spins, and lands back on its head.
- Pine trees: they shake their snow off, and sometimes a bird flies out.
- The big tree: it sways and throws off a shower of paper stars.
- Lamp posts: the light sputters out and comes back on a few seconds later.
- Ordinary cottages: they squash and stretch, snow slides off the roof, and the chimney puffs.

With reduced motion turned on, the village holds still and clicking the snow
does nothing.

Quiet carols play in the background: a music box playing Silent Night, Jingle
Bells, Deck the Halls and We Wish You a Merry Christmas over a soft pad, with
drifting bell notes in between. It's synthesized in the browser (Web Audio, no
audio files) from public-domain melodies. Browsers keep a page silent until
the visitor clicks or presses a key, so the music fades in on that first
gesture. The button in the bottom-right corner turns it off, and that's
remembered.

## The App Arcade (`/arcade`)

A booster-pack arcade portfolio. The arcade opens on one sealed 3D booster pack.
Click it and it tears open, and every app card flies out into a grid, flipping
face-up as it lands. The cards are styled like a modern board game: cream
card stock, an arched art window, icon tokens and chips, and a foil border on
rare, holo and legendary cards. They tilt under the pointer, show a "watch
demo" label on hover, and open a full-screen view on click. There's arcade
sound too.

Every card shows real footage of its app instead of an icon. So that very
different apps still look like one set, every card's footage is tinted in its
app's color, with whites pulled down and blacks lifted; hovering a card shows
the real colors. Wonder Lens's full-screen view is the game's viewfinder: you
can switch worlds and take photos that are scored the way the game scores
them. The other cards open a longer walkthrough of the app in chapters.

## Built with

**Next.js (App Router) + React + TypeScript**, plus **three.js** for the
winter village. Each style is one client component; there's no backend.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build
npm run start
```

## Where things live

- `app/` — Next.js App Router (`layout.tsx`, `page.tsx`, `globals.css`, `icon.svg`)
- `components/Arcade.tsx` — the whole flow: sealed pack → opening → card grid → inspect
- `components/Booster.tsx` — the 3D booster pack and its opening animation
- `components/Card.tsx` — the card's front and back faces, including the footage in the art window
- `components/WindowSeatShowcase.tsx` — Wonder Lens's full-screen viewfinder
- `lib/apps.ts` — the app data. Set each app's `rarity` (`common` | `rare` | `holo` |
  `legendary`) and point `link` at the real app URL so the LAUNCH button works.
  Optional fields make a card specific to its app: `live` (footage for the art
  window), `move` (its `text` is the one line under the card's name), `traits`
  (two short lines about the app; not shown on the card right now), `facts` (counts shown in the full-screen
  reel view), and `showcase` (a full-screen view of its own).
- `lib/showcases/windowSeat.ts` — Wonder Lens's card loop and score-timeline types
- `public/cards/<app>/` — each app's footage
- `scripts/footage/window-seat/` — how Wonder Lens's footage was recorded (see its README)
- `scripts/footage/web/` — how the other apps' footage is recorded from the live sites (see its README)
- `lib/arcadeRoute.ts` — the screen ↔ URL hash mapping (`#/cards`, `#/card/<app>`)
  that gives each screen its own history entry, so browser back walks the flow
  instead of leaving the site, and a card URL can be reloaded or shared. Links
  from the old two-pack layout (`#/pack/...`) still resolve.
- `lib/sound.ts` — synthesized arcade SFX (Web Audio, no asset files)
- `lib/siteStyle.ts`: the list of styles, the visitor's remembered choice, and the
  script in `<head>` that sends "/" to it before the page paints (and sends old
  arcade links like `/#/cards` to `/arcade`)
- `next.config.mjs`: redirects `/winter`, where the village first lived, to `/`
- `components/StyleSwitcher.tsx`: the palette button and style menu in the nav
- `components/AboutBio.tsx`: Brian's bio, shared by the About page and the village's cabin
- `app/page.tsx` and `components/winter/`: the winter village (`app/arcade/page.tsx` is the arcade)
  - `WinterVillage.tsx`: the page; owns everything you read (title, hover tag,
    cards, keyboard directory) and the card URLs
  - `WinterCard.tsx`: the paper card for an app or the cabin
  - `spots.ts`: every place you can step into (each app, plus the cabin)
  - `scene/village.ts`: the 3D village: layout, camera, villagers, hover and click, and how each thing reacts to a snowball
  - `scene/play.ts`: snowballs: throwing, flying, splatting, and the effects things react with
  - `scene/builders.ts`: houses, paper people, props, and one building per app
  - `scene/mache.ts`: lumpy papier-mâché shapes, and merging each building into a few meshes
  - `scene/paper.ts`: paper textures and every cut-paper drawing (people, trees, signs)
  - `music.ts`: the background carols (the notes, the music box, and the player);
    `MusicButton.tsx` is the switch
- `prototypes/` — the original standalone HTML explorations (reference only; not part of the build).
  `winter-village-studies.html` compares the three looks and three app placements
  that were considered for the winter village.

## Adding an app

Add it to `APPS` in `lib/apps.ts`. The arcade deals it as a card. The winter
village puts it in a cottage painted in its accent colour, at the next spare
spot (`SPARE_SPOTS` in `components/winter/scene/village.ts`), with its name on
a sign. To give it a building of its own, add a builder for its id to
`BUILDERS` in `components/winter/scene/builders.ts` and a spot for it in
`APP_SPOTS`. Back-row spots should sit in the gaps between front-row buildings:
the camera only slides, so a building hidden behind another stays hidden.

## Adding a style

Add an entry to `SITE_STYLES` in `lib/siteStyle.ts` and make its page at the
entry's `path`. It appears in the style menu automatically, and "/" remembers
it when a visitor picks it there. To give the nav buttons its look, style
`.site-nav[data-skin="<id>"]` in `app/globals.css`.

## Deploy (Vercel)

The Vercel project `byebrianwong-com` builds this repo, and `byebrianwong.com`
(and `www.byebrianwong.com`) point at it. Every push to `main` goes live there,
and every pull request gets its own preview deploy, linked in a comment by the
Vercel bot. Nothing needs to be run by hand.

It's a zero-config Next.js app, so the Vercel CLI works too:

```bash
npx vercel          # preview deploy
npx vercel --prod   # production deploy
```
