import { z } from 'zod';
import { problemSchema } from '@gymsheet/schemas';
import { ApiError, classifyStatus } from './api-error';
import { noopTokenProvider, type TokenProvider } from './token-provider';

const successEnvelopeSchema = z.object({ ok: z.literal(true), data: z.unknown() });

export type ApiClientConfig = {
  /** Absolute backend base URL, e.g. https://api.gymsheet.app/api/v1 (mobile) or /api/backend (web BFF). */
  baseUrl: string;
  /** Supplies the bearer token. Defaults to a no-op (cookie-based clients). */
  tokenProvider?: TokenProvider;
  /** Injected fetch implementation. Defaults to global fetch (RN and modern Node both provide one). */
  fetchImpl?: typeof fetch;
  /** Default per-request timeout in milliseconds. */
  timeoutMs?: number;
  /** Called when the backend answers 401 and the session could not be renewed. */
  onUnauthorized?: () => void | Promise<void>;
  /**
   * Renews the session after a 401 (bearer clients only). `refreshed` retries
   * the request once with the new token; `rejected` ends the session
   * (`onUnauthorized`); `unavailable` keeps it and reports a network error.
   */
  refreshSession?: () => Promise<'refreshed' | 'rejected' | 'unavailable'>;
  /** Paths that never trigger a refresh (credentials, the refresh itself). */
  noRefreshPaths?: readonly string[];
};

const DEFAULT_NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  timeoutMs?: number;
};

function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `req-${Math.abs(hashString(String(performance?.now?.() ?? '')))}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

/**
 * Creates a transport-agnostic API client. Shared by web and mobile: the backend
 * contract (success envelope `{ ok, data }` + RFC7807 problem bodies) is honoured
 * identically on both platforms while the transport (BFF cookie vs. bearer token)
 * is injected.
 */
export function createApiClient(config: ApiClientConfig) {
  const tokenProvider = config.tokenProvider ?? noopTokenProvider;
  const fetchImpl = config.fetchImpl ?? fetch;
  const defaultTimeout = config.timeoutMs ?? 15_000;

  async function buildHeaders(options: RequestOptions): Promise<Headers> {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    headers.set('X-Request-ID', newRequestId());
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    const token = await tokenProvider.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  async function readError(response: Response): Promise<ApiError> {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const parsed = problemSchema.safeParse(payload);
    const message = parsed.success
      ? (parsed.data.detail ??
        parsed.data.error?.message ??
        parsed.data.title ??
        'La operación no pudo completarse.')
      : 'La operación no pudo completarse.';
    return new ApiError({
      message,
      status: response.status,
      ...(parsed.success && parsed.data.requestId ? { requestId: parsed.data.requestId } : {}),
      kind: classifyStatus(response.status),
    });
  }

  const noRefreshPaths = config.noRefreshPaths ?? DEFAULT_NO_REFRESH_PATHS;

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    return send(path, schema, options, false);
  }

  async function send<T>(
    path: string,
    schema: z.ZodType<T>,
    options: RequestOptions,
    isRetry: boolean,
  ): Promise<T> {
    const { body, timeoutMs, signal: externalSignal, ...init } = options;
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    else externalSignal?.addEventListener('abort', onExternalAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(), timeoutMs ?? defaultTimeout);
    try {
      const response = await fetchImpl(`${config.baseUrl}${path}`, {
        ...init,
        headers: await buildHeaders(options),
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      if (response.status === 401) {
        const refreshSession = config.refreshSession;
        const canRefresh =
          !isRetry && !noRefreshPaths.some((noRefreshPath) => path.startsWith(noRefreshPath));
        if (refreshSession && canRefresh) {
          const outcome = await refreshSession();
          if (outcome === 'refreshed') {
            clearTimeout(timeout);
            return await send(path, schema, options, true);
          }
          if (outcome === 'unavailable') {
            throw new ApiError({
              message: 'No se pudo renovar la sesión. Revisa tu conexión.',
              status: 0,
              kind: 'network',
            });
          }
        }
        await config.onUnauthorized?.();
      }
      if (!response.ok) throw await readError(response);
      const envelope = successEnvelopeSchema.safeParse(await response.json());
      if (!envelope.success) {
        throw new ApiError({
          message: 'El servidor devolvió un contrato inválido.',
          status: 502,
          kind: 'contract',
        });
      }
      const parsed = schema.safeParse(envelope.data.data);
      if (!parsed.success) {
        throw new ApiError({
          message: 'La respuesta no coincide con el contrato esperado.',
          status: 502,
          kind: 'contract',
        });
      }
      return parsed.data;
    } catch (error: unknown) {
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError({
          message: 'La solicitud agotó el tiempo de espera.',
          status: 408,
          kind: 'network',
        });
      }
      throw new ApiError({
        message: 'No se pudo conectar con el servicio.',
        status: 0,
        kind: 'network',
      });
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }
  }

  return { request };
}

export type ApiClient = ReturnType<typeof createApiClient>;
