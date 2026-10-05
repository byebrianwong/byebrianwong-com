// Saturday Boring Cereal: filter the aisle to low-sugar boxes, then open the
// one box graded S (IKEA Hjälteroll) and scroll to its nutrition label.
//
// The site is static: browsing it sends nothing back. Its type is Impact and
// Arial Narrow from the system, so record on a Mac; on Linux the fallback
// fonts change the look.

import { clickOn, showPointer } from '../pointer.mjs';

const SITE = 'https://saturdayboringcereal.byebrianwong.com';

/** Scroll smoothly so `locator` sits `offset` px below the top of the window. */
async function scrollTo(page, locator, offset = 0, wait = 900) {
  await locator.evaluate((el, off) => {
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - off, behavior: 'smooth' });
  }, offset);
  await page.waitForTimeout(wait);
}

/** Load every lazy box photo now, so none pops in on camera. */
async function loadImages(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))));
  });
}

/** The aisle, scrolled so the filter buttons sit at the top and the grid fills the rest. */
async function openAisle(page) {
  await page.goto(`${SITE}/cereals/`, { waitUntil: 'networkidle' });
  await loadImages(page);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    const bar = document.querySelector('[data-filter="low-sugar"]');
    scrollTo(0, bar.getBoundingClientRect().top + scrollY - 22);
    document.documentElement.style.scrollBehavior = '';
  });
  await page.waitForTimeout(400);
}

const lowSugar = (page) => page.locator('[data-filter="low-sugar"]');
const ikea = (page) => page.locator('.cell[data-id="ikea-hjalteroll"] a.mini');

async function openIkea(page) {
  await clickOn(page, ikea(page), { steps: 22 });
  await page.waitForURL('**/cereals/ikea-hjalteroll/');
  await loadImages(page);
}

export default {
  url: SITE,
  takes: {
    card: {
      viewport: { width: 960, height: 720 },
      size: '480:360',
      crf: 27,
      setup: showPointer,
      prepare: openAisle,
      async steps(page, mark) {
        mark('THE AISLE', '25 boxes on the shelf');
        await page.mouse.move(700, 600);
        await page.waitForTimeout(1300);
        await clickOn(page, lowSugar(page));
        mark('LOW-SUGAR', '6 boxes left');
        await page.waitForTimeout(1700);
        await openIkea(page);
        mark('GRADE S', 'The only one on the site');
        await page.mouse.move(640, 300, { steps: 14 });
        await page.waitForTimeout(2600);
        mark('THE SIDE PANEL', 'Weighed and re-typed by hand');
        await scrollTo(page, page.locator('.nf'), 40, 2800);
      },
    },
    reel: {
      viewport: { width: 1280, height: 800 },
      size: '1280:800',
      crf: 26,
      setup: showPointer,
      async prepare(page) {
        await loadImages(page);
      },
      async steps(page, mark) {
        mark('The review-a-thon', 'One reviewer walks the healthy-cereal aisle and scores every box out of ten.');
        await page.waitForTimeout(2600);
        mark('The scoreboard', 'The top nine, with protein, sugar and serving size taken off the side panel.');
        await scrollTo(page, page.getByRole('heading', { name: /scoreboard/i }), 120, 3200);
        await clickOn(page, page.locator('nav').getByRole('link', { name: /the aisle/i }).first(), { steps: 20 });
        await page.waitForURL('**/cereals/');
        await loadImages(page);
        mark('The aisle', 'Every box on one shelf, filed under everything it honestly is.');
        await page.waitForTimeout(1200);
        await scrollTo(page, lowSugar(page), 30, 1400);
        await clickOn(page, lowSugar(page));
        mark('Filter by aisle', 'Low-sugar leaves six boxes.');
        await page.waitForTimeout(2000);
        await openIkea(page);
        mark('A review', 'The taste score, an overall grade, and bars for protein, sugar and fiber.');
        await page.mouse.move(900, 330, { steps: 14 });
        await page.waitForTimeout(3000);
        mark('The label', 'The full nutrition panel, copied from the side of the box.');
        await scrollTo(page, page.locator('.nf'), 40, 3200);
      },
    },
  },
};
