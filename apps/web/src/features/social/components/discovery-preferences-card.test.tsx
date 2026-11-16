import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiscoveryPreferencesCard } from './discovery-preferences-card';

const { getDiscoveryPreferences } = vi.hoisted(() => ({ getDiscoveryPreferences: vi.fn() }));
vi.mock('@/features/social/services/social-service', () => ({
  socialService: { getDiscoveryPreferences, updateDiscoveryPreferences: vi.fn() },
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
});
