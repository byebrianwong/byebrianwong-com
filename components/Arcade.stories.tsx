import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor } from 'storybook/test';
import Arcade from './Arcade';
import { APPS } from '@/lib/apps';
import { Sound } from '@/lib/sound';

// Pick apps from data rather than hard-coding names, so a future change to
// lib/apps.ts doesn't break these flow tests. A "plain" app opens the standard
// inspect modal; a showcase app opens its own full-screen view.
const plainApp = APPS.find((a) => !a.showcase && !a.game)!;
const plainGame = APPS.find((a) => !a.showcase && a.game)!;
const showcaseApp = APPS.find((a) => a.showcase === 'window-seat')!;
const reelApp = APPS.find((a) => a.showcase === 'reel')!;

const rip = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLButtonElement>('.booster')!;

/** Wait until every card has landed face-up. */
const allRevealed = (canvasElement: HTMLElement) =>
  waitFor(
    () =>
      expect(canvasElement.querySelectorAll('.cards .card.revealed')).toHaveLength(
        APPS.length,
      ),
    { timeout: 8000 },
  );

/**
 * `Arcade` is the whole portfolio experience: one client component with three
 * screens. The sealed booster pack (the landing), the opening animation, and
 * the grid of every app card, plus an inspect view per card. It takes no props,
 * so each story is a different point in that flow reached through a `play`
 * interaction. All styling comes from the app's global stylesheet (imported
 * once in `.storybook/preview.tsx`).
 */
const meta = {
  component: Arcade,
  tags: ['ai-generated'],
  // Every screen writes a hash to the URL so the browser back button walks the
  // flow. Stories share one document, so a previous story's hash would boot the
  // next one straight into the cards. Reset the URL (and the depth marker the
  // component stamps into `history.state`) before each play.
  beforeEach: () => {
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search,
    );
  },
  parameters: {
    layout: 'fullscreen',
    // These are interaction tests: each story clicks through the flow and ends
    // in an animated, non-deterministic state (particle bursts, video, the
    // sound singleton). They run as vitest browser tests but make poor visual
    // baselines, so the whole file stays out of Chromatic. The Card and
    // Booster stories are the tracked visual history.
    chromatic: { disableSnapshot: true },
  },
} satisfies Meta<typeof Arcade>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The landing: one sealed booster pack and nothing else. The cards are in the DOM but hidden. */
export const SealedPack: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole('button', { name: /rip open the booster pack/i }),
    ).toBeVisible();
    await expect(canvasElement.querySelector('.reveal')!).not.toBeVisible();
  },
};

/**
 * Clicking the pack plays the opening (charge, tear, burst) and every card
 * flies out of it into the grid, flipping face-up as it lands. All apps come
 * out of the one pack.
 */
export const RipThePack: Story = {
  play: async ({ canvasElement, userEvent }) => {
    await userEvent.click(rip(canvasElement));
    await expect(window.location.hash).toBe('#/cards');
    await allRevealed(canvasElement);
    // Once the deal is over the pack is gone.
    await waitFor(() => expect(canvasElement.querySelector('.booster')).toBeNull(), {
      timeout: 4000,
    });
  },
};

/**
 * Clicking a card without a showcase opens the standard inspect modal, with the
 * app's blurb, stat rows and launch button.
 */
export const InspectCard: Story = {
  play: async ({ canvasElement, userEvent }) => {
    await userEvent.click(rip(canvasElement));
    await allRevealed(canvasElement);
    await userEvent.click(
      canvasElement.querySelector<HTMLElement>(`.cards .card[data-app="${plainApp.id}"]`)!,
    );
    await waitFor(
      () => expect(canvasElement.querySelector('.inspect')).toHaveClass('on'),
      { timeout: 4000 },
    );
    const launch = canvasElement.querySelector('.inspect .launch')!;
    await expect(launch).toBeVisible();
    await expect(launch).toHaveTextContent('LAUNCH');
    await expect(window.location.hash).toBe(`#/card/${plainApp.id}`);
  },
};

/** A game's inspect modal says PLAY instead of LAUNCH. */
export const InspectGame: Story = {
  beforeEach: () => {
    window.location.hash = '#/cards';
  },
  play: async ({ canvasElement, userEvent }) => {
    await allRevealed(canvasElement);
    await userEvent.click(
      canvasElement.querySelector<HTMLElement>(`.cards .card[data-app="${plainGame.id}"]`)!,
    );
    await waitFor(
      () => expect(canvasElement.querySelector('.inspect')).toHaveClass('on'),
      { timeout: 4000 },
    );
    const play = canvasElement.querySelector('.inspect .launch')!;
    await expect(play).toBeVisible();
    await expect(play).toHaveTextContent('PLAY');
    await expect(play).not.toHaveTextContent('LAUNCH');
    await expect(play).toHaveAttribute('href', plainGame.link);
  },
};

/**
 * A card with a showcase opens its own full-screen view instead: for Window
 * Seat, the game's viewfinder with a working shutter.
 */
export const OpenShowcase: Story = {
  beforeEach: () => {
    window.location.hash = '#/cards';
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await allRevealed(canvasElement);
    await userEvent.click(
      canvasElement.querySelector<HTMLElement>(`.cards .card[data-app="${showcaseApp.id}"]`)!,
    );
    await waitFor(() => expect(canvas.getByRole('dialog')).toBeVisible(), { timeout: 4000 });
    await expect(canvas.getByRole('button', { name: 'Take a photo' })).toBeVisible();
    await expect(window.location.hash).toBe(`#/card/${showcaseApp.id}`);
    // The standard modal stays closed.
    await expect(canvasElement.querySelector('.inspect')).not.toHaveClass('on');
  },
};

/** A card with a recorded walkthrough opens it full screen, in a browser window with chapters. */
export const OpenReel: Story = {
  beforeEach: () => {
    window.location.hash = '#/cards';
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await allRevealed(canvasElement);
    await userEvent.click(
      canvasElement.querySelector<HTMLElement>(`.cards .card[data-app="${reelApp.id}"]`)!,
    );
    await waitFor(() => expect(canvas.getByRole('dialog')).toBeVisible(), { timeout: 4000 });
    // The side panel slides in.
    await waitFor(() => expect(canvas.getByRole('list', { name: 'Walkthrough' })).toBeVisible());
    await expect(window.location.hash).toBe(`#/card/${reelApp.id}`);
  },
};

/**
 * The browser back button walks back through the flow instead of leaving the
 * site: back from the cards reseals the pack.
 */
export const BackButtonNavigation: Story = {
  play: async ({ canvasElement, userEvent }) => {
    await userEvent.click(rip(canvasElement));
    await allRevealed(canvasElement);
    await expect(window.location.hash).toBe('#/cards');

    // Wait for the URL first. The pack from the opening can still be on screen
    // for a moment after the deal, so "the pack is visible" alone can pass
    // before back has happened.
    window.history.back();
    await waitFor(() => expect(window.location.hash).toBe(''), { timeout: 5000 });
    await waitFor(() => expect(rip(canvasElement)).toBeVisible(), { timeout: 5000 });
  },
};

/**
 * The inspect view is a screen of its own, so back closes it and leaves you on
 * the cards rather than resealing the pack.
 */
export const BackClosesInspect: Story = {
  play: async ({ canvasElement, userEvent }) => {
    await userEvent.click(rip(canvasElement));
    await allRevealed(canvasElement);
    await userEvent.click(
      canvasElement.querySelector<HTMLElement>(`.cards .card[data-app="${plainApp.id}"]`)!,
    );
    await waitFor(
      () => expect(canvasElement.querySelector('.inspect')).toHaveClass('on'),
      { timeout: 4000 },
    );

    window.history.back();
    await waitFor(
      () => expect(canvasElement.querySelector('.inspect')).not.toHaveClass('on'),
      { timeout: 4000 },
    );
    await expect(window.location.hash).toBe('#/cards');
  },
};

/**
 * Loading the cards URL directly (a reload, or a shared link) shows every card
 * face-up straight away, with no opening to sit through. There's no arcade
 * entry behind a cold landing like this, so the reseal button steps back to
 * the pack in place instead of bouncing the visitor off the site.
 */
export const DeepLinkToCards: Story = {
  beforeEach: () => {
    window.location.hash = '#/cards';
  },
  play: async ({ canvasElement, userEvent }) => {
    await allRevealed(canvasElement);
    await expect(canvasElement.querySelector('.booster')).toBeNull();

    await userEvent.click(canvasElement.querySelector('.back')!);
    await waitFor(() => expect(rip(canvasElement)).toBeVisible(), { timeout: 5000 });
    await expect(window.location.hash).toBe('');
  },
};

/**
 * Links from the old two-pack layout still land somewhere sensible: a card link
 * like `#/pack/<pack>/<app>` opens that card.
 */
export const OldPackLink: Story = {
  beforeEach: () => {
    window.location.hash = `#/pack/arcade/${plainApp.id}`;
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => expect(canvasElement.querySelector('.inspect')).toHaveClass('on'),
      { timeout: 4000 },
    );
    await expect(window.location.hash).toBe(`#/card/${plainApp.id}`);
  },
};

/**
 * The sound toggle reflects mute state in its label — 🔊 flips to 🔇 on click.
 */
export const SoundToggle: Story = {
  play: async ({ canvas, userEvent }) => {
    // `Sound` is a module-level singleton, so its on/off state leaks across
    // story replays in a shared browser session. Normalize it to "on" first so
    // the component (which mounts showing 🔊) toggles deterministically here.
    if (!Sound.isOn) Sound.toggle();
    const toggle = canvas.getByTitle('Toggle sound');
    await expect(toggle).toHaveTextContent('🔊');
    await userEvent.click(toggle);
    await expect(toggle).toHaveTextContent('🔇');
  },
};

/**
 * CSS smoke check — the only proof that the app's global stylesheet actually
 * loaded in Storybook. The sound toggle is painted `#ffd23f` in globals.css;
 * `toBeVisible` would pass on an unstyled button, but a resolved background
 * color won't unless the stylesheet is present.
 */
export const CssCheck: Story = {
  play: async ({ canvas }) => {
    const toggle = canvas.getByTitle('Toggle sound');
    await expect(getComputedStyle(toggle).backgroundColor).toBe(
      'rgb(255, 210, 63)',
    );
  },
};
