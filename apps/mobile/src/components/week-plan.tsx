import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import type { RoutineAssignment } from '@gymsheet/types';
import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/motion';
import { Text as AppText } from '@/components/text';
import {
  colors,
  comfortableTouchTarget,
  fontSizes,
  iconSizes,
  metricColors,
  radii,
  semibold,
  spacing,
} from '@/theme';

/**
 * Weekday initials, indexed the way `Date.getDay()` indexes them — 0 is Sunday.
 * The backend stores `dias_semana` as plain integers, so this mapping is the
 * contract between the two; getting it wrong shifts every routine by a day,
 * which is why it is written once here instead of inline at each use.
 */
const DAY_INITIAL = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const;

/**
 * Orden de presentacion: la semana empieza en lunes.
 *
 * Los numeros guardados siguen la convencion de `Date.getDay()` (0 = domingo)
 * porque es con la que se comparan en codigo y evita conversiones en cada uso.
 * Lo que cambia es como se pintan: en Espana y Latinoamerica la semana empieza
 * el lunes, y una tira que arranca en domingo se lee mal aunque los datos sean
 * correctos. Separar almacenamiento de presentacion es lo que permite tener
 * ambas cosas bien.
 */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_NAME = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

export type WeekSessionKind = 'strength' | 'cardio' | 'assigned';

/**
 * Una sesión de la semana: el día de una rutina de pesas, el cardio de ese día
 * o una rutina asignada. `day` va como `Date.getDay()` (0 = domingo).
 */
export type WeekSession = {
  key: string;
  day: number;
  kind: WeekSessionKind;
  title: string;
  /** «Día A», «Carrera»: lo que distingue la sesión dentro de su rutina. */
  detail?: string | null;
};

/**
 * Un color por tipo para que, con pesas y cardio el mismo día, los dos puntos
 * se distingan sin leer nada. Nunca volt: el acento es la acción principal.
 */
const KIND_STYLE: Record<WeekSessionKind, { ink: string; tint: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  strength: { ink: metricColors.weight.ink, tint: metricColors.weight.tint, icon: 'barbell-outline', label: 'Pesas' },
  cardio: { ink: metricColors.volume.ink, tint: metricColors.volume.tint, icon: 'pulse-outline', label: 'Cardio' },
  assigned: { ink: metricColors.reps.ink, tint: metricColors.reps.tint, icon: 'person-outline', label: 'Asignada' },
};

/** Las rutinas asignadas como sesiones de la semana. */
export function assignmentSessions(assignments: readonly RoutineAssignment[]): WeekSession[] {
  return assignments
    .filter((item) => item.estado === 'ACTIVE' && item.rutina)
    .flatMap((item) =>
      item.diasSemana.map((day) => ({
        key: `assigned-${item.id}-${day}`,
        day,
        kind: 'assigned' as const,
        title: shortRoutineName(item.rutina?.nombre ?? 'Rutina'),
      })),
    );
}

/**
 * The training week at a glance.
 *
 * A list of assigned routines answers "what did my coach give me"; it does not
 * answer "what am I doing today", which is the question someone actually opens
 * the app with on the way to the gym. Laying the same data across seven columns
 * turns a catalogue into a plan: the split becomes visible as a shape — push on
 * Monday, pull on Wednesday — and rest days become visible as gaps, which are
 * just as much a part of a programme as the sessions.
 *
 * Un punto por sesión (pesas, cardio, asignada): con fuerza y cardio el mismo
 * día salen dos. Tocar un día con sesiones llama a `onPickDay`; quien pinta la
 * tira decide si abre la rutina directa o deja elegir entre varias.
 */
export function WeekPlan({
  sessions,
  onPickDay,
}: {
  sessions: readonly WeekSession[];
  onPickDay: (day: number) => void;
}) {
  const today = new Date().getDay();
  const todaySessions = sessions.filter((session) => session.day === today);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {DISPLAY_ORDER.map((day) => {
        const initial = DAY_INITIAL[day];
        const forDay = sessions.filter((session) => session.day === day);
        const isToday = day === today;

        return (
          <PressableScale
            accessibilityHint={forDay.length ? 'Elige qué rutina abrir' : undefined}
            accessibilityLabel={
              forDay.length
                ? `${DAY_NAME[day]}: ${forDay.map((session) => session.title).join(', ')}`
                : `${DAY_NAME[day]}: descanso`
            }
            disabled={forDay.length === 0}
            haptic="selection"
            key={day}
            onPress={() => onPickDay(day)}
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
            testID={`week-day-${day}`}
          >
            <Text
              style={{
                color: isToday ? colors.volt : colors.textMuted,
                fontSize: fontSizes.xs,
                fontWeight: semibold,
              }}
            >
              {initial}
            </Text>

            {forDay.length ? (
              // The dot row reads as intensity: three dots is a heavy day even
              // before you read a single routine name.
              <View style={{ flexDirection: 'row', gap: 3, height: iconSizes.sm, alignItems: 'center' }}>
                {forDay.slice(0, 3).map((session) => (
                  <View
                    key={session.key}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: radii.full,
                      backgroundColor: KIND_STYLE[session.kind].ink,
                    }}
                  />
                ))}
              </View>
            ) : (
              // Una luna en vez de la palabra: «descanso» a 9 pt no cabía en
              // una columna de un séptimo de pantalla y se partía en «descans /
              // o». El nombre sigue llegando a VoiceOver.
              <Ionicons
                accessibilityLabel="Descanso"
                color={colors.textDisabled}
                name="moon-outline"
                size={iconSizes.sm}
              />
            )}
          </PressableScale>
        );
      })}
      </View>

      {/* The strip answers "what does my week look like"; this line answers
          "what do I do now". Cramming the routine name into a 50px column
          shredded it into unreadable fragments — the name belongs where there
          is room for it, and the columns keep only the shape of the week. */}
      <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
        {todaySessions.length ? (
          <>
            {'Hoy · '}
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {todaySessions.map(sessionLabel).join(' + ')}
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
 * «Elige qué rutina»: las sesiones de un día. Con pesas y cardio el mismo día
 * no hay una sola rutina que abrir, así que se pregunta en vez de adivinar.
 */
export function WeekDaySheet<S extends WeekSession>({
  day,
  sessions,
  onClose,
  onPick,
}: {
  /** `null` = cerrada. */
  day: number | null;
  sessions: readonly S[];
  onClose: () => void;
  onPick: (session: S) => void;
}) {
  const forDay = day === null ? [] : sessions.filter((session) => session.day === day);
  const name = day === null ? '' : DAY_NAME[day];
  return (
    <BottomSheet
      onClose={onClose}
      subtitle="Elige qué rutina abrir."
      testID="week-day-sheet"
      title={name ? name[0]?.toUpperCase() + name.slice(1) : ''}
      visible={day !== null}
    >
      <View style={{ gap: spacing.xs }}>
        {forDay.map((session) => {
          const kind = KIND_STYLE[session.kind];
          return (
            <PressableScale
              accessibilityLabel={`${kind.label}: ${sessionLabel(session)}`}
              haptic="selection"
              key={session.key}
              onPress={() => {
                onClose();
                onPick(session);
              }}
              scaleTo={0.98}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.smd,
                minHeight: comfortableTouchTarget + spacing.sm,
              }}
              testID={`week-session-${session.key}`}
            >
              <View
                style={{
                  width: comfortableTouchTarget - spacing.xs,
                  height: comfortableTouchTarget - spacing.xs,
                  borderRadius: radii.md,
                  borderCurve: 'continuous',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: kind.tint,
                }}
              >
                <Ionicons color={kind.ink} name={kind.icon} size={iconSizes.md} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText numberOfLines={1} strong variant="body">
                  {session.title}
                </AppText>
                <AppText numberOfLines={1} tone="muted" variant="caption">
                  {session.detail ? `${kind.label} · ${session.detail}` : kind.label}
                </AppText>
              </View>
              <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} />
            </PressableScale>
          );
        })}
      </View>
    </BottomSheet>
  );
}

function sessionLabel(session: WeekSession): string {
  return session.detail ? `${session.title} · ${session.detail}` : session.title;
}

/**
 * Coach plans all share the prefix "Plan del coach — ", so the part after it is
 * the only bit that distinguishes one day from another.
 */
function shortRoutineName(name: string): string {
  return name.split('—').pop()?.trim() ?? name;
}
