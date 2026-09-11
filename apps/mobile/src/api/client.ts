import { z } from 'zod';
import { createApiClient } from '@gymsheet/api-client';
import { env } from '@/config/env';
import { notify } from '@/notifications';
import { secureStoreAuthStorage, secureStoreTokenProvider } from '@/storage/secure-store';

/**
 * Called when the backend rejects the stored token. The auth store registers
 * itself here at startup instead of being imported directly — the store already
 * imports this module, and importing it back would close the cycle.
 */
type SessionLostHandler = () => void;
let onSessionLost: SessionLostHandler | null = null;

export function setSessionLostHandler(handler: SessionLostHandler): void {
  onSessionLost = handler;
}

/**
 * The mobile client talks to the NestJS backend directly with a bearer token
 * (from SecureStore), unlike the web client which proxies through the BFF cookie.
 * Both share the same request/response contract via @gymsheet/api-client.
 */
/**
 * Sólo lo que hace falta para renovar. Deliberadamente **no** se reutiliza el
 * esquema de sesión completo de `auth-store`: esta respuesta se consume dentro
 * del propio cliente, y hacerla depender del contrato de la pantalla de acceso
 * cerraría un ciclo de imports entre los dos módulos.
 */
const refreshPayloadSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

/**
 * Renovación silenciosa de la sesión.
 *
 * El backend emite un *access token* de 15 minutos y un *refresh* de 7 días, y
 * expone `POST /auth/refresh` desde hace tiempo. El móvil guardaba el refresh en
 * el Llavero y **nunca lo usaba**: el comentario de `auth-store` todavía decía
 * que el endpoint «está pendiente» del lado del servidor. La consecuencia se ve
 * en cuanto se usa la app de verdad — a los quince minutos de haber entrado, el
 * primer 401 borraba los tokens y devolvía a la pantalla de acceso. En una app
 * de gimnasio eso cae, por construcción, en mitad de un entrenamiento: la sesión
 * dura menos que el entreno que se está registrando.
 *
 * Se hace con `fetch` directo y no con `apiClient` a propósito: pasar por el
 * cliente metería esta llamada por el mismo camino que trata los 401, y un fallo
 * al renovar intentaría renovar otra vez.
 */
async function refreshSession(): Promise<boolean> {
  const refreshToken = await secureStoreAuthStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${env.apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;

    const body: unknown = await response.json();
    const envelope = z.object({ data: refreshPayloadSchema }).safeParse(body);
    if (!envelope.success) return false;

    // Los dos, no sólo el de acceso: el servidor **rota** el refresh en cada uso
    // y revoca el anterior, así que guardar sólo el nuevo access dejaría en el
    // Llavero un refresh ya muerto y la siguiente renovación fallaría.
    await secureStoreAuthStorage.saveTokens(
      envelope.data.data.accessToken,
      envelope.data.data.refreshToken,
    );
    return true;
  } catch {
    // Sin red no hay renovación, pero tampoco hay motivo para cerrar la sesión:
    // devolver `false` deja que el 401 original siga su curso.
    return false;
  }
}

export const apiClient = createApiClient({
  baseUrl: env.apiUrl,
  tokenProvider: secureStoreTokenProvider,
  refreshSession,
  onUnauthorized: async () => {
    // Aquí sólo se llega cuando la renovación no ha servido: o no había refresh
    // token, o el servidor lo rechazó. Entonces sí, la sesión está perdida.
    //
    // A 401 on the login request itself is a bad password, not a dropped
    // session: without a stored token there was no session to expire, and the
    // login screen already reports the failure. Only warn when one is lost.
    const hadSession = (await secureStoreTokenProvider.getAccessToken()) !== null;
    await secureStoreTokenProvider.clear();
    if (!hadSession) return;
    // Marking the session lost is what sends the user back to /login. Without
    // it the guards still believe the session is valid and every screen sits on
    // a "Sesión expirada" card with a retry that can never succeed.
    onSessionLost?.();
    // A dropped session is the one failure the user cannot diagnose from the
    // screen alone. Dedup keeps a burst of parallel 401s to a single toast.
    notify.warning({
      title: 'Sesión expirada',
      message: 'Inicia sesión nuevamente para continuar.',
      deduplicationKey: 'session-expired',
    });
  },
});
