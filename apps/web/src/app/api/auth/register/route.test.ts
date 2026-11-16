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
      registerRequest({
        email: ' ANA@Example.com ',
        password: 'segura-123',
        nombreCompleto: 'Ana Pérez',
        acceptedTerms: true,
      }),
    );

    expect(response.status).toBe(201);
    const sent = JSON.parse(String(backendRequest.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(sent).toMatchObject({ email: 'ana@example.com', acceptedTerms: true });
    expect(sent).not.toHaveProperty('confirmation');
  });

  it('rejects a payload without accepted terms before reaching the backend', async () => {
    const response = await POST(
      registerRequest({
        email: 'ana@example.com',
        password: 'segura-123',
        nombreCompleto: 'Ana Pérez',
        acceptedTerms: false,
      }),
    );

    expect(response.status).toBe(400);
    expect(backendRequest).not.toHaveBeenCalled();
  });
});
