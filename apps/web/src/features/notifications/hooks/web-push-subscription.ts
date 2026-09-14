/**
 * Utilidades del protocolo Push del navegador, sin React ni red.
 *
 * Viven aparte del hook porque son la parte comprobable sin un navegador
 * completo: la conversión de la clave y la normalización de la suscripción son
 * exactamente donde un error no falla, sino que produce suscripciones que el
 * servicio de push rechaza después, en otro sitio y sin explicación.
 */

export const SERVICE_WORKER_URL = '/sw.js';

/**
 * `applicationServerKey` se pasa en binario. La clave viaja en base64url —sin
 * relleno y con `-`/`_` en lugar de `+`/`/`—, que es lo que `atob` no entiende:
 * hay que deshacer ambas cosas antes de decodificar.
 */
export function applicationServerKeyFrom(publicKey: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
  const base64 = (publicKey + padding).replace(/-/gu, '+').replace(/_/gu, '/');
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export type NormalizedSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * `toJSON()` declara todos sus campos opcionales porque el tipo cubre también
 * las suscripciones sin cifrado de cuerpo. La nuestra siempre las trae, pero
 * mandar al backend un objeto a medias produciría un 400 sin pista: mejor
 * detectarlo aquí y tratarlo como «esta suscripción no sirve».
 */
export function normalizeSubscription(
  subscription: PushSubscription,
): NormalizedSubscription | null {
  const serialized = subscription.toJSON();
  const p256dh = serialized.keys?.p256dh;
  const auth = serialized.keys?.auth;
  if (!serialized.endpoint || !p256dh || !auth) return null;
  return { endpoint: serialized.endpoint, keys: { p256dh, auth } };
}

/** Si este navegador puede, en principio, recibir avisos push. */
export function supportsWebPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    // Fuera de un contexto seguro el registro del worker falla sin decir por
    // qué; comprobarlo antes permite explicarlo.
    window.isSecureContext
  );
}
