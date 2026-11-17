import { View } from 'react-native';
import { kycCopy } from '@gymsheet/domain';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { spacing } from '@/theme';

/** «Seguir» (the one primary action) and «Atrás». A disabled «Seguir» says why, right above it. */
export function StepNav({
  onNext,
  onBack,
  nextLabel = kycCopy.continue,
  loading = false,
  blocked,
}: {
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  loading?: boolean;
  blocked?: string | null;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      {blocked ? <Text style={{ textAlign: 'center' }} tone="secondary" variant="footnote">{blocked}</Text> : null}
      <Button
        accessibilityHint={blocked ?? undefined}
        disabled={Boolean(blocked)}
        icon="arrow-forward"
        iconPosition="end"
        label={nextLabel}
        loading={loading}
        onPress={onNext}
      />
      {onBack ? <Button disabled={loading} label={kycCopy.back} onPress={onBack} variant="ghost" /> : null}
    </View>
  );
}
