import { z } from 'zod';

const responseSchema = z.object({
  places: z.array(z.object({ lat: z.number(), lng: z.number(), label: z.string() })),
});

export type Place = z.infer<typeof responseSchema>['places'][number];

/**
 * Cliente del BFF de geocodificación (`/api/geocode`). Un fallo devuelve una
 * lista vacía con `ok: false`: el selector sigue funcionando con clic en el
 * mapa o coordenadas escritas a mano.
 */
async function request(params: URLSearchParams, signal?: AbortSignal) {
  try {
    const response = await fetch(`/api/geocode?${params.toString()}`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!response.ok) return { ok: false as const, places: [] as Place[] };
    const parsed = responseSchema.safeParse(await response.json());
    return parsed.success
      ? { ok: true as const, places: parsed.data.places }
      : { ok: false as const, places: [] as Place[] };
  } catch {
    return { ok: false as const, places: [] as Place[] };
  }
}

export const geocodingClient = {
  search: (query: string, signal?: AbortSignal) =>
    request(new URLSearchParams({ q: query }), signal),
  reverse: (lat: number, lng: number, signal?: AbortSignal) =>
    request(new URLSearchParams({ lat: String(lat), lng: String(lng) }), signal),
};
