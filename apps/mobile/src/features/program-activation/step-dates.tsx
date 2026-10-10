import { Text, View } from 'react-native';
import { WEEKDAYS, WEEKDAY_INITIALS, WEEKDAY_NAMES } from '@gymsheet/hooks';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import type { Activation } from '@/features/program-activation/use-activation';
import { colors, fontSizes, semibold, spacing } from '@/theme';

const DURATIONS = [4, 8, 12, 16];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: semibold }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>
    </View>
  );
}

/** A2 · Fechas: inicio (hoy o el próximo lunes), duración (editable) y días (editables). */
export function DatesStep({ state }: { state: Activation }) {
  const durations = DURATIONS.includes(state.weeks) ? DURATIONS : [state.weeks, ...DURATIONS].sort((a, b) => a - b);
  return (
    <View style={{ gap: spacing.lg }}>
      <Group title="Inicio">
        <ChoiceChip label="Hoy" onSelect={() => state.setStart('today')} selected={state.start === 'today'} testID="start-today" />
        <ChoiceChip label="El próximo lunes" onSelect={() => state.setStart('monday')} selected={state.start === 'monday'} testID="start-monday" />
      </Group>
      <Group title="Duración">
        {durations.map((weeks) => (
          <ChoiceChip
            accessibilityLabel={`${weeks} semanas`}
            key={weeks}
            label={`${weeks} sem`}
            onSelect={() => state.setWeeks(weeks)}
            selected={state.weeks === weeks}
            testID={`weeks-${weeks}`}
          />
        ))}
      </Group>
      <Group title="Días de entrenamiento">
        {WEEKDAYS.map((day) => (
          <ChoiceChip
            accessibilityLabel={WEEKDAY_NAMES[day]}
            key={day}
            label={WEEKDAY_INITIALS[day]}
            onSelect={() => state.toggleDay(day)}
            selected={state.days.includes(day)}
            testID={`day-${day}`}
          />
        ))}
      </Group>
      {state.days.length === 0 ? (
        <Text style={{ color: colors.warning, fontSize: fontSizes.sm }}>Elige al menos un día.</Text>
      ) : null}
    </View>
  );
}
