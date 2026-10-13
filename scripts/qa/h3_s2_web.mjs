#!/usr/bin/env node
// Fixed H3.S2 PAIR web drivers. Every mutation is scoped to an explicitly
// reserved fixture; API checks are independent of the authenticated UI.
import { createHash, randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const IDENT = /^[A-Za-z0-9_-]{1,80}$/u;
const ROLES = {
  'H3.S2.M1': ['A_WEB', 'B_WEB'], 'H3.S2.M2': ['A_WEB', 'B_WEB'],
  'H3.S2.M3': ['A_WEB', 'B_WEB'], 'H3.S2.M4': ['A_WEB'],
};
const ASSERTIONS = {
  'H3.S2.M1': 'requestAcceptedConnectionVisible',
  'H3.S2.M2': 'withdrawalRemovedWithoutChat',
  'H3.S2.M3': 'discardUndoRestoredCandidate',
  'H3.S2.M4': 'connectionStatusSyncedAcrossSurfaces',
};

export function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (!['--case', '--role', '--run-id', '--evidence-dir'].includes(key)
        || opts[key] || i + 1 >= args.length || args[i + 1].startsWith('--')) {
      throw new Error('invalid H3.S2 driver arguments');
    }
    opts[key] = args[++i];
  }
  if (!ROLES[opts['--case']]?.includes(opts['--role']) || !IDENT.test(opts['--run-id'] ?? '')
      || !opts['--evidence-dir']) throw new Error('invalid H3.S2 case, role, run ID, or evidence directory');
  return { caseId: opts['--case'], role: opts['--role'], runId: opts['--run-id'],
    evidenceDir: path.resolve(opts['--evidence-dir']) };
}

export function precondition(message) {
  const error = new Error(message);
  error.name = 'PairPreconditionError';
  return error;
}

export function fixtureFor(caseId, role, env) {
  const suffix = caseId.slice(-2);
  const actor = role.startsWith('A_') ? 'A' : 'B';
  if (env[`QA_H3_${suffix}_PAIR_ACK`] !== caseId) throw precondition(`${caseId} requires QA_H3_${suffix}_PAIR_ACK=${caseId}`);
  if (caseId === 'H3.S2.M1' || caseId === 'H3.S2.M2') {
    const id = env[`QA_H3_${suffix}_CONNECTION_ID`];
    if (!UUID.test(id ?? '')) throw precondition(`${caseId} requires an exact reserved connection UUID`);
    return { actor, connectionId: id };
  }
  if (caseId === 'H3.S2.M3') return { actor };
  const id = env[`QA_H3_${suffix}_TARGET_USER_ID`];
  if (!UUID.test(id ?? '')) throw precondition(`${caseId} requires an exact reserved target user UUID`);
  return { actor, targetUserId: id };
}

export async function apiData(base, token, endpoint, options = {}, fetchImpl = fetch) {
  const url = new URL(endpoint.replace(/^\/+/, ''), base.endsWith('/') ? base : `${base}/`);
  const response = await fetchImpl(url, {
    ...options,
    headers: { authorization: `Bearer ${token}`, ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: 'error',
  });
  let body;
  try { body = await response.json(); } catch { throw new Error(`invalid API response (${response.status})`); }
  if (!response.ok || body?.ok !== true || !body.data || typeof body.data !== 'object') {
    const error = new Error(`API request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body.data;
}

export function findConnection(rows, id, expectedStatus, otherId) {
  if (!Array.isArray(rows)) throw new Error('connections API returned invalid data');
  const matches = rows.filter((row) => row?.id === id);
  if (matches.length !== 1 || matches[0].status !== expectedStatus
      || (otherId && matches[0].otherUserId !== otherId)) throw new Error('reserved connection fixture does not match expected pair/status');
  return matches[0];
}

async function ownContext(pageUrl, token, apiBase) {
  const actor = await apiData(apiBase, token, '/auth/me');
  if (!UUID.test(actor?.id ?? '')) throw precondition('authenticated /auth/me identity unavailable');
  return actor;
}

async function connections(apiBase, token, status) {
  const query = status ? `?status=${status}` : '';
  return apiData(apiBase, token, `/me/connections${query}`);
}

async function conversations(apiBase, token) {
  const data = await apiData(apiBase, token, '/me/conversations');
  if (!Array.isArray(data)) throw new Error('conversations API returned invalid data');
  return data;
}

async function waitUntil(read, predicate, label, timeout = 20_000) {
  const until = Date.now() + timeout;
  let last;
  while (Date.now() < until) {
    try { last = await read(); if (predicate(last)) return last; } catch (error) { last = error; }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`${label} was not persisted/visible${last instanceof Error ? `: ${last.message}` : ''}`);
}

async function screenshot(page, dir, caseId, role, runId, invocationId) {
  const file = path.resolve(dir, `${caseId}-${role}-${runId}-${invocationId}.png`);
  if (!file.startsWith(`${path.resolve(dir)}${path.sep}`)) throw new Error('evidence escaped run directory');
  await page.screenshot({ path: file, fullPage: true, timeout: 20_000 });
  await chmod(file, 0o600);
  return { path: file, sha256: createHash('sha256').update(await readFile(file)).digest('hex') };
}

export async function dismissTour(page) {
  const closeOrSkip = page.getByRole('button', { name: /Cerrar tutorial|Omitir/u }).first();
  await closeOrSkip.waitFor({ state: 'visible', timeout: 6_000 }).catch(() => undefined);
  if (!await closeOrSkip.isVisible().catch(() => false)) return false;
  await closeOrSkip.click();
  const confirmation = page.getByRole('alertdialog', { name: 'Confirmar salida del tutorial' });
  if (await confirmation.isVisible().catch(() => false)) {
    await confirmation.getByRole('button', { name: 'Omitir tutorial', exact: true }).click();
  }
  await closeOrSkip.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  return true;
}

async function open(page, url) {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 }); }
  catch { throw precondition('QA web client is unavailable'); }
  if (page.url() !== url) throw new Error('web client redirected away from requested authenticated page');
  await dismissTour(page);
}

async function runM1(page, { role, apiBase, token, fixture, actor }) {
  const initial = await connections(apiBase, token, 'PENDING');
  const pendingRow = initial.find((r) => r.id === fixture.connectionId);
  const reserved = pendingRow ?? findConnection(await connections(apiBase, token, 'ACCEPTED'), fixture.connectionId, 'ACCEPTED', fixture.otherUserId);
  if (role === 'B_WEB' || pendingRow) {
    findConnection(initial, fixture.connectionId, 'PENDING', fixture.otherUserId);
    const expectedDirection = role === 'A_WEB' ? 'SENT' : 'RECEIVED';
    if (reserved.direction !== expectedDirection) throw precondition('reserved request direction does not match this role');
  } else {
    findConnection(await connections(apiBase, token, 'ACCEPTED'), fixture.connectionId, 'ACCEPTED', fixture.otherUserId);
  }
  await open(page, new URL('/chat', process.env.QA_WEB_BASE_URL).toString());
  await page.getByRole('tab', { name: 'Solicitudes' }).click();
  if (role === 'B_WEB') {
    const requestCard = page.getByText(reserved.otherUserName, { exact: true }).locator('..');
    await requestCard.getByRole('button', { name: 'Aceptar', exact: true }).click();
  }
  await waitUntil(async () => connections(apiBase, token, 'ACCEPTED'), (rows) => rows.some((r) => r.id === fixture.connectionId && r.status === 'ACCEPTED' && r.otherUserId === fixture.otherUserId), 'accepted connection');
  const convs = await waitUntil(() => conversations(apiBase, token), (rows) => rows.some((r) => r.otherUserId === fixture.otherUserId), 'pair chat entry');
  if (!Array.isArray(convs)) throw new Error('chat entry unavailable');
  const button = page.getByRole('tab', { name: 'Mis conexiones' });
  await button.click();
  await page.getByText((await connections(apiBase, token, 'ACCEPTED')).find((r) => r.id === fixture.connectionId).otherUserName, { exact: true }).waitFor();
  return true;
}

async function runM2(page, { role, apiBase, token, fixture }) {
  const pending = await connections(apiBase, token, 'PENDING');
  const row = pending.find((item) => item?.id === fixture.connectionId);
  if (row && (row.otherUserId !== fixture.otherUserId
      || row.direction !== (role === 'A_WEB' ? 'SENT' : 'RECEIVED'))) throw precondition('reserved request direction does not match this role');
  const existingChats = await conversations(apiBase, token);
  if (existingChats.some((c) => c.otherUserId === fixture.otherUserId)) throw precondition('reserved pending fixture already has a chat');
  const profile = await apiData(apiBase, token, `/me/gym-directory/${fixture.otherUserId}`);
  if (profile.userId !== fixture.otherUserId) throw precondition('reserved peer profile unavailable');
  const peerName = row?.otherUserName ?? profile.displayName;
  await open(page, new URL('/chat', process.env.QA_WEB_BASE_URL).toString());
  await page.getByRole('tab', { name: 'Solicitudes' }).click();
  if (role === 'A_WEB' && row) {
    const requestCard = page.getByText(row.otherUserName, { exact: true }).locator('..');
    await requestCard.getByRole('button', { name: 'Cancelar invitación de conexión', exact: true }).click();
  }
  await waitUntil(() => connections(apiBase, token, 'PENDING'), (rows) => !rows.some((r) => r.id === fixture.connectionId), 'withdrawal');
  const finalChats = await conversations(apiBase, token);
  if (finalChats.some((c) => c.otherUserId === fixture.otherUserId)) throw new Error('withdrawal unexpectedly created chat');
  await page.getByText(peerName, { exact: true }).waitFor({ state: 'detached' });
  return true;
}

async function runM3(page, { role, apiBase, token, fixture, actor }) {
  if (role === 'B_WEB') {
    await waitUntil(() => apiData(apiBase, token, '/me/interactions/passes-received'),
      (rows) => Array.isArray(rows) && rows.some((r) => r.userId === fixture.targetUserId),
      'A discard visible to B', 60_000);
    const peer = await apiData(apiBase, token, `/me/gym-directory/${fixture.targetUserId}`);
    await waitUntil(() => apiData(apiBase, token, '/me/interactions/passes-received'),
      (rows) => Array.isArray(rows) && !rows.some((r) => r.userId === fixture.targetUserId),
      'undone pass removed from recipient interactions', 60_000);
    await open(page, new URL('/interacciones', process.env.QA_WEB_BASE_URL).toString());
    await page.getByRole('tab', { name: 'Next' }).click();
    await page.getByText(peer.displayName, { exact: true }).waitFor({ state: 'detached' });
    return true;
  }
  const deck = await apiData(apiBase, token, '/me/discovery/deck?limit=30');
  if (!Array.isArray(deck) || !deck.some((item) => item.userId === fixture.targetUserId)) throw precondition('reserved target is not in A discovery deck');
  const blocksBefore = await apiData(apiBase, token, '/me/blocks');
  if (!Array.isArray(blocksBefore)) throw new Error('block list API returned invalid data');
  await open(page, new URL('/descubrir', process.env.QA_WEB_BASE_URL).toString());
  const target = deck.find((item) => item.userId === fixture.targetUserId);
  const pass = page.getByRole('button', { name: `Pasar de ${target.displayName}`, exact: true });
  try { await pass.waitFor({ state: 'visible' }); }
  catch { throw precondition('reserved target is not available in the visible discovery deck'); }
  await pass.click();
  await waitUntil(() => apiData(apiBase, token, '/me/interactions/passes-sent'), (rows) => Array.isArray(rows) && rows.some((r) => r.userId === fixture.targetUserId || r.targetUserId === fixture.targetUserId), 'discard');
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  await page.getByRole('button', { name: 'Deshacer la última decisión', exact: true }).click();
  await waitUntil(() => apiData(apiBase, token, '/me/discovery/deck?limit=30'), (rows) => Array.isArray(rows) && rows.some((r) => r.userId === fixture.targetUserId), 'restored candidate');
  await waitUntil(() => apiData(apiBase, token, '/me/interactions/passes-sent'),
    (rows) => Array.isArray(rows) && !rows.some((r) => r.userId === fixture.targetUserId || r.targetUserId === fixture.targetUserId), 'discard undo persistence');
  const blocksAfter = await apiData(apiBase, token, '/me/blocks');
  if (!Array.isArray(blocksAfter)) throw new Error('block list API returned invalid data after undo');
  const blockIds = (rows) => rows.map((row) => row.userId).sort();
  if (JSON.stringify(blockIds(blocksBefore)) !== JSON.stringify(blockIds(blocksAfter))) throw new Error('undo changed block list');
  await page.getByRole('button', { name: `Pasar de ${target.displayName}`, exact: true }).waitFor();
  return true;
}

async function runM4(page, { apiBase, token, fixture, actor }) {
  const before = await apiData(apiBase, token, `/me/gym-directory/${fixture.targetUserId}`);
  if (before.userId !== fixture.targetUserId || before.connectionStatus !== 'NONE') throw precondition('reserved target is not unconnected');
  await open(page, new URL('/comunidad', process.env.QA_WEB_BASE_URL).toString());
  const connect = page.getByRole('button', { name: `Conectar con ${before.displayName}`, exact: true });
  try { await connect.waitFor({ state: 'visible' }); }
  catch { throw precondition('reserved target is not available in the community directory'); }
  await connect.click();
  await waitUntil(() => connections(apiBase, token, 'PENDING'), (rows) => rows.some((r) => r.otherUserId === fixture.targetUserId && r.status === 'PENDING'), 'directory connection request');
  await page.goto(new URL(`/perfil/${fixture.targetUserId}`, process.env.QA_WEB_BASE_URL));
  await page.getByRole('button', { name: 'Cancelar invitación de conexión', exact: true }).waitFor();
  const profileAfter = await apiData(apiBase, token, `/me/gym-directory/${fixture.targetUserId}`);
  if (profileAfter.connectionStatus !== 'PENDING_SENT') throw new Error('profile API did not persist pending status');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Cancelar invitación de conexión', exact: true }).waitFor();
  if (await page.getByRole('button', { name: 'Conectar', exact: true }).count()) throw new Error('duplicate connect action still visible');
  return true;
}

export async function runH3S2(args, env = process.env) {
  const options = parseArgs(args);
  const tokenActor = options.role.startsWith('A_') ? 'A' : 'B';
  const token = env[`QA_TOKEN_${tokenActor}`];
  const apiBase = env.QA_API_BASE_URL;
  const webBase = env.QA_WEB_BASE_URL;
  if (!token || !apiBase || !webBase) throw precondition('H3.S2 requires this role token and API/web base URLs');
  const fixture = fixtureFor(options.caseId, options.role, env);
  if (options.caseId === 'H3.S2.M1' || options.caseId === 'H3.S2.M2') {
    fixture.otherUserId = env.QA_H3_PEER_USER_ID;
    if (!UUID.test(fixture.otherUserId ?? '')) throw precondition('H3 requires explicit QA_H3_PEER_USER_ID');
  }
  let actor;
  try { actor = await ownContext(null, token, apiBase); }
  catch { throw precondition('authenticated role identity unavailable from /auth/me'); }
  if (options.caseId === 'H3.S2.M4'
      && (fixture.targetUserId !== env.QA_H3_PEER_USER_ID || fixture.targetUserId === actor.id)) {
    throw precondition('M4 target must equal the explicitly reserved peer actor');
  }
  if (fixture.targetUserId && fixture.targetUserId === actor.id) throw precondition('fixture target must be a different actor');
  if (fixture.connectionId) {
    let current;
    try { current = await connections(apiBase, token, 'PENDING'); }
    catch { throw precondition('reserved connection state unavailable before mutation'); }
    const row = current.find((item) => item?.id === fixture.connectionId);
    if (options.caseId === 'H3.S2.M1' && options.role === 'B_WEB' && !row) {
      throw precondition('recipient cannot accept: reserved request is no longer pending');
    }
    if (row && (row.otherUserId !== fixture.otherUserId
        || row.direction !== (options.role.startsWith('A_') ? 'SENT' : 'RECEIVED'))) {
      throw precondition('reserved request does not match the declared A/B pair and role');
    }
    if (row?.requesterId && row.addresseeId
        && (row.requesterId !== (options.role.startsWith('A_') ? actor.id : fixture.otherUserId)
          || row.addresseeId !== (options.role.startsWith('A_') ? fixture.otherUserId : actor.id))) {
      throw precondition('reserved request does not belong to the declared A/B pair');
    }
    if (!row && options.caseId === 'H3.S2.M2' && options.role === 'A_WEB') {
      throw precondition('sender cannot withdraw: reserved request is no longer pending');
    }
  }
  if (options.caseId === 'H3.S2.M3') fixture.targetUserId = options.role.startsWith('A_')
    ? env.QA_H3_PEER_USER_ID : env.QA_H3_ACTOR_USER_ID;
  if (options.caseId === 'H3.S2.M3' && !UUID.test(fixture.targetUserId ?? '')) {
    throw precondition('H3.S2.M3 requires explicit QA_H3_PEER_USER_ID and QA_H3_ACTOR_USER_ID');
  }
  const invocationId = randomUUID();
  await mkdir(options.evidenceDir, { recursive: true });
  let browser;
  try { browser = await chromium.launch({ headless: true }); }
  catch { throw precondition('Playwright Chromium unavailable'); }
  try {
    const context = await browser.newContext({ viewport: { width: 1365, height: 900 }, serviceWorkers: 'block' });
    const base = new URL(webBase);
    await context.addCookies([{ name: 'gymsheet_session', value: token, url: new URL('/', base).toString(),
      httpOnly: true, secure: base.protocol === 'https:', sameSite: 'Lax' }]);
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    const common = { ...options, apiBase, token, fixture, actor };
    const accepted = options.caseId === 'H3.S2.M1' ? await runM1(page, common)
      : options.caseId === 'H3.S2.M2' ? await runM2(page, common)
        : options.caseId === 'H3.S2.M3' ? await runM3(page, common) : await runM4(page, common);
    if (accepted !== true) throw new Error('UI/API observation incomplete');
    const artifact = await screenshot(page, options.evidenceDir, options.caseId, options.role, options.runId, invocationId);
    return { runId: options.runId, case: options.caseId, role: options.role, apiActorId: actor.id,
      assertions: { [ASSERTIONS[options.caseId]]: true }, artifacts: [artifact] };
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runH3S2(process.argv.slice(2)).then((proof) => process.stdout.write(`${JSON.stringify(proof)}\n`))
    .catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = error.name === 'PairPreconditionError' ? 2 : 1; });
}
