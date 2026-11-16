import { z } from 'zod';
import {
  emailVerifyConfirmResponseSchema,
  userDevicesSchema,
  type UserDevice,
} from '@/shared/api/schemas';
import { apiErrorFromResponse } from '@/shared/api/api-error';

/**
 * Email verification and devices go through their own BFF routes
 * (`/api/auth/email/verify/*`, `/api/account/devices*`): the backend answers
 * 202/204 there, which the BFF turns into one JSON envelope. Failures keep
 * their code and details (`ApiError`), like every other call.
 */
async function bff<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin', ...init });
  if (!response.ok) throw await apiErrorFromResponse(response);
  return z.object({ ok: z.literal(true), data: schema }).parse(await response.json()).data;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const accountKeys = {
  devices: ['account', 'devices'] as const,
};

export const accountService = {
  /** Sends a new PIN; 429 `EMAIL_PIN_COOLDOWN` says how long to wait. */
  requestEmailPin: () => bff('/api/auth/email/verify/request', z.unknown(), { method: 'POST' }),
  confirmEmailPin: (pin: string) =>
    bff('/api/auth/email/verify/confirm', emailVerifyConfirmResponseSchema, json({ pin })),
  devices: (): Promise<UserDevice[]> => bff('/api/account/devices', userDevicesSchema),
  revokeDevice: (id: string) =>
    bff(`/api/account/devices/${encodeURIComponent(id)}`, z.null(), { method: 'DELETE' }),
  revokeOtherDevices: () => bff('/api/account/devices/revoke-others', z.null(), { method: 'POST' }),
};
