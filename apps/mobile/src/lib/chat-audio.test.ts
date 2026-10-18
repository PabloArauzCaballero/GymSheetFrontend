/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { messageSchema } from '@gymsheet/schemas';
import {
  chatAudioFileForUpload,
  chatAudioPlayerAccessibilityLabel,
  chatAudioPlaybackTimeLabel,
  chatAudioPlayerSource,
  chatAudioRecordingDurationLabel,
  isChatAudioDurationValid,
  isMicrophonePermissionPermanentlyDenied,
  createSerialQueue,
  voiceNoteDurationMs,
  waitForFinishedRecording,
} from './chat-audio.ts';

test('chat audio accepts only recordings from one through 120 seconds', () => {
  assert.equal(isChatAudioDurationValid(999), false);
  assert.equal(isChatAudioDurationValid(1_000), true);
  assert.equal(isChatAudioDurationValid(120_000), true);
  assert.equal(isChatAudioDurationValid(120_001), false);
});

test('chat audio uploads use the backend M4A AAC MIME and extension', () => {
  assert.deepEqual(chatAudioFileForUpload('file:///cache/recording.m4a'), {
    uri: 'file:///cache/recording.m4a',
    name: 'voice-message.m4a',
    mimeType: 'audio/mp4',
  });
});

test('chat audio exposes stable accessible recording and playback durations', () => {
  assert.equal(chatAudioRecordingDurationLabel(1_999), 'Duración de grabación: 1 segundo');
  assert.equal(chatAudioRecordingDurationLabel(2_999), 'Duración de grabación: 2 segundos');
  assert.equal(chatAudioPlaybackTimeLabel(61.9, 120), 'Progreso de audio: 1:01 de 2:00');
  assert.equal(chatAudioPlaybackTimeLabel(Number.NaN, Number.NaN), 'Progreso de audio: 0:00 de 0:00');
  assert.equal(chatAudioPlayerAccessibilityLabel(false, 0, 0), 'Cargando audio');
  assert.equal(chatAudioPlayerAccessibilityLabel(true, 0, 0), 'Cargando audio');
  assert.equal(chatAudioPlayerAccessibilityLabel(true, 0, 10), 'Progreso de audio: 0:00 de 0:10');
});

test('microphone denial is permanent only when permission cannot be requested again', () => {
  assert.equal(isMicrophonePermissionPermanentlyDenied({ granted: false, canAskAgain: false }), true);
  assert.equal(isMicrophonePermissionPermanentlyDenied({ granted: false, canAskAgain: true }), false);
  assert.equal(isMicrophonePermissionPermanentlyDenied({ granted: true, canAskAgain: false }), false);
});

test('chat audio player resolves private media paths and authenticates playback', () => {
  assert.deepEqual(
    chatAudioPlayerSource('/me/chat/media/123', 'https://api.gymsheet.test/', 'token-value'),
    {
      uri: 'https://api.gymsheet.test/me/chat/media/123',
      headers: { Authorization: 'Bearer token-value' },
    },
  );
});

test('message schema accepts backend audio messages', () => {
  const parsed = messageSchema.safeParse({
    id: '00000000-0000-4000-8000-000000000001',
    conversationId: '00000000-0000-4000-8000-000000000002',
    senderId: '00000000-0000-4000-8000-000000000003',
    body: null,
    type: 'audio',
    storyReference: null,
    mediaUrl: '/me/chat/media/voice.m4a',
    mediaMimeType: 'audio/mp4',
    viewOnce: false,
    viewed: false,
    locationLat: null,
    locationLng: null,
    createdAt: '2026-10-09T00:00:00.000Z',
  });
  assert.equal(parsed.success, true);
});

test('voice note duration trusts the wall clock when the native recorder clock is stuck at 0 (real iPhone)', () => {
  assert.equal(voiceNoteDurationMs(10_000, 13_500, 0, 0), 3_500);
  assert.equal(voiceNoteDurationMs(10_000, 13_500, 3_900), 3_900);
  assert.equal(voiceNoteDurationMs(null, 13_500, Number.NaN), 0);
});

test('a recording is uploaded only once its file is non-trivial and stopped growing', async () => {
  const sizes = [null, 0, 600, 4_000, 9_000, 9_000];
  let call = 0;
  const size = await waitForFinishedRecording(() => sizes[Math.min(call++, sizes.length - 1)] ?? null, { sleep: async () => undefined });
  assert.equal(size, 9_000);
  assert.equal(await waitForFinishedRecording(() => 0, { sleep: async () => undefined, timeoutMs: 500 }), null);
  assert.equal(await waitForFinishedRecording(() => null, { sleep: async () => undefined, timeoutMs: 500 }), null);
});

test('audio session operations never overlap and a failure does not block the next one', async () => {
  const enqueue = createSerialQueue();
  const order: string[] = [];
  let release: () => void = () => undefined;
  const first = enqueue(() => new Promise<void>((resolve) => { order.push('start-1'); release = () => { order.push('end-1'); resolve(); }; }));
  const second = enqueue(async () => { order.push('run-2'); throw new Error('falla'); });
  const third = enqueue(async () => { order.push('run-3'); return 3; });
  await Promise.resolve();
  assert.deepEqual(order, ['start-1']);
  release();
  await first;
  await assert.rejects(second);
  assert.equal(await third, 3);
  assert.deepEqual(order, ['start-1', 'end-1', 'run-2', 'run-3']);
});
