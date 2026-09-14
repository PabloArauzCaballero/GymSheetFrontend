import { SERVICE_WORKER_URL, supportsWebPush } from './web-push-subscription';

/**
 * El estado de push del NAVEGADOR, como sistema externo con suscriptores.
 *
 * No es estado de React: el permiso de notificaciones y la suscripción viva
 * pertenecen al navegador, sobreviven a la pestaña y sólo se pueden leer de
 * forma asíncrona y sólo en el cliente. Modelarlo como un almacén externo
 * —`useSyncExternalStore` en el hook— evita el patrón de «leer en un efecto y
 * volcar a `useState`», que provoca renders en cascada y, sobre todo, un salto
 * visible entre lo que pintó el servidor y lo que sabe el navegador.
 *
 * Es un singleton a propósito: el navegador también lo es. Dos pestañas son dos
 * módulos distintos; dos componentes en la misma pestaña deben ver lo mismo.
 */
export type BrowserPushSnapshot = {
  readonly supported: boolean;
  readonly permission: NotificationPermission;
  /** Si este navegador tiene ya una suscripción viva. */
  readonly subscribed: boolean;
};

/** `null` significa «todavía no leído»: el servidor y el primer render. */
let snapshot: BrowserPushSnapshot | null = null;
let reading = false;
const listeners = new Set<() => void>();

function publish(value: BrowserPushSnapshot) {
  if (
    snapshot &&
    snapshot.supported === value.supported &&
    snapshot.permission === value.permission &&
    snapshot.subscribed === value.subscribed
  ) {
    return;
  }
  snapshot = value;
  for (const listener of listeners) listener();
}

/**
 * Relee el estado sin registrar nada ni pedir permiso: `getRegistration`
 * devuelve `undefined` si este navegador nunca activó los avisos, y ese es
 * justamente el caso en el que no hay que tocar nada.
 */
export async function refreshBrowserPush(): Promise<void> {
  if (!supportsWebPush()) {
    publish({ supported: false, permission: 'default', subscribed: false });
    return;
  }
  let subscribed = false;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL);
    subscribed = Boolean(registration && (await registration.pushManager.getSubscription()));
  } catch {
    subscribed = false;
  }
  publish({ supported: true, permission: Notification.permission, subscribed });
}

export function subscribeToBrowserPush(listener: () => void): () => void {
  listeners.add(listener);
  // La primera suscripción dispara la lectura; las siguientes se enganchan al
  // resultado que ya hay. `reading` evita que montar dos tarjetas a la vez
  // consulte el registro dos veces.
  if (snapshot === null && !reading) {
    reading = true;
    void refreshBrowserPush().finally(() => {
      reading = false;
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getBrowserPushSnapshot(): BrowserPushSnapshot | null {
  return snapshot;
}

/** En el servidor no hay navegador que preguntar: la interfaz muestra «comprobando». */
export function getServerBrowserPushSnapshot(): BrowserPushSnapshot | null {
  return null;
}
