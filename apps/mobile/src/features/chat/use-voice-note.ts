import {
  AudioQuality,
  getRecordingPermissionsAsync,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { LocalFile } from '@/api/local-file-part';
import {
  chatAudioFileForUpload,
  createSerialQueue,
  isChatAudioDurationValid,
  isMicrophonePermissionPermanentlyDenied,
  MAX_CHAT_AUDIO_DURATION_MS,
  voiceNoteDurationMs,
  waitForFinishedRecording,
} from '@/lib/chat-audio';

/**
 * Nota de voz, no música: AAC-LC mono a 64 kbps. El `HIGH_QUALITY` de expo-audio
 * graba estéreo a 128 kbps — el doble de bytes que subir por datos móviles para
 * un micrófono que en el iPhone es mono de todos modos.
 */
export const VOICE_NOTE_RECORDING: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44_100,
  numberOfChannels: 1,
  bitRate: 64_000,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 64_000 },
};

/** El grabador para solo antes del límite del servidor (120 s). */
const RECORD_LIMIT_SECONDS = MAX_CHAT_AUDIO_DURATION_MS / 1_000 - 1;
const START_TIMEOUT_MS = 6_000;
const STOP_TIMEOUT_MS = 4_000;

export type VoiceNoteStart = 'recording' | 'permission-granted' | 'permission-denied' | 'permission-blocked';
export type VoiceNoteStop =
  | { kind: 'cancelled' }
  | { kind: 'too-short' }
  | { kind: 'ready'; file: LocalFile; durationMs: number };

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error instanceof Error ? error : new Error(String(error))); },
    );
  });
}

function recordedFileSize(uri: string): number | null {
  try {
    const file = new File(uri);
    return file.exists ? file.size : null;
  } catch {
    return null;
  }
}

/**
 * El ciclo completo de una nota de voz, pensado para lo que en el simulador no
 * se ve y en un iPhone real sí:
 *
 * - Cada operación de la sesión de audio (modo, preparar, grabar, parar) va en
 *   una cola: un `setAudioModeAsync({ allowsRecording: false })` atrasado de la
 *   nota anterior ya no puede llegar en mitad de la siguiente y pararla.
 * - Cada nota se prepara con su propio archivo (`prepareToRecordAsync` con
 *   opciones crea un grabador nuevo), en vez de reescribir siempre el mismo.
 * - Se comprueba que el micrófono de verdad empezó (`isRecording` nativo): si
 *   otra app lo tiene, se avisa en vez de «grabar» un archivo vacío.
 * - La duración sale del reloj de pared: el reloj nativo vale 0 al arrancar.
 * - Antes de subir, se espera a que el archivo esté cerrado y no esté vacío.
 * - Al abrir el chat se activa «sonar en modo silencio»: sin eso, con el
 *   interruptor del iPhone en silencio las notas de voz se reproducían mudas.
 */
export function useVoiceNote({ onLimitReached }: { onLimitReached: () => void }) {
  const recorder = useAudioRecorder(VOICE_NOTE_RECORDING);
  const enqueueRef = useRef(createSerialQueue());
  const startingRef = useRef<Promise<VoiceNoteStart> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const onLimitRef = useRef(onLimitReached);
  onLimitRef.current = onLimitReached;

  useEffect(() => {
    const enqueue = enqueueRef.current;
    void enqueue(() => setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false })).catch(() => undefined);
    return () => {
      if (!recordingRef.current) return;
      recordingRef.current = false;
      void enqueue(async () => {
        await recorder.stop();
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      }).catch(() => undefined);
    };
  }, [recorder]);

  useEffect(() => {
    if (!recording) {
      setElapsedMs(0);
      return;
    }
    const tick = setInterval(() => {
      const elapsed = voiceNoteDurationMs(startedAtRef.current, Date.now());
      setElapsedMs(elapsed);
      if (elapsed >= RECORD_LIMIT_SECONDS * 1_000) onLimitRef.current();
    }, 200);
    return () => clearInterval(tick);
  }, [recording]);

  const releaseSession = useCallback(
    () => enqueueRef.current(() => setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false })).catch(() => undefined),
    [],
  );

  const start = useCallback((): Promise<VoiceNoteStart> => {
    if (startingRef.current) return startingRef.current;
    if (recordingRef.current) return Promise.resolve('recording');
    const attempt = (async (): Promise<VoiceNoteStart> => {
      const existing = await getRecordingPermissionsAsync();
      if (!existing.granted) {
        // Con el diálogo del sistema delante el dedo ya se soltó: la próxima pulsación graba.
        const permission = existing.canAskAgain ? await requestRecordingPermissionsAsync() : existing;
        if (permission.granted) return 'permission-granted';
        return isMicrophonePermissionPermanentlyDenied(permission) ? 'permission-blocked' : 'permission-denied';
      }
      try {
        await withTimeout(enqueueRef.current(async () => {
          await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
          await recorder.prepareToRecordAsync(VOICE_NOTE_RECORDING);
          recorder.record({ forDuration: RECORD_LIMIT_SECONDS });
          if (Platform.OS === 'web') return;
          for (let check = 0; check < 6 && !recorder.isRecording; check += 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          if (!recorder.isRecording) {
            throw new Error('El micrófono no empezó a grabar. Cierra otras apps que lo usen e inténtalo de nuevo.');
          }
        }), START_TIMEOUT_MS, 'El micrófono no respondió. Inténtalo de nuevo.');
      } catch (error: unknown) {
        await enqueueRef.current(() => recorder.stop()).catch(() => undefined);
        await releaseSession();
        throw error;
      }
      startedAtRef.current = Date.now();
      recordingRef.current = true;
      setRecording(true);
      return 'recording';
    })();
    startingRef.current = attempt;
    void attempt.finally(() => {
      if (startingRef.current === attempt) startingRef.current = null;
    }).catch(() => undefined);
    return attempt;
  }, [recorder, releaseSession]);

  /** Para la grabación (esperando a que termine de arrancar si hacía falta) y deja el archivo listo para subir. */
  const stop = useCallback(async (send: boolean): Promise<VoiceNoteStop> => {
    if (startingRef.current) await startingRef.current.catch(() => undefined);
    if (!recordingRef.current) return { kind: 'cancelled' };
    recordingRef.current = false;
    setRecording(false);
    const durationMs = voiceNoteDurationMs(
      startedAtRef.current,
      Date.now(),
      recorder.currentTime * 1_000,
      recorder.getStatus().durationMillis,
    );
    startedAtRef.current = null;
    const uri = recorder.uri;
    // `stop()` es seguro aunque el grabador ya se haya parado solo (límite de 2 min).
    await withTimeout(enqueueRef.current(() => recorder.stop()), STOP_TIMEOUT_MS, 'stop').catch(() => undefined);
    await releaseSession();
    if (!send) return { kind: 'cancelled' };
    if (!isChatAudioDurationValid(durationMs)) return { kind: 'too-short' };
    if (!uri) throw new Error('No se pudo guardar la grabación. Inténtalo de nuevo.');
    if (Platform.OS !== 'web' && (await waitForFinishedRecording(() => recordedFileSize(uri))) === null) {
      throw new Error('La grabación quedó vacía. Inténtalo de nuevo.');
    }
    return { kind: 'ready', file: chatAudioFileForUpload(uri), durationMs };
  }, [recorder, releaseSession]);

  return { recording, elapsedMs, start, stop };
}
