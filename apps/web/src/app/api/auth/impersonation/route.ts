import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { backendRequest, readBackendJson } from '@/shared/server/backend';
import { sessionTokenOrReject } from '@/shared/server/bff-route';
import { isTrustedMutation } from '@/shared/server/csrf';
import {
  encodeImpersonation,
  expiredImpersonationCookieOptions,
  IMPERSONATION_COOKIE,
  impersonationCookieOptions,
  impersonationMaxAge,
  impersonationTenantIdSchema,
} from '@/shared/server/impersonation';

const inputSchema = z.object({ tenantId: impersonationTenantIdSchema });

const tokenEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: z.object({ accessToken: z.string().min(20), tenantId: impersonationTenantIdSchema }),
});

const tenantsEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: z.array(z.object({ id: z.string(), nombre: z.string() })),
});

/** Name of the gym from the catalog, never from the request body; the slug if the catalog fails. */
async function gymName(tenantId: string, token: string): Promise<string> {
  const parsed = tenantsEnvelopeSchema.safeParse(
    await readBackendJson(await backendRequest('/admin/tenants', { token })),
  );
  const name = parsed.success ? parsed.data.data.find((gym) => gym.id === tenantId)?.nombre.trim() : undefined;
  return name ? name.slice(0, 120) : tenantId;
}

/**
 * Starts operating a gym. Always minted with the account's own session token,
 * so switching gyms never chains one scoped token from another. The backend
 * decides who may do it (`@Roles(SYSTEM_ADMIN)`, 403 for anyone else).
 */
export async function POST(request: NextRequest) {
  const token = await sessionTokenOrReject(request);
  if (typeof token !== 'string') return token;
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ detail: 'Gimnasio inválido.' }, { status: 400 });

  const backendResponse = await backendRequest('/auth/impersonate-tenant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.data),
    token,
  });
  const payload = await readBackendJson(backendResponse);
  if (!backendResponse.ok) return NextResponse.json(payload, { status: backendResponse.status });
  const parsed = tokenEnvelopeSchema.safeParse(payload);
  const maxAge = parsed.success ? impersonationMaxAge(parsed.data.data.accessToken) : 0;
  if (!parsed.success || maxAge === 0)
    return NextResponse.json({ detail: 'Contrato de suplantación inválido.' }, { status: 502 });

  const { accessToken, tenantId } = parsed.data.data;
  const nombre = await gymName(tenantId, token);
  const response = NextResponse.json({ ok: true, data: { tenantId, nombre } });
  response.headers.set('Cache-Control', 'no-store');
  response.cookies.set(
    IMPERSONATION_COOKIE,
    encodeImpersonation({ accessToken, tenantId, nombre }),
    impersonationCookieOptions(maxAge),
  );
  return response;
}

/**
 * Back to the account's own token. Dropping the cookie is the whole exit: the
 * backend keeps no state for the scoped token (no refresh, no revocation list),
 * so there is nothing to revoke server-side; it dies at its own expiry.
 */
export function DELETE(request: NextRequest) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const response = NextResponse.json({ ok: true, data: null });
  response.cookies.set(IMPERSONATION_COOKIE, '', expiredImpersonationCookieOptions());
  return response;
}
