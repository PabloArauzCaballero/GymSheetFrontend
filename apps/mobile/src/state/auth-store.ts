import { create } from 'zustand';
import { z } from 'zod';
import { sessionPrincipalSchema } from '@gymsheet/schemas';
import { initialSessionState, type SessionState } from '@gymsheet/auth';
import type { LoginInput } from '@gymsheet/schemas';
import { apiClient } from '@/api/client';
import { secureStoreAuthStorage } from '@/storage/secure-store';

/**
 * Backend mobile-auth contract (bearer flow). The backend must expose token
 * issuance for mobile clients — see docs/mobile/autenticacion.md.
 */
const authPayloadSchema = z.object({
  user: sessionPrincipalSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

interface AuthState extends Pick<SessionState, 'status' | 'principal'> {
  hydrate: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
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
      set({ status: 'authenticated', principal: user });
    } catch {
      await secureStoreAuthStorage.clearTokens();
      set({ status: 'unauthenticated', principal: null });
    }
  },

  async login(input) {
    const payload = await apiClient.request('/auth/login', authPayloadSchema, {
      method: 'POST',
      body: input,
    });
    await secureStoreAuthStorage.saveTokens(payload.accessToken, payload.refreshToken);
    set({ status: 'authenticated', principal: payload.user });
  },

  async logout() {
    try {
      await apiClient.request('/auth/logout', z.object({}).passthrough(), { method: 'POST' });
    } catch {
      // Best-effort remote logout; local tokens are always cleared below.
    }
    await secureStoreAuthStorage.clearTokens();
    set({ status: 'unauthenticated', principal: null });
  },
}));
