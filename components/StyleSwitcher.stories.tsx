import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor, within } from 'storybook/test';
import { SITE_STYLES, STYLE_KEY } from '@/lib/siteStyle';
import StyleSwitcher from './StyleSwitcher';

/**
 * The nav button that switches the site between its styles (lib/siteStyle.ts).
 * It sits at the left of the nav cluster on every page and opens a menu with
 * one entry per style; the style you're in is ticked. The Winter Village is
 * the home page ("/"), where the nav is drawn as paper (`data-skin="winter"`);
 * the arcade lives at /arcade.
 */
const meta = {
  component: StyleSwitcher,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true, navigation: { pathname: '/arcade' } } },
  // The menu is positioned against the fixed .site-nav cluster, so stories render inside one.
  decorators: [
    (Story, { parameters }) => (
      <div style={{ minHeight: 340, background: parameters.skin === 'winter' ? '#c7cde6' : '#4c1d95' }}>
        <nav className="site-nav" data-skin={parameters.skin ?? 'arcade'}>
          <Story />
        </nav>
      </div>
    ),
  ],
  beforeEach: () => {
    window.localStorage.removeItem(STYLE_KEY);
  },
} satisfies Meta<typeof StyleSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click the palette button and check the menu says it's open. */
const openMenu = async (canvasElement: HTMLElement, userEvent: { click: (el: Element) => Promise<void> }) => {
  const button = within(canvasElement).getByRole('button', { name: /change the site's style/i });
  await userEvent.click(button);
  await expect(button).toHaveAttribute('aria-expanded', 'true');
};

/** Closed, on the arcade: just the palette button. */
export const Closed: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /change the site's style/i })).toHaveAttribute('aria-expanded', 'false');
  },
};

/** Open on the arcade: every style is listed and The App Arcade is ticked as the current page. */
export const OpenOnArcade: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await openMenu(canvasElement, userEvent);
    const links = canvas.getAllByRole('link');
    await expect(links).toHaveLength(SITE_STYLES.length);
    await expect(canvas.getByRole('link', { name: /the app arcade/i })).toHaveAttribute('aria-current', 'page');
    await expect(canvas.getByRole('link', { name: /winter village/i })).toHaveAttribute('href', '/');
    await expect(canvas.getByRole('link', { name: /the app arcade/i })).toHaveAttribute('href', '/arcade');
  },
};

/** Open in the winter village: the same menu, cut from paper, with Winter Village ticked. */
export const OpenInVillage: Story = {
  parameters: { skin: 'winter', nextjs: { appDirectory: true, navigation: { pathname: '/' } } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await openMenu(canvasElement, userEvent);
    await expect(canvas.getByRole('link', { name: /winter village/i })).toHaveAttribute('aria-current', 'page');
  },
};

/**
 * Picking the arcade from the village remembers it, so "/" opens the arcade
 * next time. Escape closes the menu.
 */
export const PickingRemembers: Story = {
  parameters: { skin: 'winter', chromatic: { disableSnapshot: true }, nextjs: { appDirectory: true, navigation: { pathname: '/' } } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(window.localStorage.getItem(STYLE_KEY)).toBeNull();
    await openMenu(canvasElement, userEvent);
    await userEvent.click(canvas.getByRole('link', { name: /the app arcade/i }));
    await waitFor(() => expect(window.localStorage.getItem(STYLE_KEY)).toBe('arcade'));
    await openMenu(canvasElement, userEvent);
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('link', { name: /the app arcade/i })).toBeNull();
    await expect(canvas.getByRole('button', { name: /change the site's style/i })).toHaveFocus();
  },
};
