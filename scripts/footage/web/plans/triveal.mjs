// Triveal: play the daily puzzle from the first clue to a win.
//
// The plan needs the day's answer and one wrong guess. Daily No. 126
// (2026-10-04) is Tower Bridge; its first clue says tourists confuse it with a
// plainer neighbour, so "London Bridge" is the natural wrong guess. Find a new
// day's answer by giving up in a throwaway session. Playing the daily only
// reads from Triveal's server; nothing here rates a question or joins a party.

const ANSWER = 'Tower Bridge';
const WRONG = 'London Bridge';

async function guess(page, text) {
  const box = page.getByPlaceholder(/type your answer/i);
  await box.click();
  await box.pressSequentially(text, { delay: 85 });
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
}

async function ready(page) {
  await page.getByPlaceholder(/type your answer/i).waitFor();
  await page.waitForTimeout(800);
}

/** Short labels for the card, matching what the game shows at each step. */
const CARD = {
  clue1: ['CLUE 1', '10 points'],
  clue2: ['CLUE 2', '8 points'],
  wrong: ['WRONG GUESS', '−1 point · clue 3 opens'],
  right: ['CORRECT!', '+5 points on clue 3'],
};

/** Fuller chapter titles for the full-screen walkthrough. */
const REEL = {
  clue1: ['Clue 1, worth 10', 'The hardest clue comes first. Guess now for the most points.'],
  clue2: ['Ask for another clue', 'Each clue is easier than the last and worth 2 points less.'],
  wrong: ['A wrong guess', 'London Bridge costs a point and opens the next clue.'],
  right: ['Got it', 'Tower Bridge on clue 3: 6 points, minus 1 for the miss.'],
};

/** Play to a win. A wrong guess also opens the next clue. */
async function play(page, mark, labels, { wait = 1 } = {}) {
  const w = (ms) => page.waitForTimeout(ms * wait);
  mark(...labels.clue1);
  await w(2600);
  await page.getByRole('button', { name: /next clue/i }).click();
  mark(...labels.clue2);
  await w(2400);
  await guess(page, WRONG);
  mark(...labels.wrong);
  await w(2600);
  await guess(page, ANSWER);
  await page.getByRole('heading', { name: 'Correct!' }).waitFor();
  mark(...labels.right);
  await w(3000);
}

export default {
  url: 'https://triveal.vercel.app',
  takes: {
    card: {
      viewport: { width: 720, height: 540 },
      size: '480:360',
      crf: 27,
      prepare: ready,
      steps: (page, mark) => play(page, mark, CARD),
    },
    reel: {
      viewport: { width: 1280, height: 800 },
      size: '1280:800',
      crf: 26,
      prepare: ready,
      async steps(page, mark) {
        await play(page, mark, REEL, { wait: 1.2 });
        mark('The reveal', 'The answer with a photo and a short write-up, and your streak.');
        await page.mouse.wheel(0, 300);
        await page.waitForTimeout(2600);
      },
    },
  },
};
