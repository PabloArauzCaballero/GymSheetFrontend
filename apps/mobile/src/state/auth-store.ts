import { create } from 'zustand';
import { z } from 'zod';
import { sessionPrincipalSchema } from '@gymsheet/schemas';
import { setActiveTenant } from '@/theme';
import { initialSessionState, type SessionState } from '@gymsheet/auth';
import type { LoginInput } from '@gymsheet/schemas';
import { ApiError } from '@gymsheet/api-client';
import { apiClient, setSessionLostHandler } from '@/api/client';
import { principalCache, secureStoreAuthStorage } from '@/storage/secure-store';

/**
 * Backend mobile-auth contract (bearer flow) as the API actually serves it today
 * — see docs/mobile/autenticacion.md:
 *
 * - `POST /auth/login` names the role `rol`, while `GET /auth/me` and the shared
 *   `sessionPrincipalSchema` use `role`; normalised here so the rest of the app
 *   only ever sees the shared contract.
 * - `refreshToken` (backend SEC-02): single-use, rotated by `POST /auth/refresh`
 *   on every renewal; the session lasts 90 days WITHOUT use. Still optional in
 *   the schema so an older API that does not send it keeps working (the
 *   session then lasts as long as the access token, as before).
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
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: initialSessionState.status,
  principal: initialSessionState.principal,

  async hydrate() {
    const [token, refreshToken] = await Promise.all([
      secureStoreAuthStorage.getAccessToken(),
      secureStoreAuthStorage.getRefreshToken(),
    ]);
    if (!token && !refreshToken) {
      set({ status: 'unauthenticated', principal: null });
      return;
    }
    try {
      // An expired access token is renewed by the client (401 → refresh → retry).
      const user = await apiClient.request('/auth/me', sessionPrincipalSchema, { method: 'GET' });
      // La marca acompaña a la sesión: se aplica al restaurarla para que la
      // primera pantalla ya salga con los colores del gimnasio del usuario.
      setActiveTenant(user.tenantId);
      await principalCache.save(user);
      set({ status: 'authenticated', principal: user });
    } catch (error: unknown) {
      // Sin señal o con el servidor caído la sesión sigue valiendo: abrir la app
      // en el sótano del gimnasio no puede mandarte al login. Se entra con la
      // última cuenta conocida y la primera petición con red renueva el par.
      const unreachable =
        error instanceof ApiError && (error.kind === 'network' || error.status >= 500);
      const cached = unreachable ? await principalCache.read() : null;
      if (cached && (await secureStoreAuthStorage.getRefreshToken())) {
        setActiveTenant(cached.tenantId);
        set({ status: 'authenticated', principal: cached });
        return;
      }
      await secureStoreAuthStorage.clearTokens();
      await principalCache.clear();
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
    await principalCache.save(payload.user);
    setActiveTenant(payload.user.tenantId);
    set({ status: 'authenticated', principal: payload.user });
  },

  async logout() {
    const refreshToken = await secureStoreAuthStorage.getRefreshToken();
    if (refreshToken) {
      try {
        // Revoca la sesión en el servidor: el refresh token deja de servir
        // aunque alguien lo hubiera copiado de este teléfono.
        await apiClient.request('/auth/logout', z.object({}).passthrough(), {
          method: 'POST',
          body: { refreshToken },
        });
      } catch {
        // Best-effort remote logout; local tokens are always cleared below.
      }
    }
    await secureStoreAuthStorage.clearTokens();
    await principalCache.clear();
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
  void principalCache.clear();
  setActiveTenant(null);
  useAuthStore.setState({ status: 'unauthenticated', principal: null });
});
