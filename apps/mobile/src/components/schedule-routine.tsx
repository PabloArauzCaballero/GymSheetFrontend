import { useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { routineService } from '@/api/services';
import { Card, Row } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { colors, fontSizes, iconSizes, radii, spacing } from '@/theme';

/** Display order starts on Monday; the stored value is `Date.getDay()`. */
const DAYS = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 0, label: 'D' },
] as const;

/**
 * How long someone commits to a plan, in the words they actually use.
 *
 * Nobody thinks "hasta el 18 de septiembre"; they think "lo pruebo un mes".
 * Offering durations instead of a date picker removes a calendar from the flow
 * and still writes a real end date, which is what the backend stores.
 */
const DURATIONS = [
  { label: '1 mes', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: 'Sin límite', days: null },
] as const;

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function Chip({
  active,
  label,
  onPress,
  round = false,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  round?: boolean;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minWidth: round ? 40 : undefined,
        minHeight: 40,
        paddingHorizontal: round ? 0 : spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: round ? radii.full : radii.md,
        borderWidth: 1,
        borderColor: active ? colors.volt : colors.border,
        backgroundColor: active ? colors.volt : colors.surface,
      }}
    >
      <Text
        style={{
          color: active ? colors.background : colors.text,
          fontSize: fontSizes.sm,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Puts a routine in the user's own week.
 *
 * The two questions a mesocycle actually has — which days, and for how long —
 * asked with taps rather than pickers, because this is decided once and should
 * not cost a calendar.
 */
export function ScheduleRoutine({
  routineId,
  initialWeekdays,
}: {
  routineId: string;
  initialWeekdays?: readonly number[];
}) {
  const queryClient = useQueryClient();
  const [weekdays, setWeekdays] = useState<number[]>([...(initialWeekdays ?? [])]);
  const [durationDays, setDurationDays] = useState<number | null>(30);

  const schedule = useMutation({
    mutationFn: () =>
      routineService.schedule(routineId, {
        diasSemana: [...weekdays].sort((a, b) => a - b),
        repiteDesde: new Date().toISOString().slice(0, 10),
        repiteHasta: durationDays === null ? null : addDays(durationDays),
      }),
    onSuccess: async () => {
      // The week strip and the assignment list both read this.
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      notify.success('Rutina programada en tu semana.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const toggle = (day: number) =>
    setWeekdays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );

  const endsOn = durationDays === null ? null : addDays(durationDays);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons color={colors.volt} name="calendar-outline" size={iconSizes.lg} />
        <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '700', flex: 1 }}>
          Programar en mi semana
        </Text>
      </View>

      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>¿Qué días?</Text>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {DAYS.map((day) => (
          <Chip
            active={weekdays.includes(day.value)}
            key={day.value}
            label={day.label}
            onPress={() => toggle(day.value)}
            round
          />
        ))}
      </View>

      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>¿Durante cuánto?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {DURATIONS.map((duration) => (
          <Chip
            active={durationDays === duration.days}
            key={duration.label}
            label={duration.label}
            onPress={() => setDurationDays(duration.days)}
          />
        ))}
      </View>

      {/* The end date is shown, not just implied: "3 meses" is the choice, but
          the date is what the user will look for when they wonder if it expired. */}
      <Row
        label="Termina"
        value={
          endsOn
            ? new Date(endsOn).toLocaleDateString('es-BO', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })
            : 'Sin fecha de fin'
        }
      />

      <Button
        disabled={weekdays.length === 0}
        label={weekdays.length === 0 ? 'Elige al menos un día' : 'Guardar en mi semana'}
        loading={schedule.isPending}
        onPress={() => schedule.mutate()}
      />
    </Card>
  );
}
