import { z } from 'zod';
import {
  currentLegalDocumentsSchema,
  pendingLegalDocumentsSchema,
  problemSchema,
  type LegalDocumentVersion,
  type RegisterPayload,
} from '@/shared/api/schemas';
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

/** The backend's problem body plus the per-field messages of a 400 (`issues.fieldErrors`). */
const authProblemSchema = problemSchema.extend({
  issues: z
    .object({ fieldErrors: z.record(z.string(), z.array(z.string()).optional()).optional() })
    .optional(),
});

/** An auth/legal failure that also carries the first server message of each field. */
export class AuthRequestError extends ApiError {
  readonly fieldErrors: Readonly<Record<string, string>>;

  constructor(input: ConstructorParameters<typeof ApiError>[0] & { fieldErrors?: Record<string, string> }) {
    super(input);
    this.name = 'AuthRequestError';
    this.fieldErrors = input.fieldErrors ?? {};
  }
}

function firstFieldErrors(raw: Record<string, string[] | undefined> | undefined) {
  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(raw ?? {})) {
    if (messages?.[0]) fieldErrors[field] = messages[0];
  }
  return fieldErrors;
}

async function readError(response: Response) {
  const parsed = authProblemSchema.safeParse(await response.json().catch(() => null));
  const payload = parsed.success ? parsed.data : null;
  return new AuthRequestError({
    message: payload?.detail ?? payload?.error?.message ?? 'La operación no pudo completarse.',
    status: response.status,
    kind:
      response.status === 401
        ? 'unauthorized'
        : response.status === 409
          ? 'conflict'
          : 'validation',
    ...(payload?.code ? { code: payload.code } : {}),
    ...(payload?.details ? { details: payload.details } : {}),
    fieldErrors: firstFieldErrors(payload?.issues?.fieldErrors),
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

/** The gym comes from the tenant cookie, server-side; never from this payload. */
export async function register(input: RegisterPayload) {
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

/**
 * Pide un PIN de recuperación al correo indicado.
 *
 * No devuelve nada ni distingue casos: el backend responde igual exista o no la
 * cuenta, y propagar aquí cualquier matiz desharía esa protección.
 */
export async function requestPasswordReset(input: { email: string }): Promise<void> {
  const response = await fetch('/api/auth/password-reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await readError(response);
}

/** Canjea el PIN por una contraseña nueva. */
export async function confirmPasswordReset(input: {
  email: string;
  pin: string;
  password: string;
}): Promise<void> {
  const response = await fetch('/api/auth/password-reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await readError(response);
}

const currentLegalEnvelope = z.object({ ok: z.literal(true), data: currentLegalDocumentsSchema });
const pendingLegalEnvelope = z.object({ ok: z.literal(true), data: pendingLegalDocumentsSchema });

/** Current version of each legal document (public, so the signup form can send it). */
export async function fetchCurrentLegal(): Promise<LegalDocumentVersion[]> {
  const response = await fetch('/api/legal/current');
  if (!response.ok) throw await readError(response);
  return currentLegalEnvelope.parse(await response.json()).data.documents;
}

/** Documents the signed-in person has not accepted in their current version. */
export async function fetchPendingLegal(): Promise<LegalDocumentVersion[]> {
  const response = await fetch('/api/legal/pending', { cache: 'no-store' });
  if (!response.ok) throw await readError(response);
  return pendingLegalEnvelope.parse(await response.json()).data.pending;
}

/** Accepts the given versions; answers what is still pending. Idempotent on the server. */
export async function acceptLegal(
  acceptances: readonly LegalDocumentVersion[],
): Promise<LegalDocumentVersion[]> {
  const response = await fetch('/api/legal/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acceptances }),
  });
  if (!response.ok) throw await readError(response);
  return pendingLegalEnvelope.parse(await response.json()).data.pending;
}
