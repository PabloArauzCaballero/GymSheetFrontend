import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DescubrirClient } from './descubrir-client';

const { backendFetch } = vi.hoisted(() => ({ backendFetch: vi.fn() }));

vi.stubGlobal('fetch', backendFetch);
vi.mock('next/link', () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('./match-celebration', () => ({ MatchCelebration: () => null }));
vi.mock('./member-detail-sheet', () => ({ MemberDetailSheet: () => null }));

function renderDiscover() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DescubrirClient genero="FEMALE" objetivo="TRAINING" sucursalId="" />
    </QueryClientProvider>,
  );
}

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

  it('shows the real empty-deck state and a route back to change filters', async () => {
    backendFetch.mockReset().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: [] }),
    });

    renderDiscover();

    expect(await screen.findByRole('heading', { name: 'No quedan cartas' })).toBeTruthy();
    expect(
      screen.getByText(
        'No hay personas que coincidan con estos filtros por ahora. Cámbialos en Comunidad o vuelve más tarde.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Comunidad' })).toHaveAttribute('href', '/comunidad');
    expect(screen.queryByRole('button', { name: /Me interesa/u })).toBeNull();
  });
});
