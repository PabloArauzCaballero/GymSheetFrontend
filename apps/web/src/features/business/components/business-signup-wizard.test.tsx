import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { BusinessSignupWizard, type BusinessWizardStart } from './business-signup-wizard';

const mocks = vi.hoisted(() => ({
  signupBusiness: vi.fn(),
  fetchBusinessLegal: vi.fn(),
  categories: vi.fn(),
  claimHandle: vi.fn(),
  updateProfile: vi.fn(),
  handleAvailability: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('../services/business-client', () => ({
  signupBusiness: mocks.signupBusiness,
  fetchBusinessLegal: mocks.fetchBusinessLegal,
  businessService: {
    categories: mocks.categories,
    claimHandle: mocks.claimHandle,
    updateProfile: mocks.updateProfile,
    handleAvailability: mocks.handleAvailability,
  },
}));
vi.mock('@/features/auth/hooks/use-signup-protection', () => ({
  useSignupProtection: () => ({
    evidence: async () => ({ ticket: 'ticket' }),
    renew: vi.fn(),
    turnstileKey: 0,
    onTurnstileToken: vi.fn(),
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));

const legal = [
  { document: 'BUSINESS_TERMS', version: '2026-11-16', contentSha256: 'a'.repeat(64) },
  { document: 'BUSINESS_DPA', version: '2026-11-16', contentSha256: null },
  { document: 'PRIVACY', version: '2026-08-25' },
];

function renderWizard(start: BusinessWizardStart = { step: 0 }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BusinessSignupWizard start={start} />
    </QueryClientProvider>,
  );
}

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Seguir' }));

function fillAccount() {
  fireEvent.change(screen.getByLabelText('Nombre de tu negocio'), { target: { value: 'Top Fitness' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'Top@Negocio.bo' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Negocio2026!' } });
  fireEvent.click(screen.getByRole('checkbox'));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchBusinessLegal.mockResolvedValue(legal);
});

describe('BusinessSignupWizard', () => {
  it('step 0 asks what you are, and the legal kind only of a service provider', () => {
    renderWizard();
    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument();
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('Elige una opción');

    fireEvent.click(screen.getByRole('radio', { name: /Servicio/u }));
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('Indica si eres empresa o persona.');
    fireEvent.click(screen.getByRole('radio', { name: /Persona/u }));
    next();
    expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tu cuenta' })).toBeInTheDocument();
  });

  it('step 1 refuses an unchecked legal box without calling the server', async () => {
    renderWizard();
    fireEvent.click(screen.getByRole('radio', { name: /Gimnasio/u }));
    next();
    fillAccount();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta de negocio' }));
    expect(await screen.findByText('Marca la casilla para crear tu cuenta de negocio.')).toBeInTheDocument();
    expect(mocks.signupBusiness).not.toHaveBeenCalled();
  });

  it('creates the account with the whole legal set and moves to the email PIN', async () => {
    mocks.signupBusiness.mockResolvedValue({
      user: { id: '00000000-0000-4000-8000-000000000001', email: 'top@negocio.bo', nombreCompleto: 'Top Fitness', rol: 'NEGOCIO' },
      business: { entityId: '00000000-0000-4000-8000-000000000002', entityType: 'GYM', legalKind: 'COMPANY', status: 'ONBOARDING', kycStatus: 'DRAFT' },
    });
    renderWizard();
    fireEvent.click(screen.getByRole('radio', { name: /Gimnasio/u }));
    next();
    fillAccount();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta de negocio' }));

    expect(await screen.findByText('Paso 3 de 4')).toBeInTheDocument();
    expect(screen.getByText('top@negocio.bo')).toBeInTheDocument();
    expect(mocks.signupBusiness).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'GYM',
        businessName: 'Top Fitness',
        ticket: 'ticket',
        acceptances: [
          { document: 'BUSINESS_TERMS', version: '2026-11-16', contentSha256: 'a'.repeat(64) },
          { document: 'BUSINESS_DPA', version: '2026-11-16' },
          { document: 'PRIVACY', version: '2026-08-25' },
        ],
      }),
    );
    expect(mocks.signupBusiness.mock.calls[0]?.[0]).not.toHaveProperty('legalKind');
  });

  it('shows a taken email next to the field', async () => {
    mocks.signupBusiness.mockRejectedValue(
      new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'EMAIL_ALREADY_REGISTERED' }),
    );
    renderWizard();
    fireEvent.click(screen.getByRole('radio', { name: /Tienda/u }));
    next();
    fillAccount();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta de negocio' }));
    expect(await screen.findByText('Ya hay una cuenta con este correo. Inicia sesión o usa otro.')).toBeInTheDocument();
    expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument();
  });

  it('step 3 resumes prefilled, claims the handle, saves the profile and enters the portal', async () => {
    mocks.categories.mockResolvedValue([
      { id: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b', slug: 'gym', name: 'Gimnasio', description: null, iconKey: null, path: 'gym', entityScope: 'GYM', children: [] },
    ]);
    mocks.handleAvailability.mockResolvedValue({ handle: 'topfitness', available: true, reason: null });
    mocks.claimHandle.mockResolvedValue({ handle: 'topfitness', status: 'PENDING' });
    mocks.updateProfile.mockResolvedValue({});
    renderWizard({ step: 3, email: 'top@negocio.bo', entityType: 'GYM', profile: { name: 'Top Fitness' } });

    expect(screen.getByText('Paso 4 de 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Tu @usuario')).toHaveValue('topfitness');
    expect(await screen.findByText('@topfitness está libre.', {}, { timeout: 2000 })).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('Categoría'), { target: { value: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b' } });
    fireEvent.change(screen.getByLabelText('Ciudad'), { target: { value: 'Santa Cruz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y entrar' }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/negocio'));
    expect(mocks.claimHandle).toHaveBeenCalledWith('topfitness');
    expect(mocks.updateProfile).toHaveBeenCalledWith({
      name: 'Top Fitness',
      primaryCategoryId: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b',
      city: 'Santa Cruz',
    });
  });

  it('step 3 keeps the person there when the handle is taken at claim time', async () => {
    mocks.categories.mockResolvedValue([]);
    mocks.handleAvailability.mockRejectedValue(new Error('429'));
    mocks.claimHandle.mockRejectedValue(new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'HANDLE_TAKEN' }));
    renderWizard({ step: 3, entityType: 'GYM', profile: { name: 'Top Fitness', primaryCategoryId: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b', city: 'La Paz' } });
    expect(await screen.findByText('No pudimos comprobarlo. Lo revisamos al guardar.', {}, { timeout: 2000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y entrar' }));
    expect(await screen.findByText('Ese nombre ya está en uso.')).toBeInTheDocument();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
