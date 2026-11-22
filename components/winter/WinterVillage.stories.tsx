import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor } from 'storybook/test';
import { APPS } from '@/lib/apps';
import WinterVillage from './WinterVillage';
import { SPOTS } from './spots';

/** Wait until the village has either drawn itself or fallen back to the list. */
const started = (canvasElement: HTMLElement) =>
  waitFor(() => expect(canvasElement.querySelector('main.wv')!.getAttribute('data-status')).not.toBe('loading'), { timeout: 15000 });

/**
 * Make this browser refuse WebGL for one story, the way some old or locked-down
 * browsers do. The village then shows its list of buildings instead. Stories
 * that only test the page around the 3D scene use this too: the scene is
 * heavy to draw in a headless test browser, and running it in every story
 * slows the other story tests running beside these.
 */
const withoutWebGL = () => {
  const real = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
    return /webgl/i.test(type) ? null : (real as (...a: unknown[]) => unknown).call(this, type, ...rest);
  } as unknown as typeof real;
  return () => {
    HTMLCanvasElement.prototype.getContext = real;
  };
};

/** Clear the URL hash, which is where an open card lives. Stories share one document. */
const clearHash = () => window.history.replaceState(null, '', window.location.pathname + window.location.search);

const MUSIC = 'byebrianwong:music';

/**
 * Every story starts with a clean URL and the music switched off, so a click
 * in one story doesn't set the carols playing. Synthesizing them keeps the
 * test browser busy, which slows the animated stories running beside these.
 * The `Music` story switches it back on.
 */
const quietVillage = () => {
  clearHash();
  window.localStorage.setItem(MUSIC, 'off');
  return () => window.localStorage.removeItem(MUSIC);
};

/**
 * The winter village, the site's home page ("/"): a papier-mâché village
 * seen from far above where every app is a building and the log cabin is
 * About. Moving the mouse pans across it and the wheel zooms a little;
 * hovering a building tags it and clicking opens its card. Keyboard and screen
 * reader visitors get a list of every building, which appears when it gets
 * focus.
 *
 * The village is live 3D with snow falling and people skating, so these
 * stories run as tests but stay out of Chromatic. WinterCard's stories are
 * the visual history for the cards.
 */
const meta = {
  component: WinterVillage,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen', chromatic: { disableSnapshot: true } },
  beforeEach: quietVillage,
} satisfies Meta<typeof WinterVillage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The village, drawn for real (where the browser has WebGL). Every app plus the cabin is in the directory. */
export const Village: Story = {
  play: async ({ canvas, canvasElement }) => {
    await started(canvasElement);
    await waitFor(() => expect(canvas.getByRole('heading', { level: 1, name: /winter village/i })).toBeVisible());
    const nav = canvas.getByRole('navigation', { name: /places in the village/i });
    await expect(nav.querySelectorAll('button')).toHaveLength(SPOTS.length);
  },
};

/** Without WebGL the village can't be drawn, so the list of everything in it is shown instead. */
export const NoWebGL: Story = {
  beforeEach: withoutWebGL,
  play: async ({ canvas, canvasElement }) => {
    await started(canvasElement);
    await expect(canvasElement.querySelector('main.wv')).toHaveAttribute('data-status', 'failed');
    await waitFor(() => expect(canvas.getByRole('heading', { name: /can't draw the village/i })).toBeVisible());
    for (const s of SPOTS) await expect(canvas.getByRole('button', { name: new RegExp(`^${s.name}`, 'i') })).toBeVisible();
  },
};

/** Choosing a building from the list opens its card and gives it a URL; closing takes the URL back. */
export const OpenFromDirectory: Story = {
  beforeEach: withoutWebGL,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await started(canvasElement);
    const app = APPS[0];
    await userEvent.click(canvas.getByRole('button', { name: new RegExp(`^${app.name}`, 'i') }));
    const dialog = await canvas.findByRole('dialog', { name: app.name });
    await waitFor(() => expect(dialog).toBeVisible(), { timeout: 5000 });
    await expect(window.location.hash).toBe(`#/card/${app.id}`);
    await userEvent.click(canvas.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull(), { timeout: 5000 });
    await waitFor(() => expect(window.location.hash).toBe(''), { timeout: 5000 });
  },
};

/** A shared link to the cabin (`/#/about`) opens Brian's bio straight away. */
export const SharedAboutLink: Story = {
  beforeEach: () => {
    const restore = withoutWebGL();
    window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/about');
    return () => {
      restore();
      clearHash();
    };
  },
  play: async ({ canvas, canvasElement }) => {
    await started(canvasElement);
    const dialog = await canvas.findByRole('dialog', { name: /hi, i'm brian/i });
    await waitFor(() => expect(dialog).toBeVisible(), { timeout: 5000 });
  },
};

/**
 * The carols start on the visitor's first key press or click (browsers don't
 * allow sound before that), and the music button turns them off and on again.
 * Turning them off is remembered for the next visit.
 */
export const Music: Story = {
  beforeEach: () => {
    const restore = withoutWebGL();
    window.localStorage.removeItem(MUSIC);
    return () => {
      restore();
      window.localStorage.removeItem(MUSIC);
    };
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await started(canvasElement);
    await expect(canvas.getByRole('button', { name: /play music/i })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.keyboard('{Shift}');
    const off = await canvas.findByRole('button', { name: /turn the music off/i });
    await expect(off).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(off);
    await expect(canvas.getByRole('button', { name: /play music/i })).toHaveAttribute('aria-pressed', 'false');
    await expect(window.localStorage.getItem(MUSIC)).toBe('off');
  },
};
