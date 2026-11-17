import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImpersonationBanner } from './impersonation-banner';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

function renderBanner() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ImpersonationBanner gymName="Gimnasio Norte" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('ImpersonationBanner', () => {
  it('names the gym being operated, with no way to dismiss it', () => {
    renderBanner();
    const banner = screen.getByRole('complementary', { name: 'Gimnasio que operas' });
    expect(banner).toHaveTextContent('Operando Gimnasio Norte');
    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cerrar/iu })).toBeNull();
  });

  it('«Salir» drops the impersonation through the BFF and re-renders the portal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true, data: null }));
    vi.stubGlobal('fetch', fetchMock);
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/impersonation', { method: 'DELETE' });
  });
});
