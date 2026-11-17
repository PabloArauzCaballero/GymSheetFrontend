'use client';

import { useMutation } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  ciExtensionLabels,
  kycCopy,
  kycDocumentSlots,
  kycFailure,
  legalPartForMissing,
  stepForMissing,
  type BusinessWizardStep,
  type KycLegalPart,
} from '@gymsheet/domain';
import type { BusinessMe, CiExtension, KycState, KycSubmitResult } from '@/shared/api/schemas';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { Button } from '@/shared/components/ui/button';
import { businessKycService } from '../../services/business-kyc-client';
import { KycNav } from './kyc-nav';

function Section({ title, onEdit, children }: Readonly<{ title: string; onEdit: () => void; children: ReactNode }>) {
  return (
    <section className="grid gap-2 border-b border-[var(--border-subtle)] pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="t-headline">{title}</h3>
        <Button onClick={onEdit} size="sm" type="button" variant="ghost">
          {kycCopy.review.edit}
          <span className="sr-only">: {title}</span>
        </Button>
      </div>
      <dl className="m-0 grid gap-1.5 text-[15px]">{children}</dl>
    </section>
  );
}

function Item({ label, value }: Readonly<{ label: string; value: string | null | undefined }>) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="m-0 break-words">{value}</dd>
    </div>
  );
}

/**
 * Step 7, «Revisa y envía»: everything in one summary with «Editar» per
 * step, a warning for photos that cannot be read (fix them now and the
 * business can publish in seconds) and the submit. A 422 KYC_INCOMPLETE
 * sends the person straight to the step that is missing something.
 */
export function KycReviewStep({
  state,
  me,
  onEdit,
  onSubmitted,
  onBack,
}: Readonly<{
  state: KycState;
  me: BusinessMe | undefined;
  onEdit: (step: BusinessWizardStep, part?: KycLegalPart, notice?: string) => void;
  onSubmitted: (result: KycSubmitResult) => void;
  onBack: () => void;
}>) {
  const submission = state.submission;
  const fields = submission?.fields;
  const legalKind = submission?.legalKind ?? me?.account.legalKind ?? 'COMPANY';
  const documents = submission?.documents ?? [];
  const slots = kycDocumentSlots(legalKind).filter((slot) => slot.key !== 'LOGO');
  const ready = documents.filter((document) => document.readable).length;
  const unreadable = documents.filter((document) => !document.readable).length;
  const submit = useMutation({
    mutationFn: businessKycService.submit,
    onSuccess: onSubmitted,
    onError: (error) => {
      const failure = kycFailure(error);
      const step = failure.missing ? stepForMissing(failure.missing) : null;
      if (step !== null && failure.missing) onEdit(step, legalPartForMissing(legalKind, failure.missing), failure.message);
    },
  });
  const ci = fields?.repCiMasked
    ? [fields.repCiMasked, fields.repCiComplement, fields.repCiExtension ? ciExtensionLabels[fields.repCiExtension as CiExtension] : null].filter(Boolean).join(' · ')
    : null;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
        <Section onEdit={() => onEdit(3)} title={kycCopy.review.sections.business}>
          <Item label="Nombre" value={fields?.tradeName ?? me?.entity.name} />
          <Item label="@usuario" value={me?.handle ? `@${me.handle.handle}` : null} />
          <Item label="Ciudad" value={me?.entity.city} />
        </Section>
        <Section onEdit={() => onEdit(4)} title={kycCopy.review.sections.phone}>
          <Item
            label="Celular"
            value={state.phone ? (state.phone.verified ? kycCopy.phone.verified(state.phone.phoneMasked) : kycCopy.phone.saved(state.phone.phoneMasked)) : kycCopy.review.phoneMissing}
          />
        </Section>
        <Section onEdit={() => onEdit(5)} title={kycCopy.review.sections.legal}>
          <Item label={kycCopy.legal.legalName} value={fields?.legalName} />
          <Item label={kycCopy.legal.nit} value={fields?.nitMasked} />
          <Item label={kycCopy.legal.address} value={fields?.address} />
          <Item label={legalKind === 'COMPANY' ? kycCopy.legal.repFullName : kycCopy.legal.personFullName} value={fields?.repFullName} />
          <Item label="Carnet" value={ci} />
          <Item label={kycCopy.legal.specialty} value={fields?.specialty} />
        </Section>
        <Section onEdit={() => onEdit(6)} title={kycCopy.review.sections.documents}>
          <Item label="Fotos" value={kycCopy.review.documentsSummary(ready, slots.filter((slot) => slot.required).length)} />
          <Item label="Logo" value={legalKind === 'COMPANY' ? (me?.entity.logoUrl ? kycCopy.documents.logoReady : kycCopy.documents.missing) : null} />
        </Section>
      </div>
      {unreadable > 0 ? (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 text-[var(--warning-text)]" role="status">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="grid gap-2">
            <p className="font-semibold">{kycCopy.review.unreadable(unreadable)}</p>
            <p className="t-subhead">{kycCopy.review.fixFirst}</p>
            <Button className="justify-self-start" onClick={() => onEdit(6)} size="sm" type="button" variant="ghost">
              {kycCopy.documents.retake}
            </Button>
          </div>
        </div>
      ) : null}
      <p className="t-footnote text-[var(--text-muted)]">{kycCopy.review.terms}</p>
      {submit.error ? <AuthAlert message={kycFailure(submit.error).message} /> : null}
      <KycNav
        loading={submit.isPending}
        nextLabel={submit.isPending ? kycCopy.review.submitting : kycCopy.review.submit}
        onBack={onBack}
        onNext={() => submit.mutate()}
      />
    </div>
  );
}
