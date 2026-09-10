import * as Location from 'expo-location';

/** No vale la pena esperar más que esto por un `fix` de GPS al cerrar una sesión. */
const LOCATION_TIMEOUT_MS = 4000;

/**
 * Ubicación para verificar la racha al finalizar un entrenamiento.
 *
 * Transparente de verdad: nunca bloquea ni lanza. Pide el permiso si todavía
 * no se preguntó — el sistema solo muestra su diálogo la primera vez, las
 * siguientes responde al instante — y si el usuario lo niega, si el GPS tarda
 * más de unos segundos, o si falla por cualquier motivo, se resuelve a `null`
 * y la sesión se finaliza igual, sin verificar.
 */
export async function captureStreakLocation(): Promise<
  { latitude: number; longitude: number } | null
> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return null;

    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOCATION_TIMEOUT_MS)),
    ]);
    if (!position) return null;

    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}
