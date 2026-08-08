import type { NextRequest } from 'next/server';

export function isTrustedMutation(request: NextRequest) {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return true;
  }
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  if (origin === request.nextUrl.origin) return true;
  // Fallback robusto (patrón OWASP: verificar Origin contra la cabecera Host). En
  // el server standalone (Docker) `request.nextUrl.origin` toma HOSTNAME (p. ej.
  // 0.0.0.0) y jamás coincide con el Origin real del navegador (localhost:PUERTO),
  // lo que bloquearía TODO login/mutación con 403. Comparar el host del Origin con
  // Host (o x-forwarded-host tras un proxy) funciona en dev, prod y contenedor.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}
