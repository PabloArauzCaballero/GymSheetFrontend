import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { isoWeekday, nextSession, targetMinutesForWeek, weekLabel } from '@gymsheet/hooks';
import { cardioModalityLabels } from '@gymsheet/hooks';
import type { Program } from '@gymsheet/types';
import { programService, routineService, workoutService } from '@/api/services';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { dayLabel } from '@/features/programs/labels';
import { isProgramOver } from '@/features/programs/program-card';
import { useStartRoutine } from '@/features/routine-detail/use-start-routine';
import {
  accentContrast,
  colors,
  comfortableTouchTarget,
  iconSizes,
  metricColors,
  radii,
  shadows,
  spacing,
} from '@/theme';

/**
 * Las rutinas activadas en Rutinas, en una fila cada una (Pablo, 2026-10-18):
 * pesas y cardio pueden convivir y dos tarjetas grandes se comían media
 * pantalla. Tocar la fila abre el programa (pesas) o «Mi rutina» en cardio;
 * el botón redondo entra directo al entreno de hoy o a registrar cardio.
 */
export function ActiveProgramsCompact({ strength, cardio }: { strength: Program | null; cardio: Program | null }) {
  if (!strength && !cardio) return null;
  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceRaised,
        boxShadow: shadows.e1,
        overflow: 'hidden',
      }}
      testID="active-programs"
    >
      {strength ? <StrengthRow program={strength} /> : null}
      {strength && cardio ? (
        <View style={{ height: 1, marginLeft: spacing.md + ICON_TILE + spacing.smd, backgroundColor: colors.borderSubtle }} />
      ) : null}
      {cardio ? <CardioRow program={cardio} /> : null}
    </View>
  );
}

const ICON_TILE = 36;

function StrengthRow({ program }: { program: Program }) {
  const router = useRouter();
  const routine = useQuery({
    queryKey: ['routine', program.rutinaId],
    queryFn: () => routineService.get(program.rutinaId ?? ''),
    enabled: Boolean(program.rutinaId),
  });
  const start = useStartRoutine(program.rutinaId ?? '');
  const recent = useQuery({ queryKey: ['workouts', 'recent'], queryFn: () => workoutService.list(40) });
  const openSession = recent.data?.items.find((item) => item.estado === 'EN_PROGRESO');
  const next = routine.data ? nextSession(routine.data, isoWeekday(new Date())) : null;
  const over = isProgramOver(program);
  const todayText = next?.esHoy ? dayLabel('Hoy', next.nombre) : null;
  const meta = over
    ? 'Terminó · decide qué sigue'
    : [weekLabel(program), program.esDescarga ? 'Descarga' : null, todayText].filter(Boolean).join(' · ');
  const canPlay = !over && Boolean(program.rutinaId) && Boolean(openSession || next?.esHoy);

  return (
    <ProgramRow
      icon="barbell-outline"
      meta={meta}
      onPress={() =>
        router.push({ pathname: over ? '/routines/program/close/[id]' : '/routines/program/[id]', params: { id: program.id } })
      }
      testID="program-card-strength"
      title={program.rutinaNombre ?? 'Programa de pesas'}
      tone="weight"
      trailing={
        canPlay ? (
          <RoundAction
            accent
            icon="play"
            label={openSession ? 'Continuar rutina de hoy' : 'Iniciar rutina de hoy'}
            loading={start.isPending}
            onPress={() =>
              openSession
                ? router.push({ pathname: '/workouts/[id]', params: { id: openSession.id } })
                : start.mutate(next?.routineDayId)
            }
            testID="program-start-today"
          />
        ) : undefined
      }
    />
  );
}

function CardioRow({ program }: { program: Program }) {
  const router = useRouter();
  const plans = useQuery({ queryKey: ['cardio-plans'], queryFn: () => programService.cardioPlans() });
  const progress = useQuery({
    queryKey: ['programs', program.id, 'progress'],
    queryFn: () => programService.progress(program.id),
  });
  const plan = plans.data?.find((candidate) => candidate.id === program.cardioPlanId);
  const week = progress.data?.semanas.find((candidate) => candidate.numero === program.semanaActual);
  const target = plan && week
    ? targetMinutesForWeek(plan.minutosObjetivo, plan.progresionPctSemana, week.numero) * week.sesionesPlan
    : null;
  const minutes = Math.round(week?.minutosCardio ?? 0);
  const meta = [weekLabel(program), target !== null ? `${minutes} / ${Math.round(target)} min` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <ProgramRow
      icon="pulse-outline"
      meta={meta}
      onPress={() => router.push({ pathname: '/routines/activa', params: { tipo: 'cardio' } })}
      testID="program-card-cardio"
      title={plan ? `Cardio · ${cardioModalityLabels[plan.modalidad]}` : 'Plan de cardio'}
      tone="volume"
      trailing={
        <RoundAction
          icon="add"
          label="Registrar cardio"
          onPress={() => router.push('/routines/cardio/log')}
          testID="cardio-log"
        />
      }
    />
  );
}

function ProgramRow({
  icon,
  tone,
  title,
  meta,
  onPress,
  trailing,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'weight' | 'volume';
  title: string;
  meta: string;
  onPress: () => void;
  trailing?: ReactNode;
  testID: string;
}) {
  const ink = metricColors[tone];
  return (
    <PressableScale
      accessibilityHint="Abre tu programa"
      accessibilityLabel={`${title}. ${meta}`}
      haptic="selection"
      onPress={onPress}
      scaleTo={0.985}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.smd,
        minHeight: comfortableTouchTarget + spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      }}
      testID={testID}
    >
      <View
        style={{
          width: ICON_TILE,
          height: ICON_TILE,
          borderRadius: radii.md,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: ink.tint,
        }}
      >
        <Ionicons color={ink.ink} name={icon} size={iconSizes.md} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} strong variant="body">
          {title}
        </Text>
        <Text numberOfLines={1} tone="muted" variant="caption">
          {meta}
        </Text>
      </View>
      {trailing ?? <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} />}
    </PressableScale>
  );
}

/** Botón redondo de la fila: el acento solo para entrenar hoy, que es la acción principal. */
function RoundAction({
  icon,
  label,
  onPress,
  accent = false,
  loading = false,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: boolean;
  loading?: boolean;
  testID: string;
}) {
  const glyph = accent ? accentContrast() : colors.text;
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={loading}
      haptic="light"
      hitSlop={spacing.xs}
      onPress={onPress}
      scaleTo={0.92}
      style={{
        width: comfortableTouchTarget - spacing.xs,
        height: comfortableTouchTarget - spacing.xs,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: accent ? colors.volt : colors.surfaceHigh,
      }}
      testID={testID}
    >
      {loading ? <ActivityIndicator color={glyph} /> : <Ionicons color={glyph} name={icon} size={iconSizes.md} />}
    </PressableScale>
  );
}
