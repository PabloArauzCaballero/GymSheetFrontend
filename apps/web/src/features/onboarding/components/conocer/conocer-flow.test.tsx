import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConocerFlow } from './conocer-flow';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  setSocialStep: vi.fn(),
  getProfile: vi.fn(),
  update: vi.fn(),
  photos: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, push: vi.fn() }) }));
vi.mock('../../services/onboarding-service', () => ({
  onboardingService: { setSocialStep: mocks.setSocialStep },
}));
vi.mock('@/features/social/services/social-profile-service', () => ({
  socialProfileKeys: {
    profile: ['social', 'profile'],
    interestCatalog: ['social', 'interest-catalog'],
    readiness: ['social', 'discovery-readiness'],
  },
  socialProfileService: {
    get: mocks.getProfile,
    update: mocks.update,
    interestCatalog: vi.fn().mockResolvedValue([{ code: 'RUNNING', label: 'Correr' }]),
  },
}));
vi.mock('@/features/profile/services/profile-photos-service', () => ({
  profilePhotosService: { list: mocks.photos },
}));
// The real editors are covered by their own tests; here only the step wiring matters.
vi.mock('@/features/social/components/discovery-preferences-card', () => ({
  DiscoveryPreferencesCard: ({ onSaved, submitLabel }: { onSaved: () => void; submitLabel: string }) => (
    <button onClick={onSaved} type="button">
      {submitLabel}
    </button>
  ),
}));
vi.mock('@/features/profile/components/profile-photo-gallery', () => ({
  ProfilePhotoGallery: () => <p>Galería</p>,
}));
vi.mock('@/shared/notifications', () => ({ notify: { error: vi.fn(), success: vi.fn() } }));

const profile = {
  configured: false,
  orientation: null,
  orientationVisible: false,
  interests: [],
  drinking: null,
  smoking: null,
  pets: null,
  bio: null,
  version: 0,
};

function renderFlow() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConocerFlow />
    </QueryClientProvider>,
  );
}

describe('ConocerFlow', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getProfile.mockResolvedValue(profile);
    mocks.update.mockImplementation(async (input: { expectedVersion: number }) => ({
      ...profile,
      ...input,
      configured: true,
      version: input.expectedVersion + 1,
    }));
    mocks.setSocialStep.mockResolvedValue({ status: 'COMPLETED', socialStep: 'DONE' });
  });

  it('«Saltar por ahora» closes the step as SKIP and goes to Comunidad', async () => {
    mocks.photos.mockResolvedValue([]);
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Saltar por ahora' }));
    await waitFor(() => expect(mocks.setSocialStep).toHaveBeenCalled());
    expect(mocks.setSocialStep.mock.calls[0]?.[0]).toBe('SKIP');
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/comunidad'));
  });

  it('saves every substep and finishes as DONE once there are two photos', async () => {
    mocks.photos.mockResolvedValue([
      { id: 'p1', url: 'https://example.test/1.jpg' },
      { id: 'p2', url: 'https://example.test/2.jpg' },
    ]);
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));
    for (const title of ['Elige tus intereses', 'Cuéntanos tus hábitos', 'Tu orientación', 'Escribe tu bio']) {
      expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Continuar/u }));
    }
    expect(await screen.findByRole('heading', { name: 'Sube tus fotos' })).toBeInTheDocument();
    expect(mocks.update).toHaveBeenCalledTimes(4);
    expect(mocks.update.mock.calls[3]?.[0]).toMatchObject({ expectedVersion: 3, orientationVisible: false });

    const finish = screen.getByRole('button', { name: 'Terminar' });
    await waitFor(() => expect(finish).toBeEnabled());
    fireEvent.click(finish);
    await waitFor(() => expect(mocks.setSocialStep.mock.calls[0]?.[0]).toBe('DONE'));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/comunidad'));
  });

  it('keeps «Terminar» disabled with fewer than two photos', async () => {
    mocks.photos.mockResolvedValue([{ id: 'p1', url: 'https://example.test/1.jpg' }]);
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));
    for (let step = 0; step < 4; step += 1) {
      const next = await screen.findByRole('button', { name: /Continuar/u });
      await waitFor(() => expect(next).toBeEnabled());
      fireEvent.click(next);
      await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(step + 1));
    }
    expect(await screen.findByRole('button', { name: 'Terminar' })).toBeDisabled();
    expect(screen.getByText(/Te falta 1 foto/u)).toBeInTheDocument();
  });
});
