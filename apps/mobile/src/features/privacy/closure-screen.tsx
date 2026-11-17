import { View } from 'react-native';
import { accountClosureCopy } from '@gymsheet/domain';
import { AuthAlert } from '@/components/auth-shell';
import { ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { Segmented } from '@/features/body-map/segmented';
import { PinField } from '@/features/email-verification/pin-field';
import { sanitizePin } from '@/features/email-verification/email-verification-logic';
import { spacing } from '@/theme';
import { ClosurePreviewList } from './closure-preview-list';
import { useAccountClosure } from './use-account-closure';

const METHOD_LABEL = { password: accountClosureCopy.proofPassword, pin: accountClosureCopy.proofPin } as const;

export function ClosureScreen() {
  const flow = useAccountClosure();
  const { preview } = flow;

  return (
    <ScrollScreen>
      <BackLink fallbackHref="/datos-privacidad" />
      <ScreenHeader detail subtitle="Antes de cerrarla, mira qué pasa con cada cosa." title={accountClosureCopy.title} />

      {preview.isPending ? (
        <RowsSkeleton rows={4} thumb={24} />
      ) : preview.isError ? (
        <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />
      ) : !preview.data.allowed ? (
        <Card>
          <Text variant="headline">No puedes cerrarla desde la app</Text>
          <Text tone="secondary">{accountClosureCopy.staff}</Text>
        </Card>
      ) : (
        <>
          <ClosurePreviewList preview={preview.data} />

          <Section icon="shield-checkmark-outline" title={accountClosureCopy.proofTitle}>
            <Card>
              {flow.methods.length > 1 ? (
                <Segmented
                  label="Cómo confirmas"
                  onChange={flow.choose}
                  options={flow.methods.map((value) => ({ value, label: METHOD_LABEL[value] }))}
                  value={flow.method}
                />
              ) : null}
              {flow.method === 'password' ? (
                <Input
                  autoComplete="current-password"
                  error={flow.failure?.field === 'password' ? flow.failure.message : undefined}
                  icon="lock-closed-outline"
                  label={accountClosureCopy.passwordLabel}
                  onChangeText={flow.setValue}
                  onSubmitEditing={flow.submit}
                  revealable
                  textContentType="password"
                  value={flow.value}
                />
              ) : flow.pinSent ? (
                <View style={{ gap: spacing.sm }}>
                  <Text tone="secondary" variant="footnote">{accountClosureCopy.pinSent}</Text>
                  <PinField
                    error={flow.failure?.field === 'pin' ? flow.failure.message : null}
                    onChangeText={(text) => flow.setValue(sanitizePin(text))}
                    value={flow.value}
                  />
                  <Button label="Reenviar código" loading={flow.sendingPin} onPress={flow.sendPin} size="sm" variant="ghost" />
                </View>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <Text tone="secondary" variant="footnote">Te enviaremos un código a tu correo para confirmar.</Text>
                  {flow.failure?.field === 'pin' ? <AuthAlert message={flow.failure.message} /> : null}
                  <Button icon="mail-outline" label={accountClosureCopy.sendPin} loading={flow.sendingPin} onPress={flow.sendPin} size="sm" variant="secondary" />
                </View>
              )}
            </Card>
          </Section>

          {flow.failure && flow.failure.field === null ? <AuthAlert message={flow.failure.message} /> : null}
          <Button
            disabled={flow.method === 'pin' && !flow.pinSent}
            icon="trash-outline"
            label={accountClosureCopy.submit}
            loading={flow.closing}
            onPress={flow.submit}
            variant="destructive"
          />
          <Text tone="muted" variant="footnote">
            {flow.method === 'pin' && !flow.pinSent ? 'Primero pide el código. ' : ''}
            Es definitivo: no se puede deshacer.
          </Text>
        </>
      )}
    </ScrollScreen>
  );
}
