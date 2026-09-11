import { create } from 'zustand';
import { z } from 'zod';
import { sessionPrincipalSchema } from '@gymsheet/schemas';
import { setActiveTenant } from '@/theme';
import { initialSessionState, type SessionState } from '@gymsheet/auth';
import type { LoginInput } from '@gymsheet/schemas';
import { apiClient, setSessionLostHandler } from '@/api/client';
import { secureStoreAuthStorage } from '@/storage/secure-store';
import { env } from '@/config/env';

/**
 * Lo que `POST /auth/register` espera, ya sin el par de confirmación.
 * `acceptedTerms` es literal `true`: el tipo obliga a que quien llama haya
 * pasado por la validación de la casilla, no a confiar en que lo hizo.
 */
export type RegisterPayload = {
  email: string;
  password: string;
  nombreCompleto: string;
  genero?: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
  acceptedTerms: true;
};

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

interface AuthState extends Pick<SessionState, 'status' | 'principal'> {
  hydrate: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: initialSessionState.status,
  principal: initialSessionState.principal,

  async hydrate() {
    const token = await secureStoreAuthStorage.getAccessToken();
    if (!token) {
      set({ status: 'unauthenticated', principal: null });
      return;
    }
    try {
      const user = await apiClient.request('/auth/me', sessionPrincipalSchema, { method: 'GET' });
      // La marca acompaña a la sesión: se aplica al restaurarla para que la
      // primera pantalla ya salga con los colores del gimnasio del usuario.
      setActiveTenant(user.tenantId);
      set({ status: 'authenticated', principal: user });
    } catch {
      await secureStoreAuthStorage.clearTokens();
      setActiveTenant(null);
      set({ status: 'unauthenticated', principal: null });
    }
  },

  async login(input) {
    const payload = await apiClient.request('/auth/login', authPayloadSchema, {
      method: 'POST',
      body: input,
    });
    await secureStoreAuthStorage.saveTokens(payload.accessToken, payload.refreshToken);
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
    setActiveTenant(payload.user.tenantId);
    set({ status: 'authenticated', principal: payload.user });
  },

  async logout() {
    try {
      await apiClient.request('/auth/logout', z.object({}).passthrough(), { method: 'POST' });
    } catch {
      // Best-effort remote logout; local tokens are always cleared below.
    }
    await secureStoreAuthStorage.clearTokens();
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
