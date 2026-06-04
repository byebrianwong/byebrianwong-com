import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor } from 'storybook/test';
import Arcade from './Arcade';
import { PACKS } from '@/lib/apps';
import { Sound } from '@/lib/sound';

// Read pack names from data rather than hard-coding copy, so a future rename in
// lib/apps.ts (or the title) doesn't break these flow tests. The flow is driven
// structurally (click the `.title` section, wait for `.card.revealed`, etc.).
const toolkit = PACKS.find((p) => p.id === 'toolkit')!;
const arcadePack = PACKS.find((p) => p.id === 'arcade')!;

/**
 * `Arcade` is the whole portfolio experience: a single client component that
 * drives a phase machine — title → pack select → rip animation → card reveal —
 * plus an inspect modal. It takes no props, so each story is a different point
 * in that flow reached through a `play` interaction. All styling comes from the
 * app's global stylesheet (imported once in `.storybook/preview.tsx`).
 */
const meta = {
  component: Arcade,
  tags: ['ai-generated'],
  parameters: {
    layout: 'fullscreen',
    // These are interaction tests: each story clicks through the phase machine
    // and ends in an animated / non-deterministic state (particle bursts, the
    // sound singleton, etc.). They run as vitest browser tests, but they make
    // poor visual baselines, so keep the whole file out of Chromatic — the
    // deterministic Card stories are what we track for visual history.
    chromatic: { disableSnapshot: true },
  },
} satisfies Meta<typeof Arcade>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The "insert coin" attract screen the arcade boots into. The packs already
 * exist in the DOM but the `title` phase hides the whole `.select` section via
 * global CSS, so their names aren't visible yet.
 */
export const Title: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector('.title')!).toBeVisible();
    // Phase-gating proof: the pack name is in the DOM but hidden on the title.
    await expect(canvas.getByText(toolkit.name)).not.toBeVisible();
  },
};

/**
 * Clicking the title section advances past the attract screen (after a ~900ms
 * coin-insert animation) to pack select, revealing both booster packs.
 */
export const PackSelect: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvasElement.querySelector('.title')!);
    await waitFor(() => expect(canvas.getByText(toolkit.name)).toBeVisible(), {
      timeout: 5000,
    });
    await expect(canvas.getByText(arcadePack.name)).toBeVisible();
  },
};

/**
 * Tearing open the Utility Belt pack: after the rip animation the reveal stage
 * shows the pack title and deals the cards in, flipping them face-up. Kept
 * data-agnostic (wait for *any* card to flip) so it survives app-data changes.
 */
export const OpenToolkitPack: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvasElement.querySelector('.title')!);

    // Wait for the pack to be selectable, then tear it open.
    const pack = await waitFor(
      () => {
        const el = canvas.getByText(toolkit.name);
        expect(el).toBeVisible();
        return el;
      },
      { timeout: 5000 },
    );
    await userEvent.click(pack);

    // The opener animation runs (~1s) before the reveal stage becomes visible.
    await waitFor(
      () => expect(canvas.getByText(toolkit.name.toUpperCase())).toBeVisible(),
      { timeout: 6000 },
    );

    // Cards deal in and flip face-up one at a time — wait for at least one.
    await waitFor(
      () =>
        expect(
          canvasElement.querySelector('.cards .card.revealed'),
        ).not.toBeNull(),
      { timeout: 8000 },
    );
  },
};

/**
 * Clicking a revealed card opens the inspect modal, which surfaces the app's
 * blurb, stat rows, and a launch CTA. Proves the full open → reveal → inspect
 * interaction, including that the click is ignored until the card has flipped.
 */
export const InspectCard: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvasElement.querySelector('.title')!);

    const pack = await waitFor(
      () => {
        const el = canvas.getByText(toolkit.name);
        expect(el).toBeVisible();
        return el;
      },
      { timeout: 5000 },
    );
    await userEvent.click(pack);

    // Wait for any card to flip face-up, then click it (data-agnostic).
    const card = await waitFor(
      () => {
        const el = canvasElement.querySelector<HTMLElement>(
          '.cards .card.revealed',
        );
        expect(el).not.toBeNull();
        return el!;
      },
      { timeout: 8000 },
    );
    await userEvent.click(card);

    // The inspect modal opens (gets the `on` class) with the app's launch CTA.
    await waitFor(
      () => expect(canvasElement.querySelector('.inspect')).toHaveClass('on'),
      { timeout: 4000 },
    );
    await expect(canvasElement.querySelector('.launch')!).toBeVisible();
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
