import { z } from 'zod';
import { ApiError } from '@/shared/api/api-error';

const authResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      nombreCompleto: z.string(),
      rol: z.string(),
    }),
  }),
});

async function readError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    detail?: string;
    error?: { message?: string };
  } | null;
  return new ApiError({
    message: payload?.detail ?? payload?.error?.message ?? 'La operación no pudo completarse.',
    status: response.status,
    kind:
      response.status === 401
        ? 'unauthorized'
        : response.status === 409
          ? 'conflict'
          : 'validation',
  });
}

export async function login(input: { email: string; password: string }) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await readError(response);
  return authResponseSchema.parse(await response.json()).data.user;
}

export async function register(input: { email: string; password: string; nombreCompleto: string }) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await readError(response);
  return authResponseSchema.parse(await response.json()).data.user;
}

export async function logout() {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  if (!response.ok) throw await readError(response);
}
