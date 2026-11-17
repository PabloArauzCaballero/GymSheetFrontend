import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfilePhotoGallery } from '@/features/profile/components/profile-photo-gallery';
import { queryKeys } from '@/shared/api/query-keys';
import { SocialDiscoverySettingsCard } from './social-discovery-settings-card';

/**
 * Every mutation that can close a gap of the «Para aparecer en Conocer»
 * checklist must re-read it; otherwise the checklist keeps asking for photos
 * that were just uploaded or a profile that was just switched on.
 */
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));
vi.mock('@/features/profile/services/profile-photos-service', () => ({
  profilePhotosService: { list: mocks.list, upload: mocks.upload, remove: mocks.remove },
}));
vi.mock('@/features/social/services/social-service', () => ({
  socialService: { getDiscoverySettings: mocks.getSettings, updateDiscoverySettings: mocks.updateSettings },
}));
vi.mock('@/shared/components/media/media-source-dialog', () => ({
  MediaSourceDialog: ({ open, onPick }: { open: boolean; onPick: (file: File) => void }) =>
    open ? (
      <button onClick={() => onPick(new File(['x'], 'yo.jpg', { type: 'image/jpeg' }))} type="button">
        Elegir yo.jpg
      </button>
    ) : null,
}));
vi.mock('@/shared/notifications', () => ({ notify: { error: vi.fn(), success: vi.fn() } }));

/** Renders `ui` and records every invalidated key, to ask whether readiness was among them. */
function renderWith(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidated: string[] = [];
  const original = client.invalidateQueries.bind(client);
  client.invalidateQueries = ((filters, options) => {
    invalidated.push(JSON.stringify(filters?.queryKey));
    return original(filters, options);
  }) as typeof client.invalidateQueries;
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return {
    readiness: () => invalidated.includes(JSON.stringify(queryKeys.discoveryReadiness)),
    reset: () => invalidated.splice(0),
  };
}

afterEach(() => vi.clearAllMocks());

describe('readiness checklist refresh', () => {
  it('re-reads readiness after uploading and after deleting a photo', async () => {
    mocks.list.mockResolvedValue([{ id: 'p1', url: 'https://example.test/1.jpg' }]);
    mocks.upload.mockResolvedValue({ id: 'p2', url: 'https://example.test/2.jpg' });
    mocks.remove.mockResolvedValue(undefined);
    const invalidated = renderWith(<ProfilePhotoGallery />);

    fireEvent.click(await screen.findByRole('button', { name: 'Agregar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elegir yo.jpg' }));
    await waitFor(() => expect(invalidated.readiness()).toBe(true));

    invalidated.reset();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar foto' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(invalidated.readiness()).toBe(true));
  });

  it('re-reads readiness after switching the social profile on', async () => {
    mocks.getSettings.mockResolvedValue({ profileEnabled: false, crossGymEnabled: false, mapEnabled: false, version: 3 });
    mocks.updateSettings.mockResolvedValue({ profileEnabled: true, crossGymEnabled: false, mapEnabled: false, version: 4 });
    const invalidated = renderWith(<SocialDiscoverySettingsCard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Activar perfil social' }));
    await waitFor(() => expect(mocks.updateSettings).toHaveBeenCalled());
    await waitFor(() => expect(invalidated.readiness()).toBe(true));
  });
});
