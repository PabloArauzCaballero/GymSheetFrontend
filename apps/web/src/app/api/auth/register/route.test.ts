import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const backendRequest = vi.hoisted(() => vi.fn());
vi.mock('@/shared/server/backend', () => ({
  backendRequest,
  readBackendJson: async (response: Response) => response.json(),
}));

function registerRequest(body: unknown) {
  return new NextRequest('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Every field the current signup contract requires, already accepted. */
const signup = {
  email: 'ana@example.com',
  password: 'segura-123',
  nombreCompleto: 'Ana Pérez',
  fechaNacimiento: '1996-03-15',
  genero: 'FEMALE',
  termsVersion: '2026-08-25',
  acceptedTerms: true,
};

afterEach(() => vi.clearAllMocks());

describe('POST /api/auth/register', () => {
  it('validates with the shared payload schema and forwards the normalized email', async () => {
    backendRequest.mockResolvedValue(
      Response.json(
        {
          ok: true,
          data: {
            accessToken: 'a'.repeat(32),
            user: {
              id: '00000000-0000-4000-8000-000000000001',
              email: 'ana@example.com',
              nombreCompleto: 'Ana Pérez',
              rol: 'ATHLETE',
            },
          },
        },
        { status: 201 },
      ),
    );

    const response = await POST(
      registerRequest({ ...signup, email: ' ANA@Example.com ' }),
    );

    expect(response.status).toBe(201);
    const sent = JSON.parse(String(backendRequest.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(sent).toMatchObject({
      email: 'ana@example.com',
      acceptedTerms: true,
      fechaNacimiento: '1996-03-15',
      genero: 'FEMALE',
      termsVersion: '2026-08-25',
    });
    expect(sent).not.toHaveProperty('confirmation');
    // The BFF is the web client: the backend stores the channel with the acceptance.
    expect(backendRequest.mock.calls[0]?.[1]?.headers).toMatchObject({ 'X-Client-Platform': 'web' });
  });

  it('relays a 409 TERMS_VERSION_OUTDATED with its code and current documents', async () => {
    const problem = {
      status: 409,
      detail: 'Los términos cambiaron.',
      code: 'TERMS_VERSION_OUTDATED',
      details: { documents: [{ document: 'TERMS', version: '2026-11-16' }] },
    };
    backendRequest.mockResolvedValue(Response.json(problem, { status: 409 }));

    const response = await POST(registerRequest(signup));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject(problem);
    expect(response.cookies.get('gymsheet_session')).toBeUndefined();
  });

  it('rejects a payload without sex, birth date or terms version', async () => {
    for (const field of ['genero', 'fechaNacimiento', 'termsVersion'] as const) {
      const incomplete = Object.fromEntries(Object.entries(signup).filter(([key]) => key !== field));
      const response = await POST(registerRequest(incomplete));
      expect(response.status).toBe(400);
    }
    expect(backendRequest).not.toHaveBeenCalled();
  });

  it('answers a malformed birth date with a field error the form can show', async () => {
    const response = await POST(registerRequest({ ...signup, fechaNacimiento: '2000-02-30' }));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { issues?: { fieldErrors?: Record<string, string[]> } };
    expect(body.issues?.fieldErrors?.fechaNacimiento?.[0]).toBe('Indica una fecha válida.');
    expect(backendRequest).not.toHaveBeenCalled();
  });

  it('leaves the age to the backend: a date that is 18 only in another time zone is forwarded', async () => {
    // Tomorrow, 18 years ago: under 18 by this clock, maybe 18 in the person's calendar.
    const edge = new Date();
    edge.setFullYear(edge.getFullYear() - 18);
    edge.setDate(edge.getDate() + 1);
    const fechaNacimiento = edge.toISOString().slice(0, 10);
    backendRequest.mockResolvedValue(
      Response.json({ status: 400, issues: { fieldErrors: { fechaNacimiento: ['Debes tener al menos 18 años.'] } } }, { status: 400 }),
    );

    const response = await POST(registerRequest({ ...signup, fechaNacimiento }));

    expect(backendRequest).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ issues: { fieldErrors: { fechaNacimiento: ['Debes tener al menos 18 años.'] } } });
  });

  it('rejects a payload without accepted terms before reaching the backend', async () => {
    const response = await POST(
      registerRequest({ ...signup, acceptedTerms: false }),
    );

    expect(response.status).toBe(400);
    expect(backendRequest).not.toHaveBeenCalled();
  });

  it('forwards the ticket, honeypot and Turnstile token but never a device attestation', async () => {
    backendRequest.mockResolvedValue(
      Response.json({ status: 400, code: 'SIGNUP_REJECTED', detail: 'No pudimos crear tu cuenta.' }, { status: 400 }),
    );

    const response = await POST(
      registerRequest({
        ...signup,
        ticket: 'ticket-1',
        website: '',
        turnstileToken: 'cf-token',
        attestation: { platform: 'ios', token: 'forged', nonce: 'n' },
      }),
    );

    const sent = JSON.parse(String(backendRequest.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(sent).toMatchObject({ ticket: 'ticket-1', website: '', turnstileToken: 'cf-token' });
    expect(sent).not.toHaveProperty('attestation');
    // The rejection is relayed as is: generic message and its code, no session.
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'SIGNUP_REJECTED' });
    expect(response.cookies.get('gymsheet_session')).toBeUndefined();
  });
});
