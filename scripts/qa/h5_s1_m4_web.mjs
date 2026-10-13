#!/usr/bin/env node
// H5.S1.M4 A_WEB driver: return to a fresh cursor-free discovery deck.
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import {
  authenticateActor,
  isDiscoveryDeckGet,
  openDiscoveryPage,
  precondition,
  saveScreenshot,
} from './h5_s1_web_common.mjs';

const identifier = /^[A-Za-z0-9_-]{1,80}$/u;
const roleTimeoutMs = 120_000;

export function isDiscoverySwipePost(method, rawUrl) {
  try {
    return method === 'POST'
      && new URL(rawUrl).pathname === '/api/backend/me/discovery/swipes';
  } catch {
    return false;
  }
}

export function validateReturnObservation(observation) {
  if (!observation || !Number.isSafeInteger(observation.initialDeckGetCount)
      || observation.initialDeckGetCount < 1 || observation.swipePostCount !== 1
      || observation.swipeStatus !== 200
      || !Number.isSafeInteger(observation.postSwipeDeckGetCount)
      || observation.postSwipeDeckGetCount < 1
      || !Number.isSafeInteger(observation.returnDeckGetCount)
      || observation.returnDeckGetCount < 1
      || observation.returnDeckHadCursor !== false
      || observation.communityHeadingVisible !== true
      || observation.emptyHeadingVisible !== true
      || observation.candidateVisibleAfterReturn !== false
      || observation.swipeWasIntercepted !== true) {
    throw new Error('H5.S1.M4 return observation is incomplete');
  }
  return true;
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!['--case', '--role', '--run-id', '--evidence-dir'].includes(key)
        || options[key] || index + 1 >= args.length || args[index + 1].startsWith('--')) {
      throw new Error('invalid H5.S1.M4 driver arguments');
    }
    options[key] = args[index + 1];
    index += 1;
  }
  if (options['--case'] !== 'H5.S1.M4' || options['--role'] !== 'A_WEB'
      || !identifier.test(options['--run-id'] ?? '') || !options['--evidence-dir']) {
    throw new Error('H5.S1.M4 A_WEB case, role, run ID, or evidence directory is invalid');
  }
  return {
    caseId: options['--case'], role: options['--role'], runId: options['--run-id'],
    evidenceDir: path.resolve(options['--evidence-dir']),
  };
}

export async function runH5S1M4(args, env = process.env) {
  const options = parseArgs(args);
  const token = env.QA_TOKEN_A;
  const apiBase = env.QA_API_BASE_URL;
  const webBase = env.QA_WEB_BASE_URL;
  if (!token || !apiBase || !webBase) {
    throw precondition('H5.S1.M4 web role requires QA_TOKEN_A and API/web base URLs');
  }
  let actor;
  try {
    actor = await authenticateActor(apiBase, token);
  } catch {
    throw precondition('H5.S1.M4 A identity is unavailable from /auth/me');
  }
  let webUrl;
  try {
    const base = new URL(webBase);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
      throw new Error('invalid web base');
    }
    webUrl = new URL('/descubrir', base);
  } catch {
    throw new Error('H5.S1.M4 web base URL is invalid');
  }

  await mkdir(options.evidenceDir, { recursive: true });
  const invocationId = randomUUID();
  const targetId = randomUUID();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    throw precondition('Playwright Chromium is unavailable');
  }
  try {
    const context = await browser.newContext({
      viewport: { width: 1365, height: 900 },
      serviceWorkers: 'block',
    });
    await context.addCookies([{
      name: 'gymsheet_session',
      value: token,
      url: new URL('/', webUrl).toString(),
      httpOnly: true,
      secure: webUrl.protocol === 'https:',
      sameSite: 'Lax',
    }]);
    const page = await context.newPage();
    page.setDefaultTimeout(roleTimeoutMs);
    let deckGetCount = 0;
    let postSwipeDeckGetCount = 0;
    let returnDeckGetCount = 0;
    let swipePostCount = 0;
    let swipeResponseObserved = false;
    let returningToDiscovery = false;
    let returnDeckHadCursor = false;
    let resolvePostSwipeDeck;
    let resolveReturnDeck;
    const postSwipeDeckLoaded = new Promise((resolve) => { resolvePostSwipeDeck = resolve; });
    const returnDeckLoaded = new Promise((resolve) => { resolveReturnDeck = resolve; });
    page.on('response', (response) => {
      if (response.request().method() === 'POST'
          && new URL(response.url()).pathname === '/api/backend/me/discovery/swipes'
          && response.status() === 200) {
        swipeResponseObserved = true;
      }
    });
    const deckUrls = [];
    await page.route('**/api/backend/me/discovery/deck*', async (route) => {
      if (!isDiscoveryDeckGet(route.request().method(), route.request().url())) {
        await route.continue();
        return;
      }
      deckGetCount += 1;
      const requestedOnReturn = returningToDiscovery;
      const requestedAfterSwipe = swipeResponseObserved && !requestedOnReturn;
      const requestUrl = new URL(route.request().url());
      deckUrls.push(requestUrl);
      if (requestedOnReturn) {
        returnDeckGetCount += 1;
        returnDeckHadCursor ||= requestUrl.searchParams.has('cursor');
      } else if (requestedAfterSwipe) {
        postSwipeDeckGetCount += 1;
      }
      const data = deckGetCount === 1 ? [{
        userId: targetId,
        displayName: 'Socio QA de regreso',
        objetivo: 'TRAINING',
        branchId: null,
        branchName: null,
        connectionStatus: 'NONE',
        connectionId: null,
        socialStatus: null,
        photoUrl: null,
        photos: [],
        age: 28,
        gender: 'FEMALE',
        experienceLevel: 'BEGINNER',
        points: 0,
        levelCode: null,
      }] : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data }),
      });
      if (requestedAfterSwipe) resolvePostSwipeDeck();
      if (requestedOnReturn) resolveReturnDeck();
    });
    await page.route('**/api/backend/me/discovery/swipes', async (route) => {
      if (!isDiscoverySwipePost(route.request().method(), route.request().url())) {
        await route.continue();
        return;
      }
      swipePostCount += 1;
      const payload = route.request().postDataJSON();
      if (payload?.targetId !== targetId || payload?.direction !== 'LIKE') {
        throw new Error('H5.S1.M4 sent an unexpected swipe payload');
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: { direction: 'LIKE', targetId, matched: false, connectionId: null },
        }),
      });
    });

    await openDiscoveryPage(page, webUrl.toString());
    const main = page.getByRole('main');
    const candidate = main.getByRole('button', { name: 'Me interesa Socio QA de regreso', exact: true });
    await candidate.waitFor({ state: 'visible' });
    const swipeResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST'
        && new URL(response.url()).pathname === '/api/backend/me/discovery/swipes');
    await candidate.click();
    const swipeResponse = await swipeResponsePromise;
    const swipeStatus = swipeResponse.status();
    if (swipeStatus !== 200) throw new Error('H5.S1.M4 expected a controlled successful swipe');
    await postSwipeDeckLoaded;
    await main.getByRole('heading', { name: 'No quedan cartas', exact: true }).waitFor({ state: 'visible' });

    const communityUrl = new URL('/comunidad', webUrl).toString();
    const communityLink = main.getByRole('link', { name: 'Comunidad', exact: true });
    await communityLink.click();
    try {
      await page.waitForURL(communityUrl);
    } catch {
      throw precondition('QA web community page did not respond');
    }
    if (page.url() !== communityUrl) throw new Error('H5.S1.M4 did not open Community');
    const communityHeading = page.getByRole('main').getByRole('heading', {
      name: 'Comunidad', exact: true,
    });
    await communityHeading.waitFor({ state: 'visible' });
    const communityHeadingVisible = await communityHeading.isVisible();
    returningToDiscovery = true;
    await openDiscoveryPage(page, webUrl.toString());
    await returnDeckLoaded;
    const emptyHeading = main.getByRole('heading', { name: 'No quedan cartas', exact: true });
    await emptyHeading.waitFor({ state: 'visible' });
    const candidateVisibleAfterReturn = await candidate.isVisible().catch(() => false);
    const observation = {
      initialDeckGetCount: deckUrls.length - postSwipeDeckGetCount - returnDeckGetCount,
      swipePostCount,
      swipeStatus,
      postSwipeDeckGetCount,
      returnDeckGetCount,
      returnDeckHadCursor,
      communityHeadingVisible,
      emptyHeadingVisible: await emptyHeading.isVisible(),
      candidateVisibleAfterReturn,
      swipeWasIntercepted: swipePostCount === 1,
    };
    validateReturnObservation(observation);
    const artifact = await saveScreenshot(page, options.evidenceDir,
      `H5.S1.M4-A_WEB-${options.runId}-${invocationId}-returned.png`);
    await context.close();
    return {
      runId: options.runId,
      case: options.caseId,
      role: options.role,
      invocationId,
      apiActorId: actor.id,
      assertions: { cursorFreeDeckReloaded: true, swipeWasIntercepted: true },
      observations: {
        initialDeckGetCount: observation.initialDeckGetCount,
        postSwipeDeckGetCount,
        returnDeckGetCount,
        returnDeckHadCursor,
        swipeMutationSentToBackend: false,
      },
      artifacts: [artifact],
    };
  } finally {
    await browser.close();
  }
}

export async function main(args = process.argv.slice(2), env = process.env) {
  try {
    process.stdout.write(`${JSON.stringify(await runH5S1M4(args, env))}\n`);
    return 0;
  } catch (error) {
    const blocked = error?.name === 'PairPreconditionError';
    process.stderr.write(`${blocked ? 'BLOCKED' : 'FAIL'}: ${error?.message ?? 'unknown error'}\n`);
    return blocked ? 2 : 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
