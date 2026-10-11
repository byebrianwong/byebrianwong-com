// Regibee: a guest gifts crib sheets on a baby registry, and the parents manage
// the same registry from their side.
//
// Recorded on Regibee's public demo (/demo/*), which runs the real pages on
// sample data held in the browser: "Sarah & Mike's Baby Registry". Gifting,
// adding checklist items and switching tabs only change the page; nothing is
// sent to Regibee's database. Every POST is blocked anyway, so a change to the
// demo can't start writing on camera. Don't record a real /r/<slug> registry:
// its buttons call the real server actions.
//
// The gift is the crib sheets (2 of 4 still needed), not the crib. On the demo,
// gifting the last one of an item swaps its card for "Already purchased" and
// the thank-you dialog never opens; an item with some left keeps its card.

import { clickOn, showPointer } from '../pointer.mjs';

const SITE = 'https://www.regibee.com';
const SHEETS = 'Fitted Crib Sheets (Organic Cotton)';

async function setup(page) {
  await page.route('**/*', (route) => (route.request().method() === 'POST' ? route.abort() : route.continue()));
  await showPointer(page);
}

/** Load every lazy item photo now, so none pops in on camera. */
async function loadImages(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))));
  });
}

/** The crib sheets' card on the gift-giver page. */
const sheets = (page) =>
  page
    .locator('div', { has: page.getByRole('heading', { name: SHEETS }) })
    .filter({ has: page.getByRole('button', { name: 'Gift this' }) })
    .last();

/** Jump to Nursery & Sleep from the sidebar, then gift crib sheets as a guest. */
async function giftSheets(page, mark, labels) {
  const nav = page.getByRole('navigation', { name: 'Category navigation' });
  await clickOn(page, nav.getByRole('button', { name: /Nursery & Sleep/ }), { steps: 20 });
  mark(...labels[0]);
  await page.waitForTimeout(1500);
  await clickOn(page, sheets(page).getByRole('button', { name: 'Gift this' }), { steps: 20 });
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  mark(...labels[1]);
  await page.waitForTimeout(500);
  await clickOn(page, dialog.getByLabel('Your Name'), { steps: 12 });
  await page.keyboard.type('Aunt Jo', { delay: 70 });
  await clickOn(page, dialog.getByLabel('Your Email'), { steps: 10, pause: 120 });
  await page.keyboard.type('jo@example.com', { delay: 45 });
  await page.waitForTimeout(300);
  await clickOn(page, dialog.getByRole('button', { name: 'Mark as purchased' }), { steps: 14 });
  await page.getByText('Thank you!').waitFor();
  mark(...labels[2]);
}

export default {
  url: `${SITE}/demo`,
  takes: {
    card: {
      viewport: { width: 1024, height: 768 },
      size: '480:360',
      crf: 27,
      setup,
      async prepare(page) {
        await loadImages(page);
        await page.mouse.move(820, 600);
        await page.waitForTimeout(400);
      },
      async steps(page, mark) {
        mark('THE REGISTRY', 'Gifts from any store, one link');
        await page.waitForTimeout(1800);
        await giftSheets(page, mark, [
          ['NURSERY & SLEEP', 'Six things on the list'],
          ['GIFT THIS', 'No account needed'],
          ['THANK YOU!', 'Plus where to ship it'],
        ]);
        await page.waitForTimeout(3200);
      },
    },
    reel: {
      viewport: { width: 1280, height: 800 },
      size: '1280:800',
      crf: 26,
      setup,
      async prepare(page) {
        await page.goto(SITE, { waitUntil: 'networkidle' });
        await page.mouse.move(1000, 640);
        await page.waitForTimeout(400);
      },
      async steps(page, mark) {
        mark('One registry, every store', 'Parents add gifts from any shop and share a single link.');
        await page.waitForTimeout(2400);
        await clickOn(page, page.getByRole('link', { name: 'Demo: Parent Dashboard' }), { steps: 20 });
        await page.waitForURL('**/demo/dashboard');
        await page.getByRole('button', { name: 'Manage' }).or(page.getByRole('link', { name: 'Manage' })).first().waitFor();
        mark('My registries', 'Each registry shows how many gifts are covered and who just gave.');
        await page.mouse.move(900, 400, { steps: 16 });
        await page.waitForTimeout(2200);
        await clickOn(page, page.getByRole('button', { name: 'Manage' }).or(page.getByRole('link', { name: 'Manage' })).first(), { steps: 18 });
        await page.waitForURL('**/demo/manage');
        await loadImages(page);
        mark('Manage', 'Items, gifts fulfilled, and the total value at a glance.');
        await page.waitForTimeout(2400);
        await clickOn(page, page.getByRole('tab', { name: /Gift Activity/ }), { steps: 18 });
        mark('Gift activity', 'Who gave what, with their note, so thank-yous are easy.');
        await page.mouse.move(900, 560, { steps: 16 });
        await page.waitForTimeout(2600);
        // The checklist button lives on the Items tab.
        await clickOn(page, page.getByRole('tab', { name: /Items/ }), { steps: 16 });
        await page.waitForTimeout(500);
        await clickOn(page, page.getByRole('link', { name: 'Checklist' }).or(page.getByRole('button', { name: 'Checklist' })).first(), { steps: 18 });
        await page.waitForURL('**/demo/checklist');
        await page.waitForLoadState('networkidle');
        mark('Expert checklist', 'About a hundred items new parents need, in ten categories.');
        await page.waitForTimeout(1200);
        await clickOn(page, page.getByRole('button', { name: /Nursery & Sleep/ }), { steps: 18 });
        const add = page.getByRole('button', { name: 'Add', exact: true });
        await add.first().waitFor();
        await page.waitForTimeout(700);
        await clickOn(page, add.nth(0), { steps: 18 });
        await page.waitForTimeout(700);
        await clickOn(page, add.nth(1), { steps: 12 });
        await page.waitForTimeout(1400);
        // Back to the registry, then open the guests' view in this tab rather than a new one.
        await clickOn(page, page.locator('a[href="/demo/manage"]').first(), { steps: 18 });
        await page.waitForURL('**/demo/manage');
        const preview = page.getByRole('link', { name: 'Preview' });
        await preview.evaluate((a) => a.removeAttribute('target'));
        await clickOn(page, preview, { steps: 18 });
        await page.waitForURL('**/demo');
        await loadImages(page);
        mark('What guests see', 'The registry by category, with gift funds at the top.');
        await page.mouse.move(1000, 600, { steps: 16 });
        await page.waitForTimeout(2200);
        await giftSheets(page, mark, [
          ['Browse by room', 'The sidebar jumps to each category.'],
          ['Gift it', 'Guests reserve a gift with just a name and email. No account.'],
          ['Thank you', 'The guest gets the shipping address, and the count drops so nobody overbuys.'],
        ]);
        await page.waitForTimeout(3000);
        await clickOn(page, page.getByRole('button', { name: 'Done' }), { steps: 16 });
        await page.waitForTimeout(1600);
      },
    },
  },
};
