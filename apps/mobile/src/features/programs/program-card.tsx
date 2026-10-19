import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import {
  WEEKDAY_NAMES,
  isoWeekday,
  multiplierLabel,
  nextSession,
  weekLabel,
  type Weekday,
} from '@gymsheet/hooks';
import type { Program } from '@gymsheet/types';
import { routineService, workoutService } from '@/api/services';
import { Badge } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { dayLabel, MODE_BADGE } from '@/features/programs/labels';
import { useStartRoutine } from '@/features/routine-detail/use-start-routine';
import { modeTierName, shieldLabel } from '@gymsheet/domain';
import { accentPolicy, colors, fontSizes, iconSizes, radii, semibold, shadows, spacing } from '@/theme';

/** El programa ya pasó su fecha fin: toca decidir qué sigue (RF-19). */
export function isProgramOver(program: Program, today = new Date()): boolean {
  const end = new Date(`${program.fechaFinPrevista}T23:59:59`);
  return today.getTime() > end.getTime();
}

/**
 * Tarjeta del programa de pesas en Rutinas (RF-14): «Empuje 4 días · Semana 3 de 12 ·
 * x1,4 · Hoy: Pierna → Entrenar». Al terminar la duración, ofrece el cierre.
 */
export function StrengthProgramCard({ program }: { program: Program }) {
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
  const nextText = next
    ? dayLabel(next.esHoy ? 'Hoy' : WEEKDAY_NAMES[next.dia as Weekday], next.nombre)
    : 'Entrena cuando quieras';

  return (
    <PressableScale
      accessibilityLabel={`Programa de pesas. ${program.rutinaNombre ?? ''}. ${weekLabel(program)}. ${over ? 'Terminó' : nextText}`}
      haptic="selection"
      onPress={() =>
        router.push({ pathname: over ? '/routines/program/close/[id]' : '/routines/program/[id]', params: { id: program.id } })
      }
      scaleTo={0.985}
      style={{
        gap: spacing.sm,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceRaised,
        boxShadow: shadows.e1,
        padding: spacing.mdl,
      }}
      testID="program-card-strength"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons color={accentPolicy.glyph} name="barbell-outline" size={iconSizes.md} />
        <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
          {program.rutinaNombre ?? 'Programa de pesas'}
        </Text>
        <Badge label={MODE_BADGE[program.modo] ?? program.modo} />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }} testID="program-week">
        {weekLabel(program)}
        {program.esDescarga ? ' · Descarga' : ''}
      </Text>
      <Text style={{ color: colors.text, fontSize: fontSizes.sm }}>
        {over ? 'Terminaste el programa. ¿Qué sigue?' : nextText}
        {!over && program.multiplicador > 1 ? ` · bono ${multiplierLabel(program.multiplicador)} (${modeTierName(program)})` : ''}
        {!over && shieldLabel(program.escudos) ? ' · escudo listo' : ''}
      </Text>
      {!over && program.rutinaId ? (
        <View style={{ gap: spacing.sm }}>
          {openSession || next?.esHoy ? (
            <Button
              haptic="light"
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
          ) : null}
          <Button
            icon="list-outline"
            label="Ver rutina completa"
            onPress={() => router.push({ pathname: '/routines/[id]', params: { id: program.rutinaId ?? '' } })}
            testID="program-view-full"
            variant="secondary"
          />
        </View>
      ) : null}
      {over ? <Button label="Decidir qué sigue" onPress={() => router.push({ pathname: '/routines/program/close/[id]', params: { id: program.id } })} /> : null}
    </PressableScale>
  );
}
