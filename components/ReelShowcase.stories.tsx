import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { APPS } from '@/lib/apps';
import ReelShowcase from './ReelShowcase';

const app = APPS.find((a) => a.showcase === 'reel')!;

/**
 * The full-screen view for an app with a recorded walkthrough: a browser
 * window playing the real app, and the walkthrough's chapters beside it. The
 * footage lives in public/cards/<app>/ and was recorded by
 * scripts/footage/web/record.mjs. Video makes it a poor visual baseline, so it
 * stays out of Chromatic.
 */
const meta = {
  component: ReelShowcase,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen', chromatic: { disableSnapshot: true } },
  args: { app, origin: null, onClose: fn() },
} satisfies Meta<typeof ReelShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every chapter is listed, and clicking one makes it the current chapter. */
export const JumpToChapter: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const chapters = canvas.getAllByRole('button').filter((b) => b.closest('.rs-chapters'));
    await expect(chapters).toHaveLength(args.app.reel!.chapters.length);
    const last = chapters[chapters.length - 1];
    await userEvent.click(last);
    await waitFor(() => expect(last).toHaveAttribute('aria-current', 'true'), { timeout: 3000 });
  },
};

/** The close button calls `onClose` (Esc is handled by the arcade). */
export const Close: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /esc/i }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};
