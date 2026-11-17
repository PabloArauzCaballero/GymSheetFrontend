import * as Haptics from 'expo-haptics';
import { View } from 'react-native';
import { SOCIAL_INTERESTS_MAX } from '@gymsheet/schemas';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { FilterChip } from '@/components/filter-chip';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { spacing } from '@/theme';
import { toggleInterest } from './selection';
import { useInterestCatalog } from './use-interest-catalog';

/** Interest chips from the catalog, capped at {@link SOCIAL_INTERESTS_MAX} with a visible counter. */
export function InterestsStep({ selected, onChange }: { selected: string[]; onChange: (next: string[]) => void }) {
  const catalog = useInterestCatalog();
  const reduceMotion = useReduceMotion();
  const full = selected.length >= SOCIAL_INTERESTS_MAX;

  if (catalog.isPending) return <Skeleton height={160} />;
  if (catalog.isError) return <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />;
  if (catalog.data.length === 0) {
    return <EmptyState compact icon="sparkles-outline" message="Sigue con el siguiente paso." title="Aún no hay intereses para elegir" />;
  }

  const toggle = (code: string) => {
    const result = toggleInterest(selected, code, SOCIAL_INTERESTS_MAX);
    if (result.limited) {
      // Refused tap: the counter below says why, the hand feels it.
      if (!reduceMotion) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    onChange(result.next);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        accessibilityLiveRegion="polite"
        tabular
        tone={full ? 'warning' : 'muted'}
        variant="footnote"
      >
        {full
          ? `${selected.length} de ${SOCIAL_INTERESTS_MAX} · Quita uno para elegir otro`
          : `${selected.length} de ${SOCIAL_INTERESTS_MAX}`}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {catalog.data.map((entry) => (
          <FilterChip
            key={entry.code}
            label={entry.label}
            onPress={() => toggle(entry.code)}
            selected={selected.includes(entry.code)}
          />
        ))}
      </View>
    </View>
  );
}
