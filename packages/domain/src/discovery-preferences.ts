/** Código estable del backend: la baraja de Conocer no reparte sin preferencias guardadas. */
export const DISCOVERY_PREFERENCES_REQUIRED = 'DISCOVERY_PREFERENCES_REQUIRED';

/**
 * ¿Este error de la baraja significa «aún no dijiste a quién buscas»?
 *
 * No es un fallo: es el primer paso de Comunidad, y las dos apps enseñan ahí el
 * formulario de preferencias en vez de un error con «Reintentar» que no lleva a
 * ningún sitio. Se compara el código; el texto queda solo para backends
 * anteriores al código (12/11/2026).
 */
export function needsDiscoveryPreferences(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, status, message } = error as { code?: unknown; status?: unknown; message?: unknown };
  if (code === DISCOVERY_PREFERENCES_REQUIRED) return true;
  return status === 400 && typeof message === 'string' && /preferencias de conocer/iu.test(message);
}
