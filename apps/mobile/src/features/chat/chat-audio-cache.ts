import { File, Paths } from 'expo-file-system';
import { chatAudioCacheFileName, chatAudioPlayerSource, isLocalAudioUri } from '@/lib/chat-audio';
import { env } from '@/config/env';

/** Descargas en curso: dos burbujas del mismo audio (o un remontaje de la lista) comparten una sola. */
const inFlight = new Map<string, Promise<string>>();

/**
 * Devuelve una URI local (`file://`) de la nota de voz, descargándola una sola
 * vez. Reproducir del disco evita lo que hacía lenta la reproducción en
 * streaming: AVPlayer pide varios rangos y el servidor descifra el archivo
 * entero en cada uno; además, con el token de 15 min vencido el reproductor
 * fallaba a mitad de la escucha.
 */
export function localChatAudioUri(
  messageId: string,
  mediaUrl: string,
  token: string,
  viewOnce = false,
): Promise<string> {
  if (isLocalAudioUri(mediaUrl)) return Promise.resolve(mediaUrl);
  const name = chatAudioCacheFileName(messageId, viewOnce);
  const existing = inFlight.get(name);
  if (existing) return existing;
  const run = (async () => {
    const target = new File(Paths.cache, name);
    if (!viewOnce && target.exists && target.size > 0) return target.uri;
    const source = chatAudioPlayerSource(mediaUrl, env.apiUrl, token);
    const headers = 'headers' in source ? source.headers : undefined;
    const downloaded = await File.downloadFileAsync(source.uri, target, { idempotent: true, ...(headers ? { headers } : {}) });
    return downloaded.uri;
  })().finally(() => {
    inFlight.delete(name);
  });
  inFlight.set(name, run);
  return run;
}

/** Borra la copia local de una nota de escucha única en cuanto se terminó de oír. */
export function discardChatAudio(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Es la caché del sistema: si no se pudo borrar ahora, el sistema la limpia.
  }
}

/**
 * La nota que acabo de grabar ya está en disco: al confirmarse, se copia con
 * el nombre del mensaje real para que su burbuja suene sin volver a bajarla.
 */
export function primeChatAudioCache(messageId: string, localUri: string): void {
  try {
    const target = new File(Paths.cache, chatAudioCacheFileName(messageId, false));
    if (target.exists) return;
    new File(localUri).copy(target);
  } catch {
    // Sin la copia, la burbuja la descarga del servidor como cualquier otra.
  }
}
