/**
 * Ubicación para verificar la racha al cerrar un entrenamiento.
 *
 * Lo que comparten la web y el móvil es la política, no el sensor: cuánto se
 * espera por una posición y qué cuenta como posición válida. Cada app pide la
 * ubicación con su API (`expo-location`, `navigator.geolocation`); las dos
 * terminan aquí para decidir qué se manda al backend. Nada de esto lanza: una
 * ubicación que no llega o no sirve se convierte en `null` y la sesión se
 * finaliza igual, sin verificar.
 */

export interface StreakLocation {
  readonly latitude: number;
  readonly longitude: number;
}

/** No vale la pena esperar más que esto por un `fix` de GPS al cerrar una sesión. */
export const STREAK_LOCATION_TIMEOUT_MS = 4000;

/**
 * Normaliza unas coordenadas al contrato de `PATCH /workouts/:id/finish`.
 *
 * El backend valida los rangos y rechazaría la petición entera: mejor perder la
 * verificación que perder el cierre de la sesión por un valor imposible.
 */
export function toStreakLocation(
  coords: { readonly latitude: number; readonly longitude: number } | null | undefined,
): StreakLocation | null {
  if (!coords) return null;
  const { latitude, longitude } = coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}
