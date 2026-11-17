import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { kycOutcomeFromSubmit } from '@gymsheet/domain';
import { ApiError } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import type { KycState, KycSubmission } from '@/shared/api/schemas';
import { useKycState } from '../../hooks/use-kyc';
import { KycCompanyForm } from './kyc-company-form';
import { KycDocumentsStep } from './kyc-documents-step';
import { KycPhoneStep } from './kyc-phone-step';
import { KycResultView } from './kyc-result-view';
import { KycReviewStep } from './kyc-review-step';

const mocks = vi.hoisted(() => ({
  requestPhoneCode: vi.fn(),
  confirmPhoneCode: vi.fn(),
  saveDraft: vi.fn(),
  uploadDocument: vi.fn(),
  uploadLogo: vi.fn(),
  deleteDocument: vi.fn(),
  submit: vi.fn(),
  state: vi.fn(),
  push: vi.fn(),
}));
vi.mock('../../services/business-kyc-client', () => ({ businessKycService: mocks }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn(), refresh: vi.fn() }) }));

const fields = {
  tradeName: null,
  primaryCategoryId: null,
  legalName: null,
  nitMasked: null,
  repFullName: null,
  repCiMasked: null,
  repCiComplement: null,
  repCiExtension: null,
  specialty: null,
  address: null,
  seprecNumber: null,
  phoneMasked: null,
};
const submission: KycSubmission = {
  id: '00000000-0000-4000-8000-000000000009',
  version: 1,
  purpose: 'INITIAL',
  status: 'DRAFT',
  legalKind: 'INDIVIDUAL',
  fields,
  documents: [],
  selfieChallenge: null,
  submittedAt: null,
  decidedAt: null,
  reviewDueAt: null,
  postReviewDueAt: null,
};
const state: KycState = {
  kycStatus: 'DRAFT',
  accountStatus: 'ONBOARDING',
  badge: null,
  submission,
  missing: [],
  phone: null,
  consent: { kind: 'KYC_SELFIE', granted: true, upToDate: true, currentVersion: '2026-11-16' },
  attempts: { used: 0, max: 3, resubmitAvailableAt: null, canResubmit: false },
  lastDecision: null,
};

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(queryKeys.business.kyc, state);
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Reads the cached state like the wizard does, so a write's answer re-renders the step. */
function LiveDocuments() {
  const kyc = useKycState();
  return kyc.data ? <KycDocumentsStep me={undefined} onBack={vi.fn()} onNext={vi.fn()} state={kyc.data} /> : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.mockResolvedValue(state);
});

describe('step 4, phone', () => {
  it('checks the number live, and without a provider keeps it and lets the business go on', async () => {
    const onNext = vi.fn();
    mocks.requestPhoneCode.mockResolvedValue({ phoneMasked: '+591 •••••567', codeSent: false, expiresAt: null });
    wrap(<KycPhoneStep onBack={vi.fn()} onNext={onNext} phone={null} />);
    const input = screen.getByLabelText('Tu celular');
    fireEvent.change(input, { target: { value: '3123' } });
    fireEvent.blur(input);
    expect(await screen.findByText('Escribe un celular de Bolivia: 8 dígitos que empiezan con 6 o 7.')).toBeInTheDocument();
    expect(mocks.requestPhoneCode).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '7123 4567' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviarme el código' }));
    expect(await screen.findByText('Verificaremos tu número')).toBeInTheDocument();
    expect(mocks.requestPhoneCode).toHaveBeenCalledWith('+59171234567');
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(onNext).toHaveBeenCalled();
  });

  it('asks for the WhatsApp code and shows the attempts left next to it', async () => {
    mocks.requestPhoneCode.mockResolvedValue({ phoneMasked: '+591 •••••567', codeSent: true, expiresAt: '2026-11-16T10:10:00.000Z' });
    mocks.confirmPhoneCode.mockRejectedValue(new ApiError({ message: 'x', status: 400, kind: 'validation', code: 'PHONE_OTP_INVALID', details: { attemptsLeft: 4 } }));
    wrap(<KycPhoneStep onBack={vi.fn()} onNext={vi.fn()} phone={null} />);
    fireEvent.change(screen.getByLabelText('Tu celular'), { target: { value: '71234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviarme el código' }));
    expect(await screen.findByText('Te enviamos un código por WhatsApp al +591 •••••567.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar código' }));
    expect(await screen.findByText('El código no es correcto. Te quedan 4 intentos.')).toBeInTheDocument();
  });
});

describe('step 5, legal data', () => {
  it('saves the company part and puts a refused NIT next to its field', async () => {
    mocks.saveDraft.mockRejectedValueOnce(
      new ApiError({ message: 'x', status: 422, kind: 'validation', code: 'KYC_FIELD_INVALID', details: { field: 'nit', reason: 'FORMAT' } }),
    );
    mocks.saveDraft.mockResolvedValueOnce({ ...submission, legalKind: 'COMPANY' });
    const onSaved = vi.fn();
    wrap(<KycCompanyForm onBack={vi.fn()} onSaved={onSaved} submission={null} />);
    expect(screen.getByLabelText('NIT')).toHaveAttribute('inputmode', 'numeric');
    fireEvent.change(screen.getByLabelText('Razón social'), { target: { value: 'Top Fitness SRL' } });
    fireEvent.change(screen.getByLabelText('NIT'), { target: { value: '1029 384 567' } });
    fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: 'Av. Busch 123' } });
    fireEvent.click(screen.getByRole('button', { name: /Seguir/u }));
    expect(await screen.findByText('Revisa el NIT: solo números, de 7 a 13 dígitos.')).toBeInTheDocument();
    expect(mocks.saveDraft).toHaveBeenCalledWith({ legalName: 'Top Fitness SRL', address: 'Av. Busch 123', seprecNumber: null, nit: '1029384567' });
    fireEvent.click(screen.getByRole('button', { name: /Seguir/u }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });
});

describe('step 6, documents', () => {
  it('refuses HEIC before uploading and shows the readability verdict at once', async () => {
    mocks.uploadDocument.mockResolvedValue({ id: 'd1', kind: 'CI_FRONT', readable: false, readabilityCodes: ['TOO_SMALL'], width: 640, height: 480, uploadedAt: '2026-11-16T10:00:00.000Z' });
    // The background re-read stays in flight: what shows is the upload's own answer.
    mocks.state.mockReturnValue(new Promise(() => undefined));
    wrap(<LiveDocuments />);
    const slot = screen.getByTestId('kyc-slot-CI_FRONT');
    const input = slot.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'ci.heic', { type: 'image/heic' })] } });
    expect(await within(slot).findByRole('alert')).toHaveTextContent('Usa JPG o PNG');
    expect(mocks.uploadDocument).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { files: [new File(['x'], 'ci.jpg', { type: 'image/jpeg' })] } });
    expect(await within(slot).findByText('Vuelve a tomarla')).toBeInTheDocument();
    expect(within(slot).getByText('La foto es muy pequeña. Acércate más.')).toBeInTheDocument();
    expect(mocks.uploadDocument).toHaveBeenCalledWith('CI_FRONT', expect.any(FormData));
    expect(screen.getByRole('button', { name: /Seguir/u })).toBeDisabled();
    expect(screen.getByText('Sube las fotos marcadas como «Falta» para seguir.')).toBeInTheDocument();
  });
});

describe('step 7 and the result', () => {
  it('sends an incomplete submit back to the missing step with the reason', async () => {
    mocks.submit.mockRejectedValue(new ApiError({ message: 'x', status: 422, kind: 'validation', code: 'KYC_INCOMPLETE', details: { missing: ['DOCUMENT_SELFIE'] } }));
    const onEdit = vi.fn();
    wrap(<KycReviewStep me={undefined} onBack={vi.fn()} onEdit={onEdit} onSubmitted={vi.fn()} state={state} />);
    fireEvent.click(screen.getByRole('button', { name: /Enviar a verificación/u }));
    await waitFor(() => expect(onEdit).toHaveBeenCalledWith(6, undefined, 'Te falta completar algo. Te llevamos ahí.'));
  });

  it('publishes with the first-listing and QR payment links, never a dead link', () => {
    const outcome = kycOutcomeFromSubmit({ submissionId: submission.id, status: 'AUTO_APPROVED', reviewDueAt: null, postReviewDueAt: null, userFacingCodes: [], handle: 'topfit' });
    wrap(<KycResultView heading outcome={outcome} />);
    expect(screen.getByRole('heading', { name: '¡Listo! Tu negocio ya está publicado en @topfit' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi ficha' })).toHaveAttribute('href', '/@topfit');
    // Franja 8c shipped the listings and 8d the payment config: both are real links now (this replaces
    // the 8c assertion that «Configura tu cobro por QR» was disabled).
    expect(screen.getByRole('link', { name: 'Publica tu primer plan o producto' })).toHaveAttribute('href', '/negocio/publicaciones/nueva');
    expect(screen.getByRole('link', { name: 'Configura tu cobro por QR' })).toHaveAttribute('href', '/negocio/cobro');
  });
});
