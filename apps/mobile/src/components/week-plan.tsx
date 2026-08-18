import { Text, View } from 'react-native';
import type { RoutineAssignment } from '@gymsheet/types';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, radii, spacing } from '@/theme';

/**
 * Weekday initials, indexed the way `Date.getDay()` indexes them — 0 is Sunday.
 * The backend stores `dias_semana` as plain integers, so this mapping is the
 * contract between the two; getting it wrong shifts every routine by a day,
 * which is why it is written once here instead of inline at each use.
 */
const DAY_INITIAL = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const;
const DAY_NAME = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

/**
 * The training week at a glance.
 *
 * A list of assigned routines answers "what did my coach give me"; it does not
 * answer "what am I doing today", which is the question someone actually opens
 * the app with on the way to the gym. Laying the same data across seven columns
 * turns a catalogue into a plan: the split becomes visible as a shape — push on
 * Monday, pull on Wednesday — and rest days become visible as gaps, which are
 * just as much a part of a programme as the sessions.
 */
export function WeekPlan({
  assignments,
  onPickRoutine,
}: {
  assignments: readonly RoutineAssignment[];
  onPickRoutine: (routineId: string) => void;
}) {
  const today = new Date().getDay();

  const todayPlans = assignments.filter(
    (item) => item.estado === 'ACTIVE' && item.diasSemana.includes(today),
  );

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {DAY_INITIAL.map((initial, day) => {
        const forDay = assignments.filter(
          (item) => item.estado === 'ACTIVE' && item.diasSemana.includes(day),
        );
        const isToday = day === today;
        const first = forDay[0];

        return (
          <PressableScale
            accessibilityLabel={
              forDay.length
                ? `${DAY_NAME[day]}: ${forDay.map((item) => item.rutina?.nombre ?? 'rutina').join(', ')}`
                : `${DAY_NAME[day]}: descanso`
            }
            disabled={!first?.rutina}
            key={day}
            onPress={() => {
              if (first?.rutina) onPickRoutine(first.rutina.id);
            }}
            style={{
              flex: 1,
              gap: spacing.xs,
              alignItems: 'center',
              paddingVertical: spacing.sm,
              paddingHorizontal: 2,
              borderRadius: radii.md,
              borderWidth: 1,
              // Today is marked by its border, not by a fill: a filled column
              // would outrank the routines themselves, which are the content.
              borderColor: isToday ? colors.volt : colors.borderSubtle,
              backgroundColor: forDay.length ? colors.surface : colors.surfaceLowest,
            }}
          >
            <Text
              style={{
                color: isToday ? colors.volt : colors.textMuted,
                fontSize: fontSizes.xs,
                fontWeight: '800',
              }}
            >
              {initial}
            </Text>

            {forDay.length ? (
              <>
                {/* The dot column reads as intensity: three dots is a heavy day
                    even before you read a single routine name. */}
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {forDay.slice(0, 3).map((item) => (
                    <View
                      key={item.id}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: radii.full,
                        backgroundColor: colors.volt,
                      }}
                    />
                  ))}
                </View>

              </>
            ) : (
              <Text style={{ color: colors.textDisabled, fontSize: 9 }}>descanso</Text>
            )}
          </PressableScale>
        );
      })}
      </View>

      {/* The strip answers "what does my week look like"; this line answers
          "what do I do now". Cramming the routine name into a 50px column
          shredded it into unreadable fragments — the name belongs where there
          is room for it, and the columns keep only the shape of the week. */}
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
        {todayPlans.length ? (
          <>
            {'Hoy · '}
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {todayPlans.map((item) => shortRoutineName(item.rutina?.nombre ?? '')).join(' + ')}
            </Text>
          </>
        ) : (
          'Hoy toca descanso.'
        )}
      </Text>
    </View>
  );
}

/**
 * Coach plans all share the prefix "Plan del coach — ", so the part after it is
 * the only bit that distinguishes one day from another.
 */
function shortRoutineName(name: string): string {
  return name.split('—').pop()?.trim() ?? name;
}
