// DoDone: type a task the way you'd say it, watch the date, priority and tag
// turn into chips, then tick it off.
//
// Recorded on DoDone's public demo (/demo), which runs the real app on sample
// data kept in the browser. Nothing is sent to DoDone's database, and a fresh
// browser always starts from the same sample tasks. The only server calls the
// demo makes are to its calendar routes, which are blocked here anyway.
//
// The typed task says "today" rather than a time: "5pm" after 5 pm means
// tomorrow, and the task would leave the Today list.

import { clickOn, pointAt, showPointer } from '../pointer.mjs';

const SITE = 'https://dodone.byebrianwong.com';
const TASK = 'Pick up the birthday cake today p1 #party';

async function setup(page) {
  await page.route('**/api/calendar/**', (route) => route.abort());
  await showPointer(page);
}

/** Scroll smoothly so `locator` sits `offset` px below the top of the window. */
async function scrollTo(page, locator, offset = 0, wait = 900) {
  await locator.evaluate((el, off) => {
    const pane = (function find(n) {
      for (; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n).overflowY;
        if ((s === 'auto' || s === 'scroll') && n.scrollHeight > n.clientHeight) return n;
      }
      return null;
    })(el.parentElement);
    const top = el.getBoundingClientRect().top - off;
    if (pane) pane.scrollBy({ top: top - pane.getBoundingClientRect().top, behavior: 'smooth' });
    else scrollBy({ top, behavior: 'smooth' });
  }, offset);
  await page.waitForTimeout(wait);
}

/** Type the task into the Today composer and add it. */
async function addTask(page, mark, labels) {
  const box = page.getByRole('textbox', { name: 'Add a task' });
  await clickOn(page, box);
  await page.waitForTimeout(300);
  mark(...labels[0]);
  await box.pressSequentially(TASK, { delay: 55 });
  await page.waitForTimeout(500);
  mark(...labels[1]);
  await page.waitForTimeout(1100);
  await clickOn(page, page.getByRole('button', { name: 'Add task' }), { steps: 14 });
  await page.locator('[data-task-row]', { hasText: 'Pick up the birthday cake' }).waitFor();
}

/** Tick off a task row, the way a person would. */
async function complete(page, name) {
  const row = page.locator('[data-task-row]', { hasText: name });
  await clickOn(page, row.getByRole('button', { name: 'Mark complete' }), { steps: 16, pause: 260 });
}

export default {
  url: `${SITE}/demo/today`,
  takes: {
    card: {
      viewport: { width: 720, height: 540 },
      size: '480:360',
      crf: 27,
      setup,
      async prepare(page) {
        await page.locator('[data-task-row]').first().waitFor();
        await page.mouse.move(600, 470);
        await page.waitForTimeout(600);
      },
      async steps(page, mark) {
        await page.waitForTimeout(500);
        await addTask(page, mark, [
          ['QUICK ADD', 'Type it the way you say it'],
          ['PARSED', 'Today · P1 · #party'],
        ]);
        await page.waitForTimeout(500);
        const row = page.locator('[data-task-row]', { hasText: 'Pick up the birthday cake' });
        mark('ADDED', 'Straight onto Today');
        await scrollTo(page, row, 150, 1200);
        await page.waitForTimeout(500);
        await complete(page, 'Pick up the birthday cake');
        mark('DONE', 'One tap to tick it off');
        await page.waitForTimeout(2600);
      },
    },
    reel: {
      viewport: { width: 1280, height: 800 },
      size: '1280:800',
      crf: 26,
      setup,
      async prepare(page) {
        await page.locator('[data-task-row]').first().waitFor();
        await page.mouse.move(1000, 700);
        await page.waitForTimeout(600);
      },
      async steps(page, mark) {
        mark('Today', "Today's meetings, anything overdue, and the tasks to focus on first.");
        await page.waitForTimeout(2600);
        await addTask(page, mark, [
          ['Quick add', 'Type a task the way you would say it.'],
          ['Parsed as you type', 'The date, priority and tag become chips before you press Enter.'],
        ]);
        await page.waitForTimeout(600);
        const row = page.locator('[data-task-row]', { hasText: 'Pick up the birthday cake' });
        await scrollTo(page, row, 260, 1200);
        await complete(page, 'Pick up the birthday cake');
        mark('Done', 'Ticking a task off plays a small burst, with an undo in case.');
        await page.waitForTimeout(2200);
        await clickOn(page, page.getByRole('button', { name: 'Dismiss' }), { steps: 14 });
        await page.waitForTimeout(400);
        await clickOn(page, page.getByRole('link', { name: 'Upcoming', exact: true }), { steps: 22 });
        await page.waitForURL('**/demo/upcoming');
        mark('Upcoming', 'The week ahead, day by day.');
        await page.mouse.move(800, 420, { steps: 16 });
        await page.waitForTimeout(2600);
        await clickOn(page, page.getByRole('link', { name: /Work/ }).first(), { steps: 20 });
        await page.waitForURL('**/demo/projects/**');
        mark('Projects', 'Tasks grouped by project, with subtasks and estimates.');
        await page.mouse.move(820, 380, { steps: 16 });
        await page.waitForTimeout(2800);
        await clickOn(page, page.getByRole('link', { name: 'Calendar', exact: true }), { steps: 20 });
        await page.waitForURL('**/demo/calendar');
        mark('Calendar', 'Tasks and meetings side by side on one calendar.');
        await page.mouse.move(820, 420, { steps: 16 });
        await page.waitForTimeout(2800);
        await pointAt(page, page.locator('main'), 10);
        await page.keyboard.press('ControlOrMeta+k');
        mark('Command palette', 'Jump anywhere or run any action from the keyboard.');
        await page.waitForTimeout(800);
        await page.keyboard.type('launch', { delay: 90 });
        await page.waitForTimeout(300);
        await page.getByText('Searching...').waitFor({ state: 'detached' });
        await page.waitForTimeout(2600);
      },
    },
  },
};
