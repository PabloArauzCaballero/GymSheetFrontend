import { createHash, randomUUID } from 'node:crypto';
import { chmod, link, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const identifier = /^[A-Za-z0-9_-]{1,80}$/u;
const caseName = /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*$/u;
const barrierTimeoutMs = 90_000;
const roleDeadlineMs = 150_000;

function m5Precondition(message) {
  const error = new Error(message);
  error.name = 'PairPreconditionError';
  return error;
}

export function pairActorIds(metadata, runId, caseId, role, actorId, roles) {
  const sortedRoles = [...roles].sort();
  if (metadata?.runId !== runId || metadata?.case !== caseId
    || JSON.stringify(metadata?.expectedRoles) !== JSON.stringify(sortedRoles)
    || !/^[0-9a-f]{32}$/u.test(metadata?.invocationId ?? '')
    || !metadata.expectedActorIds
    || Object.keys(metadata.expectedActorIds).sort().join(',') !== sortedRoles.join(',')) {
    throw new Error('barrier identity metadata mismatch');
  }
  if (!sortedRoles.includes(role) || metadata.expectedActorIds[role] !== actorId) {
    throw new Error('role actor identity mismatch');
  }
  const actorIds = sortedRoles.map((candidate) => metadata.expectedActorIds[candidate]);
  const distinctActorIds = [...new Set(actorIds)];
  if (actorIds.some((id) => typeof id !== 'string' || !id)
    || distinctActorIds.length !== 2 || !distinctActorIds.includes(actorId)) {
    throw new Error('expected exactly two distinct pair actors');
  }
  const peerId = distinctActorIds.find((id) => id !== actorId);
  return { actorId, peerId };
}

export async function apiData(apiBase, token, endpoint, options = {}, fetchImpl = fetch) {
  const base = new URL(apiBase);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('invalid API base URL');
  }
  if (typeof endpoint !== 'string' || !endpoint.startsWith('/') || endpoint.includes('..')) {
    throw new Error('invalid API endpoint');
  }
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  let body;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  const timeoutMs = Math.min(8_000, options.timeoutMs ?? 8_000);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('invalid API timeout');
  const response = await fetchImpl(`${apiBase.replace(/\/$/u, '')}${endpoint}`, {
    method: options.method ?? 'GET',
    headers,
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  let envelope;
  try {
    envelope = await response.json();
  } catch {
    throw new Error(`API returned invalid JSON (${response.status})`);
  }
  if (response.status === 403 && options.pairConnectionPrecondition === true
    && options.method === 'POST' && endpoint === '/me/conversations') {
    const error = new Error('A/B pair is not an accepted chat connection');
    error.name = 'PairPreconditionError';
    throw error;
  }
  if (!response.ok || envelope?.ok !== true || !Object.hasOwn(envelope, 'data')) {
    throw new Error(`API request failed (${response.status})`);
  }
  return envelope.data;
}

export async function startPairConversation(apiBase, token, peerId, fetchImpl = fetch) {
  const result = await apiData(apiBase, token, '/me/conversations', {
    method: 'POST', body: { otherUserId: peerId }, pairConnectionPrecondition: true,
  }, fetchImpl);
  if (typeof result?.conversationId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(result.conversationId)) {
    throw new Error('pair conversation response is invalid');
  }
  return result.conversationId;
}

export function assertDisposableConversation(conversationId, reservedConversationId) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
  if (typeof conversationId !== 'string' || !uuid.test(conversationId)
    || typeof reservedConversationId !== 'string' || !uuid.test(reservedConversationId)) {
    throw new Error('M4 requires a valid reserved disposable conversation UUID');
  }
  if (conversationId.toLowerCase() !== reservedConversationId.toLowerCase()) {
    throw new Error('assigned pair conversation does not match the reserved disposable conversation');
  }
  return conversationId;
}

export function assertM5DisposablePair(conversationId, connectionId,
  reservedConversationId, reservedConnectionId) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
  if (![conversationId, connectionId, reservedConversationId, reservedConnectionId]
    .every((value) => typeof value === 'string' && uuid.test(value))) {
    throw m5Precondition('M5 requires valid reserved disposable conversation and connection UUIDs');
  }
  if (conversationId.toLowerCase() !== reservedConversationId.toLowerCase()) {
    throw m5Precondition('assigned conversation does not match the reserved disposable conversation');
  }
  if (connectionId.toLowerCase() !== reservedConnectionId.toLowerCase()) {
    throw m5Precondition('assigned connection does not match the reserved disposable connection');
  }
  return { conversationId, connectionId };
}

export function findM5ReservedConversation(conversations, peerId, reservedId) {
  if (!Array.isArray(conversations)) throw new Error('conversation list is invalid');
  const pair = conversations.filter((item) => item?.otherUserId === peerId && item?.systemKind == null);
  if (pair.length !== 1) throw m5Precondition('expected exactly one active conversation for the assigned pair');
  if (pair[0]?.conversationId !== reservedId || pair[0]?.canWrite !== true) {
    throw m5Precondition('active conversation does not match the reserved writable conversation');
  }
  return reservedId;
}

export function findM5ReservedConnection(connections, peerId, reservedId) {
  if (!Array.isArray(connections)) throw new Error('connection list is invalid');
  const pair = connections.filter((item) => item?.status === 'ACCEPTED'
    && item?.otherUserId === peerId);
  if (pair.length !== 1) throw m5Precondition('expected exactly one accepted connection for the assigned peer');
  if (pair[0]?.id !== reservedId) {
    throw m5Precondition('accepted connection does not match the reserved disposable connection');
  }
  return reservedId;
}

export function assertM5ConnectionRevoked(connections, peerId, connectionId) {
  if (!Array.isArray(connections)) throw new Error('connection list is invalid');
  if (connections.some((item) => item?.id === connectionId
    || (item?.otherUserId === peerId && item?.status === 'ACCEPTED'))) {
    throw new Error('reserved accepted connection remains after revocation');
  }
  return true;
}

export function validateM5History(messages, conversationId) {
  if (!Array.isArray(messages)) throw new Error('conversation history is invalid');
  if (messages.some((message) => message?.conversationId !== conversationId)) {
    throw m5Precondition('history contains a message from another conversation');
  }
  const text = messages.find((message) => message?.type === 'text'
    && typeof message?.body === 'string' && message.body.trim());
  const image = messages.find((message) => message?.type === 'image'
    && typeof message?.id === 'string' && typeof message?.mediaUrl === 'string'
    && message.mediaUrl.startsWith('/'));
  if (!text) throw m5Precondition('reserved conversation has no visible text fixture');
  if (!image) throw m5Precondition('reserved conversation has no accessible image fixture');
  return { textBody: text.body, imageMessageId: image.id,
    mediaEndpoint: `/me/conversations/${encodeURIComponent(conversationId)}`
      + `/messages/${encodeURIComponent(image.id)}/media` };
}

export async function apiStatus(apiBase, token, endpoint, options = {}, fetchImpl = fetch) {
  const base = new URL(apiBase);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('invalid API base URL');
  }
  if (typeof endpoint !== 'string' || !endpoint.startsWith('/') || endpoint.includes('..')) {
    throw new Error('invalid API endpoint');
  }
  const response = await fetchImpl(`${apiBase.replace(/\/$/u, '')}${endpoint}`, {
    method: options.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(Math.min(8_000, options.timeoutMs ?? 8_000)),
  });
  return response.status;
}

export function findReservedPairConversation(conversations, peerId, reservedConversationId) {
  assertDisposableConversation(reservedConversationId, reservedConversationId);
  if (!Array.isArray(conversations)) {
    throw new Error('conversation list is invalid');
  }
  const matches = conversations.filter((item) => item?.conversationId === reservedConversationId
    && item?.otherUserId === peerId && item?.systemKind == null && item?.canWrite === true);
  if (matches.length !== 1) {
    const error = new Error('reserved disposable conversation was not found exactly once for the assigned peer');
    error.name = 'PairPreconditionError';
    throw error;
  }
  return matches[0].conversationId;
}

export function assertM4RestorableSettings(settings) {
  if (settings?.enabled !== true || settings.conversationOverride !== true
    || !Number.isSafeInteger(settings.version) || settings.version < 0) {
    const error = new Error('M4 requires an explicitly enabled conversation preference');
    error.name = 'PairPreconditionError';
    throw error;
  }
  return settings;
}

export function assertM4PeerReceiptsEnabled(settings) {
  if (settings?.enabled !== true) {
    const error = new Error('B must enable read receipts before the baseline fixture is sent');
    error.name = 'PairPreconditionError';
    throw error;
  }
  return true;
}

export function assertM4ReceiptSettings(settings, enabled, conversationOverride) {
  if (settings?.enabled !== enabled || settings?.conversationOverride !== conversationOverride) {
    throw new Error('read receipt preference did not reach the expected conversation state');
  }
  return true;
}

export function findOwnedRunMessage(messages, conversationId, senderId, body) {
  if (!Array.isArray(messages)) return null;
  return messages.find((message) => message?.conversationId === conversationId
    && message?.senderId === senderId && message?.body === body) ?? null;
}

export function fixtureBodies(runId, invocationId) {
  if (!identifier.test(runId) || !/^[0-9a-f]{32}$/u.test(invocationId)) {
    throw new Error('invalid fixture identity');
  }
  const prefix = `H7.S4.M3 ${runId} ${invocationId}`;
  return { originalBody: `${prefix} original`, editedBody: `${prefix} edited` };
}

export function remainingMs(deadline, now = Date.now()) {
  const remaining = deadline - now;
  if (!Number.isFinite(remaining) || remaining <= 0) {
    throw new Error('role deadline exceeded');
  }
  return Math.ceil(remaining);
}

export async function waitForOwnedRunMessage(apiBase, token, conversationId, senderId,
  body, timeoutMs = barrierTimeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = Math.max(1, deadline - Date.now());
    const messages = await apiData(apiBase, token,
      `/me/conversations/${encodeURIComponent(conversationId)}/messages?limit=100`,
      { timeoutMs: remaining });
    const message = findOwnedRunMessage(messages, conversationId, senderId, body);
    if (message) return message;
    await delay(Math.min(250, Math.max(0, deadline - Date.now())));
  }
  throw new Error('pair-owned message was not observed before timeout');
}

export async function arriveAtBarrier(options) {
  const { evidenceDir, barrierDir, runId, role, actorId, roles, name,
    timeoutMs = barrierTimeoutMs } = options;
  const caseId = options.caseId ?? options.case;
  if (!identifier.test(runId) || !caseName.test(caseId) || !identifier.test(role)
    || !identifier.test(name) || !roles.includes(role)) {
    throw new Error('invalid barrier identity');
  }
  const root = await realpath(evidenceDir);
  const directory = await realpath(barrierDir);
  const relative = path.relative(root, directory);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error('barrier directory is outside evidence directory');
  }
  const metadata = JSON.parse(await readFile(path.join(directory, '.barrier.json'), 'utf8'));
  pairActorIds(metadata, runId, caseId, role, actorId, roles);

  const expectedRoles = [...roles].sort();
  const marker = path.join(directory, `${name}--${role}.json`);
  const temporary = path.join(directory, `.${role}.${randomUUID()}.tmp`);
  const payload = JSON.stringify({ runId, case: caseId, role, actorId, name,
    invocationId: metadata.invocationId });
  try {
    await writeFile(temporary, payload, { flag: 'wx', mode: 0o600 });
    try {
      await link(temporary, marker);
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error('role already arrived at this barrier');
      throw error;
    }
  } finally {
    await unlink(temporary).catch(() => undefined);
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const arrived = [];
    for (const expectedRole of expectedRoles) {
      const markerPath = path.join(directory, `${name}--${expectedRole}.json`);
      let observed;
      try {
        observed = JSON.parse(await readFile(markerPath, 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') continue;
        throw new Error(`invalid arrival marker for ${expectedRole}`);
      }
      if (observed.runId !== runId || observed.case !== caseId
        || observed.role !== expectedRole || observed.name !== name
        || observed.invocationId !== metadata.invocationId
        || metadata.expectedActorIds[expectedRole] !== observed.actorId) {
        throw new Error(`arrival identity mismatch for ${expectedRole}`);
      }
      arrived.push(expectedRole);
    }
    if (arrived.length === expectedRoles.length) return expectedRoles;
    await delay(Math.min(100, Math.max(0, deadline - Date.now())));
  }
  const observed = await Promise.all(expectedRoles.map(async (expectedRole) => {
    try {
      await readFile(path.join(directory, `${name}--${expectedRole}.json`), 'utf8');
      return expectedRole;
    } catch {
      return null;
    }
  }));
  const missing = expectedRoles.filter((expectedRole) => !observed.includes(expectedRole));
  throw new Error(`barrier ${name} timed out; missing roles: ${missing.join(', ')}`);
}

export function assertEditedOwnedMessage(seeded, updated, editedBody) {
  if (!seeded?.id || updated?.id !== seeded.id || updated?.body !== editedBody
    || !updated.editedAt) {
    throw new Error('edited body did not persist on the same message');
  }
  return true;
}

async function runM3WebObserver(args) {
  const deadline = Date.now() + roleDeadlineMs;
  const options = parseArgs(args);
  if (options.case !== 'H7.S4.M3' || options.role !== 'B_WEB') {
    throw new Error('this driver only supports H7.S4.M3 B_WEB');
  }
  const token = process.env.QA_TOKEN_B;
  const apiBase = process.env.QA_API_BASE_URL;
  const webBase = process.env.QA_WEB_BASE_URL;
  if (!token || !apiBase || !webBase) throw new Error('web role credentials or bases missing');
  const metadata = JSON.parse(await readFile(path.join(options.barrierDir, '.barrier.json'), 'utf8'));
  const own = await apiData(apiBase, token, '/auth/me');
  const { actorId, peerId } = pairActorIds(metadata, options.runId, options.case,
    options.role, own?.id, ['A_IOS', 'B_WEB']);
  const conversationId = await startPairConversation(apiBase, token, peerId);
  await arriveAtBarrier({ ...options, evidenceDir: options.evidenceDir, actorId,
    roles: ['A_IOS', 'B_WEB'], name: 'conversation-ready', timeoutMs: remainingMs(deadline) });

  const { originalBody, editedBody } = fixtureBodies(options.runId, metadata.invocationId);
  const seeded = await waitForOwnedRunMessage(apiBase, token, conversationId,
    metadata.expectedActorIds.A_IOS, originalBody, remainingMs(deadline));
  if (seeded.type !== 'text' || !seeded.id) throw new Error('owned text fixture is invalid');

  const webUrl = new URL(`/chat/${conversationId}`, webBase);
  const browser = await chromium.launch({ headless: true });
  let screenshotPath;
  try {
    const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
    await context.addCookies([{
      name: 'gymsheet_session',
      value: token,
      url: new URL('/', webBase).toString(),
      httpOnly: true,
      secure: webUrl.protocol === 'https:',
      sameSite: 'Lax',
    }]);
    const page = await context.newPage();
    page.setDefaultTimeout(remainingMs(deadline));
    await page.goto(webUrl.toString(), {
      waitUntil: 'domcontentloaded', timeout: remainingMs(deadline),
    });
    const log = page.getByRole('log', { name: 'Mensajes' });
    await log.getByText(originalBody, { exact: true }).waitFor({
      state: 'visible', timeout: remainingMs(deadline),
    });
    await arriveAtBarrier({ ...options, actorId, roles: ['A_IOS', 'B_WEB'],
      name: 'initial-visible', timeoutMs: remainingMs(deadline) });

    const editedText = log.getByText(editedBody, { exact: true });
    await editedText.waitFor({ state: 'visible', timeout: remainingMs(deadline) });
    const editedRow = log.locator('li').filter({ has: editedText });
    await editedRow.getByLabel('Mensaje editado').waitFor({
      state: 'visible', timeout: remainingMs(deadline),
    });
    const updated = await waitForOwnedRunMessage(apiBase, token, conversationId,
      metadata.expectedActorIds.A_IOS, editedBody, remainingMs(deadline));
    assertEditedOwnedMessage(seeded, updated, editedBody);

    screenshotPath = path.resolve(options.evidenceDir,
      `H7.S4.M3-B_WEB-${options.runId}-${metadata.invocationId}.png`);
    const evidenceRelative = path.relative(path.resolve(options.evidenceDir), screenshotPath);
    if (evidenceRelative.startsWith(`..${path.sep}`) || path.isAbsolute(evidenceRelative)) {
      throw new Error('screenshot path escaped evidence directory');
    }
    await page.screenshot({ path: screenshotPath, fullPage: true,
      timeout: remainingMs(deadline) });
    await chmod(screenshotPath, 0o600);
    await arriveAtBarrier({ ...options, actorId, roles: ['A_IOS', 'B_WEB'],
      name: 'edited-visible', timeoutMs: remainingMs(deadline) });
    await context.close();
  } finally {
    await browser.close();
  }
  const digest = createHash('sha256').update(await readFile(screenshotPath)).digest('hex');
  process.stdout.write(`${JSON.stringify({
    runId: options.runId,
    case: options.case,
    role: options.role,
    apiActorId: actorId,
    assertions: { editVisibleAcrossClients: true },
    artifacts: [{ path: screenshotPath, sha256: digest }],
  })}\n`);
}

const m4Roles = ['A_ANDROID', 'A_IOS', 'A_WEB', 'B_WEB'];

async function getConversationReceiptSettings(apiBase, token, conversationId, timeoutMs) {
  return apiData(apiBase, token,
    `/me/chat/read-receipts?conversationId=${encodeURIComponent(conversationId)}`,
    { timeoutMs });
}

async function waitForReceiptState(apiBase, token, conversationId, expected,
  timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await getConversationReceiptSettings(apiBase, token, conversationId,
      remainingMs(deadline));
    if (last?.enabled === expected.enabled
      && last?.conversationOverride === expected.conversationOverride) return last;
    await delay(Math.min(200, remainingMs(deadline)));
  }
  throw new Error('read receipt settings did not reach expected state');
}

function m4FixtureBody(runId, invocationId) {
  if (!identifier.test(runId) || !/^[0-9a-f]{32}$/u.test(invocationId)) {
    throw new Error('invalid M4 fixture identity');
  }
  return `H7.S4.M4 ${runId} ${invocationId} receipt-scope`;
}

async function exactMessageRow(log, body, timeoutMs) {
  const text = log.getByText(body, { exact: true });
  await text.waitFor({ state: 'visible', timeout: timeoutMs });
  const row = log.locator('li').filter({ has: text });
  if (await row.count() !== 1) throw new Error('M4 fixture did not resolve to one message row');
  return row;
}

async function saveM4Screenshot(page, options, metadata, state, timeoutMs) {
  const screenshotPath = path.resolve(options.evidenceDir,
    `H7.S4.M4-${options.role}-${options.runId}-${metadata.invocationId}-${state}.png`);
  const evidenceRelative = path.relative(path.resolve(options.evidenceDir), screenshotPath);
  if (evidenceRelative.startsWith(`..${path.sep}`) || path.isAbsolute(evidenceRelative)) {
    throw new Error('screenshot path escaped evidence directory');
  }
  await page.screenshot({ path: screenshotPath, fullPage: true, timeout: timeoutMs });
  await chmod(screenshotPath, 0o600);
  const digest = createHash('sha256').update(await readFile(screenshotPath)).digest('hex');
  return { path: screenshotPath, sha256: digest };
}

async function runM4WebRole(args) {
  const deadline = Date.now() + roleDeadlineMs;
  const options = parseArgs(args);
  if (options.case !== 'H7.S4.M4' || !['A_WEB', 'B_WEB'].includes(options.role)) {
    throw new Error('this driver only supports H7.S4.M4 A_WEB and B_WEB');
  }
  const actor = options.role === 'A_WEB' ? 'A' : 'B';
  const token = process.env[`QA_TOKEN_${actor}`];
  const apiBase = process.env.QA_API_BASE_URL;
  const webBase = process.env.QA_WEB_BASE_URL;
  if (!token || !apiBase || !webBase) throw new Error('web role credentials or bases missing');
  if (process.env.QA_M4_DISPOSABLE_ACCOUNT_ACK !== 'H7.S4.M4') {
    const error = new Error('M4 requires an explicit disposable-account acknowledgement');
    error.name = 'PairPreconditionError';
    throw error;
  }
  const metadata = JSON.parse(await readFile(path.join(options.barrierDir, '.barrier.json'), 'utf8'));
  const own = await apiData(apiBase, token, '/auth/me', { timeoutMs: remainingMs(deadline) });
  const { actorId, peerId } = pairActorIds(metadata, options.runId, options.case,
    options.role, own?.id, m4Roles);
  const reservedConversationId = assertDisposableConversation(
    process.env.QA_DISPOSABLE_CONVERSATION_ID,
    process.env.QA_DISPOSABLE_CONVERSATION_ID,
  );
  const conversationRows = await apiData(apiBase, token, '/me/conversations',
    { timeoutMs: remainingMs(deadline) });
  const conversationId = findReservedPairConversation(conversationRows, peerId,
    reservedConversationId);

  let initialSettings;
  if (options.role === 'A_WEB') {
    initialSettings = assertM4RestorableSettings(await getConversationReceiptSettings(
      apiBase, token, conversationId, remainingMs(deadline)));
  } else {
    assertM4PeerReceiptsEnabled(await getConversationReceiptSettings(
      apiBase, token, conversationId, remainingMs(deadline)));
  }

  const webUrl = new URL(`/chat/${conversationId}`, webBase);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  let page;
  let changedSettingsVersion;
  let fixtureMessageId;
  let restored = false;
  let roleError;
  const artifacts = [];
  const body = m4FixtureBody(options.runId, metadata.invocationId);
  try {
    await context.addCookies([{
      name: 'gymsheet_session', value: token,
      url: new URL('/', webBase).toString(), httpOnly: true,
      secure: webUrl.protocol === 'https:', sameSite: 'Lax',
    }]);
    page = await context.newPage();
    page.setDefaultTimeout(remainingMs(deadline));
    await page.goto(webUrl.toString(), {
      waitUntil: 'domcontentloaded', timeout: remainingMs(deadline),
    });
    const log = page.getByRole('log', { name: 'Mensajes' });
    if (options.role === 'A_WEB') {
      await page.getByLabel('Más opciones de conversación').click({ timeout: remainingMs(deadline) });
      await page.getByRole('button', { name: 'Desactivar solo en este chat', exact: true })
        .waitFor({ state: 'visible', timeout: remainingMs(deadline) });
    }
    await arriveAtBarrier({ ...options, actorId, roles: m4Roles,
      name: 'conversation-ready', timeoutMs: remainingMs(deadline) });

    if (options.role === 'B_WEB') {
      const input = page.getByRole('textbox', { name: 'Mensaje', exact: true });
      await input.fill(body, { timeout: remainingMs(deadline) });
      await page.getByRole('button', { name: 'Enviar', exact: true })
        .click({ timeout: remainingMs(deadline) });
      const sentRow = await exactMessageRow(log, body, remainingMs(deadline));
      const ownMessage = await waitForOwnedRunMessage(apiBase, token, conversationId,
        actorId, body, remainingMs(deadline));
      if (!ownMessage?.id || ownMessage.type !== 'text') {
        throw new Error('M4 fixture message is not an owned text message');
      }
      fixtureMessageId = ownMessage.id;
      await sentRow.waitFor({ state: 'visible', timeout: remainingMs(deadline) });
    }
    await arriveAtBarrier({ ...options, actorId, roles: m4Roles,
      name: 'fixture-sent', timeoutMs: remainingMs(deadline) });

    await page.reload({ waitUntil: 'domcontentloaded', timeout: remainingMs(deadline) });
    const messageRow = await exactMessageRow(page.getByRole('log', { name: 'Mensajes' }),
      body, remainingMs(deadline));
    if (options.role === 'B_WEB') {
      await messageRow.getByLabel('Leído', { exact: true }).waitFor({
        state: 'visible', timeout: remainingMs(deadline),
      });
    } else {
      await page.getByLabel('Más opciones de conversación').click({ timeout: remainingMs(deadline) });
      await page.getByRole('button', { name: 'Desactivar solo en este chat', exact: true })
        .waitFor({ state: 'visible', timeout: remainingMs(deadline) });
    }
    artifacts.push(await saveM4Screenshot(page, options, metadata, 'initial-read',
      remainingMs(deadline)));
    if (options.role === 'A_WEB') {
      await page.getByLabel('Más opciones de conversación').click({ timeout: remainingMs(deadline) });
    }
    await arriveAtBarrier({ ...options, actorId, roles: m4Roles,
      name: 'initial-read-visible', timeoutMs: remainingMs(deadline) });

    if (options.role === 'A_WEB') {
      await page.getByLabel('Más opciones de conversación').click({ timeout: remainingMs(deadline) });
      await page.getByRole('button', { name: 'Elegir conversaciones…', exact: true })
        .click({ timeout: remainingMs(deadline) });
      const selection = page.locator('[aria-label="Conversaciones para configurar visto"]');
      const checkboxes = selection.locator('input[type="checkbox"]');
      const checked = [];
      for (let index = 0; index < await checkboxes.count(); index += 1) {
        if (await checkboxes.nth(index).isChecked()) checked.push(index);
      }
      if (checked.length !== 1) throw new Error('M4 must select only the active pair conversation');
      artifacts.push(await saveM4Screenshot(page, options, metadata, 'selected',
        remainingMs(deadline)));
      const beforeMutation = await getConversationReceiptSettings(apiBase, token, conversationId,
        remainingMs(deadline));
      assertM4ReceiptSettings(beforeMutation, true, true);
      if (beforeMutation.version !== initialSettings.version) {
        throw new Error('M4 preference changed concurrently before the selected-scope write');
      }
      changedSettingsVersion = beforeMutation.version + 1;
      const writeResponsePromise = page.waitForResponse((response) => {
        const requestUrl = new URL(response.url());
        return requestUrl.pathname.endsWith('/me/chat/read-receipts')
          && response.request().method() === 'PUT';
      }, { timeout: remainingMs(deadline) });
      await page.getByRole('button', { name: 'Desactivar seleccionados', exact: true })
        .click({ timeout: remainingMs(deadline) });
      const writeResponse = await writeResponsePromise;
      if (!writeResponse.ok()) throw new Error(`M4 selected-scope write failed (${writeResponse.status()})`);
      const writeEnvelope = await writeResponse.json();
      const returnedSettings = writeEnvelope?.data ?? writeEnvelope;
      if (returnedSettings?.version !== changedSettingsVersion) {
        throw new Error('M4 selected-scope write returned an unexpected preference version');
      }
      const disabled = await waitForReceiptState(apiBase, token, conversationId,
        { enabled: false, conversationOverride: false }, remainingMs(deadline));
      if (disabled.version !== changedSettingsVersion) {
        throw new Error('M4 selected-scope write did not advance the preference version');
      }
      await page.getByRole('button', { name: 'Ocultar selección', exact: true })
        .click({ timeout: remainingMs(deadline) });
      await page.getByRole('button', { name: 'Activar solo en este chat', exact: true })
        .waitFor({ state: 'visible', timeout: remainingMs(deadline) });
    } else {
      await messageRow.getByLabel('Entregado', { exact: true }).waitFor({
        state: 'visible', timeout: remainingMs(deadline),
      });
    }
    artifacts.push(await saveM4Screenshot(page, options, metadata, 'disabled',
      remainingMs(deadline)));
    await arriveAtBarrier({ ...options, actorId, roles: m4Roles,
      name: 'disabled-visible', timeoutMs: remainingMs(deadline) });

    if (options.role === 'A_WEB') {
      const current = await getConversationReceiptSettings(apiBase, token, conversationId,
        remainingMs(deadline));
      if (current.version !== changedSettingsVersion || current.enabled !== false
        || current.conversationOverride !== false) {
        throw new Error('M4 cleanup found a concurrent preference change; leaving settings untouched');
      }
      await apiData(apiBase, token, '/me/chat/read-receipts', {
        method: 'PUT', body: { scope: 'CONVERSATION', conversationId, enabled: true,
          expectedVersion: changedSettingsVersion }, timeoutMs: remainingMs(deadline),
      });
      const restoredSettings = await waitForReceiptState(apiBase, token, conversationId,
        { enabled: true, conversationOverride: true }, remainingMs(deadline));
      if (restoredSettings.version <= changedSettingsVersion) {
        throw new Error('M4 restoration did not advance the preference version');
      }
      restored = true;
    }
    await arriveAtBarrier({ ...options, actorId, roles: m4Roles,
      name: 'restored', timeoutMs: remainingMs(deadline) });
  } catch (error) {
    roleError = error;
  }

  const cleanupErrors = [];
  try {
    if (options.role === 'A_WEB' && !restored && initialSettings) {
      const current = await getConversationReceiptSettings(apiBase, token, conversationId,
        Math.min(8_000, Math.max(1, deadline - Date.now())));
      if (current.version === changedSettingsVersion && current.enabled === false
        && current.conversationOverride === false) {
        await apiData(apiBase, token, '/me/chat/read-receipts', {
          method: 'PUT', body: { scope: 'CONVERSATION', conversationId, enabled: true,
            expectedVersion: changedSettingsVersion },
        });
        const verified = await getConversationReceiptSettings(apiBase, token, conversationId);
        assertM4ReceiptSettings(verified, true, true);
      } else if (current.version !== initialSettings.version
        && current.enabled === false && current.conversationOverride === false) {
        throw new Error('M4 cleanup refused to overwrite a concurrent preference change');
      }
    }
  } catch (error) {
    cleanupErrors.push(error);
  }
  try {
    if (options.role === 'B_WEB') {
      if (!fixtureMessageId) {
        const messages = await apiData(apiBase, token,
          `/me/conversations/${encodeURIComponent(conversationId)}/messages?limit=100`,
          { timeoutMs: 8_000 });
        const ownedFixture = findOwnedRunMessage(messages, conversationId, actorId, body);
        fixtureMessageId = ownedFixture?.id;
      }
      if (fixtureMessageId) {
        const messages = await apiData(apiBase, token,
          `/me/conversations/${encodeURIComponent(conversationId)}/messages?limit=100`,
          { timeoutMs: 8_000 });
        const ownedFixture = findOwnedRunMessage(messages, conversationId, actorId, body);
        if (ownedFixture?.id !== fixtureMessageId) {
          throw new Error('M4 cleanup refused to delete a message not owned by this invocation');
        }
        await apiData(apiBase, token,
          `/me/conversations/${encodeURIComponent(conversationId)}/messages/`
            + `${encodeURIComponent(fixtureMessageId)}?scope=EVERYONE`,
          { method: 'DELETE', timeoutMs: 8_000 });
      }
    }
  } catch (error) {
    cleanupErrors.push(error);
  }
  try {
    await context.close();
  } catch (error) {
    cleanupErrors.push(error);
  }
  try {
    await browser.close();
  } catch (error) {
    cleanupErrors.push(error);
  }
  if (roleError || cleanupErrors.length) {
    await Promise.all(artifacts.map((artifact) => unlink(artifact.path).catch(() => undefined)));
    if (roleError) {
      if (cleanupErrors.length) process.stderr.write(`M4 cleanup errors: ${cleanupErrors.length}\n`);
      throw roleError;
    }
    throw cleanupErrors[0];
  }

  process.stdout.write(`${JSON.stringify({
    runId: options.runId, case: options.case, role: options.role, apiActorId: actorId,
    assertions: { readReceiptScopeSynced: true }, artifacts,
  })}\n`);
}

const m5Roles = ['A_ANDROID', 'B_WEB'];
const m5UnavailableText = 'El historial y los archivos de esta conversación ya no están disponibles.';

async function runM5WebRole(args) {
  const deadline = Date.now() + roleDeadlineMs;
  const options = parseArgs(args);
  if (options.case !== 'H7.S4.M5' || options.role !== 'B_WEB') {
    throw new Error('this driver only supports H7.S4.M5 B_WEB');
  }
  if (!identifier.test(options.runId)) throw new Error('invalid M5 run ID');
  if (process.env.QA_M5_DISPOSABLE_PAIR_ACK !== 'H7.S4.M5') {
    const error = new Error('explicit M5 disposable-pair acknowledgement is required');
    error.name = 'PairPreconditionError';
    throw error;
  }
  const token = process.env.QA_TOKEN_B;
  const apiBase = process.env.QA_API_BASE_URL;
  const webBase = process.env.QA_WEB_BASE_URL;
  if (!token || !apiBase || !webBase) throw new Error('M5 web role credentials or bases missing');
  const reserved = assertM5DisposablePair(
    process.env.QA_M5_DISPOSABLE_CONVERSATION_ID,
    process.env.QA_M5_DISPOSABLE_CONNECTION_ID,
    process.env.QA_M5_DISPOSABLE_CONVERSATION_ID,
    process.env.QA_M5_DISPOSABLE_CONNECTION_ID,
  );
  const metadata = JSON.parse(await readFile(path.join(options.barrierDir, '.barrier.json'), 'utf8'));
  const own = await apiData(apiBase, token, '/auth/me');
  const { actorId, peerId } = pairActorIds(metadata, options.runId, options.case,
    options.role, own?.id, m5Roles);
  const conversationId = findM5ReservedConversation(
    await apiData(apiBase, token, '/me/conversations'), peerId, reserved.conversationId);
  const connectionId = findM5ReservedConnection(
    await apiData(apiBase, token, '/me/connections?status=ACCEPTED'), peerId, reserved.connectionId);
  const fixture = validateM5History(await apiData(apiBase, token,
    `/me/conversations/${encodeURIComponent(conversationId)}/messages?limit=40`), conversationId);
  if (await apiStatus(apiBase, token, fixture.mediaEndpoint) !== 200) {
    throw m5Precondition('reserved image fixture is not accessible before revocation');
  }
  await arriveAtBarrier({ ...options, actorId, roles: m5Roles, name: 'preflight-ready',
    timeoutMs: remainingMs(deadline) });

  const webUrl = new URL(`/chat/${conversationId}`, webBase);
  const browser = await chromium.launch({ headless: true });
  let screenshotPath;
  try {
    const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
    await context.addCookies([{
      name: 'gymsheet_session', value: token, url: new URL('/', webBase).toString(),
      httpOnly: true, secure: webUrl.protocol === 'https:', sameSite: 'Lax',
    }]);
    const page = await context.newPage();
    page.setDefaultTimeout(remainingMs(deadline));
    await page.goto(webUrl.toString(), { waitUntil: 'domcontentloaded',
      timeout: remainingMs(deadline) });
    const log = page.getByRole('log', { name: 'Mensajes' });
    await log.getByText(fixture.textBody, { exact: true }).waitFor({
      state: 'visible', timeout: remainingMs(deadline),
    });
    const photo = log.locator('img[alt="Foto del mensaje"]');
    try {
      await photo.waitFor({ state: 'visible', timeout: remainingMs(deadline) });
    } catch {
      throw m5Precondition('reserved image fixture is not visible in B_WEB');
    }
    if (await photo.evaluate((image) => image.naturalWidth) < 1) {
      throw m5Precondition('reserved image fixture did not load in B_WEB');
    }
    await arriveAtBarrier({ ...options, actorId, roles: m5Roles, name: 'history-visible',
      timeoutMs: remainingMs(deadline) });
    await arriveAtBarrier({ ...options, actorId, roles: m5Roles, name: 'app-backgrounded',
      timeoutMs: remainingMs(deadline) });

    const disconnected = await apiData(apiBase, token,
      `/me/connections/${encodeURIComponent(connectionId)}`, { method: 'DELETE',
        timeoutMs: remainingMs(deadline) });
    if (disconnected?.deleted !== true) throw new Error('reserved connection was not deleted');
    const connectionsAfter = await apiData(apiBase, token, '/me/connections');
    assertM5ConnectionRevoked(connectionsAfter, peerId, connectionId);
    const after = await apiData(apiBase, token, '/me/conversations');
    if (after.some((item) => item?.conversationId === conversationId)) {
      throw new Error('revoked conversation still appears in B conversation list');
    }
    const historyStatus = await apiStatus(apiBase, token,
      `/me/conversations/${encodeURIComponent(conversationId)}/messages?limit=40`);
    if (historyStatus !== 404) throw new Error('B history remained available after revocation');
    const mediaStatus = await apiStatus(apiBase, token, fixture.mediaEndpoint);
    if (mediaStatus !== 404) throw new Error('B image URL remained available after revocation');
    await arriveAtBarrier({ ...options, actorId, roles: m5Roles, name: 'conversation-revoked',
      timeoutMs: remainingMs(deadline) });
    await log.getByText(m5UnavailableText, { exact: true }).waitFor({
      state: 'visible', timeout: remainingMs(deadline),
    });
    if (await log.getByText(fixture.textBody, { exact: true }).count() !== 0
      || await log.locator('img[alt="Foto del mensaje"]').count() !== 0) {
      throw new Error('B_WEB still displays content after revocation');
    }
    screenshotPath = path.resolve(options.evidenceDir,
      `H7.S4.M5-B_WEB-${options.runId}-${metadata.invocationId}-revoked.png`);
    const relative = path.relative(path.resolve(options.evidenceDir), screenshotPath);
    if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('screenshot path escaped evidence directory');
    }
    await page.screenshot({ path: screenshotPath, fullPage: true,
      timeout: remainingMs(deadline) });
    await chmod(screenshotPath, 0o600);
    await arriveAtBarrier({ ...options, actorId, roles: m5Roles, name: 'history-cleared',
      timeoutMs: remainingMs(deadline) });
    await context.close();
  } finally {
    await browser.close();
  }
  const digest = createHash('sha256').update(await readFile(screenshotPath)).digest('hex');
  process.stdout.write(`${JSON.stringify({ runId: options.runId, case: options.case,
    role: options.role, apiActorId: actorId,
    assertions: { revokedChatClearedOnForeground: true },
    artifacts: [{ path: screenshotPath, sha256: digest }] })}\n`);
}

function parseArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key?.startsWith('--') || !args[index + 1]) throw new Error('invalid driver arguments');
    values[key.slice(2)] = args[index + 1];
    index += 1;
  }
  for (const key of ['case', 'role', 'run-id', 'evidence-dir', 'barrier-dir']) {
    if (!values[key]) throw new Error(`missing --${key}`);
  }
  return {
    case: values.case,
    role: values.role,
    runId: values['run-id'],
    evidenceDir: values['evidence-dir'],
    barrierDir: values['barrier-dir'],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const caseIndex = args.indexOf('--case');
  const selectedCase = args[caseIndex + 1];
  const run = selectedCase === 'H7.S4.M4' ? runM4WebRole
    : selectedCase === 'H7.S4.M5' ? runM5WebRole : runM3WebObserver;
  run(args).catch((error) => {
    if (error.name === 'PairPreconditionError') {
      process.stderr.write(`BLOCKED: ${error.message}\n`);
      process.exitCode = 2;
    } else {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    }
  });
}
