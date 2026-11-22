import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import MusicButton from './MusicButton';

/**
 * The winter village's music switch. It sits in the bottom-right corner of
 * the village (shown here on the village's sky colour): music notes while the
 * carols play, a muted speaker otherwise.
 */
const meta = {
  component: MusicButton,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: { playing: true, onToggle: fn() },
  decorators: [
    (Story) => (
      <div className="wv" style={{ position: 'relative', height: 160 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MusicButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playing: music notes, and the button turns the music off. */
export const Playing: Story = {
  args: { playing: true },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: /turn the music off/i });
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  },
};

/** Not playing (before the first click, or turned off): a muted speaker, and the button plays music. */
export const Off: Story = {
  args: { playing: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /play music/i })).toHaveAttribute('aria-pressed', 'false');
  },
};

/** Clicking it asks the village to switch the music. Looks like `Playing`, so it isn't snapshotted. */
export const Toggling: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onToggle).toHaveBeenCalledTimes(1);
  },
};
