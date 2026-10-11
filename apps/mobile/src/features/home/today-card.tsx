import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { WEEKDAY_NAMES, nextSession, weekLabel, type Weekday } from '@gymsheet/hooks';
import type { Program, Routine, RoutineAssignment, RoutineDay, Workout } from '@gymsheet/types';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ExerciseImage } from '@/components/media';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { dayTitle } from '@/features/routine-detail/day-cards';
import { dayMinutes } from '@/features/routine-detail/routine-plan';
import { useStartRoutine } from '@/features/routine-detail/use-start-routine';
import { cardGap, colors, radii, shadows, spacing, thumbSizes } from '@/theme';

/** La superficie de «Hoy»: la única tarjeta elevada (e2) de Inicio. */
function TodaySurface({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View
      style={{
        gap: cardGap,
        padding: spacing.mdl,
        borderRadius: radii.xxl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceRaised,
        boxShadow: shadows.e2,
      }}
      testID={testID}
    >
      {children}
    </View>
  );
}

function Kicker({ children }: { children: string }) {
  return (
    <Text tabular tone="secondary" variant="footnote">
      {children}
    </Text>
  );
}

/** Tres miniaturas en fila: lo que se va a hacer hoy, antes de leerlo. */
function DayThumbs({ day }: { day: RoutineDay }) {
  const thumbs = day.ejercicios.filter((item) => item.ejercicio).slice(0, 3);
  if (thumbs.length === 0) return null;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', gap: spacing.sm }}>
      {thumbs.map((item) =>
        item.ejercicio ? (
          <ExerciseImage exercise={item.ejercicio} key={item.id} rounded={radii.md} size={thumbSizes.row} />
        ) : null,
      )}
    </View>
  );
}

function dayMeta(day: RoutineDay): string {
  const count = day.ejercicios.length;
  const minutes = dayMinutes(day);
  return [`${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`, minutes ? `≈${minutes} min` : null]
    .filter(Boolean)
    .join(' · ');
}

/** Día del programa: hoy toca (CTA «Entrenar hoy») o hoy se descansa (próximo). */
function ProgramToday({ program, routine }: { program: Program; routine: Routine }) {
  const router = useRouter();
  const start = useStartRoutine(routine.id);
  const now = new Date();
  const today = (((now.getDay() + 6) % 7) + 1) as Weekday;
  const next = nextSession(routine, today);
  const day = next ? routine.dias.find((item) => item.id === next.routineDayId) : undefined;
  const week = weekLabel(program);

  if (!next || !day) {
    return (
      <TodaySurface testID="today-card">
        <Kicker>{week}</Kicker>
        <Text variant="title">{routine.nombre}</Text>
        <Text tone="muted" variant="subhead">
          Tu rutina no tiene días con ejercicios todavía.
        </Text>
        <Button label="Abrir la rutina" onPress={() => router.push({ pathname: '/routines/[id]', params: { id: routine.id } })} variant="secondary" />
      </TodaySurface>
    );
  }

  const openDay = () =>
    router.push({ pathname: '/routines/[id]/dia/[diaId]', params: { id: routine.id, diaId: day.id } });

  if (next.esHoy) {
    return (
      <TodaySurface testID="today-card">
        <Kicker>{`Hoy · ${week}${program.esDescarga ? ' · Descarga' : ''}`}</Kicker>
        <Text numberOfLines={2} variant="display">
          {dayTitle(day)}
        </Text>
        <Text tabular tone="secondary" variant="subhead">
          {`${routine.nombre} · ${dayMeta(day)}`}
        </Text>
        <DayThumbs day={day} />
        <View style={{ gap: spacing.sm }}>
          <Button
            haptic="light"
            label="Entrenar hoy"
            loading={start.isPending}
            onPress={() => start.mutate(day.id)}
            size="lg"
            testID="today-start"
          />
          <Button label="Ver el día" onPress={openDay} size="sm" variant="ghost" />
        </View>
      </TodaySurface>
    );
  }

  return (
    <TodaySurface testID="today-card">
      <Kicker>{`Hoy descansas · ${week}`}</Kicker>
      <Text numberOfLines={2} variant="title">
        {`${WEEKDAY_NAMES[next.dia as Weekday]}: ${dayTitle(day)}`}
      </Text>
      <Text tabular tone="secondary" variant="subhead">
        {dayMeta(day)}
      </Text>
      <DayThumbs day={day} />
      <Button label="Ver el próximo día" onPress={openDay} variant="secondary" />
    </TodaySurface>
  );
}

/**
 * «Hoy» (C8.3.5): lo primero de Inicio y su única acción en acento. Por orden:
 * sesión abierta → día del programa → rutina asignada por el entrenador →
 * elegir una rutina.
 */
export function TodayCard({
  openSession,
  program,
  routine,
  assignment,
  loading,
  error,
  onRetry,
}: {
  openSession: Workout | undefined;
  program: Program | null | undefined;
  routine: Routine | undefined;
  assignment: RoutineAssignment | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const router = useRouter();

  if (openSession) {
    return (
      <TodaySurface testID="today-card">
        <Kicker>En curso</Kicker>
        <Text variant="title">Tienes una sesión abierta</Text>
        <Text tone="muted" variant="subhead">
          {`${openSession.ejercicios.length} ${openSession.ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'} · sigue donde lo dejaste.`}
        </Text>
        <Button
          label="Continuar entrenamiento"
          onPress={() => router.push({ pathname: '/workouts/[id]', params: { id: openSession.id } })}
          size="lg"
        />
      </TodaySurface>
    );
  }

  if (loading) return <Skeleton height={248} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  if (program && routine) return <ProgramToday program={program} routine={routine} />;

  if (assignment?.rutina) {
    const rutina = assignment.rutina;
    return (
      <TodaySurface testID="today-card">
        <Kicker>De tu entrenador</Kicker>
        <Text numberOfLines={2} variant="title">
          {rutina.nombre}
        </Text>
        {assignment.nota ? (
          <Text tone="secondary" variant="subhead">
            {assignment.nota}
          </Text>
        ) : null}
        <Button
          label="Ver la rutina"
          onPress={() => router.push({ pathname: '/routines/[id]', params: { id: rutina.id } })}
          size="lg"
        />
      </TodaySurface>
    );
  }

  return (
    <TodaySurface testID="today-card">
      <Kicker>Hoy</Kicker>
      <Text variant="title">Elige la rutina que vas a seguir</Text>
      <Text tone="muted" variant="subhead">
        Te recomendamos una según tu objetivo y tus días. Al activarla, aquí verás qué toca cada día.
      </Text>
      <Button label="Ver rutinas para ti" onPress={() => router.push('/routines')} size="lg" />
    </TodaySurface>
  );
}
