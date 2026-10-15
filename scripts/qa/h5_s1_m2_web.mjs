#!/usr/bin/env node
// H5.S1.M2 A_WEB driver: show an honest empty deck and a filter route.
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
const guidance = 'No hay personas que coincidan con estos filtros por ahora. Cámbialos en Comunidad o vuelve más tarde.';
const roleTimeoutMs = 120_000;

export function validateEmptyDeckObservation(observation) {
  if (!observation || observation.emptyHeadingVisible !== true
      || observation.filterGuidanceVisible !== true
      || observation.communityHref !== '/comunidad'
      || observation.swipeActionCount !== 0
      || !Number.isSafeInteger(observation.deckGetCount) || observation.deckGetCount < 1) {
    throw new Error('H5.S1.M2 empty-deck observation is incomplete');
  }
  return true;
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!['--case', '--role', '--run-id', '--evidence-dir'].includes(key)
        || options[key] || index + 1 >= args.length || args[index + 1].startsWith('--')) {
      throw new Error('invalid H5.S1.M2 driver arguments');
    }
    options[key] = args[index + 1];
    index += 1;
  }
  if (options['--case'] !== 'H5.S1.M2' || options['--role'] !== 'A_WEB'
      || !identifier.test(options['--run-id'] ?? '') || !options['--evidence-dir']) {
    throw new Error('H5.S1.M2 A_WEB case, role, run ID, or evidence directory is invalid');
  }
  return {
    caseId: options['--case'], role: options['--role'], runId: options['--run-id'],
    evidenceDir: path.resolve(options['--evidence-dir']),
  };
}

export async function runH5S1M2(args, env = process.env) {
  const options = parseArgs(args);
  const token = env.QA_TOKEN_A;
  const apiBase = env.QA_API_BASE_URL;
  const webBase = env.QA_WEB_BASE_URL;
  if (!token || !apiBase || !webBase) {
    throw precondition('H5.S1.M2 web role requires QA_TOKEN_A and API/web base URLs');
  }
  let actor;
  try {
    actor = await authenticateActor(apiBase, token);
  } catch {
    throw precondition('H5.S1.M2 A identity is unavailable from /auth/me');
  }
  let webUrl;
  try {
    const base = new URL(webBase);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
      throw new Error('invalid web base');
    }
    webUrl = new URL('/descubrir', base);
  } catch {
    throw new Error('H5.S1.M2 web base URL is invalid');
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
    await page.route('**/api/backend/me/discovery/deck*', async (route) => {
      if (!isDiscoveryDeckGet(route.request().method(), route.request().url())) {
        await route.continue();
        return;
      }
      deckGetCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: [] }),
      });
    });

    await openDiscoveryPage(page, webUrl.toString());
    const main = page.getByRole('main');
    const emptyHeading = main.getByRole('heading', { name: 'No quedan cartas', exact: true });
    await emptyHeading.waitFor({ state: 'visible' });
    const emptyHeadingVisible = true;
    const guidanceVisible = await main.getByText(guidance, { exact: true }).isVisible();
    const communityLink = main.getByRole('link', { name: 'Comunidad', exact: true });
    const communityHref = await communityLink.getAttribute('href');
    const swipeActionCount = await main.getByRole('button', { name: /Me interesa/u }).count();
    validateEmptyDeckObservation({
      emptyHeadingVisible,
      filterGuidanceVisible: guidanceVisible,
      communityHref,
      swipeActionCount,
      deckGetCount,
    });
    const artifact = await saveScreenshot(page, options.evidenceDir,
      `H5.S1.M2-A_WEB-${options.runId}-${invocationId}-empty.png`);
    await context.close();
    return {
      runId: options.runId,
      case: options.caseId,
      role: options.role,
      invocationId,
      apiActorId: actor.id,
      assertions: { discoveryEmptyExplained: true },
      artifacts: [artifact],
    };
  } finally {
    await browser.close();
  }
}

export async function main(args = process.argv.slice(2), env = process.env) {
  try {
    process.stdout.write(`${JSON.stringify(await runH5S1M2(args, env))}\n`);
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
