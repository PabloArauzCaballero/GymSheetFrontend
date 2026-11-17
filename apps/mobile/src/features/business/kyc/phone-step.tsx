import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { kycCopy, kycFailure } from '@gymsheet/domain';
import { withPhone } from '@gymsheet/hooks';
import {
  kycCodeFormSchema,
  kycPhoneFormSchema,
  normalizeBolivianMobile,
  type KycCodeForm,
  type KycPhoneForm,
  type PhoneState,
} from '@gymsheet/schemas';
import { AuthAlert } from '@/components/auth-shell';
import { Card } from '@/components/layout';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { spacing } from '@/theme';
import { kycService, useKycCache } from './kyc-service';
import { StepNav } from './step-nav';

type Phase = { kind: 'enter' } | { kind: 'code'; masked: string } | { kind: 'noProvider'; masked: string };

/**
 * Step 4, «Tu teléfono»: +591 and the WhatsApp code. Without a provider the
 * backend answers `codeSent: false`: the number is kept and REPP confirms it.
 */
export function PhoneStep({ phone, onNext, onBack }: { phone: PhoneState | null; onNext: () => void; onBack: () => void }) {
  const cache = useKycCache();
  const [phase, setPhase] = useState<Phase>({ kind: 'enter' });
  const [editing, setEditing] = useState(!phone);
  const phoneForm = useForm<KycPhoneForm>({ resolver: zodResolver(kycPhoneFormSchema), mode: 'onTouched', defaultValues: { phone: '' } });
  const codeForm = useForm<KycCodeForm>({ resolver: zodResolver(kycCodeFormSchema), mode: 'onTouched', defaultValues: { code: '' } });

  const send = phoneForm.handleSubmit(async (values) => {
    try {
      const sent = await kycService.requestPhoneCode(normalizeBolivianMobile(values.phone) ?? values.phone);
      cache((state) => withPhone(state, { phoneMasked: sent.phoneMasked, verified: false, verifiedAt: null }));
      setEditing(false);
      setPhase(sent.codeSent ? { kind: 'code', masked: sent.phoneMasked } : { kind: 'noProvider', masked: sent.phoneMasked });
    } catch (error) {
      const failure = kycFailure(error);
      phoneForm.setError(failure.field === 'phone' ? 'phone' : 'root', { message: failure.message });
    }
  });

  const confirm = codeForm.handleSubmit(async (values) => {
    try {
      const verified = await kycService.confirmPhoneCode(values.code);
      cache((state) => withPhone(state, verified));
      onNext();
    } catch (error) {
      const failure = kycFailure(error);
      codeForm.setError(failure.field === 'code' ? 'code' : 'root', { message: failure.message });
    }
  });

  const changeNumber = () => {
    setEditing(true);
    setPhase({ kind: 'enter' });
    codeForm.reset();
  };

  if (phase.kind === 'code') {
    return (
      <View style={{ gap: spacing.md }}>
        <Text accessibilityLiveRegion="polite" tone="secondary" variant="subhead">{kycCopy.phone.codeSent(phase.masked)}</Text>
        <Controller
          control={codeForm.control}
          name="code"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              autoComplete="sms-otp"
              error={codeForm.formState.errors.code?.message}
              keyboardType="number-pad"
              label={kycCopy.phone.codeLabel}
              maxLength={6}
              onBlur={onBlur}
              onChangeText={onChange}
              textContentType="oneTimeCode"
              value={value}
            />
          )}
        />
        {codeForm.formState.errors.root?.message ? <AuthAlert message={codeForm.formState.errors.root.message} /> : null}
        <Button label={kycCopy.phone.confirm} loading={codeForm.formState.isSubmitting} onPress={confirm} />
        <Button label={kycCopy.phone.resend} loading={phoneForm.formState.isSubmitting} onPress={send} size="sm" variant="ghost" />
        <Button label={kycCopy.phone.changeNumber} onPress={changeNumber} size="sm" variant="ghost" />
      </View>
    );
  }

  if (phase.kind === 'noProvider' || (!editing && phone)) {
    const masked = phase.kind === 'noProvider' ? phase.masked : (phone?.phoneMasked ?? '');
    const verified = phase.kind !== 'noProvider' && Boolean(phone?.verified);
    return (
      <View style={{ gap: spacing.md }}>
        <Card>
          <Text accessibilityLiveRegion="polite" strong variant="body">
            {phase.kind === 'noProvider' ? kycCopy.phone.noProvider : verified ? kycCopy.phone.verified(masked) : kycCopy.phone.saved(masked)}
          </Text>
          {phase.kind === 'noProvider' ? <Text tone="secondary" variant="subhead">{kycCopy.phone.noProviderBody(masked)}</Text> : null}
        </Card>
        <StepNav onBack={onBack} onNext={onNext} />
        <Button label={kycCopy.phone.changeNumber} onPress={changeNumber} size="sm" variant="ghost" />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Controller
        control={phoneForm.control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            autoComplete="tel"
            error={phoneForm.formState.errors.phone?.message}
            icon="logo-whatsapp"
            keyboardType="phone-pad"
            label={`${kycCopy.phone.label} (+591)`}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={kycCopy.phone.placeholder}
            textContentType="telephoneNumber"
            value={value}
          />
        )}
      />
      <Text tone="secondary" variant="footnote">{kycCopy.phone.hint}</Text>
      {phoneForm.formState.errors.root?.message ? <AuthAlert message={phoneForm.formState.errors.root.message} /> : null}
      <Button label={kycCopy.phone.send} loading={phoneForm.formState.isSubmitting} onPress={send} />
      <Button label={kycCopy.back} onPress={phone ? () => setEditing(false) : onBack} size="sm" variant="ghost" />
    </View>
  );
}
