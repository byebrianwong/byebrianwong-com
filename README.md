# byebrianwong.com — The App Arcade

A booster-pack arcade portfolio. The site opens on one sealed 3D booster pack.
Click it and it tears open, and every app card flies out into a grid, flipping
face-up as it lands. Cards have holographic foil, a "watch demo" label on
hover, arcade sound, and a click-to-inspect view.

Every card shows real footage of its app instead of an icon. Wonder Lens's card
plays recorded gameplay under a camera viewfinder, and its full-screen view is
the game's viewfinder: you can switch worlds and take photos that are scored
the way the game scores them. The other cards play a recording of the app under
a small browser bar, and open a longer walkthrough in chapters.

Built with **Next.js (App Router) + React + TypeScript**. The whole experience is one
client component; there's no backend.

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
- `components/Card.tsx` — the card face; `components/LiveArt.tsx` plays footage in the art window
- `components/CardVariants.tsx` — six alternative card designs to compare in Storybook ("Card variations"); not used by the arcade yet
- `components/BoardCard.tsx` — four more card designs in a board-game style, with one shared color treatment for all footage (Storybook, "Card variations/Round 2"); not used by the arcade yet
- `components/WindowSeatShowcase.tsx` — Wonder Lens's full-screen viewfinder
- `lib/apps.ts` — the app data. Set each app's `rarity` (`common` | `rare` | `holo` |
  `legendary`) and point `link` at the real app URL so the LAUNCH button works.
  Optional fields make a card specific to its app: `live` (footage for the art
  window), `move` and `traits` (the card's text box: an attack line and two
  short lines, each with a symbol), `facts` (counts shown in the full-screen
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
- `prototypes/` — the original standalone HTML explorations (reference only; not part of the build)

## Deploy (Vercel)

This is a zero-config Next.js app — Vercel auto-detects it.

```bash
npx vercel          # preview deploy
npx vercel --prod   # production deploy
```

Then point `byebrianwong.com` at this project in the Vercel dashboard
(Project → Settings → Domains). The domain currently serves a different project,
so you'll move it over there.
