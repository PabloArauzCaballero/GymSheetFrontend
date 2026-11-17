import { View } from 'react-native';
import { consentCopy } from '@gymsheet/domain';
import { Checkbox } from '@/components/checkbox';
import { Text } from '@/components/text';
import { spacing } from '@/theme';
import { healthConsentMissing } from './onboarding-consent-logic';

export { preferencesConsentsReady } from './onboarding-consent-logic';

/**
 * The two checkboxes of the onboarding preferences step. The health consent is
 * separate and optional (ADR-0014): it is only needed to keep the physical
 * considerations, and the line under it says so when they are typed without it.
 */
export function OnboardingConsents({
  considerations,
  consentHealth,
  onConsentHealth,
  consentData,
  onConsentData,
}: {
  considerations: string;
  consentHealth: boolean;
  onConsentHealth: (next: boolean) => void;
  consentData: boolean;
  onConsentData: (next: boolean) => void;
}) {
  const missing = healthConsentMissing(considerations, consentHealth);
  return (
    <>
      <View style={{ gap: spacing.xs }}>
        <Checkbox checked={consentHealth} label={consentCopy.HEALTH.grantLabel} onChange={onConsentHealth} />
        {missing ? (
          <Text accessibilityLiveRegion="polite" tone="warning" variant="footnote">
            Marca esta casilla para guardar tus consideraciones físicas, o déjalas en blanco.
          </Text>
        ) : null}
      </View>
      <Checkbox
        checked={consentData}
        label="Acepto el uso de estos datos para personalizar mi entrenamiento."
        onChange={onConsentData}
      />
    </>
  );
}
