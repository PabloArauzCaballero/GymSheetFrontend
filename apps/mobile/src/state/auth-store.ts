import { create } from 'zustand';
import { z } from 'zod';
import { sessionPrincipalSchema } from '@gymsheet/schemas';
import { setActiveTenant } from '@/theme';
import { initialSessionState, type SessionState } from '@gymsheet/auth';
import type { LoginInput, RegisterPayload } from '@gymsheet/schemas';
import { apiClient, revokeRefreshToken, setSessionLostHandler } from '@/api/client';
import { endSession } from '@/lib/end-session';
import { ApiError } from '@gymsheet/api-client';
import type { SessionPrincipal } from '@gymsheet/types';
import { principalCache, secureStoreAuthStorage } from '@/storage/secure-store';
import { restoreSession } from '@/lib/session-restore';
import { env } from '@/config/env';
import { unregisterPushNotifications } from '@/notifications/push';

/**
 * Lo que `POST /auth/register` espera, ya sin el par de confirmación.
 *
 * El tipo y la traducción desde los valores del formulario viven en
 * `@gymsheet/schemas` y se reexportan aquí para no romper a quien ya los
 * importaba de este módulo. Antes cada plataforma armaba este objeto por su
 * cuenta —quitar `confirmation`, omitir `genero` vacío, forzar `acceptedTerms`—
 * y bastaba con que una cambiara para que el alta se comportara distinto según
 * el dispositivo.
 */
export type { RegisterPayload } from '@gymsheet/schemas';

/**
 * Backend mobile-auth contract (bearer flow) as the API actually serves it today
 * — see docs/mobile/autenticacion.md:
 *
 * - `POST /auth/login` names the role `rol`, while `GET /auth/me` and the shared
 *   `sessionPrincipalSchema` use `role`; normalised here so the rest of the app
 *   only ever sees the shared contract.
 * - El refresh token **sí** se emite hoy, y `POST /auth/refresh` existe. Sigue
 *   declarado como opcional porque el esquema también valida respuestas de
 *   despliegues antiguos, pero ya no describe la realidad del backend: quien lo
 *   usa es `src/api/client.ts`, que renueva la sesión en silencio al primer 401.
 *   Mientras este comentario dijo lo contrario, el móvil guardaba el refresh en
 *   el Llavero y no lo usaba nunca, de modo que la sesión moría a los quince
 *   minutos y devolvía al usuario a la pantalla de acceso.
 */
const authPayloadSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      nombreCompleto: z.string().optional(),
      rol: z.string(),
      tenantId: z.string().nullable().optional(),
    }),
  })
  .transform((payload) => ({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken ?? '',
    user: sessionPrincipalSchema.parse({
      id: payload.user.id,
      email: payload.user.email,
      nombreCompleto: payload.user.nombreCompleto,
      role: payload.user.rol,
      tenantId: payload.user.tenantId ?? null,
    }),
  }));

/** Guardar la copia nunca puede impedir entrar: es una comodidad del arranque. */
async function rememberPrincipal(principal: SessionPrincipal): Promise<void> {
  try {
    await principalCache.write(principal);
  } catch {
    // Sin copia, el siguiente arranque esperará a `/auth/me`; nada más.
  }
}

interface AuthState extends Pick<SessionState, 'status' | 'principal'> {
  hydrate: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: initialSessionState.status,
  principal: initialSessionState.principal,

  async hydrate() {
    await restoreSession({
      hasAccessToken: async () => (await secureStoreAuthStorage.getAccessToken()) !== null,
      readCachedPrincipal: async () => {
        const parsed = sessionPrincipalSchema.safeParse(await principalCache.read());
        return parsed.success ? parsed.data : null;
      },
      fetchPrincipal: () =>
        apiClient.request('/auth/me', sessionPrincipalSchema, { method: 'GET' }),
      // Un 401 que ni la renovación salvó. Cualquier otro fallo (sin red,
      // plazo agotado, 5xx) no dice nada de la sesión y no la cierra.
      isSessionRejected: (error) => error instanceof ApiError && error.kind === 'unauthorized',
      authenticate: async (user, origin) => {
        // La validación en segundo plano no debe resucitar una sesión que la
        // persona cerró mientras `/auth/me` estaba en vuelo.
        if (origin === 'server' && get().status === 'unauthenticated') return;
        // La marca acompaña a la sesión: se aplica al restaurarla para que la
        // primera pantalla ya salga con los colores del gimnasio del usuario.
        setActiveTenant(user.tenantId);
        set({ status: 'authenticated', principal: user });
        if (origin === 'server') await rememberPrincipal(user);
      },
      signOut: async () => {
        await secureStoreAuthStorage.clearTokens();
        setActiveTenant(null);
        set({ status: 'unauthenticated', principal: null });
      },
      showLogin: () => set({ status: 'unauthenticated', principal: null }),
    });
  },

  async login(input) {
    const payload = await apiClient.request('/auth/login', authPayloadSchema, {
      method: 'POST',
      body: input,
    });
    await secureStoreAuthStorage.saveTokens(payload.accessToken, payload.refreshToken);
    await rememberPrincipal(payload.user);
    setActiveTenant(payload.user.tenantId);
    set({ status: 'authenticated', principal: payload.user });
  },

  async register(input) {
    const payload = await apiClient.request('/auth/register', authPayloadSchema, {
      method: 'POST',
      body: {
        ...input,
        // Una compilación dedicada de un gimnasio ya sabe a cuál pertenece;
        // en la genérica se omite y el servidor cae en `DEFAULT_TENANT_ID`.
        ...(env.tenantId ? { tenantId: env.tenantId } : {}),
      },
    });
    await secureStoreAuthStorage.saveTokens(payload.accessToken, payload.refreshToken);
    await rememberPrincipal(payload.user);
    setActiveTenant(payload.user.tenantId);
    set({ status: 'authenticated', principal: payload.user });
  },

  async logout() {
    await endSession({
      unregisterPush: unregisterPushNotifications,
      getRefreshToken: () => secureStoreAuthStorage.getRefreshToken(),
      revokeRefreshToken,
      clearTokens: () => secureStoreAuthStorage.clearTokens(),
    });
    setActiveTenant(null);
    set({ status: 'unauthenticated', principal: null });
  },
}));

/**
 * A 401 from any request means the session is gone. Flipping the status here is
 * what makes the route guards send the user to /login; the tokens were already
 * cleared by the client.
 */
setSessionLostHandler(() => {
  if (useAuthStore.getState().status === 'unauthenticated') return;
  setActiveTenant(null);
  useAuthStore.setState({ status: 'unauthenticated', principal: null });
});
