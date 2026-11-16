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
 * May the deck be requested yet?
 *
 * Both apps already read `/me/discovery/preferences`, which says plainly whether
 * they exist (`configured`). Asking for the deck before that answer only earns a
 * 400 (the code above) that shipped builds still rely on, so new clients wait:
 * `pending` while the read is in flight, `setup` to show the form, `deck` to
 * deal. If that read itself fails, fall back to asking for the deck: the 400
 * branch above still shows the form, and an outage never hides the deck.
 */
export function discoveryDeckGate(read: {
  data?: { configured: boolean } | undefined;
  isError: boolean;
}): 'pending' | 'setup' | 'deck' {
  if (read.data) return read.data.configured ? 'deck' : 'setup';
  return read.isError ? 'deck' : 'pending';
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
