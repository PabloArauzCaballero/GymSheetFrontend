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
/** Política de uso de Nominatim: como máximo una petición por segundo. */
const MIN_INTERVAL_MS = 1_100;
/** Más peticiones en espera que esto se rechazan en vez de encolarse sin fin. */
const MAX_QUEUED = 5;

let queue: Promise<void> = Promise.resolve();
let queued = 0;
let lastCallAt = 0;

class GeocodeBusyError extends Error {}

/**
 * Serializa las llamadas salientes de esta instancia y las espacia al ritmo
 * permitido. Con varias réplicas del BFF el límite es por réplica; para ese
 * caso conviene un proveedor de geocodificación con clave propia.
 */
function throttled<T>(task: () => Promise<T>): Promise<T> {
  if (queued >= MAX_QUEUED) return Promise.reject(new GeocodeBusyError());
  queued += 1;
  const run = queue.then(async () => {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();
    return task();
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run.finally(() => {
    queued -= 1;
  });
}

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
  const response = await throttled(() =>
    fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `GymSheet-Admin/1.0 (+${serverEnv.APP_URL})`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  );
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
  } catch (error: unknown) {
    return { ok: false, status: error instanceof GeocodeBusyError ? 429 : 503 };
  }
}

export async function reversePlace(lat: number, lng: number): Promise<GeocodeResult> {
  try {
    const payload = await nominatim('/reverse', { lat: String(lat), lon: String(lng), zoom: '18' });
    const parsed = placeSchema.safeParse(payload);
    // Un punto en medio del mar no tiene dirección: no es un error.
    return { ok: true, places: parsed.success ? [toPlace(parsed.data)] : [] };
  } catch (error: unknown) {
    return { ok: false, status: error instanceof GeocodeBusyError ? 429 : 503 };
  }
}
