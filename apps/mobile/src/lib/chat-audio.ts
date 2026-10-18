export const MIN_CHAT_AUDIO_DURATION_MS = 1_000;
export const MAX_CHAT_AUDIO_DURATION_MS = 120_000;

export type MicrophonePermission = { granted: boolean; canAskAgain?: boolean };

export function isChatAudioDurationValid(durationMs: number): boolean {
  return Number.isFinite(durationMs) &&
    durationMs >= MIN_CHAT_AUDIO_DURATION_MS &&
    durationMs <= MAX_CHAT_AUDIO_DURATION_MS;
}

export function isMicrophonePermissionPermanentlyDenied(permission: MicrophonePermission): boolean {
  return !permission.granted && permission.canAskAgain === false;
}

function formatChatAudioTime(seconds: number): string {
  const wholeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

export function chatAudioRecordingDurationLabel(durationMs: number): string {
  const seconds = Number.isFinite(durationMs) ? Math.max(0, Math.floor(durationMs / 1_000)) : 0;
  return `Duración de grabación: ${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
}

export function chatAudioPlaybackTimeLabel(currentSeconds: number, durationSeconds: number): string {
  return `Progreso de audio: ${formatChatAudioTime(currentSeconds)} de ${formatChatAudioTime(durationSeconds)}`;
}

export function chatAudioPlayerAccessibilityLabel(
  isLoaded: boolean,
  currentSeconds: number,
  durationSeconds: number,
): string {
  return isLoaded && Number.isFinite(durationSeconds) && durationSeconds > 0
    ? chatAudioPlaybackTimeLabel(currentSeconds, durationSeconds)
    : 'Cargando audio';
}

export function chatAudioFileForUpload(uri: string) {
  return { uri, name: 'voice-message.m4a', mimeType: 'audio/mp4' };
}

export function chatAudioPlayerSource(mediaUrl: string, apiUrl: string, accessToken: string) {
  const uri = /^https?:\/\//i.test(mediaUrl)
    ? mediaUrl
    : `${apiUrl.replace(/\/+$/, '')}/${mediaUrl.replace(/^\/+/, '')}`;
  return { uri, headers: { Authorization: `Bearer ${accessToken}` } };
}

/**
 * Duración real de una nota de voz. El grabador de iOS calcula `durationMillis`
 * con el reloj del dispositivo de audio, que justo después de `record()` todavía
 * vale 0 en un iPhone real: el contador se quedaba en 0:00 y, al soltar, la nota
 * «duraba» menos de un segundo y no se enviaba. El reloj de pared desde que
 * `record()` volvió manda; lo nativo solo puede alargarlo.
 */
export function voiceNoteDurationMs(startedAtMs: number | null, nowMs: number, ...nativeMs: number[]): number {
  const wall = startedAtMs === null ? 0 : Math.max(0, nowMs - startedAtMs);
  const native = nativeMs.filter((value) => Number.isFinite(value) && value > 0);
  return Math.max(wall, ...native, 0);
}

/** Por debajo de esto el M4A no tiene ni cabeceras con audio: es una grabación vacía. */
export const MIN_VOICE_NOTE_BYTES = 1_024;

/**
 * Espera a que el archivo del grabador esté cerrado antes de subirlo: existe,
 * pesa más que una cabecera vacía y su tamaño no cambia entre dos lecturas. En
 * un iPhone, `stop()` puede volver antes de que AVAudioRecorder escriba el
 * índice (`moov`) al final; subirlo a medias es un 400 «archivo no válido».
 * Devuelve el tamaño final, o `null` si no llegó a estar listo a tiempo.
 */
export async function waitForFinishedRecording(
  readSize: () => number | null,
  { timeoutMs = 2_000, intervalMs = 120, sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)) }: {
    timeoutMs?: number;
    intervalMs?: number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<number | null> {
  let previous: number | null = null;
  for (let waited = 0; waited <= timeoutMs; waited += intervalMs) {
    const size = readSize();
    if (size !== null && size >= MIN_VOICE_NOTE_BYTES && size === previous) return size;
    previous = size;
    await sleep(intervalMs);
  }
  return null;
}

/** Corre las operaciones de la sesión de audio de una en una, en orden de llegada. */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
}
