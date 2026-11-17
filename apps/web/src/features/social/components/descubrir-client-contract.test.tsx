import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DescubrirClient } from './descubrir-client';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }) }));

const { backendFetch } = vi.hoisted(() => ({ backendFetch: vi.fn() }));

vi.stubGlobal('fetch', backendFetch);
vi.mock('next/link', () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('./match-celebration', () => ({ MatchCelebration: () => null }));
vi.mock('./member-detail-sheet', () => ({ MemberDetailSheet: () => null }));

function renderDiscover() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DescubrirClient objetivo="TRAINING" sucursalId="" />
    </QueryClientProvider>,
  );
}

const franja5Card = {
  userId: '00000000-0000-4000-8000-000000000001',
  impressionId: '11111111-1111-4111-8111-111111111111',
  displayName: 'Ana M.',
  objetivo: 'TRAINING',
  branchId: null,
  branchName: 'Centro',
  connectionStatus: 'NONE',
  connectionId: null,
  socialStatus: null,
  photoUrl: null,
  photos: [],
  age: 28,
  gender: 'FEMALE',
  experienceLevel: 'BEGINNER',
  points: 0,
  levelCode: null,
  about: { interests: [], drinking: null, smoking: null, pets: null, bio: null },
  // An older server could still send presence codes: they must never surface.
  reasons: ['NEARBY', 'TRAINING_NOW', 'SAME_ROUTINE', 'ACTIVE_NOW', 'VERIFIED', 'SAME_GOAL', 'SHARED_INTERESTS', 'NEW_HERE'],
  distanceKm: 1,
};

const respond = (data: unknown) =>
  backendFetch.mockReset().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data }) });

describe('DescubrirClient deck card (franja 5 contract)', () => {
  it('shows the verified badge, the distance and three reasons, never presence', async () => {
    respond([franja5Card]);
    renderDiscover();

    expect(await screen.findByRole('img', { name: 'Persona verificada' })).toHaveTextContent('Verificada');
    expect(screen.getByText('a 1 km')).toBeTruthy();
    const reasons = screen.getByRole('list', { name: 'Por qué aparece' });
    expect([...reasons.querySelectorAll('li')].map((chip) => chip.textContent)).toEqual([
      'Misma rutina',
      'Mismo objetivo',
      'Intereses en común',
    ]);
    expect(screen.queryByText(/ahora/iu)).toBeNull();
    expect(screen.queryByText(/TRAINING_NOW|ACTIVE_NOW/u)).toBeNull();
  });

  it('shows no badge for an unverified card', async () => {
    respond([{ ...franja5Card, reasons: ['SAME_GOAL'], distanceKm: null }]);
    renderDiscover();

    expect(await screen.findByRole('button', { name: 'Me interesa entrenar con Ana M.' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Persona verificada' })).toBeNull();
    expect(screen.queryByText(/km/u)).toBeNull();
  });

  it('rejects a card without its required ranking fields instead of guessing them', async () => {
    const withoutReasons: Partial<typeof franja5Card> = { ...franja5Card };
    delete withoutReasons.reasons;
    respond([withoutReasons]);
    renderDiscover();

    expect(await screen.findByRole('alert')).toHaveTextContent('La respuesta no coincide con el contrato esperado.');
    expect(screen.queryByText('Ana M.')).toBeNull();
  });
});

describe('DescubrirClient contract errors', () => {
  beforeEach(() => {
    backendFetch.mockReset().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: [
          {
            userId: 'not-a-uuid',
            displayName: 'Persona corrupta',
            objetivo: 'TRAINING',
            branchId: null,
            branchName: null,
            connectionStatus: 'NONE',
            connectionId: null,
            socialStatus: null,
            photoUrl: null,
            photos: [],
            age: 28,
            gender: 'FEMALE',
            experienceLevel: 'BEGINNER',
            points: 0,
            levelCode: null,
          },
        ],
      }),
    });
  });

  it('rejects an incompatible deck DTO and offers a retry without rendering its candidate', async () => {
    renderDiscover();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La respuesta no coincide con el contrato esperado.',
    );
    expect(screen.queryByText('Persona corrupta')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(backendFetch).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('shows the real empty-deck state', async () => {
    backendFetch.mockReset().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: [] }),
    });

    renderDiscover();

    expect(await screen.findByRole('heading', { name: 'Ya viste a todos por hoy' })).toBeTruthy();
    expect(
      screen.getByText(
        'Repi también se quedó sin perfiles. Vuelve mañana o cambia los filtros de objetivo y sede.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Me interesa/u })).toBeNull();
  });

  it('offers no direct-message action: chats need an accepted connection first', async () => {
    backendFetch.mockReset().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: [
          {
            userId: '00000000-0000-4000-8000-000000000001',
            displayName: 'Ana',
            objetivo: 'TRAINING',
            branchId: null,
            branchName: null,
            connectionStatus: 'NONE',
            connectionId: null,
            socialStatus: null,
            photoUrl: null,
            photos: [],
            age: 28,
            gender: 'FEMALE',
            experienceLevel: 'BEGINNER',
            points: 0,
            levelCode: null,
            reasons: ['SAME_GOAL', 'VERIFIED'],
            distanceKm: 2,
          },
        ],
      }),
    });

    renderDiscover();

    expect(await screen.findByRole('button', { name: 'Me interesa entrenar con Ana' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /mensaje directo/u })).toBeNull();
    expect(backendFetch.mock.calls.some(([url]) => String(url).includes('/me/conversations'))).toBe(false);
  });
});
