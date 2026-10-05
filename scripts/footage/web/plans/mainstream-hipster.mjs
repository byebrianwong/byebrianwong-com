// Mainstream Hipster: rank four TV shows from mainstream to hipster, then
// watch the reveal reorder them by real popularity data.
//
// The round is pinned so every recording plays the same four shows. ROUND is
// a real /api/round response (2026-10-05), served in place of a fresh random
// one. `rank` is the app's blended popularity: 1 is the most mainstream. The
// plan swaps Grey's Anatomy and Hunter × Hunter on purpose, so the score is
// 5 of 6 pairs and the reveal has something to reorder. The game only reads
// from its server; nothing here submits a score.

import { pointAt, showPointer } from '../pointer.mjs';

const ROUND = {
  items: [
    { id: 'rectify', name: 'Rectify', wiki: 'Rectify', category: 'tv', emoji: '🌾', signals: { imdb: 29093, wikipedia: 114482 }, rank: 0 },
    { id: 'hunter-hunter', name: 'Hunter × Hunter', wiki: 'Hunter_%C3%97_Hunter_(2011_TV_series)', category: 'tv', emoji: '🎣', signals: { imdb: 195951, wikipedia: 336012 }, rank: 0.1152360617187492 },
    { id: 'greys-anatomy', name: "Grey's Anatomy", wiki: 'Grey%27s_Anatomy', category: 'tv', emoji: '🩺', signals: { imdb: 374468, wikipedia: 3143656 }, rank: 0.5779743771863001 },
    { id: 'friends', name: 'Friends', wiki: 'Friends', category: 'tv', emoji: '📺', signals: { imdb: 1193446, wikipedia: 2160790 }, rank: 0.8702133320832676 },
  ],
};

/** The order the plan drags the shows into, left (mainstream) to right. */
const GUESS = ['Friends', 'Hunter × Hunter', "Grey's Anatomy", 'Rectify'];

/**
 * Serve the pinned round, seed the random numbers the game shuffles the cards
 * with (so they start in the same order every time), and show the pointer.
 */
async function setup(page) {
  await page.route('**/api/round**', (route) => route.fulfill({ json: ROUND }));
  await page.addInitScript(() => {
    let seed = 7;
    Math.random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  await showPointer(page);
}

const cards = (page) => page.locator('[aria-roledescription="sortable"]');

/** The shows on the board, left to right. */
async function order(page) {
  const texts = await cards(page).allInnerTexts();
  return texts.map((t) => GUESS.find((name) => t.includes(name)));
}

/** Drag one card onto the slot at `index`, the way a person would. */
async function drag(page, name, index) {
  const card = cards(page).filter({ hasText: name });
  await pointAt(page, card, 14);
  await page.waitForTimeout(150);
  await page.mouse.down();
  const b = await card.boundingBox();
  await page.mouse.move(b.x + b.width / 2 + 8, b.y + b.height / 2 - 6, { steps: 3 });
  await pointAt(page, cards(page).nth(index), 26);
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(650);
}

/** Drag the cards into GUESS order, fixing the leftmost wrong slot each time. */
async function rank(page) {
  for (let i = 0; i < GUESS.length; i++) {
    const now = await order(page);
    if (now[i] === GUESS[i]) continue;
    await drag(page, GUESS[i], i);
  }
}

async function openBoard(page) {
  const tv = page.getByRole('link', { name: /TV Shows/ });
  await pointAt(page, tv);
  await page.waitForTimeout(200);
  await tv.click();
  await cards(page).first().waitFor();
  await page.waitForTimeout(700);
}

async function lockIn(page) {
  const go = page.getByRole('button', { name: 'Lock in & reveal' });
  await pointAt(page, go);
  await page.waitForTimeout(200);
  await go.click();
}

export default {
  url: 'https://mainstream-hipster.vercel.app',
  takes: {
    card: {
      viewport: { width: 800, height: 600 },
      size: '480:360',
      crf: 27,
      setup,
      async prepare(page) {
        await page.goto('https://mainstream-hipster.vercel.app/play?category=tv');
        await cards(page).first().waitFor();
        await page.waitForTimeout(1200);
      },
      async steps(page, mark) {
        mark('RANK 4 SHOWS', 'Mainstream ← → hipster');
        await page.mouse.move(400, 540);
        await page.waitForTimeout(900);
        await rank(page);
        await lockIn(page);
        mark('THE REVEAL', 'IMDb + Wikipedia data');
        await page.waitForTimeout(1300);
        mark('5/6 PAIRS', 'Sharp instincts · 83%');
        await page.mouse.move(760, 590, { steps: 10 });
        await page.waitForTimeout(3600);
      },
    },
    reel: {
      viewport: { width: 1280, height: 800 },
      size: '1280:800',
      crf: 26,
      setup,
      async steps(page, mark) {
        mark('Pick a deck', 'Music, movies, TV, books, food and more. Each deck is a pool of real things.');
        await page.waitForTimeout(2200);
        await openBoard(page);
        mark('Four shows, shuffled', 'Every round deals a handful of things from the deck in a random order.');
        await page.waitForTimeout(1800);
        mark('Drag to rank', 'Most mainstream on the left, most hipster on the right. Cards restyle as they move.');
        await rank(page);
        await page.waitForTimeout(600);
        await lockIn(page);
        mark('Lock in', 'Your order is checked against real popularity data.');
        await page.waitForTimeout(1300);
        mark('The real ranking', 'The list reorders by IMDb ratings and Wikipedia pageviews.');
        await page.mouse.move(1240, 780, { steps: 10 });
        await page.waitForTimeout(2200);
        mark('Your score', 'One point per pair in the right order: 5 of 6 here.');
        await page.waitForTimeout(3200);
      },
    },
  },
};
