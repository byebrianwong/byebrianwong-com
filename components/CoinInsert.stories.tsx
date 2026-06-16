import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { CoinInsert } from './CoinInsert';

/**
 * `CoinInsert` is the "insert coin" flourish the arcade plays once when it boots
 * from the title screen into pack select. In the live app it lives inside
 * `Arcade` for ~1s and is gone, which makes it impossible to actually look at —
 * so these stories render the same markup in isolation: one that loops it so you
 * can watch the motion, and one you can scrub frame-by-frame to inspect the coin
 * dropping *into* the slot.
 *
 * All the styling/animation comes from the app's global stylesheet (the coin,
 * the dark recess, the gold faceplate that occludes the coin as it enters, the
 * impact flash + sparks). See the `.coinfx` block in `app/globals.css`.
 */
const meta = {
  component: CoinInsert,
  tags: ['ai-generated'],
  parameters: {
    layout: 'fullscreen',
    // Animation demos, not visual baselines: the looping story never settles and
    // the frozen frame is just a dev aid. The Card stories remain the tracked
    // Chromatic history (matching Arcade.stories.tsx).
    chromatic: { disableSnapshot: true },
  },
} satisfies Meta<typeof CoinInsert>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The animation on a loop so the whole insert reads at a glance: the coin glides
 * in from the right, spins flat onto its edge, slides into the vertical slit, and
 * the slot flashes + sparks. (Every `.coinfx` animation is 1s, so forcing
 * `infinite` restarts them all together each second.)
 */
export const Playing: Story = {
  decorators: [
    (Story) => (
      <>
        <style>{`.coinfx, .coinfx * { animation-iteration-count: infinite !important; }`}</style>
        <Story />
      </>
    ),
  ],
  play: async ({ canvasElement }) => {
    // The pieces that sell the effect are all present: the metal coin-slot plate,
    // its dark slit, and the coin that slides into it.
    await expect(canvasElement.querySelector('.coinfx .coin')).not.toBeNull();
    await expect(canvasElement.querySelector('.coinfx .slot-plate')).not.toBeNull();
    await expect(canvasElement.querySelector('.coinfx .slot-back')).not.toBeNull();
  },
};

interface FrozenArgs {
  progress: number;
}

/**
 * Pause the animation at a chosen point in its 1s timeline so you can inspect a
 * single frame — drag `progress` to scrub. Because every animation is 1s and
 * starts at 0, a negative `animation-delay` of `-progress` seconds parks them all
 * at the same fraction. ~0.3 shows the coin arriving from the side, ~0.86 lands
 * right on it sliding into the slit.
 */
export const Frozen: StoryObj<FrozenArgs> = {
  args: { progress: 0.86 },
  argTypes: {
    progress: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
  },
  render: ({ progress }) => (
    <>
      <style>{`
        .coinfx, .coinfx * {
          animation-delay: ${-progress}s !important;
          animation-play-state: paused !important;
        }
      `}</style>
      <CoinInsert />
    </>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.coinfx .coin')).not.toBeNull();
  },
};
