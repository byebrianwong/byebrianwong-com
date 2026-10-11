// Second Guess: a solo round against 15 bots. Read the question, wait for the
// crowd, answer with the crowd's second favourite, and watch the reveal give
// #1 nothing and #2 three points.
//
// This plays the live solo mode (/solo), so every take saves a real game to
// Second Guess's database: 1 game, 5 questions, 16 players, and the answers
// given before the take ends. Nothing cleans these up, and the game is left
// mid-way, so don't run this more than needed. Brian agreed to this on
// 2026-10-10.
//
// The bots run in the page and save each answer straight to the database
// (Supabase's /rest/v1/answers) as it is given. The plan reads those requests, so once all 15 are in it knows the crowd's
// answers and types the one that will land at #2. That way every take wins
// the round. The question is whichever one the game deals.

import { clickOn, showPointer } from '../pointer.mjs';

const SITE = 'https://secondguess.byebrianwong.com';
const BOTS = 15;

/**
 * What has been answered so far, per question, read from the requests. The
 * plan reads it once 15 answers are in, before it sends its own.
 */
let crowd = new Map();

async function setup(page) {
  crowd = new Map();
  page.on('request', (req) => {
    if (req.method() !== 'POST' || !req.url().includes('/rest/v1/answers')) return;
    for (const row of [req.postDataJSON()].flat()) {
      const answers = crowd.get(row.question_id) ?? new Map();
      answers.set(row.player_id, row.raw_text);
      crowd.set(row.question_id, answers);
    }
  });
  await showPointer(page);
}

/** Wait until every bot has answered the open question, and return their answers. */
async function waitForCrowd(page) {
  for (let i = 0; i < 200; i++) {
    for (const answers of crowd.values()) if (answers.size >= BOTS) return [...answers.values()];
    await page.waitForTimeout(100);
  }
  throw new Error(`The bots' answers never arrived (${[...crowd.values()].map((a) => a.size)}); has submitAnswer's request changed?`);
}

/**
 * Pick the answer that will sit at #2 once ours is added. Answers rank by how
 * many people gave them, and answers with the same count share a place.
 */
function secondPlace(answers) {
  const counts = new Map();
  for (const a of answers) counts.set(a.toLowerCase(), (counts.get(a.toLowerCase()) ?? 0) + 1);
  const label = (key) => answers.find((a) => a.toLowerCase() === key);
  for (const [key, n] of counts) {
    const after = new Map(counts).set(key, n + 1);
    const places = [...new Set(after.values())].sort((a, b) => b - a);
    if (places.indexOf(n + 1) === 1) return label(key);
  }
  throw new Error(`No answer lands at #2: ${JSON.stringify([...counts])}`);
}

/** Fill in the solo setup and start the game. */
async function startSolo(page, { slow = false } = {}) {
  const name = page.getByPlaceholder('Sarah');
  await name.waitFor();
  if (slow) {
    await clickOn(page, name, { steps: 14 });
    await page.keyboard.type('Sam', { delay: 120 });
    await clickOn(page, page.getByRole('button', { name: '🦊' }), { steps: 16 });
    await page.waitForTimeout(400);
    await clickOn(page, page.getByRole('button', { name: 'Start solo game →' }), { steps: 16 });
  } else {
    await name.fill('Sam');
    await page.getByRole('button', { name: '🦊' }).click();
    await page.getByRole('button', { name: 'Start solo game →' }).click();
  }
  await page.getByPlaceholder('Type your answer…').waitFor({ timeout: 45000 });
}

/** Wait for the crowd, then answer at #2 and wait for the reveal to finish. */
async function playRound(page, mark, labels) {
  const box = page.getByPlaceholder('Type your answer…');
  await page.mouse.move(...(await center(box)), { steps: 24 });
  const answer = secondPlace(await waitForCrowd(page));
  await clickOn(page, box, { steps: 4, pause: 100 });
  mark(...labels[0]);
  await page.keyboard.type(answer, { delay: 110 });
  await page.waitForTimeout(300);
  await clickOn(page, page.getByRole('button', { name: 'Submit' }), { steps: 12 });
  await page.getByText('Tabulating answers…').waitFor();
  mark(...labels[1]);
  await page.getByText('Tabulating answers…').waitFor({ state: 'detached' });
  await page.getByText('Your round').waitFor({ timeout: 15000 });
  mark(...labels[2]);
  return answer;
}

async function center(locator) {
  const b = await locator.boundingBox();
  return [b.x + b.width / 2, b.y + b.height / 2];
}

/** Scroll smoothly so `locator` sits `offset` px below the top of the window. */
async function scrollTo(page, locator, offset = 0, wait = 900) {
  await locator.evaluate((el, off) => {
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - off, behavior: 'smooth' });
  }, offset);
  await page.waitForTimeout(wait);
}

export default {
  url: `${SITE}/solo`,
  takes: {
    card: {
      viewport: { width: 640, height: 480 },
      size: '480:360',
      crf: 27,
      setup,
      async prepare(page) {
        await startSolo(page);
        await page.mouse.move(520, 440);
      },
      async steps(page, mark) {
        mark('QUESTION 1', '15 bots answer too');
        await playRound(page, mark, [
          ['AIM FOR #2', 'The crowd’s second favourite'],
          ['THE REVEAL', '#1 is too popular: 0 points'],
          ['JUST RIGHT', '#2 scores 3 points'],
        ]);
        await page.mouse.move(560, 300, { steps: 16 });
        await page.waitForTimeout(3200);
      },
    },
    reel: {
      viewport: { width: 1024, height: 640 },
      size: '1024:640',
      crf: 26,
      setup,
      async prepare(page) {
        await page.goto(SITE, { waitUntil: 'networkidle' });
        await page.mouse.move(820, 560);
        await page.waitForTimeout(400);
      },
      async steps(page, mark) {
        mark('Be #2 to become #1', 'A party game where the most popular answer scores nothing.');
        await page.waitForTimeout(2600);
        await clickOn(page, page.getByRole('link', { name: 'play a quick game against bots' }), { steps: 22 });
        await page.waitForURL('**/solo');
        mark('Solo game', 'Five questions against 15 computer players. With friends, everyone joins by code on their phone.');
        await startSolo(page, { slow: true });
        mark('The question', 'Everyone answers in a word or two.');
        await playRound(page, mark, [
          ['Aim for #2', 'Guess what the crowd’s second favourite answer will be.'],
          ['The reveal', 'Answers are tallied and revealed from the bottom up.'],
          ['Just right', 'The #1 answer is too popular and scores 0. #2 scores 3, #3 scores 2.'],
        ]);
        await page.mouse.move(820, 360, { steps: 16 });
        await page.waitForTimeout(2600);
        await scrollTo(page, page.getByText('Leaderboard', { exact: true }), 80, 1200);
        mark('Leaderboard', 'Scores add up over the five questions.');
        await page.waitForTimeout(3000);
      },
    },
  },
};
