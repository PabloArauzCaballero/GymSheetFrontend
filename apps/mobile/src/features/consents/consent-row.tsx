import { ActivityIndicator, Switch, View } from 'react-native';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, comfortableTouchTarget, spacing } from '@/theme';
import type { Consent } from '@gymsheet/schemas';
import { consentCopy, consentStatusLabel, consentsSectionCopy, needsRenewal } from './consent-logic';

/**
 * One consent: what it covers, its state in words and a switch. Turning it
 * off asks first and says what gets erased; a grant to an old text offers
 * «Aceptar de nuevo» instead of looking fine.
 */
export function ConsentRow({
  consent,
  pending,
  disabled,
  onToggle,
}: {
  consent: Consent;
  pending: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  const copy = consentCopy[consent.kind];
  const renewal = needsRenewal(consent);
  return (
    <View style={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: comfortableTouchTarget }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="headline">{copy.title}</Text>
          <Text tone="secondary" variant="footnote">{copy.purpose}</Text>
          <Text tone={renewal ? 'warning' : 'muted'} variant="footnote">{consentStatusLabel(consent)}</Text>
        </View>
        {pending ? (
          <ActivityIndicator accessibilityLabel="Guardando" color={colors.textSecondary} />
        ) : (
          <Switch
            accessibilityHint={consent.granted ? copy.revokeEffect : undefined}
            accessibilityLabel={copy.title}
            disabled={disabled}
            ios_backgroundColor={colors.surfaceHigh}
            onValueChange={onToggle}
            thumbColor={colors.text}
            trackColor={{ false: colors.surfaceHigh, true: colors.volt }}
            value={consent.granted}
          />
        )}
      </View>
      {renewal && !pending ? (
        <Button disabled={disabled} label={consentsSectionCopy.renew} onPress={() => onToggle(true)} size="sm" variant="secondary" />
      ) : null}
    </View>
  );
}
