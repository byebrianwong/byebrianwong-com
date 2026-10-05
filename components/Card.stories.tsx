import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor } from 'storybook/test';
import { APPS, type AppCard } from '@/lib/apps';
import { Card } from './Card';

// Pick a representative app per rarity, so these stories survive app-data
// churn: the specific apps (ids/names) change often, but the four rarities are
// fixed by the `Rarity` type and always present in the set. Cards with footage
// are left out here and get their own story, so video never lands in these
// baselines. When every app of a rarity has footage, a card without footage
// is shown with that rarity instead.
const sample = (rarity: AppCard['rarity']): AppCard =>
  APPS.find((a) => a.rarity === rarity && !a.live) ?? { ...APPS.find((a) => !a.live)!, rarity };
const liveApp = APPS.find((a) => a.live && (a.live.style ?? 'viewfinder') === 'viewfinder')!;
const webApp = APPS.find((a) => a.live?.style === 'tags')!;

/**
 * A single holographic trading card, rendered in isolation. Unlike the `Arcade`
 * flow stories, these don't drive any animation — each is a stable, directly
 * inspectable variant, which is exactly what Chromatic baselines against.
 */
const meta = {
  component: Card,
  tags: ['ai-generated'],
  parameters: { layout: 'centered' },
  // A default app so every story has a card; per-rarity stories override it.
  args: { app: sample('legendary'), revealed: true, seen: true },
  // The `.card` starts at opacity:0 and only settles to opacity:1 via the
  // `dealIn` entrance animation (meant for the arcade's deal-in). In isolation
  // we want the settled, static card — deterministic for Chromatic snapshots and
  // immediately visible to assertions — so neutralize the entrance + idle loops.
  decorators: [
    (Story) => (
      <>
        <style>{`
          .card { opacity: 1 !important; animation: none !important; }
          .float, .ring, .r-legendary .front::before { animation: none !important; }
        `}</style>
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ---- one story per rarity (the stable visual baselines) ---- */

export const Common: Story = { args: { app: sample('common') } };
export const Rare: Story = { args: { app: sample('rare') } };
export const Holo: Story = { args: { app: sample('holo') } };

export const Legendary: Story = {
  args: { app: sample('legendary') },
  play: async ({ canvas, args }) => {
    // Identity + rarity treatment are driven entirely by the `app` prop.
    await expect(canvas.getByText(args.app.name)).toBeVisible();
    await expect(canvas.getByText(/LEGENDARY/)).toBeVisible();
  },
};

/**
 * A card with real footage in its art window (Wonder Lens's gameplay), a
 * viewfinder on top, and the app's move and traits in the text box. Held on
 * its poster frame so the snapshot is stable.
 */
export const LiveFootage: Story = {
  args: { app: liveApp, playing: false },
  play: async ({ canvas, canvasElement, args }) => {
    await expect(canvas.getByText(args.app.name)).toBeVisible();
    const video = canvasElement.querySelector<HTMLVideoElement>('.live video')!;
    await expect(video.getAttribute('poster')).toBe(args.app.live!.poster);
    await expect(canvas.getByText(args.app.move!.name)).toBeVisible();
    for (const t of args.app.traits!) await expect(canvas.getByText(t.text)).toBeVisible();
  },
};

/**
 * A web app's card: a recording of the real app under a thin browser bar with
 * its address, and a label for each step of the recording. Held on its poster
 * frame so the snapshot is stable.
 */
export const WebAppFootage: Story = {
  args: { app: webApp, playing: false },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText(args.app.live!.url!)).toBeVisible();
    // The label pops in with a short animation.
    await waitFor(() => expect(canvas.getByText(args.app.live!.moments[0].name)).toBeVisible());
  },
};

/** The same card with its footage running: it takes a photo at each scored moment. */
export const LiveFootagePlaying: Story = {
  args: { app: liveApp, playing: true },
  parameters: { chromatic: { disableSnapshot: true } },
};

/** The foil back shown before a card is flipped face-up. */
export const FaceDown: Story = {
  args: { app: sample('legendary'), revealed: false },
  play: async ({ canvasElement }) => {
    // `revealed={false}` must drop the class that flips the card face-up.
    const card = canvasElement.querySelector<HTMLElement>('.card')!;
    expect(card).not.toHaveClass('revealed');
  },
};

/** Every card in the set at once — a quick overview for visual review. */
export const Gallery: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 32,
        justifyContent: 'center',
        padding: 40,
      }}
    >
      {APPS.map((app) => (
        <Card key={app.id} app={app} playing={false} />
      ))}
    </div>
  ),
};

/* ---- fully controllable playground ---- */

interface PlaygroundArgs {
  name: string;
  rarity: AppCard['rarity'];
  type: string;
  icon: string;
  hp: number;
  tagline: string;
  accent: string;
  moveName: string;
  moveText: string;
  trait1: string;
  trait2: string;
  revealed: boolean;
}

/**
 * Tweak rarity, HP, accent color, icon, move, and traits live from the Controls panel
 * to see how a card responds — the discrete knobs the monolithic flow couldn't
 * expose.
 */
export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    name: 'Regibee',
    rarity: 'legendary',
    type: 'Registry',
    icon: '🐝',
    hp: 150,
    tagline: 'Universal gift registry',
    accent: '#f59e0b',
    moveName: 'POLLINATE',
    moveText: 'Pull gifts from any store into one list.',
    trait1: 'Weddings, baby showers and more',
    trait2: 'One registry for every occasion',
    revealed: true,
  },
  argTypes: {
    rarity: {
      control: 'select',
      options: ['common', 'rare', 'holo', 'legendary'],
    },
    hp: { control: { type: 'range', min: 10, max: 200, step: 5 } },
    accent: { control: 'color' },
    name: { control: 'text' },
    type: { control: 'text' },
    icon: { control: 'text' },
    tagline: { control: 'text' },
    moveName: { control: 'text' },
    moveText: { control: 'text' },
    trait1: { control: 'text' },
    trait2: { control: 'text' },
    revealed: { control: 'boolean' },
  },
  render: (a) => (
    <Card
      revealed={a.revealed}
      app={{
        id: 'playground',
        name: a.name,
        tagline: a.tagline,
        type: a.type,
        icon: a.icon,
        year: 2025,
        accent: a.accent,
        hp: a.hp,
        rarity: a.rarity,
        link: '#',
        stats: { users: '—', rating: '—', platform: 'Web' },
        blurb: '',
        move: { name: a.moveName, text: a.moveText },
        traits: [
          { icon: '💍', text: a.trait1 },
          { icon: '🎁', text: a.trait2 },
        ],
      }}
    />
  ),
};
