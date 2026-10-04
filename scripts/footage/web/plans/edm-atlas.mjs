// EDM Atlas: fly the camera between genre stars.
// The card hides the app's panels so the star map fills the small window; the
// reel keeps the whole interface.

const hideChrome = `.brand, .search, .viewtoggle, .dock, .panel, .hint, .intro { opacity: 0 !important; }`;

/**
 * Open a genre through the search box, the way a visitor would. The "/"
 * shortcut is ignored while a genre panel is open, so click the search button.
 */
async function fly(page, query, wait = 2600) {
  await page.locator('.search__trigger').click();
  await page.waitForTimeout(250);
  await page.keyboard.type(query, { delay: 70 });
  await page.waitForTimeout(350);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(wait);
}

async function enter(page) {
  await page.getByRole('button', { name: 'Enter the atlas' }).click();
  await page.waitForTimeout(2600);
}

export default {
  url: 'https://edmatlas.byebrianwong.com',
  takes: {
    card: {
      viewport: { width: 960, height: 720 },
      size: '480:360',
      crf: 28,
      css: hideChrome,
      prepare: enter,
      async steps(page, mark) {
        mark('31 GENRES', '8 families');
        await page.waitForTimeout(1600);
        mark('DUBSTEP', '140 BPM · Bass music');
        await fly(page, 'dubstep', 2900);
        mark('TRANCE', '138 BPM · Trance');
        await fly(page, 'trance', 2900);
        mark('AMAPIANO', '112 BPM · Global');
        await fly(page, 'amapiano', 2900);
        await page.keyboard.press('Escape');
        mark('31 GENRES', '8 families');
        await page.waitForTimeout(2200);
      },
    },
    reel: {
      viewport: { width: 1280, height: 800 },
      size: '1280:800',
      crf: 26,
      async steps(page, mark) {
        mark('Enter the atlas', 'Every star is a genre, grouped into eight families.');
        await page.waitForTimeout(1800);
        await enter(page);
        mark('Orbit', 'Drag to turn the whole map in 3D.');
        const box = { x: 640, y: 420 };
        await page.mouse.move(box.x, box.y);
        await page.mouse.down();
        for (let i = 0; i <= 40; i++) await page.mouse.move(box.x - i * 7, box.y + Math.sin(i / 6) * 20, { steps: 2 });
        await page.mouse.up();
        await page.waitForTimeout(1500);
        mark('Fly to a genre', 'Search or click a star: the camera flies there and the panel explains it.');
        await fly(page, 'dubstep', 3400);
        mark('Read it', 'What makes it unique, its signature sound, and its history.');
        await page.locator('.panel__scroll').evaluate((el) => el.scrollTo({ top: 260, behavior: 'smooth' }));
        await page.waitForTimeout(2600);
        mark('Hear the building blocks', 'A synthesized loop of the genre’s rhythm, bass and signature effect.');
        await page.locator('.panel__scroll').evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
        await page.waitForTimeout(2600);
        mark('Follow a connection', 'Related genres link into constellations; jump along them.');
        await page.locator('.panel__related button').first().click();
        await page.waitForTimeout(3400);
        await page.keyboard.press('Escape');
        mark('Back out', 'Zoom back to the whole atlas.');
        await page.waitForTimeout(2600);
      },
    },
  },
};
