import { emailChangeCopy } from '@gymsheet/domain';
import { AuthAlert } from '@/components/auth-shell';
import { Card, ScrollScreen, ScreenHeader } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { PinField } from '@/features/email-verification/pin-field';
import { accountEmailTextProps } from '@/lib/credential-input';
import { useAuthStore } from '@/state/auth-store';
import { useEmailChange } from './use-email-change';

export function EmailChangeScreen() {
  const current = useAuthStore((state) => state.principal?.email ?? '');
  const flow = useEmailChange();
  const banner = flow.failure && flow.failure.field === null ? flow.failure.message : null;

  if (flow.step === 'confirm') {
    return (
      <ScrollScreen>
        <BackLink fallbackHref="/datos-privacidad" />
        <ScreenHeader detail subtitle={emailChangeCopy.pinSent(flow.newEmail.trim())} title="Confirma tu nuevo correo" />
        <Card>
          <PinField
            editable={!flow.confirming}
            error={flow.failure?.field === 'pin' ? flow.failure.message : null}
            onChangeText={flow.setPin}
            value={flow.pin}
          />
          <Text tone="muted" variant="footnote">Hasta que lo confirmes, sigues entrando con {current}.</Text>
        </Card>
        {banner ? <AuthAlert message={banner} /> : null}
        <Button label="Reenviar código" loading={flow.sending} onPress={flow.resend} variant="ghost" />
        <Button haptic="none" label={emailChangeCopy.restart} onPress={flow.back} size="sm" variant="ghost" />
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <BackLink fallbackHref="/datos-privacidad" />
      <ScreenHeader detail subtitle={`Ahora entras con ${current}.`} title={emailChangeCopy.title} />
      <Card>
        <Input
          {...accountEmailTextProps}
          error={flow.failure?.field === 'email' ? flow.failure.message : undefined}
          icon="mail-outline"
          label={emailChangeCopy.newEmailLabel}
          onChangeText={flow.setNewEmail}
          value={flow.newEmail}
        />
        <Input
          autoComplete="current-password"
          error={flow.failure?.field === 'password' ? flow.failure.message : undefined}
          icon="lock-closed-outline"
          label={emailChangeCopy.passwordLabel}
          onChangeText={flow.setPassword}
          onSubmitEditing={flow.send}
          revealable
          textContentType="password"
          value={flow.password}
        />
        <Text tone="muted" variant="footnote">{emailChangeCopy.description}</Text>
      </Card>
      {banner ? <AuthAlert message={banner} /> : null}
      <Button icon="arrow-forward" iconPosition="end" label={emailChangeCopy.request} loading={flow.sending} onPress={flow.send} />
    </ScrollScreen>
  );
}
