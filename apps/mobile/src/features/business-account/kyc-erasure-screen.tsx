import { Ionicons } from '@expo/vector-icons';
import { kycErasureCopy, kycErasureFailure } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { kycEraseInputSchema } from '@gymsheet/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { View } from 'react-native';
import { AuthAlert } from '@/components/auth-shell';
import { Card, ScrollScreen, ScreenHeader } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { kycService } from '@/features/business/kyc/kyc-service';
import { confirm } from '@/notifications';
import { iconSizes, radii, spacing, tones } from '@/theme';

/**
 * «Borrar mis documentos de verificación» (ADR-0028 §7): what is erased and
 * what it costs (the business is suspended until a new KYC), the password,
 * then a second confirmation. The shell re-reads the account afterwards.
 */
export function KycErasureScreen() {
  const client = useQueryClient();
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState<{ field: 'password' | null; message: string } | null>(null);
  const erase = useMutation({
    mutationFn: (value: string) => kycService.erase(value),
    onSuccess: () => {
      setPassword('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Every `business/me` key shares the prefix: the shell, the KYC and the banners read the suspension.
      void client.invalidateQueries({ queryKey: queryKeys.business.me });
    },
    onError: (error) => setFailure(kycErasureFailure(error)),
  });

  async function submit() {
    const parsed = kycEraseInputSchema.safeParse({ password });
    if (!parsed.success) return setFailure({ field: 'password', message: parsed.error.issues[0]?.message ?? 'Escribe tu contraseña.' });
    setFailure(null);
    const answer = await confirm({
      title: kycErasureCopy.confirmTitle,
      message: kycErasureCopy.confirmMessage,
      confirmLabel: kycErasureCopy.confirmLabel,
      cancelLabel: 'Volver',
      severity: 'danger',
    });
    if (answer.confirmed) erase.mutate(parsed.data.password);
  }

  const danger = tones.dark.danger;
  return (
    <ScrollScreen>
      <BackLink fallbackHref="/(business)/cuenta" />
      <ScreenHeader detail subtitle={kycErasureCopy.description} title={kycErasureCopy.title} />
      {erase.isSuccess ? (
        <Card>
          <Text accessibilityLiveRegion="polite" strong variant="body">{kycErasureCopy.done}</Text>
        </Card>
      ) : (
        <>
          <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, backgroundColor: danger.bg }}>
            <Ionicons color={danger.text} name="warning-outline" size={iconSizes.md} />
            <Text strong style={{ flex: 1, color: danger.text }} variant="subhead">{kycErasureCopy.consequence}</Text>
          </View>
          <Text tone="secondary" variant="footnote">{kycErasureCopy.kept}</Text>
          <Card>
            <Input
              autoComplete="current-password"
              error={failure?.field === 'password' ? failure.message : undefined}
              icon="lock-closed-outline"
              label={kycErasureCopy.passwordLabel}
              onChangeText={(text) => {
                setPassword(text);
                if (failure?.field) setFailure(null);
              }}
              onSubmitEditing={() => void submit()}
              revealable
              textContentType="password"
              value={password}
            />
          </Card>
          {failure && failure.field === null ? <AuthAlert message={failure.message} /> : null}
          <Button icon="trash-outline" label={kycErasureCopy.submit} loading={erase.isPending} onPress={() => void submit()} variant="destructive" />
          <Text tone="muted" variant="footnote">Es definitivo: no se puede deshacer.</Text>
        </>
      )}
    </ScrollScreen>
  );
}
