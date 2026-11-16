import 'server-only';
import { isIP } from 'node:net';
import { headers as incomingHeaders } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import { serverEnv } from '@/shared/config/env';
import packageJson from '../../../package.json';
import { CLIENT_PLATFORM_HEADER, WEB_CLIENT_PLATFORM } from './client-platform';
import { resolveInstallationId } from './installation-id';

export function backendUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${serverEnv.BACKEND_API_URL.replace(/\/$/u, '')}${normalized}`;
}

type BackendRequestOptions = RequestInit & {
  token?: string;
  timeoutMs?: number;
};

/**
 * Cabecera que marca un 503 fabricado AQUÍ (red caída o timeout) frente a un 503
 * que venga de verdad del backend. Sin esta marca, quien recibe la respuesta no
 * puede distinguir «el backend dijo que no» de «no pude preguntarle», y esa
 * diferencia decide si se cierra la sesión del usuario o no. Ver A-2.
 */
export const BACKEND_UNREACHABLE_HEADER = 'x-backend-unreachable';

function unavailableResponse(detail: string) {
  return new Response(
    JSON.stringify({
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
      detail,
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/problem+json',
        [BACKEND_UNREACHABLE_HEADER]: '1',
      },
    },
  );
}

/**
 * `true` cuando no se pudo obtener respuesta del backend, o cuando la que dio no
 * permite concluir nada sobre la sesión (5xx). Un 401/403 NO entra aquí: eso sí
 * es una respuesta con criterio.
 */
export function isBackendUnreachable(response: Response) {
  return response.headers.get(BACKEND_UNREACHABLE_HEADER) === '1' || response.status >= 500;
}

/**
 * Client identity the backend needs for rate limiting and audit logs: without
 * it every request appears to come from the BFF host. Only the client IP and
 * User-Agent travel; cookies and authorization from the browser never do.
 *
 * The client IP is read from the right of `x-forwarded-for`, skipping as many
 * entries as there are trusted proxies in front of Next: everything to the left
 * of that was supplied by the browser and can be forged to dodge per-IP limits.
 * `x-real-ip` is ignored for the same reason. Values that are not an IP address
 * are dropped.
 */
export function clientForwardingHeaders(
  incoming: Headers,
  trustedProxyHops: number = serverEnv.TRUSTED_PROXY_HOPS,
): Record<string, string> {
  const forwarded: Record<string, string> = {};
  const hops = (incoming.get('x-forwarded-for') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const clientIp = trustedProxyHops > 0 ? hops[hops.length - trustedProxyHops] : undefined;
  if (clientIp && isIP(clientIp) !== 0) forwarded['X-Forwarded-For'] = clientIp;
  const userAgent = incoming.get('user-agent');
  if (userAgent) forwarded['User-Agent'] = userAgent;
  return forwarded;
}

/**
 * Device headers of the web client: installation id (HttpOnly cookie owned by
 * the BFF), platform and app version. OS and model stay unset on purpose: the
 * backend already gets the User-Agent and would only be guessing from it.
 */
export async function deviceHeaders(): Promise<Record<string, string>> {
  const installationId = await resolveInstallationId();
  return {
    [CLIENT_PLATFORM_HEADER]: WEB_CLIENT_PLATFORM,
    'X-App-Version': packageJson.version,
    ...(installationId ? { 'X-Installation-Id': installationId } : {}),
  };
}

/** Incoming request headers, or none when called outside a request scope. */
async function currentRequestHeaders(): Promise<Headers | null> {
  try {
    return await incomingHeaders();
  } catch (error: unknown) {
    // Let Next's own control-flow errors (dynamic rendering bailout) through.
    unstable_rethrow(error);
    return null;
  }
}

export async function backendRequest(path: string, input: BackendRequestOptions = {}) {
  const { token, timeoutMs, signal: externalSignal, ...requestInit } = input;
  const headers = new Headers(requestInit.headers);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const incoming = await currentRequestHeaders();
  if (incoming) {
    for (const [name, value] of Object.entries(clientForwardingHeaders(incoming))) {
      if (!headers.has(name)) headers.set(name, value);
    }
  }
  for (const [name, value] of Object.entries(await deviceHeaders())) {
    if (!headers.has(name)) headers.set(name, value);
  }
  const timeoutSignal = AbortSignal.timeout(timeoutMs ?? serverEnv.BACKEND_REQUEST_TIMEOUT_MS);
  const signal = externalSignal ? AbortSignal.any([externalSignal, timeoutSignal]) : timeoutSignal;

  try {
    return await fetch(backendUrl(path), {
      ...requestInit,
      headers,
      cache: 'no-store',
      signal,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return unavailableResponse('El backend agotó el tiempo de respuesta.');
    }
    return unavailableResponse('El backend no está disponible.');
  }
}

export async function readBackendJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
