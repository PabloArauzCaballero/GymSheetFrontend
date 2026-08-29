import 'server-only';
import { serverEnv } from '@/shared/config/env';

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

export async function backendRequest(path: string, input: BackendRequestOptions = {}) {
  const { token, timeoutMs, signal: externalSignal, ...requestInit } = input;
  const headers = new Headers(requestInit.headers);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
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
