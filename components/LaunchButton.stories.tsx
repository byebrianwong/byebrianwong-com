import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { APPS } from '@/lib/apps';
import LaunchButton from './LaunchButton';

const game = APPS.find((a) => a.game)!;
const notGame = APPS.find((a) => !a.game)!;

/**
 * The big button on every detail screen that opens the real app in a new tab.
 * It's shown here in a dark panel as wide as the detail screen's side panel.
 * The glow and the shine are CSS animations, which Chromatic pauses, so these
 * snapshots are stable.
 */
const meta = {
  component: LaunchButton,
  tags: ['ai-generated'],
  parameters: { layout: 'centered' },
  args: { app: game },
  decorators: [
    (Story) => (
      <div style={{ width: 320, padding: '20px 24px 28px', background: '#11142a', borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LaunchButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A game says PLAY. */
export const Play: Story = {
  args: { app: game },
  play: async ({ canvas, args }) => {
    const link = canvas.getByRole('link', { name: new RegExp(`^play ${args.app.name}`, 'i') });
    await expect(link).toHaveTextContent('PLAY');
    await expect(link).toHaveAttribute('href', args.app.link);
    await expect(link).toHaveAttribute('target', '_blank');
  },
};

/** Anything that isn't a game says LAUNCH. */
export const Launch: Story = {
  args: { app: notGame },
  play: async ({ canvas, args }) => {
    const link = canvas.getByRole('link', { name: new RegExp(`^launch ${args.app.name}`, 'i') });
    await expect(link).toHaveTextContent('LAUNCH');
    await expect(link).toHaveAttribute('href', args.app.link);
  },
};

/** An app whose link is "#" isn't live yet. Its button is grey and isn't a link. */
export const ComingSoon: Story = {
  args: { app: { ...notGame, link: '#' } },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText(/coming soon/i)).toBeVisible();
    await expect(canvasElement.querySelector('a')).toBeNull();
  },
};
