import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { APPS, type AppCard } from '@/lib/apps';
import { Card } from './Card';
import { CARD_VARIANTS, CardVariant, type CardVariantId } from './CardVariants';

// One app per rarity, picked by rarity rather than by id so these stories
// survive changes to the app list (the same approach as Card.stories).
const RARITIES: AppCard['rarity'][] = ['legendary', 'holo', 'rare', 'common'];
const samples = RARITIES.map((r) => APPS.find((a) => a.rarity === r)).filter((a): a is AppCard => !!a);

function Row({ variant, apps = samples, playing = false }: { variant: CardVariantId; apps?: AppCard[]; playing?: boolean }) {
  const v = CARD_VARIANTS.find((x) => x.id === variant)!;
  const light = variant === 'field' || variant === 'riso';
  return (
    <section style={{ background: v.backdrop, padding: '28px 32px 40px' }}>
      <h2
        style={{
          margin: '0 0 4px',
          font: '700 18px/1.2 system-ui, sans-serif',
          color: light ? '#1c1a16' : '#fff',
        }}
      >
        {v.name}
      </h2>
      <p style={{ margin: '0 0 24px', maxWidth: 640, font: '14px/1.4 system-ui, sans-serif', color: light ? '#4a463c' : '#c9ccd6' }}>
        {v.note}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
        {apps.map((app) => (
          <CardVariant key={app.id} app={app} variant={variant} playing={playing} />
        ))}
      </div>
    </section>
  );
}

/**
 * Six alternative designs for the app card, each shown on one app of every
 * rarity. They keep the trading-card parts of the current card (name and HP,
 * real footage, a move, two traits, a rarity mark, a set number) in six
 * different visual directions. Footage is held on its poster frame so the
 * snapshots are stable.
 */
const meta = {
  title: 'Card variations/Round 1',
  component: CardVariant,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: { app: samples[0], variant: 'stock' },
} satisfies Meta<typeof CardVariant>;

export default meta;
type Story = StoryObj<typeof meta>;

const rowStory = (variant: CardVariantId): Story => ({
  render: () => <Row variant={variant} />,
  play: async ({ canvas }) => {
    for (const app of samples) await expect(canvas.getAllByText(app.name)[0]).toBeVisible();
  },
});

export const CardStock = rowStory('stock');
export const SportsCard = rowStory('sports');
export const FieldGuide = rowStory('field');
export const NightMode = rowStory('night');
export const RisoPrint = rowStory('riso');
export const Handheld = rowStory('handheld');

/** All six, plus the current card at the top for comparison. */
export const AllSideBySide: Story = {
  render: () => (
    <div>
      <section style={{ background: '#3b2a8f', padding: '28px 32px 40px' }}>
        <style>{`
          .cv-current .card { opacity: 1 !important; animation: none !important; }
          .cv-current .float, .cv-current .ring, .cv-current .r-legendary .front::before { animation: none !important; }
        `}</style>
        <h2 style={{ margin: '0 0 24px', font: '700 18px/1.2 system-ui, sans-serif', color: '#fff' }}>Current card</h2>
        <div className="cv-current" style={{ display: 'flex', flexWrap: 'wrap', gap: 28, ['--cz' as string]: 1.28 }}>
          {samples.map((app) => (
            <Card key={app.id} app={app} playing={false} />
          ))}
        </div>
      </section>
      {CARD_VARIANTS.map((v) => (
        <Row key={v.id} variant={v.id} />
      ))}
    </div>
  ),
};

/** Every variation with its footage running. Not snapshotted: video frames differ each run. */
export const Playing: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  render: () => (
    <div>
      {CARD_VARIANTS.map((v) => (
        <Row key={v.id} variant={v.id} playing />
      ))}
    </div>
  ),
};

/** One card with every knob in the Controls panel: pick an app and a design. */
export const Playground: Story = {
  args: { app: samples[0], variant: 'stock', playing: false },
  argTypes: {
    variant: { control: 'select', options: CARD_VARIANTS.map((v) => v.id) },
    app: {
      control: 'select',
      options: APPS.map((a) => a.id),
      mapping: Object.fromEntries(APPS.map((a) => [a.id, a])),
    },
  },
  parameters: { layout: 'centered' },
};
