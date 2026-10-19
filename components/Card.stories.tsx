import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { APPS, type AppCard } from '@/lib/apps';
import { Card } from './Card';

// Pick a representative app per rarity, so these stories survive app-data
// churn: the specific apps (ids/names) change often, but the four rarities are
// fixed by the `Rarity` type and always present in the set. Every app now has
// footage, so these stories drop it and show the card's type symbol instead.
// That keeps video out of these baselines; footage has its own stories below.
const sample = (rarity: AppCard['rarity']): AppCard => ({
  ...(APPS.find((a) => a.rarity === rarity) ?? { ...APPS[0], rarity }),
  live: undefined,
});
const gameApp = APPS.find((a) => a.live && a.game)!;
const webApp = APPS.find((a) => a.live && !a.game)!;

/**
 * A single trading card, rendered in isolation. Unlike the `Arcade` flow
 * stories, these don't drive any animation — each is a stable, directly
 * inspectable variant, which is exactly what Chromatic baselines against.
 */
const meta = {
  component: Card,
  tags: ['ai-generated'],
  parameters: { layout: 'centered' },
  // A default app so every story has a card; per-rarity stories override it.
  args: { app: sample('legendary'), revealed: true },
  // The `.card` starts at opacity:0 and only settles to opacity:1 via the
  // `dealIn` entrance animation (meant for the arcade's deal-in). In isolation
  // we want the settled, static card — deterministic for Chromatic snapshots and
  // immediately visible to assertions — so neutralize the entrance + idle loops.
  decorators: [
    (Story) => (
      <>
        <style>{`
          .card { opacity: 1 !important; animation: none !important; }
          .float { animation: none !important; }
        `}</style>
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ---- one story per rarity (the stable visual baselines) ---- */

/** Common cards are plain card stock; the others get a foil border. */
export const Common: Story = { args: { app: sample('common') } };
export const Rare: Story = { args: { app: sample('rare') } };
export const Holo: Story = { args: { app: sample('holo') } };

export const Legendary: Story = {
  args: { app: sample('legendary') },
  play: async ({ canvas, args }) => {
    // Identity + rarity treatment are driven entirely by the `app` prop.
    await expect(canvas.getByText(args.app.name)).toBeVisible();
    await expect(canvas.getByTitle(/legendary/i)).toBeVisible();
    await expect(canvas.getByText(String(args.app.hp))).toBeVisible();
  },
};

/**
 * A game's card with its footage in the arched window (held on its poster
 * frame so the snapshot is stable), its move in one line, and chips saying
 * it's a web game of its type.
 */
export const GameFootage: Story = {
  args: { app: gameApp, playing: false },
  play: async ({ canvas, canvasElement, args }) => {
    await expect(canvas.getByText(args.app.name)).toBeVisible();
    const video = canvasElement.querySelector<HTMLVideoElement>('.art video')!;
    await expect(video.getAttribute('poster')).toBe(args.app.live!.poster);
    await expect(canvas.getByText(args.app.move!.text)).toBeVisible();
    await expect(canvas.getByText('Game')).toBeVisible();
    await expect(canvas.getByText(args.app.type)).toBeVisible();
  },
};

/** An app's card: the same layout, with an "App" chip instead of "Game". */
export const AppFootage: Story = {
  args: { app: webApp, playing: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('App')).toBeVisible();
    await expect(canvas.queryByText('Game')).toBeNull();
  },
};

/** The same card with its footage running. */
export const FootagePlaying: Story = {
  args: { app: gameApp, playing: true },
  parameters: { chromatic: { disableSnapshot: true } },
};

/** The back shown before a card is flipped face-up. */
export const FaceDown: Story = {
  args: { app: sample('legendary'), revealed: false },
  play: async ({ canvasElement }) => {
    // `revealed={false}` must drop the class that flips the card face-up.
    const card = canvasElement.querySelector<HTMLElement>('.card')!;
    expect(card).not.toHaveClass('revealed');
  },
};

/**
 * Every card in the set at once, three to a row like the arcade, so you can
 * see them read as one set.
 */
export const Gallery: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="cards" style={{ margin: '0 auto' }}>
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
  hp: number;
  accent: string;
  moveText: string;
  game: boolean;
  revealed: boolean;
}

/**
 * Tweak rarity, HP, accent color, type and move live from the Controls panel
 * to see how a card responds.
 */
export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    name: 'Regibee',
    rarity: 'legendary',
    type: 'Registry',
    hp: 150,
    accent: '#f59e0b',
    moveText: 'Pull gifts from any store into one list.',
    game: false,
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
    moveText: { control: 'text' },
    game: { control: 'boolean' },
    revealed: { control: 'boolean' },
  },
  render: (a) => (
    <Card
      revealed={a.revealed}
      app={{
        id: 'playground',
        name: a.name,
        tagline: 'Universal gift registry',
        type: a.type,
        icon: '🐝',
        year: 2025,
        accent: a.accent,
        hp: a.hp,
        rarity: a.rarity,
        link: '#',
        stats: { users: '—', rating: '—', platform: 'Web' },
        blurb: '',
        move: { name: 'MOVE', text: a.moveText },
        game: a.game,
      }}
    />
  ),
};
