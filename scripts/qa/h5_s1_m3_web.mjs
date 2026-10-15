#!/usr/bin/env node
// H5.S1.M3 A_WEB driver: reconcile a controlled 409 without persisting a swipe.
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { apiData } from './web-chat-driver.mjs';
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

export function isDiscoverySwipeConflict(method, rawUrl, status) {
  return status === 409 && isDiscoverySwipePost(method, rawUrl);
}

export function validateConflictObservation(observation) {
  if (!observation || observation.candidateVisibleBeforeSwipe !== true
      || observation.swipePostCount !== 1 || observation.conflictStatus !== 409
      || observation.candidateVisibleAfterReconciliation !== false
      || !Number.isSafeInteger(observation.reconciliationDeckGetCount)
      || observation.reconciliationDeckGetCount < 1
      || !Array.isArray(observation.connectionSnapshotBefore)
      || !Array.isArray(observation.connectionSnapshotAfter)
      || JSON.stringify(observation.connectionSnapshotBefore)
        !== JSON.stringify(observation.connectionSnapshotAfter)) {
    throw new Error('H5.S1.M3 conflict observation is incomplete or changed connection state');
  }
  return true;
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!['--case', '--role', '--run-id', '--evidence-dir'].includes(key)
        || options[key] || index + 1 >= args.length || args[index + 1].startsWith('--')) {
      throw new Error('invalid H5.S1.M3 driver arguments');
    }
    options[key] = args[index + 1];
    index += 1;
  }
  if (options['--case'] !== 'H5.S1.M3' || options['--role'] !== 'A_WEB'
      || !identifier.test(options['--run-id'] ?? '') || !options['--evidence-dir']) {
    throw new Error('H5.S1.M3 A_WEB case, role, run ID, or evidence directory is invalid');
  }
  return {
    caseId: options['--case'], role: options['--role'], runId: options['--run-id'],
    evidenceDir: path.resolve(options['--evidence-dir']),
  };
}

export async function connectionSnapshotFor(apiBase, token, fetchImpl = fetch) {
  const connections = await apiData(apiBase, token, '/me/connections', {}, fetchImpl);
  if (!Array.isArray(connections) || connections.some((connection) =>
    typeof connection?.otherUserId !== 'string' || typeof connection?.id !== 'string'
      || typeof connection?.status !== 'string')) {
    throw new Error('connection list response is invalid');
  }
  return connections.map(({ id, otherUserId, status }) => ({ id, otherUserId, status }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export async function runH5S1M3(args, env = process.env) {
  const options = parseArgs(args);
  const token = env.QA_TOKEN_A;
  const apiBase = env.QA_API_BASE_URL;
  const webBase = env.QA_WEB_BASE_URL;
  if (!token || !apiBase || !webBase) {
    throw precondition('H5.S1.M3 web role requires QA_TOKEN_A and API/web base URLs');
  }
  let actor;
  try {
    actor = await authenticateActor(apiBase, token);
  } catch {
    throw precondition('H5.S1.M3 A identity is unavailable from /auth/me');
  }
  let webUrl;
  try {
    const base = new URL(webBase);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
      throw new Error('invalid web base');
    }
    webUrl = new URL('/descubrir', base);
  } catch {
    throw new Error('H5.S1.M3 web base URL is invalid');
  }

  const targetId = randomUUID();
  let connectionSnapshotBefore;
  try {
    connectionSnapshotBefore = await connectionSnapshotFor(apiBase, token);
  } catch {
    throw precondition('H5.S1.M3 read-only connection baseline is unavailable');
  }

  await mkdir(options.evidenceDir, { recursive: true });
  const invocationId = randomUUID();
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
    let reconciliationDeckGetCount = 0;
    let swipePostCount = 0;
    let conflictReceived = false;
    page.on('response', (response) => {
      if (isDiscoverySwipeConflict(
        response.request().method(), response.url(), response.status(),
      )) conflictReceived = true;
    });
    let resolveReconciliationDeck;
    const reconciliationDeckLoaded = new Promise((resolve) => {
      resolveReconciliationDeck = resolve;
    });
    await page.route('**/api/backend/me/discovery/deck*', async (route) => {
      if (!isDiscoveryDeckGet(route.request().method(), route.request().url())) {
        await route.continue();
        return;
      }
      deckGetCount += 1;
      const requestedAfterConflict = conflictReceived;
      const data = deckGetCount === 1 ? [{
        userId: targetId,
        displayName: 'Socio QA de conflicto',
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
      if (requestedAfterConflict && deckGetCount >= 2) {
        reconciliationDeckGetCount += 1;
        resolveReconciliationDeck();
      }
    });
    await page.route('**/api/backend/me/discovery/swipes', async (route) => {
      if (!isDiscoverySwipePost(route.request().method(), route.request().url())) {
        await route.continue();
        return;
      }
      swipePostCount += 1;
      const payload = route.request().postDataJSON();
      if (payload?.targetId !== targetId || payload?.direction !== 'LIKE') {
        throw new Error('H5.S1.M3 sent an unexpected swipe payload');
      }
      await route.fulfill({
        status: 409,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          type: 'about:blank', title: 'Conflict', status: 409,
          detail: 'La decisión ya fue registrada.',
        }),
      });
    });

    await openDiscoveryPage(page, webUrl.toString());
    const main = page.getByRole('main');
    const candidate = main.getByRole('button', { name: 'Me interesa Socio QA de conflicto', exact: true });
    await candidate.waitFor({ state: 'visible' });
    const candidateVisibleBeforeSwipe = await candidate.isVisible();
    const swipeResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST'
        && new URL(response.url()).pathname === '/api/backend/me/discovery/swipes');
    await candidate.click();
    const swipeResponse = await swipeResponsePromise;
    const conflictStatus = swipeResponse.status();
    if (conflictStatus !== 409) throw new Error('H5.S1.M3 expected a controlled 409 response');
    await reconciliationDeckLoaded;
    const emptyHeading = main.getByRole('heading', { name: 'No quedan cartas', exact: true });
    await emptyHeading.waitFor({ state: 'visible' });
    const candidateVisibleAfterReconciliation = await candidate.isVisible().catch(() => false);
    const connectionSnapshotAfter = await connectionSnapshotFor(apiBase, token);
    const observation = {
      candidateVisibleBeforeSwipe,
      swipePostCount,
      conflictStatus,
      candidateVisibleAfterReconciliation,
      reconciliationDeckGetCount,
      connectionSnapshotBefore,
      connectionSnapshotAfter,
    };
    validateConflictObservation(observation);
    const artifact = await saveScreenshot(page, options.evidenceDir,
      `H5.S1.M3-A_WEB-${options.runId}-${invocationId}-reconciled.png`);
    await context.close();
    return {
      runId: options.runId,
      case: options.caseId,
      role: options.role,
      invocationId,
      apiActorId: actor.id,
      assertions: { swipeConflictReconciled: true, connectionSnapshotUnchanged: true },
      observations: {
        conflictStatus,
        reconciliationDeckGetCount: observation.reconciliationDeckGetCount,
        connectionCountBefore: connectionSnapshotBefore.length,
        connectionCountAfter: connectionSnapshotAfter.length,
        controlledConflict: true,
      },
      artifacts: [artifact],
    };
  } finally {
    await browser.close();
  }
}

export async function main(args = process.argv.slice(2), env = process.env) {
  try {
    process.stdout.write(`${JSON.stringify(await runH5S1M3(args, env))}\n`);
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
