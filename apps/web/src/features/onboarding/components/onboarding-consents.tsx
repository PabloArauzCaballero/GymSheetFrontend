import { consentCopy, onboardingHealthConsentHint } from '@gymsheet/domain';
import { Checkbox } from '@/shared/components/ui/checkbox';

/**
 * The two consents of the training step. The health one is a separate,
 * revocable consent (ADR-0014): optional, and only needed when physical
 * considerations are written, because only then is a health datum stored.
 */
export function OnboardingConsents({
  healthNeeded,
  consentHealth,
  consentData,
  onHealthChange,
  onDataChange,
}: Readonly<{
  healthNeeded: boolean;
  consentHealth: boolean;
  consentData: boolean;
  onHealthChange: (checked: boolean) => void;
  onDataChange: (checked: boolean) => void;
}>) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <Checkbox
          aria-describedby="onboarding-health-purpose"
          checked={consentHealth}
          label={consentCopy.HEALTH.grantLabel}
          onChange={(event) => onHealthChange(event.target.checked)}
        />
        <p className="pl-[30px] text-xs leading-5 text-[var(--text-muted)]" id="onboarding-health-purpose">
          {healthNeeded ? onboardingHealthConsentHint.needed : onboardingHealthConsentHint.optional}
        </p>
      </div>
      <Checkbox
        checked={consentData}
        label="Acepto el uso de estos datos para personalizar mi entrenamiento."
        onChange={(event) => onDataChange(event.target.checked)}
      />
    </div>
  );
}
