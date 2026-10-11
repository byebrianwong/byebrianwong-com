// Tap Search: double-click a word on a Wikipedia article, get a summary and
// its definitions in a tooltip, save it, and open the saved-words page.
//
// Tap Search is a Chrome extension, and headless Chromium can't load one. So
// the recording runs the extension's real files on the page instead: its
// content script (the tooltip) and its saved-words page, fetched from the
// public GitHub repo. A small stand-in for `chrome.runtime` answers the
// messages the extension's background worker would. Its answers are the
// sample results from the repo's stories.html: the summary is the Gemini
// sample written there, not a live call, since that needs an API key.
//
// The saved-words page is served from a made-up address
// (tap-search.extension), because a real extension page lives at a
// chrome-extension:// address the browser won't open without the extension.
// Nothing is sent anywhere: Wikipedia is only read.

import { clickOn, pointAt, showPointer } from '../pointer.mjs';

const REPO = 'https://raw.githubusercontent.com/byebrianwong/tap-search/main';
const ARTICLE = 'https://en.wikipedia.org/wiki/Serendipity';
const SAVED_PAGE = 'https://tap-search.extension/saved/saved.html';

// From stories.html (FIX and SAVED_FIXTURES).
const SERENDIPITY = {
  ai: {
    source: 'gemini',
    summary:
      'Serendipity is the unplanned, fortunate discovery of something valuable while looking for something else — like stumbling on a great cafe while lost on a side street.',
  },
  dictionary: {
    phonetic: '/ˌsɛrənˈdɪpɪti/',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: 'The occurrence and development of events by chance in a happy or beneficial way.',
            example: 'A fortunate stroke of serendipity brought the two old friends together.',
          },
          { definition: 'A pleasant surprise; finding something good without looking for it.' },
        ],
      },
    ],
  },
};
const HOUR = 60 * 60 * 1000;
const ALREADY_SAVED = [
  {
    text: 'ephemeral',
    ago: 24 * HOUR,
    // stories.html gives this word the serendipity summary by mistake; leave it out.
    ai: null,
    dictionary: {
      phonetic: '/əˈfɛm(ə)rəl/',
      meanings: [{ partOfSpeech: 'adjective', definitions: [{ definition: 'Lasting for a very short time.', example: 'Fashions are ephemeral.' }] }],
    },
  },
  {
    text: 'limerence',
    ago: 5 * 24 * HOUR,
    ai: null,
    dictionary: {
      meanings: [
        {
          partOfSpeech: 'noun',
          definitions: [
            { definition: 'The state of being romantically infatuated, including obsessive thoughts and a longing for reciprocation.' },
          ],
        },
      ],
    },
  },
];
/**
 * Stand in for the extension's background worker. The answers come from here,
 * in Node, so the list of saved words is shared by the article and the
 * saved-words page even though they are on different sites.
 */
async function fakeExtension(page, { lookupMs = 900 } = {}) {
  let saved = ALREADY_SAVED.map(({ ago, ...w }) => ({ ...w, savedAt: Date.now() - ago }));
  const answers = {
    IS_SAVED: (m) => ({ saved: saved.some((w) => w.text === m.text) }),
    TAP_SEARCH_LOOKUP: () => ({ success: true, aiError: null, ...SERENDIPITY }),
    SAVE_WORD: (m) => ((saved = [m.entry, ...saved.filter((w) => w.text !== m.entry.text)]), { success: true }),
    UNSAVE_WORD: (m) => ((saved = saved.filter((w) => w.text !== m.text)), { success: true }),
    GET_SAVED_WORDS: () => ({ words: saved }),
    DRIVE_SYNC_AVAILABLE: () => ({ available: false }),
  };
  await page.exposeFunction('__tapSearchMessage', (msg) => answers[msg.type]?.(msg) ?? null);
  await page.addInitScript(
    ({ savedPage, lookupMs }) => {
      // The tooltip uses a closed shadow root; open it so the plan can find its buttons.
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (init) {
        return attach.call(this, { ...init, mode: 'open' });
      };
      window.chrome = window.chrome || {};
      window.chrome.runtime = {
        onMessage: { addListener() {} },
        sendMessage(msg, cb) {
          if (msg.type === 'OPEN_SAVED_PAGE') return void (location.href = savedPage);
          const wait = msg.type === 'TAP_SEARCH_LOOKUP' ? lookupMs : 30;
          window.__tapSearchMessage(msg).then((answer) => setTimeout(() => cb?.(answer), wait));
        },
      };
      window.open = () => null;
    },
    { savedPage: SAVED_PAGE, lookupMs },
  );
  // Serve the extension's saved-words page from the repo.
  await page.route('https://tap-search.extension/**', async (route) => {
    const file = new URL(route.request().url()).pathname;
    const res = await fetch(REPO + file);
    const type = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html';
    let body = await res.text();
    // The Drive backup buttons are switched off, but .toolbar-btn's display
    // overrides their `hidden` attribute; hide them as intended.
    if (file.endsWith('.css')) body += '\n[hidden] { display: none !important; }\n';
    route.fulfill({ status: res.status, contentType: `${type}; charset=utf-8`, body });
  });
}

/** Where the word to double-click sits on screen; found once the article is scrolled. */
let word;

async function setup(page) {
  await fakeExtension(page);
  await showPointer(page);
}

/** Add the extension's content script to the article, as Chrome would once the page is idle. */
async function injectContentScript(page) {
  const res = await fetch(`${REPO}/content/content.js`);
  if (!res.ok) throw new Error(`content.js: ${res.status}`);
  await page.addScriptTag({ content: await res.text() });
}

/**
 * Scroll the article so the first "serendipity" in its body text sits `y` px
 * from the top, and return the middle of that word.
 */
async function findWord(page, y) {
  return page.evaluate((y) => {
    const root = document.querySelector('#mw-content-text .mw-parser-output');
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.parentElement.closest('p') || n.parentElement.closest('a, b, i, sup')) continue;
      const i = n.data.search(/\bserendipity\b/);
      if (i < 0) continue;
      const range = document.createRange();
      range.setStart(n, i);
      range.setEnd(n, i + 'serendipity'.length);
      document.documentElement.style.scrollBehavior = 'auto';
      scrollBy(0, range.getBoundingClientRect().top - y);
      const r = range.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    throw new Error('No "serendipity" in the article body');
  }, y);
}

/** Point at the word, double-click it, and wait for the result to replace the loading shimmer. */
async function tap(page, word) {
  await page.mouse.move(word.x, word.y, { steps: 22 });
  await page.waitForTimeout(350);
  await page.mouse.dblclick(word.x, word.y, { delay: 60 });
  await page.locator('.is-save').waitFor();
}

export default {
  url: ARTICLE,
  takes: {
    card: {
      viewport: { width: 640, height: 480 },
      size: '480:360',
      crf: 27,
      setup,
      async prepare(page) {
        await injectContentScript(page);
        word = await findWord(page, 48);
        await page.mouse.move(520, 440);
        await page.waitForTimeout(300);
      },
      async steps(page, mark) {
        mark('ANY PAGE', 'Double-click a word you don’t know');
        await page.waitForTimeout(900);
        await tap(page, word);
        mark('A QUICK SUMMARY', 'Plus the dictionary definition');
        await page.mouse.move(word.x + 100, word.y + 170, { steps: 18 });
        await page.waitForTimeout(3200);
        mark('LOOK IT UP', 'Wikipedia or Google, one click');
        for (const btn of await page.locator('.is-btn[data-url]').all()) {
          await pointAt(page, btn, 14);
          await page.waitForTimeout(700);
        }
        await clickOn(page, page.locator('.is-save'), { steps: 16 });
        mark('SAVED', 'Kept for later');
        await page.waitForTimeout(2600);
      },
    },
    reel: {
      viewport: { width: 1024, height: 640 },
      size: '1024:640',
      crf: 26,
      setup,
      async prepare(page) {
        await injectContentScript(page);
        word = await findWord(page, 150);
        await page.mouse.move(820, 560);
        await page.waitForTimeout(300);
      },
      async steps(page, mark) {
        mark('Any page', 'Tap Search works on any website, here a Wikipedia article.');
        await page.waitForTimeout(1800);
        await tap(page, word);
        mark('Double-click a word', 'A tooltip opens right there with a short summary and the dictionary entry.');
        await page.mouse.move(word.x + 140, word.y + 220, { steps: 18 });
        await page.waitForTimeout(3000);
        mark('Go deeper', 'One click searches the word on Wikipedia or Google.');
        for (const btn of await page.locator('.is-btn[data-url]').all()) {
          await pointAt(page, btn, 14);
          await page.waitForTimeout(700);
        }
        await clickOn(page, page.locator('.is-save'), { steps: 16 });
        mark('Save it', 'The bookmark keeps the word, its summary and its definitions.');
        await page.waitForTimeout(1600);
        await clickOn(page, page.locator('[data-open-saved]'), { steps: 18 });
        await page.waitForURL(SAVED_PAGE);
        await page.locator('.word-card-header').first().waitFor();
        mark('Saved words', 'Everything you saved, newest first, on one page.');
        await page.mouse.move(760, 420, { steps: 14 });
        await page.waitForTimeout(1800);
        await clickOn(page, page.locator('.word-card-header').first(), { steps: 18 });
        mark('Read it again', 'Each word opens to the summary and definitions you saw on the page.');
        await page.waitForTimeout(2600);
        await clickOn(page, page.locator('#search'), { steps: 18 });
        await page.keyboard.type('eph', { delay: 140 });
        mark('Search', 'Filter the list as you type.');
        await page.waitForTimeout(2400);
      },
    },
  },
};
