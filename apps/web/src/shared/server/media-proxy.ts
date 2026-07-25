import 'server-only';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

// Capa de red autorizada para el proxy de imágenes. Trae medios externos en el
// servidor (nunca el navegador) con protecciones anti-SSRF: valida el destino,
// bloquea rangos privados y revalida cada redirección.
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_CONTENT_TYPE = /^image\/(png|jpe?g|gif|webp|avif|bmp)$/iu;

export type MediaResult =
  | { ok: true; body: ArrayBuffer; contentType: string }
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
async function fetchFollowingSafeRedirects(start: URL): Promise<Response | null> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetch(current, {
      redirect: 'manual',
      cache: 'no-store',
      headers: { Accept: 'image/*', 'User-Agent': 'GymSheet-Media-Proxy' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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

export async function fetchExternalImage(raw: string): Promise<MediaResult> {
  const safeUrl = await resolveSafeUrl(raw);
  if (!safeUrl) return { ok: false, status: 400 };

  let upstream: Response | null;
  try {
    upstream = await fetchFollowingSafeRedirects(safeUrl);
  } catch {
    return { ok: false, status: 502 };
  }
  if (!upstream || !upstream.ok) return { ok: false, status: 502 };

  const contentType = upstream.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  if (!ALLOWED_CONTENT_TYPE.test(contentType)) return { ok: false, status: 415 };

  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return { ok: false, status: 413 };

  return { ok: true, body, contentType };
}
