/**
 * Service worker de GymSheet: sólo notificaciones push.
 *
 * Deliberadamente NO tiene manejador `fetch`. Un service worker que intercepta
 * peticiones se convierte en una capa de caché que hay que invalidar, y aquí no
 * hace falta ninguna: el portal sirve datos autenticados que no deben quedar en
 * disco. Sin `fetch`, además, el navegador puede saltarse el arranque del worker
 * en las navegaciones normales.
 *
 * Vive en `public/` y no en `app/` porque el alcance de un service worker es la
 * carpeta desde la que se sirve: sólo servido en la raíz (`/sw.js`) puede
 * controlar todo el origen. Ver `use-web-push.ts` para el registro.
 */

const FALLBACK_TITLE = 'GymSheet';
const LANDING_PATH = '/notifications';

/**
 * Un worker recién instalado espera por defecto a que se cierren las pestañas
 * que controla el anterior. Para avisos eso significa quedarse con el código
 * viejo durante días. Aquí no hay caché que pueda quedar a medias entre
 * versiones, así que el relevo es inmediato.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * El cuerpo lo cifra el backend con las claves de ESTA suscripción, así que
 * llega ya descifrado por el navegador. Aun así se lee a la defensiva: cualquier
 * servicio de push puede entregar un aviso sin cuerpo (para "despertar" al
 * worker), y `data.json()` lanzaría.
 */
function readPayload(event) {
  if (!event.data) return {};
  try {
    const parsed = event.data.json();
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return { body: event.data.text() };
  }
}

self.addEventListener('push', (event) => {
  const payload = readPayload(event);
  const title = typeof payload.title === 'string' && payload.title ? payload.title : FALLBACK_TITLE;
  const url =
    typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : LANDING_PATH;
  // `showNotification` es obligatorio: un push que no muestra nada gasta el
  // presupuesto de "avisos silenciosos" del navegador y acaba revocando el
  // permiso. Va dentro de `waitUntil` para que el worker no se duerma antes.
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === 'string' ? payload.body : '',
      icon: '/brand-mark.svg',
      badge: '/brand-mark.svg',
      data: { url },
    }),
  );
});

/**
 * Pulsar el aviso debe llevar a la pestaña que ya está abierta, no abrir una
 * décima. Se busca una ventana del MISMO origen; si la hay se la enfoca y se la
 * navega, y sólo si no hay ninguna se abre una nueva.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || LANDING_PATH,
    self.location.origin,
  );
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (new URL(client.url).origin !== target.origin) continue;
        // `navigate` puede no estar disponible (o rechazar) en clientes que no
        // controlamos todavía; enfocar ya es el 90 % del valor.
        const focused = client.focus();
        if (typeof client.navigate === 'function') {
          return Promise.resolve(focused).then(() =>
            client.navigate(target.href).catch(() => undefined),
          );
        }
        return focused;
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
