import 'server-only';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

// Capa de red autorizada para el proxy de medios. Trae medios externos en el
// servidor (nunca el navegador) con protecciones anti-SSRF: valida el destino,
// bloquea rangos privados y revalida cada redirección.
//
// El control primario contra el abuso NO está aquí sino en la ruta: solo se
// proxyan URLs con firma HMAC del servidor o de sesiones autenticadas (ver
// `media-signing.ts`). Eso deja fuera el vector de rebinding DNS para anónimos
// —no pueden ni proponer un host— y limita el residual (la resolución que hace
// `fetch` es independiente de la validación de abajo) a URLs ya confiables.
//
// Imagen y vídeo se sirven por caminos distintos **porque no se consumen
// igual**: una imagen se lee entera y se devuelve, un vídeo se reenvía como
// flujo y con soporte de `Range`. Cargar 25 MB en memoria por cada petición de
// un clip, y encima sin rangos, deja la reproducción sin búsqueda y rota en los
// navegadores que exigen 206 para empezar a reproducir.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
/**
 * Tope de un vídeo. Sale de `CHAT_MEDIA_MAX_BYTES` del backend (25 MB por
 * defecto, que es lo máximo que puede llegar a existir en el almacén) con
 * holgura para no rechazar por un margen del contenedor.
 */
const MAX_VIDEO_BYTES = 32 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_IMAGE_TYPE = /^image\/(png|jpe?g|gif|webp|avif|bmp)$/iu;
/**
 * Espejo de la parte de vídeo de `CHAT_MEDIA_ALLOWED_MIME` del backend
 * (`video/mp4,video/quicktime`), más `video/webm` porque el almacén puede
 * servir lo que se subió antes de que esa lista existiera. Nada fuera de esta
 * lista se reenvía al navegador.
 */
const ALLOWED_VIDEO_TYPE = /^video\/(mp4|quicktime|webm)$/iu;
/** Cabeceras del origen que el navegador necesita para reproducir y buscar. */
const FORWARDED_HEADERS = ['content-length', 'content-range', 'accept-ranges'] as const;

export type MediaResult =
  | {
      ok: true;
      /** 200, o 206 cuando el origen respondió al `Range` del navegador. */
      status: number;
      contentType: string;
      /** Imagen: los bytes ya leídos. Vídeo: el flujo del origen sin consumir. */
      body: ArrayBuffer | ReadableStream<Uint8Array>;
      /** Lo que haya que devolver tal cual de `FORWARDED_HEADERS`. */
      headers: Record<string, string>;
    }
  | { ok: false; status: number };

// Bloquea rangos privados/reservados para evitar SSRF hacia la red interna.
function isBlockedIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const octets = ip.split('.').map(Number);
    const a = octets[0] ?? 0;
    const b = octets[1] ?? 0;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reservado
    return false;
  }
  const low = ip.toLowerCase();
  if (low === '::1' || low === '::') return true;
  if (low.startsWith('fe80')) return true; // link-local
  if (low.startsWith('fc') || low.startsWith('fd')) return true; // ULA
  const mapped = low.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/u);
  if (mapped?.[1]) return isBlockedIp(mapped[1]);
  return false;
}

async function resolveSafeUrl(raw: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname;
  if (!host || host === 'localhost') return null;
  if (isIP(host)) return isBlockedIp(host) ? null : url;
  try {
    const records = await lookup(host, { all: true });
    if (!records.length) return null;
    if (records.some((record) => isBlockedIp(record.address))) return null;
  } catch {
    return null;
  }
  return url;
}

// Sigue redirecciones manualmente revalidando cada salto contra SSRF.
async function fetchFollowingSafeRedirects(
  start: URL,
  range: string | null,
  signal: AbortSignal,
): Promise<Response | null> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    // Registro plano y no un `Headers`: `Range` es un nombre de cabecera
    // prohibido para la implementación de `Headers` del navegador, así que
    // construirlo ahí lo dejaba caer en silencio bajo cualquier entorno con
    // vocación de navegador. Como registro llega al servidor de origen tal
    // cual, que es lo que deja a un `<video>` empezar sin descargar el clip
    // entero y saltar dentro de él. Un `<img>` nunca manda `Range`, así que la
    // ruta de imagen sigue comportándose exactamente igual que antes.
    const headers: Record<string, string> = {
      Accept: 'image/*,video/*',
      'User-Agent': 'GymSheet-Media-Proxy',
    };
    if (range) headers.Range = range;
    const response = await fetch(current, {
      redirect: 'manual',
      cache: 'no-store',
      headers,
      signal,
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return null;
      const next = await resolveSafeUrl(new URL(location, current).toString());
      if (!next) return null;
      current = next;
      continue;
    }
    return response;
  }
  return null;
}

function forwardedHeaders(upstream: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of FORWARDED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

/**
 * Trae una imagen o un vídeo del almacén y lo devuelve listo para servir.
 *
 * `range` es la cabecera homónima de la petición del navegador, o `null`. Se
 * acepta desde fuera en vez de leerla aquí para que este módulo siga sin
 * conocer el transporte: la ruta es la que habla HTTP.
 */
export async function fetchExternalMedia(
  raw: string,
  range: string | null = null,
): Promise<MediaResult> {
  const safeUrl = await resolveSafeUrl(raw);
  if (!safeUrl) return { ok: false, status: 400 };

  const controller = new AbortController();
  /*
   * El reloj cubre la fase de CABECERAS, no el cuerpo.
   *
   * Un `AbortSignal.timeout` —lo que había— corta también la descarga, y eso
   * con un vídeo es un corte a mitad de reproducción: 25 MB por una red lenta
   * tardan legítimamente más que cualquier ventana razonable para un servidor
   * que no responde. Se apaga en cuanto llegan las cabeceras y se vuelve a
   * armar solo alrededor de la lectura de la imagen, que sí está acotada.
   */
  let timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let upstream: Response | null;
  try {
    upstream = await fetchFollowingSafeRedirects(safeUrl, range, controller.signal);
  } catch {
    return { ok: false, status: 502 };
  } finally {
    clearTimeout(timer);
  }
  if (!upstream || !upstream.ok) return { ok: false, status: 502 };

  const contentType = upstream.headers.get('content-type')?.split(';')[0]?.trim() ?? '';

  if (ALLOWED_VIDEO_TYPE.test(contentType)) {
    const declared = Number(upstream.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_VIDEO_BYTES) {
      return { ok: false, status: 413 };
    }
    if (!upstream.body) return { ok: false, status: 502 };
    // Se devuelve el flujo sin tocar: el navegador consume a su ritmo y el
    // servidor no retiene el clip en memoria.
    return {
      ok: true,
      status: upstream.status,
      contentType,
      body: upstream.body,
      headers: forwardedHeaders(upstream),
    };
  }

  if (!ALLOWED_IMAGE_TYPE.test(contentType)) return { ok: false, status: 415 };

  timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let body: ArrayBuffer;
  try {
    body = await upstream.arrayBuffer();
  } catch {
    return { ok: false, status: 502 };
  } finally {
    clearTimeout(timer);
  }
  if (body.byteLength > MAX_IMAGE_BYTES) return { ok: false, status: 413 };

  return {
    ok: true,
    status: 200,
    contentType,
    body,
    headers: { 'content-length': String(body.byteLength) },
  };
}
