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
  /** Called when the backend answers 401 so the caller can trigger a refresh or logout. */
  onUnauthorized?: () => void | Promise<void>;
  /**
   * Intenta renovar la sesión tras un 401. Devuelve `true` si lo consiguió, y
   * entonces la petición que falló se reintenta **una** vez con el token nuevo;
   * `false` cae en `onUnauthorized`, que es el cierre de sesión.
   *
   * Es opcional porque la web no lo necesita: allí la sesión vive en una cookie
   * HttpOnly que renueva el BFF. Quien lo necesita es el móvil, que lleva un
   * bearer con vida corta.
   *
   * El cliente se encarga de que **no** haya dos renovaciones a la vez (ver
   * `refreshOnce`); la implementación no tiene que preocuparse de eso.
   */
  refreshSession?: () => Promise<boolean>;
};

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

  /**
   * Renovación **compartida**: varias peticiones que reciben 401 a la vez se
   * suben todas a la misma promesa en lugar de pedir una renovación cada una.
   *
   * No es una optimización, es corrección. El backend **rota** el refresh token
   * en cada uso y detecta la reutilización: si dos peticiones renuevan en
   * paralelo con el mismo token, la primera lo invalida y la segunda llega con
   * uno ya revocado, lo que el servidor interpreta como robo de credencial y
   * responde revocando la *familia* entera (`REUSE_DETECTED`). Es decir: sin
   * este candado, el intento de salvar la sesión es justo lo que la mata — y
   * encima lo hace peor, porque cierra también las demás sesiones del usuario.
   *
   * Y el caso es el normal, no el raro: Inicio lanza cuatro consultas a la vez,
   * así que un token caducado produce cuatro 401 simultáneos en el primer
   * render.
   */
  let refreshInFlight: Promise<boolean> | null = null;

  function refreshOnce(): Promise<boolean> {
    if (!config.refreshSession) return Promise.resolve(false);
    if (!refreshInFlight) {
      const attempt = config.refreshSession();
      refreshInFlight = attempt
        .catch(() => false)
        .finally(() => {
          refreshInFlight = null;
        });
    }
    return refreshInFlight;
  }

  /**
   * Qué hacer ante un 401. Devuelve `true` si la petición debe reintentarse.
   *
   * `retrying` corta el bucle: si la petición ya venía de una renovación
   * correcta y el servidor la vuelve a rechazar, el problema no es el token y
   * reintentar otra vez sería una espiral.
   */
  async function handleUnauthorized(retrying: boolean): Promise<boolean> {
    if (!retrying && (await refreshOnce())) return true;
    await config.onUnauthorized?.();
    return false;
  }

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

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    const first = await attempt(path, schema, options, false);
    if (!first.retry) return first.value;
    // Un solo reintento, y ya con `retrying`, de modo que un segundo 401 cierre
    // la sesión en vez de volver a renovar.
    const second = await attempt(path, schema, options, true);
    if (!second.retry) return second.value;
    throw new ApiError({
      message: 'La sesión no pudo renovarse.',
      status: 401,
      kind: 'unauthorized',
    });
  }

  /** Una pasada. `retry: true` significa «la sesión se renovó, vuelve a intentarlo». */
  async function attempt<T>(
    path: string,
    schema: z.ZodType<T>,
    options: RequestOptions,
    retrying: boolean,
  ): Promise<{ retry: true } | { retry: false; value: T }> {
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
        // El reintento se lanza **fuera** de este `try`: aquí dentro sigue vivo
        // el `AbortController` con su temporizador, y reusarlo le daría a la
        // segunda petición lo que quedara del plazo de la primera.
        if (await handleUnauthorized(retrying)) {
          return { retry: true as const };
        }
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
      return { retry: false as const, value: parsed.data };
    } catch (error: unknown) {
      if (error instanceof ApiError) throw error;
      // A timeout is recognised by our own signal, not by the shape of the
      // rejection, because on React Native the rejection cannot be trusted.
      // `DOMException` is a web global that Hermes does not define, and the
      // fetch polyfill builds its abort rejection with `new DOMException(...)`
      // — so aborting a request there rejects with
      // `ReferenceError: Property 'DOMException' doesn't exist` instead of
      // anything named `AbortError`.
      //
      // The previous check, `error instanceof DOMException`, was worse still:
      // the `instanceof` itself threw, from inside the very catch block meant
      // to turn failures into an ApiError, so the calling screen received a
      // raw ReferenceError and reported «Ocurrió un error inesperado».
      //
      // The signal is set by both paths that can abort this request — the
      // timeout above and a caller cancelling through `options.signal` — and
      // it says the same thing in every runtime.
      if (controller.signal.aborted) {
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

  /**
   * Como `request`, pero para `multipart/form-data`. Separada de `request` a
   * propósito: esa función siempre serializa el cuerpo con `JSON.stringify` y
   * fija `Content-Type: application/json`, lo que corrompería un `FormData`.
   * El límite de tiempo es más alto por defecto porque una imagen tarda más
   * que un JSON pequeño en subir.
   */
  async function upload<T>(
    path: string,
    schema: z.ZodType<T>,
    form: FormData,
    options: { timeoutMs?: number; signal?: AbortSignal | null } = {},
  ): Promise<T> {
    const first = await uploadAttempt(path, schema, form, options, false);
    if (!first.retry) return first.value;
    const second = await uploadAttempt(path, schema, form, options, true);
    if (!second.retry) return second.value;
    throw new ApiError({
      message: 'La sesión no pudo renovarse.',
      status: 401,
      kind: 'unauthorized',
    });
  }

  async function uploadAttempt<T>(
    path: string,
    schema: z.ZodType<T>,
    form: FormData,
    options: { timeoutMs?: number; signal?: AbortSignal | null },
    retrying: boolean,
  ): Promise<{ retry: true } | { retry: false; value: T }> {
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    else options.signal?.addEventListener('abort', onExternalAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
    try {
      const headers = new Headers();
      headers.set('Accept', 'application/json');
      headers.set('X-Request-ID', newRequestId());
      const token = await tokenProvider.getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      // Sin `Content-Type` explícito a propósito: el runtime debe fijarlo con
      // el `boundary` del multipart, y escribirlo a mano lo rompería.

      const response = await fetchImpl(`${config.baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: form,
        signal: controller.signal,
      });
      if (response.status === 401 && (await handleUnauthorized(retrying))) {
        return { retry: true as const };
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
      return { retry: false as const, value: parsed.data };
    } catch (error: unknown) {
      if (error instanceof ApiError) throw error;
      if (controller.signal.aborted) {
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
      options.signal?.removeEventListener('abort', onExternalAbort);
    }
  }

  return { request, upload };
}

export type ApiClient = ReturnType<typeof createApiClient>;
