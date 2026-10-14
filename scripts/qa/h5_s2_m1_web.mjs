#!/usr/bin/env node
// H5.S2.M1 A_WEB driver: compare a keyboard decision with a controlled drag.
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
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

export function validateKeyboardGestureObservation(observation) {
  const { candidateId, payloads } = observation ?? {};
  if (!observation || observation.candidateVisibleBeforeKeyboard !== true
      || observation.keyboardButtonFocused !== true || observation.keyboardFocusVisible !== true
      || observation.candidateRemovedWhileKeyboardPending !== true
      || observation.keyboardStatus !== 503
      || observation.candidateRestoredAfterKeyboardError !== true
      || observation.gestureStatus !== 200 || observation.candidateRemovedAfterGesture !== true
      || observation.swipePostCount !== 2 || !identifier.test(candidateId ?? '')
      || !Array.isArray(payloads) || payloads.length !== 2
      || !isDeepStrictEqual(payloads[0], payloads[1])
      || payloads.some((payload) => payload?.targetId !== candidateId
        || payload?.direction !== 'LIKE')) {
    throw new Error('H5.S2.M1 keyboard and gesture observation is incomplete or inconsistent');
  }
  return true;
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!['--case', '--role', '--run-id', '--evidence-dir'].includes(key)
        || options[key] || index + 1 >= args.length || args[index + 1].startsWith('--')) {
      throw new Error('invalid H5.S2.M1 driver arguments');
    }
    options[key] = args[index + 1];
    index += 1;
  }
  if (options['--case'] !== 'H5.S2.M1' || options['--role'] !== 'A_WEB'
      || !identifier.test(options['--run-id'] ?? '') || !options['--evidence-dir']) {
    throw new Error('H5.S2.M1 A_WEB case, role, run ID, or evidence directory is invalid');
  }
  return {
    caseId: options['--case'], role: options['--role'], runId: options['--run-id'],
    evidenceDir: path.resolve(options['--evidence-dir']),
  };
}

export async function runH5S2M1Web(args, env = process.env) {
  const options = parseArgs(args);
  const token = env.QA_TOKEN_A;
  const apiBase = env.QA_API_BASE_URL;
  const webBase = env.QA_WEB_BASE_URL;
  if (!token || !apiBase || !webBase) {
    throw precondition('H5.S2.M1 web role requires QA_TOKEN_A and API/web base URLs');
  }
  let actor;
  try {
    actor = await authenticateActor(apiBase, token);
  } catch {
    throw precondition('H5.S2.M1 A identity is unavailable from /auth/me');
  }
  let webUrl;
  try {
    const base = new URL(webBase);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
      throw new Error('invalid web base');
    }
    webUrl = new URL('/descubrir', base);
  } catch {
    throw new Error('H5.S2.M1 web base URL is invalid');
  }

  await mkdir(options.evidenceDir, { recursive: true });
  const invocationId = randomUUID();
  const candidateId = randomUUID();
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
    let swipePostCount = 0;
    let candidateRemovedWhileKeyboardPending = false;
    let optimisticScreenshot;
    const payloads = [];
    await page.route('**/api/backend/me/discovery/deck*', async (route) => {
      if (!isDiscoveryDeckGet(route.request().method(), route.request().url())) {
        await route.continue();
        return;
      }
      deckGetCount += 1;
      const data = deckGetCount === 1 ? [{
        userId: candidateId,
        displayName: 'Socio QA de teclado',
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
    });
    await page.route('**/api/backend/me/discovery/swipes', async (route) => {
      if (!isDiscoverySwipePost(route.request().method(), route.request().url())) {
        await route.continue();
        return;
      }
      swipePostCount += 1;
      const payload = route.request().postDataJSON();
      payloads.push(payload);
      if (payload?.targetId !== candidateId || payload?.direction !== 'LIKE'
          || swipePostCount > 2) {
        throw new Error('H5.S2.M1 sent an unexpected or extra swipe payload');
      }
      if (swipePostCount === 1) {
        await page.getByRole('button', {
          name: 'Me interesa Socio QA de teclado', exact: true,
        }).waitFor({ state: 'hidden' });
        candidateRemovedWhileKeyboardPending = true;
        optimisticScreenshot = await saveScreenshot(page, options.evidenceDir,
          `H5.S2.M1-A_WEB-${options.runId}-${invocationId}-optimistic-removal.png`);
        await route.fulfill({
          status: 503,
          contentType: 'application/problem+json',
          body: JSON.stringify({ type: 'about:blank', title: 'Service unavailable', status: 503 }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: { direction: 'LIKE', targetId: candidateId, matched: false, connectionId: null },
        }),
      });
    });

    await openDiscoveryPage(page, webUrl.toString());
    const main = page.getByRole('main');
    const likeButton = main.getByRole('button', {
      name: 'Me interesa Socio QA de teclado', exact: true,
    });
    await likeButton.waitFor({ state: 'visible' });
    const candidateVisibleBeforeKeyboard = true;
    let keyboardButtonFocused = false;
    for (let tabPress = 0; tabPress < 50; tabPress += 1) {
      await page.keyboard.press('Tab');
      if (await likeButton.evaluate((element) => element === document.activeElement)) {
        keyboardButtonFocused = true;
        break;
      }
    }
    const keyboardFocusVisible = keyboardButtonFocused
      && await likeButton.evaluate((element) => getComputedStyle(element).outlineWidth === '2px');
    if (!keyboardButtonFocused || !keyboardFocusVisible) {
      throw new Error('H5.S2.M1 could not reach the Like button with visible keyboard focus');
    }
    const keyboardScreenshot = await saveScreenshot(page, options.evidenceDir,
      `H5.S2.M1-A_WEB-${options.runId}-${invocationId}-keyboard-focus.png`);
    const keyboardResponsePromise = page.waitForResponse((response) =>
      isDiscoverySwipePost(response.request().method(), response.url()));
    await page.keyboard.press('Space');
    const keyboardStatus = (await keyboardResponsePromise).status();
    await likeButton.waitFor({ state: 'visible' });
    const candidateRestoredAfterKeyboardError = true;

    const candidateName = main.getByText('Socio QA de teclado', { exact: true }).first();
    const box = await candidateName.boundingBox();
    if (!box) throw new Error('H5.S2.M1 synthetic candidate has no visible card bounds');
    const gestureResponsePromise = page.waitForResponse((response) =>
      isDiscoverySwipePost(response.request().method(), response.url()));
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 180, startY, { steps: 8 });
    await page.mouse.up();
    const gestureStatus = (await gestureResponsePromise).status();
    await main.getByRole('heading', { name: 'No quedan cartas', exact: true })
      .waitFor({ state: 'visible' });
    const candidateRemovedAfterGesture = true;
    const finalScreenshot = await saveScreenshot(page, options.evidenceDir,
      `H5.S2.M1-A_WEB-${options.runId}-${invocationId}-gesture-complete.png`);
    validateKeyboardGestureObservation({
      candidateId,
      candidateVisibleBeforeKeyboard,
      keyboardButtonFocused,
      keyboardFocusVisible,
      candidateRemovedWhileKeyboardPending,
      keyboardStatus,
      candidateRestoredAfterKeyboardError,
      gestureStatus,
      candidateRemovedAfterGesture,
      swipePostCount,
      payloads,
    });
    await context.close();
    return {
      runId: options.runId,
      case: options.caseId,
      role: options.role,
      invocationId,
      apiActorId: actor.id,
      assertions: { keyboardSwipeMatchesGesture: true },
      artifacts: [keyboardScreenshot, optimisticScreenshot, finalScreenshot],
    };
  } finally {
    await browser.close();
  }
}

export async function main(args = process.argv.slice(2), env = process.env) {
  try {
    process.stdout.write(`${JSON.stringify(await runH5S2M1Web(args, env))}\n`);
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
