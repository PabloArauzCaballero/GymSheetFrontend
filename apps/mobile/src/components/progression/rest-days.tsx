import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { progressionService } from '@/api/services';
import { Section } from '@/components/layout';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

const WEEKDAY_LABELS: ReadonlyArray<{ value: number; short: string }> = [
  { value: 1, short: 'L' },
  { value: 2, short: 'M' },
  { value: 3, short: 'X' },
  { value: 4, short: 'J' },
  { value: 5, short: 'V' },
  { value: 6, short: 'S' },
  { value: 7, short: 'D' },
];

/** Días de descanso: la excepción a la racha, justo debajo de ella. */
export function RestDaysSection() {
  const queryClient = useQueryClient();
  const restDays = useQuery({
    queryKey: ['progression', 'rest-days'],
    queryFn: () => progressionService.getRestDays(),
  });
  const setRestDays = useMutation({
    mutationFn: (weekdays: number[]) => progressionService.setRestDays(weekdays),
    onSuccess: (result) => {
      queryClient.setQueryData(['progression', 'rest-days'], result);
    },
  });
  const restDayCount = restDays.data?.weekdays.length ?? 0;
  return (
    <Section icon="bed-outline" title="Días de descanso">
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
        {restDayCount >= 6
          ? 'Los días marcados no rompen tu racha. Ya tienes seis. El séptimo no se puede marcar: sin ningún día de entreno, la racha dejaría de significar algo.'
          : 'Los días marcados no rompen tu racha.'}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        {WEEKDAY_LABELS.map((day) => {
          const active = (restDays.data?.weekdays ?? []).includes(day.value);
          return (
            <Pressable
              accessibilityLabel={`${day.short}: ${active ? 'día de descanso' : 'día de entreno'}`}
              accessibilityRole="button"
              disabled={setRestDays.isPending}
              // 36 de dibujo + 4 por lado = 44 de área táctil.
              hitSlop={4}
              key={day.value}
              onPress={() => {
                const current = restDays.data?.weekdays ?? [];
                // Los siete días dejarían la racha imposible de romper; el
                // backend lo rechaza, esto solo evita mostrar ese error.
                if (!active && current.length >= 6) return;
                const next = active
                  ? current.filter((value) => value !== day.value)
                  : [...current, day.value];
                setRestDays.mutate(next);
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: active ? colors.volt : colors.border,
                backgroundColor: active ? colors.volt : 'transparent',
              }}
            >
              <Text
                style={{
                  color: active ? colors.background : colors.textMuted,
                  fontSize: fontSizes.sm,
                  fontWeight: semibold,
                }}
              >
                {day.short}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Section>
  );
}
