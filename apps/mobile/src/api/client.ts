import { z } from 'zod';
import { ApiError, classifyStatus, createApiClient } from '@gymsheet/api-client';
import { env, loopbackRewrite } from '@/config/env';
import { notify } from '@/notifications';
import { secureStoreAuthStorage, secureStoreTokenProvider } from '@/storage/secure-store';
import {
  createH5S2M1FixtureFetch,
  isH5S2M1FixtureEnabled,
} from '@/api/h5-s2-m1-fixture';

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

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Sin red no hay renovación, pero tampoco motivo para cerrar la sesión.
    // Antes esto devolvía `false` y el cliente lo trataba como un rechazo:
    // abrir la app sin cobertura con el access caducado borraba los tokens.
    // Un `ApiError` le dice al cliente «no se pudo preguntar»: la petición
    // falla y la sesión sigue ahí para el siguiente intento.
    throw new ApiError({ message: 'No se pudo conectar con el servicio.', status: 0, kind: 'network' });
  }

  // Sólo un rechazo explícito del refresh significa sesión perdida: 401
  // (revocado, caducado, reutilizado) o 400 (token con forma imposible). Un
  // 5xx o un 429 es el servidor que no puede contestar ahora.
  if (response.status === 401 || response.status === 400) return false;
  if (!response.ok) {
    throw new ApiError({
      message: 'No se pudo renovar la sesión ahora.',
      status: response.status,
      kind: classifyStatus(response.status),
    });
  }

  const body: unknown = await response.json().catch(() => null);
  const envelope = z.object({ data: refreshPayloadSchema }).safeParse(body);
  if (!envelope.success) {
    throw new ApiError({ message: 'Respuesta de renovación inválida.', status: 502, kind: 'contract' });
  }

  // Los dos, no sólo el de acceso: el servidor **rota** el refresh en cada uso
  // y revoca el anterior, así que guardar sólo el nuevo access dejaría en el
  // Llavero un refresh ya muerto y la siguiente renovación fallaría.
  await secureStoreAuthStorage.saveTokens(
    envelope.data.data.accessToken,
    envelope.data.data.refreshToken,
  );
  return true;
}

/**
 * Revoca el refresh en el servidor al cerrar sesión.
 *
 * `fetch` directo, sin bearer y fuera de `apiClient`, por la misma razón que
 * `refreshSession`: `POST /auth/logout` es público —lo autoriza el refresh, no
 * el access, que puede estar ya caducado— y pasar por el cliente haría que un
 * 401 intentara **renovar** justo la sesión que se está cerrando, rotando el
 * refresh y dejando vivo el nuevo. Responde 204 sin cuerpo.
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await fetch(`${env.apiUrl}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
}

/**
 * En desarrollo, con el backend en `localhost` del Mac, las URL de medios que
 * devuelve apuntan a un `localhost` que un teléfono no alcanza (ver
 * `loopbackRewrite`). Se corrigen aquí, en el texto JSON, antes de que nadie lo
 * lea: un único punto en vez de cada pantalla que pinta una imagen. En builds
 * de EAS `loopbackRewrite` es `null` y esto es el `fetch` de siempre.
 */
const rewrite = loopbackRewrite;
const deviceFetch: typeof fetch = rewrite
  ? async (input, init) => {
      const response = await fetch(input, init);
      if (!(response.headers.get('content-type') ?? '').includes('application/json')) {
        return response;
      }
      let text = await response.text();
      for (const origin of rewrite.from) text = text.split(origin).join(rewrite.to);
      return new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  : fetch;

/**
 * The fixture is compiled into development bundles only, and still needs an
 * explicit local opt-in. It wraps the normal transport so all non-fixture API
 * paths retain the device URL/media behavior above.
 */
const h5S2M1Fixture = createH5S2M1FixtureFetch({
  enabled: isH5S2M1FixtureEnabled(__DEV__, process.env.EXPO_PUBLIC_H5_S2_M1_FIXTURE),
  baseUrl: env.apiUrl,
  fetchImpl: deviceFetch,
});

export const getH5S2M1FixtureSnapshot = h5S2M1Fixture.snapshot;

export const apiClient = createApiClient({
  baseUrl: env.apiUrl,
  fetchImpl: h5S2M1Fixture.fetch,
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
