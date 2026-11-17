'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, MessageCircle, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { kycCopy, kycFailure } from '@gymsheet/domain';
import { withPhone } from '@/shared/api/query-keys';
import {
  kycCodeFormSchema,
  kycPhoneFormSchema,
  normalizeBolivianMobile,
  type KycCodeForm,
  type KycPhoneForm,
  type PhoneState,
} from '@/shared/api/schemas';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { useKycCache } from '../../hooks/use-kyc';
import { businessKycService } from '../../services/business-kyc-client';
import { KycNav } from './kyc-nav';

type Phase = { kind: 'enter' } | { kind: 'code'; masked: string } | { kind: 'noProvider'; masked: string };

/**
 * Step 4, «Tu teléfono»: +591 and the 6-digit code that goes by WhatsApp.
 * Without a configured provider the backend answers `codeSent: false`: the
 * number is kept, REPP confirms it by hand, and the business goes on.
 */
export function KycPhoneStep({ phone, onNext, onBack }: Readonly<{ phone: PhoneState | null; onNext: () => void; onBack: () => void }>) {
  const cache = useKycCache();
  const [phase, setPhase] = useState<Phase>({ kind: 'enter' });
  const [editing, setEditing] = useState(!phone);
  const phoneForm = useForm<KycPhoneForm>({ resolver: zodResolver(kycPhoneFormSchema), mode: 'onTouched', defaultValues: { phone: '' } });
  const codeForm = useForm<KycCodeForm>({ resolver: zodResolver(kycCodeFormSchema), mode: 'onTouched', defaultValues: { code: '' } });

  async function send(values: KycPhoneForm) {
    phoneForm.clearErrors('root');
    try {
      const sent = await businessKycService.requestPhoneCode(normalizeBolivianMobile(values.phone) ?? values.phone);
      cache((state) => withPhone(state, { phoneMasked: sent.phoneMasked, verified: false, verifiedAt: null }));
      setEditing(false);
      setPhase(sent.codeSent ? { kind: 'code', masked: sent.phoneMasked } : { kind: 'noProvider', masked: sent.phoneMasked });
    } catch (error: unknown) {
      const failure = kycFailure(error);
      phoneForm.setError(failure.field === 'phone' ? 'phone' : 'root', { message: failure.message }, { shouldFocus: true });
    }
  }

  async function confirm(values: KycCodeForm) {
    codeForm.clearErrors('root');
    try {
      const verified = await businessKycService.confirmPhoneCode(values.code);
      cache((state) => withPhone(state, verified));
      onNext();
    } catch (error: unknown) {
      const failure = kycFailure(error);
      codeForm.setError(failure.field === 'code' ? 'code' : 'root', { message: failure.message }, { shouldFocus: true });
    }
  }

  const changeNumber = () => {
    setEditing(true);
    setPhase({ kind: 'enter' });
    codeForm.reset();
  };

  if (phase.kind === 'code') {
    return (
      <form className="grid gap-5" noValidate onSubmit={codeForm.handleSubmit(confirm)}>
        <p className="t-subhead flex items-start gap-2 text-[var(--text-muted)]" role="status">
          <MessageCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {kycCopy.phone.codeSent(phase.masked)}
        </p>
        <Field error={codeForm.formState.errors.code?.message} htmlFor="kyc-code" label={kycCopy.phone.codeLabel}>
          <Input autoComplete="one-time-code" id="kyc-code" inputMode="numeric" maxLength={6} pattern="[0-9]*" {...codeForm.register('code')} />
        </Field>
        {codeForm.formState.errors.root?.message ? <AuthAlert message={codeForm.formState.errors.root.message} /> : null}
        <Button className="w-full" loading={codeForm.formState.isSubmitting} size="lg" type="submit" variant="primary">
          {kycCopy.phone.confirm}
        </Button>
        <div className="flex flex-wrap justify-center gap-2">
          <Button loading={phoneForm.formState.isSubmitting} onClick={() => void phoneForm.handleSubmit(send)()} size="sm" type="button" variant="ghost">
            {kycCopy.phone.resend}
          </Button>
          <Button onClick={changeNumber} size="sm" type="button" variant="ghost">
            {kycCopy.phone.changeNumber}
          </Button>
        </div>
      </form>
    );
  }

  if (phase.kind === 'noProvider' || (!editing && phone)) {
    const masked = phase.kind === 'noProvider' ? phase.masked : (phone?.phoneMasked ?? '');
    const verified = phase.kind !== 'noProvider' && phone?.verified;
    return (
      <div className="grid gap-5">
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4" role="status">
          {verified ? (
            <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--success-text)]" />
          ) : (
            <Smartphone aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--text-muted)]" />
          )}
          <div className="grid gap-1">
            <p className="font-semibold">
              {phase.kind === 'noProvider' ? kycCopy.phone.noProvider : verified ? kycCopy.phone.verified(masked) : kycCopy.phone.saved(masked)}
            </p>
            {phase.kind === 'noProvider' ? <p className="t-subhead text-[var(--text-muted)]">{kycCopy.phone.noProviderBody(masked)}</p> : null}
          </div>
        </div>
        <KycNav onBack={onBack} onNext={onNext} />
        <Button className="justify-self-center" onClick={changeNumber} size="sm" type="button" variant="ghost">
          {kycCopy.phone.changeNumber}
        </Button>
      </div>
    );
  }

  return (
    <form className="grid gap-5" noValidate onSubmit={phoneForm.handleSubmit(send)}>
      <Field error={phoneForm.formState.errors.phone?.message} hint={kycCopy.phone.hint} htmlFor="kyc-phone" label={kycCopy.phone.label}>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[17px] text-[var(--text-muted)]">
            +591
          </span>
          <Input
            aria-invalid={phoneForm.formState.errors.phone ? true : undefined}
            autoComplete="tel-national"
            className="pl-[4.25rem] tabular-nums"
            id="kyc-phone"
            inputMode="tel"
            placeholder={kycCopy.phone.placeholder}
            type="tel"
            {...phoneForm.register('phone')}
          />
        </div>
      </Field>
      {phoneForm.formState.errors.root?.message ? <AuthAlert message={phoneForm.formState.errors.root.message} /> : null}
      <Button className="w-full" loading={phoneForm.formState.isSubmitting} size="lg" type="submit" variant="primary">
        {kycCopy.phone.send}
      </Button>
      {phone ? (
        <Button className="justify-self-center" onClick={() => setEditing(false)} size="sm" type="button" variant="ghost">
          {kycCopy.back}
        </Button>
      ) : (
        <Button className="justify-self-center" onClick={onBack} size="sm" type="button" variant="ghost">
          {kycCopy.back}
        </Button>
      )}
    </form>
  );
}
