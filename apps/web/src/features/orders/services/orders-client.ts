import { ApiError, createBusinessOrdersServices, createBuyerOrdersServices } from '@gymsheet/api-client';
import { orderErrorMessage } from '@gymsheet/domain';
import { apiRequest, apiUpload } from '@/shared/api/api-client';

/** The person's orders through the generic BFF (same shared services as the mobile). */
export const buyerOrdersService = createBuyerOrdersServices(apiRequest, apiUpload);

/** The business's inbox and payment config; the backend answers 403 to anyone but NEGOCIO. */
export const businessOrdersService = createBusinessOrdersServices(apiRequest, apiUpload);

/** The image as the multipart `file` part. */
export function imageForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file);
  return form;
}

/** The Spanish text of an orders error: our copy for a known code, else the server's message. */
export function orderErrorText(error: unknown): string {
  if (error instanceof ApiError) return orderErrorMessage(error.code, error.message, error.details);
  return error instanceof Error ? error.message : 'Algo salió mal. Vuelve a intentarlo.';
}

export function orderErrorCode(error: unknown): string | null {
  return error instanceof ApiError ? (error.code ?? null) : null;
}
