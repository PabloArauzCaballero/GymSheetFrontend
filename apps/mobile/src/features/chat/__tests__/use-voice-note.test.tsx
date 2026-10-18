import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El grabador simula un iPhone real: `durationMillis` nativo se queda en 0, el
 * micrófono tarda en arrancar y el archivo aparece un poco después de `stop()`.
 */
const native = vi.hoisted(() => {
  const calls: string[] = [];
  const recorder = {
    isRecording: false,
    currentTime: 0,
    uri: 'file:///cache/ExpoAudio/recording-1.m4a',
    startsAfterChecks: 1,
    checks: 0,
    prepareToRecordAsync: vi.fn(async (options?: unknown) => {
      calls.push(`prepare:${options ? 'fresh-file' : 'same-file'}`);
    }),
    record: vi.fn((options?: { forDuration?: number }) => {
      calls.push(`record:${options?.forDuration ?? 'open'}`);
      recorder.checks = 0;
    }),
    stop: vi.fn(async () => {
      calls.push('stop');
      recorder.isRecording = false;
    }),
    getStatus: () => ({ durationMillis: 0, isRecording: recorder.isRecording, canRecord: true }),
  };
  // `isRecording` del iPhone pasa a true unos instantes después de `record()`.
  Object.defineProperty(recorder, 'isRecording', {
    get() {
      recorder.checks += 1;
      return recorder.record.mock.calls.length > 0 && recorder.stop.mock.calls.length < recorder.record.mock.calls.length && recorder.checks > recorder.startsAfterChecks;
    },
    set() {},
  });
  return {
    calls,
    recorder,
    fileSizes: [] as Array<number | null>,
    permission: { granted: true, canAskAgain: true },
  };
});

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-audio', () => ({
  AudioQuality: { HIGH: 96 },
  IOSOutputFormat: { MPEG4AAC: 'aac ' },
  getRecordingPermissionsAsync: vi.fn(async () => native.permission),
  requestRecordingPermissionsAsync: vi.fn(async () => ({ granted: true, canAskAgain: true })),
  setAudioModeAsync: vi.fn(async (mode: { allowsRecording: boolean; playsInSilentMode: boolean }) => {
    native.calls.push(`mode:${mode.allowsRecording ? 'record' : 'play'}${mode.playsInSilentMode ? '+silent' : ''}`);
  }),
  useAudioRecorder: () => native.recorder,
}));
vi.mock('expo-file-system', () => ({
  File: class {
    get exists() { return native.fileSizes.length > 0 && native.fileSizes[0] !== null; }
    get size() { return native.fileSizes.length > 1 ? native.fileSizes.shift() : native.fileSizes[0]; }
  },
}));

import { useVoiceNote, VOICE_NOTE_RECORDING } from '../use-voice-note';

beforeEach(() => {
  native.calls.length = 0;
  native.recorder.prepareToRecordAsync.mockClear();
  native.recorder.record.mockClear();
  native.recorder.stop.mockClear();
  native.recorder.startsAfterChecks = 1;
  native.fileSizes = [5_000, 9_000, 9_000];
  native.permission = { granted: true, canAskAgain: true };
});

describe('useVoiceNote', () => {
  it('al abrir el chat deja sonar el audio con el iPhone en silencio', async () => {
    renderHook(() => useVoiceNote({ onLimitReached: vi.fn() }));
    await act(async () => undefined);
    expect(native.calls[0]).toBe('mode:play+silent');
  });

  it('graba mono a 64 kbps, cada nota en su propio archivo, y la duración no depende del reloj nativo (que vale 0)', async () => {
    expect(VOICE_NOTE_RECORDING).toMatchObject({ numberOfChannels: 1, bitRate: 64_000, extension: '.m4a' });
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_000_000);
    const { result } = renderHook(() => useVoiceNote({ onLimitReached: vi.fn() }));

    await act(async () => { expect(await result.current.start()).toBe('recording'); });
    expect(native.calls).toEqual(['mode:play+silent', 'mode:record+silent', 'prepare:fresh-file', 'record:119']);
    expect(result.current.recording).toBe(true);

    now.mockReturnValue(1_002_400);
    let stopped: Awaited<ReturnType<typeof result.current.stop>> | undefined;
    await act(async () => { stopped = await result.current.stop(true); });
    expect(stopped).toEqual({
      kind: 'ready',
      durationMs: 2_400,
      file: { uri: 'file:///cache/ExpoAudio/recording-1.m4a', name: 'voice-message.m4a', mimeType: 'audio/mp4' },
    });
    expect(native.calls.slice(-2)).toEqual(['stop', 'mode:play+silent']);
    now.mockRestore();
  });

  it('soltar mientras todavía arranca espera a que arranque y luego para (no deja el micrófono abierto)', async () => {
    const { result } = renderHook(() => useVoiceNote({ onLimitReached: vi.fn() }));
    let stopped: unknown;
    await act(async () => {
      const starting = result.current.start();
      const stopping = result.current.stop(true);
      await starting;
      stopped = await stopping;
    });
    expect(native.calls).toContain('stop');
    expect(stopped).toEqual({ kind: 'too-short' });
    expect(result.current.recording).toBe(false);
  });

  it('si el micrófono no empieza a grabar (otra app lo tiene) avisa en vez de subir un archivo vacío', async () => {
    native.recorder.startsAfterChecks = 1_000;
    const { result } = renderHook(() => useVoiceNote({ onLimitReached: vi.fn() }));
    await act(async () => {
      await expect(result.current.start()).rejects.toThrow('El micrófono no empezó a grabar');
    });
    expect(native.calls.slice(-2)).toEqual(['stop', 'mode:play+silent']);
    expect(result.current.recording).toBe(false);
  });

  it('no sube una grabación cuyo archivo quedó vacío', async () => {
    native.fileSizes = [0];
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(5_000_000);
    const { result } = renderHook(() => useVoiceNote({ onLimitReached: vi.fn() }));
    await act(async () => { await result.current.start(); });
    now.mockReturnValue(5_003_000);
    await act(async () => {
      await expect(result.current.stop(true)).rejects.toThrow('La grabación quedó vacía');
    });
    now.mockRestore();
  });

  it('la primera vez pide el permiso y no graba hasta la siguiente pulsación', async () => {
    native.permission = { granted: false, canAskAgain: true };
    const { result } = renderHook(() => useVoiceNote({ onLimitReached: vi.fn() }));
    await act(async () => { expect(await result.current.start()).toBe('permission-granted'); });
    expect(native.recorder.record).not.toHaveBeenCalled();
  });
});
