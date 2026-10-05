import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { APPS } from '@/lib/apps';
import ReelShowcase from './ReelShowcase';

const app = APPS.find((a) => a.showcase === 'reel')!;

/**
 * The full-screen view for an app with a recorded walkthrough: a browser
 * window playing the real app, and the walkthrough's chapters beside it. The
 * footage lives in public/cards/<app>/ and was recorded by
 * scripts/footage/web/record.mjs. A playing video changes every frame, so most
 * stories stay out of Chromatic. The PLAY and LAUNCH stories pause it on its
 * first frame first, so Chromatic snapshots them.
 */
const meta = {
  component: ReelShowcase,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen', chromatic: { disableSnapshot: true } },
  args: { app, origin: null, onClose: fn() },
} satisfies Meta<typeof ReelShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Snapshot this story in Chromatic (the file turns snapshots off). */
const snapshot = { chromatic: { disableSnapshot: false } };

/**
 * Pause the walkthrough on its first frame and wait for the view to catch up:
 * the first chapter's caption, an empty progress bar, the PAUSED badge, and
 * every CSS transition finished. After this the view looks the same on every run.
 */
const holdFirstFrame = async (canvasElement: HTMLElement) => {
  const video = canvasElement.querySelector('video')!;
  const wasPlaying = !video.paused;
  video.pause();
  video.currentTime = 0;
  // pause() only fires a 'pause' event if autoplay had already started, which
  // depends on the browser and on timing. Fire it ourselves otherwise, so the
  // view shows its PAUSED badge every time.
  if (!wasPlaying) video.dispatchEvent(new Event('pause'));
  await waitFor(() =>
    expect(canvasElement.querySelector<HTMLElement>('.sc-progress span')!.style.transform).toBe('scaleX(0)'),
  );
  await waitFor(() => expect(canvasElement.querySelector('.rs-paused')).not.toBeNull());
  await waitFor(() =>
    expect(document.getAnimations().filter((a) => a instanceof CSSTransition && a.playState === 'running')).toHaveLength(0),
  );
};

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

/** For a game, the button that opens the real app says PLAY. */
export const PlayGame: Story = {
  args: { app: APPS.find((a) => a.showcase === 'reel' && a.game)! },
  parameters: snapshot,
  play: async ({ canvas, canvasElement, args }) => {
    await holdFirstFrame(canvasElement);
    const play = canvas.getByRole('link', { name: new RegExp(`^play ${args.app.name}`, 'i') });
    // The side panel fades in.
    await waitFor(() => expect(play).toBeVisible());
    await expect(play).toHaveAttribute('href', args.app.link);
  },
};

/** For anything that isn't a game, it says LAUNCH. */
export const LaunchApp: Story = {
  args: { app: APPS.find((a) => a.showcase === 'reel' && !a.game)! },
  parameters: snapshot,
  play: async ({ canvas, canvasElement, args }) => {
    await holdFirstFrame(canvasElement);
    const launch = canvas.getByRole('link', { name: new RegExp(`^launch ${args.app.name}`, 'i') });
    await waitFor(() => expect(launch).toBeVisible());
    await expect(launch).toHaveAttribute('href', args.app.link);
  },
};

/** The close button calls `onClose` (Esc is handled by the arcade). */
export const Close: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /esc/i }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};
