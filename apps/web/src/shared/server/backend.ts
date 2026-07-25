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
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
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
