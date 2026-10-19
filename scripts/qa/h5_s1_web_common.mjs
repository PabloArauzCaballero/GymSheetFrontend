import { createHash } from 'node:crypto';
import { chmod, readFile } from 'node:fs/promises';
import path from 'node:path';
import { apiData as sharedApiData } from './web-chat-driver.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const roleTimeoutMs = 120_000;

export function isDiscoveryDeckGet(method, rawUrl) {
  try {
    return method === 'GET'
      && new URL(rawUrl).pathname === '/api/backend/me/discovery/deck';
  } catch {
    return false;
  }
}

export async function authenticateActor(apiBase, token, fetchImpl = fetch) {
  const data = await sharedApiData(apiBase, token, '/auth/me', {},
    (url, options) => fetchImpl(url, { ...options, redirect: 'error' }));
  if (!uuid.test(data?.id ?? '')) throw new Error('authenticated actor ID is invalid');
  return { id: data.id };
}

export function precondition(message) {
  const error = new Error(message);
  error.name = 'PairPreconditionError';
  return error;
}

export async function openDiscoveryPage(page, webUrl) {
  try {
    await page.goto(webUrl, { waitUntil: 'domcontentloaded' });
  } catch {
    throw precondition('QA web discovery page did not respond');
  }
  if (page.url() !== webUrl) {
    throw new Error('H5 browser did not open the authenticated discovery page');
  }
}

export async function saveScreenshot(page, evidenceDir, name) {
  const filePath = path.resolve(evidenceDir, name);
  const relative = path.relative(path.resolve(evidenceDir), filePath);
  if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('H5 evidence path escaped its directory');
  }
  await page.screenshot({ path: filePath, fullPage: true, timeout: roleTimeoutMs });
  await chmod(filePath, 0o600);
  return {
    path: filePath,
    sha256: createHash('sha256').update(await readFile(filePath)).digest('hex'),
  };
}
