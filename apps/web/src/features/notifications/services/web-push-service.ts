import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';

/**
 * Lo que el backend responde antes de que el navegador pueda suscribirse: si
 * este despliegue entrega push web y con qué `applicationServerKey`.
 *
 * La clave pública viene del backend y no de una variable `NEXT_PUBLIC_*`
 * porque es la mitad pública de un par que vive allí: dos copias acaban
 * divergiendo, y una pública que no corresponde a la privada produce
 * suscripciones que el servicio de push rechaza sin explicar por qué.
 */
const webPushConfigSchema = z.object({
  enabled: z.boolean(),
  publicKey: z.string().nullable(),
});

export type WebPushConfig = z.infer<typeof webPushConfigSchema>;

const registrationResultSchema = z.object({ registered: z.boolean() });

export type WebPushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export const webPushService = {
  getConfig: () => apiRequest<WebPushConfig>('/notifications/push/web-config', webPushConfigSchema),
  subscribe: (input: WebPushSubscriptionInput) =>
    apiRequest('/notifications/device-tokens', registrationResultSchema, {
      method: 'POST',
      body: { platform: 'WEB', ...input },
    }),
  // DELETE con cuerpo: es el mismo contrato que usa el móvil, y el BFF
  // reenvía los bytes tal cual para cualquier método que no sea GET/HEAD.
  unsubscribe: (endpoint: string) =>
    apiRequest('/notifications/device-tokens', registrationResultSchema, {
      method: 'DELETE',
      body: { endpoint },
    }),
};
