import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { APPS } from '@/lib/apps';
import Inspect from './Inspect';

// The standard detail screen is for cards without a full-screen view of their
// own. Pick one game and one non-game from the data, so these stories survive
// changes to lib/apps.ts.
const game = APPS.find((a) => !a.showcase && a.game)!;
const notGame = APPS.find((a) => !a.showcase && !a.game)!;

/**
 * The detail screen you reach by clicking a card that has no full-screen view
 * of its own. None of these cards have footage, so the snapshots are stable.
 */
const meta = {
  component: Inspect,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: { app: game, onClose: fn() },
} satisfies Meta<typeof Inspect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A game's detail screen: the button under its name says PLAY. */
export const Game: Story = {
  args: { app: game },
  play: async ({ canvas }) => {
    const play = canvas.getByRole('link', { name: new RegExp(`^play ${game.name}`, 'i') });
    await expect(play).toBeVisible();
    await expect(play).toHaveAttribute('href', game.link);
  },
};

/** Any other app's detail screen: the button says LAUNCH. */
export const App: Story = {
  args: { app: notGame },
  play: async ({ canvas }) => {
    const launch = canvas.getByRole('link', { name: new RegExp(`^launch ${notGame.name}`, 'i') });
    await expect(launch).toBeVisible();
    await expect(launch).toHaveAttribute('href', notGame.link);
  },
};

/** Clicking ESC ✕ calls `onClose`. It looks the same as `Game`, so it isn't snapshotted. */
export const Close: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByText(/esc/i));
    await expect(args.onClose).toHaveBeenCalled();
  },
};
