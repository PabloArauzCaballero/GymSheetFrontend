import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListingWizard } from './listing-wizard';

const mocks = vi.hoisted(() => ({ create: vi.fn(), addPhoto: vi.fn(), categories: vi.fn(), push: vi.fn() }));
vi.mock('../services/listings-client', () => ({
  businessListingsService: { create: mocks.create, addPhoto: mocks.addPhoto },
  photoForm: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return form;
  },
}));
vi.mock('@/features/business/services/business-client', () => ({ businessService: { categories: mocks.categories } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }) }));

const ID = '8b1f6a52-3d5e-4d0b-9a63-0c8b4a5f1d11';

function renderWizard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ListingWizard entityType="GYM" />
    </QueryClientProvider>,
  );
}

const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.categories.mockResolvedValue([]);
  mocks.create.mockResolvedValue({ id: ID, visibility: 'PUBLIC', moderationReasonCode: null, autoCheckCodes: [] });
});

describe('ListingWizard', () => {
  it('asks for a kind first, with the gym kinds on top', () => {
    renderWizard();
    expect(screen.getByText('Paso 1 de 4')).toBeTruthy();
    fireEvent.click(button('Continuar'));
    expect(screen.getByRole('alert').textContent).toContain('Elige qué vas a publicar');
    const radios = screen.getAllByRole('radio');
    expect((radios[0] as HTMLInputElement).value).toBe('MEMBERSHIP');
  });

  it('publishes a membership through the four steps with the per-kind body', async () => {
    renderWizard();
    fireEvent.click(screen.getByLabelText(/Membresía/u));
    fireEvent.click(button('Continuar'));
    expect(screen.getByText('Añade fotos')).toBeTruthy();
    fireEvent.click(button('Saltar'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Mensual libre' } });
    fireEvent.change(screen.getByLabelText('Precio'), { target: { value: '250,50' } });
    fireEvent.change(screen.getByLabelText('Qué incluye'), { target: { value: 'Acceso a toda la sala.' } });
    fireEvent.click(button('Continuar'));
    expect(screen.getByText('Paso 4 de 4')).toBeTruthy();
    fireEvent.click(button('Publicar'));
    expect(await screen.findByText(/Escribe cuántos días dura/u)).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Duración (días)'), { target: { value: '30' } });
    fireEvent.click(button('Publicar'));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(`/negocio/publicaciones/${ID}`));
    expect(mocks.create).toHaveBeenCalledWith({
      offerKind: 'MEMBERSHIP',
      name: 'Mensual libre',
      description: 'Acceso a toda la sala.',
      benefits: [],
      price: 250.5,
      validityDays: 30,
      sessionsCount: null,
      stockQuantity: null,
      productCategoryId: null,
    });
  });

  it('a day pass has no detail step: it publishes from step 3', async () => {
    renderWizard();
    fireEvent.click(screen.getByLabelText(/Pase de un día/u));
    fireEvent.click(button('Continuar'));
    fireEvent.click(button('Saltar'));
    expect(screen.getByText('Paso 3 de 3')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Pase diario' } });
    fireEvent.change(screen.getByLabelText('Precio'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Qué incluye'), { target: { value: 'Una visita.' } });
    fireEvent.click(button('Publicar'));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ offerKind: 'DAY_PASS', validityDays: null })));
  });
});
