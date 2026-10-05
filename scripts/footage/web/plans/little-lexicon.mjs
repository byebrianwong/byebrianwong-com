// Little Lexicon: race the speed round, matching each word to its meaning,
// with one miss on purpose. The reel also learns a new word in a session.
//
// The web app runs in demo mode: progress is saved only in the browser's
// local storage, which starts empty in each recording's fresh browser. A new
// visitor always gets the same words in the same order (easiest first), so
// MEANINGS lists the first dozen with the meaning the app counts as right:
// the word's first definition, from words.json on little-lexicon's main
// branch (2026-10-05). If the word list changes, the plan stops at the first
// word it has no meaning for.

import { clickOn, showPointer } from '../pointer.mjs';

const SITE = 'https://little-lexicon.vercel.app';

const MEANINGS = {
  empirical: 'Derived from experiment and observation rather than theory.',
  aesthetic: 'Relating to beauty, or to the way people judge and enjoy it.',
  efficacy: 'Capacity or power to produce a desired effect.',
  analogous: 'Similar or equivalent in some respects though otherwise dissimilar.',
  ambiguous: 'Open to two or more interpretations; or of uncertain nature or significance; or (often) intended to mislead.',
  derivative: 'Copied or adapted from the work of others; not original.',
  pragmatic: 'Concerned with practical matters.',
  catalyst: 'Something or someone that causes an important change or event to happen.',
  volatile: 'Evaporating readily at normal temperatures and pressures.',
  articulate: 'Provide with a joint.',
  precipitate: 'Bring about an event, usually an unwelcome one, abruptly or earlier than it would otherwise come.',
  pervasive: 'Spreading or spread throughout.',
};

/** The word on screen: whichever word from MEANINGS appears on its own. */
async function shownWord(page) {
  for (const word of Object.keys(MEANINGS)) {
    if (await page.getByText(word, { exact: true }).count()) return word;
  }
  throw new Error('The word on screen is not in MEANINGS; add it from words.json');
}

/** Answer the speed round's current word, rightly or not, and wait for the next one. */
async function speedAnswer(page, { wrong = false } = {}) {
  const word = await shownWord(page);
  const right = MEANINGS[word];
  let name = right;
  if (wrong) {
    const names = await page.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || e.textContent.trim()));
    name = names.find((n) => n !== right && !/^Close/.test(n));
  }
  await clickOn(page, page.getByRole('button', { name, exact: true }), { steps: 12, pause: 280 });
  await page.getByText(word, { exact: true }).waitFor({ state: 'detached' });
}

async function speedRound(page, mark, labels) {
  for (let i = 0; i < 7; i++) {
    if (labels[i]) mark(...labels[i]);
    await speedAnswer(page, { wrong: i === 3 });
    await page.waitForTimeout(250);
  }
}

export default {
  url: SITE,
  takes: {
    card: {
      viewport: { width: 720, height: 540 },
      size: '480:360',
      crf: 27,
      setup: showPointer,
      async prepare(page) {
        await page.goto(`${SITE}/speed`);
        await page.getByText('empirical', { exact: true }).waitFor();
        await page.mouse.move(560, 470);
      },
      async steps(page, mark) {
        await speedRound(page, mark, {
          0: ['SPEED ROUND', '60 seconds on the clock'],
          3: ['MISSED ONE', 'It comes back for review'],
          4: ['317 WORDS', 'GRE and beyond'],
        });
        await page.waitForTimeout(600);
      },
    },
    reel: {
      viewport: { width: 1024, height: 640 },
      size: '1024:640',
      crf: 26,
      setup: showPointer,
      async prepare(page) {
        // A new visitor lands on the placement test; skip it to reach home.
        await page.getByRole('button', { name: 'Skip for now' }).click();
        await page.getByRole('button', { name: /^Start session/ }).waitFor();
        await page.mouse.move(820, 560);
        await page.waitForTimeout(500);
      },
      async steps(page, mark) {
        mark('Today', 'A daily goal of 15 reviews, and a streak to keep.');
        await page.waitForTimeout(2200);
        await clickOn(page, page.getByRole('button', { name: /^Start session/ }));
        const word = 'empirical';
        await page.getByText(word, { exact: true }).waitFor();
        mark('A new word', 'Its meaning, an example sentence, and a memory hook to make it stick.');
        await page.mouse.move(700, 300, { steps: 16 });
        await page.waitForTimeout(3600);
        await clickOn(page, page.getByRole('button', { name: 'Got it, quiz me' }));
        mark('Quiz', 'Then straight away, a question on it.');
        await page.waitForTimeout(1600);
        // A new word is asked either way round: pick the meaning, or pick the word.
        const pickWord = await page.getByText(/which word means/i).count();
        await clickOn(page, page.getByRole('button', { name: pickWord ? word : MEANINGS[word], exact: true }), { steps: 14 });
        mark('Scheduled', 'Spaced repetition sets when the word comes back: just before you would forget it.');
        await page.waitForTimeout(3400);
        await clickOn(page, page.getByRole('button', { name: 'Close session' }));
        await page.getByRole('button', { name: /^Speed round/ }).waitFor();
        await page.waitForTimeout(500);
        await clickOn(page, page.getByRole('button', { name: /^Speed round/ }));
        await page.getByText(/pick the meaning, fast/i).waitFor();
        await speedRound(page, mark, {
          0: ['Speed round', 'Sixty seconds to match as many words to their meanings as you can.'],
          3: ['A miss', 'The right answer is ticked, and the word is due again sooner.'],
        });
        await page.waitForTimeout(600);
      },
    },
  },
};
