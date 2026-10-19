// Little One Percentile: read the growth chart by pointing at it, then pin a
// point and drag it. The reel also looks up an age and percentile from the
// side panel, saves the pinned point as a measurement and adds a second one.
//
// The site is static and keeps measurements in the browser's local storage,
// which starts empty in each recording's fresh browser, so nothing is sent
// anywhere. Headless Chromium's language is not en-US, so the app would pick
// kg and cm; the URL asks for lb and in.

import { clickOn, showPointer } from '../pointer.mjs';

const SITE = 'https://little-one-percentile.vercel.app';
const CHART = 'section[aria-label="Growth chart"]';
const PLOT = `${CHART} svg rect[fill="transparent"]`;

/** A spot on the plot, as fractions of its width (age) and of its height from the top. */
async function spot(page, fx, fy) {
  const b = await page.locator(PLOT).boundingBox();
  return [b.x + fx * b.width, b.y + fy * b.height];
}

/** Move the pointer to a spot on the plot in a smooth line. */
async function moveTo(page, fx, fy, steps = 24) {
  const [x, y] = await spot(page, fx, fy);
  await page.mouse.move(x, y, { steps });
}

/** Sweep the pointer through spots on the plot, pausing at each to read it. */
async function sweep(page, spots, pause = 420) {
  for (const [fx, fy] of spots) {
    await moveTo(page, fx, fy, 20);
    await page.waitForTimeout(pause);
  }
}

/** Press on the plot to pin a point there, then drag it to a second spot. */
async function pinAndDrag(page, from, to, mark, labels) {
  await moveTo(page, ...from, 18);
  await page.waitForTimeout(250);
  if (labels.pin) mark(...labels.pin);
  await page.mouse.down();
  await page.waitForTimeout(900);
  if (labels.drag) mark(...labels.drag);
  await moveTo(page, ...to, 40);
  await page.waitForTimeout(300);
  await page.mouse.up();
}

/** Scroll smoothly so `locator` sits `offset` px below the top of the window. */
async function scrollTo(page, locator, offset = 0, wait = 900) {
  await locator.evaluate((el, off) => {
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - off, behavior: 'smooth' });
  }, offset);
  await page.waitForTimeout(wait);
}

export default {
  url: `${SITE}/?units=imperial`,
  takes: {
    card: {
      viewport: { width: 720, height: 540 },
      size: '480:360',
      crf: 27,
      setup: showPointer,
      // Just the chart and the sentence above it, filling the window.
      css: `
        html { overflow: hidden; }
        ${CHART} { position: fixed; inset: 0; z-index: 40; border: 0; border-radius: 0; padding: 22px 24px; }
        ${CHART} > :first-child, ${CHART} > :nth-child(n+4) { display: none; }
      `,
      async prepare(page) {
        await page.locator(PLOT).waitFor();
        await page.waitForTimeout(400);
        await page.mouse.move(700, 530);
      },
      async steps(page, mark) {
        await page.waitForTimeout(900);
        mark('POINT TO READ', 'Age, weight and percentile');
        await sweep(page, [[0.12, 0.66], [0.3, 0.52], [0.52, 0.6], [0.7, 0.42]], 650);
        await pinAndDrag(page, [0.42, 0.66], [0.42, 0.5], mark, {
          pin: ['PIN A POINT', 'Tap where your baby is'],
          drag: ['DRAG TO ADJUST', 'The percentile follows'],
        });
        await page.waitForTimeout(600);
        // Off the plot, so the pinned point and its dashed line show on their own.
        await page.mouse.move(700, 530, { steps: 18 });
        await page.waitForTimeout(2600);
      },
    },
    reel: {
      viewport: { width: 1280, height: 800 },
      size: '1280:800',
      crf: 26,
      setup: showPointer,
      async prepare(page) {
        await page.locator(PLOT).waitFor();
        await page.mouse.move(1120, 150);
        await page.waitForTimeout(500);
      },
      async steps(page, mark) {
        const chart = page.locator(CHART);
        const aside = page.locator('aside');

        mark('The growth chart', 'The WHO growth charts for weight, length and head size, from birth to 2 years.');
        await page.waitForTimeout(2200);
        await scrollTo(page, chart, 24, 1100);

        mark('Look up any age', 'Pick an age and a percentile to see the value. No measurements needed.');
        await clickOn(page, aside.getByRole('button', { name: '4 mo', exact: true }));
        await page.waitForTimeout(1200);
        await clickOn(page, aside.getByRole('button', { name: '25', exact: true }));
        await page.waitForTimeout(1800);

        mark('Point at the chart', 'Read the age, value and percentile anywhere, with the lines just above and below it.');
        await sweep(page, [[0.1, 0.7], [0.28, 0.5], [0.5, 0.62], [0.72, 0.4]], 600);

        // Ends near the median, so the measurement added later at 5 months
        // (15 lb 4 oz, the 51st percentile) carries on from it.
        await pinAndDrag(page, [0.36, 0.74], [0.36, 0.57], mark, {
          pin: ['Pin a point', 'Click where your baby might be, then drag it to adjust.'],
        });
        await page.mouse.move(1120, 120, { steps: 20 });
        mark('Same percentile', 'The dashed line shows where they would be if they stayed on the same percentile.');
        await page.waitForTimeout(2600);

        const save = chart.getByRole('button', { name: /Save as my baby/ });
        await scrollTo(page, save, 520, 900);
        await clickOn(page, save);
        await page.waitForTimeout(400);
        await scrollTo(page, chart, 24, 900);
        mark('Saved', 'It becomes your baby’s measurement, kept only in this browser.');
        await page.waitForTimeout(2400);

        const add = aside.getByRole('button', { name: '+ Add a measurement' });
        await scrollTo(page, add, 260, 1000);
        mark('Add measurements', 'Enter the numbers from a checkup. Each one gets its percentile.');
        await clickOn(page, add);
        await page.waitForTimeout(500);
        // The side panel's age slider is also labelled "Age", so look only in the form.
        const form = aside.locator('form');
        await form.getByLabel('Age', { exact: true }).pressSequentially('5', { delay: 140 });
        await form.getByLabel('Age unit').selectOption('months');
        await page.waitForTimeout(400);
        await clickOn(page, form.getByLabel('Pounds'));
        await page.keyboard.type('15', { delay: 140 });
        await clickOn(page, form.getByLabel('Ounces'));
        await page.keyboard.type('4', { delay: 140 });
        await page.waitForTimeout(500);
        await clickOn(page, form.getByRole('button', { name: 'Save', exact: true }));
        await page.waitForTimeout(500);
        await scrollTo(page, chart, 24, 1000);
        await page.mouse.move(1120, 120, { steps: 16 });
        await page.waitForTimeout(2600);
      },
    },
  },
};
