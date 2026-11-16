import { create } from 'zustand';
import { z } from 'zod';
import { sessionPrincipalSchema } from '@gymsheet/schemas';
import { setActiveTenant } from '@/theme';
import { initialSessionState, type SessionState } from '@gymsheet/auth';
import type { LoginInput, RegisterPayload, SignupProtectionFields } from '@gymsheet/schemas';
import {
  apiClient,
  exchangeRefreshToken,
  revokeRefreshToken,
  setEmailVerificationRequiredHandler,
  setSessionLostHandler,
} from '@/api/client';
import { endSession } from '@/lib/end-session';
import { ApiError } from '@gymsheet/api-client';
import { principalCache, secureStoreAuthStorage } from '@/storage/secure-store';
import { restoreSession } from '@/lib/session-restore';
import { env } from '@/config/env';
import { unregisterPushNotifications } from '@/notifications/push';
import { useLegalGateStore } from '@/features/legal/legal-store';
import { bindQuickLoginTo, migrateBiometricLogin, parkForQuickLogin, signInWithParkedToken } from '@/storage/biometric-login';
import type { QuickLoginOutcome } from '@/storage/quick-login';

/**
 * The shared principal, `emailVerified` included (optional, so a backend
 * without the field reads as «unknown», not «unverified»).
 */
const accountPrincipalSchema = sessionPrincipalSchema;
type AccountPrincipal = z.infer<typeof accountPrincipalSchema>;

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
      emailVerified: z.boolean().optional(),
    }),
  })
  .transform((payload) => ({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken ?? '',
    user: accountPrincipalSchema.parse({
      id: payload.user.id,
      email: payload.user.email,
      nombreCompleto: payload.user.nombreCompleto,
      role: payload.user.rol,
      tenantId: payload.user.tenantId ?? null,
      emailVerified: payload.user.emailVerified,
    }),
  }));

type AuthPayload = z.output<typeof authPayloadSchema>;

/** Guardar la copia nunca puede impedir entrar: es una comodidad del arranque. */
async function rememberPrincipal(principal: AccountPrincipal): Promise<void> {
  try {
    await principalCache.write(principal);
  } catch {
    // Sin copia, el siguiente arranque esperará a `/auth/me`; nada más.
  }
}

interface AuthState extends Pick<SessionState, 'status' | 'principal'> {
  /** `null` = unknown (old backend, or not answered yet): no banner is shown. */
  emailVerified: boolean | null;
  hydrate: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  /** Face ID / fingerprint entry with the refresh token parked at logout. */
  loginWithQuickLogin: () => Promise<QuickLoginOutcome<void>>;
  register: (input: RegisterPayload, protection?: SignupProtectionFields) => Promise<void>;
  /** Re-reads `GET /auth/me`, e.g. after confirming the email PIN. */
  refreshAccount: () => Promise<void>;
  setEmailVerified: (verified: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  /** Saves the session of a login, a signup or a quick login and opens it. */
  async function openSession(payload: AuthPayload): Promise<void> {
    await secureStoreAuthStorage.saveTokens(payload.accessToken, payload.refreshToken);
    await rememberPrincipal(payload.user);
    setActiveTenant(payload.user.tenantId);
    set({ status: 'authenticated', principal: payload.user, emailVerified: payload.user.emailVerified ?? null });
    await bindQuickLoginTo(payload.user.id);
  }

  return {
    status: initialSessionState.status,
    principal: initialSessionState.principal,
    emailVerified: null,

    async hydrate() {
      // F3.17: deletes any password the old quick login stored. Independent of
      // the session, so it does not hold the launch.
      void migrateBiometricLogin();
      await restoreSession<AccountPrincipal>({
        hasAccessToken: async () => (await secureStoreAuthStorage.getAccessToken()) !== null,
        readCachedPrincipal: async () => {
          const parsed = accountPrincipalSchema.safeParse(await principalCache.read());
          return parsed.success ? parsed.data : null;
        },
        fetchPrincipal: () =>
          apiClient.request('/auth/me', accountPrincipalSchema, { method: 'GET' }),
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
          set({ status: 'authenticated', principal: user, emailVerified: user.emailVerified ?? null });
          if (origin === 'server') await rememberPrincipal(user);
        },
        signOut: async () => {
          await secureStoreAuthStorage.clearTokens();
          setActiveTenant(null);
          set({ status: 'unauthenticated', principal: null, emailVerified: null });
        },
        showLogin: () => set({ status: 'unauthenticated', principal: null, emailVerified: null }),
      });
    },

    async login(input) {
      const payload = await apiClient.request('/auth/login', authPayloadSchema, {
        method: 'POST',
        body: input,
      });
      await openSession(payload);
    },

    async loginWithQuickLogin() {
      return signInWithParkedToken(async (refreshToken) => {
        const result = await exchangeRefreshToken(refreshToken);
        if (result === 'rejected') return 'rejected' as const;
        const parsed = authPayloadSchema.safeParse(result);
        if (!parsed.success) {
          throw new ApiError({ message: 'Respuesta de renovación inválida.', status: 502, kind: 'contract' });
        }
        await openSession(parsed.data);
      });
    },

    async register(input, protection = {}) {
      const payload = await apiClient.request('/auth/register', authPayloadSchema, {
        method: 'POST',
        body: {
          ...input,
          // Anti-automation fields (the signed form ticket). Mobile sends no
          // honeypot: there is no autofill bot filling a native form.
          ...protection,
          // Una compilación dedicada de un gimnasio ya sabe a cuál pertenece;
          // en la genérica se omite y el servidor cae en `DEFAULT_TENANT_ID`.
          ...(env.tenantId ? { tenantId: env.tenantId } : {}),
        },
      });
      await openSession(payload);
    },

    async refreshAccount() {
      const user = await apiClient.request('/auth/me', accountPrincipalSchema, { method: 'GET' });
      if (get().status !== 'authenticated') return;
      set({ principal: user, emailVerified: user.emailVerified ?? get().emailVerified });
      await rememberPrincipal(user);
    },

    setEmailVerified(verified) {
      if (get().status !== 'authenticated') return;
      set({ emailVerified: verified });
      const principal = get().principal;
      if (principal) void rememberPrincipal({ ...principal, emailVerified: verified });
    },

    async logout() {
      await endSession({
        unregisterPush: unregisterPushNotifications,
        getRefreshToken: () => secureStoreAuthStorage.getRefreshToken(),
        revokeRefreshToken,
        clearTokens: () => secureStoreAuthStorage.clearTokens(),
        // Parked only for the account that turned quick login on.
        parkForQuickLogin: (refreshToken) => parkForQuickLogin(refreshToken, get().principal?.id ?? ''),
      });
      // The legal block belongs to the account that just left.
      useLegalGateStore.getState().clear();
      setActiveTenant(null);
      set({ status: 'unauthenticated', principal: null, emailVerified: null });
    },
  };
});

/**
 * A 401 from any request means the session is gone. Flipping the status here is
 * what makes the route guards send the user to /login; the tokens were already
 * cleared by the client.
 */
setSessionLostHandler(() => {
  if (useAuthStore.getState().status === 'unauthenticated') return;
  useLegalGateStore.getState().clear();
  setActiveTenant(null);
  useAuthStore.setState({ status: 'unauthenticated', principal: null, emailVerified: null });
});

/** A 403 EMAIL_VERIFICATION_REQUIRED means the account is not verified (any more): show the banner. */
setEmailVerificationRequiredHandler(() => useAuthStore.getState().setEmailVerified(false));
