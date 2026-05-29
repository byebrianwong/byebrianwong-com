# byebrianwong.com — The App Arcade

A booster-pack arcade portfolio. Pick a pack, rip it open, and the app cards flip
out — rarest last, with holographic foil, an "on fire" hover, arcade sound, and a
click-to-inspect detail view.

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
- `components/Arcade.tsx` — the full arcade experience (title → pack select → rip → reveal → inspect)
- `lib/apps.ts` — the apps + packs data. **Swap these for real apps.** Set each app's
  `pack` (`toolkit` | `arcade`) and `rarity` (`common` | `rare` | `holo` | `legendary`);
  point `link` at the real app URL so the LAUNCH button works.
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
