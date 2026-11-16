import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiscoveryPreferencesCard } from './discovery-preferences-card';

const { getDiscoveryPreferences, updateDiscoveryPreferences } = vi.hoisted(() => ({
  getDiscoveryPreferences: vi.fn(),
  updateDiscoveryPreferences: vi.fn(),
}));
vi.mock('@/features/social/services/social-service', () => ({
  socialService: { getDiscoveryPreferences, updateDiscoveryPreferences },
}));
vi.mock('@/shared/notifications', () => ({ notify: { error: vi.fn(), success: vi.fn() } }));

describe('DiscoveryPreferencesCard', () => {
  it('shows a retryable error when the saved preferences cannot load', async () => {
    getDiscoveryPreferences.mockRejectedValueOnce(new Error('network unavailable'));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <DiscoveryPreferencesCard />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar tus preferencias de descubrimiento.',
    );
    getDiscoveryPreferences.mockResolvedValueOnce({ configured: false, version: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Quiero conocer')).toBeTruthy();
    expect(getDiscoveryPreferences).toHaveBeenCalledTimes(2);
  });

  it('keeps «Aún no lo sé» alone and saves «Todos» as both genders', async () => {
    getDiscoveryPreferences.mockResolvedValue({
      configured: true,
      genders: ['FEMALE'],
      intents: ['TRAINING', 'DATING'],
      minAge: 20,
      maxAge: 40,
      radiusKm: 10,
      flexibleAge: false,
      flexibleDistance: false,
      version: 3,
    });
    updateDiscoveryPreferences.mockResolvedValueOnce({ configured: false, version: 4 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <DiscoveryPreferencesCard submitLabel="Continuar" />
      </QueryClientProvider>,
    );

    const unsure = await screen.findByRole('button', { name: 'Aún no lo sé' });
    fireEvent.click(unsure);
    expect(unsure).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Compañero de entreno' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Citas' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Amistad' }));
    expect(unsure).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(unsure);

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(updateDiscoveryPreferences).toHaveBeenCalled());
    expect(updateDiscoveryPreferences.mock.calls[0]?.[0]).toMatchObject({
      genders: ['MALE', 'FEMALE'],
      intents: ['UNSURE'],
      expectedVersion: 3,
    });
  });
});
