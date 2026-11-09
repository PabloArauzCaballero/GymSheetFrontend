/** Punto WGS84 en grados decimales, el formato que devuelve cualquier mapa web. */
export type LatLng = { lat: number; lng: number };

/** Centro por defecto: Bolivia, coherente con la zona horaria por defecto (America/La_Paz). */
export const DEFAULT_MAP_CENTER: LatLng = { lat: -16.5, lng: -64.7 };
export const DEFAULT_MAP_ZOOM = 5;
/** Zoom al situar una sede concreta: se distinguen calles y manzanas. */
export const PLACE_ZOOM = 16;

export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Lee una coordenada escrita a mano. Acepta coma decimal (es-BO la usa) y
 * devuelve `null` si el texto no es un número; el rango lo valida quien llama.
 */
export function parseCoordinate(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/u.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Seis decimales ≈ 11 cm: más precisión es ruido, menos desplaza la sede de la puerta. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function formatLatLng({ lat, lng }: LatLng): string {
  return `${roundCoordinate(lat).toFixed(6)}, ${roundCoordinate(lng).toFixed(6)}`;
}

/** Devuelve el punto si la entidad tiene coordenadas válidas. */
export function pointOf(entity: {
  latitud: number | null;
  longitud: number | null;
}): LatLng | null {
  if (entity.latitud === null || entity.longitud === null) return null;
  return isValidLatLng(entity.latitud, entity.longitud)
    ? { lat: entity.latitud, lng: entity.longitud }
    : null;
}

/** Enlace de indicaciones en OpenStreetMap: no requiere cuenta ni clave. */
export function directionsUrl({ lat, lng }: LatLng): string {
  return `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}#map=${PLACE_ZOOM}/${lat}/${lng}`;
}
