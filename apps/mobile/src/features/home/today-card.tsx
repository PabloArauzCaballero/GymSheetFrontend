import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { WEEKDAY_NAMES, nextSession, weekLabel, type Weekday } from '@gymsheet/hooks';
import type { Program, Routine, RoutineAssignment, RoutineDay, Workout } from '@gymsheet/types';
import { Ionicons } from '@expo/vector-icons';
import { ErrorState, Skeleton } from '@/components/feedback';
import { HeroSurface } from '@/components/hero-surface';
import { ExerciseImage } from '@/components/media';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { dayTitle } from '@/features/routine-detail/day-cards';
import { dayMinutes } from '@/features/routine-detail/routine-plan';
import { useStartRoutine } from '@/features/routine-detail/use-start-routine';
import { accentPolicy, iconSizes, radii, spacing, thumbSizes } from '@/theme';

/**
 * La superficie de «Hoy»: el protagonista de Inicio y su única `HeroSurface`
 * (degradado estático del acento + isotipo de agua). Solo se pinta un estado a
 * la vez, así que nunca hay dos en la pantalla.
 */
function TodaySurface({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <HeroSurface testID={testID} watermark>
      {children}
    </HeroSurface>
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
        <Button icon="arrow-forward" iconPosition="end" label="Abrir la rutina" onPress={() => router.push({ pathname: '/routines/[id]', params: { id: routine.id } })} variant="secondary" />
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
            icon="play"
            label="Entrenar hoy"
            loading={start.isPending}
            onPress={() => start.mutate(day.id)}
            size="lg"
            testID="today-start"
          />
          <Button icon="arrow-forward" iconPosition="end" label="Ver el día" onPress={openDay} size="sm" variant="ghost" />
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
      <Button icon="arrow-forward" iconPosition="end" label="Ver el próximo día" onPress={openDay} variant="secondary" />
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
          icon="play"
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
          icon="arrow-forward"
          iconPosition="end"
          label="Ver la rutina"
          onPress={() => router.push({ pathname: '/routines/[id]', params: { id: rutina.id } })}
          size="lg"
        />
      </TodaySurface>
    );
  }

  return (
    <TodaySurface testID="today-card">
      <Kicker>Empieza aquí</Kicker>
      <Text variant="display">Entrena con un plan, no a ojo</Text>
      <View style={{ gap: spacing.smd }}>
        {PLAN_PROMISES.map((promise) => (
          <View key={promise.text} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
            <Ionicons
              accessibilityElementsHidden
              color={accentPolicy.glyph}
              importantForAccessibility="no-hide-descendants"
              name={promise.icon}
              size={iconSizes.md}
            />
            <Text style={{ flex: 1 }} tone="secondary" variant="subhead">
              {promise.text}
            </Text>
          </View>
        ))}
      </View>
      <Text tone="muted" variant="footnote">
        Te recomendamos una según tu objetivo y tus días.
      </Text>
      <Button icon="arrow-forward" iconPosition="end" label="Ver rutinas para ti" onPress={() => router.push('/routines')} size="lg" />
    </TodaySurface>
  );
}

/**
 * Lo que alguien sin rutina gana al elegir una, en concreto y sin cifras
 * inventadas: lo que esta misma pantalla le enseñará mañana.
 */
const PLAN_PROMISES: readonly { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'today-outline', text: 'Abre la app y mira qué toca hoy, con series y carga.' },
  { icon: 'checkmark-circle-outline', text: 'Marca tu semana día a día y sostén la racha.' },
  { icon: 'trending-up-outline', text: 'Comprueba cómo sube tu carga semana a semana.' },
];
