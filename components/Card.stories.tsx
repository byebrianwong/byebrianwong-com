import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { APPS, type AppCard } from '@/lib/apps';
import { Card } from './Card';

// Pick a representative app per rarity, so these stories survive app-data
// churn: the specific apps (ids/names) change often, but the four rarities are
// fixed by the `Rarity` type and always present in the set.
const sample = (rarity: AppCard['rarity']) => APPS.find((a) => a.rarity === rarity)!;

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
        <Card key={app.id} app={app} />
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
  rating: string;
  users: string;
  revealed: boolean;
}

/**
 * Tweak rarity, HP, accent color, icon, and copy live from the Controls panel
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
    rating: '4.9',
    users: '120K',
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
    rating: { control: 'text' },
    users: { control: 'text' },
    revealed: { control: 'boolean' },
  },
  render: (a) => (
    <Card
      revealed={a.revealed}
      app={{
        id: 'playground',
        pack: 'toolkit',
        name: a.name,
        tagline: a.tagline,
        type: a.type,
        icon: a.icon,
        year: 2025,
        accent: a.accent,
        hp: a.hp,
        rarity: a.rarity,
        link: '#',
        stats: { users: a.users, rating: a.rating, platform: 'macOS' },
        blurb: '',
      }}
    />
  ),
};
