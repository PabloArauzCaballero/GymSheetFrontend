import { ActivityIndicator, View } from 'react-native';
import { handleCopy, type HandleCheck } from '@gymsheet/domain';
import { Text } from '@/components/text';
import { Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { colors, spacing } from '@/theme';

function statusOf(check: HandleCheck): { text: string; tone: 'secondary' | 'default' | 'danger' } {
  switch (check.state) {
    case 'checking':
      return { text: handleCopy.checking, tone: 'secondary' };
    case 'available':
      return { text: handleCopy.available(check.handle), tone: 'default' };
    case 'invalid':
    case 'unavailable':
      return { text: check.message, tone: 'danger' };
    case 'error':
      return { text: check.message, tone: 'secondary' };
    default:
      return { text: handleCopy.hint, tone: 'secondary' };
  }
}

/** The `@handle` with its live verdict and, when the typed one is not free, suggestions from the name. */
export function HandleField({
  value,
  onChange,
  check,
  suggestions,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  check: HandleCheck;
  suggestions: readonly string[];
  error?: string;
}) {
  const status = statusOf(check);
  const offer = check.state === 'unavailable' || check.state === 'idle' ? suggestions.filter((handle) => handle !== value) : [];
  return (
    <View style={{ gap: spacing.sm }}>
      <Input
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        error={error}
        icon="at-outline"
        label={handleCopy.label}
        onChangeText={onChange}
        spellCheck={false}
        value={value}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {check.state === 'checking' ? <ActivityIndicator color={colors.textMuted} size="small" /> : null}
        <Text accessibilityLiveRegion="polite" style={{ flex: 1 }} tone={status.tone} variant="footnote">
          {status.text}
        </Text>
      </View>
      {offer.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
          <Text tone="secondary" variant="footnote">{handleCopy.suggestionsLabel}</Text>
          {offer.map((handle) => (
            <ChoiceChip key={handle} label={`@${handle}`} onSelect={() => onChange(handle)} selected={false} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
