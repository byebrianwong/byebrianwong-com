import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { useRef } from 'react';
import { APPS } from '@/lib/apps';
import { Booster, type BoosterHandle } from './Booster';

/**
 * The sealed booster pack the site lands on, built from CSS 3D faces. In the
 * app, `Arcade` owns it: a click calls `onRip`, and `Arcade` then plays the
 * opening through the pack's `rip()` handle. These stories show the pack on its
 * own.
 */
const meta = {
  component: Booster,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: { onRip: fn() },
} satisfies Meta<typeof Booster>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The pack at rest. The sway, ray spin and gloss are CSS animations, which
 * Chromatic resets to their first frame, so this is a stable baseline.
 */
export const Sealed: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const pack = canvas.getByRole('button', { name: /rip open the booster pack/i });
    await expect(pack).toHaveAccessibleName(new RegExp(`${APPS.length} app cards`));
    await userEvent.click(pack);
    await expect(args.onRip).toHaveBeenCalledOnce();
  },
};

/**
 * The full opening, triggered the way `Arcade` does it: charge and shake, a
 * seam of light along the tear line, then the strip flies off and light pours
 * out. Click the pack to play it again from the start (reload the story).
 */
export const Opening: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  render: function Render() {
    const ref = useRef<BoosterHandle>(null);
    return <Booster ref={ref} onRip={() => ref.current?.rip(() => {})} />;
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /rip open the booster pack/i }));
    await waitFor(
      () => expect(canvasElement.querySelector('.booster-stage')).toHaveAttribute('data-state', 'burst'),
      { timeout: 4000 },
    );
  },
};
