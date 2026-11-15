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

/**
 * Why the preferences button is disabled, in words, or null when it can act.
 * Neutral wording: the same card saves («Guardar preferencias») or deals the
 * deck («Buscar compañeros» in Comunidad). Same rules on web and mobile.
 */
export function discoveryPreferencesBlocker({
  genders,
  intents,
  minAge,
  maxAge,
  radiusKm,
}: {
  genders: readonly unknown[];
  intents: readonly unknown[];
  minAge: number;
  maxAge: number;
  radiusKm: number;
}): string | null {
  if (genders.length === 0) return 'Elige a quién quieres conocer.';
  if (intents.length === 0) return 'Elige qué buscas.';
  if (!(minAge >= 18) || !(maxAge >= minAge)) return 'Revisa las edades: desde 18 y la máxima no menor que la mínima.';
  if (!(radiusKm >= 1 && radiusKm <= 500)) return 'El radio va de 1 a 500 km.';
  return null;
}
