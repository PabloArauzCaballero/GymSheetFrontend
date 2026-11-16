import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const backendRequest = vi.hoisted(() => vi.fn());
vi.mock('@/shared/server/backend', () => ({
  backendRequest,
  readBackendJson: async (response: Response) => response.json(),
}));

function signupRequest(body: unknown, origin = 'http://localhost:3001') {
  return new NextRequest('http://localhost:3001/api/business/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin },
    body: JSON.stringify(body),
  });
}

const signup = {
  email: 'top@negocio.bo',
  password: 'Negocio2026!',
  businessName: 'Top Fitness',
  entityType: 'GYM',
  acceptances: [
    { document: 'BUSINESS_TERMS', version: '2026-11-16' },
    { document: 'BUSINESS_DPA', version: '2026-11-16' },
    { document: 'PRIVACY', version: '2026-08-25' },
  ],
  ticket: 'ticket',
};

const created = {
  ok: true,
  data: {
    accessToken: 'a'.repeat(40),
    refreshToken: 'r'.repeat(40),
    tokenType: 'Bearer',
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'top@negocio.bo',
      nombreCompleto: 'Top Fitness',
      rol: 'NEGOCIO',
      emailVerified: false,
      accountKind: 'BUSINESS',
    },
    business: {
      entityId: '00000000-0000-4000-8000-000000000002',
      entityType: 'GYM',
      legalKind: 'COMPANY',
      status: 'ONBOARDING',
      kycStatus: 'DRAFT',
    },
  },
};

afterEach(() => vi.clearAllMocks());

describe('POST /api/business/signup', () => {
  it('forwards the signup, keeps the token in the HttpOnly cookie and never returns it', async () => {
    backendRequest.mockResolvedValue(Response.json(created, { status: 201 }));
    const response = await POST(signupRequest({ ...signup, email: ' TOP@Negocio.bo ' }));

    expect(response.status).toBe(201);
    expect(backendRequest.mock.calls[0]?.[0]).toBe('/business/signup');
    const sent = JSON.parse(String(backendRequest.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(sent).toMatchObject({ email: 'top@negocio.bo', entityType: 'GYM', ticket: 'ticket' });
    const body = (await response.json()) as { data: Record<string, unknown> };
    expect(JSON.stringify(body)).not.toContain('a'.repeat(40));
    expect(body.data).toMatchObject({ business: { kycStatus: 'DRAFT' }, user: { accountKind: 'BUSINESS' } });
    expect(response.cookies.get('gymsheet_session')?.value).toBe('a'.repeat(40));
  });

  it('refuses a cross-site request before calling the backend', async () => {
    const response = await POST(signupRequest(signup, 'https://evil.example'));
    expect(response.status).toBe(403);
    expect(backendRequest).not.toHaveBeenCalled();
  });

  it('answers 400 with per-field messages for an invalid payload', async () => {
    const response = await POST(signupRequest({ ...signup, password: 'corta', attestation: { platform: 'ios', token: 't', nonce: 'n' } }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { issues: { fieldErrors: Record<string, string[]> } };
    expect(body.issues.fieldErrors.password).toBeDefined();
    expect(backendRequest).not.toHaveBeenCalled();
  });

  it('relays the backend refusal with its code', async () => {
    backendRequest.mockResolvedValue(Response.json({ code: 'EMAIL_ALREADY_REGISTERED', status: 409 }, { status: 409 }));
    const response = await POST(signupRequest(signup));
    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe('EMAIL_ALREADY_REGISTERED');
    expect(response.cookies.get('gymsheet_session')).toBeUndefined();
  });
});
