import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { APPS, type AppCard } from '@/lib/apps';
import WinterCard from './WinterCard';

// A card's footage is a playing video, which changes every frame. The
// snapshotted stories use apps from the data with their footage dropped, so
// they look the same on every run; `WithFootage` shows the real thing.
const plain = (app: AppCard): AppCard => ({ ...app, reel: undefined, live: undefined });
const game = APPS.find((a) => a.game)!;
const notGame = APPS.find((a) => !a.game && a.reel)!;

/**
 * The paper card that opens when you step into a building in the winter
 * village: the app's footage pinned up like a photo, what it is, and a PLAY or
 * LAUNCH button. The log cabin opens Brian's bio instead. It covers the
 * village (shown here as its sky colour) and closes on Close, Escape, or a
 * click outside the card.
 */
const meta = {
  component: WinterCard,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: { target: plain(game), onClose: fn() },
  decorators: [
    (Story) => (
      <div className="wv" style={{ position: 'relative', minHeight: 760 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WinterCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A game's card, without footage: the button says PLAY. */
export const Game: Story = {
  args: { target: plain(game) },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('dialog', { name: game.name })).toBeVisible());
    const play = canvas.getByRole('link', { name: new RegExp(`^play ${game.name}`, 'i') });
    await expect(play).toHaveAttribute('href', game.link);
    await expect(play).toHaveAttribute('target', '_blank');
    await expect(canvas.getByRole('button', { name: /close/i })).toHaveFocus();
  },
};

/** Any other app's card, without footage: the button says LAUNCH, and its numbers (if it has any) show as chips. */
export const App: Story = {
  args: { target: plain(notGame) },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: new RegExp(`^launch ${notGame.name}`, 'i') })).toHaveAttribute('href', notGame.link);
    if (notGame.facts?.length) await waitFor(() => expect(canvas.getByRole('list', { name: /by the numbers/i })).toBeVisible());
  },
};

/** With the app's real walkthrough pinned up as a photo. The video plays, so it isn't snapshotted. */
export const WithFootage: Story = {
  args: { target: notGame },
  parameters: { chromatic: { disableSnapshot: true } },
  play: async ({ canvasElement }) => {
    const video = canvasElement.querySelector('video')!;
    await expect(video).toHaveAttribute('src', notGame.reel!.video);
    await expect(video.muted).toBe(true);
  },
};

/** The log cabin: Brian's bio and a GitHub link. */
export const About: Story = {
  args: { target: 'about' },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('dialog', { name: /hi, i'm brian/i })).toBeVisible());
    await expect(canvas.getByRole('link', { name: /brian on github/i })).toHaveAttribute('href', 'https://github.com/byebrianwong');
  },
};

/** Close, Escape and a click outside the card all close it. Looks like `About`, so it isn't snapshotted. */
export const Closing: Story = {
  args: { target: 'about' },
  parameters: { chromatic: { disableSnapshot: true } },
  play: async ({ canvas, canvasElement, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /close/i }));
    await expect(args.onClose).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledTimes(2);
    await userEvent.click(canvasElement.querySelector('.wv-panel')!);
    await expect(args.onClose).toHaveBeenCalledTimes(3);
  },
};
