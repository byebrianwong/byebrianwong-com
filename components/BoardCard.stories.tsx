import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { APPS, type AppCard } from '@/lib/apps';
import { BOARD_CARDS, BoardCard, type BoardCardId } from './BoardCard';

// One app per rarity, picked by rarity rather than by id so these stories
// survive changes to the app list (the same approach as Card.stories).
const RARITIES: AppCard['rarity'][] = ['legendary', 'holo', 'rare', 'common'];
const samples = RARITIES.map((r) => APPS.find((a) => a.rarity === r)).filter((a): a is AppCard => !!a);

function Section({ design, apps, playing = false }: { design: BoardCardId; apps: AppCard[]; playing?: boolean }) {
  const d = BOARD_CARDS.find((x) => x.id === design)!;
  const light = design === 'euro' || design === 'film';
  return (
    <section style={{ background: d.backdrop, padding: '28px 32px 40px' }}>
      <h2 style={{ margin: '0 0 4px', font: '700 18px/1.2 system-ui, sans-serif', color: light ? '#1c1a16' : '#fff' }}>{d.name}</h2>
      <p style={{ margin: '0 0 24px', maxWidth: 680, font: '14px/1.4 system-ui, sans-serif', color: light ? '#4a463c' : '#c9ccd6' }}>
        {d.note} Hover a card to see the footage in its real colors.
      </p>
      {/* Three to a row, like the arcade's grid, so the whole set reads together. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px 28px', maxWidth: 1032 }}>
        {apps.map((app) => (
          <BoardCard key={app.id} app={app} design={design} playing={playing} />
        ))}
      </div>
    </section>
  );
}

/**
 * Four board-game card designs: big art, little text, icons for the details.
 * Each runs every app's footage through one shared color treatment so the set
 * looks like it belongs together, and each uses a different treatment. Each
 * story shows the whole set, since how the cards sit next to each other is the
 * point. Footage is held on its poster frame so the snapshots are stable.
 */
const meta = {
  title: 'Card variations/Round 2',
  component: BoardCard,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: { app: samples[0], design: 'tabletop' },
} satisfies Meta<typeof BoardCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const setStory = (design: BoardCardId): Story => ({
  render: () => <Section design={design} apps={APPS} />,
  play: async ({ canvas }) => {
    for (const app of APPS) await expect(canvas.getByText(app.name)).toBeVisible();
  },
});

export const Tabletop = setStory('tabletop');
export const Arena = setStory('arena');
export const Euro = setStory('euro');
export const Film = setStory('film');

/** All four designs on one app of each rarity, for a quick comparison. */
export const AllFour: Story = {
  render: () => (
    <div>
      {BOARD_CARDS.map((d) => (
        <Section key={d.id} design={d.id} apps={samples} />
      ))}
    </div>
  ),
};

/** Every design with its footage running. Not snapshotted: video frames differ each run. */
export const Playing: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  render: () => (
    <div>
      {BOARD_CARDS.map((d) => (
        <Section key={d.id} design={d.id} apps={APPS} playing />
      ))}
    </div>
  ),
};

/** One card with every knob in the Controls panel: pick an app and a design. */
export const Playground: Story = {
  args: { app: samples[0], design: 'tabletop', playing: false },
  argTypes: {
    design: { control: 'select', options: BOARD_CARDS.map((d) => d.id) },
    app: {
      control: 'select',
      options: APPS.map((a) => a.id),
      mapping: Object.fromEntries(APPS.map((a) => [a.id, a])),
    },
  },
  parameters: { layout: 'centered' },
};
