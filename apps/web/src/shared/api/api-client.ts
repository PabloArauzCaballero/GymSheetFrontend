import { z } from 'zod';
import { ApiError, classifyStatus } from './api-error';
import { problemSchema } from './schemas';

const successEnvelopeSchema = z.object({ ok: z.literal(true), data: z.unknown() });

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  timeoutMs?: number;
};

function resolveHeaders(options: ApiRequestOptions) {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('X-Request-ID', crypto.randomUUID());
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  return headers;
}

async function readError(response: Response) {
  let payload: unknown;
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

function createRequestController(
  externalSignal: AbortSignal | null | undefined,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const abortFromExternalSignal = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  else externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    dispose() {
      window.clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromExternalSignal);
    },
  };
}

/**
 * Executes all browser-side JSON requests through the same BFF endpoint.
 * The backend JWT remains in an HttpOnly cookie and is never exposed to JavaScript.
 */
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, timeoutMs, signal: externalSignal, ...requestInit } = options;
  const requestController = createRequestController(externalSignal, timeoutMs ?? 15_000);
  try {
    const response = await fetch(`/api/backend${path}`, {
      ...requestInit,
      headers: resolveHeaders(options),
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      signal: requestController.signal,
    });
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
    requestController.dispose();
  }
}

export async function downloadFromApi(path: string, filename: string) {
  const requestController = createRequestController(undefined, 60_000);
  try {
    const response = await fetch(`/api/backend${path}`, {
      credentials: 'same-origin',
      signal: requestController.signal,
    });
    if (!response.ok) throw await readError(response);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError({
        message: 'La exportación agotó el tiempo de espera.',
        status: 408,
        kind: 'network',
      });
    }
    throw new ApiError({
      message: 'No se pudo descargar la exportación.',
      status: 0,
      kind: 'network',
    });
  } finally {
    requestController.dispose();
  }
}
