import { ApiError, createBusinessOrdersServices, createBuyerOrdersServices } from '@gymsheet/api-client';
import { orderErrorMessage } from '@gymsheet/domain';
import { useMemo } from 'react';
import { apiClient } from '@/api/client';
import { appendLocalFile, type LocalFile } from '@/api/local-file-part';
import { env } from '@/config/env';
import { useMediaAccessToken } from '@/features/chat/use-media-access-token';

/** The person's orders and the business's inbox: the same shared services as the web (ADR-0024). */
export const buyerOrdersService = createBuyerOrdersServices(apiClient.request, apiClient.upload);
export const businessOrdersService = createBusinessOrdersServices(apiClient.request, apiClient.upload);

export async function imageForm(file: LocalFile): Promise<FormData> {
  const form = new FormData();
  await appendLocalFile(form, 'file', file);
  return form;
}

/** The Spanish text of an orders error: our copy for its code, else the server's message. */
export function orderErrorText(error: unknown): string {
  if (error instanceof ApiError) return orderErrorMessage(error.code, error.message, error.details);
  return error instanceof Error ? error.message : 'Algo salió mal. Vuelve a intentarlo.';
}

export function orderErrorCode(error: unknown): string | null {
  return error instanceof ApiError ? (error.code ?? null) : null;
}

/**
 * A private image of the API (payment QR, receipt) as an image source with
 * the bearer token in its header: it never has a public address. The token
 * is re-read before it expires and after a failed load (`onError`).
 */
export function usePrivateImageSource(path: string | null) {
  const { token, onMediaError } = useMediaAccessToken();
  const source = useMemo(
    () => (path && token ? { uri: `${env.apiUrl.replace(/\/+$/u, '')}${path}`, headers: { Authorization: `Bearer ${token}` } } : null),
    [path, token],
  );
  return { source, onError: onMediaError };
}
