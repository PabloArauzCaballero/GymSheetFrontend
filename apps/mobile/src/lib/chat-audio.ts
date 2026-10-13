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

