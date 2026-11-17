import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as completeSignup } from './complete/route';
import { POST as signIn } from './route';

const backendRequest = vi.hoisted(() => vi.fn());
vi.mock('@/shared/server/backend', () => ({
  backendRequest,
  readBackendJson: async (response: Response) => response.json(),
}));

const nonce = 'n'.repeat(43);
const idToken = 'header.payload.signature-long-enough';
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'ana@example.com',
  nombreCompleto: 'Ana',
  rol: 'CLIENTE',
  emailVerified: true,
};

function post(url: string, body: unknown, cookie?: string) {
  return new NextRequest(`http://localhost:3002${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

afterEach(() => vi.clearAllMocks());

describe('POST /api/auth/google', () => {
  it('refuses a nonce this BFF did not issue, without calling the backend', async () => {
    const response = await signIn(
      post('/api/auth/google', { idToken, nonce }, `gymsheet_google_nonce=${'x'.repeat(43)}`),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'IDENTITY_TOKEN_INVALID' });
    expect(backendRequest).not.toHaveBeenCalled();
    expect(response.cookies.get('gymsheet_google_nonce')?.value).toBe('');
  });

  it('forwards a matching nonce and opens the session in the HttpOnly cookie', async () => {
    backendRequest.mockResolvedValue(
      Response.json({
        ok: true,
        data: { status: 'AUTHENTICATED', accessToken: 'a'.repeat(40), tokenType: 'Bearer', user },
      }),
    );
    const response = await signIn(
      post('/api/auth/google', { idToken, nonce }, `gymsheet_google_nonce=${nonce}`),
    );
    expect(JSON.parse(String(backendRequest.mock.calls[0]?.[1]?.body))).toEqual({ idToken, nonce });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { status: 'AUTHENTICATED', user } });
    expect(response.cookies.get('gymsheet_session')).toMatchObject({
      value: 'a'.repeat(40),
      httpOnly: true,
    });
    expect(response.cookies.get('gymsheet_google_nonce')?.value).toBe('');
  });

  it('keeps the signup token server-side when the profile must be completed', async () => {
    backendRequest.mockResolvedValue(
      Response.json({
        ok: true,
        data: {
          status: 'PROFILE_COMPLETION_REQUIRED',
          signupToken: 's'.repeat(40),
          email: 'ana@example.com',
        },
      }),
    );
    const response = await signIn(
      post('/api/auth/google', { idToken, nonce }, `gymsheet_google_nonce=${nonce}`),
    );
    const body = (await response.json()) as { data: Record<string, unknown> };
    expect(body.data).toEqual({ status: 'PROFILE_COMPLETION_REQUIRED', email: 'ana@example.com' });
    expect(response.cookies.get('gymsheet_google_signup')).toMatchObject({
      value: 's'.repeat(40),
      httpOnly: true,
    });
    expect(response.cookies.get('gymsheet_session')).toBeUndefined();
  });
});

describe('POST /api/auth/google/complete', () => {
  const profile = {
    nombreCompleto: 'Ana Pérez',
    fechaNacimiento: '1996-03-15',
    genero: 'FEMALE',
    termsVersion: '2026-08-25',
    acceptedTerms: true,
  };

  it('asks to start over without a pending signup', async () => {
    const response = await completeSignup(post('/api/auth/google/complete', profile));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'SIGNUP_TOKEN_INVALID' });
    expect(backendRequest).not.toHaveBeenCalled();
  });

  it('sends the cookie token with the profile and the gym, then opens the session', async () => {
    backendRequest.mockResolvedValue(
      Response.json({
        ok: true,
        data: { status: 'AUTHENTICATED', accessToken: 'b'.repeat(40), tokenType: 'Bearer', user },
      }),
    );
    const response = await completeSignup(
      post(
        '/api/auth/google/complete',
        { ...profile, signupToken: 'from-the-browser' },
        `gymsheet_google_signup=${'s'.repeat(40)}; gymsheet_tenant=topfitness`,
      ),
    );
    const sent = JSON.parse(String(backendRequest.mock.calls[0]?.[1]?.body)) as Record<
      string,
      unknown
    >;
    expect(sent).toMatchObject({ ...profile, signupToken: 's'.repeat(40), tenantId: 'topfitness' });
    expect(response.cookies.get('gymsheet_session')?.value).toBe('b'.repeat(40));
    expect(response.cookies.get('gymsheet_google_signup')?.value).toBe('');
  });
});
