import 'server-only';
import { z } from 'zod';
import { serverEnv } from '@/shared/config/env';

/**
 * Geocodificación de direcciones para el selector de ubicación de sedes.
 *
 * Se consulta Nominatim (OpenStreetMap) desde el servidor y no desde el
 * navegador: el destino es fijo (sin SSRF), la política de uso exige un
 * User-Agent identificable que el navegador no permite fijar, y el navegador
 * sigue hablando solo con el BFF.
 */
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const TIMEOUT_MS = 8_000;

const placeSchema = z.object({
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  display_name: z.string(),
});

export type GeocodedPlace = { lat: number; lng: number; label: string };

export type GeocodeResult = { ok: true; places: GeocodedPlace[] } | { ok: false; status: number };

async function nominatim(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(path, NOMINATIM);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('accept-language', 'es');
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': `GymSheet-Admin/1.0 (+${serverEnv.APP_URL})`,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`nominatim ${response.status}`);
  return (await response.json()) as unknown;
}

function toPlace(place: z.infer<typeof placeSchema>): GeocodedPlace {
  return { lat: place.lat, lng: place.lon, label: place.display_name };
}

export async function searchPlaces(query: string): Promise<GeocodeResult> {
  try {
    const payload = await nominatim('/search', { q: query, limit: '5' });
    const parsed = z.array(placeSchema).safeParse(payload);
    return parsed.success
      ? { ok: true, places: parsed.data.map(toPlace) }
      : { ok: false, status: 502 };
  } catch {
    return { ok: false, status: 503 };
  }
}

export async function reversePlace(lat: number, lng: number): Promise<GeocodeResult> {
  try {
    const payload = await nominatim('/reverse', { lat: String(lat), lon: String(lng), zoom: '18' });
    const parsed = placeSchema.safeParse(payload);
    // Un punto en medio del mar no tiene dirección: no es un error.
    return { ok: true, places: parsed.success ? [toPlace(parsed.data)] : [] };
  } catch {
    return { ok: false, status: 503 };
  }
}
