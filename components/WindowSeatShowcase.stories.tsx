import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { APPS } from '@/lib/apps';
import WindowSeatShowcase from './WindowSeatShowcase';

const app = APPS.find((a) => a.showcase === 'window-seat')!;

/**
 * Wonder Lens's full-screen view: the card's art window opened up into the
 * game's viewfinder. It plays real gameplay from public/cards/window-seat/,
 * names whoever is under the reticle, and scores each photo you take with the
 * points the game gave that frame. A playing video changes every frame, so
 * most stories stay out of Chromatic. `Opened` pauses it on its first frame
 * first, so Chromatic snapshots it.
 */
const meta = {
  component: WindowSeatShowcase,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen', chromatic: { disableSnapshot: true } },
  args: { app, origin: null, onClose: fn() },
} satisfies Meta<typeof WindowSeatShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * What you see when you open the Wonder Lens card: the viewfinder, and beside
 * it the PLAY button that opens the real game. The footage is paused on its
 * first frame, and the story waits until the view has caught up (an empty
 * progress bar) and every CSS transition has finished. After that it looks the
 * same on every run, so Chromatic snapshots it.
 */
export const Opened: Story = {
  parameters: { chromatic: { disableSnapshot: false } },
  play: async ({ canvas, canvasElement, args }) => {
    // The reels load from public/; the viewfinder shows the first world once they do.
    const video = await waitFor(
      () => {
        const v = canvasElement.querySelector<HTMLVideoElement>('.sc-vf video');
        expect(v).not.toBeNull();
        return v!;
      },
      { timeout: 5000 },
    );
    video.pause();
    video.currentTime = 0;
    await waitFor(() =>
      expect(canvasElement.querySelector<HTMLElement>('.sc-progress span')!.style.transform).toBe('scaleX(0)'),
    );
    await waitFor(() =>
      expect(document.getAnimations().filter((a) => a instanceof CSSTransition && a.playState === 'running')).toHaveLength(0),
    );

    const play = canvas.getByRole('link', { name: new RegExp(`^play ${args.app.name}`, 'i') });
    // The side panel fades in.
    await waitFor(() => expect(play).toBeVisible());
    await expect(play).toHaveAttribute('href', args.app.link);
  },
};

/** Taking a photo uses a frame of film, and the scored photo pops up as a polaroid. */
export const TakeAPhoto: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    // The reels load from public/; the viewfinder shows the first world once they do.
    await waitFor(() => expect(canvasElement.querySelector('.sc-vf video')).not.toBeNull(), {
      timeout: 5000,
    });
    await expect(canvasElement.querySelector('.sc-film')).toHaveTextContent('24');
    await userEvent.click(canvas.getByRole('button', { name: 'Take a photo' }));
    await expect(canvasElement.querySelector('.sc-film')).toHaveTextContent('23');
    await expect(canvasElement.querySelector('.sc-pop')).not.toBeNull();
  },
};

/** The number keys, or the world buttons, switch between the three worlds. */
export const SwitchWorld: Story = {
  play: async ({ canvas, userEvent }) => {
    const anderson = await waitFor(() => canvas.getByRole('button', { name: /zubrowka express/i }), {
      timeout: 5000,
    });
    await userEvent.click(anderson);
    await expect(anderson).toHaveAttribute('aria-pressed', 'true');
  },
};

/** Esc is handled by the arcade; the close button and the backdrop call `onClose`. */
export const Close: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /esc/i }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};
