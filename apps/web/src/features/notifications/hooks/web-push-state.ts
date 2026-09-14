import type { BrowserPushSnapshot } from './web-push-browser-store';

/**
 * Estado del opt-in de avisos en ESTE navegador.
 *
 * `unsupported` el navegador no puede; `unavailable` el despliegue no lo ofrece;
 * `denied` el usuario lo bloqueó y sólo él puede revertirlo desde el navegador;
 * `idle` puede activarse; `subscribed` ya está.
 */
export type WebPushState =
  'checking' | 'unsupported' | 'unavailable' | 'denied' | 'idle' | 'subscribed';

/**
 * Cruza lo que puede el navegador con lo que ofrece el despliegue. Vive aparte
 * del hook porque es la regla que decide QUÉ lee el usuario en la tarjeta, y esa
 * decisión merece comprobarse sin montar React ni un navegador.
 */
export function resolveWebPushState(
  browser: BrowserPushSnapshot | null,
  config: { enabled: boolean } | undefined,
): WebPushState {
  if (!browser) return 'checking';
  if (!browser.supported) return 'unsupported';
  if (!config) return 'checking';
  if (!config.enabled) return 'unavailable';
  // El bloqueo manda sobre todo lo demás salvo sobre una suscripción viva: si
  // la hay, lo honesto es ofrecer darla de baja aunque el permiso se revocara
  // después, porque la fila del servidor sigue existiendo.
  if (browser.subscribed) return 'subscribed';
  if (browser.permission === 'denied') return 'denied';
  return 'idle';
}
