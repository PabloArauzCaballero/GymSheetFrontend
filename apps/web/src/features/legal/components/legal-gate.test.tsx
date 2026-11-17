import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { LegalGate } from './legal-gate';

const { acceptLegal, fetchPendingLegal, refresh } = vi.hoisted(() => ({
  acceptLegal: vi.fn(),
  fetchPendingLegal: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/features/auth/services/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/services/auth-client')>()),
  acceptLegal,
  fetchPendingLegal,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));

const pending = [
  { document: 'TERMS', version: '2026-11-16' },
  { document: 'PRIVACY', version: '2026-11-16' },
  { document: 'COMMUNITY', version: '2026-11-16' },
] as const;

const blocked = new ApiError({
  message: 'Debes aceptar los términos.',
  status: 428,
  kind: 'unexpected',
  code: 'LEGAL_ACCEPTANCE_REQUIRED',
});

/** A portal screen whose request is blocked by the backend until the terms are accepted. */
function PortalScreen({ load }: { load: () => Promise<string> }) {
  const query = useQuery({ queryKey: ['screen'], queryFn: load, retry: false });
  return <p>{query.data ?? 'Contenido del portal'}</p>;
}

function renderGate(initialPending: readonly (typeof pending)[number][], load: () => Promise<string>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LegalGate initialPending={initialPending}>
        <PortalScreen load={load} />
      </LegalGate>
    </QueryClientProvider>,
  );
}

describe('LegalGate', () => {
  beforeEach(() => {
    acceptLegal.mockReset();
    fetchPendingLegal.mockReset();
    refresh.mockReset();
  });

  it('blocks the portal when a request answers 428, lists the documents and accepts them', async () => {
    fetchPendingLegal.mockResolvedValue([...pending]);
    acceptLegal.mockResolvedValue([]);
    const load = vi.fn().mockRejectedValueOnce(blocked).mockResolvedValue('Datos del portal');
    renderGate([], load);

    expect(await screen.findByRole('heading', { name: 'Actualizamos los términos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Términos y condiciones/u })).toHaveAttribute('href', '/terminos');
    expect(screen.getByRole('link', { name: /Política de privacidad/u })).toHaveAttribute('href', '/privacidad');
    // Community rules are a versioned legal document too: listed and accepted with the others.
    expect(screen.getByRole('link', { name: /Normas de la comunidad/u })).toHaveAttribute('href', '/normas');
    expect(screen.getByRole('link', { name: 'Cerrar sesión' })).toHaveAttribute(
      'href',
      '/api/auth/logout?returnTo=/login',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
    expect(await screen.findByText('Marca la casilla para continuar.')).toBeInTheDocument();
    expect(acceptLegal).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));

    await waitFor(() => expect(acceptLegal).toHaveBeenCalledWith(pending));
    expect(await screen.findByText('Datos del portal')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it('shows the block straight away when the layout already found pending documents', () => {
    renderGate([...pending], () => new Promise<string>(() => undefined));
    expect(screen.getByRole('heading', { name: 'Actualizamos los términos' })).toBeInTheDocument();
    expect(screen.queryByText('Contenido del portal')).toBeNull();
  });

  it('ignores failures that are not a legal block', async () => {
    const load = vi.fn().mockRejectedValue(new ApiError({ message: 'Caído', status: 503, kind: 'unexpected' }));
    renderGate([], load);
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(fetchPendingLegal).not.toHaveBeenCalled();
    expect(screen.getByText('Contenido del portal')).toBeInTheDocument();
  });

  it('asks again when the version changed while the page was open', async () => {
    acceptLegal.mockRejectedValue(
      new ApiError({ message: 'Cambiaron', status: 409, kind: 'conflict', code: 'TERMS_VERSION_OUTDATED' }),
    );
    fetchPendingLegal.mockResolvedValue([{ document: 'TERMS', version: '2026-12-01' }]);
    renderGate([...pending], () => new Promise<string>(() => undefined));

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));

    expect(
      await screen.findByText('Los términos cambiaron otra vez. Revísalos y acéptalos de nuevo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(await screen.findByText('Vigente desde el 1 de diciembre de 2026')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Política de privacidad/u })).toBeNull();
  });
});
