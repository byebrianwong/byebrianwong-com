import type { Preview } from '@storybook/nextjs-vite'
// The app styles itself entirely through this global stylesheet (class names +
// `data-phase` gating). Importing it here is what lets stories render for real.
import '../app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;