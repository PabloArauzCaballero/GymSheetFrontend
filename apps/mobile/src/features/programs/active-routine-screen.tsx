import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { isoWeekday } from '@gymsheet/hooks';
import type { Program } from '@gymsheet/types';
import { programService, routineService } from '@/api/services';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { ScreenHeader, ScrollScreen, Section } from '@/components/layout';
import { SegmentLabel, SegmentedPill } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { CardioProgramCard } from '@/features/cardio/cardio-program-card';
import { StrengthProgramCard } from '@/features/programs/program-card';
import { useActivePrograms } from '@/features/programs/use-active-programs';
import { DayCard } from '@/features/routine-detail/day-cards';
import { defaultKind, type ActiveKind } from '@/features/programs/active-kind';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

const KINDS: readonly { value: ActiveKind; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'gym', label: 'Gym', icon: 'barbell' },
  { value: 'cardio', label: 'Cardio', icon: 'pulse' },
];

/**
 * «Mi rutina» (Pablo, 2026-10-15): se llega desde la fila de cardio de Rutinas
 * (el atajo de la cabecera se quitó el 2026-10-18). Arriba eliges Gym o Cardio;
 * abre en la que tienes activada. Debajo, lo que toca: iniciar el día de hoy y los días de la rutina, o el plan de cardio.
 */
export function ActiveRoutineScreen() {
  const router = useRouter();
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const programs = useActivePrograms();
  const strength = programs.data?.fuerza ?? null;
  const cardio = programs.data?.cardio ?? null;

  const routine = useQuery({
    queryKey: ['routine', strength?.rutinaId],
    queryFn: () => routineService.get(strength?.rutinaId ?? ''),
    enabled: Boolean(strength?.rutinaId),
  });
  const plans = useQuery({
    queryKey: ['cardio-plans'],
    queryFn: () => programService.cardioPlans(),
    enabled: Boolean(cardio),
  });
  const today = isoWeekday(new Date());
  const gymToday = Boolean(routine.data?.dias.some((day) => day.diaSemana === today));
  const cardioToday = Boolean(
    plans.data?.find((plan) => plan.id === cardio?.cardioPlanId)?.diasSemana.includes(today),
  );

  const [kind, setKind] = useState<ActiveKind | null>(null);
  // Se decide una vez, cuando se sabe qué está activo; luego manda la persona.
  const ready = programs.isSuccess && (!strength?.rutinaId || !routine.isPending) && (!cardio || !plans.isPending);
  useEffect(() => {
    if (ready && kind === null) {
      setKind(defaultKind(tipo, { gym: Boolean(strength), cardio: Boolean(cardio) }, { gym: gymToday, cardio: cardioToday }));
    }
  }, [ready, kind, tipo, strength, cardio, gymToday, cardioToday]);

  const refresh = () => Promise.all([programs.refetch(), routine.refetch(), plans.refetch()]);

  return (
    <ScrollScreen onRefresh={() => void refresh()} refreshing={programs.isRefetching}>
      <BackLink />
      <ScreenHeader detail subtitle="Tu rutina activada, de gym o de cardio" title="Mi rutina" />
      {programs.isError ? (
        <ErrorState error={programs.error} onRetry={() => void programs.refetch()} />
      ) : !ready || kind === null ? (
        <View style={{ gap: spacing.md }} testID="active-routine-loading">
          <Skeleton height={minTouchTarget + spacing.sm} radius={radii.full} />
          <Skeleton height={180} />
          <Skeleton height={120} />
        </View>
      ) : (
        <>
          <KindSwitch active={{ gym: Boolean(strength), cardio: Boolean(cardio) }} onChange={setKind} value={kind} />
          {kind === 'gym' ? (
            <GymPane program={strength} />
          ) : (
            <CardioPane program={cardio} strengthToday={gymToday} />
          )}
        </>
      )}
      {ready && !strength && !cardio ? (
        <Button icon="search-outline" label="Explorar rutinas" onPress={() => router.navigate('/routines')} variant="ghost" />
      ) : null}
    </ScrollScreen>
  );
}

function KindSwitch({
  value,
  onChange,
  active,
}: {
  value: ActiveKind;
  onChange: (next: ActiveKind) => void;
  active: Record<ActiveKind, boolean>;
}) {
  return (
    <View accessibilityRole="tablist">
      <SegmentedPill
        fill
        itemStyle={{
          minHeight: minTouchTarget,
          flexGrow: 1,
          flexBasis: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onChange={onChange}
        options={KINDS.map((item) => ({
          value: item.value,
          accessibilityLabel: `${item.label}${active[item.value] ? ', activada' : ', sin activar'}`,
        }))}
        pillColor={colors.surfaceHighest}
        renderItem={(option, selected) => {
          const item = KINDS.find((candidate) => candidate.value === option.value);
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons
                color={selected ? colors.volt : colors.textMuted}
                name={item?.icon ?? 'ellipse'}
                size={iconSizes.sm}
              />
              <SegmentLabel
                active={selected}
                activeColor={colors.text}
                inactiveColor={colors.textMuted}
                label={item?.label ?? ''}
                style={{ fontSize: fontSizes.md, fontWeight: semibold }}
              />
              {active[option.value] ? (
                // El punto dice «esta está activada» sin otra palabra.
                <View
                  style={{ width: 7, height: 7, borderRadius: radii.full, backgroundColor: colors.volt }}
                  testID={`active-dot-${option.value}`}
                />
              ) : null}
            </View>
          );
        }}
        style={{
          alignSelf: 'stretch',
          borderRadius: radii.full,
          backgroundColor: colors.surfaceLow,
          padding: spacing.xs,
        }}
        value={value}
      />
    </View>
  );
}

function GymPane({ program }: { program: Program | null }) {
  const router = useRouter();
  const routine = useQuery({
    queryKey: ['routine', program?.rutinaId],
    queryFn: () => routineService.get(program?.rutinaId ?? ''),
    enabled: Boolean(program?.rutinaId),
  });
  if (!program) {
    return (
      <EmptyState
        icon="barbell-outline"
        message="Activa una rutina de gym y aquí tendrás el día de hoy listo para empezar."
        title="No tienes una rutina de gym activada"
      >
        <Button label="Elegir una rutina" onPress={() => router.navigate('/routines')} variant="secondary" />
      </EmptyState>
    );
  }
  const days = routine.data?.dias ?? [];
  return (
    <View style={{ gap: spacing.xl }} testID="active-routine-gym">
      <StrengthProgramCard program={program} />
      {routine.isError ? (
        <ErrorState error={routine.error} onRetry={() => void routine.refetch()} />
      ) : days.length > 0 ? (
        <Section icon="calendar-outline" title="Días de la rutina">
          <View style={{ gap: spacing.md }}>
            {days.map((day, index) => (
              <DayCard
                day={day}
                key={day.id}
                number={index + 1}
                onPress={() =>
                  router.push({
                    pathname: '/routines/[id]/dia/[diaId]',
                    params: { id: routine.data?.id ?? '', diaId: day.id },
                  })
                }
              />
            ))}
          </View>
        </Section>
      ) : null}
    </View>
  );
}

function CardioPane({ program, strengthToday }: { program: Program | null; strengthToday: boolean }) {
  const router = useRouter();
  if (!program) {
    return (
      <EmptyState
        icon="pulse-outline"
        message="Arma un plan de cardio y aquí verás tus minutos de la semana y el registro de hoy."
        title="No tienes un plan de cardio activado"
      >
        <Button label="Crear plan de cardio" onPress={() => router.push('/routines/cardio/new')} variant="secondary" />
      </EmptyState>
    );
  }
  return (
    <View style={{ gap: spacing.md }} testID="active-routine-cardio">
      <CardioProgramCard program={program} strengthToday={strengthToday} />
      <Button
        icon="stats-chart-outline"
        label="Ver progreso del plan"
        onPress={() => router.push({ pathname: '/routines/program/[id]', params: { id: program.id } })}
        variant="secondary"
      />
    </View>
  );
}
