import { createHash } from 'node:crypto';
import { chmod, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { apiData as sharedApiData, arriveAtBarrier, findReservedPairConversation, pairActorIds, remainingMs } from './web-chat-driver.mjs';

const roles = ['A_ANDROID', 'B_IOS', 'B_WEB'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const mediaPath = /^\/me\/conversations\/[0-9a-f-]{36}\/messages\/[0-9a-f-]{36}\/media$/iu;
const runFile = promisify(execFile);

export async function apiData(apiBase, token, endpoint, options = {}, fetchImpl = fetch) {
  return sharedApiData(apiBase, token, endpoint, options,
    (url, request) => fetchImpl(url, { ...request, redirect: 'error' }));
}

export async function confirmDownloadedAudio(bytes, options, actorId, deadline, rendezvous = arriveAtBarrier) {
  if (!Buffer.isBuffer(bytes) || !bytes.length) throw new Error('M2 cannot join audio-sent without downloaded bytes');
  const mediaSha256 = createHash('sha256').update(bytes).digest('hex');
  await rendezvous({ ...options, actorId, roles, name: 'audio-sent', timeoutMs: Math.min(90000, remainingMs(deadline)) });
  return mediaSha256;
}

export function buildCleanupEvidence(messageId) {
  if (!uuid.test(messageId)) throw new Error('invalid M2 cleanup message ID');
  return { messageId, tombstoneConfirmed: true, mediaEndpointUnavailable: true, physicalBlobDeletion: 'not_verified' };
}

export async function prepareEmptyWebChat(browser, webBase, token, conversationId, deadline) {
  const webUrl = new URL(`/chat/${conversationId}`, webBase);
  if (!['http:', 'https:'].includes(webUrl.protocol) || webUrl.username || webUrl.password) throw new Error('invalid web base URL');
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  await context.addCookies([{ name: 'gymsheet_session', value: token, url: new URL('/', webBase).toString(), httpOnly: true, secure: webUrl.protocol === 'https:', sameSite: 'Lax' }]);
  const page = await context.newPage();
  await page.goto(webUrl.toString(), { waitUntil: 'domcontentloaded', timeout: remainingMs(deadline) });
  if (page.url() !== webUrl.toString()) throw new Error('M2 browser did not open the authenticated reserved chat');
  const log = page.getByRole('log', { name: 'Mensajes' });
  await log.waitFor({ state: 'visible', timeout: remainingMs(deadline) });
  await log.getByText('Aún no hay mensajes. Escribe el primero y empieza la conversación.', { exact: true }).waitFor({ state: 'visible', timeout: remainingMs(deadline) });
  const composer = page.getByRole('textbox', { name: 'Mensaje', exact: true });
  await composer.waitFor({ state: 'visible', timeout: remainingMs(deadline) });
  if (!await composer.isEnabled() || await log.locator('li').count() !== 0) throw new Error('M2 browser chat is not writable and empty');
  return page;
}

export function validateAudioFixture(messages, conversationId, senderId) {
  if (!Array.isArray(messages) || messages.length !== 1) throw new Error('M2 requires exactly one fresh audio fixture');
  const message = messages[0];
  if (!uuid.test(message?.id ?? '') || message.conversationId !== conversationId
    || message.senderId !== senderId || message.type !== 'audio' || message.mediaMimeType !== 'audio/mp4' || message.viewOnce !== false
    || message.deletedAt || message.mediaUrl !== `/me/conversations/${conversationId}/messages/${message.id}/media`) {
    throw new Error('M2 audio fixture ownership or private media route mismatch');
  }
  return message;
}

export function assertDurationMatch(actual, expected, tolerance = 0.25) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || actual <= 0 || expected <= 0
    || !Number.isFinite(tolerance) || tolerance < 0 || Math.abs(actual - expected) > tolerance) {
    throw new Error('M2 browser metadata duration does not match downloaded media');
  }
  return true;
}

export function buildAudioEvidence(message, mediaSha256, durationSeconds, playerDurationSeconds, playbackSeconds) {
  assertDurationMatch(playerDurationSeconds, durationSeconds);
  if (!/^[0-9a-f]{64}$/u.test(mediaSha256) || !Number.isFinite(playbackSeconds) || playbackSeconds < 0.5) {
    throw new Error('M2 audio proof is incomplete');
  }
  return { conversationId: message.conversationId, messageId: message.id, mediaSha256,
    mediaDurationMs: Math.round(durationSeconds * 1000), playerDurationSeconds: Math.floor(playerDurationSeconds), playbackAdvanced: true };
}

export async function downloadAudio(apiBase, token, endpoint, timeoutMs, fetchImpl = fetch) {
  const base = new URL(apiBase);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password
    || !mediaPath.test(endpoint)) throw new Error('invalid private audio endpoint');
  const response = await fetchImpl(`${apiBase.replace(/\/$/u, '')}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'audio/*' }, redirect: 'error',
    signal: AbortSignal.timeout(Math.min(8000, timeoutMs)),
  });
  if (!response.ok || !response.body) throw new Error(`audio download failed (${response.status})`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > 25 * 1024 * 1024) { await response.body.cancel().catch(() => undefined); throw new Error('audio exceeds fixture size limit'); }
    chunks.push(Buffer.from(chunk));
  }
  if (!size) throw new Error('downloaded audio is empty');
  return Buffer.concat(chunks);
}

export function validateSenderMarker(marker, metadata) {
  if (marker?.runId !== metadata.runId || marker.case !== metadata.case
    || marker.invocationId !== metadata.invocationId || marker.role !== 'A_ANDROID'
    || marker.actorId !== metadata.expectedActorIds.A_ANDROID || marker.name !== 'audio-sent') {
    throw new Error('M2 sender signal identity mismatch');
  }
  return true;
}

export function assertDeletedFixture(messages, messageId, conversationId, senderId) {
  const matches = Array.isArray(messages) ? messages.filter((item) => item?.id === messageId) : [];
  if (matches.length !== 1 || matches[0].conversationId !== conversationId
    || matches[0].senderId !== senderId || !matches[0].deletedAt || matches[0].mediaUrl !== null) {
    throw new Error('M2 fixture tombstone not yet observed');
  }
  return true;
}

async function waitForDeletedFixture(apiBase, token, endpoint, message, deadline) {
  while (remainingMs(deadline) > 0) {
    const messages = await apiData(apiBase, token, endpoint, { timeoutMs: remainingMs(deadline) });
    const fixture = Array.isArray(messages) ? messages.find((item) => item?.id === message.id) : null;
    if (fixture?.deletedAt) {
      assertDeletedFixture(messages, message.id, message.conversationId, message.senderId);
      const response = await fetch(`${apiBase.replace(/\/$/u, '')}${message.mediaUrl}`, {
        headers: { Authorization: `Bearer ${token}` }, redirect: 'error',
        signal: AbortSignal.timeout(Math.min(8000, remainingMs(deadline))),
      });
      await response.body?.cancel();
      if (response.status !== 404) throw new Error('M2 deleted media endpoint did not revoke access with 404');
      return;
    }
    await delay(Math.min(200, remainingMs(deadline)));
  }
}

async function waitForSender(barrierDir, metadata, deadline) {
  while (remainingMs(deadline) > 0) {
    try {
      validateSenderMarker(JSON.parse(await readFile(path.join(barrierDir, 'audio-sent--A_ANDROID.json'), 'utf8')), metadata);
      return;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await delay(Math.min(100, remainingMs(deadline)));
  }
}

function parseArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!args[index]?.startsWith('--') || !args[index + 1]) throw new Error('invalid M2 driver arguments');
    values[args[index].slice(2)] = args[index + 1];
  }
  if (values.case !== 'H7.S4.M2' || values.role !== 'B_WEB'
    || !/^[A-Za-z0-9_-]{1,80}$/u.test(values['run-id'] ?? '')
    || !values['evidence-dir'] || !values['barrier-dir']) throw new Error('invalid M2 browser role invocation');
  return { case: values.case, role: values.role, runId: values['run-id'], evidenceDir: values['evidence-dir'], barrierDir: values['barrier-dir'] };
}

export async function runM2Web(args, env = process.env) {
  const deadline = Date.now() + 150000;
  const options = parseArgs(args);
  const token = env.QA_TOKEN_B;
  const apiBase = env.QA_API_BASE_URL;
  const webBase = env.QA_WEB_BASE_URL;
  if (!token || !apiBase || !webBase || !uuid.test(env.QA_M2_DISPOSABLE_CONVERSATION_ID ?? '')) throw new Error('M2 web credentials, bases or reserved conversation are missing');
  options.evidenceDir = await realpath(options.evidenceDir);
  options.barrierDir = await realpath(options.barrierDir);
  const relative = path.relative(options.evidenceDir, options.barrierDir);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('M2 barrier escapes evidence directory');
  const metadata = JSON.parse(await readFile(path.join(options.barrierDir, '.barrier.json'), 'utf8'));
  const own = await apiData(apiBase, token, '/auth/me', { timeoutMs: remainingMs(deadline) });
  const { actorId, peerId } = pairActorIds(metadata, options.runId, options.case, options.role, own?.id, roles);
  if (metadata.expectedActorIds.A_ANDROID !== peerId || metadata.expectedActorIds.B_IOS !== actorId) throw new Error('M2 role actor assignments are invalid');
  const conversations = await apiData(apiBase, token, '/me/conversations', { timeoutMs: remainingMs(deadline) });
  const conversationId = findReservedPairConversation(conversations, peerId, env.QA_M2_DISPOSABLE_CONVERSATION_ID);
  const historyEndpoint = `/me/conversations/${conversationId}/messages?limit=100`;
  const initial = await apiData(apiBase, token, historyEndpoint, { timeoutMs: remainingMs(deadline) });
  if (!Array.isArray(initial) || initial.length !== 0) throw new Error('M2 reserved chat must have empty initial history');
  await runFile(env.QA_FFPROBE_PATH || 'ffprobe', ['-version'], { timeout: Math.min(5000, remainingMs(deadline)), maxBuffer: 16384 });
  let temporary;
  let browser;
  let screenshotPath;
  let succeeded = false;
  try {
    browser = await chromium.launch({ headless: true, timeout: remainingMs(deadline) });
    const page = await prepareEmptyWebChat(browser, webBase, token, conversationId, deadline);
    await arriveAtBarrier({ ...options, actorId, roles, name: 'preflight-ready', timeoutMs: Math.min(90000, remainingMs(deadline)) });
    await waitForSender(options.barrierDir, metadata, deadline);
    const message = validateAudioFixture(await apiData(apiBase, token, historyEndpoint, { timeoutMs: remainingMs(deadline) }), conversationId, peerId);
    const bytes = await downloadAudio(apiBase, token, message.mediaUrl, remainingMs(deadline));
    const audioSha256 = await confirmDownloadedAudio(bytes, options, actorId, deadline);
    temporary = await mkdtemp(path.join(os.tmpdir(), 'gymsheet-h7-m2-web-'));
    await chmod(temporary, 0o700);
    const audioPath = path.join(temporary, 'fixture.audio');
    await writeFile(audioPath, bytes, { mode: 0o600, flag: 'wx' });
    const probe = await runFile(env.QA_FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', audioPath], { timeout: Math.min(8000, remainingMs(deadline)), maxBuffer: 16384 });
    const durationSeconds = Number(JSON.parse(probe.stdout)?.format?.duration);
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0.6 || durationSeconds > 120) throw new Error('M2 fixture duration must be between 0.6 and 120 seconds');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: remainingMs(deadline) });
    const audio = page.getByRole('log', { name: 'Mensajes' }).locator(`audio[aria-label="Reproducir mensaje de audio"][src="/api/backend${message.mediaUrl}"]`);
    await audio.waitFor({ state: 'visible', timeout: remainingMs(deadline) });
    if (await audio.count() !== 1) throw new Error('M2 exact audio ID did not resolve uniquely');
    await page.waitForFunction((selector) => {
      const element = document.querySelector(selector);
      return element && element.readyState >= 1 && Number.isFinite(element.duration) && element.duration > 0;
    }, `audio[src="/api/backend${message.mediaUrl}"]`, { timeout: remainingMs(deadline) });
    const browserDurationSeconds = await audio.evaluate((element) => element.duration);
    assertDurationMatch(browserDurationSeconds, durationSeconds);
    await audio.evaluate((element) => { if (element.error) throw new Error('audio media error'); element.currentTime = 0; });
    // Native media control keyboard interaction provides a browser user gesture.
    await audio.focus({ timeout: remainingMs(deadline) });
    await audio.press('Space', { timeout: remainingMs(deadline) });
    await page.waitForFunction((selector) => {
      const element = document.querySelector(selector);
      return element && !element.error && element.currentTime >= 0.5 && (!element.paused || element.ended);
    }, `audio[src="/api/backend${message.mediaUrl}"]`, { timeout: remainingMs(deadline) });
    const playbackSeconds = await audio.evaluate((element) => { element.pause(); return element.currentTime; });
    screenshotPath = path.join(options.evidenceDir, `H7.S4.M2-B_WEB-${options.runId}-${metadata.invocationId}.png`);
    await writeFile(screenshotPath, Buffer.alloc(0), { mode: 0o600, flag: 'wx' });
    await page.screenshot({ path: screenshotPath, fullPage: true, timeout: remainingMs(deadline) });
    await chmod(screenshotPath, 0o600);
    const screenshotSha256 = createHash('sha256').update(await readFile(screenshotPath)).digest('hex');
    await arriveAtBarrier({ ...options, actorId, roles, name: 'playback-verified', timeoutMs: Math.min(90000, remainingMs(deadline)) });
    await waitForDeletedFixture(apiBase, token, historyEndpoint, message, deadline);
    await arriveAtBarrier({ ...options, actorId, roles, name: 'message-deleted', timeoutMs: Math.min(90000, remainingMs(deadline)) });
    succeeded = true;
    return { runId: options.runId, case: options.case, role: options.role, apiActorId: actorId,
      assertions: { audioDurationAndPlaybackMatch: true },
      audioEvidence: buildAudioEvidence(message, audioSha256, durationSeconds, browserDurationSeconds, playbackSeconds),
      cleanupEvidence: buildCleanupEvidence(message.id),
      observations: { messageId: message.id, audioSha256, durationSeconds, browserDurationSeconds, playbackSeconds, deletedMediaAccessStatus: 404 },
      artifacts: [{ path: screenshotPath, sha256: screenshotSha256 }] };
  } finally {
    if (browser) await browser.close();
    if (temporary) await rm(temporary, { recursive: true, force: true });
    if (!succeeded && screenshotPath) await rm(screenshotPath, { force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runM2Web(process.argv.slice(2)).then((result) => process.stdout.write(`${JSON.stringify(result)}\n`)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = error.name === 'PairPreconditionError' ? 2 : 1;
  });
}
